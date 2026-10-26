<?php
/**
 * Profile section: attributes.
 *
 * @package FoundHint
 */

namespace FHINT\App\Profile\Sections;

use FHINT\App\Core\ValidationResult;
use FHINT\App\Google\AttributeCatalog;
use FHINT\App\Location\LocationAttributeRepository;
use FHINT\App\Location\LocationAttributes;
use FHINT\App\Profile\Profile;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * What is true about the business: accessible, takes cards, has parking.
 *
 * Saved as `{ "values": { attribute_id: value } }`. Only the attributes named
 * are touched, and `null` withdraws an answer — which is not the same as
 * answering "no".
 *
 * `definitions` is the list of attributes Google offers this listing. It is
 * read from Google by `POST /profile/google/refresh` and is empty until then,
 * or for a location with no Google listing.
 */
class Attributes {

	/**
	 * The section as stored.
	 *
	 * @return array
	 */
	public static function read() {
		$location = Profile::location();
		$google   = Profile::google_location();

		return array(
			'location_id' => $location ? (int) $location['id'] : 0,
			'values'      => $location ? LocationAttributeRepository::for_location( (int) $location['id'] ) : array(),
			'definitions' => $google ? AttributeCatalog::definitions( (string) $google['location_name'] ) : array(),
		);
	}

	/**
	 * Save the section.
	 *
	 * @param array $fields Fields as sent.
	 * @return true|ValidationResult|WP_Error
	 */
	public static function save( array $fields ) {
		if ( ! array_key_exists( 'values', $fields ) ) {
			return true;
		}

		$parsed     = LocationAttributes::parse( $fields['values'] );
		$validation = new ValidationResult();

		$validation->merge( LocationAttributes::validate( $parsed ), 'values' );

		if ( ! $validation->is_valid() ) {
			return $validation;
		}

		$location = Profile::ensure_location();

		if ( is_wp_error( $location ) ) {
			return $location;
		}

		return LocationAttributeRepository::save( (int) $location['id'], $parsed['set'], $parsed['remove'] )
			? true
			: Profile::save_failed();
	}
}
