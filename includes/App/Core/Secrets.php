<?php
/**
 * Encrypting the few values that are secrets.
 *
 * @package FoundHint
 */

namespace FHINT\App\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Authenticated encryption for values stored in the database.
 *
 * Used for Google's access and refresh tokens. A refresh token is a live
 * grant to somebody's Business Profile: it outlives the database it sits in,
 * travelling into every backup, staging copy and support export made from
 * that site.
 *
 * **What this protects against, and what it does not.** Encrypting at rest
 * defends against a leaked database: a dump, a backup on a shared drive, a
 * misconfigured export, another plugin reading `wp_options`. It does **not**
 * defend against a compromised server, because the key is derived from
 * `wp-config.php` and anything that can read the tokens through this plugin
 * can read them through the same code path. Saying otherwise would be a
 * false promise.
 *
 * The key comes from WordPress's own salts, so nothing new has to be
 * generated or backed up. It can be pinned instead:
 *
 *     define( 'FHINT_ENCRYPTION_KEY', '<64 hex characters>' );
 *
 * **Changing the salts makes stored tokens unreadable.** That is the
 * accepted cost: `decrypt()` returns an empty string rather than throwing,
 * the connection reads as disconnected, and reconnecting takes one click.
 * Silently keeping a value that cannot be decrypted would be worse.
 */
class Secrets {

	/**
	 * Marks a value this class wrote.
	 *
	 * Without it there is no way to tell ciphertext from a token stored
	 * before encryption existed, and a site upgrading would lose its
	 * connection for no reason.
	 */
	const PREFIX = 'fhintv1:';

	/**
	 * Encrypt a value.
	 *
	 * @param string $value Plain text.
	 * @return string Marked ciphertext, or the value unchanged when this
	 *                server has no libsodium.
	 */
	public static function encrypt( $value ) {
		$value = (string) $value;

		if ( '' === $value || ! self::available() || self::is_encrypted( $value ) ) {
			return $value;
		}

		$nonce = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$box   = sodium_crypto_secretbox( $value, $nonce, self::key() );

		// The nonce is not a secret and must travel with the ciphertext; it
		// is random per value, so the same token never encrypts alike twice.
		return self::PREFIX . base64_encode( $nonce . $box ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
	}

	/**
	 * Decrypt a value.
	 *
	 * A value without the marker is returned as it is: that is a token
	 * stored before this existed, and it is re-encrypted the next time it is
	 * saved.
	 *
	 * @param string $value Stored value.
	 * @return string Plain text, or '' when it cannot be read.
	 */
	public static function decrypt( $value ) {
		$value = (string) $value;

		if ( '' === $value || ! self::is_encrypted( $value ) ) {
			return $value;
		}

		if ( ! self::available() ) {
			return '';
		}

		$raw = base64_decode( substr( $value, strlen( self::PREFIX ) ), true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode

		if ( ! is_string( $raw ) || strlen( $raw ) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ) {
			return '';
		}

		$nonce = substr( $raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$box   = substr( $raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );

		// Authenticated: a tampered or truncated value fails outright rather
		// than decrypting to something that looks like a token.
		$plain = sodium_crypto_secretbox_open( $box, $nonce, self::key() );

		return is_string( $plain ) ? $plain : '';
	}

	/**
	 * Whether a stored value was written by this class.
	 *
	 * @param string $value Stored value.
	 * @return bool
	 */
	public static function is_encrypted( $value ) {
		return 0 === strpos( (string) $value, self::PREFIX );
	}

	/**
	 * Whether this server can encrypt at all.
	 *
	 * libsodium has shipped with PHP since 7.2, so this is close to always
	 * true; a host that has removed it stores tokens as before rather than
	 * losing the ability to connect.
	 *
	 * @return bool
	 */
	public static function available() {
		return function_exists( 'sodium_crypto_secretbox' ) && function_exists( 'sodium_crypto_secretbox_open' );
	}

	/**
	 * The encryption key, derived from this site's own secrets.
	 *
	 * @return string 32 raw bytes.
	 */
	private static function key() {
		if ( defined( 'FHINT_ENCRYPTION_KEY' ) && '' !== (string) FHINT_ENCRYPTION_KEY ) {
			$pinned = (string) FHINT_ENCRYPTION_KEY;
			$raw    = ctype_xdigit( $pinned ) && 64 === strlen( $pinned ) ? hex2bin( $pinned ) : $pinned;

			return self::stretch( (string) $raw );
		}

		// `secure_auth` rather than the default salt: it is the one WordPress
		// itself uses for its strongest cookies, and it is unique per site.
		return self::stretch( wp_salt( 'secure_auth' ) );
	}

	/**
	 * Turn any secret into exactly the key length libsodium wants.
	 *
	 * @param string $material Secret material.
	 * @return string 32 raw bytes.
	 */
	private static function stretch( $material ) {
		// HKDF with a fixed, plugin-specific label, so this key is unrelated
		// to anything else WordPress derives from the same salt.
		return hash_hkdf( 'sha256', $material, SODIUM_CRYPTO_SECRETBOX_KEYBYTES, 'fhint-token-encryption' );
	}
}
