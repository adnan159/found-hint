<?php
/**
 * Admin asset loading.
 *
 * @package FoundHint
 */

namespace FHINT\Presentation\Admin;

use FHINT\Libs\Assets;

defined( 'ABSPATH' ) || exit;

/**
 * Enqueues the admin-side React SPA bundle (Vite build) and its Tailwind CSS.
 *
 * Gated on the exact hook suffix WordPress assigned our own top-level page
 * (captured by Menu::register_menu()) — per the "assets load on our screens
 * only" rule, this bundle must never appear on any other admin page or on
 * the front end. wp_localize_script exposes PHP data to the React app as
 * window.FHINT, read directly by src/admin/store/api/baseApi.js.
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
	 * @var Menu
	 */
	private $menu;

	/**
	 * @param Menu $menu Admin menu, used to gate assets to our own screen.
	 */
	public function __construct( Menu $menu ) {
		$this->menu = $menu;
	}

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
	}

	/**
	 * Enqueue the admin bundle, only on our own top-level page.
	 *
	 * @param string $hook_suffix Current admin page's hook suffix.
	 * @return void
	 */
	public function enqueue( $hook_suffix ) {
		if ( '' === $this->menu->hook_suffix() || $hook_suffix !== $this->menu->hook_suffix() ) {
			return;
		}

		Assets\enqueue_asset(
			FHINT_ASSETS_PATH . 'build/admin',
			self::ENTRY,
			$this->script_options()
		);

		wp_localize_script( self::SCRIPT_HANDLE, self::LOCALIZE_OBJ_NAME, $this->bootstrap_data() );

		if ( function_exists( 'wp_enqueue_media' ) ) {
			wp_enqueue_media();
		}
	}

	/**
	 * Vite asset registration options.
	 *
	 * @return array
	 */
	private function script_options() {
		return array(
			'dependencies' => array( 'react', 'react-dom' ),
			'handle'       => self::SCRIPT_HANDLE,
			'in-footer'    => true,
		);
	}

	/**
	 * First-paint bootstrap data for the React app.
	 *
	 * Never put secrets here — it lands in page source. Extend this array as
	 * new pages need bootstrap data (business/location ids, limits, etc.).
	 *
	 * @return array
	 */
	private function bootstrap_data() {
		return array(
			'rest_url'   => rest_url( 'fhint/v1' ),
			'rest_nonce' => wp_create_nonce( 'wp_rest' ),
			'plugin_url' => FHINT_URL,
			'version'    => FHINT_VERSION,
		);
	}
}
