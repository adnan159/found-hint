<?php
/**
 * Plugin Name:       FoundHint
 * Plugin URI:        https://www.foundhint.com/
 * Description:       Local SEO command center — business profile, locations, schema, audits, Google Business Profile and ranking, all from one place.
 * Version:           0.1.0
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            FoundHint
 * Author URI:        https://www.foundhint.com/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       found-hint
 * Domain Path:       /languages
 *
 * @package FoundHint
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Bootstraps FoundHint.
 *
 * Structure mirrors two sibling plugins on purpose:
 * - the LAYERING (Domain → Application → Infrastructure/Presentation,
 *   extension registries, container, service providers) is carried over
 *   from the `local-seo` plugin's src/ tree, now rooted at includes/.
 * - the TOOLING and admin FRONTEND (Composer PSR-4 + PHPCS, Vite + React +
 *   Redux Toolkit + shadcn/ui SPA with client-side routing) is carried over
 *   from `abandoned-cart-recovery-for-woocommerce`.
 *
 * See CLAUDE.md for the full rationale and the conventions that apply here.
 */
final class FHINT {

	/**
	 * Singleton instance.
	 *
	 * @var self|null
	 */
	private static $instance = null;

	/**
	 * Build the bootstrapper. Use instance().
	 */
	private function __construct() {
		$this->define_constants();
		$this->load_dependencies();

		register_activation_hook( __FILE__, array( $this, 'activate' ) );
		register_deactivation_hook( __FILE__, array( $this, 'deactivate' ) );

		add_action( 'plugins_loaded', array( $this, 'on_plugins_loaded' ) );
	}

	/**
	 * Singleton accessor.
	 *
	 * @return self
	 */
	public static function init() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Define all plugin-wide constants.
	 *
	 * @return void
	 */
	private function define_constants() {
		define( 'FHINT_VERSION', '0.1.0' );
		define( 'FHINT_DB_VERSION', '0.1.0' );
		define( 'FHINT_MIN_PHP', '7.4' );
		define( 'FHINT_FILE', __FILE__ );
		define( 'FHINT_BASENAME', plugin_basename( __FILE__ ) );
		define( 'FHINT_PATH', plugin_dir_path( __FILE__ ) );
		define( 'FHINT_INCLUDES_PATH', FHINT_PATH . 'includes/' );
		define( 'FHINT_ASSETS_PATH', FHINT_PATH . 'assets/' );
		define( 'FHINT_URL', plugin_dir_url( __FILE__ ) );
		define( 'FHINT_ASSETS_URL', FHINT_URL . 'assets/' );
	}

	/**
	 * Composer autoload + non-class helpers + global hook wiring.
	 *
	 * @return void
	 */
	private function load_dependencies() {
		require_once FHINT_PATH . 'vendor/autoload.php';

		require_once FHINT_INCLUDES_PATH . 'functions.php';
		require_once FHINT_INCLUDES_PATH . 'hooks.php';
	}

	/**
	 * Boot the plugin once WordPress and every other plugin has loaded.
	 *
	 * @return void
	 */
	public function on_plugins_loaded() {
		if ( ! $this->requirements_met() ) {
			add_action( 'admin_notices', array( $this, 'requirements_notice' ) );
			return;
		}

		\FHINT\Plugin::instance()->boot();
	}

	/**
	 * Whether the environment can run the plugin.
	 *
	 * @return bool
	 */
	private function requirements_met() {
		return version_compare( PHP_VERSION, FHINT_MIN_PHP, '>=' );
	}

	/**
	 * Explain why the plugin did not boot.
	 *
	 * @return void
	 */
	public function requirements_notice() {
		printf(
			'<div class="notice notice-error"><p>%s</p></div>',
			esc_html(
				sprintf(
					/* translators: 1: required PHP version, 2: current PHP version */
					__( 'FoundHint requires PHP %1$s or higher. This site is running PHP %2$s.', 'found-hint' ),
					FHINT_MIN_PHP,
					PHP_VERSION
				)
			)
		);
	}

	/**
	 * Runs on plugin activation.
	 *
	 * DDL never runs on a front-end request — activation and admin_init are
	 * the only two places it may run. See includes/Infrastructure/WordPress/
	 * Lifecycle.php once it exists.
	 *
	 * @return void
	 */
	public function activate() {
		if ( class_exists( '\FHINT\Infrastructure\WordPress\Lifecycle' ) ) {
			\FHINT\Infrastructure\WordPress\Lifecycle::activate();
		}
	}

	/**
	 * Runs on plugin deactivation.
	 *
	 * @return void
	 */
	public function deactivate() {
		if ( class_exists( '\FHINT\Infrastructure\WordPress\Lifecycle' ) ) {
			\FHINT\Infrastructure\WordPress\Lifecycle::deactivate();
		}
	}
}

/**
 * Returns the main plugin bootstrapper.
 *
 * For resolving application services once booted, prefer fhint_plugin()
 * (defined in includes/functions.php) which returns \FHINT\Plugin.
 *
 * @return FHINT
 */
function fhint() {
	return FHINT::init();
}

fhint();
