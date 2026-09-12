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
	 * Empty for now; add Database\Create<Name>Table::up( $prefix, $cc )
	 * calls here as each table is designed.
	 *
	 * @return void
	 */
	public static function create_tables() {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		global $wpdb;
		$prefix = $wpdb->prefix;
		$cc     = $wpdb->get_charset_collate();

		Database\CreateBusinessTable::up( $prefix, $cc );
		Database\CreateLocationsTable::up( $prefix, $cc );
		Database\CreateLocationHoursTable::up( $prefix, $cc );
		Database\CreateServicesTable::up( $prefix, $cc );
		Database\CreateAuditsTable::up( $prefix, $cc );
		Database\CreateAuditIssuesTable::up( $prefix, $cc );
		Database\CreateLogsTable::up( $prefix, $cc );
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
