<?php
/**
 * Storage for Google Business Profile locations and their mappings.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google;

use FHINT\Database\Tables;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes `wp_fhint_google_locations`.
 *
 * Every query names its table through `Tables::name()` and passes every
 * variable through `$wpdb->prepare()` — a table name cannot be prepared, so
 * it must never come from anywhere but the registry.
 */
class GoogleLocationRepository {

	/**
	 * All stored locations, newest sync first.
	 *
	 * @return array[]
	 */
	public static function all() {
		global $wpdb;

		$table = Tables::name( Tables::GOOGLE_LOCATIONS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$rows = $wpdb->get_results( "SELECT * FROM {$table} ORDER BY account_name ASC, title ASC", ARRAY_A );

		return array_map( array( __CLASS__, 'to_array' ), is_array( $rows ) ? $rows : array() );
	}

	/**
	 * One stored location by its Google resource name.
	 *
	 * @param string $location_name Google location resource name.
	 * @return array|null
	 */
	public static function find_by_location_name( $location_name ) {
		global $wpdb;

		$table = Tables::name( Tables::GOOGLE_LOCATIONS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT * FROM {$table} WHERE location_name = %s", (string) $location_name ),
			ARRAY_A
		);

		return $row ? self::to_array( $row ) : null;
	}

	/**
	 * The Google location mapped to one of our locations.
	 *
	 * @param int $fhint_location_id Row id in wp_fhint_locations.
	 * @return array|null
	 */
	public static function find_by_fhint_location( $fhint_location_id ) {
		global $wpdb;

		$table = Tables::name( Tables::GOOGLE_LOCATIONS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT * FROM {$table} WHERE fhint_location_id = %d", (int) $fhint_location_id ),
			ARRAY_A
		);

		return $row ? self::to_array( $row ) : null;
	}

	/**
	 * Insert or update one location from a sync.
	 *
	 * **The mapping is never touched here.** A sync reports what Google
	 * says about a place; which of our locations it belongs to is the
	 * operator's decision, and re-reading Google must not silently undo it.
	 *
	 * @param array $data Normalised location.
	 * @return bool
	 */
	public static function upsert( array $data ) {
		global $wpdb;

		$table    = Tables::name( Tables::GOOGLE_LOCATIONS );
		$existing = self::find_by_location_name( $data['location_name'] );
		$now      = current_time( 'mysql', true );

		$row = array(
			'account_name'       => (string) $data['account_name'],
			'location_name'      => (string) $data['location_name'],
			'title'              => (string) $data['title'],
			'store_code'         => (string) $data['store_code'],
			'address'            => (string) $data['address'],
			'phone'              => (string) $data['phone'],
			'website'            => (string) $data['website'],
			'verification_state' => (string) $data['verification_state'],
			'payload'            => wp_json_encode( $data['payload'] ),
			'synced_at'          => $now,
			'updated_at'         => $now,
		);

		if ( $existing ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			return false !== $wpdb->update( $table, $row, array( 'id' => (int) $existing['id'] ) );
		}

		$row['fhint_location_id'] = 0;
		$row['created_at']        = $now;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return false !== $wpdb->insert( $table, $row );
	}

	/**
	 * Point one of our locations at a Google location.
	 *
	 * One-to-one in both directions: any previous claim on either side is
	 * released first, so a mapping cannot fan out into two places that each
	 * think they own the other.
	 *
	 * @param string $location_name     Google location resource name.
	 * @param int    $fhint_location_id Row id in wp_fhint_locations.
	 * @return bool
	 */
	public static function map( $location_name, $fhint_location_id ) {
		global $wpdb;

		$table = Tables::name( Tables::GOOGLE_LOCATIONS );
		$now   = current_time( 'mysql', true );

		// Release whatever this FoundHint location was mapped to before.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->update(
			$table,
			array(
				'fhint_location_id' => 0,
				'updated_at'        => $now,
			),
			array( 'fhint_location_id' => (int) $fhint_location_id )
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return false !== $wpdb->update(
			$table,
			array(
				'fhint_location_id' => (int) $fhint_location_id,
				'updated_at'        => $now,
			),
			array( 'location_name' => (string) $location_name )
		);
	}

	/**
	 * Release a mapping.
	 *
	 * @param string $location_name Google location resource name.
	 * @return bool
	 */
	public static function unmap( $location_name ) {
		global $wpdb;

		$table = Tables::name( Tables::GOOGLE_LOCATIONS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return false !== $wpdb->update(
			$table,
			array(
				'fhint_location_id' => 0,
				'updated_at'        => current_time( 'mysql', true ),
			),
			array( 'location_name' => (string) $location_name )
		);
	}

	/**
	 * Release every mapping pointing at one of our locations.
	 *
	 * Called when that location is deleted: a mapping to a row that no
	 * longer exists would otherwise keep the Google location looking
	 * claimed and unavailable to map anywhere else.
	 *
	 * @param int $fhint_location_id Row id in wp_fhint_locations.
	 * @return void
	 */
	public static function release_for_location( $fhint_location_id ) {
		global $wpdb;

		$table = Tables::name( Tables::GOOGLE_LOCATIONS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->update(
			$table,
			array(
				'fhint_location_id' => 0,
				'updated_at'        => current_time( 'mysql', true ),
			),
			array( 'fhint_location_id' => (int) $fhint_location_id )
		);
	}

	/**
	 * Remove every stored location.
	 *
	 * Used when the connection ends: the cache describes an account nobody
	 * is signed in to any more, and the mappings point at profiles this
	 * site can no longer see.
	 *
	 * @return void
	 */
	public static function truncate() {
		global $wpdb;

		$table = Tables::name( Tables::GOOGLE_LOCATIONS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$wpdb->query( "DELETE FROM {$table}" );
	}

	/**
	 * When Google was last read, as a UTC MySQL datetime.
	 *
	 * @return string
	 */
	public static function last_synced_at() {
		global $wpdb;

		$table = Tables::name( Tables::GOOGLE_LOCATIONS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$value = $wpdb->get_var( "SELECT MAX(synced_at) FROM {$table}" );

		return $value ? (string) $value : '';
	}

	/**
	 * Normalise a database row.
	 *
	 * @param array $row Raw row.
	 * @return array
	 */
	private static function to_array( array $row ) {
		return array(
			'id'                => isset( $row['id'] ) ? (int) $row['id'] : 0,
			'account_name'      => isset( $row['account_name'] ) ? (string) $row['account_name'] : '',
			'location_name'     => isset( $row['location_name'] ) ? (string) $row['location_name'] : '',
			'fhint_location_id' => isset( $row['fhint_location_id'] ) ? (int) $row['fhint_location_id'] : 0,
			'title'             => isset( $row['title'] ) ? (string) $row['title'] : '',
			'store_code'        => isset( $row['store_code'] ) ? (string) $row['store_code'] : '',
			'address'           => isset( $row['address'] ) ? (string) $row['address'] : '',
			'phone'             => isset( $row['phone'] ) ? (string) $row['phone'] : '',
			'website'           => isset( $row['website'] ) ? (string) $row['website'] : '',
			'verification_state' => isset( $row['verification_state'] ) ? (string) $row['verification_state'] : '',
			'synced_at'         => isset( $row['synced_at'] ) ? (string) $row['synced_at'] : '',
		);
	}
}
