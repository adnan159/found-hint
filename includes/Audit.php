<?php
/**
 * Audit module — the schedule and its hooks.
 *
 * @package FoundHint
 */

namespace FHINT;

use FHINT\App\Audit\Runner;

defined( 'ABSPATH' ) || exit;

/**
 * Keeps the stored score from drifting too far behind the data.
 *
 * The schedule exists so the dashboard has something recent to read without
 * anybody pressing a button. It is deliberately **daily, not on every
 * write**: re-auditing on each save would run the rule set twenty times
 * while somebody fills in a form, and the dashboard already warns when a
 * score is older than the data it describes.
 */
class Audit {

	const CRON_HOOK = 'fhint_run_audit';

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( self::CRON_HOOK, array( __CLASS__, 'run_scheduled' ) );
		add_action( 'admin_init', array( __CLASS__, 'maybe_schedule' ) );
	}

	/**
	 * Make sure the daily run is scheduled.
	 *
	 * @return void
	 */
	public static function maybe_schedule() {
		if ( ! wp_next_scheduled( self::CRON_HOOK ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', self::CRON_HOOK );
		}
	}

	/**
	 * Run the scheduled audit.
	 *
	 * @return void
	 */
	public static function run_scheduled() {
		Runner::run( 0, Runner::TRIGGER_SCHEDULE );
	}

	/**
	 * Remove the schedule, for deactivation.
	 *
	 * @return void
	 */
	public static function unschedule() {
		$timestamp = wp_next_scheduled( self::CRON_HOOK );

		if ( $timestamp ) {
			wp_unschedule_event( $timestamp, self::CRON_HOOK );
		}
	}
}
