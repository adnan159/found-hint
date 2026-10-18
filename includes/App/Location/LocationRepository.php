<?php
/**
 * Location persistence.
 *
 * @package FoundHint
 */

namespace FHINT\App\Location;

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Core\Logger;
use FHINT\App\Core\Validator;
use FHINT\Database\Tables;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes locations, and owns the cascade to their hours.
 */
class LocationRepository {

	/**
	 * Locations for the current business.
	 *
	 * @param array $args status, per_page, offset.
	 * @return array[]
	 */
	public static function all( array $args = array() ) {
		global $wpdb;

		if ( ! Tables::exists( Tables::LOCATIONS ) ) {
			return array();
		}

		$business_id = BusinessRepository::current_id();

		if ( ! $business_id ) {
			return array();
		}

		$table  = Tables::name( Tables::LOCATIONS );
		$where  = 'WHERE business_id = %d';
		$params = array( $business_id );

		if ( ! empty( $args['status'] ) ) {
			$where   .= ' AND status = %s';
			$params[] = (string) $args['status'];
		}

		$limit    = isset( $args['per_page'] ) ? (int) $args['per_page'] : 0;
		$offset   = isset( $args['offset'] ) ? max( 0, (int) $args['offset'] ) : 0;
		$limit_sql = '';

		if ( $limit > 0 ) {
			$limit_sql = ' LIMIT %d OFFSET %d';
			$params[]  = $limit;
			$params[]  = $offset;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$rows = $wpdb->get_results(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT * FROM {$table} {$where} ORDER BY is_primary DESC, id ASC{$limit_sql}", $params ),
			ARRAY_A
		);

		return array_map( array( __CLASS__, 'hydrate' ), (array) $rows );
	}

	/**
	 * One location by id, scoped to the current business.
	 *
	 * @param int $id Location id.
	 * @return array|null
	 */
	public static function find( $id ) {
		global $wpdb;

		$id = (int) $id;

		if ( ! $id || ! Tables::exists( Tables::LOCATIONS ) ) {
			return null;
		}

		$table = Tables::name( Tables::LOCATIONS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id ), ARRAY_A );

		return $row ? self::hydrate( $row ) : null;
	}

