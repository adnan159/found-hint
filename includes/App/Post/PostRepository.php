<?php
/**
 * Storage for Google Business Profile posts.
 *
 * @package FoundHint
 */

namespace FHINT\App\Post;

use FHINT\Database\Tables;

defined( 'ABSPATH' ) || exit;

/**
 * Every query on the posts table.
 *
 * Table names come from Tables::name() and every variable goes through
 * $wpdb->prepare(). The column list in COLUMNS is the only set a caller
 * can write: anything else in an array handed to create() or update() is
 * dropped, so a request can never set `google_name` or `status` by naming
 * them.
 */
class PostRepository {

	/** The columns create() and update() write, with their empty value. */
	const COLUMNS = array(
		'location_name' => '',
		'account_name'  => '',
		'google_name'   => '',
		'topic_type'    => 'update',
		'status'        => 'draft',
		'source'        => 'manual',
		'source_ref'    => '',
		'title'         => '',
		'summary'       => '',
		'cta_type'      => '',
		'cta_url'       => '',
		'starts_at'     => null,
		'ends_at'       => null,
		'coupon_code'   => '',
		'redeem_url'    => '',
		'terms'         => '',
		'media_url'     => '',
		'attachment_id' => 0,
		'search_url'    => '',
		'error'         => '',
		'payload'       => null,
		'scheduled_at'  => null,
		'published_at'  => null,
		'synced_at'     => null,
	);

	/** Statuses that mean the post is on Google. */
	const ON_GOOGLE = array( 'live', 'processing', 'rejected' );

	/**
	 * Posts, newest first unless asked otherwise.
	 *
	 * @param array $args See where(), plus `sort` (new | old), per_page (0 for all) and offset.
	 * @return array[]
	 */
	public static function all( array $args = array() ) {
		global $wpdb;

		if ( ! self::table_exists() ) {
			return array();
		}

		$table = Tables::name( Tables::POSTS );

		list( $where, $params ) = self::where( $args );

		$order     = isset( $args['sort'] ) && 'old' === $args['sort'] ? 'ASC' : 'DESC';
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
			$wpdb->prepare( "SELECT * FROM {$table} {$where} ORDER BY COALESCE( published_at, updated_at ) {$order}, id {$order}{$limit_sql}", $params ),
			ARRAY_A
		);

