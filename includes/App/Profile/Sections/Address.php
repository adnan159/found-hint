<?php
/**
 * Profile section: address and map position.
 *
 * @package FoundHint
 */

namespace FHINT\App\Profile\Sections;

use FHINT\App\Core\ValidationResult;
use FHINT\App\Location\Location;
use FHINT\App\Location\LocationRepository;
use FHINT\App\Location\ServiceArea;
use FHINT\App\Profile\Profile;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Where the business is.
 *
 * **Once the location is mapped to a Google listing, the address is
 * Google's.** Google does not let an application move a verified business,
 * so from then on this site shows the address Google reports and refuses to
 * edit it here — otherwise the two would drift apart and nothing could bring
 * them back together. Before a listing is mapped, the address is the
 * owner's to enter.
 */
class Address {

	const FIELDS = array(
		'address_line_1',
		'address_line_2',
		'city',
		'region',
		'postal_code',
		'country',
		'latitude',
		'longitude',
	);

	/**
	 * The section as stored.
	 *
	 * @return array
	 */
	public static function read() {
		$location = Profile::location();
		$location = $location ? $location : Location::blank();

		$address = array( 'location_id' => (int) $location['id'] );

		foreach ( self::FIELDS as $field ) {
			$address[ $field ] = in_array( $field, array( 'latitude', 'longitude' ), true )
				? ( null === $location[ $field ] || '' === $location[ $field ] ? null : (float) $location[ $field ] )
				: (string) $location[ $field ];
		}

		$address['formatted'] = $location['id'] ? Location::formatted_address( $location ) : '';
		$address['locked']    = self::is_locked();
		// The places served, each `{ name, place_id }`; one with no
		// place_id was typed here and is not sent to Google.
		$address['service_area']     = isset( $location['service_area'] ) && is_array( $location['service_area'] ) ? array_values( $location['service_area'] ) : array();
		$address['service_area_max'] = ServiceArea::MAX;

		return $address;
	}

	/**
	 * Save the section.
	 *
	 * @param array $fields Fields as sent.
	 * @return true|ValidationResult|WP_Error
	 */
	public static function save( array $fields ) {
		$has_area    = array_key_exists( 'service_area', $fields );
		$has_address = (bool) array_intersect_key( $fields, array_flip( self::FIELDS ) );

		if ( ! $has_area && ! $has_address ) {
			return true;
		}

		// Only the address itself is Google's once a listing is mapped. The
		// service area stays the owner's to edit either way.
		if ( $has_address && self::is_locked() ) {
			return new WP_Error(
				'fhint_address_locked',
				__( 'This address comes from your Google Business Profile. Change it on Google and it will be picked up here.', 'foundhint-local-seo' ),
				array( 'status' => 409 )
			);
		}

		$location = Profile::ensure_location();

		if ( is_wp_error( $location ) ) {
			return $location;
		}

		$changes = Location::sanitize( array_intersect_key( $fields, array_flip( self::FIELDS ) ) );

		// The address is checked only when it is being changed: a mapped
		// listing's address is Google's, and saving a service area must not
		// be refused over a value nobody here can edit.
		$validation = $has_address ? Location::validate( array_merge( $location, $changes ) ) : new ValidationResult();

		if ( $has_area ) {
			$changes['service_area'] = ServiceArea::sanitize( $fields['service_area'] );
			$validation->merge( ServiceArea::validate( $changes['service_area'] ) );
		}

		if ( ! $validation->is_valid() ) {
			return $validation;
		}

		return LocationRepository::update( (int) $location['id'], $changes ) ? true : Profile::save_failed();
	}

	/**
	 * Whether Google owns this address.
	 *
	 * @return bool
	 */
	public static function is_locked() {
		return null !== Profile::google_location();
	}
}
