<?php
/**
 * Google Maps Platform API key.
 *
 * @package FoundHint
 */

namespace FHINT\App\Places;

defined( 'ABSPATH' ) || exit;

/**
 * The site's own Maps Platform key.
 *
 * Separate from `App\Google\Credentials` on purpose: that is an OAuth client
 * for the Business Profile API, which acts *as the owner* of a listing. This
 * is a plain API key for the Places API, which reads what anybody can see on
 * Google Maps. Different product, different terms, different failure modes —
 * and a site may well have one and not the other.
 *
 * **The key is write-only.** It lives in its own option, never in
 * `Settings` (which `GET /settings` publishes wholesale to the browser), and
 * no REST route returns it. The screen gets `hint()` — the first characters
 * and a count — which is enough to recognise a key without being enough to
 * use one.
 *
 * A Maps key is a bearer credential: anyone holding it can spend the
 * project's quota. That is why `Client` sends it as a header rather than in
 * a query string, where it would land in server logs and browser history.
 */
class Credentials {

	const OPTION = 'fhint_places_credentials';

	/**
	 * The stored API key.
	 *
	 * @return string
	 */
	public static function api_key() {
		$stored = get_option( self::OPTION, array() );
		$stored = is_array( $stored ) ? $stored : array();

		return isset( $stored['api_key'] ) ? (string) $stored['api_key'] : '';
	}

	/**
	 * Whether a key is present.
	 *
	 * @return bool
	 */
	public static function configured() {
		return '' !== self::api_key();
	}

	/**
	 * Store a key.
	 *
	 * An empty string means "leave the stored one alone", so the screen can
	 * be saved without re-pasting a key it is never shown.
	 *
	 * @param string $api_key The key, or '' to keep the stored one.
	 * @return void
	 */
	public static function save( $api_key ) {
		$api_key = trim( (string) $api_key );

		if ( '' === $api_key ) {
			return;
		}

		update_option( self::OPTION, array( 'api_key' => $api_key ) );
	}

	/**
	 * Forget the key.
	 *
	 * @return void
	 */
	public static function clear() {
		delete_option( self::OPTION );
	}

	/**
	 * A recognisable, unusable fragment of the stored key.
	 *
	 * Maps keys all begin "AIza", so showing only a prefix would identify
	 * nothing. Showing the tail of a credential is how support conversations
	 * leak them. This shows the first eight characters and how many follow.
	 *
	 * @return string Empty when no key is stored.
	 */
	public static function hint() {
		$key = self::api_key();

		if ( '' === $key ) {
			return '';
		}

		$length = strlen( $key );

		if ( $length <= 8 ) {
			return str_repeat( '•', $length );
		}

		return substr( $key, 0, 8 ) . str_repeat( '•', min( 8, $length - 8 ) );
	}
}
