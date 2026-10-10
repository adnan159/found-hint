<?php
/**
 * Storage for a location's attribute values.
 *
 * @package FoundHint
 */

namespace FHINT\App\Location;

use FHINT\App\Core\Validator;
use FHINT\Database\Tables;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes `wp_fhint_location_attributes`.
 *
 * Every query names its table through `Tables::name()` and passes every
 * variable through `$wpdb->prepare()`.
 */
class LocationAttributeRepository {

	/**
	 * Every stored attribute value for a location, by attribute id.
	 *
	 * @param int $location_id Row id in wp_fhint_locations.
	 * @return array[]
	 */
	public static function for_location( $location_id ) {
		global $wpdb;

		$location_id = (int) $location_id;

		if ( ! $location_id || ! Tables::exists( Tables::LOCATION_ATTRIBUTES ) ) {
			return array();
		}

		$table = Tables::name( Tables::LOCATION_ATTRIBUTES );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT * FROM {$table} WHERE location_id = %d ORDER BY attribute_id ASC", $location_id ),
			ARRAY_A
		);

		return array_map( array( __CLASS__, 'to_array' ), is_array( $rows ) ? $rows : array() );
	}

	/**
	 * Store answers and remove withdrawn ones, as one unit.
	 *
	 * Every value written is marked dirty: it has changed here and has not
	 * reached Google yet. That flag is what a later push reads to build its
	 * attribute mask, so an untouched attribute is never named in it — and a
	 * mask that names an attribute with no value clears it on the listing.
	 *
	 * @param int      $location_id Row id in wp_fhint_locations.
	 * @param array    $set         `attribute_id => { type, value }`.
	 * @param string[] $remove      Attribute ids to forget.
	 * @return bool
	 */
	public static function save( $location_id, array $set, array $remove = array() ) {
		global $wpdb;

		$location_id = (int) $location_id;

		if ( ! $location_id || ! Tables::exists( Tables::LOCATION_ATTRIBUTES ) ) {
			return false;
		}

		$table = Tables::name( Tables::LOCATION_ATTRIBUTES );
		$now   = Validator::now();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( 'START TRANSACTION' );

		foreach ( $remove as $attribute_id ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->query(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$wpdb->prepare( "DELETE FROM {$table} WHERE location_id = %d AND attribute_id = %s", $location_id, (string) $attribute_id )
			);
		}

		foreach ( $set as $attribute_id => $typed ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$existing = $wpdb->get_var(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$wpdb->prepare( "SELECT id FROM {$table} WHERE location_id = %d AND attribute_id = %s", $location_id, (string) $attribute_id )
			);

			$row = array(
				'value_type' => (string) $typed['type'],
				'value'      => wp_json_encode( $typed['value'] ),
				'is_dirty'   => 1,
				'updated_at' => $now,
			);

			if ( $existing ) {
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
				$written = $wpdb->update( $table, $row, array( 'id' => (int) $existing ) );
			} else {
				$row['location_id']  = $location_id;
				$row['attribute_id'] = (string) $attribute_id;
				$row['created_at']   = $now;

				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
				$written = $wpdb->insert( $table, $row );
			}

			if ( false === $written ) {
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
	 * Mark answers as having reached Google.
	 *
	 * Clears the dirty flag on exactly the attributes a push named, so the
	 * next plan does not offer to send them again — and leaves alone any
	 * answer edited while that push was in flight.
	 *
	 * @param int      $location_id   Row id in wp_fhint_locations.
	 * @param string[] $attribute_ids Attribute ids that were pushed.
	 * @return bool
	 */
	public static function mark_synced( $location_id, array $attribute_ids ) {
		global $wpdb;

		$location_id = (int) $location_id;

		if ( ! $location_id || ! $attribute_ids || ! Tables::exists( Tables::LOCATION_ATTRIBUTES ) ) {
			return false;
		}

		$table        = Tables::name( Tables::LOCATION_ATTRIBUTES );
		$placeholders = implode( ',', array_fill( 0, count( $attribute_ids ), '%s' ) );
		$params       = array_merge( array( Validator::now(), $location_id ), array_map( 'strval', array_values( $attribute_ids ) ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		return false !== $wpdb->query(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare
			$wpdb->prepare( "UPDATE {$table} SET is_dirty = 0, synced_at = %s WHERE location_id = %d AND attribute_id IN ({$placeholders})", $params )
		);
	}

	/**
	 * Forget every attribute value for a location.
	 *
	 * @param int $location_id Row id in wp_fhint_locations.
	 * @return bool
	 */
	public static function delete_for_location( $location_id ) {
		global $wpdb;

		$location_id = (int) $location_id;

		if ( ! $location_id || ! Tables::exists( Tables::LOCATION_ATTRIBUTES ) ) {
			return false;
		}

		$table = Tables::name( Tables::LOCATION_ATTRIBUTES );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return false !== $wpdb->query(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "DELETE FROM {$table} WHERE location_id = %d", $location_id )
		);
	}

	/**
	 * Shape one row for the rest of the plugin.
	 *
	 * @param array $row Raw row.
	 * @return array
	 */
	private static function to_array( array $row ) {
		return array(
			'attribute_id' => (string) $row['attribute_id'],
			'value_type'   => (string) $row['value_type'],
			'value'        => json_decode( (string) $row['value'], true ),
			'is_dirty'     => (bool) $row['is_dirty'],
			'synced_at'    => $row['synced_at'] ? (string) $row['synced_at'] : null,
		);
	}
}
