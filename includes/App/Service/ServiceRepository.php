<?php
/**
 * Service persistence.
 *
 * @package FoundHint
 */

namespace FHINT\App\Service;

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Core\Logger;
use FHINT\App\Core\Validator;
use FHINT\Database\Tables;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes services, and owns slug uniqueness and ordering.
 */
class ServiceRepository {

	/**
	 * Services for the current business, in display order.
	 *
	 * @param array $args status, per_page, offset.
	 * @return array[]
	 */
	public static function all( array $args = array() ) {
		global $wpdb;

		if ( ! Tables::exists( Tables::SERVICES ) ) {
			return array();
		}

		$business_id = BusinessRepository::current_id();

		if ( ! $business_id ) {
			return array();
		}

		$table  = Tables::name( Tables::SERVICES );
		$where  = 'WHERE business_id = %d';
		$params = array( $business_id );

		if ( ! empty( $args['status'] ) ) {
			$where   .= ' AND status = %s';
			$params[] = (string) $args['status'];
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
			$wpdb->prepare( "SELECT * FROM {$table} {$where} ORDER BY sort_order ASC, id ASC{$limit_sql}", $params ),
			ARRAY_A
		);

		return array_map( array( __CLASS__, 'hydrate' ), (array) $rows );
	}

	/**
	 * One service by id.
	 *
	 * @param int $id Service id.
	 * @return array|null
	 */
	public static function find( $id ) {
		global $wpdb;

		$id = (int) $id;

		if ( ! $id || ! Tables::exists( Tables::SERVICES ) ) {
			return null;
		}

		$table = Tables::name( Tables::SERVICES );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id ), ARRAY_A );

		return $row ? self::hydrate( $row ) : null;
	}

	/**
	 * How many services exist.
	 *
	 * @return int
	 */
	public static function count() {
		global $wpdb;

		if ( ! Tables::exists( Tables::SERVICES ) ) {
			return 0;
		}

		$business_id = BusinessRepository::current_id();

		if ( ! $business_id ) {
			return 0;
		}

		$table = Tables::name( Tables::SERVICES );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		return (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE business_id = %d", $business_id ) );
	}

	/**
	 * Create a service.
	 *
	 * @param array $data Sanitised writable fields.
	 * @return array|null
	 */
	public static function create( array $data ) {
		global $wpdb;

		$business_id = BusinessRepository::current_id();

		if ( ! $business_id ) {
			return null;
		}

		$record                = array_merge( Service::blank(), $data );
		$record['business_id'] = $business_id;

		// Derived here rather than only in the REST controller: the slug is
		// half of a unique key, so a caller that does not supply one would
		// store an empty slug, and the *second* such service would collide
		// with the first and fail the insert. Every caller gets the rule.
		$slug = '' !== trim( (string) $record['slug'] ) ? $record['slug'] : $record['name'];

		$record['slug'] = self::unique_slug( $slug, $business_id, 0 );

		if ( ! isset( $data['sort_order'] ) ) {
			$record['sort_order'] = self::next_sort_order( $business_id );
		}

		$now                    = Validator::now();
		$columns                = self::columns( $record );
		$columns['business_id'] = $business_id;
		$columns['created_at']  = $now;
		$columns['updated_at']  = $now;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$inserted = $wpdb->insert( Tables::name( Tables::SERVICES ), $columns );

		if ( ! $inserted ) {
			Logger::error( 'service', 'service.create_failed', 'Could not create the service.' );
			return null;
		}

		$id = (int) $wpdb->insert_id;

		Logger::info( 'service', 'service.created', 'Service created.', array( 'metadata' => array( 'service_id' => $id ) ) );
		BusinessRepository::stamp_data_changed();

		return self::find( $id );
	}

	/**
	 * Update a service.
	 *
	 * Renaming does **not** regenerate the slug: it may already be in a
	 * published URL, and silently changing it would break that link. Send
	 * `slug` explicitly to change it.
	 *
	 * @param int   $id      Service id.
	 * @param array $changes Sanitised writable fields.
	 * @return array|null
	 */
	public static function update( $id, array $changes ) {
		global $wpdb;

		$existing = self::find( $id );

		if ( ! $existing ) {
			return null;
		}

		$record = array_merge( $existing, $changes );

		if ( array_key_exists( 'slug', $changes ) ) {
			$record['slug'] = self::unique_slug( $record['slug'], (int) $existing['business_id'], (int) $id );
		}

		$columns               = self::columns( $record );
		$columns['updated_at'] = Validator::now();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$updated = $wpdb->update( Tables::name( Tables::SERVICES ), $columns, array( 'id' => (int) $id ) );

		if ( false === $updated ) {
			Logger::error( 'service', 'service.update_failed', 'Could not update the service.' );
			return null;
		}

		Logger::info(
			'service',
			'service.updated',
			'Service updated.',
			array(
				'metadata' => array(
					'service_id' => (int) $id,
					'fields' => array_keys( $changes ),
				),
			)
		);
		BusinessRepository::stamp_data_changed();

		return self::find( $id );
	}

	/**
	 * Delete a service.
	 *
	 * @param int $id Service id.
	 * @return bool
	 */
	public static function delete( $id ) {
		global $wpdb;

		$id = (int) $id;

		if ( ! self::find( $id ) ) {
			return false;
		}

		$table = Tables::name( Tables::SERVICES );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$deleted = $wpdb->query( $wpdb->prepare( "DELETE FROM {$table} WHERE id = %d", $id ) );

		if ( false === $deleted ) {
			return false;
		}

		Logger::info( 'service', 'service.deleted', 'Service deleted.', array( 'metadata' => array( 'service_id' => $id ) ) );
		BusinessRepository::stamp_data_changed();

		return true;
	}

	/**
	 * Resequence sort_order across the whole set in one write.
	 *
	 * The client sends the complete new order. Doing this server-side keeps
	 * the rule in one place and makes it impossible for two services to end
	 * up sharing a position.
	 *
	 * @param int[] $ids Service ids in their new order.
	 * @return int How many rows were reordered.
	 */
	public static function reorder( array $ids ) {
		global $wpdb;

		$business_id = BusinessRepository::current_id();

		if ( ! $business_id ) {
			return 0;
		}

		$owned = array();

		foreach ( self::all() as $service ) {
			$owned[ (int) $service['id'] ] = true;
		}

		$table    = Tables::name( Tables::SERVICES );
		$now      = Validator::now();
		$position = 0;
		$updated  = 0;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( 'START TRANSACTION' );

		foreach ( $ids as $id ) {
			$id = (int) $id;

			// Ids that aren't ours are dropped rather than trusted.
			if ( ! isset( $owned[ $id ] ) ) {
				continue;
			}

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->update(
				$table,
				array(
					'sort_order' => $position,
					'updated_at' => $now,
				),
				array( 'id' => $id )
			);

			$position++;
			$updated++;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( 'COMMIT' );

		if ( $updated ) {
			Logger::info( 'service', 'service.reordered', 'Services reordered.', array( 'metadata' => array( 'count' => $updated ) ) );
			BusinessRepository::stamp_data_changed();
		}

		return $updated;
	}

	/**
	 * Make a slug unique within the business by suffixing (-2, -3).
	 *
	 * @param string $slug        Desired slug.
	 * @param int    $business_id Owning business.
	 * @param int    $ignore_id   Service id to exclude (itself, on update).
	 * @return string
	 */
	private static function unique_slug( $slug, $business_id, $ignore_id = 0 ) {
		global $wpdb;

		$slug = sanitize_title( (string) $slug );

		if ( '' === $slug ) {
			return '';
		}

		$table    = Tables::name( Tables::SERVICES );
		$base     = $slug;
		$suffix   = 1;

		while ( true ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$taken = (int) $wpdb->get_var(
				$wpdb->prepare(
					// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					"SELECT COUNT(*) FROM {$table} WHERE business_id = %d AND slug = %s AND id != %d",
					(int) $business_id,
					$slug,
					(int) $ignore_id
				)
			);

			if ( ! $taken ) {
				return $slug;
			}

			$suffix++;
			$slug = $base . '-' . $suffix;
		}
	}

	/**
	 * The sort_order a newly created service should take.
	 *
	 * @param int $business_id Owning business.
	 * @return int
	 */
	private static function next_sort_order( $business_id ) {
		global $wpdb;

		$table = Tables::name( Tables::SERVICES );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$max = $wpdb->get_var( $wpdb->prepare( "SELECT MAX(sort_order) FROM {$table} WHERE business_id = %d", (int) $business_id ) );

		return null === $max ? 0 : (int) $max + 1;
	}

	/**
	 * Turn a stored row into a typed record.
	 *
	 * @param array $row Raw database row.
	 * @return array
	 */
	private static function hydrate( array $row ) {
		$record = array_merge( Service::blank(), $row );

		$record['id']                  = (int) $row['id'];
		$record['business_id']         = (int) $row['business_id'];
		$record['image_attachment_id'] = (int) $row['image_attachment_id'];
		$record['sort_order']          = (int) $row['sort_order'];
		$record['price']               = ( null === $row['price'] || '' === $row['price'] ) ? null : (float) $row['price'];

		return $record;
	}

	/**
	 * Turn a record into storable columns.
	 *
	 * @param array $record Full record.
	 * @return array
	 */
	private static function columns( array $record ) {
		return array(
			'name'                => (string) $record['name'],
			'slug'                => (string) $record['slug'],
			'description'         => (string) $record['description'],
			'image_attachment_id' => (int) $record['image_attachment_id'],
			'image_url'           => (string) $record['image_url'],
			'price'               => ( null === $record['price'] || '' === $record['price'] ) ? null : (float) $record['price'],
			'currency'            => strtoupper( (string) $record['currency'] ),
			'url'                 => (string) $record['url'],
			'status'              => (string) $record['status'],
			'sort_order'          => (int) $record['sort_order'],
		);
	}
}
