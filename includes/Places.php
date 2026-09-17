<?php
/**
 * Places module — dispatches the public-profile lookup.
 *
 * @package FoundHint
 */

namespace FHINT;

use FHINT\App\Places\PlaceLinkRepository;
use FHINT\App\Places\Retention;

defined( 'ABSPATH' ) || exit;

/**
 * A thin dispatcher, matching the other top-level modules.
 *
 * Registered unconditionally rather than under `is_admin()`: the retention
 * event that deletes expired coordinates runs on cron, which is not an
 * admin request, and a rule this plugin is obliged to keep must not depend
 * on somebody opening a screen.
 */
class Places {

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		Retention::init();
		Retention::schedule();

		// A deleted location must not leave a place id behind: nothing can
		// reach it from a screen again, so it would be storage nobody can
		// see or remove.
		add_action( 'fhint_location_deleted', array( PlaceLinkRepository::class, 'release_for_location' ) );
	}
}
