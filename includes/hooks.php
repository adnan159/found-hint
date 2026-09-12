<?php
/**
 * Global hook wiring that doesn't belong to a specific class.
 *
 * @package FoundHint
 */

defined( 'ABSPATH' ) || exit;

/**
 * Only truly plugin-wide wiring with no natural owner belongs here.
 * Anything that belongs to a module goes in that module's own class.
 */

/**
 * Daily log trim.
 *
 * Scheduled on activation and cleared on deactivation (see found-hint.php).
 * Reconciled here on every load so a site whose cron entry was lost — a
 * restored backup, a migrated host — quietly gets it back rather than
 * growing its log table without bound.
 */
add_action(
	'init',
	static function () {
		if ( ! wp_next_scheduled( 'fhint_purge_logs' ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'fhint_purge_logs' );
		}
	}
);

add_action(
	'fhint_purge_logs',
	static function () {
		$days = (int) \FHINT\App\Core\Settings::get( 'logs.retention_days', 30 );

		\FHINT\App\Core\Logger::purge_expired( $days );
	}
);
