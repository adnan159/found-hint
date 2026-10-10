<?php
/**
 * Storage for previous business descriptions.
 *
 * @package FoundHint
 */

namespace FHINT\App\Business;

use FHINT\App\Core\Validator;
use FHINT\Database\Tables;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and appends to `wp_fhint_description_history`.
 *
 * Append-only: a version is never edited, because the point of keeping it is
 * that it is exactly what the description once said.
 */
class DescriptionHistoryRepository {

	const SOURCE_USER   = 'user';
	const SOURCE_AI     = 'ai';
	const SOURCE_GOOGLE = 'google';

	/**
	 * The most recent versions, newest first.
	 *
	 * @param int $business_id Row id in wp_fhint_business.
	 * @param int $limit       How many to return.
	 * @return array[]
	 */
	public static function latest( $business_id, $limit = 10 ) {
		global $wpdb;

		$business_id = (int) $business_id;

		if ( ! $business_id || ! Tables::exists( Tables::DESCRIPTION_HISTORY ) ) {
			return array();
		}

		$table = Tables::name( Tables::DESCRIPTION_HISTORY );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT * FROM {$table} WHERE business_id = %d ORDER BY id DESC LIMIT %d", $business_id, max( 1, (int) $limit ) ),
			ARRAY_A
		);

		$history = array();

		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$history[] = array(
				'id'          => (int) $row['id'],
				'description' => (string) $row['description'],
				'source'      => (string) $row['source'],
				'created_at'  => $row['created_at'] ? (string) $row['created_at'] : null,
			);
		}

		return $history;
	}

	/**
	 * Record a description as a new version.
	 *
	 * Nothing is written when the text is empty or is what the newest
	 * version already says: saving the same words twice is not a revision,
	 * and a history full of identical entries is one nobody reads.
	 *
	 * @param int    $business_id Row id in wp_fhint_business.
	 * @param string $description The text as it now stands.
	 * @param string $source      Where the wording came from.
	 * @return bool Whether a version was written.
	 */
	public static function record( $business_id, $description, $source = self::SOURCE_USER ) {
		global $wpdb;

		$business_id = (int) $business_id;
		$description = trim( (string) $description );

		if ( ! $business_id || '' === $description || ! Tables::exists( Tables::DESCRIPTION_HISTORY ) ) {
			return false;
		}

		$newest = self::latest( $business_id, 1 );

		if ( $newest && $newest[0]['description'] === $description ) {
			return false;
		}

		$sources = array( self::SOURCE_USER, self::SOURCE_AI, self::SOURCE_GOOGLE );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return false !== $wpdb->insert(
			Tables::name( Tables::DESCRIPTION_HISTORY ),
			array(
				'business_id' => $business_id,
				'description' => $description,
				'source'      => in_array( $source, $sources, true ) ? $source : self::SOURCE_USER,
				'user_id'     => function_exists( 'get_current_user_id' ) ? (int) get_current_user_id() : 0,
				'created_at'  => Validator::now(),
			)
		);
	}
}
