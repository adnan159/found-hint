<?php
/**
 * Storage for the link between a location and a place on Google.
 *
 * @package FoundHint
 */

namespace FHINT\App\Places;

use FHINT\Database\Tables;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes `wp_fhint_place_links`.
 *
 * The table holds a place id, coordinates and timestamps — nothing else, for
 * the reasons written on `Database\CreatePlaceLinksTable`. If a future change
 * wants to keep a name or an address here, that is the file to read first.
 *
 * Every query names its table through `Tables::name()` and passes every
 * variable through `$wpdb->prepare()`.
 */
class PlaceLinkRepository {

	/**
	 * The link for one location.
	 *
	 * @param int $location_id FoundHint location id.
	 * @return array|null
	 */
	public static function for_location( $location_id ) {
		global $wpdb;

		$location_id = (int) $location_id;

		if ( $location_id <= 0 ) {
			return null;
		}

		$table = Tables::name( Tables::PLACE_LINKS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT * FROM {$table} WHERE fhint_location_id = %d", $location_id ),
			ARRAY_A
		);

		return $row ? self::to_array( $row ) : null;
	}

	/**
	 * Link a location to a place, replacing any previous link.
	 *
	 * Coordinates are optional because they are perishable: a caller that
	 * has none, or whose stored pair has expired, passes null and the link
	 * survives without them.
	 *
	 * @param int        $location_id FoundHint location id.
	 * @param string     $place_id    Google place id.
	 * @param float|null $latitude    Latitude, or null.
	 * @param float|null $longitude   Longitude, or null.
	 * @return bool
	 */
	public static function link( $location_id, $place_id, $latitude = null, $longitude = null ) {
		global $wpdb;

		$location_id = (int) $location_id;
		$place_id    = trim( (string) $place_id );

		if ( $location_id <= 0 || '' === $place_id ) {
			return false;
		}

		$table    = Tables::name( Tables::PLACE_LINKS );
		$now      = current_time( 'mysql', true );
		$existing = self::for_location( $location_id );
		$has_both = null !== $latitude && null !== $longitude;

		$row = array(
			'fhint_location_id'     => $location_id,
			'place_id'              => $place_id,
			'latitude'              => $has_both ? (float) $latitude : null,
			'longitude'             => $has_both ? (float) $longitude : null,
			'coordinates_cached_at' => $has_both ? $now : null,
			'linked_at'             => $now,
			'updated_at'            => $now,
		);

		if ( $existing ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			return false !== $wpdb->update( $table, $row, array( 'id' => (int) $existing['id'] ) );
		}

		$row['created_at'] = $now;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return false !== $wpdb->insert( $table, $row );
	}

	/**
	 * Replace the stored coordinates, restarting their retention clock.
	 *
	 * @param int        $location_id FoundHint location id.
	 * @param float|null $latitude    Latitude, or null to forget them.
	 * @param float|null $longitude   Longitude, or null to forget them.
	 * @return bool
	 */
	public static function store_coordinates( $location_id, $latitude, $longitude ) {
		global $wpdb;

		$link = self::for_location( $location_id );

		if ( ! $link ) {
			return false;
		}

		$has_both = null !== $latitude && null !== $longitude;
		$now      = current_time( 'mysql', true );
		$table    = Tables::name( Tables::PLACE_LINKS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return false !== $wpdb->update(
			$table,
			array(
				'latitude'              => $has_both ? (float) $latitude : null,
				'longitude'             => $has_both ? (float) $longitude : null,
				'coordinates_cached_at' => $has_both ? $now : null,
				'updated_at'            => $now,
			),
			array( 'id' => (int) $link['id'] )
		);
	}

	/**
	 * Drop coordinates read before a cut-off, keeping the links themselves.
	 *
	 * This is the enforcement of Places API §14.3, so it deletes rather than
	 * marks: a row that still holds the values is still storing them.
	 *
	 * @param string $before UTC MySQL datetime. Rows cached at or before it
	 *                       lose their coordinates.
	 * @return int Rows changed.
	 */
	public static function expire_coordinates_before( $before ) {
		global $wpdb;

		$table = Tables::name( Tables::PLACE_LINKS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$changed = $wpdb->query(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare(
				"UPDATE {$table}
				SET latitude = NULL, longitude = NULL, coordinates_cached_at = NULL, updated_at = %s
				WHERE coordinates_cached_at IS NOT NULL AND coordinates_cached_at <= %s",
				current_time( 'mysql', true ),
				(string) $before
			)
		);

		return (int) $changed;
	}

	/**
	 * Forget a location's link entirely.
	 *
	 * @param int $location_id FoundHint location id.
	 * @return bool
	 */
	public static function unlink( $location_id ) {
		global $wpdb;

		$location_id = (int) $location_id;

		if ( $location_id <= 0 ) {
			return false;
		}

		$table = Tables::name( Tables::PLACE_LINKS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return false !== $wpdb->query(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "DELETE FROM {$table} WHERE fhint_location_id = %d", $location_id )
		);
	}

	/**
	 * Drop the link belonging to a deleted location.
	 *
	 * Hooked to `fhint_location_deleted`: a link whose location is gone can
	 * never be reached from a screen again, so leaving it would be storing a
	 * place id nobody can see or remove.
	 *
	 * @param int $location_id FoundHint location id.
	 * @return void
	 */
	public static function release_for_location( $location_id ) {
		self::unlink( $location_id );
	}

	/**
	 * Normalise a row.
	 *
	 * @param array $row Raw row.
	 * @return array
	 */
	private static function to_array( array $row ) {
		$lat = isset( $row['latitude'] ) && null !== $row['latitude'] ? (float) $row['latitude'] : null;
		$lng = isset( $row['longitude'] ) && null !== $row['longitude'] ? (float) $row['longitude'] : null;

		return array(
			'id'                    => (int) $row['id'],
			'fhint_location_id'     => (int) $row['fhint_location_id'],
			'place_id'              => (string) $row['place_id'],
			'latitude'              => $lat,
			'longitude'             => $lng,
			'coordinates_cached_at' => isset( $row['coordinates_cached_at'] ) ? (string) $row['coordinates_cached_at'] : '',
			'linked_at'             => isset( $row['linked_at'] ) ? (string) $row['linked_at'] : '',
		);
	}
}
