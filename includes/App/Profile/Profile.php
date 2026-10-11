<?php
/**
 * The Business Profile screen as one document.
 *
 * @package FoundHint
 */

namespace FHINT\App\Profile;

use FHINT\App\Business\Business;
use FHINT\App\Business\BusinessRepository;
use FHINT\App\Core\ValidationResult;
use FHINT\App\Google\AttributeCatalog;
use FHINT\App\Google\Categories;
use FHINT\App\Google\Connection;
use FHINT\App\Google\GoogleLocationRepository;
use FHINT\App\Location\Location;
use FHINT\App\Location\LocationRepository;
use FHINT\App\Review\ReviewRepository;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and saves the profile a section at a time.
 *
 * The screen shows a business, its location, its hours and its services
 * together, so it is read in one go; each card has its own Save button, so it
 * is written one section at a time. This class is the join between the two.
 *
 * **It owns no rules of its own.** Every section delegates to the entity that
 * already validates and stores that data — `Business`, `Location`,
 * `OpeningHours`, `Service`. A name saved from here and the same name saved
 * through `/business` or the setup wizard therefore pass through one set of
 * rules, which is the only way two routes to the same row stay in agreement.
 *
 * Nothing here contacts Google. Saving writes this site's own tables; sending
 * the result to Google is a separate, explicit step.
 */
class Profile {

	/**
	 * Section id to the class that reads and saves it, in screen order.
	 */
	const SECTIONS = array(
		'info'       => Sections\Info::class,
		'address'    => Sections\Address::class,
		'hours'      => Sections\Hours::class,
		'social'     => Sections\Social::class,
		'attributes' => Sections\Attributes::class,
		'services'   => Sections\Services::class,
		'media'      => Sections\Media::class,
	);

	/**
	 * The location a request asked for, or 0 for the primary one.
	 *
	 * Held here rather than passed to every section because every section
	 * asks the same question — "which location?" — through `location()`,
	 * and one answer in one place is what keeps the address, the hours and
	 * the Google listing of a request describing the same branch.
	 *
	 * @var int
	 */
	private static $location_id = 0;

	/**
	 * Choose the location the rest of this request reads and writes.
	 *
	 * Every route calls this first, with 0 when no location was named, so a
	 * choice can never carry over from one request to the next.
	 *
	 * @param int $location_id Row id in wp_fhint_locations, or 0 for the primary one.
	 * @return true|WP_Error
	 */
	public static function select( $location_id ) {
		$location_id       = (int) $location_id;
		self::$location_id = 0;

		if ( ! $location_id ) {
			return true;
		}

		if ( ! LocationRepository::find( $location_id ) ) {
			return new WP_Error(
				'fhint_location_not_found',
				__( 'That location no longer exists.', 'foundhint-local-seo' ),
				array( 'status' => 404 )
			);
		}

		self::$location_id = $location_id;

		return true;
	}

	/**
	 * The whole screen.
	 *
	 * @return array{sections:array, meta:array}
	 */
	public static function read() {
		$sections = array();

		foreach ( self::SECTIONS as $id => $class ) {
			$sections[ $id ] = call_user_func( array( $class, 'read' ) );
		}

		return array(
			'sections' => $sections,
			'meta'     => self::meta(),
		);
	}

	/**
	 * Save one section.
	 *
	 * @param string $section Section id.
	 * @param array  $fields  The section's fields, as sent.
	 * @return array|ValidationResult|WP_Error The section as it now reads; a
	 *         ValidationResult when a value was refused; a WP_Error when the
	 *         save could not be attempted at all.
	 */
	public static function save( $section, array $fields ) {
		$section = (string) $section;

		if ( ! isset( self::SECTIONS[ $section ] ) ) {
			return new WP_Error(
				'fhint_unknown_section',
				__( 'That is not a section of the profile.', 'foundhint-local-seo' ),
				array( 'status' => 400 )
			);
		}

		$class  = self::SECTIONS[ $section ];
		$result = call_user_func( array( $class, 'save' ), $fields );

		if ( $result instanceof ValidationResult || is_wp_error( $result ) ) {
			return $result;
		}

		return array(
			'section' => $section,
			'data'    => call_user_func( array( $class, 'read' ) ),
			'meta'    => self::meta(),
		);
	}

