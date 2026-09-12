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
 * The main plugin class.
 *
 * Singleton + hook-dispatch bootstrap:
 * - define_constants()  → sets all FHINT_* constants
 * - load_dependency()   → composer autoload + helpers + global hooks
 * - on_plugins_loaded() → fires the fhint_loaded action
 * - init_plugin()       → dispatch_hooks() wires every module
 *
 * dispatch_hooks() is the single source of truth for which top-level
 * modules exist. Each module (Database, API, Frontend, Admin) is a thin
 * dispatcher class with a static init() that wires its own hooks and
 * instantiates one class per sub-concern from the matching includes/
 * subdirectory. When adding a capability, add a class under the matching
 * includes/<Module>/ directory and register it in that parent dispatcher —
 * don't bolt more logic onto an unrelated existing class.
 */
final class FHINT {

	/**
	 * Singleton instance.
	 *
	 * @var self|false
	 */
	private static $instance = false;

	/**
	 * Build the plugin. Use init().
	 */
	private function __construct() {
		$this->define_constants();
		$this->load_dependency();

		register_activation_hook( __FILE__, array( $this, 'activate' ) );
		register_deactivation_hook( __FILE__, array( $this, 'deactivate' ) );

		add_action( 'plugins_loaded', array( $this, 'on_plugins_loaded' ) );
		add_action( 'fhint_loaded', array( $this, 'init_plugin' ) );
	}

	/**
	 * Singleton accessor.
	 *
	 * @return self
	 */
	public static function init() {
		if ( ! self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Define all plugin-wide constants.
	 *
	 * @return void
	 */
	public function define_constants() {
		define( 'FHINT_VERSION', '0.1.0' );
		define( 'FHINT_DB_VERSION', '0.1.0' );
		define( 'FHINT_MIN_PHP', '7.4' );
		define( 'FHINT_SETTINGS_NAME', 'fhint_settings' );
		define( 'FHINT_FILE', __FILE__ );
		define( 'FHINT_PLUGIN_SLUG', 'fhint' );
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
	public function load_dependency() {
		require_once FHINT_PATH . 'vendor/autoload.php';

		require_once FHINT_INCLUDES_PATH . 'functions.php';
		require_once FHINT_INCLUDES_PATH . 'hooks.php';
	}

	/**
	 * Fire the fhint_loaded action once every plugin is loaded, so add-ons
	 * can hook in before any module is dispatched.
	 *
	 * @return void
	 */
	public function on_plugins_loaded() {
		if ( ! $this->requirements_met() ) {
			add_action( 'admin_notices', array( $this, 'requirements_notice' ) );
			return;
		}

		do_action( 'fhint_loaded' );
	}

	/**
	 * Initialize the plugin — dispatches all modules.
	 *
	 * @return void
	 */
	public function init_plugin() {
		do_action( 'fhint_before_init' );

		$this->dispatch_hooks();

		do_action( 'fhint_init' );
	}

	/**
	 * Central dispatcher — wires every top-level module class.
	 *
	 * @return void
	 */
	public function dispatch_hooks() {
		FHINT\App\Core\Capabilities::init();
		FHINT\Installer::check_update();
		FHINT\Database::init();
		FHINT\API::init();
		FHINT\Frontend::init();

		if ( is_admin() ) {
			FHINT\Admin::init();
		}
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
	 * Runs on plugin activation — creates tables and seeds default options.
	 *
	 * DDL runs here and from Installer::check_update() on ordinary admin
	 * requests, never during a front-end render.
	 *
	 * @return void
	 */
	public function activate() {
		FHINT\Installer::init();

		update_option( 'fhint_required_rewrite_flush', 'yes' );
	}

	/**
	 * Runs on plugin deactivation. Removes scheduled work but never user data.
	 *
	 * @return void
	 */
	public function deactivate() {
		// Scheduled work must stop with the plugin; a leftover event would
		// fire against code that is no longer loaded.
		$timestamp = wp_next_scheduled( 'fhint_purge_logs' );

		if ( $timestamp ) {
			wp_unschedule_event( $timestamp, 'fhint_purge_logs' );
		}

		do_action( 'fhint_deactivated' );
	}
}

/**
 * Returns the main plugin instance.
 *
 * @return FHINT
 */
function fhint() {
	return FHINT::init();
}

// Kick off the plugin.
fhint();
