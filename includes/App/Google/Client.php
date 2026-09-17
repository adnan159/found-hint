<?php
/**
 * Authenticated calls to Google's APIs.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google;

use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * A thin authenticated GET.
 *
 * Every call takes its token from `Connection::access_token()` rather than
 * from storage, so no caller has to remember that tokens expire — the
 * refresh happens there, once, for everyone.
 *
 * **A 401 is retried exactly once.** Google can reject a token this site
 * still believes is valid: a clock that drifted, or a grant withdrawn
 * seconds ago. Retrying once after a forced refresh turns that into a
 * success; retrying more would turn a genuine authorisation failure into a
 * loop against someone else's rate limit.
 */
class Client {

	/**
	 * Perform an authenticated GET and decode the JSON.
	 *
	 * @param string $url   Absolute URL.
	 * @param array  $query Query parameters.
	 * @return array|WP_Error Decoded body.
	 */
	public static function get( $url, array $query = array() ) {
		$token = Connection::access_token();

		if ( is_wp_error( $token ) ) {
			return $token;
		}

		$result = self::request( $url, $query, $token );

		if ( ! self::is_unauthorized( $result ) ) {
			return $result;
		}

		// Force the stored token to look expired, so access_token() refreshes
		// rather than handing back the one Google just rejected.
		Tokens::expire();

		$token = Connection::access_token();

		if ( is_wp_error( $token ) ) {
			return $token;
		}

		return self::request( $url, $query, $token );
	}

	/**
	 * Whether a result is an authorisation failure worth one retry.
	 *
	 * @param array|WP_Error $result Result of a request.
	 * @return bool
	 */
	private static function is_unauthorized( $result ) {
		if ( ! is_wp_error( $result ) ) {
			return false;
		}

		$data = $result->get_error_data();

		return is_array( $data ) && isset( $data['http_status'] ) && 401 === (int) $data['http_status'];
	}

	/**
	 * One GET.
	 *
	 * @param string $url   Absolute URL.
	 * @param array  $query Query parameters.
	 * @param string $token Access token.
	 * @return array|WP_Error
	 */
	private static function request( $url, array $query, $token ) {
		if ( $query ) {
			$url .= ( false === strpos( $url, '?' ) ? '?' : '&' ) . http_build_query( $query );
		}

		$response = wp_remote_get(
			$url,
			array(
				'timeout' => 20,
				'headers' => array(
					'Authorization' => 'Bearer ' . $token,
					'Accept'        => 'application/json',
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'fhint_google_unreachable',
				__( 'Google could not be reached. Please try again.', 'found-hint' ),
				array( 'status' => 502 )
			);
		}

		$status  = (int) wp_remote_retrieve_response_code( $response );
		$decoded = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		$decoded = is_array( $decoded ) ? $decoded : array();

		if ( $status >= 200 && $status <= 299 ) {
			return $decoded;
		}

		return new WP_Error(
			'fhint_google_request_failed',
			self::describe( $status, $decoded ),
			array(
				'status'      => 502,
				'http_status' => $status,
				'reason'      => isset( $decoded['error']['status'] ) ? (string) $decoded['error']['status'] : '',
			)
		);
	}

	/**
	 * Turn Google's error into something an operator can act on.
	 *
	 * The refusals a new project actually hits are the ones worth wording
	 * carefully: the Business Profile APIs stay switched off until Google
	 * approves the project, so a site that connected perfectly still gets
	 * nothing back. Saying "access denied", or telling somebody to wait,
	 * sends them hunting for a problem that is not theirs to fix.
	 *
	 * @param int   $status  HTTP status.
	 * @param array $decoded Decoded body.
	 * @return string
	 */
	private static function describe( $status, array $decoded ) {
		$reason = isset( $decoded['error']['status'] ) ? (string) $decoded['error']['status'] : '';

		if ( 403 === $status || 'PERMISSION_DENIED' === $reason ) {
			return __( 'Google refused the request. The Business Profile APIs have to be enabled for your Google Cloud project, and Google has to approve your project for them before they return anything.', 'found-hint' );
		}

		if ( 429 === $status || 'RESOURCE_EXHAUSTED' === $reason ) {
			return self::describe_quota( $decoded );
		}

		if ( 401 === $status ) {
			return __( 'Google rejected the sign-in. Connect again.', 'found-hint' );
		}

		if ( isset( $decoded['error']['message'] ) ) {
			return (string) $decoded['error']['message'];
		}

		return __( 'Google refused the request.', 'found-hint' );
	}

	/**
	 * Explain a quota refusal.
	 *
	 * **A 429 from these APIs usually is not rate limiting.** Google starts
	 * every project at a quota of zero for the Business Profile APIs and
	 * lifts it only once the project is approved, so an unapproved project's
	 * first request comes back as "quota exceeded" rather than "permission
	 * denied". Telling that operator to wait a few minutes is advice that can
	 * never come true.
	 *
	 * Google says which it is: the error carries the quota limit it applied,
	 * and a limit of zero means none was ever granted. Where that detail is
	 * missing the message covers both, because guessing wrong in either
	 * direction costs somebody an afternoon.
	 *
	 * @param array $decoded Decoded error body.
	 * @return string
	 */
	private static function describe_quota( array $decoded ) {
		$limit = self::quota_limit_value( $decoded );

		if ( '0' === $limit ) {
			return __( 'Google has granted this project no quota for the Business Profile APIs, which means it has not been approved for them yet. Approval is a separate request to Google — waiting will not change this.', 'found-hint' );
		}

		if ( null !== $limit ) {
			return __( 'Google is rate limiting this project. Wait a few minutes and try again.', 'found-hint' );
		}

		return __( 'Google refused the request as over quota. On a new project this normally means Google has not approved it for the Business Profile APIs yet; on an approved one it means too many requests just now.', 'found-hint' );
	}

	/**
	 * The quota limit Google applied, as a string, or null when not stated.
	 *
	 * @param array $decoded Decoded error body.
	 * @return string|null
	 */
	private static function quota_limit_value( array $decoded ) {
		if ( empty( $decoded['error']['details'] ) || ! is_array( $decoded['error']['details'] ) ) {
			return null;
		}

		foreach ( $decoded['error']['details'] as $detail ) {
			if ( isset( $detail['metadata']['quota_limit_value'] ) ) {
				return (string) $detail['metadata']['quota_limit_value'];
			}
		}

		return null;
	}
}
