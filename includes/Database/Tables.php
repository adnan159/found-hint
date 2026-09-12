<?php
/**
 * Custom table names.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * The one place a table name is spelled out.
 *
 * Table names cannot be passed through $wpdb->prepare(), so they must never
 * come from input — always resolve them here (or through fhint_table()) so a
 * typo is a fatal at development time rather than a silent empty result set.
 */
class Tables {

	const BUSINESS       = 'business';
	const LOCATIONS      = 'locations';
	const LOCATION_HOURS = 'location_hours';
	const SERVICES       = 'services';
	const AUDITS         = 'audits';
	const AUDIT_ISSUES   = 'audit_issues';
	const LOGS           = 'logs';

	/**
	 * Every table this plugin owns, unprefixed.
	 *
	 * @return string[]
	 */
	public static function keys() {
		return array(
			self::BUSINESS,
			self::LOCATIONS,
			self::LOCATION_HOURS,
			self::SERVICES,
			self::AUDITS,
			self::AUDIT_ISSUES,
			self::LOGS,
		);
	}

	/**
	 * Full, prefixed name of one table.
	 *
	 * @param string $key One of the class constants.
	 * @return string
	 */
	public static function name( $key ) {
		global $wpdb;

		return $wpdb->prefix . 'fhint_' . $key;
	}

	/**
	 * Every table name, keyed by its unprefixed key.
	 *
	 * @return array<string, string>
	 */
	public static function all() {
		$names = array();

		foreach ( self::keys() as $key ) {
			$names[ $key ] = self::name( $key );
		}

		return $names;
	}

	/**
	 * Whether a table exists in the database.
	 *
	 * @param string $key One of the class constants.
	 * @return bool
	 */
	public static function exists( $key ) {
		global $wpdb;

		$table = self::name( $key );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return (bool) $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) );
	}

	/**
	 * Keys of tables that should exist but do not.
	 *
	 * @return string[]
	 */
	public static function missing() {
		$missing = array();

		foreach ( self::keys() as $key ) {
			if ( ! self::exists( $key ) ) {
				$missing[] = $key;
			}
		}

		return $missing;
	}
}
