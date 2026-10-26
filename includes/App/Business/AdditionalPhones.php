<?php
/**
 * The phone numbers besides the main one.
 *
 * @package FoundHint
 */

namespace FHINT\App\Business;

use FHINT\App\Core\ValidationResult;
use FHINT\App\Core\Validator;
use FHINT\App\Google\Push\GoogleFormat;

defined( 'ABSPATH' ) || exit;

/**
 * Up to two more numbers, as Google keeps them.
 *
 * Google holds a listing's numbers as `phoneNumbers`: one `primaryPhone` and
 * a list of `additionalPhones`, at most two. They are kept here as a plain
 * list of strings in that order, beside the main number rather than mixed
 * into it, because the main number is the one search shows and calls.
 *
 * Pure: values in, values out.
 */
class AdditionalPhones {

	/** Google's limit. */
	const MAX = 2;

	/**
	 * A list as sent, cleaned: text only, blanks dropped, repeats dropped,
	 * the order kept.
	 *
	 * Repeats are compared as numbers, so "(512) 555-0199", "512 555 0199"
	 * and "+1 512 555 0199" are one — the same rule a publish compares by.
	 * The limit is not applied here: a list that is too long is refused by
	 * validation, not quietly cut, so nobody loses a number without being
	 * told.
	 *
	 * @param mixed $value List as sent.
	 * @return string[]
	 */
	public static function sanitize( $value ) {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$clean = array();

		foreach ( $value as $number ) {
			$number = is_scalar( $number ) ? sanitize_text_field( (string) $number ) : '';

			if ( '' === $number || self::listed( $number, $clean ) ) {
				continue;
			}

			$clean[] = $number;
		}

		return $clean;
	}

	/**
	 * Whether a cleaned list may be kept beside a given main number.
	 *
	 * Errors are keyed `additional_phones` for the list as a whole and
	 * `additional_phones.N` for one entry, so the form can put each message
	 * under its own box.
	 *
	 * @param string[] $numbers Cleaned list.
	 * @param string   $main    The main number they sit beside.
	 * @return ValidationResult
	 */
	public static function validate( array $numbers, $main = '' ) {
		$result = new ValidationResult();

		if ( count( $numbers ) > self::MAX ) {
			$result->add( 'additional_phones', 'business.additional_phones.too_many' );
		}

		foreach ( array_values( $numbers ) as $index => $number ) {
			if ( ! Validator::is_phone( (string) $number ) ) {
				$result->add( 'additional_phones.' . $index, 'business.phone.invalid' );
			} elseif ( '' !== trim( (string) $main ) && GoogleFormat::same_phone( $number, $main ) ) {
				// Google refuses a number listed twice, and it says nothing
				// new to a customer either.
				$result->add( 'additional_phones.' . $index, 'business.additional_phones.same_as_main' );
			}
		}

		return $result;
	}

	/**
	 * Google's `phoneNumbers.additionalPhones`, as a list.
	 *
	 * @param mixed $phone_numbers Google's `phoneNumbers` object.
	 * @return string[]
	 */
	public static function from_google( $phone_numbers ) {
		$list = is_array( $phone_numbers ) && isset( $phone_numbers['additionalPhones'] ) ? $phone_numbers['additionalPhones'] : array();

		return self::sanitize( is_array( $list ) ? $list : array() );
	}

	/**
	 * Whether two lists hold the same numbers, in any order and however
	 * they are written.
	 *
	 * @param string[] $a One list.
	 * @param string[] $b Another.
	 * @return bool
	 */
	public static function same( array $a, array $b ) {
		if ( count( $a ) !== count( $b ) ) {
			return false;
		}

		foreach ( $a as $number ) {
			if ( ! self::listed( $number, $b ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Whether a number is already in a list.
	 *
	 * @param string   $number Phone number as written.
	 * @param string[] $list   Numbers.
	 * @return bool
	 */
	private static function listed( $number, array $list ) {
		// Text with no digits is not a number to compare; it matches only
		// itself, and is kept for validation to refuse where it was typed.
		$digits = '' !== preg_replace( '/\D+/', '', (string) $number );

		foreach ( $list as $other ) {
			if ( $digits ? GoogleFormat::same_phone( $number, $other ) : (string) $number === (string) $other ) {
				return true;
			}
		}

		return false;
	}
}