	/**
	 * What the screen needs to know that belongs to no one section.
	 *
	 * @return array
	 */
	public static function meta() {
		$google   = self::google_location();
		$location = self::location();

		return array(
			'exists'    => BusinessRepository::exists(),
			'location'  => $location ? self::location_summary( $location ) : null,
			'locations' => array_map( array( __CLASS__, 'location_summary' ), LocationRepository::all() ),
			'reviews'   => $google ? self::reviews( (string) $google['location_name'] ) : null,
			'google'    => array(
				'status'    => Connection::status(),
				'connected' => Connection::STATUS_CONNECTED === Connection::status(),
				'mapped'    => null !== $google,
				'location'  => $google ? (string) $google['location_name'] : '',
				'account'   => $google ? (string) $google['account_name'] : '',
				'title'     => $google ? (string) $google['title'] : '',
				'verified'  => $google ? 'VERIFIED' === strtoupper( (string) $google['verification_state'] ) : false,
				'synced_at' => $google && ! empty( $google['synced_at'] ) ? (string) $google['synced_at'] : null,
				'pushed_at' => $google && ! empty( $google['pushed_at'] ) ? (string) $google['pushed_at'] : null,
				// When attributes and photos were last read for this listing;
				// null means they never have been.
				'refreshed_at' => $google ? AttributeCatalog::fetched_at( (string) $google['location_name'] ) : null,
			),
			'limits'    => array(
				'description'           => Business::DESCRIPTION_MAX,
				'additional_categories' => Categories::MAX_ADDITIONAL,
			),
		);
	}

	/**
	 * The location this screen describes: the one selected, else the primary.
	 *
	 * @return array|null
	 */
	public static function location() {
		if ( self::$location_id ) {
			$location = LocationRepository::find( self::$location_id );

			if ( $location ) {
				return $location;
			}
		}

		return LocationRepository::primary();
	}

	/**
	 * A location as the header and its switcher show it.
	 *
	 * @param array $location Location row.
	 * @return array
	 */
	private static function location_summary( array $location ) {
		return array(
			'id'         => (int) $location['id'],
			'name'       => (string) $location['name'],
			'address'    => Location::formatted_address( $location ),
			'is_primary' => ! empty( $location['is_primary'] ),
		);
	}

	/**
	 * The rating of one Google listing, from stored reviews.
	 *
	 * Asked for by listing and never without one: with no listing named the
	 * repository answers for every review held, which would put another
	 * branch's rating on this one.
	 *
	 * @param string $location_name Google resource name of the listing.
	 * @return array|null Null until the listing has a review stored.
	 */
	private static function reviews( $location_name ) {
		if ( '' === $location_name ) {
			return null;
		}

		$summary = ReviewRepository::summary( $location_name );

		if ( ! $summary['count'] ) {
			return null;
		}

		return array(
			'average' => round( (float) $summary['average'], 1 ),
			'count'   => (int) $summary['count'],
		);
	}

	/**
	 * The location in hand, creating one when the business has none yet.
	 *
	 * Hours, attributes and an address all hang off a location. A new site
	 * has a business and no location, and making the owner visit another
	 * screen to create an empty one before they may enter their opening
	 * hours would be an obstacle with no purpose.
	 *
	 * @return array|WP_Error
	 */
	public static function ensure_location() {
		$location = self::location();

		if ( $location ) {
			return $location;
		}

		$business = BusinessRepository::get();

		if ( ! $business ) {
			return self::business_required();
		}

		$location = LocationRepository::create( array( 'name' => (string) $business['name'] ) );

		return $location ? $location : self::save_failed();
	}

	/**
	 * The Google listing this location is mapped to, if any.
	 *
	 * @return array|null
	 */
	public static function google_location() {
		$location = self::location();

		return $location ? GoogleLocationRepository::find_by_fhint_location( (int) $location['id'] ) : null;
	}

	/**
	 * The refusal for a section that needs a business which does not exist.
	 *
	 * @return WP_Error
	 */
	public static function business_required() {
		return new WP_Error(
			'fhint_business_required',
			__( 'Create the business profile first.', 'foundhint-local-seo' ),
			array( 'status' => 409 )
		);
	}

	/**
	 * The refusal when a write did not reach the database.
	 *
	 * @return WP_Error
	 */
	public static function save_failed() {
		return new WP_Error(
			'fhint_save_failed',
			__( 'The changes could not be saved.', 'foundhint-local-seo' ),
			array( 'status' => 500 )
		);
	}
}
