<?php
/**
 * FoundHint's connect service, from this site's side.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google;

use FHINT\App\Core\Secrets;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Signing in to Google without this site holding a Google client.
 *
 * Google will only return a browser to an address registered in advance on
 * the OAuth client, and a client secret shipped inside a plugin download is
 * not a secret. So FoundHint runs one service at a fixed address that holds
 * the client, and every site signs in through it. **This site never sees the
 * client id or secret**; it receives the tokens for its own Google account
 * and calls Google directly from then on.
 *
 * Switched on by two constants (or the `fhint_connect_url` filter):
 *
 *     define( 'FHINT_CONNECT_URL', 'https://connect.foundhint.com' );
 *     define( 'FHINT_CONNECT_PUBLIC_URL', 'https://connect.foundhint.com' );
 *
 * They differ only where PHP and the browser reach the service by different
 * names — a site in Docker talking to a service on the host machine, which
 * is exactly the local development case.
 *
 * `App\Google\OAuth` remains the other route: an agency that would rather use
 * its own Google Cloud project still can, and it is the fallback if this
 * service is ever unreachable.
 */
class ConnectService {

	/** Where the pending attempt is kept while the operator is at Google. */
	const HANDSHAKE_TRANSIENT = 'fhint_connect_handshake';

	/** Ten minutes, the same window the service gives a session. */
	const HANDSHAKE_TTL = 600;

	/**
	 * Where FoundHint's own connect service lives.
	 *
	 * **Shipped with the plugin, so an ordinary install needs no
	 * configuration at all**: a person activates FoundHint and presses
	 * Continue with Google. `FHINT_CONNECT_URL` in `wp-config.php` points a
	 * site somewhere else — a staging copy of the service, or an empty
	 * string to switch the service off and use this site's own Google client
	 * instead.
	 */
	const DEFAULT_URL = 'https://foundhint.com/wp-json/fhint-connect';

	/**
	 * The address PHP calls.
	 *
	 * @return string Empty only when a site has switched the service off.
	 */
	public static function url() {
		$url = defined( 'FHINT_CONNECT_URL' ) ? (string) FHINT_CONNECT_URL : self::DEFAULT_URL;

		/**
		 * Filter the connect service address used for server-to-server calls.
		 *
		 * @param string $url Absolute URL, or '' to use this site's own client.
		 */
		$url = (string) apply_filters( 'fhint_connect_url', $url );

		return untrailingslashit( trim( $url ) );
	}

	/**
	 * The address the browser is sent to.
	 *
	 * Defaults to `url()`, which is right everywhere except a container
	 * talking to its host.
	 *
	 * @return string
	 */
	public static function public_url() {
		$url = defined( 'FHINT_CONNECT_PUBLIC_URL' ) ? (string) FHINT_CONNECT_PUBLIC_URL : '';

		/**
		 * Filter the connect service address the browser is sent to.
		 *
		 * @param string $url Absolute URL, or '' to reuse the server-side one.
		 */
		$url = (string) apply_filters( 'fhint_connect_public_url', $url );
		$url = untrailingslashit( trim( $url ) );

		return '' !== $url ? $url : self::url();
	}

	/**
	 * Whether this site connects through the service.
	 *
	 * @return bool
	 */
	public static function configured() {
		return '' !== self::url();
	}

	/**
	 * Where this site expects the browser back.
	 *
	 * The service checks this against the site that registered the attempt and
	 * will redirect nowhere else, so it has to be exactly the callback.
	 *
	 * @return string
	 */
	public static function return_url() {
		return Credentials::redirect_uri();
	}

