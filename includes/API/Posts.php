<?php
/**
 * Posts REST controller.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Core\ValidationResult;
use FHINT\App\Post\PostMedia;
use FHINT\App\Post\PostSync;
use FHINT\App\Post\PostValidator;
use FHINT\App\Post\Posts as PostService;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * Google Business Profile posts: the stored list, and the writes that
 * reach Google.
 *
 * Reads (`GET /posts`, `/posts/state`, `/posts/photos`) never touch the
 * network. `POST /posts/sync` reads from Google; creating, publishing,
 * editing and deleting write to it, and need Google connected.
 */
class Posts extends AbstractController {

	/** The fields a post request may carry. */
	const FIELDS = array( 'topic_type', 'title', 'summary', 'cta_type', 'cta_url', 'starts_at', 'ends_at', 'coupon_code', 'redeem_url', 'terms', 'media_url', 'attachment_id', 'source', 'source_ref' );

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
		$location = array(
			'location_name' => array(
				'type'    => 'string',
				'default' => '',
			),
		);

		register_rest_route(
			$this->namespace,
			'/posts',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array_merge(
							$location,
							array(
								'type'     => array(
									'type'    => 'string',
									'enum'    => array( '', 'update', 'event', 'offer' ),
									'default' => '',
								),
								'status'   => array(
									'type'    => 'string',
									'enum'    => array( '', 'live', 'draft', 'scheduled', 'failed' ),
									'default' => '',
								),
								'source'   => array(
									'type'              => 'string',
									'default'           => '',
									'sanitize_callback' => 'sanitize_key',
								),
								'days'     => array(
									'type'    => 'integer',
									'enum'    => array( 0, 7, 30, 90 ),
									'default' => 0,
								),
								'sort'     => array(
									'type'    => 'string',
									'enum'    => array( 'new', 'old' ),
									'default' => 'new',
								),
								'per_page' => array(
									'type'    => 'integer',
									'minimum' => 0,
									'maximum' => 100,
									'default' => 10,
								),
								'offset'   => array(
									'type'    => 'integer',
									'minimum' => 0,
									'default' => 0,
								),
							)
						)
					),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_item' ),
					'permission_callback' => array( $this, 'google_write_check' ),
					'args'                => $this->args( array_merge( $location, $this->field_args() ) ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/posts/state',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_state' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args( $location ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/posts/photos',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_photos' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args( $location ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/posts/media',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'upload_media' ),
					// On a site Google cannot reach, the photo goes on the
					// listing: a write to Google.
					'permission_callback' => array( $this, 'google_write_check' ),
					'args'                => $this->args( $location ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/posts/sync',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'sync' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args( $location ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/posts/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'PUT',
					'callback'            => array( $this, 'update_item' ),
					'permission_callback' => array( $this, 'google_write_check' ),
					'args'                => $this->args( $this->field_args() ),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/posts/(?P<id>\d+)/publish',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'publish_item' ),
					'permission_callback' => array( $this, 'google_write_check' ),
				),
			)
		);
	}

	/**
	 * The post fields, as request args. Cleaned and checked field by field
	 * in PostValidator, which is what gives the form its per-field codes.
	 *
	 * @return array
	 */
	private function field_args() {
		$args = array(
			'publish' => array(
				'type'    => 'boolean',
				'default' => false,
			),
		);

		foreach ( self::FIELDS as $field ) {
			$args[ $field ] = 'attachment_id' === $field
				? array(
					'type'    => 'integer',
					'minimum' => 0,
				)
				: array(
					'type'              => 'string',
					// Cleaned in PostValidator::sanitize(), field by field.
					'sanitize_callback' => array( __CLASS__, 'raw' ),
				);
		}

		return $args;
	}

	/**
	 * Leave a field as sent for PostValidator to clean: a generic sanitiser
	 * here would turn "not a link" into a link before it could be refused.
	 *
	 * @param mixed $value Value.
	 * @return string
	 */
	public static function raw( $value ) {
		return is_scalar( $value ) ? (string) $value : '';
	}

	/**
	 * The post fields a request carried.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return array
	 */
	private function fields( $request ) {
		$params = $request->get_params();

		return array_intersect_key( $params, array_flip( self::FIELDS ) );
	}

	/**
	 * One page of stored posts.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_items( $request ) {
		$source = (string) $request->get_param( 'source' );

		$listing = PostService::listing(
			array(
				'location_name' => (string) $request->get_param( 'location_name' ),
				'topic_type'    => (string) $request->get_param( 'type' ),
				'status'        => (string) $request->get_param( 'status' ),
				'source'        => in_array( $source, PostValidator::sources(), true ) ? $source : '',
				'days'          => (int) $request->get_param( 'days' ),
				'sort'          => (string) $request->get_param( 'sort' ),
				'per_page'      => (int) $request->get_param( 'per_page' ),
				'offset'        => (int) $request->get_param( 'offset' ),
			)
		);

		return $this->envelope(
			$listing['items'],
			array(
				'total'  => $listing['total'],
				'counts' => $listing['counts'],
			)
		);
	}

	/**
	 * Everything the screen needs besides the list.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_state( $request ) {
		return $this->envelope( PostService::state( (string) $request->get_param( 'location_name' ) ) );
	}

	/**
	 * Photos already on Google a post can use.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_photos( $request ) {
		return $this->envelope( PostMedia::choices( (string) $request->get_param( 'location_name' ) ) );
	}

	/**
	 * Add a photo to the media library for a post.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function upload_media( $request ) {
		$files  = $request->get_file_params();
		$result = PostMedia::upload(
			isset( $files['file'] ) && is_array( $files['file'] ) ? $files['file'] : array(),
			(string) $request->get_param( 'location_name' )
		);

		if ( $result instanceof ValidationResult ) {
			return $this->validation_error( $result );
		}

		return is_wp_error( $result ) ? $result : $this->envelope( $result, array(), 201 );
	}

	/**
	 * Read a location's posts from Google.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function sync( $request ) {
		$result = PostSync::run( (string) $request->get_param( 'location_name' ) );

		return is_wp_error( $result ) ? $result : $this->envelope( $result );
	}

	/**
	 * Write a new post.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create_item( $request ) {
		return $this->answer(
			PostService::create( (string) $request->get_param( 'location_name' ), $this->fields( $request ), (bool) $request->get_param( 'publish' ) ),
			201
		);
	}

	/**
	 * Change a post.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_item( $request ) {
		return $this->answer( PostService::update( (int) $request['id'], $this->fields( $request ), (bool) $request->get_param( 'publish' ) ) );
	}

	/**
	 * Send a draft, or retry a failed post.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function publish_item( $request ) {
		return $this->answer( PostService::publish( (int) $request['id'] ) );
	}

	/**
	 * Delete a post.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function delete_item( $request ) {
		$result = PostService::delete( (int) $request['id'] );

		return is_wp_error( $result ) ? $result : $this->envelope( array( 'deleted' => true ) );
	}

	/**
	 * A service result as a response.
	 *
	 * @param mixed $result Post, ValidationResult or WP_Error.
	 * @param int   $status Status on success.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function answer( $result, $status = 200 ) {
		if ( $result instanceof ValidationResult ) {
			return $this->validation_error( $result );
		}

		return is_wp_error( $result ) ? $result : $this->envelope( $result, array(), $status );
	}
}
