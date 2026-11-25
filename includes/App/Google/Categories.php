<?php
/**
 * Google Business Profile categories: searching Google's list, and ids.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google;

use FHINT\App\Location\LocationRepository;

defined( 'ABSPATH' ) || exit;

/**
 * The categories Google will accept for a business, and their ids.
 *
 * **A category's name is not its identity; its id is.** Google wants
 * `gcid:dentist`, and the same category is worded differently from one
 * country to the next. So everything that stores a category stores the id,
 * and the name beside it is only what a person reads.
 *
 * **The list is Google's, read from Google.** Nothing is bundled: a search
 * asks Google's own categories endpoint (`categories.list` with a
 * `displayName` filter), in the site's language and the main location's
 * country, and the answers are cached for a day. Business details can only
 * be edited while Google is connected, so the search is only ever needed
 * then; without a connection it answers with nothing.
 *
 * **Validation never waits on Google.** It checks that an id is shaped like
 * one (`gcid:…`); Google checks that it exists when the change is pushed,
 * exactly as it checks everything else sent to it.
 *
 * **The name stored beside an id is Google's.** Every search remembers the
 * names it found (per language, bounded), and a choice always comes from a
 * search, so naming a saved id normally costs nothing. An id that arrives
 * with no name is looked up once (`categories:batchGet`) and remembered; one
 * that arrives with a name (from the picker, or from Google in an import)
 * keeps it unless Google's is already known. When nothing can be asked, a
 * readable name is built from the id (`gcid:pet_store` → "Pet store").
 */
class Categories {

	/**
	 * How many additional categories Google allows beside the primary one.
	 *
	 * This is Google's rule, not a site limit, which is why it lives here and
	 * not in `Limits`.
	 */
	const MAX_ADDITIONAL = 9;

	/**
	 * The most results one search returns.
	 */
	const MAX_RESULTS = 50;

	/**
	 * Google's categories endpoint.
	 */
	const LIST_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1/categories';

	/**
	 * Google's endpoint for looking categories up by id.
	 */
	const BATCH_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1/categories:batchGet';

	/**
	 * How long a search answer is kept.
	 */
	const SEARCH_TTL = DAY_IN_SECONDS;

	/**
	 * How long a looked-up name is kept. Category names barely move.
	 */
	const NAME_TTL = WEEK_IN_SECONDS;

	/**
	 * How many id → name pairs are kept per language.
	 */
	const NAMES_MAX = 1000;

	/**
	 * What a Google category id looks like.
	 */
	const ID_PATTERN = '/^gcid:[a-z0-9_]+$/';

	/**
	 * Names looked up during this request, by language and id.
	 *
	 * @var array<string, array|false>
	 */
	private static $memo = array();

	/**
	 * One category by its Google id, with its name in the site's language.
	 *
	 * Asks Google (cached) when connected. Null when the id is malformed,
	 * when Google does not know it, or when Google cannot be asked.
	 *
	 * @param string $id  Google category id, e.g. 'gcid:dentist'.
	 * @param bool   $ask Whether Google may be asked when the name is not
	 *                    already known; false answers from memory only.
	 * @return array{id:string, name:string}|null
	 */
	public static function find( $id, $ask = true ) {
		$id = self::normalize_id( $id );

		if ( ! self::is_id( $id ) ) {
			return null;
		}

		$language = self::language();
		$key      = $language . '|' . $id;

		if ( array_key_exists( $key, self::$memo ) ) {
			return self::$memo[ $key ] ? self::$memo[ $key ] : null;
		}

		// Every search adds what it found to this map, and a choice always
		// comes from a search, so a save is normally answered from here.
		$names = self::names( $language );

		if ( isset( $names[ $id ] ) ) {
			self::$memo[ $key ] = array(
				'id'   => $id,
				'name' => (string) $names[ $id ],
			);

			return self::$memo[ $key ];
		}

		if ( ! $ask || ! Connection::is_linked() ) {
			return null;
		}

		$response = Client::get(
			self::BATCH_URL,
			array(
				'names'        => 'categories/' . $id,
				'languageCode' => $language,
				'view'         => 'BASIC',
			)
		);

		if ( is_wp_error( $response ) ) {
			// Not remembered: Google being unreachable now says nothing
			// about the id.
			return null;
		}

		$found = null;

		foreach ( isset( $response['categories'] ) && is_array( $response['categories'] ) ? $response['categories'] : array() as $category ) {
			$shaped = self::shape( $category );

			if ( null !== $shaped && $shaped['id'] === $id ) {
				$found = $shaped;
				break;
			}
		}

		self::$memo[ $key ] = $found ? $found : false;

		if ( $found ) {
			self::remember( array( $found ), $language );
		}

		return $found;
	}

