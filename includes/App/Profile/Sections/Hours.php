<?php
/**
 * Profile section: opening hours.
 *
 * @package FoundHint
 */

namespace FHINT\App\Profile\Sections;

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Core\ValidationResult;
use FHINT\App\Location\OpeningHours;
use FHINT\App\Location\OpeningHoursRepository;
use FHINT\App\Location\SpecialHours;
use FHINT\App\Location\SpecialHoursRepository;
use FHINT\App\Profile\Profile;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * The weekly pattern, and the dates that break it.
 *
 * Two keys, saved independently: `opening_hours` is the week, in the shape
 * `/locations` already takes; `special_hours` is the list of dated
 * exceptions. Sending one leaves the other untouched. Sending either
 * **replaces the whole of it** — a week or a list is one thing, and patching
 * a single period into it would need the client to know what was there.
 */
class Hours {

	/**
	 * The section as stored.
	 *
	 * @return array
	 */
	public static function read() {
		$location    = Profile::location();
		$location_id = $location ? (int) $location['id'] : 0;

		return array(
			'location_id'   => $location_id,
			'timezone'      => $location ? (string) $location['timezone'] : '',
			'opening_hours' => OpeningHours::to_payload( $location_id ? OpeningHoursRepository::for_location( $location_id ) : array() ),
			'special_hours' => SpecialHours::to_payload( SpecialHoursRepository::for_location( $location_id ) ),
		);
	}

	/**
	 * Save the section.
	 *
	 * @param array $fields Fields as sent.
	 * @return true|ValidationResult|WP_Error
	 */
	public static function save( array $fields ) {
		$validation = new ValidationResult();
		$weekly     = null;
		$special    = null;

		if ( array_key_exists( 'opening_hours', $fields ) ) {
			$weekly = OpeningHours::parse( $fields['opening_hours'] );
			$validation->merge( OpeningHours::validate( $weekly ), 'opening_hours' );
		}

		if ( array_key_exists( 'special_hours', $fields ) ) {
			$special = SpecialHours::parse( $fields['special_hours'] );
			$validation->merge( SpecialHours::validate( $special ), 'special_hours' );
		}

		// Everything is checked before anything is written, so a bad holiday
		// cannot leave the week saved and the exceptions not.
		if ( ! $validation->is_valid() ) {
			return $validation;
		}

		if ( null === $weekly && null === $special ) {
			return true;
		}

		$location = Profile::ensure_location();

		if ( is_wp_error( $location ) ) {
			return $location;
		}

		if ( null !== $weekly && ! OpeningHoursRepository::replace( (int) $location['id'], $weekly ) ) {
			return Profile::save_failed();
		}

		if ( null !== $special && ! SpecialHoursRepository::replace( (int) $location['id'], $special ) ) {
			return Profile::save_failed();
		}

		// The hours repositories do not announce a change themselves — on
		// `/locations` the location update beside them does. Here there is no
		// such update, and without this the cached schema would go on
		// publishing the old opening hours.
		BusinessRepository::stamp_data_changed();

		return true;
	}
}
