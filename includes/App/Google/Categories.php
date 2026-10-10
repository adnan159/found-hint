<?php
/**
 * Google Business Profile categories: the list, and searching it.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google;

defined( 'ABSPATH' ) || exit;

/**
 * The categories Google will accept for a business, and their ids.
 *
 * **A category's name is not its identity; its id is.** Google wants
 * `gcid:dentist`, and the same category is worded differently from one
 * country to the next. So everything that stores a category stores the id,
 * and the name beside it is only what a person reads.
 *
 * The list ships with the plugin (`data/google-categories.json`, rebuilt by
 * `npm run categories:update`) rather than being fetched. Choosing a category
 * is one of the first things a new site does, usually before Google is
 * connected, and a search box that needs an approved API connection to show
 * its first suggestion is a search box that does not work.
 *
 * Searching happens in memory. The whole list is about four thousand short
 * strings, and ranking — an exact match before a prefix before a word in the
 * middle — is a few lines of PHP and awkward in SQL.
 */
class Categories {

	/**
	 * How many additional categories Google allows beside the primary one.
	 *
	 * This is Google's rule, not a plan limit, which is why it lives here and
	 * not in `Limits`.
	 */
	const MAX_ADDITIONAL = 9;

	/**
	 * The most results one search returns.
	 */
	const MAX_RESULTS = 50;

	/**
	 * The decoded data file, read once per request.
	 *
	 * @var array|null
	 */
	private static $data = null;

	/**
	 * Row index by category id, built on first lookup.
	 *
	 * @var array<string, int>|null
	 */
	private static $by_id = null;

	/**
	 * Row index by lower-cased name and variant, built on first lookup.
	 *
	 * @var array<string, int>|null
	 */
	private static $by_name = null;

	/**
	 * One category by its Google id.
	 *
	 * @param string $id Google category id, e.g. 'gcid:dentist'.
	 * @return array|null
	 */
	public static function find( $id ) {
		$id = self::normalize_id( $id );

		if ( '' === $id ) {
			return null;
		}

		self::index();

		return isset( self::$by_id[ $id ] ) ? self::shape( self::rows()[ self::$by_id[ $id ] ] ) : null;
	}

	/**
	 * One category by exactly what it is called.
	 *
	 * Case is ignored and so is surrounding space, but nothing fuzzier: this
	 * is how a name typed or imported earlier is tied back to an id, and a
	 * near miss there would attach the wrong category to a business.
	 *
	 * @param string $name A category name or one of its variants.
	 * @return array|null
	 */
	public static function find_by_name( $name ) {
		$key = self::fold( $name );

		if ( '' === $key ) {
			return null;
		}

		self::index();

		return isset( self::$by_name[ $key ] ) ? self::shape( self::rows()[ self::$by_name[ $key ] ] ) : null;
	}

	/**
	 * Whether Google has a category with this id.
	 *
	 * @param string $id Google category id.
	 * @return bool
	 */
	public static function exists( $id ) {
		return null !== self::find( $id );
	}