	/**
	 * One category by exactly what it is called.
	 *
	 * Case is ignored and so is surrounding space, but nothing fuzzier: this
	 * is how a name typed or sent earlier is tied back to an id, and a near
	 * miss there would attach the wrong category to a business.
	 *
	 * @param string $name A category name.
	 * @return array{id:string, name:string}|null
	 */
	public static function find_by_name( $name ) {
		$key = self::fold( $name );

		if ( '' === $key ) {
			return null;
		}

		foreach ( self::ask_google( $key ) as $category ) {
			if ( self::fold( $category['name'] ) === $key ) {
				return $category;
			}
		}

		return null;
	}

	/**
	 * Whether an id is one Google could hold.
	 *
	 * The shape only: Google confirms the category itself when the change is
	 * pushed, so a save is never refused because Google was slow to answer.
	 *
	 * @param string $id Google category id.
	 * @return bool
	 */
	public static function exists( $id ) {
		return self::is_id( self::normalize_id( $id ) );
	}

	/**
	 * Search Google's list.
	 *
	 * Google's own filter is broad, so its answers are ranked here and the
	 * ones that do not contain what was typed are dropped: the exact name,
	 * then names that start with it, then names with a word that starts
	 * with it, then anything containing it, then every word in any order.
	 *
	 * Answers with nothing while Google is not connected.
	 *
	 * @param string $search What was typed.
	 * @param int    $limit  How many to return, capped at MAX_RESULTS.
	 * @param int    $offset How many to skip.
	 * @return array{items:array[], total:int}
	 */
	public static function search( $search = '', $limit = 20, $offset = 0 ) {
		$limit  = max( 1, min( self::MAX_RESULTS, (int) $limit ) );
		$offset = max( 0, (int) $offset );
		$query  = self::fold( $search );

		if ( '' === $query ) {
			return array(
				'items' => array(),
				'total' => 0,
			);
		}

		// Somebody pasting an id means that id, not a name containing it.
		if ( self::is_id( self::normalize_id( $query ) ) ) {
			$by_id = self::find( $query );

			return array(
				'items' => null !== $by_id && 0 === $offset ? array( $by_id ) : array(),
				'total' => null !== $by_id ? 1 : 0,
			);
		}

		$words   = array_values( array_filter( explode( ' ', $query ), 'strlen' ) );
		$matches = array();

		foreach ( self::ask_google( $query ) as $position => $category ) {
			$name  = self::fold( $category['name'] );
			$score = self::score( $name, $query, $words );

			if ( null !== $score ) {
				$matches[] = array( $score, strlen( $name ), $position, $category );
			}
		}

		// Best score first; among equals, the shorter name (the closer fit),
		// then Google's own order.
		usort(
			$matches,
			static function ( $a, $b ) {
				if ( $a[0] !== $b[0] ) {
					return $a[0] - $b[0];
				}

				if ( $a[1] !== $b[1] ) {
					return $a[1] - $b[1];
				}

				return $a[2] - $b[2];
			}
		);

		return array(
			'items' => array_map(
				static function ( $match ) {
					return $match[3];
				},
				array_slice( $matches, $offset, $limit )
			),
			'total' => count( $matches ),
		);
	}

