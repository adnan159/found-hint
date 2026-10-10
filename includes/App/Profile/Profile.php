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
use FHINT\App\Google\Categories;
use FHINT\App\Google\Connection;
use FHINT\App\Google\GoogleLocationRepository;
use FHINT\App\Location\LocationRepository;
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
		$google = self::google_location();

		return array(
			'exists' => BusinessRepository::exists(),
			'google' => array(
				'status'    => Connection::status(),
				'connected' => Connection::STATUS_CONNECTED === Connection::status(),
				'mapped'    => null !== $google,
				'location'  => $google ? (string) $google['location_name'] : '',
				'account'   => $google ? (string) $google['account_name'] : '',
				'title'     => $google ? (string) $google['title'] : '',
				'verified'  => $google ? 'VERIFIED' === strtoupper( (string) $google['verification_state'] ) : false,
				'synced_at' => $google && ! empty( $google['synced_at'] ) ? (string) $google['synced_at'] : null,
				'pushed_at' => $google && ! empty( $google['pushed_at'] ) ? (string) $google['pushed_at'] : null,
			),
			'limits' => array(
				'description'           => Business::DESCRIPTION_MAX,
				'additional_categories' => Categories::MAX_ADDITIONAL,
			),
		);
	}

	/**
	 * The location this screen describes: the primary one.
	 *
	 * @return array|null
	 */
	public static function location() {
		return LocationRepository::primary();
	}

	/**
	 * The primary location, creating it when the business has none yet.
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
	 * The Google listing the primary location is mapped to, if any.
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