	/**
	 * Search the list.
	 *
	 * Every word typed must appear, in any order, in the name or in one of
	 * its variants. Results are ranked so the thing most likely meant comes
	 * first: the exact name, then names that start with what was typed, then
	 * names with a word that starts with it, then anything containing it, and
	 * last a match that was only found in a variant.
	 *
	 * An empty search lists alphabetically, so a chooser has something to
	 * show before anyone types.
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
		$rows   = self::rows();

		if ( '' === $query ) {
			return array(
				'items' => array_map( array( __CLASS__, 'shape' ), array_slice( $rows, $offset, $limit ) ),
				'total' => count( $rows ),
			);
		}

		// Somebody pasting an id means that id, not a name containing it.
		$by_id = self::find( $query );

		if ( null !== $by_id ) {
			return array(
				'items' => 0 === $offset ? array( $by_id ) : array(),
				'total' => 1,
			);
		}

		$words   = array_values( array_filter( explode( ' ', $query ), 'strlen' ) );
		$matches = array();

		foreach ( $rows as $position => $row ) {
			$name  = self::fold( $row[1] );
			$score = self::score( $name, $query, $words );
			$via   = '';

			if ( null === $score && ! empty( $row[4] ) ) {
				foreach ( $row[4] as $variant ) {
					$variant_score = self::score( self::fold( $variant ), $query, $words );

					if ( null !== $variant_score ) {
						// Found only through another wording: rank it after
						// every match on the name itself.
						$score = 10 + $variant_score;
						$via   = $variant;
						break;
					}
				}
			}

			if ( null === $score ) {
				continue;
			}

			$matches[] = array( $score, strlen( $name ), $position, $via );
		}

		// Best score first; among equals, the shorter name (the closer fit),
		// then the list's own alphabetical order.
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

		$items = array();

		foreach ( array_slice( $matches, $offset, $limit ) as $match ) {
			$item = self::shape( $rows[ $match[2] ] );

			if ( '' !== $match[3] ) {
				$item['matched'] = $match[3];
			}

			$items[] = $item;
		}

		return array(
			'items' => $items,
			'total' => count( $matches ),
		);
	}

	/**
	 * Turn what a client sent into the pair this plugin stores.
	 *
	 * Accepts an id, a name, or an array carrying either, and answers with
	 * `{ id, name }` taken **from the list** — never the client's wording —
	 * so a stored name always matches its id. Something that cannot be found
	 * comes back with an empty id and the text as given, which is how
	 * validation recognises it and says so.
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

		$found = '' !== trim( $id ) ? self::find( $id ) : self::find_by_name( $name );

		if ( null !== $found ) {
			return array(
				'id'   => $found['id'],
				'name' => $found['name'],
			);
		}

		return array(
			// An id nobody has heard of is kept as sent so the error can name
			// it; a bare name has no id to keep.
			'id'   => '' !== trim( $id ) ? self::normalize_id( $id ) : '',
			'name' => trim( '' !== trim( $name ) ? $name : $id ),
		);
	}

	/**
	 * The resource name Google's API takes for a category.
	 *
	 * @param string $id Google category id, e.g. 'gcid:dentist'.
	 * @return string e.g. 'categories/gcid:dentist', or '' for an unknown id.
	 */
	public static function resource_name( $id ) {
		$found = self::find( $id );

		return null === $found ? '' : 'categories/' . $found['id'];
	}

	/**
	 * Where the list came from and when it was last rebuilt.
	 *
	 * @return array{source:string, updated:string, count:int}
	 */
	public static function meta() {
		$data = self::data();

		return array(
			'source'  => isset( $data['source'] ) ? (string) $data['source'] : '',
			'updated' => isset( $data['updated'] ) ? (string) $data['updated'] : '',
			'count'   => count( self::rows() ),
		);
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
	 * A category id in the form the list holds it.
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

	/**
	 * One row of the data file as the rest of the plugin sees it.
	 *
	 * @param array $row Positional row: id, name, bucket index, in_us, variants.
	 * @return array
	 */
	private static function shape( array $row ) {
		$data    = self::data();
		$buckets = isset( $data['buckets'] ) && is_array( $data['buckets'] ) ? $data['buckets'] : array();

		return array(
			'id'       => (string) $row[0],
			'name'     => (string) $row[1],
			'bucket'   => isset( $buckets[ $row[2] ] ) ? (string) $buckets[ $row[2] ] : '',
			'in_us'    => ! empty( $row[3] ),
			'variants' => isset( $row[4] ) && is_array( $row[4] ) ? array_values( $row[4] ) : array(),
		);
	}

	/**
	 * Build the id and name indexes once.
	 *
	 * @return void
	 */
	private static function index() {
		if ( null !== self::$by_id ) {
			return;
		}

		self::$by_id   = array();
		self::$by_name = array();

		foreach ( self::rows() as $position => $row ) {
			self::$by_id[ (string) $row[0] ] = $position;

			$names = array_merge( array( $row[1] ), isset( $row[4] ) && is_array( $row[4] ) ? $row[4] : array() );

			foreach ( $names as $name ) {
				$key = self::fold( $name );

				// Two categories can share a wording. The first one listed
				// keeps it: guessing between them would be worse than asking
				// for the id, which is what the search hands back anyway.
				if ( '' !== $key && ! isset( self::$by_name[ $key ] ) ) {
					self::$by_name[ $key ] = $position;
				}
			}
		}
	}

	/**
	 * The category rows.
	 *
	 * @return array[]
	 */
	private static function rows() {
		$data = self::data();

		return isset( $data['categories'] ) && is_array( $data['categories'] ) ? $data['categories'] : array();
	}

	/**
	 * Read and decode the bundled data file.
	 *
	 * A missing or unreadable file yields an empty list rather than a fatal:
	 * a search that finds nothing is a problem somebody can report, while a
	 * white screen on the Business page is not.
	 *
	 * @return array
	 */
	private static function data() {
		if ( null !== self::$data ) {
			return self::$data;
		}

		self::$data = array();

		$file = __DIR__ . '/data/google-categories.json';

		if ( is_readable( $file ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local plugin file, not a remote request.
			$decoded = json_decode( (string) file_get_contents( $file ), true );

			if ( is_array( $decoded ) ) {
				self::$data = $decoded;
			}
		}

		return self::$data;
	}
}
