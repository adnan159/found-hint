<?php
/**
 * Profile section: social links.
 *
 * @package FoundHint
 */

namespace FHINT\App\Profile\Sections;

use FHINT\App\Business\BookingLinks;
use FHINT\App\Business\Business;
use FHINT\App\Business\BusinessRepository;
use FHINT\App\Core\ValidationResult;
use FHINT\App\Google\AttributeCatalog;
use FHINT\App\Location\LocationCategories;
use FHINT\App\Location\LocationDetails;
use FHINT\App\Location\LocationRepository;
use FHINT\App\Profile\Profile;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * The business's profiles elsewhere on the web, and how customers book or
 * message it.
 *
 * Social links are read by two things: the website's structured data lists
 * them as `sameAs`, and Google accepts them as attributes on the listing.
 * `same_as` in the response is exactly what the structured data will carry
 * — empty links are left out.
 *
 * The booking links — an appointment link, a texting number and a WhatsApp
 * link — sit in the same card because Google holds them the same way, as
 * link attributes, and shows them as the Book and Chat buttons. They are a
 * separate field (`booking_links`) so they never reach `sameAs`: a booking
 * page is not a profile of the business.
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

		$location = Profile::location();

		return array(
			'social_profiles' => $profiles,
			'networks'        => Business::social_networks(),
			'same_as'         => $same_as,
			'booking_links'   => LocationDetails::booking( $location, BusinessRepository::get() ),
			// Which booking links Google offers this listing: `false` is kept
			// but never sent; `null` is not known yet.
			'booking_offered' => self::booking_offered(),
			// The location's country, for the texting number's country code.
			'country'         => $location ? (string) $location['country'] : '',
		);
	}

	/**
	 * Save the section.
	 *
	 * @param array $fields Fields as sent.
	 * @return true|ValidationResult|WP_Error
	 */
	public static function save( array $fields ) {
		$has_social  = array_key_exists( 'social_profiles', $fields );
		$has_booking = array_key_exists( 'booking_links', $fields );

		if ( ! $has_social && ! $has_booking ) {
			return true;
		}

		$current = BusinessRepository::get();

		if ( ! $current ) {
			return Profile::business_required();
		}

		$changes    = array();
		$validation = new ValidationResult();

		if ( $has_social ) {
			$changes = Business::sanitize( array( 'social_profiles' => $fields['social_profiles'] ) );
			$validation->merge( Business::validate( array_merge( $current, $changes ) ) );
		}

		if ( $has_booking ) {
			$changes['booking_links'] = BookingLinks::sanitize( $fields['booking_links'] );
			$validation->merge( BookingLinks::validate( $changes['booking_links'] ) );
		}

		// Both checked before either is written: half a save is worse than
		// none.
		if ( ! $validation->is_valid() ) {
			return $validation;
		}

		$location = Profile::location();

		// A location that is not the primary one keeps its links to itself,
		// and the business's are left as they were.
		if ( LocationCategories::kept_on_location( $location ) ) {
			return LocationRepository::update( (int) $location['id'], $changes )
				? true
				: Profile::save_failed();
		}

		return BusinessRepository::save( $changes ) ? true : Profile::save_failed();
	}

	/**
	 * Which of the booking links Google offers the selected location's
	 * listing, from the attribute menu a refresh stores.
	 *
	 * @return array<string,bool|null> Field => offered; null when not known
	 *                                 (no listing, or a menu never read).
	 */
	private static function booking_offered() {
		$google  = Profile::google_location();
		$offered = $google ? AttributeCatalog::offers( (string) $google['location_name'], array_values( BookingLinks::ATTRIBUTES ) ) : null;
		$fields  = array();

		foreach ( BookingLinks::ATTRIBUTES as $field => $id ) {
			$fields[ $field ] = null === $offered ? null : $offered[ $id ];
		}

		return $fields;
	}
}
