<?php
/**
 * Reviews REST controller.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Review\ReviewSync;
use FHINT\App\Review\Reviews as ReviewService;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * Reading stored Google reviews, and asking Google for fresh ones.
 *
 * The split matters: `GET /reviews` and `GET /reviews/state` read rows and
 * never touch the network, so a screen opens at the speed of the database.
 * Only `POST /reviews/sync` contacts Google, and only because somebody asked
 * it to.
 */
class Reviews extends AbstractController {

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
			'/reviews',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'location_name' => array(
								'type'    => 'string',
								'default' => '',
							),
							'unanswered'    => array(
								'type'    => 'boolean',
								'default' => false,
							),
							'per_page'      => array(
								'type'    => 'integer',
								'minimum' => 0,
								'maximum' => 100,
								'default' => 20,
							),
							'offset'        => array(
								'type'    => 'integer',
								'minimum' => 0,
								'default' => 0,
							),
						)
					),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/reviews/state',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_state' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'location_name' => array(
								'type'    => 'string',
								'default' => '',
							),
						)
					),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/reviews/sync',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'sync' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'location_name' => array(
								'type'    => 'string',
								'default' => '',
							),
						)
					),
				),
			)
		);
	}

	/**
	 * One page of stored reviews.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_items( $request ) {
		$listing = ReviewService::listing(
			array(
				'location_name' => (string) $request->get_param( 'location_name' ),
				'unanswered'    => (bool) $request->get_param( 'unanswered' ),
				'per_page'      => (int) $request->get_param( 'per_page' ),
				'offset'        => (int) $request->get_param( 'offset' ),
			)
		);

		return $this->envelope(
			$listing['items'],
			array( 'total' => $listing['total'] )
		);
	}

	/**
	 * Counts, average and the locations reviews exist for.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_state( $request ) {
		return $this->envelope( ReviewService::state( (string) $request->get_param( 'location_name' ) ) );
	}

	/**
	 * Ask Google for fresh reviews.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function sync( $request ) {
		$result = ReviewSync::run( (string) $request->get_param( 'location_name' ) );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return $this->envelope(
			$result,
			array( 'state' => ReviewService::state( (string) $request->get_param( 'location_name' ) ) )
		);
	}
}
