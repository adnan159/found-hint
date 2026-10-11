<?php
/**
 * Profile REST controller.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Core\ValidationResult;
use FHINT\App\Profile\Profile as ProfileService;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * The Business Profile screen: read whole, saved a section at a time.
 *
 * One `GET` paints the screen. Each card's Save button is one write naming
 * its section, so a write is always a single bounded unit — and the answer
 * to it is that section as it now reads, which spares the screen a refetch.
 *
 * Saving stores to this site only. Nothing here contacts Google.
 */
class Profile extends AbstractController {

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
			'/profile',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args( array( 'location_id' => self::location_arg() ) ),
				),
				array(
					'methods'             => 'POST, PUT, PATCH',
					'callback'            => array( $this, 'update_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'section'     => array(
								'type'     => 'string',
								'required' => true,
								'enum'     => array_keys( ProfileService::SECTIONS ),
							),
							'fields'      => array(
								'type'     => 'object',
								'required' => true,
							),
							'location_id' => self::location_arg(),
						)
					),
				),
			)
		);
	}

	/**
	 * The `location_id` every profile route accepts.
	 *
	 * @return array
	 */
	public static function location_arg() {
		return array(
			'type'    => 'integer',
			'default' => 0,
			'minimum' => 0,
		);
	}

	/**
	 * The whole profile.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_item( $request ) {
		$selected = ProfileService::select( (int) $request->get_param( 'location_id' ) );

		if ( is_wp_error( $selected ) ) {
			return $selected;
		}

		$profile = ProfileService::read();

		return $this->envelope( $profile['sections'], $profile['meta'] );
	}

	/**
	 * Save one section.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_item( $request ) {
		$selected = ProfileService::select( (int) $request->get_param( 'location_id' ) );

		if ( is_wp_error( $selected ) ) {
			return $selected;
		}

		$fields = $request->get_param( 'fields' );
		$result = ProfileService::save( (string) $request->get_param( 'section' ), is_array( $fields ) ? $fields : array() );

		if ( $result instanceof ValidationResult ) {
			return $this->validation_error( $result );
		}

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return $this->envelope(
			$result['data'],
			array_merge( array( 'section' => $result['section'] ), $result['meta'] )
		);
	}
}