		return array_map( array( __CLASS__, 'to_array' ), is_array( $rows ) ? $rows : array() );
	}

	/**
	 * How many posts match, ignoring any paging.
	 *
	 * @param array $args See where().
	 * @return int
	 */
	public static function count( array $args = array() ) {
		global $wpdb;

		if ( ! self::table_exists() ) {
			return 0;
		}

		$table = Tables::name( Tables::POSTS );

		list( $where, $params ) = self::where( $args );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		return (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} {$where}", $params ) );
	}

	/**
	 * How many posts of each type match — the counts on the type tabs.
	 *
	 * The type filter itself is ignored: each tab counts its own type under
	 * the other filters, so a tab never reads 0 just because another is open.
	 *
	 * @param array $args See where().
	 * @return array{all:int, update:int, event:int, offer:int}
	 */
	public static function counts_by_type( array $args = array() ) {
		global $wpdb;

		$counts = array(
			'all'    => 0,
			'update' => 0,
			'event'  => 0,
			'offer'  => 0,
		);

		if ( ! self::table_exists() ) {
			return $counts;
		}

		unset( $args['topic_type'] );

		$table = Tables::name( Tables::POSTS );

		list( $where, $params ) = self::where( $args );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$rows = $wpdb->get_results( $wpdb->prepare( "SELECT topic_type, COUNT(*) AS n FROM {$table} {$where} GROUP BY topic_type", $params ), ARRAY_A );

		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			if ( isset( $counts[ $row['topic_type'] ] ) ) {
				$counts[ $row['topic_type'] ] = (int) $row['n'];
			}

			$counts['all'] += (int) $row['n'];
		}

		return $counts;
	}

	/**
	 * The WHERE clause for a set of filters, with its prepared values.
	 *
	 * - `location_name`: one Google location, or '' for all.
	 * - `topic_type`: update | event | offer, or '' for any.
	 * - `status`: live (Google's LIVE or still processing), draft,
	 *   scheduled, failed (failed or rejected by Google), or '' for any.
	 * - `source`: manual | review | … , or '' for any.
	 * - `days`: only posts published — or, for one never published, last
	 *   edited — in the last N days. 0 for any time.
	 *
	 * @param array $args Filters.
	 * @return array{0:string, 1:array}
	 */
	private static function where( array $args ) {
		$where  = 'WHERE 1 = %d';
		$params = array( 1 );

		if ( ! empty( $args['location_name'] ) ) {
			$where   .= ' AND location_name = %s';
			$params[] = (string) $args['location_name'];
		}

		if ( ! empty( $args['topic_type'] ) ) {
			$where   .= ' AND topic_type = %s';
			$params[] = (string) $args['topic_type'];
		}

		switch ( isset( $args['status'] ) ? (string) $args['status'] : '' ) {
			case 'live':
				$where .= " AND status IN ( 'live', 'processing' )";
				break;
			case 'failed':
				$where .= " AND status IN ( 'failed', 'rejected' )";
				break;
			case 'draft':
			case 'scheduled':
				$where   .= ' AND status = %s';
				$params[] = (string) $args['status'];
				break;
		}

		if ( ! empty( $args['source'] ) ) {
			$where   .= ' AND source = %s';
			$params[] = (string) $args['source'];
		}

		$days = isset( $args['days'] ) ? (int) $args['days'] : 0;

		if ( $days > 0 ) {
			$where   .= ' AND COALESCE( published_at, updated_at ) >= %s';
			$params[] = gmdate( 'Y-m-d H:i:s', time() - $days * DAY_IN_SECONDS );
		}

		return array( $where, $params );
	}

	/**
	 * One post by row id.
	 *
	 * @param int $id Row id.
	 * @return array|null
	 */
	public static function find( $id ) {
		global $wpdb;

		if ( ! self::table_exists() || (int) $id <= 0 ) {
			return null;
		}

		$table = Tables::name( Tables::POSTS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", (int) $id ), ARRAY_A );

		return $row ? self::to_array( $row ) : null;
	}

	/**
	 * One post by Google's resource name.
	 *
	 * @param string $google_name Google resource name.
	 * @return array|null
	 */
	public static function find_by_google_name( $google_name ) {
		global $wpdb;

		if ( ! self::table_exists() || '' === (string) $google_name ) {
			return null;
		}

		$table = Tables::name( Tables::POSTS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE google_name = %s ORDER BY id ASC LIMIT 1", (string) $google_name ), ARRAY_A );

		return $row ? self::to_array( $row ) : null;
	}

	/**
	 * Store a new post.
	 *
	 * @param array $data Columns; anything not in COLUMNS is ignored.
	 * @return array|null The stored post.
	 */
	public static function create( array $data ) {
		global $wpdb;

		if ( ! self::table_exists() ) {
			return null;
		}

		$now = current_time( 'mysql', true );
		$row = self::columns( array_merge( self::COLUMNS, $data ) );

		$row['created_at'] = $now;
		$row['updated_at'] = $now;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		if ( false === $wpdb->insert( Tables::name( Tables::POSTS ), $row ) ) {
			return null;
		}

		return self::find( (int) $wpdb->insert_id );
	}

	/**
	 * Change some columns of one post.
	 *
	 * @param int   $id      Row id.
	 * @param array $changes Columns; anything not in COLUMNS is ignored.
	 * @return array|null The post as stored afterwards.
	 */
	public static function update( $id, array $changes ) {
		global $wpdb;

		if ( ! self::table_exists() ) {
			return null;
		}

		$row = self::columns( array_intersect_key( $changes, self::COLUMNS ) );

		$row['updated_at'] = current_time( 'mysql', true );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		if ( false === $wpdb->update( Tables::name( Tables::POSTS ), $row, array( 'id' => (int) $id ) ) ) {
			return null;
		}

		return self::find( $id );
	}

	/**
	 * Store what Google says about a post, keyed on its resource name.
	 *
	 * What only this site knows — where the post came from, the media
	 * library file behind its photo — is kept across a re-read.
	 *
	 * @param array $data A row from PostMapper::from_google().
	 * @return bool
	 */
	public static function upsert_from_google( array $data ) {
		$existing = self::find_by_google_name( (string) $data['google_name'] );

		$data['synced_at'] = current_time( 'mysql', true );

		if ( $existing ) {
			unset( $data['source'], $data['source_ref'], $data['attachment_id'] );

			// Google keeps the post's original creation time; a post first
			// sent from here may have been stamped from our clock.
			if ( empty( $data['published_at'] ) ) {
				unset( $data['published_at'] );
			}

			return null !== self::update( $existing['id'], $data );
		}

		return null !== self::create( $data );
	}

	/**
	 * Forget posts Google no longer has for a location.
	 *
	 * Only rows that were on Google go: a draft or a failed post was never
	 * there, and is the owner's work in progress.
	 *
	 * @param string   $location_name Google location resource name.
	 * @param string[] $keep          Resource names Google returned.
	 * @return int How many were removed.
	 */
	public static function prune_missing( $location_name, array $keep ) {
		$removed = 0;

		foreach ( self::all( array( 'location_name' => (string) $location_name ) ) as $post ) {
			if ( '' !== $post['google_name'] && in_array( $post['status'], self::ON_GOOGLE, true ) && ! in_array( $post['google_name'], $keep, true ) ) {
				self::delete( $post['id'] );
				$removed++;
			}
		}

		return $removed;
	}

	/**
	 * Delete one post row.
	 *
	 * @param int $id Row id.
	 * @return bool
	 */
	public static function delete( $id ) {
		global $wpdb;

		if ( ! self::table_exists() ) {
			return false;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return false !== $wpdb->delete( Tables::name( Tables::POSTS ), array( 'id' => (int) $id ) );
	}

	/**
	 * When Google last answered for a location's posts, UTC, or ''.
	 *
	 * @param string $location_name Google location resource name, or '' for any.
	 * @return string
	 */
	public static function last_synced_at( $location_name = '' ) {
		global $wpdb;

		if ( ! self::table_exists() ) {
			return '';
		}

		$table = Tables::name( Tables::POSTS );

		if ( '' === (string) $location_name ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			return (string) $wpdb->get_var( "SELECT MAX( synced_at ) FROM {$table}" );
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		return (string) $wpdb->get_var( $wpdb->prepare( "SELECT MAX( synced_at ) FROM {$table} WHERE location_name = %s", (string) $location_name ) );
	}

	/**
	 * Column values as the database takes them.
	 *
	 * @param array $data Columns.
	 * @return array
	 */
	private static function columns( array $data ) {
		$row = array();

		foreach ( $data as $column => $value ) {
			if ( ! array_key_exists( $column, self::COLUMNS ) ) {
				continue;
			}

			if ( 'payload' === $column ) {
				$row[ $column ] = null === $value ? null : wp_json_encode( $value );
			} elseif ( 'attachment_id' === $column ) {
				$row[ $column ] = absint( $value );
			} elseif ( in_array( $column, array( 'starts_at', 'ends_at', 'scheduled_at', 'published_at', 'synced_at' ), true ) ) {
				$row[ $column ] = $value && 'invalid' !== $value ? (string) $value : null;
			} else {
				$row[ $column ] = null === $value ? '' : (string) $value;
			}
		}

		return $row;
	}

	/**
	 * Shape one database row for the rest of the plugin.
	 *
	 * @param array $row Raw row.
	 * @return array
	 */
	private static function to_array( array $row ) {
		$out = array( 'id' => (int) $row['id'] );

		foreach ( self::COLUMNS as $column => $empty ) {
			if ( 'payload' === $column ) {
				continue;
			}

			$value = isset( $row[ $column ] ) ? $row[ $column ] : $empty;

			if ( 'attachment_id' === $column ) {
				$out[ $column ] = (int) $value;
			} elseif ( null === $empty && ! in_array( $column, array( 'payload' ), true ) ) {
				$out[ $column ] = $value ? (string) $value : null;
			} else {
				$out[ $column ] = (string) $value;
			}
		}

		// How many photos or videos Google holds on the post. A post written
		// on Google can carry several; this site keeps a link to the first.
		$payload             = isset( $row['payload'] ) ? json_decode( (string) $row['payload'], true ) : null;
		$out['media_count']  = is_array( $payload ) && isset( $payload['media'] ) && is_array( $payload['media'] ) ? count( $payload['media'] ) : ( '' !== $out['media_url'] ? 1 : 0 );
		$out['created_at'] = isset( $row['created_at'] ) ? (string) $row['created_at'] : '';
		$out['updated_at'] = isset( $row['updated_at'] ) ? (string) $row['updated_at'] : '';

		return $out;
	}

	/**
	 * Whether the table is there — false before the first install.
	 *
	 * @return bool
	 */
	private static function table_exists() {
		return Tables::exists( Tables::POSTS );
	}
}
