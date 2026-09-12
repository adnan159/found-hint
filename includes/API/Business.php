<?php
/**
 * Business REST controller.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Business\Business as BusinessEntity;
use FHINT\App\Business\BusinessRepository;
use FHINT\App\Core\Limits;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * GET /business  — the profile, or null on a site that has none yet.
 * PUT /business  — partial update; creates the profile on first save.
 */
class Business extends AbstractController {

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
			'/business',
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
					'args'                => $this->write_args(),
				),
			)
		);
	}

	/**
	 * Return the profile.
	 *
	 * A fresh install having no business is a normal state, so this answers
	 * with data: null and meta.exists: false rather than a 404 — a 404 would
	 * make every client treat "new site" as an error case.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_item( $request ) {
		$business = BusinessRepository::get();

		return $this->envelope(
			$business ? $this->prepare( $business ) : null,
			array(
				'exists' => (bool) $business,
				'limits' => array(
					'locations' => Limits::report( Limits::LOCATIONS, \FHINT\App\Location\LocationRepository::count() ),
					'services'  => Limits::report( Limits::SERVICES, \FHINT\App\Service\ServiceRepository::count() ),
				),
			)
		);
	}

	/**
	 * Create or update the profile.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_item( $request ) {
		$existed = BusinessRepository::exists();
		$changes = BusinessEntity::sanitize( $this->body( $request ) );

		$current = BusinessRepository::get();
		$merged  = array_merge( $current ? $current : BusinessEntity::blank(), $changes );

		$validation = BusinessEntity::validate( $merged );

		if ( ! $validation->is_valid() ) {
			return $this->validation_error( $validation );
		}

		$saved = BusinessRepository::save( $changes );

		if ( ! $saved ) {
			return $this->save_failed();
		}

		return $this->envelope(
			$this->prepare( $saved ),
			array( 'exists' => true ),
			$existed ? 200 : 201
		);
	}

	/**
	 * The request body, preferring JSON.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return array
	 */
	private function body( $request ) {
		$json = $request->get_json_params();

		return is_array( $json ) && $json ? $json : (array) $request->get_params();
	}

	/**
	 * Shape a record for the response.
	 *
	 * @param array $business Stored record.
	 * @return array
	 */
	private function prepare( array $business ) {
		$business['completeness'] = BusinessEntity::completeness( $business );

		// Always an object, never an array, so the JSON shape does not change
		// between "no profiles" and "some profiles".
		$business['social_profiles']      = (object) $business['social_profiles'];
		$business['secondary_categories'] = array_values( $business['secondary_categories'] );

		return $business;
	}

	/**
	 * Writable argument definitions.
	 *
	 * @return array
	 */
	private function write_args() {
		return $this->args(
			array(
				'name'                 => array( 'type' => 'string' ),
				'legal_name'           => array( 'type' => 'string' ),
				'business_type'        => array( 'type' => 'string' ),
				'primary_category'     => array( 'type' => 'string' ),
				'secondary_categories' => array( 'type' => array( 'array', 'string' ) ),
				'description'          => array( 'type' => 'string' ),
				'logo_attachment_id'   => array(
					'type' => 'integer',
					'minimum' => 0,
				),
				'logo_url'             => array( 'type' => 'string' ),
				'phone'                => array( 'type' => 'string' ),
				'email'                => array( 'type' => 'string' ),
				'website'              => array( 'type' => 'string' ),
				'price_range'          => array( 'type' => 'string' ),
				'founding_date'        => array( 'type' => 'string' ),
				'social_profiles'      => array( 'type' => 'object' ),
			)
		);
	}
}
