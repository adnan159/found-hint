<?php
/**
 * Name, address and phone resolution.
 *
 * @package FoundHint
 */

namespace FHINT\App\Nap;

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Location\Location;
use FHINT\App\Location\LocationRepository;
use FHINT\App\Location\OpeningHours;
use FHINT\App\Location\OpeningHoursRepository;

defined( 'ABSPATH' ) || exit;

/**
 * The single reader of name, address, phone, website, hours and logo.
 *
 * **Nothing else may hold its own copy of these values.** That guarantee is
 * the whole point: it is what makes the same phone number appear identically
 * in a block, in JSON-LD and in an audit finding. The moment a second place
 * caches "the phone number", the three can disagree on one page and the
 * plugin becomes the cause of the NAP inconsistency it exists to prevent.
 *
 * Contact details resolve **location first, business second**, so a location
 * that shares the company phone stores nothing and can never drift from it.
 */
class Nap {

	/**
	 * Resolved values for the primary location, or for a specific one.
	 *
	 * @param int $location_id Location to resolve, 0 for the primary one.
	 * @return array
	 */
	public static function resolve( $location_id = 0 ) {
		$business = BusinessRepository::get();
		$location = $location_id ? LocationRepository::find( $location_id ) : LocationRepository::primary();

		$business = $business ? $business : array();
		$location = $location ? $location : array();

		$hours = array();

		if ( ! empty( $location['id'] ) ) {
			$hours = OpeningHours::to_payload( OpeningHoursRepository::for_location( $location['id'] ) );
		}

		return array(
			'has_business'   => ! empty( $business ),
			'has_location'   => ! empty( $location ),
			'name'           => self::value( $location, $business, 'name' ),
			'business_name'  => isset( $business['name'] ) ? (string) $business['name'] : '',
			'legal_name'     => isset( $business['legal_name'] ) ? (string) $business['legal_name'] : '',
			'business_type'  => isset( $business['business_type'] ) ? (string) $business['business_type'] : '',
			'description'    => isset( $business['description'] ) ? (string) $business['description'] : '',
			'phone'          => self::contact( $location, $business, 'phone' ),
			'email'          => self::contact( $location, $business, 'email' ),
			'website'        => self::contact( $location, $business, 'website' ),
			'logo_url'       => isset( $business['logo_url'] ) ? (string) $business['logo_url'] : '',
			'price_range'    => isset( $business['price_range'] ) ? (string) $business['price_range'] : '',
			'social_profiles' => isset( $business['social_profiles'] ) && is_array( $business['social_profiles'] ) ? $business['social_profiles'] : array(),
			'address'        => self::address( $location ),
			'coordinates'    => self::coordinates( $location ),
			'timezone'       => isset( $location['timezone'] ) ? (string) $location['timezone'] : '',
			'status'         => isset( $location['status'] ) ? (string) $location['status'] : '',
			'hours'          => $hours,
			'location_id'    => isset( $location['id'] ) ? (int) $location['id'] : 0,
			'business_id'    => isset( $business['id'] ) ? (int) $business['id'] : 0,
		);
	}

	/**
	 * A contact value, preferring the location's own over the business's.
	 *
	 * @param array  $location Location record.
	 * @param array  $business Business record.
	 * @param string $field    Field name.
	 * @return string
	 */
	private static function contact( array $location, array $business, $field ) {
		$own = isset( $location[ $field ] ) ? trim( (string) $location[ $field ] ) : '';

		if ( '' !== $own ) {
			return $own;
		}

		return isset( $business[ $field ] ) ? trim( (string) $business[ $field ] ) : '';
	}

	/**
	 * The display name: the location's when set, otherwise the business's.
	 *
	 * @param array  $location Location record.
	 * @param array  $business Business record.
	 * @param string $field    Field name.
	 * @return string
	 */
	private static function value( array $location, array $business, $field ) {
		return self::contact( $location, $business, $field );
	}

	/**
	 * The address as parts plus a formatted single line.
	 *
	 * @param array $location Location record.
	 * @return array
	 */
	private static function address( array $location ) {
		if ( ! $location ) {
			return array(
				'line_1'    => '',
				'line_2'    => '',
				'city'      => '',
				'region'    => '',
				'postal'    => '',
				'country'   => '',
				'formatted' => '',
				'complete'  => false,
			);
		}

		return array(
			'line_1'    => (string) $location['address_line_1'],
			'line_2'    => (string) $location['address_line_2'],
			'city'      => (string) $location['city'],
			'region'    => (string) $location['region'],
			'postal'    => (string) $location['postal_code'],
			'country'   => (string) $location['country'],
			'formatted' => Location::formatted_address( $location ),
			'complete'  => Location::has_complete_address( $location ),
		);
	}

	/**
	 * Coordinates, or nulls when the location has none.
	 *
	 * @param array $location Location record.
	 * @return array
	 */
	private static function coordinates( array $location ) {
		$lat = isset( $location['latitude'] ) ? $location['latitude'] : null;
		$lng = isset( $location['longitude'] ) ? $location['longitude'] : null;

		return array(
			'latitude'  => null === $lat ? null : (float) $lat,
			'longitude' => null === $lng ? null : (float) $lng,
			'has_both'  => null !== $lat && null !== $lng,
		);
	}
}
