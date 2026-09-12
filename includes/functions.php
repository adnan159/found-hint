<?php
/**
 * Global helper functions.
 *
 * @package FoundHint
 */

defined( 'ABSPATH' ) || exit;

/**
 * Only non-class utilities belong here — things that need to be callable
 * without instantiation (shorthand wrappers, template helpers). Anything
 * with real logic belongs in a class under includes/App/.
 */

if ( ! function_exists( 'fhint_setting' ) ) {
	/**
	 * Get a single plugin setting by dot notation, with optional fallback.
	 *
	 * @param string $key      Dot-notation key, e.g. 'general.timezone'.
	 * @param mixed  $fallback Returned when the key isn't found.
	 * @return mixed
	 */
	function fhint_setting( $key, $fallback = null ) {
		return \FHINT\App\Core\Settings::get( $key, $fallback );
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
		$base = \FHINT\API::NAMESPACE_NAME . '/' . \FHINT\API::VERSION;

		return rest_url( $base . ( $path ? '/' . ltrim( $path, '/' ) : '' ) );
	}
}

if ( ! function_exists( 'fhint_table' ) ) {
	/**
	 * Full, prefixed name of one of this plugin's custom tables.
	 *
	 * Never hardcode a table name — always resolve it through this helper so
	 * the `{$wpdb->prefix}fhint_` prefix lives in exactly one place.
	 *
	 * @param string $table Unprefixed table name, e.g. 'business'.
	 * @return string
	 */
	function fhint_table( $table ) {
		global $wpdb;

		return $wpdb->prefix . 'fhint_' . $table;
	}
}
