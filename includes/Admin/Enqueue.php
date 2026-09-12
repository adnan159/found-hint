<?php
/**
 * Admin asset loading.
 *
 * @package FoundHint
 */

namespace FHINT\Admin;

use FHINT\App\Business\Business;
use FHINT\App\Location\Location;
use FHINT\App\Service\Service;
use FHINT\Libs\Assets;

defined( 'ABSPATH' ) || exit;

/**
 * Enqueues the admin-side React SPA bundle (Vite build) and its Tailwind CSS.
 *
 * Gated on the exact WP-assigned hook suffix for our own top-level page
 * (`toplevel_page_` . Menu::SLUG — the standard suffix WordPress assigns
 * when the first submenu shares the top-level slug, see Menu.php) so this
 * bundle never appears on any other admin page or the front end.
 * wp_localize_script exposes PHP data to the React app as window.FHINT,
 * read directly by src/admin/store/api/baseApi.js.
 */
class Enqueue {

	/**
	 * Script handle for the admin bundle.
	 */
	const SCRIPT_HANDLE = 'fhint-admin';

	/**
	 * Vite entry point for the admin SPA.
	 */
	const ENTRY = 'src/admin/main.jsx';

	/**
	 * window global the React app reads its bootstrap data from.
	 */
	const LOCALIZE_OBJ_NAME = 'FHINT';

	/**
	 * The hook suffix WordPress assigns our top-level page. Kept as a plain
	 * literal (matching Menu::SLUG) rather than a computed constant — PHP
	 * 7.4 constant expressions can't reliably reference another class's
	 * constant across files at compile time.
	 */
	const HOOK_SUFFIX = 'toplevel_page_fhint';

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
	}

	/**
	 * Enqueue the admin bundle, only on our own top-level page.
	 *
	 * @param string $hook_suffix Current admin page's hook suffix.
	 * @return void
	 */
	public static function enqueue( $hook_suffix ) {
		if ( self::HOOK_SUFFIX !== $hook_suffix ) {
			return;
		}

		Assets\enqueue_asset(
			FHINT_ASSETS_PATH . 'build/admin',
			self::ENTRY,
			self::script_options()
		);

		wp_localize_script( self::SCRIPT_HANDLE, self::LOCALIZE_OBJ_NAME, self::bootstrap_data() );

		if ( function_exists( 'wp_enqueue_media' ) ) {
			wp_enqueue_media();
		}
	}

	/**
	 * Vite asset registration options.
	 *
	 * @return array
	 */
	private static function script_options() {
		return array(
			'dependencies' => array( 'react', 'react-dom' ),
			'handle'       => self::SCRIPT_HANDLE,
			'in-footer'    => true,
		);
	}

	/**
	 * First-paint bootstrap data for the React app.
	 *
	 * Never put secrets here — it lands in page source.
	 *
	 * `reference` carries the option lists the forms need to render their
	 * selects. They live here rather than in a REST response because they
	 * are static for the request and the same on every screen, so shipping
	 * them with the page avoids a round trip before a form can paint. They
	 * must come from the server rather than being duplicated in JavaScript:
	 * the business type list is filterable (`fhint_business_types`), and a
	 * hardcoded copy would let the form offer a type the server rejects.
	 *
	 * @return array
	 */
	private static function bootstrap_data() {
		return array(
			'rest_url'   => rest_url( \FHINT\API::NAMESPACE_NAME . '/' . \FHINT\API::VERSION ),
			'rest_nonce' => wp_create_nonce( 'wp_rest' ),
			'plugin_url' => FHINT_URL,
			'version'    => FHINT_VERSION,
			'reference'  => array(
				'business_types'    => Business::types(),
				'location_statuses' => Location::statuses(),
				'service_statuses'  => Service::statuses(),
				'timezones'         => timezone_identifiers_list(),
				'currency'          => self::default_currency(),
			),
		);
	}

	/**
	 * A sensible default currency for new services.
	 *
	 * WordPress has no currency setting of its own, so this only offers a
	 * starting point the operator can change; the value is never forced.
	 *
	 * @return string
	 */
	private static function default_currency() {
		if ( function_exists( 'get_woocommerce_currency' ) ) {
			return (string) get_woocommerce_currency();
		}

		return '';
	}
}