	/**
	 * Turn what a client sent into the pair this plugin stores.
	 *
	 * Accepts an id, a name, or an array carrying either, and answers with
	 * `{ id, name }`. An id is normalised; its name is Google's when Google
	 * can be asked, otherwise the name sent with it. A bare name is matched
	 * exactly against Google's list; one that cannot be found comes back
	 * with an empty id and the text as given, which is how validation
	 * recognises it and says so.
	 *
	 * @param mixed $value An id, a name, or `{ id, name }`.
	 * @return array{id:string, name:string}
	 */
	public static function resolve( $value ) {
		$id   = '';
		$name = '';

		if ( is_array( $value ) ) {
			$id   = isset( $value['id'] ) ? (string) $value['id'] : '';
			$name = isset( $value['name'] ) ? (string) $value['name'] : '';
		} else {
			$text = trim( (string) $value );

			if ( 0 === strpos( strtolower( $text ), 'gcid:' ) || 0 === strpos( strtolower( $text ), 'categories/gcid:' ) ) {
				$id = $text;
			} else {
				$name = $text;
			}
		}

		$id   = self::normalize_id( $id );
		$name = trim( $name );

		if ( '' !== $id ) {
			// Google's name when it is already known (every search teaches
			// some). Google is asked only for an id that came with no name:
			// one that came with a name — from the picker, or from Google
			// in an import — keeps it, so a save or an import does not spend
			// a request per category.
			$found = self::find( $id, '' === $name );

			if ( null !== $found ) {
				return $found;
			}

			return array(
				'id'   => $id,
				'name' => '' !== $name ? $name : self::readable( $id ),
			);
		}

		$found = self::find_by_name( $name );

		if ( null !== $found ) {
			return $found;
		}

		return array(
			'id'   => '',
			'name' => $name,
		);
	}

	/**
	 * The resource name Google's API takes for a category.
	 *
	 * @param string $id Google category id, e.g. 'gcid:dentist'.
	 * @return string e.g. 'categories/gcid:dentist', or '' for a malformed id.
	 */
	public static function resource_name( $id ) {
		$id = self::normalize_id( $id );

		return self::is_id( $id ) ? 'categories/' . $id : '';
	}

	/**
	 * Where the list comes from.
	 *
	 * @return array{source:string, updated:string, count:int}
	 */
	public static function meta() {
		return array(
			'source'  => 'google',
			'updated' => '',
			'count'   => 0,
		);
	}

	/**
	 * The id → name map kept for a language.
	 *
	 * @param string $language Language code.
	 * @return array<string, string>
	 */
	private static function names( $language ) {
		$names = get_transient( 'fhint_gcat_names_' . $language );

		return is_array( $names ) ? $names : array();
	}

	/**
	 * Add categories to the id → name map, newest last, capped.
	 *
	 * @param array[] $categories Each `{ id, name }`.
	 * @param string  $language   Language code.
	 * @return void
	 */
	private static function remember( array $categories, $language ) {
		if ( ! $categories ) {
			return;
		}

		$names = self::names( $language );

		foreach ( $categories as $category ) {
			unset( $names[ $category['id'] ] );
			$names[ $category['id'] ] = $category['name'];
		}

		// Bounded, so one option row never grows with every search ever
		// made: the oldest go first.
		if ( count( $names ) > self::NAMES_MAX ) {
			$names = array_slice( $names, -self::NAMES_MAX, null, true );
		}

		set_transient( 'fhint_gcat_names_' . $language, $names, self::NAME_TTL );
	}

	/**
	 * Google's answer for a search, shaped and cached.
	 *
	 * @param string $query Folded search.
	 * @return array[] Each `{ id, name }`, in Google's order.
	 */
	private static function ask_google( $query ) {
		if ( ! Connection::is_linked() ) {
			return array();
		}

		$language = self::language();
		$region   = self::region();
		$cache    = 'fhint_gcat_q_' . md5( $language . '|' . $region . '|' . $query );
		$cached   = get_transient( $cache );

		if ( is_array( $cached ) ) {
			return $cached;
		}

		$response = Client::get(
			self::LIST_URL,
			array(
				'regionCode'   => $region,
				'languageCode' => $language,
				'view'         => 'BASIC',
				'pageSize'     => 100,
				'filter'       => 'displayName=' . $query,
			)
		);

		if ( is_wp_error( $response ) ) {
			return array();
		}

		$categories = array();

		foreach ( isset( $response['categories'] ) && is_array( $response['categories'] ) ? $response['categories'] : array() as $category ) {
			$shaped = self::shape( $category );

			if ( null !== $shaped ) {
				$categories[] = $shaped;
			}
		}

		set_transient( $cache, $categories, self::SEARCH_TTL );
		self::remember( $categories, $language );

		return $categories;
	}

