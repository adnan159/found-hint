<?php
/**
 * Shared REST controller behaviour.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Core\Capabilities;
use FHINT\App\Core\ValidationResult;
use FHINT\API as ApiModule;
use WP_Error;
use WP_REST_Controller;

defined( 'ABSPATH' ) || exit;

/**
 * Base for every controller in this namespace.
 *
 * Centralises three things that are easy to get subtly wrong per-route:
 * the permission check, the response envelope, and the shape of a
 * validation error.
 */
abstract class AbstractController extends WP_REST_Controller {

	/**
	 * Construct with this plugin's namespace.
	 */
	public function __construct() {
		$this->namespace = ApiModule::NAMESPACE_NAME . '/' . ApiModule::VERSION;
	}

	/**
	 * Whether the current user may use these routes.
	 *
	 * Returns a WP_Error rather than false so the client gets a code it can
	 * act on, and so a logged-out user is told to log in rather than being
	 * told they lack a capability they could never have.
	 *
	 * @return true|WP_Error
	 */
	public function permissions_check() {
		if ( ! is_user_logged_in() ) {
			return new WP_Error(
				'fhint_not_logged_in',
				__( 'You must be logged in to do that.', 'found-hint' ),
				array( 'status' => 401 )
			);
		}

		if ( ! Capabilities::current_user_can_manage() ) {
			return new WP_Error(
				'fhint_forbidden',
				__( 'You do not have permission to manage this.', 'found-hint' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	/**
	 * Wrap a payload in the standard envelope.
	 *
	 * @param mixed $data Response data.
	 * @param array $meta Extra information; omitted when empty.
	 * @param int   $status HTTP status.
	 * @return \WP_REST_Response
	 */
	protected function envelope( $data, array $meta = array(), $status = 200 ) {
		$body = array( 'data' => $data );

		if ( $meta ) {
			$body['meta'] = $meta;
		}

		$response = rest_ensure_response( $body );
		$response->set_status( $status );

		return $response;
	}

	/**
	 * Turn a failed validation into the documented error shape.
	 *
	 * Per-field machine codes travel to the client, which maps them to
	 * translated strings and attaches each to its own input. A single
	 * flattened sentence would make that impossible.
	 *
	 * @param ValidationResult $result Failed validation.
	 * @return WP_Error
	 */
	protected function validation_error( ValidationResult $result ) {
		return new WP_Error(
			'fhint_validation_failed',
			__( 'Some of the submitted values are not valid.', 'found-hint' ),
			array(
				'status' => 400,
				'fields' => $result->errors(),
			)
		);
	}

	/**
	 * A "no business profile yet" conflict.
	 *
	 * @return WP_Error
	 */
	protected function business_required() {
		return new WP_Error(
			'fhint_business_required',
			__( 'Create the business profile first.', 'found-hint' ),
			array( 'status' => 409 )
		);
	}

	/**
	 * A "not found" error for a resource.
	 *
	 * @param string $resource Resource name, e.g. 'location'.
	 * @return WP_Error
	 */
	protected function not_found( $resource ) {
		return new WP_Error(
			'fhint_' . $resource . '_not_found',
			__( 'That item could not be found.', 'found-hint' ),
			array( 'status' => 404 )
		);
	}

	/**
	 * A "the write failed" error.
	 *
	 * @return WP_Error
	 */
	protected function save_failed() {
		return new WP_Error(
			'fhint_save_failed',
			__( 'The changes could not be saved.', 'found-hint' ),
			array( 'status' => 500 )
		);
	}

	/**
	 * A plan-limit error.
	 *
	 * @param string $resource Resource name, e.g. 'location'.
	 * @param int    $limit    The limit that was hit.
	 * @return WP_Error
	 */
	protected function limit_reached( $resource, $limit ) {
		return new WP_Error(
			'fhint_' . $resource . '_limit_reached',
			sprintf(
				/* translators: %d: the maximum number allowed on this plan. */
				__( 'This plan allows up to %d of these.', 'found-hint' ),
				(int) $limit
			),
			array(
				'status' => 403,
				'limit' => (int) $limit,
			)
		);
	}

	/**
	 * Normalise an argument definition, guaranteeing a validate_callback.
	 *
	 * WordPress silently ignores `enum`, `minimum` and `type` on an argument
	 * that has no validate_callback — an out-of-range value would then be
	 * accepted with a 200 and quietly discarded on write. Injecting the
	 * default here means no route can forget it.
	 *
	 * @param array $args Argument definitions.
	 * @return array
	 */
	protected function args( array $args ) {
		foreach ( $args as $name => $definition ) {
			if ( ! isset( $definition['validate_callback'] ) ) {
				$args[ $name ]['validate_callback'] = 'rest_validate_request_arg';
			}

			if ( ! isset( $definition['sanitize_callback'] ) ) {
				$args[ $name ]['sanitize_callback'] = 'rest_sanitize_request_arg';
			}
		}

		return $args;
	}
}
