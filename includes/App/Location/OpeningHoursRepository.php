<?php
/**
 * Opening hours persistence.
 *
 * @package FoundHint
 */

namespace FHINT\App\Location;

use FHINT\App\Core\Validator;
use FHINT\Database\Tables;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes the hour rows belonging to a location.
 *
 * Reads are batched by design: asking for several locations' hours costs one
 * query, not one per location and certainly not one per day. An N+1 here
 * would be invisible on a one-location site and crippling on a large one.
 */
class OpeningHoursRepository {

	/**
	 * Hour rows for one location, ordered.
	 *
	 * @param int $location_id Location id.
	 * @return array[]
	 */
	public static function for_location( $location_id ) {
		$map = self::for_locations( array( $location_id ) );

		return isset( $map[ (int) $location_id ] ) ? $map[ (int) $location_id ] : array();
	}

	/**
	 * Hour rows for several locations at once, keyed by location id.
	 *
	 * @param int[] $location_ids Location ids.
	 * @return array<int, array[]>
	 */
	public static function for_locations( array $location_ids ) {
		global $wpdb;

		$ids = array_values( array_unique( array_filter( array_map( 'intval', $location_ids ) ) ) );

		if ( ! $ids || ! Tables::exists( Tables::LOCATION_HOURS ) ) {
			return array();
		}

		$table        = Tables::name( Tables::LOCATION_HOURS );
		$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$rows = $wpdb->get_results(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT * FROM {$table} WHERE location_id IN ({$placeholders}) ORDER BY location_id ASC, day_of_week ASC, period_index ASC", $ids ),
			ARRAY_A
		);

		$map = array();

		foreach ( (array) $rows as $row ) {
			$map[ (int) $row['location_id'] ][] = $row;
		}

		return $map;
	}

	/**
	 * Replace a location's entire week.
	 *
	 * A save is a replace, not a merge: the editor always submits the whole
	 * week, and merging would make it impossible to clear a day — the absent
	 * key and the cleared key would be indistinguishable.
	 *
	 * @param int     $location_id Location id.
	 * @param array[] $rows        Parsed rows from OpeningHours::parse().
	 * @return bool
	 */
	public static function replace( $location_id, array $rows ) {
		global $wpdb;

		$location_id = (int) $location_id;

		if ( ! $location_id || ! Tables::exists( Tables::LOCATION_HOURS ) ) {
			return false;
		}

		$table = Tables::name( Tables::LOCATION_HOURS );
		$now   = Validator::now();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( 'START TRANSACTION' );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$table} WHERE location_id = %d", $location_id ) );

		foreach ( $rows as $row ) {
			if ( ! DayOfWeek::is_valid( $row['day_of_week'] ) ) {
				continue;
			}

			$is_closed = ! empty( $row['is_closed'] );
			$is_24h    = ! empty( $row['is_24h'] );

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$inserted = $wpdb->insert(
				$table,
				array(
					'location_id'  => $location_id,
					'day_of_week'  => (int) $row['day_of_week'],
					'period_index' => (int) $row['period_index'],
					'open_time'    => ( $is_closed || $is_24h ) ? null : $row['open_time'],
					'close_time'   => ( $is_closed || $is_24h ) ? null : $row['close_time'],
					'is_closed'    => $is_closed ? 1 : 0,
					'is_24h'       => $is_24h ? 1 : 0,
					'created_at'   => $now,
					'updated_at'   => $now,
				),
				array( '%d', '%d', '%d', '%s', '%s', '%d', '%d', '%s', '%s' )
			);

			if ( ! $inserted ) {
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
				$wpdb->query( 'ROLLBACK' );
				return false;
			}
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( 'COMMIT' );

		return true;
	}

	/**
	 * Delete every hour row for a location.
	 *
	 * @param int $location_id Location id.
	 * @return int Rows removed.
	 */
	public static function delete_for_location( $location_id ) {
		global $wpdb;

		if ( ! Tables::exists( Tables::LOCATION_HOURS ) ) {
			return 0;
		}

		$table = Tables::name( Tables::LOCATION_HOURS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		return (int) $wpdb->query( $wpdb->prepare( "DELETE FROM {$table} WHERE location_id = %d", (int) $location_id ) );
	}
}
