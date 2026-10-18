<?php
/**
 * How customers book or message the business.
 *
 * @package FoundHint
 */

namespace FHINT\App\Business;

use FHINT\App\Core\ValidationResult;
use FHINT\App\Google\Push\GoogleFormat;

defined( 'ABSPATH' ) || exit;

/**
 * An appointment link, a texting number and a WhatsApp link.
 *
 * Google keeps all three as link attributes on the listing, beside the
 * social links — `url_appointment`, `url_text_messaging` and `url_whatsapp`
 * — and shows them as the *Book* and *Chat* buttons. Google decides per
 * listing which of them it offers: the appointment link is not given to
 * every category.
 *
 * The texting number is a phone number to a person but a link to Google:
 * kept here in international form, `+8801712345678`, and sent as
 * `sms:+8801712345678` (Google's own documented form). WhatsApp is a
 * `wa.me` link, as Google documents it.
 *
 * Pure: values in, values out.
 */
class BookingLinks {

	/** Field => Google's attribute id, in the order the screen lists them. */
	const ATTRIBUTES = array(
		'appointment'    => 'url_appointment',
		'text_messaging' => 'url_text_messaging',
		'whatsapp'       => 'url_whatsapp',
	);

	/** Where a WhatsApp link may point. */
	const WHATSAPP_HOSTS = array( 'wa.me', 'whatsapp.com', 'api.whatsapp.com', 'www.whatsapp.com' );

	/**
	 * Every field present, each '' when there is nothing.
	 *
	 * @param mixed $links Links as stored or sent.
	 * @return array<string,string>
	 */
	public static function complete( $links ) {
		$links    = is_array( $links ) ? $links : array();
		$complete = array();

		foreach ( array_keys( self::ATTRIBUTES ) as $field ) {
			$complete[ $field ] = isset( $links[ $field ] ) && is_scalar( $links[ $field ] ) ? (string) $links[ $field ] : '';
		}

		return $complete;
	}

	/**
	 * Links as sent, cleaned. Unknown keys are dropped.
	 *
	 * The texting number keeps only a leading `+` and digits, so
	 * "+880 1712-345678" is stored as "+8801712345678" and compares as one
	 * number however it was typed.
	 *
	 * @param mixed $links Links as sent.
	 * @return array<string,string>
	 */
	public static function sanitize( $links ) {
		$clean = array();

		foreach ( self::complete( $links ) as $field => $value ) {
			$value = trim( $value );

			if ( 'text_messaging' === $field ) {
				$clean[ $field ] = self::number( $value );
			} else {
				// Escaped as a link only when it is written as one. esc_url_raw()
				// would turn "not a link" into "http://not%20a%20link", which
				// then looks valid; kept as typed, validation refuses it.
				$clean[ $field ] = preg_match( '#^https?://#i', $value ) ? esc_url_raw( $value, array( 'http', 'https' ) ) : sanitize_text_field( $value );
			}
		}

		return $clean;
	}

	/**
	 * Whether cleaned links may be kept.
	 *
	 * @param array $links Cleaned links.
	 * @return ValidationResult Errors keyed `booking_links.<field>`.
	 */
	public static function validate( array $links ) {
		$result = new ValidationResult();
		$links  = self::complete( $links );

		if ( '' !== $links['appointment'] && ! self::is_web_url( $links['appointment'] ) ) {
			$result->add( 'booking_links.appointment', 'booking.appointment.invalid' );
		}

		// International form: a +, then 8 to 15 digits — the shortest
		// country code and number together, up to E.164's longest.
		if ( '' !== $links['text_messaging'] && ! preg_match( '/^\+\d{8,15}$/', $links['text_messaging'] ) ) {
			$result->add( 'booking_links.text_messaging', 'booking.text_messaging.invalid' );
		}

		if ( '' !== $links['whatsapp'] && ! self::is_whatsapp( $links['whatsapp'] ) ) {
			$result->add( 'booking_links.whatsapp', 'booking.whatsapp.invalid' );
		}

		return $result;
	}

	/**
	 * The links a listing holds, from Google's attribute answers.
	 *
	 * @param array $attributes Google's attributes response.
	 * @return array<string,string> Only the fields Google has.
	 */
	public static function from_google( array $attributes ) {
		$items = isset( $attributes['attributes'] ) && is_array( $attributes['attributes'] ) ? $attributes['attributes'] : array();
		$ids   = array_flip( self::ATTRIBUTES );
		$links = array();

		foreach ( $items as $attribute ) {
			if ( ! is_array( $attribute ) || empty( $attribute['name'] ) || empty( $attribute['uriValues'] ) || ! is_array( $attribute['uriValues'] ) ) {
				continue;
			}

			$id = substr( (string) $attribute['name'], strrpos( (string) $attribute['name'], '/' ) + 1 );

			if ( ! isset( $ids[ $id ] ) ) {
				continue;
			}

			$first = reset( $attribute['uriValues'] );
			$uri   = is_array( $first ) && isset( $first['uri'] ) ? trim( (string) $first['uri'] ) : '';
			$field = $ids[ $id ];

			if ( '' === $uri ) {
				continue;
			}

			// `sms:+8801712345678` → `+8801712345678`. A number Google holds
			// without a country code is kept as it is, digits only.
			$links[ $field ] = 'text_messaging' === $field ? self::number( preg_replace( '/^(sms|tel):/i', '', $uri ) ) : $uri;
		}

		return $links;
	}

	/**
	 * One stored value as the link Google keeps.
	 *
	 * @param string $field Field.
	 * @param string $value Stored value.
	 * @return string
	 */
	public static function to_google( $field, $value ) {
		$value = (string) $value;

		return 'text_messaging' === $field && '' !== $value ? 'sms:' . $value : $value;
	}

	/**
	 * Whether a value here and a link on Google say the same thing.
	 *
	 * @param string $field  Field.
	 * @param string $here   Stored value.
	 * @param string $google Google's link.
	 * @return bool
	 */
	public static function same( $field, $here, $google ) {
		if ( 'text_messaging' === $field ) {
			return GoogleFormat::same_phone( $here, preg_replace( '/^(sms|tel):/i', '', (string) $google ) );
		}

		return GoogleFormat::url_key( $here ) === GoogleFormat::url_key( $google );
	}

	/**
	 * A texting number reduced to a leading + and digits.
	 *
	 * @param string $value Number as typed.
	 * @return string
	 */
	private static function number( $value ) {
		$value  = trim( (string) $value );
		$digits = preg_replace( '/\D+/', '', $value );

		if ( '' === $digits ) {
			return '';
		}

		return ( 0 === strpos( $value, '+' ) ? '+' : '' ) . $digits;
	}

	/**
	 * Whether a value is an http(s) address with a real host name.
	 *
	 * @param string $url Value.
	 * @return bool
	 */
	private static function is_web_url( $url ) {
		$parts = wp_parse_url( (string) $url );

		if ( ! is_array( $parts ) || empty( $parts['host'] ) || ! isset( $parts['scheme'] ) || ! in_array( strtolower( $parts['scheme'] ), array( 'http', 'https' ), true ) ) {
			return false;
		}

		// A real host name: labels and at least one dot.
		return (bool) preg_match( '/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i', $parts['host'] );
	}

	/**
	 * Whether a value is a WhatsApp link.
	 *
	 * @param string $url Value.
	 * @return bool
	 */
	private static function is_whatsapp( $url ) {
		if ( ! self::is_web_url( $url ) ) {
			return false;
		}

		return in_array( strtolower( (string) wp_parse_url( (string) $url, PHP_URL_HOST ) ), self::WHATSAPP_HOSTS, true );
	}
}
