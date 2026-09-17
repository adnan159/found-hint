<?php
/**
 * Frontend module — dispatches all public-facing sub-classes.
 *
 * @package FoundHint
 */

namespace FHINT;

defined( 'ABSPATH' ) || exit;

/**
 * Everything registered here runs on public requests — keep it minimal
 * and fast. No external HTTP, no audits, no DDL. Add one
 * `SubClass::init();` line per handler as it's built (schema output on
 * wp_head, blocks rendering, etc.).
 */
class Frontend {

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		Frontend\Schema::init();
	}
}
