<?php
/**
 * Reviews REST controller.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Review\ReviewReply;
use FHINT\App\Review\ReviewSync;
use FHINT\App\Review\Reviews as ReviewService;
use FHINT\App\Core\ValidationResult;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * Reading stored Google reviews, and asking Google for fresh ones.
 *
 * The split matters: `GET /reviews` and `GET /reviews/state` read rows and
 * never touch the network, so a screen opens at the speed of the database.
 * Only `POST /reviews/sync` and the reply routes contact Google, and only
 * because somebody asked them to.
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
							'rating'        => array(
								'type'    => 'integer',
								'minimum' => 0,
								'maximum' => 5,
								'default' => 0,
							),
							'replied'       => array(
								'type'    => 'string',
								'enum'    => array( '', 'replied', 'not_replied' ),
								'default' => '',
							),
							'status'        => array(
								'type'    => 'string',
								'enum'    => array( '', 'all', 'live', 'edited', 'removed' ),
								'default' => '',
							),
							'search'        => array(
								'type'              => 'string',
								'maxLength'         => 200,
								'default'           => '',
								'sanitize_callback' => 'sanitize_text_field',
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

		register_rest_route(
			$this->namespace,
			// Google's review ids are URL-safe base64: letters, digits, - and _.
			'/reviews/(?P<review_id>[A-Za-z0-9_-]+)/reply',
			array(
				array(
					'methods'             => 'PUT',
					'callback'            => array( $this, 'save_reply' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'comment' => array(
								'type'              => 'string',
								'required'          => true,
								// Cleaned and checked by ReviewReply, so an empty or
								// over-long reply gets the per-field codes the form
								// attaches to its textarea.
								'sanitize_callback' => array( ReviewReply::class, 'sanitize' ),
							),
						)
					),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_reply' ),
					'permission_callback' => array( $this, 'permissions_check' ),
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
				'rating'        => (int) $request->get_param( 'rating' ),
				'replied'       => (string) $request->get_param( 'replied' ),
				'status'        => (string) $request->get_param( 'status' ),
				'search'        => (string) $request->get_param( 'search' ),
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

	/**
	 * Post or replace the owner's reply to a review, on Google.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function save_reply( $request ) {
		$result = ReviewReply::save( (string) $request['review_id'], $request->get_param( 'comment' ) );

		if ( $result instanceof ValidationResult ) {
			return $this->validation_error( $result );
		}

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return $this->envelope( $result, array( 'state' => ReviewService::state( $result['location_name'] ) ) );
	}

	/**
	 * Remove the owner's reply to a review, on Google.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function delete_reply( $request ) {
		$result = ReviewReply::delete( (string) $request['review_id'] );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return $this->envelope( $result, array( 'state' => ReviewService::state( $result['location_name'] ) ) );
	}
}
