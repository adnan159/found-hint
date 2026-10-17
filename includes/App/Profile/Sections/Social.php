<?php
/**
 * Profile section: social links.
 *
 * @package FoundHint
 */

namespace FHINT\App\Profile\Sections;

use FHINT\App\Business\Business;
use FHINT\App\Business\BusinessRepository;
use FHINT\App\Core\ValidationResult;
use FHINT\App\Location\LocationCategories;
use FHINT\App\Location\LocationDetails;
use FHINT\App\Location\LocationRepository;
use FHINT\App\Profile\Profile;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * The business's profiles elsewhere on the web.
 *
 * Stored once, on the business, and read by two things: the website's
 * structured data lists them as `sameAs`, and Google accepts them as
 * attributes on the listing. `same_as` in the response is exactly what the
 * structured data will carry — empty links are left out.
 */
class Social {

	/**
	 * The section as stored.
	 *
	 * @return array
	 */
	public static function read() {
		// The selected location's own links when it has saved some, the
		// business's otherwise.
		$stored = LocationDetails::social( Profile::location(), BusinessRepository::get() );

		$profiles = array();
		$same_as  = array();

		foreach ( Business::social_networks() as $network ) {
			$url = isset( $stored[ $network ] ) ? trim( (string) $stored[ $network ] ) : '';

			$profiles[ $network ] = $url;

			if ( '' !== $url ) {
				$same_as[] = $url;
			}
		}

		return array(
			'social_profiles' => $profiles,
			'networks'        => Business::social_networks(),
			'same_as'         => $same_as,
		);
	}

	/**
	 * Save the section.
	 *
	 * @param array $fields Fields as sent.
	 * @return true|ValidationResult|WP_Error
	 */
	public static function save( array $fields ) {
		if ( ! array_key_exists( 'social_profiles', $fields ) ) {
			return true;
		}

		$current = BusinessRepository::get();

		if ( ! $current ) {
			return Profile::business_required();
		}

		$changes = Business::sanitize( array( 'social_profiles' => $fields['social_profiles'] ) );

		$validation = Business::validate( array_merge( $current, $changes ) );

		if ( ! $validation->is_valid() ) {
			return $validation;
		}

		$location = Profile::location();

		// A location that is not the primary one keeps its links to itself,
		// and the business's are left as they were.
		if ( LocationCategories::kept_on_location( $location ) ) {
			return LocationRepository::update( (int) $location['id'], array( 'social_profiles' => $changes['social_profiles'] ) )
				? true
				: Profile::save_failed();
		}

		return BusinessRepository::save( $changes ) ? true : Profile::save_failed();
	}
}
