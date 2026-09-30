<?php
/**
 * Database module — wires init hooks and owns table creation.
 *
 * @package FoundHint
 */

namespace FHINT;

defined( 'ABSPATH' ) || exit;

/**
 * create_tables() is called from Installer (on activation and on every
 * version-gated check) and is safe to call repeatedly — dbDelta only
 * applies changes, it never drops data. Sub-classes in includes/Database/
 * each own the SQL for one table via a single static up( $prefix,
 * $charset_collate ); register each one below as it is added.
 *
 * dbDelta formatting is load-bearing: one field per line, two spaces in
 * `PRIMARY KEY  (id)`, uppercase `KEY`, every key named, types written
 * exactly as MySQL reports them. Get it wrong and dbDelta re-issues the
 * same ALTER on every single request — after writing or changing a table,
 * verify dbDelta() returns an empty array against an up-to-date database.
 */
class Database {

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'maybe_flush_rewrite_rules' ), 6 );
	}

	/**
	 * Create all custom plugin tables using dbDelta.
	 *
	 * Safe to run on every activation/update — dbDelta only applies changes.
	 * Add Database\Create<Name>Table::up( $prefix, $cc ) calls here as each
	 * table is designed.
	 *
	 * @return array Everything dbDelta changed; empty on an up-to-date
	 *               database.
	 */
	public static function create_tables() {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		global $wpdb;
		$prefix  = $wpdb->prefix;
		$cc      = $wpdb->get_charset_collate();
		$changes = array();

		$changes = array_merge( $changes, Database\CreateBusinessTable::up( $prefix, $cc ) );
		$changes = array_merge( $changes, Database\CreateLocationsTable::up( $prefix, $cc ) );
		$changes = array_merge( $changes, Database\CreateLocationHoursTable::up( $prefix, $cc ) );
		$changes = array_merge( $changes, Database\CreateServicesTable::up( $prefix, $cc ) );
		$changes = array_merge( $changes, Database\CreateAuditsTable::up( $prefix, $cc ) );
		$changes = array_merge( $changes, Database\CreateAuditIssuesTable::up( $prefix, $cc ) );
		$changes = array_merge( $changes, Database\CreateLogsTable::up( $prefix, $cc ) );
		$changes = array_merge( $changes, Database\CreateGoogleLocationsTable::up( $prefix, $cc ) );

		// The Places lookup was removed in 0.4.0: its table and its scheduled
		// event are cleared here rather than left behind on sites that ran an
		// earlier version.
		self::clear_legacy_places();

		// Returned so the change set can be asserted empty against a
		// database that is already up to date. dbDelta re-issuing the same
		// ALTER on every request is invisible without this.
		return $changes;
	}

	/**
	 * Remove what the Places lookup left behind.
	 *
	 * Its table, its stored API key and its daily event: a feature removed
	 * from the code is not removed from a site that already ran it.
	 *
	 * @return void
	 */
	private static function clear_legacy_places() {
		global $wpdb;

		$table = $wpdb->prefix . 'fhint_place_links';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$wpdb->query( "DROP TABLE IF EXISTS {$table}" );

		delete_option( 'fhint_places_credentials' );

		// An event whose handler no longer exists would fire forever against
		// nothing, once a day, on every site that ran the old version.
		$scheduled = wp_next_scheduled( 'fhint_places_expire_coordinates' );

		if ( $scheduled ) {
			wp_unschedule_event( $scheduled, 'fhint_places_expire_coordinates' );
		}
	}

	/**
	 * Flush rewrite rules once after activation if scheduled.
	 *
	 * @return void
	 */
	public static function maybe_flush_rewrite_rules() {
		if ( 'yes' === get_option( 'fhint_required_rewrite_flush' ) ) {
			update_option( 'fhint_required_rewrite_flush', 'no' );
			flush_rewrite_rules();
		}
	}
}
