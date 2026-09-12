<?php
/**
 * Locations REST controller.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Core\Limits;
use FHINT\App\Location\Location as LocationEntity;
use FHINT\App\Location\LocationRepository;
use FHINT\App\Location\OpeningHours;
use FHINT\App\Location\OpeningHoursRepository;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * CRUD for locations, including their opening hours.
 *
 * Hours are written as part of a location payload rather than through their
 * own endpoint: they are meaningless without the location, and a separate
 * route would let a client save half a change.
 */
class Locations extends AbstractController {

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		$self = new self();

		add_action( 'rest_api_init', array( $self, 'register_routes' ) );
	}

	/**
	 * Register the routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/locations',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'status'   => array(
								'type' => 'string',
								'enum' => LocationEntity::statuses(),
							),
							'per_page' => array(
								'type' => 'integer',
								'minimum' => 0,
								'maximum' => 100,
								'default' => 0,
							),
							'offset'   => array(
								'type' => 'integer',
								'minimum' => 0,
								'default' => 0,
							),
						)
					),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->write_args(),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/locations/(?P<id>\d+)',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
				array(
					'methods'             => 'POST, PUT, PATCH',
					'callback'            => array( $this, 'update_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->write_args(),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
			)
		);
	}

	/**
	 * List locations.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_items( $request ) {
		$locations = LocationRepository::all(
			array(
				'status'   => $request->get_param( 'status' ),
				'per_page' => $request->get_param( 'per_page' ),
				'offset'   => $request->get_param( 'offset' ),
			)
		);

		$ids   = wp_list_pluck( $locations, 'id' );
		$hours = OpeningHoursRepository::for_locations( $ids );

		$data = array();

		foreach ( $locations as $location ) {
			$rows   = isset( $hours[ (int) $location['id'] ] ) ? $hours[ (int) $location['id'] ] : array();
			$data[] = $this->prepare( $location, $rows );
		}

		$total = LocationRepository::count();

		return $this->envelope(
			$data,
			array(
				'total'  => $total,
				'limits' => Limits::report( Limits::LOCATIONS, $total ),
			)
		);
	}

	/**
	 * Return one location.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_item( $request ) {
		$location = LocationRepository::find( $request->get_param( 'id' ) );

		if ( ! $location ) {
			return $this->not_found( 'location' );
		}

		return $this->envelope( $this->prepare( $location, OpeningHoursRepository::for_location( $location['id'] ) ) );
	}

	/**
	 * Create a location.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create_item( $request ) {
		if ( ! BusinessRepository::exists() ) {
			return $this->business_required();
		}

		$count = LocationRepository::count();

		if ( ! Limits::can_add( Limits::LOCATIONS, $count ) ) {
			return $this->limit_reached( 'location', Limits::get( Limits::LOCATIONS ) );
		}

		$body    = $this->body( $request );
		$changes = LocationEntity::sanitize( $body );
		$merged  = array_merge( LocationEntity::blank(), $changes );

		$validation = LocationEntity::validate( $merged );
		$hour_rows  = array();

		if ( array_key_exists( 'opening_hours', $body ) ) {
			$hour_rows = OpeningHours::parse( $body['opening_hours'] );
			$validation->merge( OpeningHours::validate( $hour_rows ), 'opening_hours' );
		}

		if ( ! $validation->is_valid() ) {
			return $this->validation_error( $validation );
		}

		$location = LocationRepository::create( $changes );

		if ( ! $location ) {
			return $this->save_failed();
		}

		if ( $hour_rows ) {
			OpeningHoursRepository::replace( $location['id'], $hour_rows );
		}

		return $this->envelope(
			$this->prepare( $location, OpeningHoursRepository::for_location( $location['id'] ) ),
			array( 'limits' => Limits::report( Limits::LOCATIONS, LocationRepository::count() ) ),
			201
		);
	}

	/**
	 * Update a location.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_item( $request ) {
		$existing = LocationRepository::find( $request->get_param( 'id' ) );

		if ( ! $existing ) {
			return $this->not_found( 'location' );
		}

		$body    = $this->body( $request );
		$changes = LocationEntity::sanitize( $body );
		$merged  = array_merge( $existing, $changes );

		$validation = LocationEntity::validate( $merged );
		$hour_rows  = null;

		if ( array_key_exists( 'opening_hours', $body ) ) {
			$hour_rows = OpeningHours::parse( $body['opening_hours'] );
			$validation->merge( OpeningHours::validate( $hour_rows ), 'opening_hours' );
		}

		if ( ! $validation->is_valid() ) {
			return $this->validation_error( $validation );
		}

		$location = LocationRepository::update( $existing['id'], $changes );

		if ( ! $location ) {
			return $this->save_failed();
		}

		// A save replaces the whole week; an absent key leaves it untouched.
		if ( null !== $hour_rows ) {
			OpeningHoursRepository::replace( $location['id'], $hour_rows );
		}

		return $this->envelope( $this->prepare( $location, OpeningHoursRepository::for_location( $location['id'] ) ) );
	}

	/**
	 * Delete a location.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function delete_item( $request ) {
		$existing = LocationRepository::find( $request->get_param( 'id' ) );

		if ( ! $existing ) {
			return $this->not_found( 'location' );
		}

		$previous = $this->prepare( $existing, OpeningHoursRepository::for_location( $existing['id'] ) );

		if ( ! LocationRepository::delete( $existing['id'] ) ) {
			return $this->save_failed();
		}

		return $this->envelope(
			array(
				'deleted' => true,
				'previous' => $previous,
			),
			array( 'limits' => Limits::report( Limits::LOCATIONS, LocationRepository::count() ) )
		);
	}

	/**
	 * The request body, preferring JSON.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return array
	 */
	private function body( $request ) {
		$json = $request->get_json_params();

		return is_array( $json ) && $json ? $json : (array) $request->get_params();
	}

	/**
	 * Shape a record for the response.
	 *
	 * @param array   $location  Stored record.
	 * @param array[] $hour_rows Stored hour rows.
	 * @return array
	 */
	private function prepare( array $location, array $hour_rows ) {
		$location['formatted_address'] = LocationEntity::formatted_address( $location );
		$location['opening_hours']     = OpeningHours::to_payload( $hour_rows );

		return $location;
	}

	/**
	 * Writable argument definitions.
	 *
	 * latitude/longitude are typed loosely on purpose: the documented way to
	 * clear one is to send '', which a strict number type would reject with
	 * a message the user cannot act on. Range is enforced in validation,
	 * where an out-of-range value produces a 400 rather than being silently
	 * discarded.
	 *
	 * @return array
	 */
	private function write_args() {
		return $this->args(
			array(
				'name'           => array( 'type' => 'string' ),
				'address_line_1' => array( 'type' => 'string' ),
				'address_line_2' => array( 'type' => 'string' ),
				'city'           => array( 'type' => 'string' ),
				'region'         => array( 'type' => 'string' ),
				'country'        => array( 'type' => 'string' ),
				'postal_code'    => array( 'type' => 'string' ),
				'latitude'       => array( 'type' => array( 'number', 'string', 'null' ) ),
				'longitude'      => array( 'type' => array( 'number', 'string', 'null' ) ),
				'phone'          => array( 'type' => 'string' ),
				'email'          => array( 'type' => 'string' ),
				'website'        => array( 'type' => 'string' ),
				'timezone'       => array( 'type' => 'string' ),
				'status'         => array(
					'type' => 'string',
					'enum' => LocationEntity::statuses(),
				),
				'is_primary'     => array( 'type' => 'boolean' ),
				'opening_hours'  => array( 'type' => 'object' ),
			)
		);
	}
}
