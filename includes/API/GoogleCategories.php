<?php
/**
 * Google category search REST controller.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Google\Categories;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * Searching Google's Business Profile categories.
 *
 * Read-only, and it never contacts Google: the list ships with the plugin,
 * so the search answers at the speed of memory and works on a site that has
 * not connected an account yet.
 *
 * There is deliberately no write route here. A chosen category is saved on
 * the business itself, through `/business`, which is where it is validated
 * against this same list.
 */
class GoogleCategories extends AbstractController {

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
			'/google/categories',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'search'   => array(
								'type'      => 'string',
								'default'   => '',
								'maxLength' => 100,
							),
							'per_page' => array(
								'type'    => 'integer',
								'minimum' => 1,
								'maximum' => Categories::MAX_RESULTS,
								'default' => 20,
							),
							'offset'   => array(
								'type'    => 'integer',
								'minimum' => 0,
								'default' => 0,
							),
						)
					),
				),
			)
		);
	}

	/**
	 * Categories matching a search, best match first.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_items( $request ) {
		$result = Categories::search(
			(string) $request->get_param( 'search' ),
			(int) $request->get_param( 'per_page' ),
			(int) $request->get_param( 'offset' )
		);

		$list = Categories::meta();

		return $this->envelope(
			$result['items'],
			array(
				'total'          => $result['total'],
				'max_additional' => Categories::MAX_ADDITIONAL,
				'list'           => array(
					'count'   => $list['count'],
					'updated' => $list['updated'],
				),
			)
		);
	}
}
