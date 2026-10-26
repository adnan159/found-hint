<?php
/**
 * When a business or location opened.
 *
 * @package FoundHint
 */

namespace FHINT\App\Business;

use FHINT\App\Core\ValidationResult;

defined( 'ABSPATH' ) || exit;

/**
 * The opening date, to the month.
 *
 * Google keeps it as `openInfo.openingDate`, a `{ year, month, day }` date
 * whose day may be left out, and shows it as "Opened March 2014". This
 * plugin keeps it to the month, the same precision the screen asks for:
 * stored as a `DATE` on the first of that month, shown as `YYYY-MM`, and
 * sent to Google as a year and a month with no day.
 *
 * A day Google holds is not kept. Keeping one the owner can neither see nor
 * edit here would mean sending back a value they never chose; comparing to
 * the month is also what stops a publish from "changing" 15 March 2014 into
 * March 2014 when nothing was edited.
 *
 * Pure: values in, values out.
 */
class OpeningDate {

	/**
	 * How far ahead an opening date may be. Google allows a date up to one
	 * year in the future, for a business about to open.
	 */
	const MAX_MONTHS_AHEAD = 12;

	/** The earliest year accepted — older is a typing mistake, not a shop. */
	const MIN_YEAR = 1000;

	/**
	 * A value as sent, in the stored form.
	 *
	 * `YYYY-MM` (what a month input sends) and `YYYY-MM-DD` both become the
	 * first of that month. Blank is ''. Anything else is returned trimmed,
	 * unchanged, so validation can say what is wrong with it rather than the
	 * value silently vanishing.
	 *
	 * @param mixed $value Value as sent.
	 * @return string
	 */
	public static function sanitize( $value ) {
		$value = is_scalar( $value ) ? trim( (string) $value ) : '';

		if ( '' === $value ) {
			return '';
		}

		$parts = self::parts( $value );

		return $parts ? sprintf( '%04d-%02d-01', $parts['year'], $parts['month'] ) : $value;
	}

	/**
	 * Whether a stored-form value may be kept.
	 *
	 * @param string $value Sanitised value.
	 * @param int    $now   Unix time to judge "the future" from.
	 * @return ValidationResult
	 */
	public static function validate( $value, $now = null ) {
		$result = new ValidationResult();

		if ( '' === (string) $value ) {
			return $result;
		}

		$parts = self::parts( (string) $value );

		if ( ! $parts ) {
			$result->add( 'opening_date', 'opening_date.invalid' );

			return $result;
		}

		$now   = null === $now ? time() : (int) $now;
		$today = (int) gmdate( 'Y', $now ) * 12 + (int) gmdate( 'n', $now );

		if ( $parts['year'] * 12 + $parts['month'] > $today + self::MAX_MONTHS_AHEAD ) {
			$result->add( 'opening_date', 'opening_date.too_far' );
		}

		return $result;
	}

	/**
	 * A stored value as the screen's month field shows it: `YYYY-MM`.
	 *
	 * @param string|null $value Stored date.
	 * @return string
	 */
	public static function for_screen( $value ) {
		$parts = self::parts( (string) $value );

		return $parts ? sprintf( '%04d-%02d', $parts['year'], $parts['month'] ) : '';
	}

	/**
	 * Google's `openInfo.openingDate`, in the stored form.
	 *
	 * @param mixed $date `{ year, month, day }` as Google sends it.
	 * @return string '' when Google has no usable date.
	 */
	public static function from_google( $date ) {
		if ( ! is_array( $date ) || empty( $date['year'] ) || empty( $date['month'] ) ) {
			return '';
		}

		$year  = (int) $date['year'];
		$month = (int) $date['month'];

		if ( $year < self::MIN_YEAR || $month < 1 || $month > 12 ) {
			return '';
		}

		return sprintf( '%04d-%02d-01', $year, $month );
	}

	/**
	 * A stored value as Google's date: a year and a month, no day.
	 *
	 * @param string $value Stored date.
	 * @return array `{ year, month }`, or empty when there is none.
	 */
	public static function to_google( $value ) {
		$parts = self::parts( (string) $value );

		return $parts ? $parts : array();
	}

	/**
	 * Whether two dates fall in the same month.
	 *
	 * @param string $a Stored date.
	 * @param string $b Stored date.
	 * @return bool
	 */
	public static function same_month( $a, $b ) {
		return self::for_screen( $a ) === self::for_screen( $b );
	}

	/**
	 * The year and month of `YYYY-MM` or `YYYY-MM-DD`, if it is a real one.
	 *
	 * @param string $value Date text.
	 * @return array|null `{ year, month }`.
	 */
	private static function parts( $value ) {
		if ( ! preg_match( '/^(\d{4})-(\d{2})(?:-(\d{2}))?$/', $value, $match ) ) {
			return null;
		}

		$year  = (int) $match[1];
		$month = (int) $match[2];

		if ( $year < self::MIN_YEAR || $month < 1 || $month > 12 ) {
			return null;
		}

		// A full date must be a real day; 2014-02-30 is not "February 2014".
		if ( isset( $match[3] ) && '' !== $match[3] && ! checkdate( $month, (int) $match[3], $year ) ) {
			return null;
		}

		return array(
			'year'  => $year,
			'month' => $month,
		);
	}
}
