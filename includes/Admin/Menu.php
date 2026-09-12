<?php
/**
 * Admin menu registration.
 *
 * @package FoundHint
 */

namespace FHINT\Admin;

use FHINT\App\Core\Capabilities;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the single wp-admin menu page that mounts the React SPA.
 *
 * One real WordPress top-level page is registered; React Router's hash
 * router handles every sub-page client-side (see src/admin/routes.jsx).
 * See CLAUDE.md for why a single page plus a client router was chosen.
 *
 * Because the first submenu page shares the top-level slug, WordPress
 * assigns the hook suffix `toplevel_page_{SLUG}` — Enqueue relies on that
 * exact, well-known string rather than capturing a dynamic return value.
 *
 * The submenu list below is a placeholder shell reflecting the collapsed
 * sidebar IA in docs/NAVIGATION.md — wire real hash routes here as each
 * page lands in src/admin/pages/.
 */
class Menu {

	/**
	 * Top-level menu / page slug. Also the WP-assigned hook suffix's
	 * `toplevel_page_` suffix — see Enqueue::HOOK_SUFFIX.
	 */
	const SLUG = 'fhint';

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'register_menu' ) );
	}

	/**
	 * Add the top-level page and its (hash-routed) submenu entries.
	 *
	 * @return void
	 */
	public static function register_menu() {
		$capability = Capabilities::manage();

		add_menu_page(
			__( 'FoundHint', 'found-hint' ),
			__( 'FoundHint', 'found-hint' ),
			$capability,
			self::SLUG,
			array( __CLASS__, 'render_page' ),
			'dashicons-location-alt',
			58
		);

		add_submenu_page(
			self::SLUG,
			__( 'Dashboard', 'found-hint' ),
			__( 'Dashboard', 'found-hint' ),
			$capability,
			self::SLUG,
			array( __CLASS__, 'render_page' )
		);

		add_submenu_page(
			self::SLUG,
			__( 'Setup', 'found-hint' ),
			__( 'Setup', 'found-hint' ),
			$capability,
			self::SLUG . '#/setup',
			array( __CLASS__, 'render_page' )
		);

		add_submenu_page(
			self::SLUG,
			__( 'Business', 'found-hint' ),
			__( 'Business', 'found-hint' ),
			$capability,
			self::SLUG . '#/business',
			array( __CLASS__, 'render_page' )
		);

		add_submenu_page(
			self::SLUG,
			__( 'Locations', 'found-hint' ),
			__( 'Locations', 'found-hint' ),
			$capability,
			self::SLUG . '#/locations',
			array( __CLASS__, 'render_page' )
		);

		add_submenu_page(
			self::SLUG,
			__( 'Services', 'found-hint' ),
			__( 'Services', 'found-hint' ),
			$capability,
			self::SLUG . '#/services',
			array( __CLASS__, 'render_page' )
		);

		add_submenu_page(
			self::SLUG,
			__( 'Settings', 'found-hint' ),
			__( 'Settings', 'found-hint' ),
			$capability,
			self::SLUG . '#/settings',
			array( __CLASS__, 'render_page' )
		);
	}

	/**
	 * Render the single admin page — just the React mount point.
	 *
	 * @return void
	 */
	public static function render_page() {
		echo '<div id="fhint-app"></div>';
	}
}
