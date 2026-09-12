<?php
/**
 * Plugin capabilities.
 *
 * @package FoundHint
 */

namespace FHINT\App\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Defines who may manage FoundHint.
 *
 * FoundHint has no host plugin whose capability it can piggyback on, so it
 * grants its own dynamically to anyone who can already manage options,
 * rather than writing it into role records. That keeps activation and
 * uninstall free of role mutations, and means the grant cannot be left
 * behind on a site after the plugin is removed.
 *
 * Use Capabilities::manage() on every admin screen and in every REST
 * route's permission_callback.
 */
final class Capabilities {

	/**
	 * Capability required to manage every FoundHint screen and endpoint.
	 */
	const MANAGE = 'manage_fhint';

	/**
	 * Capability this one is derived from.
	 */
	const DERIVED_FROM = 'manage_options';

	/**
	 * Hook into WordPress. Called once from FHINT::dispatch_hooks().
	 *
	 * @return void
	 */
	public static function init() {
		add_filter( 'user_has_cap', array( __CLASS__, 'grant_capability' ), 10, 4 );
	}

	/**
	 * Grant the plugin capability to users who can manage options.
	 *
	 * @param array $allcaps All capabilities of the user.
	 * @param array $caps    Capabilities being checked.
	 * @param array $args    Arguments passed to has_cap().
	 * @param mixed $user    The user object, when available.
	 * @return array
	 */
	public static function grant_capability( $allcaps, $caps, $args, $user = null ) {
		unset( $caps, $args, $user );

		if ( ! empty( $allcaps[ self::DERIVED_FROM ] ) ) {
			$allcaps[ self::MANAGE ] = true;
		}

		return $allcaps;
	}

	/**
	 * The capability the plugin should check, filterable by add-ons.
	 *
	 * @return string
	 */
	public static function manage() {
		/**
		 * Filters the capability required for FoundHint admin screens and endpoints.
		 *
		 * @param string $capability Capability name.
		 */
		$capability = apply_filters( 'fhint_manage_capability', self::MANAGE );

		return is_string( $capability ) && '' !== $capability ? $capability : self::MANAGE;
	}

	/**
	 * Whether the current user may manage FoundHint.
	 *
	 * @return bool
	 */
	public static function current_user_can_manage() {
		return current_user_can( self::manage() );
	}
}