	/**
	 * One entry of Google's answer as the rest of the plugin sees it.
	 *
	 * @param mixed $category `{ name: 'categories/gcid:…', displayName }`.
	 * @return array{id:string, name:string}|null
	 */
	private static function shape( $category ) {
		if ( ! is_array( $category ) || empty( $category['name'] ) || empty( $category['displayName'] ) ) {
			return null;
		}

		$id = self::normalize_id( $category['name'] );

		if ( ! self::is_id( $id ) ) {
			return null;
		}

		return array(
			'id'   => $id,
			'name' => sanitize_text_field( (string) $category['displayName'] ),
		);
	}

	/**
	 * The language names are asked for in: the site's, e.g. 'en'.
	 *
	 * @return string
	 */
	private static function language() {
		$locale = function_exists( 'get_locale' ) ? (string) get_locale() : 'en_US';
		$code   = strtolower( substr( $locale, 0, 2 ) );

		return preg_match( '/^[a-z]{2}$/', $code ) ? $code : 'en';
	}

	/**
	 * The country categories are asked for in: the main location's, else the
	 * site locale's (en_GB → GB), else US.
	 *
	 * @return string
	 */
	private static function region() {
		$country = '';

		if ( isset( $GLOBALS['wpdb'] ) ) {
			$primary = LocationRepository::primary();
			$country = is_array( $primary ) && isset( $primary['country'] ) ? strtoupper( trim( (string) $primary['country'] ) ) : '';
		}

		if ( ! preg_match( '/^[A-Z]{2}$/', $country ) && function_exists( 'get_locale' ) ) {
			$country = strtoupper( (string) substr( (string) get_locale(), 3, 2 ) );
		}

		return preg_match( '/^[A-Z]{2}$/', $country ) ? $country : 'US';
	}

	/**
	 * A readable stand-in name built from the id itself, for when Google
	 * cannot be asked: `gcid:pet_store` reads as "Pet store".
	 *
	 * @param string $id Normalised id.
	 * @return string
	 */
	private static function readable( $id ) {
		$words = str_replace( '_', ' ', (string) preg_replace( '/^gcid:/', '', (string) $id ) );

		return '' !== $words ? ucfirst( $words ) : (string) $id;
	}

	/**
	 * Whether a normalised id has Google's shape.
	 *
	 * @param string $id Normalised id.
	 * @return bool
	 */
	private static function is_id( $id ) {
		return 1 === preg_match( self::ID_PATTERN, (string) $id );
	}

	/**
	 * How well a name answers a search, or null when it does not.
	 *
	 * @param string   $name  Folded name.
	 * @param string   $query Folded search.
	 * @param string[] $words The search, split into words.
	 * @return int|null 0 is best.
	 */
	private static function score( $name, $query, array $words ) {
		if ( $name === $query ) {
			return 0;
		}

		if ( 0 === strpos( $name, $query ) ) {
			return 1;
		}

		if ( false !== strpos( ' ' . $name, ' ' . $query ) ) {
			return 2;
		}

		if ( false !== strpos( $name, $query ) ) {
			return 3;
		}

		// The words in a different order, or with others between them.
		if ( count( $words ) > 1 ) {
			foreach ( $words as $word ) {
				if ( false === strpos( $name, $word ) ) {
					return null;
				}
			}

			return 4;
		}

		return null;
	}

	/**
	 * Lower-cased, trimmed, single-spaced text for comparing.
	 *
	 * @param mixed $text Anything.
	 * @return string
	 */
	private static function fold( $text ) {
		$text = trim( preg_replace( '/\s+/u', ' ', (string) $text ) );

		return function_exists( 'mb_strtolower' ) ? mb_strtolower( $text ) : strtolower( $text );
	}

	/**
	 * A category id in its short form.
	 *
	 * Accepts Google's full resource name as well, because that is what its
	 * API hands back and what an import will be holding.
	 *
	 * @param mixed $id Anything.
	 * @return string
	 */
	private static function normalize_id( $id ) {
		$id = strtolower( trim( (string) $id ) );

		if ( 0 === strpos( $id, 'categories/' ) ) {
			$id = substr( $id, strlen( 'categories/' ) );
		}

		return $id;
	}
}
