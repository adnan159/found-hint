<?php
/**
 * Event logging.
 *
 * @package FoundHint
 */

namespace FHINT\App\Core;

use FHINT\Database\Tables;

defined( 'ABSPATH' ) || exit;

/**
 * Writes plugin events to the log table.
 *
 * Every value is redacted before it is written: a log is the single most
 * pasted artefact in any support thread, so anything credential-shaped that
 * reaches this table has effectively been published. Redaction happens here,
 * centrally, rather than being remembered at each call site — the one call
 * site that forgets is the one that leaks.
 */
class Logger {

	const DEBUG    = 'debug';
	const INFO     = 'info';
	const NOTICE   = 'notice';
	const WARNING  = 'warning';
	const ERROR    = 'error';
	const CRITICAL = 'critical';

	/**
	 * Metadata keys whose values are never written.
	 *
	 * @var string[]
	 */
	private static $secret_keys = array(
		'api_key',
		'apikey',
		'key',
		'secret',
		'client_secret',
		'password',
		'pass',
		'pwd',
		'token',
		'access_token',
		'refresh_token',
		'auth',
		'authorization',
		'credentials',
		'nonce',
	);

	/**
	 * Write a log entry.
	 *
	 * @param string $level       One of the level constants.
	 * @param string $module      Emitting module, e.g. 'business'.
	 * @param string $event       Machine-readable event name, e.g. 'business.updated'.
	 * @param string $message     Human-readable detail.
	 * @param array  $context     Optional metadata and location_id.
	 * @return int Inserted row id, 0 on failure.
	 */
	public static function log( $level, $module, $event, $message = '', array $context = array() ) {
		global $wpdb;

		if ( ! Tables::exists( Tables::LOGS ) ) {
			return 0;
		}

		$metadata    = isset( $context['metadata'] ) && is_array( $context['metadata'] ) ? $context['metadata'] : array();
		$location_id = isset( $context['location_id'] ) ? (int) $context['location_id'] : 0;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$inserted = $wpdb->insert(
			Tables::name( Tables::LOGS ),
			array(
				'level'       => substr( (string) $level, 0, 20 ),
				'module'      => substr( (string) $module, 0, 50 ),
				'event'       => substr( (string) $event, 0, 100 ),
				'message'     => (string) $message,
				'location_id' => $location_id,
				'user_id'     => get_current_user_id(),
				'request_id'  => self::request_id(),
				'metadata'    => $metadata ? wp_json_encode( self::redact( $metadata ) ) : null,
				'created_at'  => Validator::now(),
			),
			array( '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%s', '%s' )
		);

		return $inserted ? (int) $wpdb->insert_id : 0;
	}

	/**
	 * Shorthand for an info-level entry.
	 *
	 * @param string $module  Emitting module.
	 * @param string $event   Event name.
	 * @param string $message Detail.
	 * @param array  $context Optional context.
	 * @return int
	 */
	public static function info( $module, $event, $message = '', array $context = array() ) {
		return self::log( self::INFO, $module, $event, $message, $context );
	}

	/**
	 * Shorthand for an error-level entry.
	 *
	 * @param string $module  Emitting module.
	 * @param string $event   Event name.
	 * @param string $message Detail.
	 * @param array  $context Optional context.
	 * @return int
	 */
	public static function error( $module, $event, $message = '', array $context = array() ) {
		return self::log( self::ERROR, $module, $event, $message, $context );
	}

	/**
	 * Replace anything credential-shaped with a marker, at any depth.
	 *
	 * @param array $data Metadata to redact.
	 * @return array
	 */
	public static function redact( array $data ) {
		$clean = array();

		foreach ( $data as $key => $value ) {
			if ( is_array( $value ) ) {
				$clean[ $key ] = self::redact( $value );
				continue;
			}

			$clean[ $key ] = self::is_secret_key( (string) $key ) ? '[redacted]' : $value;
		}

		return $clean;
	}

	/**
	 * Whether a metadata key names a secret.
	 *
	 * Matches on word boundaries so 'api_key', 'apiKey', 'API-KEY' and
	 * 'google_api_key' are all caught, without 'monkey' being caught too.
	 *
	 * @param string $key Metadata key.
	 * @return bool
	 */
	private static function is_secret_key( $key ) {
		$normalised = strtolower( preg_replace( '/[^a-z0-9]+/i', '_', $key ) );

		foreach ( self::$secret_keys as $secret ) {
			if ( $normalised === $secret || preg_match( '/(^|_)' . preg_quote( $secret, '/' ) . '(_|$)/', $normalised ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * A stable id for the current request, so related entries correlate.
	 *
	 * @return string
	 */
	private static function request_id() {
		static $id = '';

		if ( '' === $id ) {
			$id = substr( md5( uniqid( (string) wp_rand(), true ) ), 0, 16 );
		}

		return $id;
	}

	/**
	 * Delete entries older than the retention period.
	 *
	 * @param int $days Retention period in days.
	 * @return int Rows removed.
	 */
	public static function purge_expired( $days ) {
		global $wpdb;

		if ( ! Tables::exists( Tables::LOGS ) ) {
			return 0;
		}

		$days   = max( 1, (int) $days );
		$cutoff = gmdate( 'Y-m-d H:i:s', time() - ( $days * DAY_IN_SECONDS ) );
		$table  = Tables::name( Tables::LOGS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		return (int) $wpdb->query( $wpdb->prepare( "DELETE FROM {$table} WHERE created_at < %s", $cutoff ) );
	}

	/**
	 * Delete every entry.
	 *
	 * @return int Rows removed.
	 */
	public static function purge_all() {
		global $wpdb;

		if ( ! Tables::exists( Tables::LOGS ) ) {
			return 0;
		}

		$table = Tables::name( Tables::LOGS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		return (int) $wpdb->query( "DELETE FROM {$table}" );
	}

	/**
	 * How many entries are stored.
	 *
	 * @return int
	 */
	public static function count() {
		global $wpdb;

		if ( ! Tables::exists( Tables::LOGS ) ) {
			return 0;
		}

		$table = Tables::name( Tables::LOGS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		return (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" );
	}
}
