<?php
/**
 * The Google Business Profile connection.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google;

use FHINT\App\Core\Capabilities;
use FHINT\App\Core\Logger;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Owns the connection as a whole: its state, the callback that creates it,
 * and the disconnect that ends it.
 *
 * The state this reports is deliberately coarse — `not_configured`,
 * `disconnected`, `connected`, `needs_reconnect`. A screen showing "expired"
 * as distinct from "revoked" would be describing a difference the operator
 * cannot act on differently; both mean connect again.
 */
class Connection {

	/**
	 * `admin-post.php` action Google returns to. Part of the redirect URI
	 * registered in Google Cloud, so changing it breaks every existing
	 * connection's callback.
	 */
	const CALLBACK_ACTION = 'fhint_google_callback';

	const STATUS_NOT_CONFIGURED = 'not_configured';
	const STATUS_DISCONNECTED   = 'disconnected';
	const STATUS_CONNECTED      = 'connected';
	const STATUS_NEEDS_RECONNECT = 'needs_reconnect';

	/**
	 * Option holding the last failure, so the screen can explain itself
	 * after a redirect.
	 */
	const NOTICE_OPTION = 'fhint_google_notice';

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'admin_post_' . self::CALLBACK_ACTION, array( __CLASS__, 'handle_callback' ) );
	}

	/**
	 * The connection's state, safe to send to a browser.
	 *
	 * Carries no token, and no client secret — only whether one is stored.
	 *
	 * @return array
	 */
	public static function state() {
		$tokens = Tokens::all();

		return array(
			'status'            => self::status(),
			'configured'        => Credentials::configured(),
			'client_id_hint'    => Credentials::client_id_hint(),
			'redirect_uri'      => Credentials::redirect_uri(),
			'account_email'     => $tokens['account_email'],
			'connected_at'      => $tokens['connected_at'],
			'expires_at'        => $tokens['expires_at'],
			'scopes'            => '' === $tokens['scope'] ? array() : preg_split( '/\s+/', trim( $tokens['scope'] ) ),
			'can_manage_profile' => Tokens::has_scope( OAuth::SCOPE_BUSINESS ),
			'notice'            => self::take_notice(),
		);
	}

	/**
	 * The coarse connection status.
	 *
	 * @return string
	 */
	public static function status() {
		if ( ! Credentials::configured() ) {
			return self::STATUS_NOT_CONFIGURED;
		}

		if ( ! Tokens::exists() ) {
			return self::STATUS_DISCONNECTED;
		}

		if ( ! Tokens::has_scope( OAuth::SCOPE_BUSINESS ) ) {
			return self::STATUS_NEEDS_RECONNECT;
		}

		return self::STATUS_CONNECTED;
	}

	/**
	 * Start a connection, returning where to send the operator.
	 *
	 * @return string|WP_Error Authorize URL.
	 */
	public static function start() {
		return OAuth::start( get_current_user_id() );
	}

	/**
	 * Handle Google's redirect back.
	 *
	 * Runs on `admin-post.php`, so it is an ordinary authenticated admin
	 * request: the capability check is not optional, and neither is `state`.
	 * Nothing here trusts a query parameter beyond the point it has been
	 * matched against something stored on this server.
	 *
	 * @return void
	 */
	public static function handle_callback() {
		if ( ! Capabilities::current_user_can_manage() ) {
			wp_die(
				esc_html__( 'You do not have permission to manage this.', 'found-hint' ),
				'',
				array( 'response' => 403 )
			);
		}

		// Google reports a declined consent here rather than by not
		// returning, so this is a normal outcome, not an exception.
		if ( isset( $_GET['error'] ) ) {
			self::fail(
				'access_denied',
				__( 'Access was declined on the Google consent screen. Nothing has changed.', 'found-hint' )
			);
		}

		$state = isset( $_GET['state'] ) ? sanitize_text_field( wp_unslash( $_GET['state'] ) ) : '';
		$code  = isset( $_GET['code'] ) ? sanitize_text_field( wp_unslash( $_GET['code'] ) ) : '';

		$handshake = OAuth::claim_handshake( $state );

		if ( is_wp_error( $handshake ) ) {
			self::fail( $handshake->get_error_code(), $handshake->get_error_message() );
		}

		if ( '' === $code ) {
			self::fail( 'fhint_google_code_missing', __( 'Google did not return an authorization code.', 'found-hint' ) );
		}

		$tokens = OAuth::exchange_code( $code, $handshake['verifier'] );

		if ( is_wp_error( $tokens ) ) {
			self::fail( $tokens->get_error_code(), $tokens->get_error_message() );
		}

		Tokens::save(
			$tokens,
			array(
				'account_email' => OAuth::fetch_account_email( $tokens['access_token'] ),
				'connected_at'  => time(),
			)
		);

		// The event is worth recording; the tokens are not, and are not
		// passed here — see Tokens.
		Logger::log(
			Logger::INFO,
			'google',
			'google.connected',
			__( 'Connected to Google Business Profile.', 'found-hint' )
		);

		self::redirect_to_screen();
	}

	/**
	 * End the connection.
	 *
	 * The local tokens go whether or not Google confirms, because the
	 * operator asked to disconnect and leaving a usable refresh token
	 * behind would be the wrong way to fail.
	 *
	 * @return array Result, with `revoked` saying whether Google confirmed.
	 */
	public static function disconnect() {
		$refresh_token = Tokens::refresh_token();
		$revoked       = false;

		if ( '' !== $refresh_token ) {
			$result  = OAuth::revoke( $refresh_token );
			$revoked = ! is_wp_error( $result );
		}

		Tokens::clear();

		// The stored profiles describe an account nobody is signed in to any
		// more, and the mappings point at places this site can no longer
		// see. Keeping them would leave the mapping screen showing links it
		// cannot act on.
		GoogleLocationRepository::truncate();

		Logger::log(
			Logger::INFO,
			'google',
			'google.disconnected',
			$revoked
				? __( 'Disconnected from Google Business Profile.', 'found-hint' )
				: __( 'Disconnected locally; Google did not confirm the revocation.', 'found-hint' )
		);

		return array(
			'revoked' => $revoked,
			'state'   => self::state(),
		);
	}

	/**
	 * A valid access token, refreshing it if necessary.
	 *
	 * Every authenticated call goes through here rather than reading the
	 * stored token, so no caller has to remember that tokens expire.
	 *
	 * @return string|WP_Error
	 */
	public static function access_token() {
		if ( ! Tokens::exists() ) {
			return new WP_Error(
				'fhint_google_not_connected',
				__( 'Connect your Google account first.', 'found-hint' ),
				array( 'status' => 409 )
			);
		}

		if ( ! Tokens::is_expired() ) {
			return Tokens::access_token();
		}

		$refreshed = OAuth::refresh( Tokens::refresh_token() );

		if ( is_wp_error( $refreshed ) ) {
			// `invalid_grant` on a refresh means the grant is gone for good
			// — revoked in the Google account, or expired after six months
			// unused. Keeping the dead refresh token would leave the screen
			// claiming a connection that cannot come back on its own.
			$google_error = is_array( $refreshed->get_error_data() ) && isset( $refreshed->get_error_data()['google_error'] )
				? $refreshed->get_error_data()['google_error']
				: '';

			if ( 'invalid_grant' === $google_error ) {
				Tokens::clear();

				Logger::log(
					Logger::WARNING,
					'google',
					'google.grant_revoked',
					__( 'Google rejected the stored grant; the connection was cleared.', 'found-hint' )
				);
			}

			return $refreshed;
		}

		Tokens::save( $refreshed );

		return Tokens::access_token();
	}

	/**
	 * Record a failure and return to the screen.
	 *
	 * @param string $code    Machine code.
	 * @param string $message Operator-facing sentence.
	 * @return void
	 */
	private static function fail( $code, $message ) {
		update_option(
			self::NOTICE_OPTION,
			array(
				'code'    => (string) $code,
				'message' => (string) $message,
			)
		);

		Logger::log( Logger::WARNING, 'google', 'google.connect_failed', (string) $message );

		self::redirect_to_screen();
	}

	/**
	 * Read and clear the stored notice.
	 *
	 * Read-once: a failure explains the redirect that just happened, and
	 * showing it again on the next load would describe an event the
	 * operator has already dealt with.
	 *
	 * @return array|null
	 */
	private static function take_notice() {
		$notice = get_option( self::NOTICE_OPTION, null );

		if ( ! is_array( $notice ) || empty( $notice['message'] ) ) {
			return null;
		}

		delete_option( self::NOTICE_OPTION );

		return array(
			'code'    => isset( $notice['code'] ) ? (string) $notice['code'] : '',
			'message' => (string) $notice['message'],
		);
	}

	/**
	 * Send the browser back to the Google screen.
	 *
	 * @return void
	 */
	private static function redirect_to_screen() {
		wp_safe_redirect( admin_url( 'admin.php?page=' . FHINT_PLUGIN_SLUG . '#/google' ) );
		exit;
	}
}
