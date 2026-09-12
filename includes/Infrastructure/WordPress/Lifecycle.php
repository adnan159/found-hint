<?php
/**
 * Activation and deactivation routines.
 *
 * @package FoundHint
 */

namespace FHINT\Infrastructure\WordPress;

defined( 'ABSPATH' ) || exit;

/**
 * Handles what happens when the plugin is switched on and off.
 *
 * Kept free of container access: activation runs in a bare request where the
 * rest of the plugin has not necessarily booted (found-hint.php requires
 * this class directly, before Plugin::boot() ever runs).
 *
 * Scaffold only. Once includes/Infrastructure/Database/Installer.php exists
 * (mirroring local-seo's dbDelta-based installer — see DATABASE rules in
 * CLAUDE.md), call it from activate(): DDL must run on activation or
 * admin_init, never on a front-end request.
 */
final class Lifecycle {

	/**
	 * Option holding the installed plugin version.
	 */
	const VERSION_OPTION = 'fhint_version';

	/**
	 * Option holding the first-install timestamp.
	 */
	const INSTALLED_OPTION = 'fhint_installed_at';

	/**
	 * Run on plugin activation.
	 *
	 * @return void
	 */
	public static function activate() {
		if ( ! get_option( self::INSTALLED_OPTION ) ) {
			add_option( self::INSTALLED_OPTION, time() );
		}

		$previous = get_option( self::VERSION_OPTION );

		update_option( self::VERSION_OPTION, FHINT_VERSION );

		// TODO: ( new \FHINT\Infrastructure\Database\Installer() )->install();
		// installed directly rather than through a hook — on activation the
		// plugin file loads after plugins_loaded, so no provider has booted
		// and no listener would be attached yet.

		/**
		 * Fires on activation, after the version option is written.
		 *
		 * Database installation and migrations hook in here.
		 *
		 * @param string       $version  Version now installed.
		 * @param string|false $previous Version previously installed, or false on a fresh install.
		 */
		do_action( 'fhint_activated', FHINT_VERSION, $previous );

		flush_rewrite_rules();
	}

	/**
	 * Run on plugin deactivation.
	 *
	 * Removes scheduled work but never touches user data.
	 *
	 * @return void
	 */
	public static function deactivate() {
		/**
		 * Fires on deactivation, before rewrite rules are flushed.
		 */
		do_action( 'fhint_deactivated' );

		flush_rewrite_rules();
	}

	/**
	 * The installed version, which can lag behind the code during an update.
	 *
	 * @return string
	 */
	public static function installed_version() {
		return (string) get_option( self::VERSION_OPTION, '' );
	}
}
