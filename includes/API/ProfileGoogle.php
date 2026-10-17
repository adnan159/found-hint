<?php
/**
 * Profile REST controller: what is read from, and sent as files to, Google.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Core\ValidationResult;
use FHINT\App\Google\Push\Publisher;
use FHINT\App\Media\MediaRepository;
use FHINT\App\Media\MediaUpload;
use FHINT\App\Profile\GoogleRefresh;
use FHINT\App\Profile\ListingOpener;
use FHINT\App\Profile\Profile as ProfileService;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * The parts of the profile that are not field saves.
 *
 * - `POST /profile/google/refresh` reads the listing's attributes and photos.
 * - `POST /profile/listing` gives a Google listing a location of its own.
 * - `POST /profile/media` keeps a chosen photo as waiting. It goes nowhere.
 * - `POST /profile/media/{id}/publish` sends one waiting photo to Google.
 * - `DELETE /profile/media/{id}` forgets a photo that has not been sent.
 *
 * Every one answers with the whole profile as it now reads, so the screen
 * repaints from one response.
 */
class ProfileGoogle extends AbstractController {

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
		$location = array( 'location_id' => Profile::location_arg() );

		register_rest_route(
			$this->namespace,
			'/profile/google/refresh',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'refresh' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args( $location ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/profile/listing',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'open_listing' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'location_name' => array(
								'type'        => 'string',
								'required'    => true,
								'description' => 'Google listing to open, e.g. locations/123.',
							),
						)
					),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/profile/media',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'add_photo' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array_merge(
							$location,
							array(
								'role' => array(
									'type'    => 'string',
									'default' => MediaRepository::ROLE_GALLERY,
									'enum'    => MediaRepository::roles(),
								),
							)
						)
					),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/profile/media/(?P<id>\d+)',
			array(
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'remove_photo' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args( $location ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/profile/media/(?P<id>\d+)/publish',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'publish_photo' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args( $location ),
				),
			)
		);
	}

	/**
	 * Read attributes and photos from Google.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function refresh( $request ) {
		$selected = ProfileService::select( (int) $request->get_param( 'location_id' ) );

		if ( is_wp_error( $selected ) ) {
			return $selected;
		}

		$report = GoogleRefresh::run();

		return is_wp_error( $report ) ? $report : $this->profile( array( 'refresh' => $report ) );
	}

	/**
	 * The location for a Google listing, created on first use.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function open_listing( $request ) {
		$result = ListingOpener::open( (string) $request->get_param( 'location_name' ) );

		return is_wp_error( $result ) ? $result : $this->envelope( $result );
	}

	/**
	 * Keep a chosen photo as waiting to be sent.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function add_photo( $request ) {
		$selected = ProfileService::select( (int) $request->get_param( 'location_id' ) );

		if ( is_wp_error( $selected ) ) {
			return $selected;
		}

		$location = ProfileService::ensure_location();

		if ( is_wp_error( $location ) ) {
			return $location;
		}

		$files  = $request->get_file_params();
		$result = MediaUpload::add(
			(int) $location['id'],
			(string) $request->get_param( 'role' ),
			isset( $files['file'] ) && is_array( $files['file'] ) ? $files['file'] : array()
		);

		if ( $result instanceof ValidationResult ) {
			return $this->validation_error( $result );
		}

		return is_wp_error( $result ) ? $result : $this->profile( array( 'photo' => (int) $result['id'] ) );
	}

	/**
	 * Forget a photo that has not been sent to Google.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function remove_photo( $request ) {
		$selected = ProfileService::select( (int) $request->get_param( 'location_id' ) );

		if ( is_wp_error( $selected ) ) {
			return $selected;
		}

		$location = ProfileService::location();
		$result   = MediaUpload::remove( (int) $request['id'], $location ? (int) $location['id'] : 0 );

		return is_wp_error( $result ) ? $result : $this->profile();
	}

	/**
	 * Send one waiting photo to Google.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function publish_photo( $request ) {
		$selected = ProfileService::select( (int) $request->get_param( 'location_id' ) );

		if ( is_wp_error( $selected ) ) {
			return $selected;
		}

		$ready = Publisher::ready();

		if ( is_wp_error( $ready ) ) {
			return $ready;
		}

		$location = ProfileService::location();
		$result   = MediaUpload::publish(
			(int) $request['id'],
			$location ? (int) $location['id'] : 0,
			$ready['location_name'],
			$ready['account_name']
		);

		return is_wp_error( $result ) ? $result : $this->profile( array( 'photo' => (int) $result['id'] ) );
	}

	/**
	 * The whole profile, for the screen to repaint from.
	 *
	 * @param array $extra Added to `meta`.
	 * @return \WP_REST_Response
	 */
	private function profile( array $extra = array() ) {
		$profile = ProfileService::read();

		return $this->envelope( $profile['sections'], array_merge( $profile['meta'], $extra ) );
	}
}
