<?php
/**
 * Google OAuth client credentials.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google;

defined( 'ABSPATH' ) || exit;

/**
 * The site's own Google Cloud OAuth client.
 *
 * FoundHint ships no client of its own: the operator creates a project in
 * Google Cloud, enables the Business Profile APIs and pastes the client id
 * and secret here. That is more setup than a hosted broker would be, but a
 * broker means every site's tokens pass through a server this plugin does
 * not have, and shipping a client secret inside a plugin download does not
 * make it a secret. The seam is `OAuth`, so a broker can be added later
 * without the rest of the module knowing.
 *
 * **These live in their own option, not in `Settings`.** `GET /settings`
 * returns everything in that option to the browser, so a client secret put
 * there would be published to anyone who can open the screen. Nothing here
 * is ever returned by the REST layer — see `API\Google`, which reports only
 * whether a credential is present.
 */
class Credentials {

	const OPTION = 'fhint_google_credentials';

	/**
	 * The stored credentials, with every key present.
	 *
	 * @return array
	 */
	public static function all() {
		$stored = get_option( self::OPTION, array() );
		$stored = is_array( $stored ) ? $stored : array();

		return array(
			'client_id'     => isset( $stored['client_id'] ) ? (string) $stored['client_id'] : '',
			'client_secret' => isset( $stored['client_secret'] ) ? (string) $stored['client_secret'] : '',
		);
	}

	/**
	 * The OAuth client id.
	 *
	 * @return string
	 */
	public static function client_id() {
		$all = self::all();

		return $all['client_id'];
	}

	/**
	 * The OAuth client secret.
	 *
	 * @return string
	 */
	public static function client_secret() {
		$all = self::all();

		return $all['client_secret'];
	}

	/**
	 * Whether both halves are present.
	 *
	 * @return bool
	 */
	public static function configured() {
		$all = self::all();

		return '' !== $all['client_id'] && '' !== $all['client_secret'];
	}

	/**
	 * Store credentials.
	 *
	 * An empty string for either half is treated as "leave this one alone",
	 * so the screen can save a new client id without asking the operator to
	 * paste the secret again — it is write-only and never sent back to be
	 * re-submitted.
	 *
	 * @param string $client_id     Client id, or '' to keep the stored one.
	 * @param string $client_secret Client secret, or '' to keep the stored one.
	 * @return void
	 */
	public static function save( $client_id, $client_secret ) {
		$current = self::all();

		$client_id     = trim( (string) $client_id );
		$client_secret = trim( (string) $client_secret );

		update_option(
			self::OPTION,
			array(
				'client_id'     => '' === $client_id ? $current['client_id'] : $client_id,
				'client_secret' => '' === $client_secret ? $current['client_secret'] : $client_secret,
			)
		);
	}

	/**
	 * Forget the credentials entirely.
	 *
	 * @return void
	 */
	public static function clear() {
		delete_option( self::OPTION );
	}

	/**
	 * The redirect URI this site will use.
	 *
	 * Google compares this against its list character for character, so the
	 * screen shows it for copying rather than describing how to build it —
	 * a mistyped path is the single most common reason a first connection
	 * fails, and it fails on Google's side with an error the plugin never
	 * gets to explain.
	 *
	 * @return string
	 */
	public static function redirect_uri() {
		return admin_url( 'admin-post.php?action=' . Connection::CALLBACK_ACTION );
	}

	/**
	 * A safe description of the stored client id for display.
	 *
	 * The id is not a secret — it travels in the authorize URL — but it is
	 * long, so only the distinguishing head is shown.
	 *
	 * @return string
	 */
	public static function client_id_hint() {
		$client_id = self::client_id();

		if ( '' === $client_id ) {
			return '';
		}

		$head = substr( $client_id, 0, 12 );

		return $head . '…';
	}
}
