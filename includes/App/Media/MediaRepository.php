<?php
/**
 * Storage for Business Profile photos.
 *
 * @package FoundHint
 */

namespace FHINT\App\Media;

use FHINT\App\Core\Validator;
use FHINT\Database\Tables;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes `wp_fhint_media`.
 *
 * Two kinds of row live here and `state` tells them apart: a photo Google
 * holds (`synced`), which this site only keeps a pointer to, and a photo
 * chosen here that has not reached Google yet (`pending`, `uploading`,
 * `failed`), whose file is in the media library.
 *
 * Every query names its table through `Tables::name()` and passes every
 * variable through `$wpdb->prepare()`.
 */
class MediaRepository {

	const STATE_PENDING   = 'pending';
	const STATE_UPLOADING = 'uploading';
	const STATE_SYNCED    = 'synced';
	const STATE_FAILED    = 'failed';

	const ROLE_LOGO    = 'logo';
	const ROLE_COVER   = 'cover';
	const ROLE_GALLERY = 'gallery';

	/**
	 * The roles a photo can have.
	 *
	 * @return string[]
	 */
	public static function roles() {
		return array( self::ROLE_LOGO, self::ROLE_COVER, self::ROLE_GALLERY );
	}

	/**
	 * Every photo stored for a location: waiting ones first, then newest.
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
			$wpdb->prepare( "SELECT * FROM {$table} WHERE location_id = %d ORDER BY sort_order ASC, uploaded_at DESC, id ASC", $location_id ),
			ARRAY_A
		);

		return array_map( array( __CLASS__, 'to_array' ), is_array( $rows ) ? $rows : array() );
	}

	/**
	 * One photo by id.
	 *
	 * @param int $id Row id.
	 * @return array|null
	 */
	public static function find( $id ) {
		global $wpdb;

		$id = (int) $id;

		if ( ! $id || ! Tables::exists( Tables::MEDIA ) ) {
			return null;
		}

		$table = Tables::name( Tables::MEDIA );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id ), ARRAY_A );

		return $row ? self::to_array( $row ) : null;
	}

	/**
	 * Record a photo chosen here that has not been sent to Google.
	 *
	 * @param array $data location_id, role, attachment_id, url, mime_type, file_size, width, height.
	 * @return array|null The stored row.
	 */
	public static function create_pending( array $data ) {
		global $wpdb;

		if ( empty( $data['location_id'] ) || ! Tables::exists( Tables::MEDIA ) ) {
			return null;
		}

		$now = Validator::now();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$inserted = $wpdb->insert(
			Tables::name( Tables::MEDIA ),
			array(
				'location_id'   => (int) $data['location_id'],
				'role'          => in_array( (string) $data['role'], self::roles(), true ) ? (string) $data['role'] : self::ROLE_GALLERY,
				'source'        => 'owner',
				'state'         => self::STATE_PENDING,
				'attachment_id' => isset( $data['attachment_id'] ) ? (int) $data['attachment_id'] : 0,
				'url'           => isset( $data['url'] ) ? (string) $data['url'] : '',
				'google_name'   => '',
				'mime_type'     => isset( $data['mime_type'] ) ? (string) $data['mime_type'] : '',
				'file_size'     => isset( $data['file_size'] ) ? (int) $data['file_size'] : 0,
				'width'         => isset( $data['width'] ) ? (int) $data['width'] : 0,
				'height'        => isset( $data['height'] ) ? (int) $data['height'] : 0,
				'error'         => '',
				'created_at'    => $now,
				'updated_at'    => $now,
			)
		);

		return $inserted ? self::find( (int) $wpdb->insert_id ) : null;
	}

	/**
	 * Store a photo Google reported, or update the one already held.
	 *
	 * Matched on Google's own name for the photo, so reading a listing twice
	 * updates rows instead of doubling them.
	 *
	 * @param int   $location_id Row id in wp_fhint_locations.
	 * @param array $photo       google_name, role, url, width, height, uploaded_at.
	 * @return bool
	 */
	public static function upsert_from_google( $location_id, array $photo ) {
		global $wpdb;

		$location_id = (int) $location_id;
		$google_name = isset( $photo['google_name'] ) ? (string) $photo['google_name'] : '';

		if ( ! $location_id || '' === $google_name || ! Tables::exists( Tables::MEDIA ) ) {
			return false;
		}

		$table = Tables::name( Tables::MEDIA );
		$now   = Validator::now();

		$row = array(
			'role'        => in_array( (string) $photo['role'], self::roles(), true ) ? (string) $photo['role'] : self::ROLE_GALLERY,
			'state'       => self::STATE_SYNCED,
			'url'         => (string) $photo['url'],
			'width'       => (int) $photo['width'],
			'height'      => (int) $photo['height'],
			'error'       => '',
			'uploaded_at' => ! empty( $photo['uploaded_at'] ) ? (string) $photo['uploaded_at'] : null,
			'synced_at'   => $now,
			'updated_at'  => $now,
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$existing = $wpdb->get_var(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT id FROM {$table} WHERE location_id = %d AND google_name = %s", $location_id, $google_name )
		);

		if ( $existing ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			return false !== $wpdb->update( $table, $row, array( 'id' => (int) $existing ) );
		}

		$row['location_id'] = $location_id;
		$row['source']      = 'owner';
		$row['google_name'] = $google_name;
		$row['created_at']  = $now;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return false !== $wpdb->insert( $table, $row );
	}

	/**
	 * Forget photos Google no longer reports.
	 *
	 * Only rows that came from Google are considered. A photo still waiting
	 * here has never been on Google, so its absence from Google's list says
	 * nothing about it.
	 *
	 * @param int      $location_id Row id in wp_fhint_locations.
	 * @param string[] $keep        Google names that are still on the listing.
	 * @return int How many rows were removed.
	 */
	public static function prune_synced( $location_id, array $keep ) {
		global $wpdb;

		$location_id = (int) $location_id;

		if ( ! $location_id || ! Tables::exists( Tables::MEDIA ) ) {
			return 0;
		}

		$table = Tables::name( Tables::MEDIA );
		$keep  = array_flip( array_map( 'strval', $keep ) );
		$gone  = 0;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT id, google_name FROM {$table} WHERE location_id = %d AND state = %s", $location_id, self::STATE_SYNCED ),
			ARRAY_A
		);

		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			if ( isset( $keep[ (string) $row['google_name'] ] ) ) {
				continue;
			}

			if ( self::delete( (int) $row['id'] ) ) {
				++$gone;
			}
		}

		return $gone;
	}

	/**
	 * Change columns on one photo.
	 *
	 * @param int   $id      Row id.
	 * @param array $changes Column => value, from a fixed set.
	 * @return bool
	 */
	public static function update( $id, array $changes ) {
		global $wpdb;

		$id = (int) $id;

		if ( ! $id || ! Tables::exists( Tables::MEDIA ) ) {
			return false;
		}

		$allowed = array( 'state', 'url', 'google_name', 'error', 'uploaded_at', 'synced_at', 'width', 'height' );
		$row     = array_intersect_key( $changes, array_flip( $allowed ) );

		if ( ! $row ) {
			return false;
		}

		$row['updated_at'] = Validator::now();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return false !== $wpdb->update( Tables::name( Tables::MEDIA ), $row, array( 'id' => $id ) );
	}

	/**
	 * Forget one photo.
	 *
	 * @param int $id Row id.
	 * @return bool
	 */
	public static function delete( $id ) {
		global $wpdb;

		$id = (int) $id;

		if ( ! $id || ! Tables::exists( Tables::MEDIA ) ) {
			return false;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return (bool) $wpdb->delete( Tables::name( Tables::MEDIA ), array( 'id' => $id ) );
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

	/**
	 * Shape one row for the rest of the plugin.
	 *
	 * @param array $row Raw row.
	 * @return array
	 */
	private static function to_array( array $row ) {
		return array(
			'id'            => (int) $row['id'],
			'location_id'   => (int) $row['location_id'],
			'role'          => (string) $row['role'],
			'source'        => (string) $row['source'],
			'state'         => (string) $row['state'],
			'attachment_id' => (int) $row['attachment_id'],
			'url'           => (string) $row['url'],
			'google_name'   => (string) $row['google_name'],
			'mime_type'     => (string) $row['mime_type'],
			'file_size'     => (int) $row['file_size'],
			'width'         => (int) $row['width'],
			'height'        => (int) $row['height'],
			'error'         => (string) $row['error'],
			'uploaded_at'   => $row['uploaded_at'] ? (string) $row['uploaded_at'] : null,
			'synced_at'     => $row['synced_at'] ? (string) $row['synced_at'] : null,
		);
	}
}
