<?php
/**
 * Google Business Profile REST controller.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Google\Connection;
use FHINT\App\Google\Credentials;
use FHINT\App\Google\Mapping;
use FHINT\App\Google\Profiles;
use WP_Error;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * The connection's state, its credentials, and the two actions that start
 * and end it.
 *
 * **No route here returns a token or a client secret.** `GET /google`
 * reports whether a credential is stored and which account is connected;
 * the secret is write-only, and there is no route that reads it back. A
 * screen that can display a secret is a screen that publishes it to anyone
 * who can open the page or read the response in a browser's network panel.
 *
 * The connection itself is not completed over REST: Google redirects a
 * *browser*, so `POST /google/connect` returns a URL for the screen to send
 * the operator to, and the callback lands on `admin-post.php` where
 * `App\Google\Connection` handles it.
 */
class Google extends AbstractController {

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
			'/google',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'disconnect' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/google/credentials',
			array(
				array(
					'methods'             => 'POST, PUT, PATCH',
					'callback'            => array( $this, 'save_credentials' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'client_id'     => array(
								'type'        => 'string',
								'description' => 'OAuth client id. Send an empty string to keep the stored value.',
							),
							'client_secret' => array(
								'type'        => 'string',
								'description' => 'OAuth client secret. Write-only; send an empty string to keep the stored value.',
							),
						)
					),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/google/profiles',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_profiles' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
				// A sync is a POST because it calls Google and writes rows.
				// Doing that on the GET the screen makes on every visit would
				// put external HTTP on a render path and burn the project's
				// quota for nothing.
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'sync_profiles' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/google/mapping',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'map' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'location_name'     => array(
								'type'     => 'string',
								'required' => true,
							),
							'fhint_location_id' => array(
								'type'     => 'integer',
								'required' => true,
								'minimum'  => 1,
							),
						)
					),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'unmap' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'location_name' => array(
								'type'     => 'string',
								'required' => true,
							),
						)
					),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/google/connect',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'connect' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
			)
		);
	}

	/**
	 * Report the connection state.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_item( $request ) {
		return $this->envelope( Connection::state() );
	}

	/**
	 * Store the OAuth client credentials.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public function save_credentials( $request ) {
		$client_id     = (string) $request->get_param( 'client_id' );
		$client_secret = (string) $request->get_param( 'client_secret' );

		Credentials::save( $client_id, $client_secret );

		if ( ! Credentials::configured() ) {
			return new WP_Error(
				'fhint_google_credentials_incomplete',
				__( 'Both the client id and the client secret are needed.', 'found-hint' ),
				array( 'status' => 400 )
			);
		}

		return $this->envelope( Connection::state() );
	}

	/**
	 * Begin a connection.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public function connect( $request ) {
		$url = Connection::start();

		if ( is_wp_error( $url ) ) {
			return $url;
		}

		// The screen sends the browser here; it is not followed server-side.
		return $this->envelope( array( 'authorize_url' => $url ) );
	}

	/**
	 * The stored profiles and the mapping between them and our locations.
	 *
	 * Reads what was last stored. It never calls Google — see the route
	 * registration for why.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_profiles( $request ) {
		return $this->envelope( Mapping::overview() );
	}

	/**
	 * Read Google again and store what comes back.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public function sync_profiles( $request ) {
		$result = Profiles::sync();

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return $this->envelope( Mapping::overview(), $result );
	}

	/**
	 * Link a Google location to one of ours.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public function map( $request ) {
		$result = Mapping::map(
			(string) $request->get_param( 'location_name' ),
			(int) $request->get_param( 'fhint_location_id' )
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return $this->envelope( $result );
	}

	/**
	 * Release a link.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function unmap( $request ) {
		return $this->envelope( Mapping::unmap( (string) $request->get_param( 'location_name' ) ) );
	}

	/**
	 * End the connection.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function disconnect( $request ) {
		$result = Connection::disconnect();

		return $this->envelope( $result['state'], array( 'revoked' => $result['revoked'] ) );
	}
}
