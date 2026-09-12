<?php
/**
 * Guided setup REST controller.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Onboarding\Onboarding as OnboardingState;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * GET|PUT /onboarding.
 *
 * **This route moves a position and nothing else.** The wizard saves a
 * business name by calling PUT /business, exactly as the Business screen
 * does. There is deliberately no write path for content here: a second one
 * would mean a second set of validation rules to keep in step, and it is
 * what would make "start over" able to destroy real work.
 */
class Onboarding extends AbstractController {

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
			'/onboarding',
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
					'args'                => $this->args(
						array(
							'action' => array(
								'type'     => 'string',
								'required' => true,
								'enum'     => array( 'go', 'complete', 'skip', 'finish', 'dismiss', 'restart' ),
							),
							'step'   => array(
								'type' => 'string',
								'enum' => OnboardingState::steps(),
							),
						)
					),
				),
			)
		);
	}

	/**
	 * Return the current position and per-step status.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_item( $request ) {
		return $this->envelope( OnboardingState::state() );
	}

	/**
	 * Move the position.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function update_item( $request ) {
		return $this->envelope(
			OnboardingState::apply(
				(string) $request->get_param( 'action' ),
				(string) $request->get_param( 'step' )
			)
		);
	}
}
