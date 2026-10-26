<?php
/**
 * Storage for Google's own vocabulary.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google;

use FHINT\App\Core\Validator;
use FHINT\Database\Tables;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes `wp_fhint_google_reference`.
 *
 * A set of entries is always replaced whole: Google answered "these are the
 * attributes this listing can have", and an entry it no longer lists is one
 * it no longer accepts. Keeping yesterday's would offer a tick box Google
 * then refuses.
 */
class ReferenceRepository {

	const KIND_ATTRIBUTE = 'attribute';
	const KIND_SERVICE_TYPE = 'service_type';

	/**
	 * Replace every entry of one kind under one parent.
	 *
	 * @param string  $kind      category | service_type | attribute.
	 * @param string  $parent_id What the entries belong to.
	 * @param array[] $entries   Each `{ item_id, display_name, value_type, payload }`.
	 * @return bool
	 */
	public static function replace( $kind, $parent_id, array $entries ) {
		global $wpdb;

		if ( ! Tables::exists( Tables::GOOGLE_REFERENCE ) ) {
			return false;
		}

		$table = Tables::name( Tables::GOOGLE_REFERENCE );
		$now   = Validator::now();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( 'START TRANSACTION' );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "DELETE FROM {$table} WHERE kind = %s AND parent_id = %s", (string) $kind, (string) $parent_id )
		);

		$seen = array();

		foreach ( $entries as $entry ) {
			$item_id = isset( $entry['item_id'] ) ? (string) $entry['item_id'] : '';

			if ( '' === $item_id || isset( $seen[ $item_id ] ) ) {
				continue;
			}

			$seen[ $item_id ] = true;

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$inserted = $wpdb->insert(
				$table,
				array(
					'kind'          => (string) $kind,
					'item_id'       => $item_id,
					'parent_id'     => (string) $parent_id,
					'language_code' => '',
					'display_name'  => isset( $entry['display_name'] ) ? (string) $entry['display_name'] : '',
					'value_type'    => isset( $entry['value_type'] ) ? (string) $entry['value_type'] : '',
					'payload'       => wp_json_encode( isset( $entry['payload'] ) ? $entry['payload'] : array() ),
					'fetched_at'    => $now,
					'created_at'    => $now,
					'updated_at'    => $now,
				)
			);

			if ( false === $inserted ) {
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
	 * Every entry of one kind under one parent, in the order Google gave them.
	 *
	 * @param string $kind      category | service_type | attribute.
	 * @param string $parent_id What the entries belong to.
	 * @return array[]
	 */
	public static function for_parent( $kind, $parent_id ) {
		global $wpdb;

		if ( '' === (string) $parent_id || ! Tables::exists( Tables::GOOGLE_REFERENCE ) ) {
			return array();
		}

		$table = Tables::name( Tables::GOOGLE_REFERENCE );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT * FROM {$table} WHERE kind = %s AND parent_id = %s ORDER BY id ASC", (string) $kind, (string) $parent_id ),
			ARRAY_A
		);

		$entries = array();

		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$payload = json_decode( (string) $row['payload'], true );

			$entries[] = array(
				'item_id'      => (string) $row['item_id'],
				'display_name' => (string) $row['display_name'],
				'value_type'   => (string) $row['value_type'],
				'payload'      => is_array( $payload ) ? $payload : array(),
				'fetched_at'   => $row['fetched_at'] ? (string) $row['fetched_at'] : null,
			);
		}

		return $entries;
	}

	/**
	 * When Google last answered for one kind under one parent.
	 *
	 * @param string $kind      category | service_type | attribute.
	 * @param string $parent_id What the entries belong to.
	 * @return string|null UTC timestamp, or null when it was never asked.
	 */
	public static function fetched_at( $kind, $parent_id ) {
		global $wpdb;

		if ( '' === (string) $parent_id || ! Tables::exists( Tables::GOOGLE_REFERENCE ) ) {
			return null;
		}

		$table = Tables::name( Tables::GOOGLE_REFERENCE );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$when = $wpdb->get_var(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT MAX(fetched_at) FROM {$table} WHERE kind = %s AND parent_id = %s", (string) $kind, (string) $parent_id )
		);

		return $when ? (string) $when : null;
	}
}
