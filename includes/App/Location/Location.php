<?php
/**
 * Location entity.
 *
 * @package FoundHint
 */

namespace FHINT\App\Location;

use FHINT\App\Core\ValidationResult;
use FHINT\App\Core\Validator;

defined( 'ABSPATH' ) || exit;

/**
 * A physical place the business trades from.
 *
 * Contact fields are optional on purpose: an empty phone, email or website
 * means "use the business value", which is what lets a single-location site
 * enter its number once instead of twice and never have the two disagree.
 * App\Nap\Nap does that resolution — location first, business second.
 */
class Location {

	const STATUS_ACTIVE             = 'active';
	const STATUS_INACTIVE           = 'inactive';
	const STATUS_TEMPORARILY_CLOSED = 'temporarily_closed';
	const STATUS_PERMANENTLY_CLOSED = 'permanently_closed';

	/**
	 * Statuses an operator may publish, mirroring what Google accepts.
	 *
	 * @return string[]
	 */
	public static function statuses() {
		return array(
			self::STATUS_ACTIVE,
			self::STATUS_INACTIVE,
			self::STATUS_TEMPORARILY_CLOSED,
			self::STATUS_PERMANENTLY_CLOSED,
		);
	}

	/**
	 * Fields a client may write.
	 *
	 * @return string[]
	 */
	public static function writable_fields() {
		return array(
			'name',
			'address_line_1',
			'address_line_2',
			'city',
			'region',
			'country',
			'postal_code',
			'latitude',
			'longitude',
			'phone',
			'email',
			'website',
			'timezone',
			'status',
			'is_primary',
		);
	}

	/**
	 * An empty location, with every key present.
	 *
	 * @return array
	 */
	public static function blank() {
		return array(
			'id'                => 0,
			'business_id'       => 0,
			'wordpress_post_id' => 0,
			'name'              => '',
			'address_line_1'    => '',
			'address_line_2'    => '',
			'city'              => '',
			'region'            => '',
			'country'           => '',
			'postal_code'       => '',
			'latitude'          => null,
			'longitude'         => null,
			'phone'             => '',
			'email'             => '',
			'website'           => '',
			'timezone'          => '',
			'status'            => self::STATUS_ACTIVE,
			'is_primary'        => false,
			'created_at'        => '',
			'updated_at'        => '',
		);
	}

	/**
	 * Sanitise an incoming payload down to writable fields.
	 *
	 * Only keys actually present are returned, so an absent key means
	 * "leave it alone" rather than "clear it".
	 *
	 * @param array $input Raw request data.
	 * @return array
	 */
	public static function sanitize( array $input ) {
		$clean = array();

		foreach ( self::writable_fields() as $field ) {
			if ( ! array_key_exists( $field, $input ) ) {
				continue;
			}

			$value = $input[ $field ];

			switch ( $field ) {
				case 'latitude':
				case 'longitude':
					// '' clears the coordinate; null stays null. A real 0 is a
					// valid coordinate, so it must survive this untouched.
					$clean[ $field ] = ( '' === $value || null === $value ) ? null : $value;
					break;

				case 'country':
					$clean[ $field ] = strtoupper( sanitize_text_field( (string) $value ) );
					break;

				case 'email':
					$clean[ $field ] = sanitize_email( trim( (string) $value ) );
					break;

				case 'website':
					$clean[ $field ] = esc_url_raw( trim( (string) $value ) );
					break;

				case 'is_primary':
					$clean[ $field ] = (bool) $value;
					break;

				default:
					$clean[ $field ] = sanitize_text_field( (string) $value );
					break;
			}
		}

		return $clean;
	}

	/**
	 * Check a complete record against the business rules.
	 *
	 * @param array $data Full record, as it would be stored.
	 * @return ValidationResult
	 */
	public static function validate( array $data ) {
		$result = new ValidationResult();

		$name = isset( $data['name'] ) ? trim( (string) $data['name'] ) : '';

		if ( '' === $name ) {
			$result->add( 'name', 'location.name.required' );
		} elseif ( mb_strlen( $name ) > 255 ) {
			$result->add( 'name', 'location.name.too_long' );
		}

		foreach ( array( 'address_line_1', 'address_line_2', 'city', 'region' ) as $field ) {
			if ( isset( $data[ $field ] ) && mb_strlen( (string) $data[ $field ] ) > 255 ) {
				$result->add( $field, 'address.too_long' );
			}
		}

		if ( ! empty( $data['country'] ) && ! Validator::is_country_code( (string) $data['country'] ) ) {
			$result->add( 'country', 'address.country.invalid' );
		}

		if ( null !== $data['latitude'] && '' !== $data['latitude'] && ! Validator::is_latitude( $data['latitude'] ) ) {
			$result->add( 'latitude', 'location.latitude.invalid' );
		}

		if ( null !== $data['longitude'] && '' !== $data['longitude'] && ! Validator::is_longitude( $data['longitude'] ) ) {
			$result->add( 'longitude', 'location.longitude.invalid' );
		}

		if ( ! empty( $data['email'] ) && ! Validator::is_email( (string) $data['email'] ) ) {
			$result->add( 'email', 'location.email.invalid' );
		}

		if ( ! empty( $data['phone'] ) && ! Validator::is_phone( (string) $data['phone'] ) ) {
			$result->add( 'phone', 'location.phone.invalid' );
		}

		if ( ! empty( $data['website'] ) && ! Validator::is_url( (string) $data['website'] ) ) {
			$result->add( 'website', 'location.website.invalid' );
		}

		if ( ! empty( $data['timezone'] ) && ! Validator::is_timezone( (string) $data['timezone'] ) ) {
			$result->add( 'timezone', 'location.timezone.invalid' );
		}

		if ( ! empty( $data['status'] ) && ! in_array( (string) $data['status'], self::statuses(), true ) ) {
			$result->add( 'status', 'location.status.invalid' );
		}

		return $result;
	}

	/**
	 * The address as a single line, for display and schema comparison.
	 *
	 * @param array $location Full record.
	 * @return string
	 */
	public static function formatted_address( array $location ) {
		$parts = array(
			$location['address_line_1'],
			$location['address_line_2'],
			$location['city'],
			$location['region'],
			$location['postal_code'],
			$location['country'],
		);

		$parts = array_filter(
			array_map( 'trim', array_map( 'strval', $parts ) ),
			static function ( $part ) {
				return '' !== $part;
			}
		);

		return implode( ', ', $parts );
	}

	/**
	 * Whether the address has the parts that make it findable.
	 *
	 * @param array $location Full record.
	 * @return bool
	 */
	public static function has_complete_address( array $location ) {
		foreach ( array( 'address_line_1', 'city', 'country', 'postal_code' ) as $field ) {
			if ( '' === trim( (string) $location[ $field ] ) ) {
				return false;
			}
		}

		return true;
	}
}
