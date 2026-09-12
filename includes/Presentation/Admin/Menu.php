<?php
/**
 * Admin menu registration.
 *
 * @package FoundHint
 */

namespace FHINT\Presentation\Admin;

use FHINT\Infrastructure\WordPress\Capabilities;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the single wp-admin menu page that mounts the React SPA.
 *
 * One real WordPress top-level page is registered; React Router's hash
 * router handles every sub-page client-side (see src/admin/routes.jsx) —
 * this mirrors abandoned-cart-recovery-for-woocommerce's Admin/Menu.php,
 * a deliberate departure from local-seo's original "one real submenu page
 * per screen, no client router" rule. See CLAUDE.md for why.
 *
 * The submenu list below is a placeholder shell reflecting the collapsed
 * sidebar IA in docs/NAVIGATION.md — wire real hash routes here as each
 * page lands in src/admin/pages/.
 */
class Menu {

	/**
	 * Top-level menu / page slug.
	 */
	const SLUG = 'fhint';

	/**
	 * Hook suffix WordPress assigns the top-level page, captured on
	 * registration so Enqueue can gate assets to exactly this screen.
	 *
	 * @var string
	 */
	private $hook_suffix = '';

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
	}

	/**
	 * Add the top-level page and its (hash-routed) submenu entries.
	 *
	 * @return void
	 */
	public function register_menu() {
		$capability = Capabilities::manage();

		$this->hook_suffix = add_menu_page(
			__( 'FoundHint', 'found-hint' ),
			__( 'FoundHint', 'found-hint' ),
			$capability,
			self::SLUG,
			array( $this, 'render_page' ),
			'dashicons-location-alt',
			58
		);

		add_submenu_page(
			self::SLUG,
			__( 'Dashboard', 'found-hint' ),
			__( 'Dashboard', 'found-hint' ),
			$capability,
			self::SLUG,
			array( $this, 'render_page' )
		);

		add_submenu_page(
			self::SLUG,
			__( 'Business', 'found-hint' ),
			__( 'Business', 'found-hint' ),
			$capability,
			self::SLUG . '#/business',
			array( $this, 'render_page' )
		);

		add_submenu_page(
			self::SLUG,
			__( 'Locations', 'found-hint' ),
			__( 'Locations', 'found-hint' ),
			$capability,
			self::SLUG . '#/locations',
			array( $this, 'render_page' )
		);

		add_submenu_page(
			self::SLUG,
			__( 'Services', 'found-hint' ),
			__( 'Services', 'found-hint' ),
			$capability,
			self::SLUG . '#/services',
			array( $this, 'render_page' )
		);

		add_submenu_page(
			self::SLUG,
			__( 'Schema', 'found-hint' ),
			__( 'Schema', 'found-hint' ),
			$capability,
			self::SLUG . '#/schema',
			array( $this, 'render_page' )
		);

		add_submenu_page(
			self::SLUG,
			__( 'SEO Audit', 'found-hint' ),
			__( 'SEO Audit', 'found-hint' ),
			$capability,
			self::SLUG . '#/audit',
			array( $this, 'render_page' )
		);

		add_submenu_page(
			self::SLUG,
			__( 'Google Business Profile', 'found-hint' ),
			__( 'Google Business Profile', 'found-hint' ),
			$capability,
			self::SLUG . '#/gbp',
			array( $this, 'render_page' )
		);

		add_submenu_page(
			self::SLUG,
			__( 'Settings', 'found-hint' ),
			__( 'Settings', 'found-hint' ),
			$capability,
			self::SLUG . '#/settings',
			array( $this, 'render_page' )
		);
	}

	/**
	 * Render the single admin page — just the React mount point.
	 *
	 * @return void
	 */
	public function render_page() {
		echo '<div id="fhint-app"></div>';
	}

	/**
	 * Hook suffix of the top-level page, once registered.
	 *
	 * @return string
	 */
	public function hook_suffix() {
		return $this->hook_suffix;
	}
}
