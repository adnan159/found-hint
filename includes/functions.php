<?php
/**
 * Global helper functions.
 *
 * @package FoundHint
 */

defined( 'ABSPATH' ) || exit;

/**
 * Only non-class utilities belong here (template helpers, shorthand
 * wrappers) — see local-seo's CLAUDE.md rule this repo carries over.
 */

if ( ! function_exists( 'fhint_plugin' ) ) {
	/**
	 * The booted plugin instance.
	 *
	 * The entry point for everything: fhint_plugin()->get( SomeService::class ).
	 *
	 * @return \FHINT\Plugin
	 */
	function fhint_plugin() {
		return \FHINT\Plugin::instance();
	}
}

if ( ! function_exists( 'fhint_rest_url' ) ) {
	/**
	 * Build a REST URL under this plugin's namespace.
	 *
	 * @param string $path Optional path suffix, e.g. '/business'.
	 * @return string
	 */
	function fhint_rest_url( $path = '' ) {
		return rest_url( 'fhint/v1' . ( $path ? '/' . ltrim( $path, '/' ) : '' ) );
	}
}

if ( ! function_exists( 'fhint_table' ) ) {
	/**
	 * Full, prefixed name of one of this plugin's custom tables.
	 *
	 * Never hardcode a table name — always resolve it through this helper
	 * (or FHINT\Infrastructure\Database\Tables once it exists) so the
	 * `{$wpdb->prefix}fhint_` prefix lives in exactly one place.
	 *
	 * @param string $table Unprefixed table name, e.g. 'businesses'.
	 * @return string
	 */
	function fhint_table( $table ) {
		global $wpdb;
		return $wpdb->prefix . 'fhint_' . $table;
	}
}
