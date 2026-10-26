<?php
/**
 * Plugin settings — one serialized option, dot-notation access.
 *
 * @package FoundHint
 */

namespace FHINT\App\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Preferences only — matches the "wp_options holds preferences only, entity
 * data goes in custom tables" rule.
 *
 * A setting must exist in defaults() before it can ever be persisted, since
 * save() recursively strips anything not present there. Add a group at a
 * time, as screens actually need them.
 */
class Settings {

	/**
	 * Default values, grouped by settings screen/section.
	 *
	 * A key must exist here before it can ever be persisted — save() strips
	 * anything not in this shape, so adding a setting starts here.
	 *
	 * @return array
	 */
	public static function defaults() {
		return array(
			'general' => array(
				// Default off: deleting the plugin to troubleshoot must not
				// cost the operator their work. Removing data is opt-in.
				'delete_data_on_uninstall' => false,
			),
			'logs'    => array(
				'retention_days' => 30,
			),
			'schema'  => array(
				// auto | plugin | seo_plugin | disabled — who publishes the
				// local business markup when an SEO plugin is also present.
				'mode' => 'auto',
			),
		);
	}

	/**
	 * All settings, merged with defaults.
	 *
	 * @return array
	 */
	public static function all() {
		$saved = get_option( FHINT_SETTINGS_NAME, array() );

		return self::merge_recursive(
			self::defaults(),
			is_array( $saved ) ? $saved : array()
		);
	}

	/**
	 * Get a setting by dot notation, e.g. Settings::get( 'general.timezone' ).
	 *
	 * @param string $key      Dot-notation key.
	 * @param mixed  $fallback Returned when the key isn't found.
	 * @return mixed
	 */
	public static function get( $key, $fallback = null ) {
		$data  = self::all();
		$value = $data;

		foreach ( explode( '.', $key ) as $segment ) {
			if ( ! is_array( $value ) || ! array_key_exists( $segment, $value ) ) {
				return $fallback;
			}

			$value = $value[ $segment ];
		}

		return $value;
	}

	/**
	 * Save settings. Any key not present in defaults() is dropped.
	 *
	 * @param array $data Incoming data, typically from a REST request body.
	 * @return void
	 */
	public static function save( array $data ) {
		update_option( FHINT_SETTINGS_NAME, self::sanitize_recursive( $data, self::defaults() ) );

		/**
		 * Fires after settings are written.
		 *
		 * Settings change what is published without touching business data,
		 * so nothing here moves the data-changed stamp that normally
		 * invalidates caches.
		 */
		do_action( 'fhint_settings_saved' );
	}

	/**
	 * Recursively merge saved values on top of the defaults shape.
	 *
	 * @param array $defaults Default values.
	 * @param array $saved    Saved values.
	 * @return array
	 */
	private static function merge_recursive( array $defaults, array $saved ) {
		$merged = $defaults;

		foreach ( $saved as $key => $value ) {
			if ( ! array_key_exists( $key, $merged ) ) {
				continue;
			}

			$merged[ $key ] = ( is_array( $value ) && is_array( $merged[ $key ] ) )
				? self::merge_recursive( $merged[ $key ], $value )
				: $value;
		}

		return $merged;
	}

	/**
	 * Recursively drop any key not present in defaults().
	 *
	 * @param array $data     Incoming data.
	 * @param array $defaults Default values, defining the allowed shape.
	 * @return array
	 */
	private static function sanitize_recursive( array $data, array $defaults ) {
		$clean = array();

		foreach ( $defaults as $key => $default_value ) {
			if ( ! array_key_exists( $key, $data ) ) {
				continue;
			}

			$clean[ $key ] = is_array( $default_value )
				? self::sanitize_recursive( is_array( $data[ $key ] ) ? $data[ $key ] : array(), $default_value )
				: $data[ $key ];
		}

		return $clean;
	}
}
