<?php
/**
 * Storage for Google Business Profile reviews.
 *
 * @package FoundHint
 */

namespace FHINT\App\Review;

use FHINT\Database\Tables;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes `wp_fhint_reviews`.
 *
 * Every query names its table through `Tables::name()` and passes every
 * variable through `$wpdb->prepare()` — a table name cannot be prepared, so
 * it must never come from anywhere but the registry.
 *
 * Nothing here decides what a review means. Whether one "needs a reply" is a
 * rule, and rules live in {@see Reviews}; this class answers questions about
 * rows.
 */
class ReviewRepository {

	/**
	 * Reviews, newest first.
	 *
	 * @param array $args location_name, unanswered (bool), per_page, offset.
	 * @return array[]
	 */
	public static function all( array $args = array() ) {
		global $wpdb;

		if ( ! self::table_exists() ) {
			return array();
		}

		$table  = Tables::name( Tables::REVIEWS );
		$where  = 'WHERE 1 = %d';
		$params = array( 1 );

		if ( ! empty( $args['location_name'] ) ) {
			$where   .= ' AND location_name = %s';
			$params[] = (string) $args['location_name'];
		}

		if ( ! empty( $args['unanswered'] ) ) {
			$where .= " AND ( reply_comment IS NULL OR reply_comment = '' )";
		}

		$limit     = isset( $args['per_page'] ) ? (int) $args['per_page'] : 0;
		$offset    = isset( $args['offset'] ) ? max( 0, (int) $args['offset'] ) : 0;
		$limit_sql = '';

		if ( $limit > 0 ) {
			$limit_sql = ' LIMIT %d OFFSET %d';
			$params[]  = $limit;
			$params[]  = $offset;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$rows = $wpdb->get_results(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT * FROM {$table} {$where} ORDER BY reviewed_at DESC, id DESC{$limit_sql}", $params ),
			ARRAY_A
		);

		return array_map( array( __CLASS__, 'to_array' ), is_array( $rows ) ? $rows : array() );
	}

	/**
	 * How many reviews match, ignoring any paging.
	 *
	 * @param array $args location_name, unanswered (bool).
	 * @return int
	 */
	public static function count( array $args = array() ) {
		global $wpdb;

		if ( ! self::table_exists() ) {
			return 0;
		}

		$table  = Tables::name( Tables::REVIEWS );
		$where  = 'WHERE 1 = %d';
		$params = array( 1 );

		if ( ! empty( $args['location_name'] ) ) {
			$where   .= ' AND location_name = %s';
			$params[] = (string) $args['location_name'];
		}

		if ( ! empty( $args['unanswered'] ) ) {
			$where .= " AND ( reply_comment IS NULL OR reply_comment = '' )";
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		return (int) $wpdb->get_var(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT COUNT(*) FROM {$table} {$where}", $params )
		);
	}

	/**
	 * One review by Google's id.
	 *
	 * @param string $review_id Google review id.
	 * @return array|null
	 */
	public static function find( $review_id ) {
		global $wpdb;

		if ( ! self::table_exists() ) {
			return null;
		}

		$table = Tables::name( Tables::REVIEWS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT * FROM {$table} WHERE review_id = %s", (string) $review_id ),
			ARRAY_A
		);

		return $row ? self::to_array( $row ) : null;
	}

	/**
	 * Insert or update one review from a sync.
	 *
	 * Upserts on Google's review id, so re-reading a location updates the
	 * rows it already has rather than multiplying them — a review whose
	 * author edited it, or which has since been answered, changes in place.
	 *
	 * @param array $data Normalised review, as {@see ReviewMapper} returns.
	 * @return bool
	 */
	public static function upsert( array $data ) {
		global $wpdb;

		if ( ! self::table_exists() || '' === (string) $data['review_id'] ) {
			return false;
		}

		$table    = Tables::name( Tables::REVIEWS );
		$existing = self::find( $data['review_id'] );
		$now      = current_time( 'mysql', true );

		$row = array(
			'review_id'         => (string) $data['review_id'],
			'location_name'     => (string) $data['location_name'],
			'account_name'      => (string) $data['account_name'],
			'reviewer_name'     => (string) $data['reviewer_name'],
			'reviewer_photo'    => (string) $data['reviewer_photo'],
			'is_anonymous'      => empty( $data['is_anonymous'] ) ? 0 : 1,
			'star_rating'       => (int) $data['star_rating'],
			'comment'           => (string) $data['comment'],
			'reply_comment'     => (string) $data['reply_comment'],
			'replied_at'        => $data['replied_at'] ? $data['replied_at'] : null,
			'reviewed_at'       => $data['reviewed_at'] ? $data['reviewed_at'] : null,
			'review_updated_at' => $data['review_updated_at'] ? $data['review_updated_at'] : null,
			'payload'           => wp_json_encode( $data['payload'] ),
			'synced_at'         => $now,
			'updated_at'        => $now,
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
	 * Rating summary for a location, or for everything when none is given.
	 *
	 * The average is computed from rows that carry a rating: Google sends
	 * `STAR_RATING_UNSPECIFIED` occasionally, stored as 0, and counting that
	 * as zero stars would drag an honest average down.
	 *
	 * That exclusion happens once, in the loop below, and deliberately not
	 * also in the query. Two guards for one rule read as safety but are the
	 * opposite: neither can be removed by a test, so the rule ends up
	 * unproven.
	 *
	 * @param string $location_name Google location resource name, or ''.
	 * @return array{count:int, unanswered:int, average:float, distribution:array<int,int>}
	 */
	public static function summary( $location_name = '' ) {
		global $wpdb;

		$empty = array(
			'count'        => 0,
			'unanswered'   => 0,
			'average'      => 0.0,
			'distribution' => array( 1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0 ),
		);

		if ( ! self::table_exists() ) {
			return $empty;
		}

		$table  = Tables::name( Tables::REVIEWS );
		$where  = 'WHERE 1 = %d';
		$params = array( 1 );

		if ( '' !== (string) $location_name ) {
			$where   .= ' AND location_name = %s';
			$params[] = (string) $location_name;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$rows = $wpdb->get_results(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT star_rating, COUNT(*) AS total FROM {$table} {$where} GROUP BY star_rating", $params ),
			ARRAY_A
		);

		$summary = $empty;
		$sum     = 0;

		foreach ( (array) $rows as $row ) {
			$stars = (int) $row['star_rating'];
			$total = (int) $row['total'];

			if ( $stars < 1 || $stars > 5 ) {
				continue;
			}

			$summary['distribution'][ $stars ] = $total;
			$summary['count']                 += $total;
			$sum                              += $stars * $total;
		}

		if ( $summary['count'] > 0 ) {
			$summary['average'] = round( $sum / $summary['count'], 1 );
		}

		$args = array( 'unanswered' => true );

		if ( '' !== (string) $location_name ) {
			$args['location_name'] = (string) $location_name;
		}

		$summary['unanswered'] = self::count( $args );

		return $summary;
	}

	/**
	 * When Google last answered for these reviews.
	 *
	 * @param string $location_name Google location resource name, or ''.
	 * @return string|null MySQL UTC datetime, or null when never synced.
	 */
	public static function last_synced_at( $location_name = '' ) {
		global $wpdb;

		if ( ! self::table_exists() ) {
			return null;
		}

		$table = Tables::name( Tables::REVIEWS );

		if ( '' !== (string) $location_name ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$value = $wpdb->get_var(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$wpdb->prepare( "SELECT MAX(synced_at) FROM {$table} WHERE location_name = %s", (string) $location_name )
			);
		} else {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$value = $wpdb->get_var( "SELECT MAX(synced_at) FROM {$table}" );
		}

		return $value ? (string) $value : null;
	}

	/**
	 * Forget the reviews stored for one location.
	 *
	 * Used when a location stops being synced, and by the sync itself to
	 * drop reviews Google no longer returns — a deleted review must not
	 * linger in a count the owner is being judged on.
	 *
	 * @param string $location_name Google location resource name.
	 * @param array  $keep_ids      Review ids to spare, or empty for all.
	 * @return int Rows removed.
	 */
	public static function delete_for_location( $location_name, array $keep_ids = array() ) {
		global $wpdb;

		if ( ! self::table_exists() || '' === (string) $location_name ) {
			return 0;
		}

		$table = Tables::name( Tables::REVIEWS );

		if ( ! $keep_ids ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			return (int) $wpdb->query(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$wpdb->prepare( "DELETE FROM {$table} WHERE location_name = %s", (string) $location_name )
			);
		}

		$placeholders = implode( ',', array_fill( 0, count( $keep_ids ), '%s' ) );
		$params       = array_merge( array( (string) $location_name ), array_map( 'strval', $keep_ids ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		return (int) $wpdb->query(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "DELETE FROM {$table} WHERE location_name = %s AND review_id NOT IN ({$placeholders})", $params )
		);
	}

	/**
	 * Remove every stored review.
	 *
	 * @return bool
	 */
	public static function truncate() {
		global $wpdb;

		if ( ! self::table_exists() ) {
			return false;
		}

		$table = Tables::name( Tables::REVIEWS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		return false !== $wpdb->query( "DELETE FROM {$table}" );
	}

	/**
	 * Whether the table has been installed yet.
	 *
	 * @return bool
	 */
	private static function table_exists() {
		return Tables::exists( Tables::REVIEWS );
	}

	/**
	 * Shape one database row for the rest of the plugin.
	 *
	 * @param array $row Raw row.
	 * @return array
	 */
	private static function to_array( array $row ) {
		return array(
			'id'                => (int) $row['id'],
			'review_id'         => (string) $row['review_id'],
			'location_name'     => (string) $row['location_name'],
			'account_name'      => (string) $row['account_name'],
			'reviewer_name'     => (string) $row['reviewer_name'],
			'reviewer_photo'    => (string) $row['reviewer_photo'],
			'is_anonymous'      => (bool) $row['is_anonymous'],
			'star_rating'       => (int) $row['star_rating'],
			'comment'           => (string) $row['comment'],
			'reply_comment'     => (string) $row['reply_comment'],
			'replied_at'        => $row['replied_at'] ? (string) $row['replied_at'] : null,
			'reviewed_at'       => $row['reviewed_at'] ? (string) $row['reviewed_at'] : null,
			'review_updated_at' => $row['review_updated_at'] ? (string) $row['review_updated_at'] : null,
			'synced_at'         => $row['synced_at'] ? (string) $row['synced_at'] : null,
		);
	}
}
