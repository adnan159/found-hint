<?php
/**
 * Stored Google OAuth tokens.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google;

defined( 'ABSPATH' ) || exit;

/**
 * The connection's tokens.
 *
 * **Nothing in this class is ever sent to a browser or written to the log.**
 * `API\Google` reports a connection's *state* — connected, which account,
 * when it expires — and reads nothing else. `App\Core\Logger` redacts
 * token-shaped keys centrally, but the rule here is simpler: do not pass
 * one to it.
 *
 * The refresh token is the valuable half. Google issues it once, on the
 * first consent, and not again on later grants unless consent is forced —
 * so `save()` keeps the stored one when a response arrives without it,
 * which is what every refresh response looks like. Overwriting it with an
 * empty string would silently turn a durable connection into one that dies
 * at the next expiry.
 */
class Tokens {

	const OPTION = 'fhint_google_tokens';

	/**
	 * Seconds before true expiry at which a token is treated as expired.
	 *
	 * A token that expires while a request is in flight fails as a 401 and
	 * costs a retry, so it is refreshed slightly early instead.
	 */
	const EXPIRY_LEEWAY = 60;

	/**
	 * The stored token record, with every key present.
	 *
	 * @return array
	 */
	public static function all() {
		$stored = get_option( self::OPTION, array() );
		$stored = is_array( $stored ) ? $stored : array();

		return array(
			'access_token'  => isset( $stored['access_token'] ) ? (string) $stored['access_token'] : '',
			'refresh_token' => isset( $stored['refresh_token'] ) ? (string) $stored['refresh_token'] : '',
			'expires_at'    => isset( $stored['expires_at'] ) ? (int) $stored['expires_at'] : 0,
			'scope'         => isset( $stored['scope'] ) ? (string) $stored['scope'] : '',
			'token_type'    => isset( $stored['token_type'] ) ? (string) $stored['token_type'] : 'Bearer',
			'account_email' => isset( $stored['account_email'] ) ? (string) $stored['account_email'] : '',
			'connected_at'  => isset( $stored['connected_at'] ) ? (int) $stored['connected_at'] : 0,
		);
	}

	/**
	 * Whether a connection exists at all.
	 *
	 * A refresh token is the test rather than an access token: an access
	 * token expires an hour after it is issued, so its absence says nothing
	 * about whether the site is connected.
	 *
	 * @return bool
	 */
	public static function exists() {
		$all = self::all();

		return '' !== $all['refresh_token'];
	}

	/**
	 * The current access token.
	 *
	 * @return string
	 */
	public static function access_token() {
		$all = self::all();

		return $all['access_token'];
	}

	/**
	 * The refresh token.
	 *
	 * @return string
	 */
	public static function refresh_token() {
		$all = self::all();

		return $all['refresh_token'];
	}

	/**
	 * Whether the access token has expired, or is about to.
	 *
	 * @return bool
	 */
	public static function is_expired() {
		$all = self::all();

		if ( '' === $all['access_token'] || 0 === $all['expires_at'] ) {
			return true;
		}

		return ( time() + self::EXPIRY_LEEWAY ) >= $all['expires_at'];
	}

	/**
	 * Merge a token response into storage.
	 *
	 * @param array $response Decoded token endpoint response.
	 * @param array $extra    Fields to set alongside it, e.g. account_email.
	 * @return void
	 */
	public static function save( array $response, array $extra = array() ) {
		$current = self::all();

		$expires_in = isset( $response['expires_in'] ) ? (int) $response['expires_in'] : 0;

		$record = array(
			'access_token'  => isset( $response['access_token'] )
				? (string) $response['access_token']
				: $current['access_token'],
			// Kept when absent: see the class docblock — a refresh response
			// carries no refresh token, and blanking it would end the
			// connection at the next expiry.
			'refresh_token' => ! empty( $response['refresh_token'] )
				? (string) $response['refresh_token']
				: $current['refresh_token'],
			'expires_at'    => $expires_in > 0 ? time() + $expires_in : $current['expires_at'],
			'scope'         => isset( $response['scope'] ) ? (string) $response['scope'] : $current['scope'],
			'token_type'    => isset( $response['token_type'] ) ? (string) $response['token_type'] : $current['token_type'],
			'account_email' => $current['account_email'],
			'connected_at'  => $current['connected_at'] > 0 ? $current['connected_at'] : time(),
		);

		foreach ( array( 'account_email', 'connected_at' ) as $key ) {
			if ( isset( $extra[ $key ] ) ) {
				$record[ $key ] = 'connected_at' === $key ? (int) $extra[ $key ] : (string) $extra[ $key ];
			}
		}

		update_option( self::OPTION, $record );
	}

	/**
	 * Whether a scope was granted.
	 *
	 * Google may grant fewer scopes than were asked for, and says so in the
	 * token response rather than failing, so a feature has to check rather
	 * than assume its scope is present.
	 *
	 * @param string $scope Scope URL.
	 * @return bool
	 */
	public static function has_scope( $scope ) {
		$all = self::all();

		if ( '' === $all['scope'] ) {
			return false;
		}

		return in_array( $scope, preg_split( '/\s+/', trim( $all['scope'] ) ), true );
	}

	/**
	 * Mark the access token expired without discarding the connection.
	 *
	 * Used when Google rejects a token this site still believes in, so the
	 * next read refreshes instead of handing back the rejected one. The
	 * refresh token is untouched: the grant is fine, the access token is
	 * not.
	 *
	 * @return void
	 */
	public static function expire() {
		$record = self::all();

		if ( '' === $record['refresh_token'] ) {
			return;
		}

		$record['expires_at'] = 0;

		update_option( self::OPTION, $record );
	}

	/**
	 * Forget the connection.
	 *
	 * @return void
	 */
	public static function clear() {
		delete_option( self::OPTION );
	}
}
