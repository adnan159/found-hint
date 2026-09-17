<?php
/**
 * The Google OAuth 2.0 handshake.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google;

use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Builds the authorize URL and talks to Google's token endpoint.
 *
 * This class knows the protocol and nothing else: it does not decide when
 * to connect, does not store tokens and does not touch the admin. That
 * belongs to `Connection`, which is also the only thing that should call
 * `exchange_code()`.
 *
 * **The flow is protected twice over.** `state` defends the callback —
 * without it, anyone can send an administrator a link that completes a
 * connection to *their* Google account, and the site then publishes to a
 * profile its owner does not control. PKCE defends the code — an
 * authorization code that leaks from a referrer header or a proxy log is
 * useless without the verifier, which never leaves this server. Google does
 * not require PKCE for a confidential client; it costs almost nothing and
 * removes a class of failure that is invisible when it happens.
 */
class OAuth {

	const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
	const TOKEN_URL     = 'https://oauth2.googleapis.com/token';
	const REVOKE_URL    = 'https://oauth2.googleapis.com/revoke';
	const USERINFO_URL  = 'https://openidconnect.googleapis.com/v1/userinfo';

	/**
	 * Managing the business profile — the scope the feature exists for.
	 */
	const SCOPE_BUSINESS = 'https://www.googleapis.com/auth/business.manage';

	/**
	 * Reading the signed-in address, so the screen can say which account is
	 * connected.
	 *
	 * Worth the extra line on the consent screen: the Business Profile APIs
	 * need Google to approve the project before they return anything, so
	 * without this a correctly connected site would have nothing to show
	 * for it and read as broken.
	 */
	const SCOPE_EMAIL = 'https://www.googleapis.com/auth/userinfo.email';

	/**
	 * How long an unfinished handshake stays valid, in seconds.
	 */
	const HANDSHAKE_TTL = 600;

	/**
	 * Transient prefix holding one pending handshake.
	 */
	const HANDSHAKE_PREFIX = 'fhint_google_oauth_';

	/**
	 * The scopes this plugin asks for.
	 *
	 * Filterable so an extension can ask for more on the same consent
	 * screen — asking later means a second trip through Google.
	 *
	 * @return string[]
	 */
	public static function scopes() {
		$scopes = array( self::SCOPE_BUSINESS, self::SCOPE_EMAIL );

		return function_exists( 'apply_filters' )
			? (array) apply_filters( 'fhint_google_scopes', $scopes )
			: $scopes;
	}

	/**
	 * Begin a handshake: store its secrets and build the URL to send the
	 * operator to.
	 *
	 * @param int $user_id User who started it.
	 * @return string|WP_Error Authorize URL.
	 */
	public static function start( $user_id ) {
		if ( ! Credentials::configured() ) {
			return new WP_Error(
				'fhint_google_not_configured',
				__( 'Add your Google client id and secret first.', 'found-hint' ),
				array( 'status' => 409 )
			);
		}

		$state    = self::random_string( 32 );
		$verifier = self::random_string( 64 );

		// Tied to the user who started it, so a state lifted from one
		// administrator's browser cannot be completed in another's session.
		set_transient(
			self::HANDSHAKE_PREFIX . $state,
			array(
				'verifier' => $verifier,
				'user_id'  => (int) $user_id,
			),
			self::HANDSHAKE_TTL
		);

		$query = array(
			'client_id'             => Credentials::client_id(),
			'redirect_uri'          => Credentials::redirect_uri(),
			'response_type'         => 'code',
			'scope'                 => implode( ' ', self::scopes() ),
			'state'                 => $state,
			'code_challenge'        => self::challenge( $verifier ),
			'code_challenge_method' => 'S256',
			// Google returns a refresh token only for an offline grant, and
			// only on a consent it treats as new. Without `prompt=consent` a
			// reconnection after a disconnect comes back with an access
			// token and no refresh token, which looks like success and stops
			// working an hour later.
			'access_type'           => 'offline',
			'prompt'                => 'consent',
		);

		return self::AUTHORIZE_URL . '?' . http_build_query( $query );
	}

	/**
	 * Take a returned `state`, consuming it.
	 *
	 * Single use: the transient is deleted whether or not it matched, so a
	 * replayed callback finds nothing.
	 *
	 * @param string $state State from the callback.
	 * @return array|WP_Error Handshake record.
	 */
	public static function claim_handshake( $state ) {
		$state = (string) $state;

		if ( '' === $state ) {
			return new WP_Error( 'fhint_google_state_missing', __( 'That sign-in could not be verified.', 'found-hint' ) );
		}

		$key    = self::HANDSHAKE_PREFIX . $state;
		$record = get_transient( $key );

		delete_transient( $key );

		if ( ! is_array( $record ) || empty( $record['verifier'] ) ) {
			return new WP_Error( 'fhint_google_state_invalid', __( 'That sign-in could not be verified. Please try connecting again.', 'found-hint' ) );
		}

		if ( get_current_user_id() !== (int) $record['user_id'] ) {
			return new WP_Error( 'fhint_google_state_mismatch', __( 'That sign-in was started by a different user.', 'found-hint' ) );
		}

		return $record;
	}

	/**
	 * Exchange an authorization code for tokens.
	 *
	 * @param string $code     Authorization code from the callback.
	 * @param string $verifier PKCE verifier stored when the handshake began.
	 * @return array|WP_Error Decoded token response.
	 */
	public static function exchange_code( $code, $verifier ) {
		return self::token_request(
			array(
				'grant_type'    => 'authorization_code',
				'code'          => (string) $code,
				'redirect_uri'  => Credentials::redirect_uri(),
				'code_verifier' => (string) $verifier,
			)
		);
	}

