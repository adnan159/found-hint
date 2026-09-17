<?php
/**
 * The 30-day limit on cached coordinates.
 *
 * @package FoundHint
 */

namespace FHINT\App\Places;

defined( 'ABSPATH' ) || exit;

/**
 * Deletes coordinates once Google's caching permission runs out.
 *
 * Places API §14.3 of the Maps Service Specific Terms permits caching
 * latitude and longitude "for up to 30 consecutive calendar days, after
 * which Customer must delete the cached latitude and longitude values". The
 * permission is the only reason this plugin may hold them at all, so the
 * deletion is not housekeeping — it is the condition of the permission.
 *
 * It runs from two places, because either alone would be a promise this
 * plugin cannot keep:
 *
 * - **A daily cron event**, so a site nobody visits still expires on time.
 * - **Every read of a link**, because WP-Cron only fires when somebody
 *   loads a page, and a site that goes quiet for a month would otherwise
 *   come back holding 60-day-old coordinates.
 *
 * `cutoff()` is exposed so a test can prove the boundary rather than
 * re-derive it, and so the screen can say how long a pair has left.
 */
class Retention {

	const DAYS  = 30;
	const EVENT = 'fhint_places_expire_coordinates';

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( self::EVENT, array( __CLASS__, 'run' ) );
	}

	/**
	 * Make sure the daily event exists.
	 *
	 * @return void
	 */
	public static function schedule() {
		if ( ! wp_next_scheduled( self::EVENT ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', self::EVENT );
		}
	}

	/**
	 * Remove the event, on deactivation.
	 *
	 * @return void
	 */
	public static function unschedule() {
		$timestamp = wp_next_scheduled( self::EVENT );

		if ( $timestamp ) {
			wp_unschedule_event( $timestamp, self::EVENT );
		}
	}

	/**
	 * Expire everything past the limit.
	 *
	 * @return int Rows whose coordinates were deleted.
	 */
	public static function run() {
		return PlaceLinkRepository::expire_coordinates_before( self::cutoff() );
	}

	/**
	 * The oldest moment a cached pair may have arrived and still be kept.
	 *
	 * @return string UTC MySQL datetime.
	 */
	public static function cutoff() {
		$now = current_time( 'timestamp', true ); // phpcs:ignore WordPress.DateTime.CurrentTimeTimestamp.Requested

		return gmdate( 'Y-m-d H:i:s', $now - ( self::DAYS * DAY_IN_SECONDS ) );
	}

	/**
	 * Whether a cache timestamp is still inside the permitted window.
	 *
	 * @param string $cached_at UTC MySQL datetime, or ''.
	 * @return bool
	 */
	public static function is_fresh( $cached_at ) {
		$cached_at = trim( (string) $cached_at );

		if ( '' === $cached_at ) {
			return false;
		}

		return $cached_at > self::cutoff();
	}

	/**
	 * Whole days left before a cached pair must be deleted.
	 *
	 * @param string $cached_at UTC MySQL datetime, or ''.
	 * @return int Zero when nothing is held or the window has passed.
	 */
	public static function days_left( $cached_at ) {
		$cached_at = trim( (string) $cached_at );

		if ( '' === $cached_at ) {
			return 0;
		}

		$cached  = strtotime( $cached_at . ' UTC' );
		$expires = $cached + ( self::DAYS * DAY_IN_SECONDS );
		$left    = $expires - current_time( 'timestamp', true ); // phpcs:ignore WordPress.DateTime.CurrentTimeTimestamp.Requested

		if ( $left <= 0 ) {
			return 0;
		}

		return (int) ceil( $left / DAY_IN_SECONDS );
	}
}
