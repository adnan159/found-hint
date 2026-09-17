<?php
/**
 * Schema REST controller.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Nap\Nap;
use FHINT\App\Schema\Graph;
use FHINT\App\Schema\Ownership;
use FHINT\App\Schema\SchemaCache;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * What this site would publish, and whether it is publishing it.
 *
 * Read-only on purpose. There is no write method because there is nothing
 * here to write: the markup is derived from the business, the location, its
 * hours and its services, and the way to change it is to change those. A
 * route that could edit the graph directly would be a second place where
 * `name` lives, which is the one thing the data model forbids.
 *
 * The mode — who publishes — is a setting, and is saved through
 * `/settings` like every other one.
 */
class Schema extends AbstractController {

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
			'/schema',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'location_id' => array(
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
	 * The graph, plus everything needed to explain it.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_item( $request ) {
		$location_id = (int) $request->get_param( 'location_id' );
		$nap         = Nap::resolve( $location_id );

		// Straight from the cache, so the preview is the same bytes the
		// front end publishes rather than a second rendering that could
		// quietly diverge from it.
		$graph = SchemaCache::graph( $location_id );

		return $this->envelope(
			$graph,
			array(
				'ownership'       => Ownership::status(),
				'is_publishable'  => Graph::is_publishable( $nap ),
				'blockers'        => Graph::blockers( $nap ),
				'recommendations' => Graph::recommendations( $nap ),
				'location_id'     => $location_id,
			)
		);
	}
}
