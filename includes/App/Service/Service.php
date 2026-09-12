<?php
/**
 * Service entity.
 *
 * @package FoundHint
 */

namespace FHINT\App\Service;

use FHINT\App\Core\ValidationResult;
use FHINT\App\Core\Validator;

defined( 'ABSPATH' ) || exit;

/**
 * Something the business offers.
 *
 * A price without a currency is meaningless — "120" tells a visitor nothing —
 * so the pair is validated together rather than each field alone. A price of
 * zero is a real published price ("free consultation"); *no* price is null.
 * Those two must stay distinguishable.
 */
class Service {

	const STATUS_ACTIVE   = 'active';
	const STATUS_INACTIVE = 'inactive';

	/**
	 * Valid statuses.
	 *
	 * @return string[]
	 */
	public static function statuses() {
		return array( self::STATUS_ACTIVE, self::STATUS_INACTIVE );
	}

	/**
	 * Fields a client may write.
	 *
	 * @return string[]
	 */
	public static function writable_fields() {
		return array(
			'name',
			'slug',
			'description',
			'image_attachment_id',
			'image_url',
			'price',
			'currency',
			'url',
			'status',
			'sort_order',
		);
	}

	/**
	 * An empty service, with every key present.
	 *
	 * @return array
	 */
	public static function blank() {
		return array(
			'id'                  => 0,
			'business_id'         => 0,
			'name'                => '',
			'slug'                => '',
			'description'         => '',
			'image_attachment_id' => 0,
			'image_url'           => '',
			'price'               => null,
			'currency'            => '',
			'url'                 => '',
			'status'              => self::STATUS_ACTIVE,
			'sort_order'          => 0,
			'created_at'          => '',
			'updated_at'          => '',
		);
	}

	/**
	 * Sanitise an incoming payload down to writable fields.
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
				case 'price':
					// '' clears the price; 0 is a real price and must survive.
					$clean[ $field ] = ( '' === $value || null === $value ) ? null : $value;
					break;

				case 'currency':
					$clean[ $field ] = strtoupper( sanitize_text_field( (string) $value ) );
					break;

				case 'slug':
					$clean[ $field ] = sanitize_title( (string) $value );
					break;

				case 'description':
					$clean[ $field ] = sanitize_textarea_field( (string) $value );
					break;

				case 'url':
				case 'image_url':
					$clean[ $field ] = esc_url_raw( trim( (string) $value ) );
					break;

				case 'image_attachment_id':
					$clean[ $field ] = max( 0, (int) $value );
					break;

				case 'sort_order':
					$clean[ $field ] = (int) $value;
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
			$result->add( 'name', 'service.name.required' );
		} elseif ( mb_strlen( $name ) > 255 ) {
			$result->add( 'name', 'service.name.too_long' );
		}

		$slug = isset( $data['slug'] ) ? trim( (string) $data['slug'] ) : '';

		if ( '' === $slug ) {
			$result->add( 'slug', 'service.slug.required' );
		} elseif ( mb_strlen( $slug ) > 200 ) {
			$result->add( 'slug', 'service.slug.too_long' );
		}

		$price = isset( $data['price'] ) ? $data['price'] : null;

		if ( null !== $price && '' !== $price ) {
			if ( ! is_numeric( $price ) ) {
				$result->add( 'price', 'service.price.invalid' );
			} elseif ( (float) $price < 0 ) {
				$result->add( 'price', 'service.price.negative' );
			} elseif ( empty( $data['currency'] ) ) {
				$result->add( 'currency', 'service.currency.required_with_price' );
			}
		}

		if ( ! empty( $data['currency'] ) && ! Validator::is_currency_code( (string) $data['currency'] ) ) {
			$result->add( 'currency', 'service.currency.invalid' );
		}

		if ( ! empty( $data['url'] ) && ! Validator::is_url( (string) $data['url'] ) ) {
			$result->add( 'url', 'service.url.invalid' );
		}

		if ( ! empty( $data['image_url'] ) && ! Validator::is_url( (string) $data['image_url'] ) ) {
			$result->add( 'image_url', 'service.image_url.invalid' );
		}

		if ( ! empty( $data['status'] ) && ! in_array( (string) $data['status'], self::statuses(), true ) ) {
			$result->add( 'status', 'service.status.invalid' );
		}

		return $result;
	}
}
