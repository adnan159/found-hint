<?php
/**
 * Services REST controller.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Core\Limits;
use FHINT\App\Service\Service as ServiceEntity;
use FHINT\App\Service\ServiceRepository;
use WP_Error;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * CRUD for services, plus bulk reordering.
 *
 * Reordering is a server-side operation taking the complete new order: doing
 * it client-side would duplicate the sequencing rule and risk two services
 * sharing a position.
 */
class Services extends AbstractController {

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
			'/services',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'status'   => array(
								'type' => 'string',
								'enum' => ServiceEntity::statuses(),
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
			'/services/reorder',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'reorder' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'ids' => array(
								'type'     => 'array',
								'required' => true,
								'items'    => array( 'type' => 'integer' ),
							),
						)
					),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/services/(?P<id>\d+)',
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
	 * List services.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_items( $request ) {
		$services = ServiceRepository::all(
			array(
				'status'   => $request->get_param( 'status' ),
				'per_page' => $request->get_param( 'per_page' ),
				'offset'   => $request->get_param( 'offset' ),
			)
		);

		$total = ServiceRepository::count();

		return $this->envelope(
			$services,
			array(
				'total'  => $total,
				'limits' => Limits::report( Limits::SERVICES, $total ),
			)
		);
	}

	/**
	 * Return one service.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_item( $request ) {
		$service = ServiceRepository::find( $request->get_param( 'id' ) );

		if ( ! $service ) {
			return $this->not_found( 'service' );
		}

		return $this->envelope( $service );
	}

	/**
	 * Create a service.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create_item( $request ) {
		if ( ! BusinessRepository::exists() ) {
			return $this->business_required();
		}

		$count = ServiceRepository::count();

		if ( ! Limits::can_add( Limits::SERVICES, $count ) ) {
			return $this->limit_reached( 'service', Limits::get( Limits::SERVICES ) );
		}

		$changes = ServiceEntity::sanitize( $this->body( $request ) );

		// A service named but not slugged gets its slug from the name; the
		// repository then makes it unique.
		if ( empty( $changes['slug'] ) && ! empty( $changes['name'] ) ) {
			$changes['slug'] = sanitize_title( $changes['name'] );
		}

		$merged     = array_merge( ServiceEntity::blank(), $changes );
		$validation = ServiceEntity::validate( $merged );

		if ( ! $validation->is_valid() ) {
			return $this->validation_error( $validation );
		}

		$service = ServiceRepository::create( $changes );

		if ( ! $service ) {
			return $this->save_failed();
		}

		return $this->envelope(
			$service,
			array( 'limits' => Limits::report( Limits::SERVICES, ServiceRepository::count() ) ),
			201
		);
	}

	/**
	 * Update a service.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_item( $request ) {
		$existing = ServiceRepository::find( $request->get_param( 'id' ) );

		if ( ! $existing ) {
			return $this->not_found( 'service' );
		}

		$changes    = ServiceEntity::sanitize( $this->body( $request ) );
		$merged     = array_merge( $existing, $changes );
		$validation = ServiceEntity::validate( $merged );

		if ( ! $validation->is_valid() ) {
			return $this->validation_error( $validation );
		}

		$service = ServiceRepository::update( $existing['id'], $changes );

		if ( ! $service ) {
			return $this->save_failed();
		}

		return $this->envelope( $service );
	}

	/**
	 * Delete a service.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function delete_item( $request ) {
		$existing = ServiceRepository::find( $request->get_param( 'id' ) );

		if ( ! $existing ) {
			return $this->not_found( 'service' );
		}

		if ( ! ServiceRepository::delete( $existing['id'] ) ) {
			return $this->save_failed();
		}

		return $this->envelope(
			array(
				'deleted' => true,
				'previous' => $existing,
			),
			array( 'limits' => Limits::report( Limits::SERVICES, ServiceRepository::count() ) )
		);
	}

	/**
	 * Resequence services.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function reorder( $request ) {
		$ids     = (array) $request->get_param( 'ids' );
		$updated = ServiceRepository::reorder( $ids );

		if ( ! $updated ) {
			return new WP_Error(
				'fhint_nothing_to_reorder',
				__( 'None of those services belong to this business.', 'found-hint' ),
				array( 'status' => 400 )
			);
		}

		return $this->envelope( ServiceRepository::all(), array( 'reordered' => $updated ) );
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
	 * Writable argument definitions.
	 *
	 * @return array
	 */
	private function write_args() {
		return $this->args(
			array(
				'name'                => array( 'type' => 'string' ),
				'slug'                => array( 'type' => 'string' ),
				'description'         => array( 'type' => 'string' ),
				'image_attachment_id' => array(
					'type' => 'integer',
					'minimum' => 0,
				),
				'image_url'           => array( 'type' => 'string' ),
				'price'               => array( 'type' => array( 'number', 'string', 'null' ) ),
				'currency'            => array( 'type' => 'string' ),
				'url'                 => array( 'type' => 'string' ),
				'status'              => array(
					'type' => 'string',
					'enum' => ServiceEntity::statuses(),
				),
				'sort_order'          => array( 'type' => 'integer' ),
			)
		);
	}
}
