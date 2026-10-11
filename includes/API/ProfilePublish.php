<?php
/**
 * Profile publish REST controller.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Google\Push\Plan;
use FHINT\App\Google\Push\Publisher;
use FHINT\App\Profile\Profile as ProfileService;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * Publishing the profile to Google, one request at a time.
 *
 * `POST /profile/publish/plan` reads the listing and answers with the steps a
 * publish would take. It is a POST although it writes nothing: it calls
 * Google, which costs a share of a quota every site using this plugin draws
 * on, so it must never be something a browser or a proxy feels free to repeat.
 *
 * `POST /profile/publish/step` runs one of those steps and is the only route
 * in this plugin that changes anything on Google. It must be given the
 * fingerprint the plan issued for that step.
 */
class ProfilePublish extends AbstractController {

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
			'/profile/publish/plan',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'plan' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args( array( 'location_id' => Profile::location_arg() ) ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/profile/publish/step',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'step' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'step'          => array(
								'type'     => 'string',
								'required' => true,
								'enum'     => array( Plan::STEP_LOCATION, Plan::STEP_ATTRIBUTES ),
							),
							'token'         => array(
								'type'     => 'string',
								'required' => true,
								'pattern'  => '^[a-f0-9]{32}$',
							),
							'validate_only' => array(
								'type'    => 'boolean',
								'default' => false,
							),
							'location_id'   => Profile::location_arg(),
						)
					),
				),
			)
		);
	}

	/**
	 * Run one step of a publish.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function step( $request ) {
		$selected = ProfileService::select( (int) $request->get_param( 'location_id' ) );

		if ( is_wp_error( $selected ) ) {
			return $selected;
		}

		$result = Publisher::step(
			(string) $request->get_param( 'step' ),
			(string) $request->get_param( 'token' ),
			(bool) $request->get_param( 'validate_only' )
		);

		return is_wp_error( $result ) ? $result : $this->envelope( $result );
	}

	/**
	 * What a publish would send, without sending it.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function plan( $request ) {
		$selected = ProfileService::select( (int) $request->get_param( 'location_id' ) );

		if ( is_wp_error( $selected ) ) {
			return $selected;
		}

		$plan = Publisher::plan();

		if ( is_wp_error( $plan ) ) {
			return $plan;
		}

		$listing = $plan['listing'];

		unset( $plan['listing'] );

		return $this->envelope( $plan, array( 'listing' => $listing ) );
	}
}
