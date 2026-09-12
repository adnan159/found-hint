<?php
/**
 * Shared field validation and sanitisation.
 *
 * @package FoundHint
 */

namespace FHINT\App\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Format checks shared by every entity.
 *
 * These answer "is this a well-formed value", not "is this the right value"
 * — business rules stay in the entity that owns them. Every check treats an
 * empty value as acceptable: required-ness is a separate decision, made per
 * field by the entity, because a phone number is optional on a location and
 * effectively mandatory on a business.
 */
class Validator {

	/**
	 * Whether a string is a plausible email address.
	 *
	 * @param string $value Value to check.
	 * @return bool
	 */
	public static function is_email( $value ) {
		return '' === $value || (bool) is_email( $value );
	}

	/**
	 * Whether a string is an http(s) URL.
	 *
	 * @param string $value Value to check.
	 * @return bool
	 */
	public static function is_url( $value ) {
		if ( '' === $value ) {
			return true;
		}

		if ( ! filter_var( $value, FILTER_VALIDATE_URL ) ) {
			return false;
		}

		$scheme = wp_parse_url( $value, PHP_URL_SCHEME );

		return in_array( strtolower( (string) $scheme ), array( 'http', 'https' ), true );
	}

	/**
	 * Whether a string is a plausible phone number.
	 *
	 * Deliberately permissive: numbering plans vary by country and rejecting
	 * a real number is worse than accepting an odd one. It checks only that
	 * there are enough digits and no obviously invalid characters.
	 *
	 * @param string $value Value to check.
	 * @return bool
	 */
	public static function is_phone( $value ) {
		if ( '' === $value ) {
			return true;
		}

		if ( preg_match( '/[^0-9+()\-.\s\/ext]/i', $value ) ) {
			return false;
		}

		$digits = preg_replace( '/\D/', '', $value );

		return strlen( $digits ) >= 5 && strlen( $digits ) <= 20;
	}

	/**
	 * Whether a string is an ISO 3166-1 alpha-2 country code.
	 *
	 * @param string $value Value to check.
	 * @return bool
	 */
	public static function is_country_code( $value ) {
		return '' === $value || (bool) preg_match( '/^[A-Z]{2}$/', strtoupper( $value ) );
	}

	/**
	 * Whether a string is an ISO 4217 currency code.
	 *
	 * @param string $value Value to check.
	 * @return bool
	 */
	public static function is_currency_code( $value ) {
		return '' === $value || (bool) preg_match( '/^[A-Z]{3}$/', strtoupper( $value ) );
	}

	/**
	 * Whether a string is a known PHP timezone identifier.
	 *
	 * @param string $value Value to check.
	 * @return bool
	 */
	public static function is_timezone( $value ) {
		return '' === $value || in_array( $value, timezone_identifiers_list(), true );
	}

	/**
	 * Whether a string is a YYYY-MM-DD date that actually exists.
	 *
	 * @param string $value Value to check.
	 * @return bool
	 */
	public static function is_date( $value ) {
		if ( '' === $value ) {
			return true;
		}

		if ( ! preg_match( '/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m ) ) {
			return false;
		}

		return (bool) checkdate( (int) $m[2], (int) $m[3], (int) $m[1] );
	}

	/**
	 * Normalise a time to HH:MM:SS, or return null when unparseable.
	 *
	 * Accepts H:MM as well as HH:MM — a single-digit hour is what a person
	 * types, and rejecting it would be a validation error the user cannot
	 * make sense of.
	 *
	 * @param string $value Value to normalise.
	 * @return string|null
	 */
	public static function normalize_time( $value ) {
		$value = trim( (string) $value );

		if ( '' === $value ) {
			return null;
		}

		if ( ! preg_match( '/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/', $value, $m ) ) {
			return null;
		}

		$hour   = (int) $m[1];
		$minute = (int) $m[2];
		$second = isset( $m[3] ) ? (int) $m[3] : 0;

		if ( $hour > 23 || $minute > 59 || $second > 59 ) {
			return null;
		}

		return sprintf( '%02d:%02d:%02d', $hour, $minute, $second );
	}

	/**
	 * Whether a latitude is in range.
	 *
	 * @param mixed $value Value to check.
	 * @return bool
	 */
	public static function is_latitude( $value ) {
		return is_numeric( $value ) && (float) $value >= -90 && (float) $value <= 90;
	}

	/**
	 * Whether a longitude is in range.
	 *
	 * @param mixed $value Value to check.
	 * @return bool
	 */
	public static function is_longitude( $value ) {
		return is_numeric( $value ) && (float) $value >= -180 && (float) $value <= 180;
	}

	/**
	 * Current time in UTC, in MySQL datetime format.
	 *
	 * Written by the repositories rather than by a SQL default: a column
	 * default would make dbDelta unstable, and storing local time makes a
	 * site appear to rewrite its own history when its timezone changes.
	 *
	 * @return string
	 */
	public static function now() {
		return current_time( 'mysql', true );
	}
}
