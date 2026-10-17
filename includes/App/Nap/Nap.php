<?php
/**
 * Name, address and phone resolution.
 *
 * @package FoundHint
 */

namespace FHINT\App\Nap;

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Google\ImportMapper;
use FHINT\App\Location\Location;
use FHINT\App\Location\LocationCategories;
use FHINT\App\Location\LocationDetails;
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

		// Name, description, links and categories follow the location: the
		// primary location's are the business's, any other location's are
		// its own where it has them. See LocationDetails.
		$details    = LocationDetails::resolve( $location ? $location : null, $business );
		$own        = LocationCategories::kept_on_location( $location ? $location : null );
		$categories = LocationCategories::resolve( $location ? $location : null, $business );

		return array(
			'has_business'   => ! empty( $business ),
			'has_location'   => ! empty( $location ),
			'is_primary'     => ! $own,
			// Whether this location trades under a name of its own — a
			// different business on the same account rather than a branch.
			'own_name'       => $own && '' !== trim( (string) $location['business_name'] ),
			// A location that trades under a name of its own is published under
			// it. Otherwise the location's label wins over the business name,
			// as it always has: "Acme Coffee — Downtown" is a branch's name.
			'name'           => $own && '' !== trim( (string) $location['business_name'] ) ? (string) $location['business_name'] : self::value( $location, $business, 'name' ),
			'business_name'  => isset( $business['name'] ) ? (string) $business['name'] : '',
			'legal_name'     => isset( $business['legal_name'] ) ? (string) $business['legal_name'] : '',
			'business_type'  => self::business_type( $own, $categories, $business ),
			'description'    => $details['description'],
			'phone'          => self::contact( $location, $business, 'phone' ),
			'email'          => self::contact( $location, $business, 'email' ),
			'website'        => self::contact( $location, $business, 'website' ),
			'logo_url'       => isset( $business['logo_url'] ) ? (string) $business['logo_url'] : '',
			'price_range'    => isset( $business['price_range'] ) ? (string) $business['price_range'] : '',
			'social_profiles' => LocationDetails::social( $location ? $location : null, $business ),
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
	 * The schema.org type for a location.
	 *
	 * The business's own type, unless this location keeps categories of its
	 * own and its main category maps to a type: a pet shop on the same
	 * account as a software company is a PetStore, not a software company.
	 *
	 * @param bool  $own        Whether the location keeps its own details.
	 * @param array $categories The location's resolved categories.
	 * @param array $business   Business record.
	 * @return string
	 */
	private static function business_type( $own, array $categories, array $business ) {
		$type = isset( $business['business_type'] ) ? (string) $business['business_type'] : '';

		if ( $own && '' !== $categories['primary_category'] && $categories['primary_category'] !== ( isset( $business['primary_category'] ) ? (string) $business['primary_category'] : '' ) ) {
			$mapped = ImportMapper::type_for_category( $categories['primary_category'] );

			return '' !== $mapped ? $mapped : $type;
		}

		return $type;
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
