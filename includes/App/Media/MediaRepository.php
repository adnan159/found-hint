<?php
/**
 * Storage for Business Profile photos.
 *
 * @package FoundHint
 */

namespace FHINT\App\Media;

use FHINT\Database\Tables;

defined( 'ABSPATH' ) || exit;

/**
 * Reads `wp_fhint_media`.
 *
 * Read-only for now: rows are written by the photo upload and the sync from
 * Google, neither of which exists yet. It is here so the profile can already
 * answer with the shape the Photos section will use.
 */
class MediaRepository {

	/**
	 * Every photo stored for a location, in gallery order.
	 *
	 * @param int $location_id Row id in wp_fhint_locations.
	 * @return array[]
	 */
	public static function for_location( $location_id ) {
		global $wpdb;

		$location_id = (int) $location_id;

		if ( ! $location_id || ! Tables::exists( Tables::MEDIA ) ) {
			return array();
		}

		$table = Tables::name( Tables::MEDIA );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT * FROM {$table} WHERE location_id = %d ORDER BY sort_order ASC, id ASC", $location_id ),
			ARRAY_A
		);

		$photos = array();

		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$photos[] = array(
				'id'            => (int) $row['id'],
				'role'          => (string) $row['role'],
				'source'        => (string) $row['source'],
				'state'         => (string) $row['state'],
				'attachment_id' => (int) $row['attachment_id'],
				'url'           => (string) $row['url'],
				'width'         => (int) $row['width'],
				'height'        => (int) $row['height'],
				'error'         => (string) $row['error'],
				'uploaded_at'   => $row['uploaded_at'] ? (string) $row['uploaded_at'] : null,
				'synced_at'     => $row['synced_at'] ? (string) $row['synced_at'] : null,
			);
		}

		return $photos;
	}

	/**
	 * Forget the photos recorded for a location.
	 *
	 * Removes this site's records only. The image files stay in the media
	 * library and the photos stay on Google: deleting a location here is not
	 * an instruction to delete anything anywhere else.
	 *
	 * @param int $location_id Row id in wp_fhint_locations.
	 * @return bool
	 */
	public static function delete_for_location( $location_id ) {
		global $wpdb;

		$location_id = (int) $location_id;

		if ( ! $location_id || ! Tables::exists( Tables::MEDIA ) ) {
			return false;
		}

		$table = Tables::name( Tables::MEDIA );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return false !== $wpdb->query(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "DELETE FROM {$table} WHERE location_id = %d", $location_id )
		);
	}
}
