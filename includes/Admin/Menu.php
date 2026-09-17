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
 * **One menu entry and no submenus.** Clicking FoundHint opens the
 * dashboard; every other screen is reached from the plugin's own sidebar,
 * which is a hash route inside the app (see src/admin/routes.jsx). A
 * WordPress submenu repeated that sidebar in a second place, and the two
 * lists had to be kept in step by hand every time a screen was added.
 *
 * `add_menu_page()` assigns the hook suffix `toplevel_page_{SLUG}` —
 * Enqueue relies on that exact, well-known string rather than capturing a
 * dynamic return value.
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
	 * Add the top-level page.
	 *
	 * Deliberately without `add_submenu_page()`: with no submenu registered,
	 * WordPress shows no flyout, and the menu item links straight to
	 * `admin.php?page=fhint`, which opens the dashboard.
	 *
	 * @return void
	 */
	public static function register_menu() {
		add_menu_page(
			__( 'FoundHint', 'found-hint' ),
			__( 'FoundHint', 'found-hint' ),
			Capabilities::manage(),
			self::SLUG,
			array( __CLASS__, 'render_page' ),
			self::menu_icon(),
			58
		);
	}

	/**
	 * The FoundHint mark, as a menu icon.
	 *
	 * Handed to WordPress as an SVG data URI that wraps the PNG, for two
	 * reasons. A plain image URL is rendered as an unsized `<img>`, so the
	 * icon would need admin CSS to shrink it — CSS this plugin is not allowed
	 * to load on every admin screen, and the menu appears on all of them. An
	 * SVG data URI instead gets WordPress's own `background-size: 20px auto`,
	 * so a 40px raster renders crisply at 20px on high-density displays with
	 * nothing extra loaded.
	 *
	 * WordPress's svg-painter recolours menu SVGs to the admin colour scheme
	 * by rewriting `fill` and `style` attributes. This SVG has neither — only
	 * an embedded image — so the brand colours are left alone.
	 *
	 * Falls back to a dashicon if the file is missing, rather than leaving
	 * the menu with an empty square.
	 *
	 * @return string
	 */
	public static function menu_icon() {
		$file = FHINT_PATH . 'assets/images/foundhint-menu-icon.png';

		if ( ! is_readable( $file ) ) {
			return 'dashicons-location-alt';
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local plugin file, not a remote request.
		$png = file_get_contents( $file );

		if ( false === $png || '' === $png ) {
			return 'dashicons-location-alt';
		}

		$svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" viewBox="0 0 40 40">'
			// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- encoding a bundled image for a data URI.
			. '<image width="40" height="40" xlink:href="data:image/png;base64,' . base64_encode( $png ) . '"/>'
			. '</svg>';

		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- WordPress requires menu SVGs as base64 data URIs.
		return 'data:image/svg+xml;base64,' . base64_encode( $svg );
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
