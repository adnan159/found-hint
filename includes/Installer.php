<?php
/**
 * Activation and version-gated migrations.
 *
 * @package FoundHint
 */

namespace FHINT;

use FHINT\App\Core\Settings;
use FHINT\Database\Tables;

defined( 'ABSPATH' ) || exit;

/**
 * Handles plugin activation, DB table creation, and version upgrades.
 *
 * init() is the full activation routine, called once from
 * register_activation_hook in found-hint.php. check_update() is a
 * lightweight version check called from FHINT::dispatch_hooks() that
 * re-runs dbDelta when the stored version differs from the running one —
 * this is how a schema change reaches sites that update by file
 * replacement, which never fires the activation hook at all.
 *
 * DDL only ever runs from these two entry points — activation and this
 * version check on ordinary requests — never during a front-end render.
 */
class Installer {

	/**
	 * Full activation routine — runs once on plugin activation.
	 *
	 * @return void
	 */
	public static function init() {
		Database::create_tables();
		self::save_default_settings();
		self::save_version();
	}

	/**
	 * Lightweight version check, called from FHINT::dispatch_hooks().
	 * Re-runs dbDelta if the stored version differs from the current one,
	 * so a schema change ships safely to sites that update rather than
	 * reactivate.
	 *
	 * Deliberately gated rather than running on every request: DDL must
	 * never run on a front-end request, or a traffic burst against a stale
	 * version option would have every concurrent visitor racing dbDelta.
	 * Admin, cron and WP-CLI are the only contexts allowed to migrate. The
	 * guard lives here rather than at the call site so no future caller can
	 * bypass it.
	 *
	 * @return void
	 */
	public static function check_update() {
		if ( ! self::may_run_ddl() ) {
			return;
		}

		// A version bump is the usual trigger, but a missing table is the
		// one that matters most: a plugin updated by file replacement never
		// fires activation, and a half-restored backup can lose a table
		// without changing the version option. Both self-repair here.
		if ( get_option( 'fhint_version' ) !== FHINT_VERSION || Tables::missing() ) {
			self::init();
		}

		self::maybe_run_migrations();
	}

	/**
	 * Whether the current request is allowed to run schema changes.
	 *
	 * @return bool
	 */
	private static function may_run_ddl() {
		if ( is_admin() ) {
			return true;
		}

		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			return true;
		}

		return function_exists( 'wp_doing_cron' ) && wp_doing_cron();
	}

	/**
	 * Schema migrations dbDelta cannot handle (DROP COLUMN, data backfills).
	 * Always checks live table/column state first — safe to call on every
	 * request. Empty until a migration is actually needed; add guarded
	 * ALTER TABLE calls here, one per migration, each checking first.
	 *
	 * @return void
	 */
	private static function maybe_run_migrations() {
		// No tables exist yet — nothing to migrate. See Database::create_tables().
	}

	/**
	 * Persist default plugin settings to wp_options on first install.
	 *
	 * @return void
	 */
	private static function save_default_settings() {
		if ( ! get_option( FHINT_SETTINGS_NAME ) ) {
			Settings::save( Settings::defaults() );
		}
	}

	/**
	 * Write version and first-install-time meta to wp_options.
	 *
	 * @return void
	 */
	private static function save_version() {
		if ( ! get_option( 'fhint_version' ) ) {
			add_option( 'fhint_version', FHINT_VERSION );
		} else {
			update_option( 'fhint_version', FHINT_VERSION );
		}

		if ( ! get_option( 'fhint_first_install_time' ) ) {
			add_option( 'fhint_first_install_time', time() );
		}
	}
}
