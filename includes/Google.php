<?php
/**
 * Google module — dispatches the Business Profile connection.
 *
 * @package FoundHint
 */

namespace FHINT;

use FHINT\App\Google\Connection;
use FHINT\App\Google\GoogleLocationRepository;

defined( 'ABSPATH' ) || exit;

/**
 * A thin dispatcher, matching the other top-level modules.
 *
 * Registered unconditionally rather than under `is_admin()`: the OAuth
 * callback arrives at `admin-post.php`, and the token refresh that keeps a
 * connection alive has to be available to any request that needs it, not
 * only to a screen.
 */
class Google {

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		Connection::init();

		// A deleted location must not leave its Google profile looking
		// claimed — it would be unavailable to map anywhere else, with
		// nothing on screen explaining why.
		add_action( 'fhint_location_deleted', array( GoogleLocationRepository::class, 'release_for_location' ) );
	}
}
