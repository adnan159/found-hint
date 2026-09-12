<?php
/**
 * Day-of-week handling.
 *
 * @package FoundHint
 */

namespace FHINT\App\Location;

defined( 'ABSPATH' ) || exit;

/**
 * Day numbering and display order.
 *
 * Storage numbering matches PHP's date('w') — 0 = Sunday … 6 = Saturday — so
 * no conversion is needed when comparing stored hours against "is it open
 * now". Which day a week *starts* on is a display concern and varies by
 * locale, so it is handled separately by display_order(); the two must never
 * be conflated or hours will silently shift by a day.
 */
class DayOfWeek {

	const SUNDAY    = 0;
	const MONDAY    = 1;
	const TUESDAY   = 2;
	const WEDNESDAY = 3;
	const THURSDAY  = 4;
	const FRIDAY    = 5;
	const SATURDAY  = 6;

	/**
	 * Every day in storage order.
	 *
	 * @return int[]
	 */
	public static function all() {
		return array( 0, 1, 2, 3, 4, 5, 6 );
	}

	/**
	 * Whether a value is a valid day number.
	 *
	 * @param mixed $day Value to check.
	 * @return bool
	 */
	public static function is_valid( $day ) {
		return is_numeric( $day ) && in_array( (int) $day, self::all(), true );
	}

	/**
	 * Days in the order they should be displayed, honouring the site's
	 * "week starts on" setting.
	 *
	 * @return int[]
	 */
	public static function display_order() {
		$start = (int) get_option( 'start_of_week', 1 );

		if ( ! self::is_valid( $start ) ) {
			$start = 1;
		}

		$order = array();

		for ( $i = 0; $i < 7; $i++ ) {
			$order[] = ( $start + $i ) % 7;
		}

		return $order;
	}

	/**
	 * Translated day name.
	 *
	 * @param int $day Day number.
	 * @return string
	 */
	public static function name( $day ) {
		global $wp_locale;

		$day = (int) $day;

		if ( $wp_locale instanceof \WP_Locale ) {
			return $wp_locale->get_weekday( $day );
		}

		$fallback = array( 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' );

		return isset( $fallback[ $day ] ) ? $fallback[ $day ] : '';
	}
}