	/**
	 * The location that remembers being a given Google listing.
	 *
	 * @param string $location_name Google location resource name.
	 * @return array|null
	 */
	public static function find_by_google_location_name( $location_name ) {
		global $wpdb;

		$location_name = (string) $location_name;

		if ( '' === $location_name || ! Tables::exists( Tables::LOCATIONS ) ) {
			return null;
		}

		$table = Tables::name( Tables::LOCATIONS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE google_location_name = %s ORDER BY id ASC LIMIT 1", $location_name ), ARRAY_A );

		return $row ? self::hydrate( $row ) : null;
	}

	/**
	 * Record, or clear, which Google listing a location is.
	 *
	 * Written straight to the column: this is bookkeeping for the link, not
	 * an edit of the location, so it neither validates nor stamps the
	 * location as changed. A listing is one location's at a time, so it is
	 * cleared from any other first.
	 *
	 * @param int    $id            Location id.
	 * @param string $location_name Google resource name, or '' to forget.
	 * @return void
	 */
	public static function remember_google_listing( $id, $location_name ) {
		global $wpdb;

		if ( ! Tables::exists( Tables::LOCATIONS ) ) {
			return;
		}

		$table         = Tables::name( Tables::LOCATIONS );
		$location_name = (string) $location_name;

		if ( '' !== $location_name ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->update( $table, array( 'google_location_name' => '' ), array( 'google_location_name' => $location_name ) );
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->update( $table, array( 'google_location_name' => $location_name ), array( 'id' => (int) $id ) );
	}

	/**
	 * The location used when a single place is needed — schema, the dashboard.
	 *
	 * @return array|null
	 */
	public static function primary() {
		$locations = self::all();

		foreach ( $locations as $location ) {
			if ( $location['is_primary'] ) {
				return $location;
			}
		}

		return $locations ? $locations[0] : null;
	}

	/**
	 * How many locations exist.
	 *
	 * @return int
	 */
	public static function count() {
		global $wpdb;

		if ( ! Tables::exists( Tables::LOCATIONS ) ) {
			return 0;
		}

		$business_id = BusinessRepository::current_id();

		if ( ! $business_id ) {
			return 0;
		}

		$table = Tables::name( Tables::LOCATIONS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		return (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE business_id = %d", $business_id ) );
	}

	/**
	 * Create a location.
	 *
	 * @param array $data Sanitised writable fields.
	 * @return array|null The stored record, or null when the write failed.
	 */
	public static function create( array $data ) {
		global $wpdb;

		$business_id = BusinessRepository::current_id();

		if ( ! $business_id ) {
			return null;
		}

		$record                = array_merge( Location::blank(), $data );
		$record['business_id'] = $business_id;
		$now                   = Validator::now();

		$columns               = self::columns( $record );
		$columns['business_id'] = $business_id;
		$columns['created_at']  = $now;
		$columns['updated_at']  = $now;

		// The first location is the primary one; nothing else would be.
		if ( 0 === self::count() ) {
			$columns['is_primary'] = 1;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$inserted = $wpdb->insert( Tables::name( Tables::LOCATIONS ), $columns );

		if ( ! $inserted ) {
			Logger::error( 'location', 'location.create_failed', 'Could not create the location.' );
			return null;
		}

		$id = (int) $wpdb->insert_id;

		if ( ! empty( $columns['is_primary'] ) ) {
			self::demote_others( $id );
		}

		Logger::info( 'location', 'location.created', 'Location created.', array( 'location_id' => $id ) );
		BusinessRepository::stamp_data_changed();

		return self::find( $id );
	}

	/**
	 * Update a location, merging a partial payload over what is stored.
	 *
	 * @param int   $id      Location id.
	 * @param array $changes Sanitised writable fields.
	 * @return array|null
	 */
	public static function update( $id, array $changes ) {
		global $wpdb;

		$existing = self::find( $id );

		if ( ! $existing ) {
			return null;
		}

		$record  = array_merge( $existing, $changes );
		$columns = self::columns( $record );

		$columns['updated_at'] = Validator::now();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$updated = $wpdb->update( Tables::name( Tables::LOCATIONS ), $columns, array( 'id' => (int) $id ) );

		if ( false === $updated ) {
			Logger::error( 'location', 'location.update_failed', 'Could not update the location.', array( 'location_id' => (int) $id ) );
			return null;
		}

		if ( ! empty( $columns['is_primary'] ) ) {
			self::demote_others( (int) $id );
		}

		Logger::info(
			'location',
			'location.updated',
			'Location updated.',
			array(
				'location_id' => (int) $id,
				'metadata' => array( 'fields' => array_keys( $changes ) ),
			)
		);
		BusinessRepository::stamp_data_changed();

		return self::find( $id );
	}

	/**
	 * Delete a location and its hours.
	 *
	 * @param int $id Location id.
	 * @return bool
	 */
	public static function delete( $id ) {
		global $wpdb;

		$id       = (int) $id;
		$existing = self::find( $id );

		if ( ! $existing ) {
			return false;
		}

		$table = Tables::name( Tables::LOCATIONS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( 'START TRANSACTION' );

		OpeningHoursRepository::delete_for_location( $id );
		SpecialHoursRepository::delete_for_location( $id );
		LocationAttributeRepository::delete_for_location( $id );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$deleted = $wpdb->query( $wpdb->prepare( "DELETE FROM {$table} WHERE id = %d", $id ) );

		if ( false === $deleted ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->query( 'ROLLBACK' );
			return false;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( 'COMMIT' );

		// Losing the primary would leave the site with none, so promote the
		// next one rather than leaving schema output with nothing to point at.
		if ( $existing['is_primary'] ) {
			$next = self::all();

			if ( $next ) {
				self::update( $next[0]['id'], array( 'is_primary' => true ) );
			}
		}

		Logger::info( 'location', 'location.deleted', 'Location deleted.', array( 'location_id' => $id ) );
		BusinessRepository::stamp_data_changed();

		// Anything holding a reference to this location gets a chance to let
		// go. A hook rather than a direct call: this repository must not
		// have to know which modules exist, and the Google mapping is one of
		// several things that will eventually need this.
		do_action( 'fhint_location_deleted', $id );

		return true;
	}

	/**
	 * Clear is_primary on every location except one.
	 *
	 * @param int $keep_id Location that stays primary.
	 * @return void
	 */
	private static function demote_others( $keep_id ) {
		global $wpdb;

		$business_id = BusinessRepository::current_id();
		$table       = Tables::name( Tables::LOCATIONS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$wpdb->query( $wpdb->prepare( "UPDATE {$table} SET is_primary = 0 WHERE business_id = %d AND id != %d", $business_id, (int) $keep_id ) );
	}

	/**
	 * Turn a stored row into a typed record.
	 *
	 * @param array $row Raw database row.
	 * @return array
	 */
	private static function hydrate( array $row ) {
		$record = array_merge( Location::blank(), $row );

		$record['id']                = (int) $row['id'];
		$record['business_id']       = (int) $row['business_id'];
		$record['wordpress_post_id'] = (int) $row['wordpress_post_id'];
		$record['is_primary']        = (bool) $row['is_primary'];
		$record['latitude']          = ( null === $row['latitude'] || '' === $row['latitude'] ) ? null : (float) $row['latitude'];
		$record['longitude']         = ( null === $row['longitude'] || '' === $row['longitude'] ) ? null : (float) $row['longitude'];

		$categories                     = isset( $row['secondary_categories'] ) ? json_decode( (string) $row['secondary_categories'], true ) : null;
		$record['secondary_categories'] = is_array( $categories ) ? $categories : array();
		$record['business_name']        = isset( $row['business_name'] ) ? (string) $row['business_name'] : '';
		$record['description']          = isset( $row['description'] ) ? (string) $row['description'] : '';
		$social                         = isset( $row['social_profiles'] ) ? json_decode( (string) $row['social_profiles'], true ) : null;
		$record['social_profiles']      = is_array( $social ) ? $social : null;
		$phones                         = isset( $row['additional_phones'] ) ? json_decode( (string) $row['additional_phones'], true ) : null;
		$record['additional_phones']    = is_array( $phones ) ? $phones : null;
		$booking                        = isset( $row['booking_links'] ) ? json_decode( (string) $row['booking_links'], true ) : null;
		$record['booking_links']        = is_array( $booking ) ? $booking : null;
		$area                           = isset( $row['service_area'] ) ? json_decode( (string) $row['service_area'], true ) : null;
		$record['service_area']         = is_array( $area ) ? $area : array();
		$record['opening_date']         = isset( $row['opening_date'] ) && $row['opening_date'] ? (string) $row['opening_date'] : '';

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
			'name'           => (string) $record['name'],
			'address_line_1' => (string) $record['address_line_1'],
			'address_line_2' => (string) $record['address_line_2'],
			'city'           => (string) $record['city'],
			'region'         => (string) $record['region'],
			'country'        => strtoupper( (string) $record['country'] ),
			'postal_code'    => (string) $record['postal_code'],
			'latitude'       => ( null === $record['latitude'] || '' === $record['latitude'] ) ? null : (float) $record['latitude'],
			'longitude'      => ( null === $record['longitude'] || '' === $record['longitude'] ) ? null : (float) $record['longitude'],
			'phone'          => (string) $record['phone'],
			'email'          => (string) $record['email'],
			'website'        => (string) $record['website'],
			'timezone'       => (string) $record['timezone'],
			'status'         => (string) $record['status'],
			'is_primary'     => ! empty( $record['is_primary'] ) ? 1 : 0,
			'business_name'        => isset( $record['business_name'] ) ? (string) $record['business_name'] : '',
			'description'          => isset( $record['description'] ) ? (string) $record['description'] : '',
			// NULL until the location has links of its own; see the table docblock.
			'social_profiles'      => isset( $record['social_profiles'] ) && is_array( $record['social_profiles'] ) ? wp_json_encode( $record['social_profiles'] ) : null,
			'primary_category'     => isset( $record['primary_category'] ) ? (string) $record['primary_category'] : '',
			'primary_category_id'  => isset( $record['primary_category_id'] ) ? (string) $record['primary_category_id'] : '',
			'secondary_categories' => wp_json_encode( isset( $record['secondary_categories'] ) && is_array( $record['secondary_categories'] ) ? array_values( $record['secondary_categories'] ) : array() ),
			// NULL until the location has numbers of its own; see the table docblock.
			'additional_phones'    => isset( $record['additional_phones'] ) && is_array( $record['additional_phones'] ) ? wp_json_encode( array_values( $record['additional_phones'] ) ) : null,
			'google_location_name' => isset( $record['google_location_name'] ) ? (string) $record['google_location_name'] : '',
			'service_area'         => isset( $record['service_area'] ) && is_array( $record['service_area'] ) && $record['service_area'] ? wp_json_encode( array_values( $record['service_area'] ) ) : null,
			'booking_links'        => isset( $record['booking_links'] ) && is_array( $record['booking_links'] ) ? wp_json_encode( $record['booking_links'] ) : null,
			// NULL, not '', for "use the business's": a DATE column has no empty.
			'opening_date'         => isset( $record['opening_date'] ) && '' !== (string) $record['opening_date'] ? (string) $record['opening_date'] : null,
		);
	}
}