	/**
	 * Begin a connection.
	 *
	 * Registers the attempt with the service, keeps the secret that proves
	 * this site started it, and returns the URL to send the browser to.
	 *
	 * @param int $user_id Who is connecting.
	 * @return string|WP_Error Absolute URL on the connect service.
	 */
	public static function start( $user_id ) {
		if ( ! self::configured() ) {
			return new WP_Error(
				'fhint_connect_not_configured',
				__( 'No connect service is configured for this site.', 'foundhint-local-seo' ),
				array( 'status' => 409 )
			);
		}

		// Generated here and never sent anywhere but its hash: the service
		// stores the hash, and this site presents the secret itself when it
		// collects the tokens. That is what stops another site collecting
		// them.
		$secret = wp_generate_password( 48, false, false );

		$response = self::post(
			'/v1/sessions',
			array(
				'site_url'    => home_url(),
				'return_url'  => self::return_url(),
				'secret_hash' => hash( 'sha256', $secret ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		if ( empty( $response['session_id'] ) || empty( $response['start_url'] ) ) {
			return new WP_Error(
				'fhint_connect_bad_session',
				__( 'The connect service did not start a sign-in. Please try again.', 'foundhint-local-seo' ),
				array( 'status' => 502 )
			);
		}

		set_transient(
			self::HANDSHAKE_TRANSIENT,
			array(
				'session_id' => (string) $response['session_id'],
				// Encrypted like the tokens are: for ten minutes this is the
				// one thing that proves a site may collect them, and a
				// database dump taken in that window should not carry it.
				'secret'     => Secrets::encrypt( $secret ),
				'user_id'    => (int) $user_id,
			),
			self::HANDSHAKE_TTL
		);

		return self::rebase( (string) $response['start_url'] );
	}

	/**
	 * Collect the tokens after Google returns the browser here.
	 *
	 * @param string $session_id Session the service reported back.
	 * @param string $handoff    One-time code from the redirect.
	 * @param int    $user_id    Who is completing the connection.
	 * @return array|WP_Error Token response, in Google's own shape.
	 */
	public static function claim( $session_id, $handoff, $user_id ) {
		$pending = get_transient( self::HANDSHAKE_TRANSIENT );

		// Single use, like the OAuth handshake: a replayed redirect finds
		// nothing waiting for it.
		delete_transient( self::HANDSHAKE_TRANSIENT );

		if ( ! is_array( $pending ) || empty( $pending['session_id'] ) ) {
			return new WP_Error(
				'fhint_connect_no_handshake',
				__( 'That sign-in has expired. Start again from this screen.', 'foundhint-local-seo' ),
				array( 'status' => 400 )
			);
		}

		if ( ! hash_equals( (string) $pending['session_id'], (string) $session_id ) ) {
			return new WP_Error(
				'fhint_connect_session_mismatch',
				__( 'That sign-in does not match the one this site started.', 'foundhint-local-seo' ),
				array( 'status' => 400 )
			);
		}

		// The same person has to finish it, for the same reason the OAuth
		// route binds its state to a user: a link left in a shared browser
		// must not connect somebody else's Google account.
		if ( (int) $pending['user_id'] !== (int) $user_id ) {
			return new WP_Error(
				'fhint_connect_wrong_user',
				__( 'This sign-in was started by a different user.', 'foundhint-local-seo' ),
				array( 'status' => 403 )
			);
		}

		$tokens = self::post(
			'/v1/exchange',
			array(
				'session_id' => (string) $session_id,
				'handoff'    => (string) $handoff,
				'secret'     => Secrets::decrypt( (string) $pending['secret'] ),
			)
		);

		if ( is_wp_error( $tokens ) ) {
			return $tokens;
		}

		if ( empty( $tokens['access_token'] ) ) {
			return new WP_Error(
				'fhint_connect_no_tokens',
				__( 'The connect service returned no access token.', 'foundhint-local-seo' ),
				array( 'status' => 502 )
			);
		}

		return $tokens;
	}

	/**
	 * Renew an access token.
	 *
	 * Google requires the client secret for a refresh, which is the one thing
	 * this site does not have — so the refresh token goes to the service and
	 * a fresh access token comes back.
	 *
	 * @param string $refresh_token The stored refresh token.
	 * @return array|WP_Error Token response.
	 */
	public static function refresh( $refresh_token ) {
		if ( '' === (string) $refresh_token ) {
			return new WP_Error(
				'fhint_connect_no_refresh_token',
				__( 'There is no refresh token to renew.', 'foundhint-local-seo' ),
				array( 'status' => 409 )
			);
		}

		return self::post( '/v1/refresh', array( 'refresh_token' => (string) $refresh_token ) );
	}

	/**
	 * One JSON POST to the service.
	 *
	 * @param string $path Path beginning with a slash.
	 * @param array  $body Body to send.
	 * @return array|WP_Error Decoded response.
	 */
	private static function post( $path, array $body ) {
		$response = wp_remote_post(
			self::url() . $path,
			array(
				'timeout' => 20,
				'headers' => array(
					'Content-Type' => 'application/json',
					'Accept'       => 'application/json',
				),
				'body'    => wp_json_encode( $body ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'fhint_connect_unreachable',
				__( 'FoundHint\'s connect service could not be reached. Please try again in a moment.', 'foundhint-local-seo' ),
				array( 'status' => 502 )
			);
		}

		$status  = (int) wp_remote_retrieve_response_code( $response );
		$decoded = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		$decoded = is_array( $decoded ) ? $decoded : array();

		if ( $status >= 200 && $status <= 299 ) {
			return $decoded;
		}

		$code = isset( $decoded['error'] ) ? (string) $decoded['error'] : 'fhint_connect_failed';

		return new WP_Error(
			'fhint_connect_failed',
			self::describe( $code, $decoded ),
			array(
				'status'       => 502,
				'http_status'  => $status,
				// Carried under the same key the OAuth route uses, so the
				// caller's handling of a withdrawn grant works either way.
				'google_error' => $code,
			)
		);
	}

	/**
	 * Turn a refusal into something an operator can act on.
	 *
	 * @param string $code    Machine code from the service.
	 * @param array  $decoded Decoded body.
	 * @return string
	 */
	private static function describe( $code, array $decoded ) {
		switch ( $code ) {
			case 'invalid_grant':
				return __( 'Google has withdrawn this connection. Connect again.', 'foundhint-local-seo' );
			case 'rate_limited':
				return __( 'FoundHint\'s connect service is busy. Try again in a minute.', 'foundhint-local-seo' );
			case 'no_handoff':
				return __( 'That sign-in has already been completed or has expired. Start again.', 'foundhint-local-seo' );
			case 'bad_secret':
			case 'origin_mismatch':
			case 'bad_return_path':
			case 'bad_return_action':
				return __( 'The connect service refused this site\'s return address. Check the site address in Settings → General.', 'foundhint-local-seo' );
			case 'insecure_return':
				return __( 'The connect service needs this site to be served over https before it can connect.', 'foundhint-local-seo' );
		}

		if ( isset( $decoded['message'] ) && '' !== $decoded['message'] ) {
			return (string) $decoded['message'];
		}

		return __( 'FoundHint\'s connect service refused the request.', 'foundhint-local-seo' );
	}

	/**
	 * Point a URL the service built at the address the browser can reach.
	 *
	 * The service knows only its own public address. Where PHP reaches it by
	 * another name — a container calling its host — the two differ, and the
	 * browser must be sent to the public one.
	 *
	 * @param string $url URL as the service built it.
	 * @return string
	 */
	private static function rebase( $url ) {
		$public = self::public_url();

		if ( '' === $public || 0 === strpos( $url, $public ) ) {
			return $url;
		}

		$path = wp_parse_url( $url, PHP_URL_PATH );
		$path = is_string( $path ) ? $path : '';
		$query = wp_parse_url( $url, PHP_URL_QUERY );

		return $public . $path . ( is_string( $query ) && '' !== $query ? '?' . $query : '' );
	}
}
