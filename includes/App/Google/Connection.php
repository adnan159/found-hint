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

		// A session can expire while somebody is on Google's consent screen.
		// Without this, WordPress answers their return with a blank page and
		// the connection is lost for no reason they can see; `auth_redirect()`
		// sends them to log in and then back here to finish.
		add_action( 'admin_post_nopriv_' . self::CALLBACK_ACTION, array( __CLASS__, 'handle_logged_out_callback' ) );
	}

	/**
	 * Google returned somebody who is no longer logged in to WordPress.
	 *
	 * @return void
	 */
	public static function handle_logged_out_callback() {
		self::breadcrumb( 'google.callback_logged_out' );

		auth_redirect();
	}

	/**
	 * Record that Google's return reached this site.
	 *
	 * @param string $event Event name.
	 * @return void
	 */
	private static function breadcrumb( $event ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$names = array_keys( is_array( $_GET ) ? $_GET : array() );

		Logger::log(
			Logger::INFO,
			'google',
			$event,
			sprintf(
				/* translators: %s: the query parameter names Google's return carried. */
				__( 'Google\'s return reached this site carrying: %s', 'found-hint' ),
				implode( ', ', array_map( 'sanitize_key', $names ) )
			)
		);
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
			// True through either route: the site's own Google client, or
			// FoundHint's connect service. The screen only needs to know
			// whether a sign-in can start.
			'configured'        => self::can_connect(),
			'connect_service'   => ConnectService::configured(),
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
		if ( ! self::can_connect() ) {
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
		// The service is preferred when one is configured: it is the route
		// that needs nothing of the operator. A site that has entered its own
		// client keeps using it, so an agency's deliberate choice is not
		// quietly overridden.
		if ( ConnectService::configured() && ! Credentials::configured() ) {
			return ConnectService::start( get_current_user_id() );
		}

		return OAuth::start( get_current_user_id() );
	}

	/**
	 * Whether a sign-in can start at all.
	 *
	 * @return bool
	 */
	public static function can_connect() {
		return Credentials::configured() || ConnectService::configured();
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
	// Google redirects the browser here; a redirect cannot carry a nonce.
	// Cross-site forgery is covered instead by `state`, which is single use
	// and bound to the user who began the handshake — a borrowed or replayed
	// redirect claims nothing. Every value below is unslashed and sanitised.
	// phpcs:disable WordPress.Security.NonceVerification.Recommended
	public static function handle_callback() {
		// Recorded before anything can go wrong, so a connection that never
		// completes can be told apart from one that never came back at all.
		// Parameter *names* only: the values are a one-time code.
		self::breadcrumb( 'google.callback_received' );

		if ( ! Capabilities::current_user_can_manage() ) {
			wp_die(
				esc_html__( 'You do not have permission to manage this.', 'found-hint' ),
				'',
				array( 'response' => 403 )
			);
		}

		// The connect service reports a refusal in its own parameter, because
		// Google's `error` never reaches this site on that route — Google
		// answers the service, and the service brings the person home.
		if ( isset( $_GET['fhint_connect_error'] ) ) {
			$reason = sanitize_text_field( wp_unslash( $_GET['fhint_connect_error'] ) );

			self::fail(
				'fhint_connect_' . $reason,
				'access_denied' === $reason
					? __( 'Access was declined on the Google consent screen. Nothing has changed.', 'found-hint' )
					: __( 'The sign-in did not complete. Please try again.', 'found-hint' )
			);
		}

		if ( isset( $_GET['fhint_handoff'] ) ) {
			self::complete_through_service();
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

		$stored    = Tokens::all();
		$refreshed = 'connect' === $stored['source'] && ConnectService::configured()
			? ConnectService::refresh( $stored['refresh_token'] )
			: OAuth::refresh( $stored['refresh_token'] );

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
	 * Finish a connection made through FoundHint's connect service.
	 *
	 * The browser arrives carrying a one-time handoff code rather than
	 * Google's authorization code: the code was already exchanged by the
	 * service, which holds the client secret. This site presents the secret
	 * it generated when it started the attempt, collects the tokens once, and
	 * never sees the Google client at all.
	 *
	 * @return void
	 */
	private static function complete_through_service() {
		$handoff = isset( $_GET['fhint_handoff'] ) ? sanitize_text_field( wp_unslash( $_GET['fhint_handoff'] ) ) : '';
		$session = isset( $_GET['fhint_session'] ) ? sanitize_text_field( wp_unslash( $_GET['fhint_session'] ) ) : '';

		$tokens = ConnectService::claim( $session, $handoff, get_current_user_id() );

		if ( is_wp_error( $tokens ) ) {
			self::fail( $tokens->get_error_code(), $tokens->get_error_message() );
		}

		Tokens::save(
			$tokens,
			array(
				'account_email' => OAuth::fetch_account_email( $tokens['access_token'] ),
				'connected_at'  => time(),
				// Remembered so the next refresh goes back to the service:
				// this site has no client secret to renew a token with.
				'source'        => 'connect',
			)
		);

		Logger::log(
			Logger::INFO,
			'google',
			'google.connected',
			__( 'Connected to Google Business Profile.', 'found-hint' )
		);

		self::redirect_to_screen();
	}

	/**
	 * Record a failure and return to the screen.
	 *
	 * @param string $code    Machine code.
	 * @param string $message Operator-facing sentence.
	 * @return void
	 */
	// phpcs:enable WordPress.Security.NonceVerification.Recommended
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
