<?php
/**
 * Storage for special opening hours.
 *
 * @package FoundHint
 */

namespace FHINT\App\Location;

use FHINT\App\Core\Validator;
use FHINT\Database\Tables;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes `wp_fhint_special_hours`.
 *
 * Every query names its table through `Tables::name()` and passes every
 * variable through `$wpdb->prepare()`.
 */
class SpecialHoursRepository {

	/**
	 * Every special-hours row for a location, in date then period order.
	 *
	 * @param int $location_id Row id in wp_fhint_locations.
	 * @return array[]
	 */
	public static function for_location( $location_id ) {
		global $wpdb;

		$location_id = (int) $location_id;

		if ( ! $location_id || ! Tables::exists( Tables::SPECIAL_HOURS ) ) {
			return array();
		}

		$table = Tables::name( Tables::SPECIAL_HOURS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT * FROM {$table} WHERE location_id = %d ORDER BY date ASC, period_index ASC", $location_id ),
			ARRAY_A
		);

		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Replace a location's special hours with the rows given.
	 *
	 * A save carries the whole list, as a weekly save carries the whole
	 * week: what is absent is removed. It runs in a transaction so a failed
	 * insert cannot leave a location with half of its holidays.
	 *
	 * @param int     $location_id Row id in wp_fhint_locations.
	 * @param array[] $rows        Rows from SpecialHours::parse().
	 * @return bool
	 */
	public static function replace( $location_id, array $rows ) {
		global $wpdb;

		$location_id = (int) $location_id;

		if ( ! $location_id || ! Tables::exists( Tables::SPECIAL_HOURS ) ) {
			return false;
		}

		$table = Tables::name( Tables::SPECIAL_HOURS );
		$now   = Validator::now();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( 'START TRANSACTION' );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$table} WHERE location_id = %d", $location_id ) );

		foreach ( $rows as $row ) {
			if ( '' === (string) $row['date'] ) {
				continue;
			}

			$is_closed = ! empty( $row['is_closed'] );
			$is_24h    = ! empty( $row['is_24h'] );

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$inserted = $wpdb->insert(
				$table,
				array(
					'location_id'  => $location_id,
					'date'         => (string) $row['date'],
					'period_index' => (int) $row['period_index'],
					'open_time'    => ( $is_closed || $is_24h ) ? null : $row['open_time'],
					'close_time'   => ( $is_closed || $is_24h ) ? null : $row['close_time'],
					'is_closed'    => $is_closed ? 1 : 0,
					'is_24h'       => $is_24h ? 1 : 0,
					'note'         => isset( $row['note'] ) ? (string) $row['note'] : '',
					'created_at'   => $now,
					'updated_at'   => $now,
				),
				array( '%d', '%s', '%d', '%s', '%s', '%d', '%d', '%s', '%s', '%s' )
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
	 * Forget a location's special hours.
	 *
	 * @param int $location_id Row id in wp_fhint_locations.
	 * @return bool
	 */
	public static function delete_for_location( $location_id ) {
		global $wpdb;

		$location_id = (int) $location_id;

		if ( ! $location_id || ! Tables::exists( Tables::SPECIAL_HOURS ) ) {
			return false;
		}

		$table = Tables::name( Tables::SPECIAL_HOURS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return false !== $wpdb->query(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "DELETE FROM {$table} WHERE location_id = %d", $location_id )
		);
	}
}
