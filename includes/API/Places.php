<?php
/**
 * Places REST controller.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Places\Credentials;
use FHINT\App\Places\Lookup;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * Finding the site's business on Google, without anybody signing in.
 *
 * This is the Places API, not the Business Profile API: it reads what any
 * member of the public can see on Google Maps, so it needs an API key and
 * no OAuth. It can never write to a listing, and it never imports one —
 * Google's terms forbid storing what it returns beyond a place id and
 * coordinates.
 *
 * **Every route that calls Google is a POST, including the ones that only
 * read.** A GET the screen makes on arrival would put an external request
 * on a render path and spend the project's quota for anyone who opens a
 * tab. `GET /places` is the exception precisely because it calls nobody.
 *
 * No route returns the API key. `GET /places` reports whether one is stored
 * and an unusable fragment of it; there is no route that reads it back.
 */
class Places extends AbstractController {

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
			'/places',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/places/key',
			array(
				array(
					'methods'             => 'POST, PUT, PATCH',
					'callback'            => array( $this, 'save_key' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'api_key' => array(
								'type'        => 'string',
								'required'    => true,
								'description' => 'Google Maps Platform API key. Write-only.',
							),
						)
					),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_key' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/places/search',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'search' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'query' => array(
								'type'        => 'string',
								'required'    => true,
								'description' => 'What to search Google for.',
							),
						)
					),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/places/link',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'link' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'place_id' => array(
								'type'        => 'string',
								'required'    => true,
								'description' => 'Google place id, from a search result.',
							),
						)
					),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'unlink' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/places/live',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'live' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
			)
		);
	}

	/**
	 * Whether a key is stored, and what is linked.
	 *
	 * Calls nobody.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_item( $request ) {
		return $this->envelope( Lookup::state() );
	}

	/**
	 * Store the API key.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function save_key( $request ) {
		Credentials::save( (string) $request->get_param( 'api_key' ) );

		if ( ! Credentials::configured() ) {
			return new \WP_Error(
				'fhint_places_key_required',
				__( 'Paste the API key from your Google Cloud project.', 'found-hint' ),
				array( 'status' => 400 )
			);
		}

		return $this->envelope( Lookup::state() );
	}

	/**
	 * Forget the API key.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function delete_key( $request ) {
		Credentials::clear();

		return $this->envelope( Lookup::state() );
	}

	/**
	 * Search Google for candidate places.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function search( $request ) {
		$result = Lookup::search( (string) $request->get_param( 'query' ) );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return $this->envelope( $result );
	}

	/**
	 * Link the primary location to a place.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function link( $request ) {
		$result = Lookup::link( (string) $request->get_param( 'place_id' ) );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return $this->envelope( $result );
	}

	/**
	 * Remove the link.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function unlink( $request ) {
		return $this->envelope( Lookup::unlink() );
	}

	/**
	 * Read the linked place now and compare it with this site's data.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function live( $request ) {
		$result = Lookup::live();

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return $this->envelope( $result );
	}
}
