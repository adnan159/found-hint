<?php
/**
 * REST API module — dispatches all sub-controllers.
 *
 * @package FoundHint
 */

namespace FHINT;

use FHINT\API\Business;
use FHINT\API\Locations;
use FHINT\API\Services;
use FHINT\API\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Each sub-controller under includes/API/ extends AbstractController (itself
 * a WP_REST_Controller) and registers its own routes on rest_api_init from
 * its static init(). Namespace and version constants live here — reference
 * them rather than hardcoding route strings.
 *
 * Every route needs a real permission_callback backed by
 * App\Core\Capabilities::manage(), and every argument needs a
 * validate_callback; AbstractController::args() injects the default so a
 * route cannot silently accept an out-of-range value.
 */
class API {

	const NAMESPACE_NAME = 'fhint';
	const VERSION        = 'v1';

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		Business::init();
		Locations::init();
		Services::init();
		Settings::init();
	}
}