	/**
	 * Trade a refresh token for a new access token.
	 *
	 * @param string $refresh_token Stored refresh token.
	 * @return array|WP_Error Decoded token response.
	 */
	public static function refresh( $refresh_token ) {
		return self::token_request(
			array(
				'grant_type'    => 'refresh_token',
				'refresh_token' => (string) $refresh_token,
			)
		);
	}

	/**
	 * Ask Google to forget the grant.
	 *
	 * A failure here is reported but must not stop a disconnect: if Google
	 * cannot be reached, the operator still asked to disconnect, and the
	 * tokens still have to go.
	 *
	 * @param string $token Refresh or access token.
	 * @return true|WP_Error
	 */
	public static function revoke( $token ) {
		$response = wp_remote_post(
			self::REVOKE_URL,
			array(
				'timeout' => 15,
				'headers' => array( 'Content-Type' => 'application/x-www-form-urlencoded' ),
				'body'    => array( 'token' => (string) $token ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$code = (int) wp_remote_retrieve_response_code( $response );

		if ( $code < 200 || $code > 299 ) {
			return new WP_Error(
				'fhint_google_revoke_failed',
				__( 'Google would not confirm the disconnection.', 'found-hint' )
			);
		}

		return true;
	}

	/**
	 * Read the signed-in account's email address.
	 *
	 * @param string $access_token Access token.
	 * @return string Email, or '' when unavailable.
	 */
	public static function fetch_account_email( $access_token ) {
		$response = wp_remote_get(
			self::USERINFO_URL,
			array(
				'timeout' => 15,
				'headers' => array( 'Authorization' => 'Bearer ' . $access_token ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return '';
		}

		$body = json_decode( (string) wp_remote_retrieve_body( $response ), true );

		return is_array( $body ) && isset( $body['email'] ) ? (string) $body['email'] : '';
	}

	/**
	 * POST to the token endpoint and decode the answer.
	 *
	 * @param array $body Grant-specific fields.
	 * @return array|WP_Error
	 */
	private static function token_request( array $body ) {
		$body['client_id']     = Credentials::client_id();
		$body['client_secret'] = Credentials::client_secret();

		$response = wp_remote_post(
			self::TOKEN_URL,
			array(
				'timeout' => 20,
				'headers' => array( 'Content-Type' => 'application/x-www-form-urlencoded' ),
				'body'    => $body,
			)
		);

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'fhint_google_unreachable',
				__( 'Google could not be reached. Please try again.', 'found-hint' ),
				array( 'status' => 502 )
			);
		}

		$decoded = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		$decoded = is_array( $decoded ) ? $decoded : array();
		$status  = (int) wp_remote_retrieve_response_code( $response );

		if ( $status < 200 || $status > 299 || isset( $decoded['error'] ) ) {
			// Google's own `error` is a stable machine string
			// (`invalid_grant`, `invalid_client`…) and is worth keeping: it
			// is the difference between "your secret is wrong" and "the
			// operator revoked access in their Google account".
			return new WP_Error(
				'fhint_google_token_failed',
				self::describe_error( isset( $decoded['error'] ) ? (string) $decoded['error'] : '' ),
				array(
					'status'       => 502,
					'google_error' => isset( $decoded['error'] ) ? (string) $decoded['error'] : 'http_' . $status,
				)
			);
		}

		if ( empty( $decoded['access_token'] ) ) {
			return new WP_Error(
				'fhint_google_token_missing',
				__( 'Google did not return an access token.', 'found-hint' ),
				array( 'status' => 502 )
			);
		}

		return $decoded;
	}

	/**
	 * Turn Google's error string into something an operator can act on.
	 *
	 * @param string $error Google's `error` value.
	 * @return string
	 */
	private static function describe_error( $error ) {
		switch ( $error ) {
			case 'invalid_client':
				return __( 'Google did not recognise the client id or secret. Check both, then try again.', 'found-hint' );
			case 'invalid_grant':
				return __( 'Google has expired or withdrawn this connection. Connect again to restore it.', 'found-hint' );
			case 'redirect_uri_mismatch':
				return __( 'The redirect URI does not match the one registered in Google Cloud. Copy it from this screen exactly.', 'found-hint' );
			case 'access_denied':
				return __( 'Access was declined on the Google consent screen.', 'found-hint' );
			default:
				return __( 'Google refused the request. Please try connecting again.', 'found-hint' );
		}
	}

	/**
	 * A URL-safe random string.
	 *
	 * @param int $bytes Bytes of entropy.
	 * @return string
	 */
	private static function random_string( $bytes ) {
		return self::base64url( random_bytes( $bytes ) );
	}

	/**
	 * The S256 challenge for a PKCE verifier.
	 *
	 * @param string $verifier Verifier.
	 * @return string
	 */
	private static function challenge( $verifier ) {
		return self::base64url( hash( 'sha256', $verifier, true ) );
	}

	/**
	 * Base64, URL alphabet, unpadded — what OAuth asks for.
	 *
	 * @param string $raw Raw bytes.
	 * @return string
	 */
	private static function base64url( $raw ) {
		return rtrim( strtr( base64_encode( $raw ), '+/', '-_' ), '=' );
	}
}
