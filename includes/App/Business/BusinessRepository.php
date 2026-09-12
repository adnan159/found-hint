<?php
/**
 * Business persistence.
 *
 * @package FoundHint
 */

namespace FHINT\App\Business;

use FHINT\App\Core\Logger;
use FHINT\App\Core\Validator;
use FHINT\Database\Tables;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes the single business row.
 *
 * Every query is prepared. Table names can't be prepared, so they come from
 * Tables and never from input.
 */
class BusinessRepository {

	/**
	 * JSON-encoded columns, decoded on read and encoded on write.
	 *
	 * @var string[]
	 */
	private static $json_columns = array( 'secondary_categories', 'social_profiles' );

	/**
	 * The business profile, or null when none has been created yet.
	 *
	 * A fresh install having no business is a normal state, not an error —
	 * callers get null and decide what to show.
	 *
	 * @return array|null
	 */
	public static function get() {
		global $wpdb;

		if ( ! Tables::exists( Tables::BUSINESS ) ) {
			return null;
		}

		$table = Tables::name( Tables::BUSINESS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$row = $wpdb->get_row( "SELECT * FROM {$table} ORDER BY id ASC LIMIT 1", ARRAY_A );

		return $row ? self::hydrate( $row ) : null;
	}

	/**
	 * The business id, or 0 when none exists.
	 *
	 * @return int
	 */
	public static function current_id() {
		$business = self::get();

		return $business ? (int) $business['id'] : 0;
	}

	/**
	 * Whether a business profile exists.
	 *
	 * @return bool
	 */
	public static function exists() {
		return null !== self::get();
	}

	/**
	 * Create or update the profile, merging a partial payload over what is stored.
	 *
	 * @param array $changes Sanitised writable fields.
	 * @return array|null The saved record, or null when the write failed.
	 */
	public static function save( array $changes ) {
		global $wpdb;

		$existing = self::get();
		$record   = $existing ? $existing : Business::blank();
		$merged   = array_merge( $record, $changes );
		$table    = Tables::name( Tables::BUSINESS );
		$now      = Validator::now();

		$columns = self::columns( $merged );

		if ( $existing ) {
			$columns['updated_at'] = $now;

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$updated = $wpdb->update( $table, $columns, array( 'id' => (int) $existing['id'] ) );

			if ( false === $updated ) {
				Logger::error( 'business', 'business.save_failed', 'Could not update the business profile.' );
				return null;
			}

			Logger::info( 'business', 'business.updated', 'Business profile updated.', array( 'metadata' => array( 'fields' => array_keys( $changes ) ) ) );
		} else {
			$columns['created_at'] = $now;
			$columns['updated_at'] = $now;

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$inserted = $wpdb->insert( $table, $columns );

			if ( ! $inserted ) {
				Logger::error( 'business', 'business.save_failed', 'Could not create the business profile.' );
				return null;
			}

			Logger::info( 'business', 'business.created', 'Business profile created.' );
		}

		self::stamp_data_changed();

		return self::get();
	}

	/**
	 * Delete the profile and everything hanging off it.
	 *
	 * Locations, their hours and services go with it, inside a transaction:
	 * a half-deleted business would leave rows pointing at nothing, which
	 * every read path would then have to defend against.
	 *
	 * @return bool
	 */
	public static function delete() {
		global $wpdb;

		$business = self::get();

		if ( ! $business ) {
			return false;
		}

		$id = (int) $business['id'];

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( 'START TRANSACTION' );

		$locations = Tables::name( Tables::LOCATIONS );
		$hours     = Tables::name( Tables::LOCATION_HOURS );
		$services  = Tables::name( Tables::SERVICES );
		$table     = Tables::name( Tables::BUSINESS );

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$wpdb->query( $wpdb->prepare( "DELETE h FROM {$hours} h INNER JOIN {$locations} l ON l.id = h.location_id WHERE l.business_id = %d", $id ) );
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$locations} WHERE business_id = %d", $id ) );
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$services} WHERE business_id = %d", $id ) );
		$deleted = $wpdb->query( $wpdb->prepare( "DELETE FROM {$table} WHERE id = %d", $id ) );
		// phpcs:enable

		if ( false === $deleted ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->query( 'ROLLBACK' );
			return false;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( 'COMMIT' );

		Logger::info( 'business', 'business.deleted', 'Business profile and its locations and services deleted.' );
		self::stamp_data_changed();

		return true;
	}

	/**
	 * Record that local SEO data changed.
	 *
	 * The dashboard reads this to tell a current score from one measured
	 * before the last few edits, rather than guessing or re-measuring on a
	 * render path.
	 *
	 * @return void
	 */
	public static function stamp_data_changed() {
		update_option( 'fhint_data_changed_at', time(), false );

		/**
		 * Fires whenever local SEO data is written.
		 */
		do_action( 'fhint_data_changed' );
	}

	/**
	 * Turn a stored row into a record with decoded JSON and typed scalars.
	 *
	 * @param array $row Raw database row.
	 * @return array
	 */
	private static function hydrate( array $row ) {
		$record = array_merge( Business::blank(), $row );

		$record['id']                 = (int) $row['id'];
		$record['logo_attachment_id'] = (int) $row['logo_attachment_id'];
		$record['founding_date']      = $row['founding_date'] ? (string) $row['founding_date'] : '';

		foreach ( self::$json_columns as $column ) {
			$decoded            = isset( $row[ $column ] ) ? json_decode( (string) $row[ $column ], true ) : array();
			$record[ $column ] = is_array( $decoded ) ? $decoded : array();
		}

		return $record;
	}

	/**
	 * Turn a record into storable columns.
	 *
	 * @param array $record Full record.
	 * @return array
	 */
	private static function columns( array $record ) {
		$columns = array(
			'name'               => (string) $record['name'],
			'legal_name'         => (string) $record['legal_name'],
			'business_type'      => (string) $record['business_type'],
			'primary_category'   => (string) $record['primary_category'],
			'description'        => (string) $record['description'],
			'logo_attachment_id' => (int) $record['logo_attachment_id'],
			'logo_url'           => (string) $record['logo_url'],
			'phone'              => (string) $record['phone'],
			'email'              => (string) $record['email'],
			'website'            => (string) $record['website'],
			'price_range'        => (string) $record['price_range'],
			'founding_date'      => '' === (string) $record['founding_date'] ? null : (string) $record['founding_date'],
		);

		foreach ( self::$json_columns as $column ) {
			$value              = isset( $record[ $column ] ) && is_array( $record[ $column ] ) ? $record[ $column ] : array();
			$columns[ $column ] = $value ? wp_json_encode( $value ) : null;
		}

		return $columns;
	}
}
