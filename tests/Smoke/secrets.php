<?php
/**
 * Encrypting the tokens.
 *
 * Run with plain PHP: `php tests/Smoke/secrets.php`.
 *
 * Two things are worth more than the round trip itself: that **no write path
 * stores a token in plain text** — one method forgetting to encrypt would
 * leave the value in the database looking exactly as before — and that a
 * value which cannot be decrypted comes back empty rather than as something
 * that would be sent to Google and fail there.
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\App\Core\Secrets;
use FHINT\App\Google\Tokens;

echo "Token encryption\n";

/**
 * The option exactly as it sits in the database.
 *
 * @return array
 */
function stored_record() {
	$stored = isset( $GLOBALS['__options'][ Tokens::OPTION ] ) ? $GLOBALS['__options'][ Tokens::OPTION ] : array();

	return is_array( $stored ) ? $stored : array();
}

/**
 * Everything in the stored option, as one string to search.
 *
 * @return string
 */
function stored_blob() {
	return wp_json_encode( stored_record() );
}

// -- The primitive ---------------------------------------------------------

check( Secrets::available(), 'libsodium is available' );

$secret    = '1//0eXaMpLe-refresh-token-value';
$encrypted = Secrets::encrypt( $secret );

check( Secrets::is_encrypted( $encrypted ), 'ciphertext is marked as ours' );
check( false === strpos( $encrypted, $secret ), 'and does not contain the plain text' );
check_same( $secret, Secrets::decrypt( $encrypted ), 'it round-trips' );

// A fresh nonce each time, so identical tokens do not encrypt alike — two
// sites sharing a token would otherwise be visible in a dump.
check(
	Secrets::encrypt( $secret ) !== Secrets::encrypt( $secret ),
	'the same value encrypts differently every time'
);

check_same( '', Secrets::encrypt( '' ), 'an empty value stays empty' );
check_same( $encrypted, Secrets::encrypt( $encrypted ), 'already-encrypted values are not encrypted twice' );

// A token stored before encryption existed must survive an upgrade.
check_same( 'ya29.plain-old-token', Secrets::decrypt( 'ya29.plain-old-token' ), 'an unmarked value passes through' );

// Tampering must fail outright rather than produce plausible rubbish.
$tampered = substr( $encrypted, 0, -4 ) . 'AAAA';

check_same( '', Secrets::decrypt( $tampered ), 'a tampered value decrypts to nothing' );
check_same( '', Secrets::decrypt( Secrets::PREFIX . 'not-base64!!' ), 'so does a malformed one' );
check_same( '', Secrets::decrypt( Secrets::PREFIX ), 'and an empty payload' );

// A different key — the case of somebody rotating their WordPress salts.
$GLOBALS['__salt'] = 'a completely different salt';

check_same( '', Secrets::decrypt( $encrypted ), 'a value encrypted under another key is unreadable, not wrong' );

$GLOBALS['__salt'] = 'test-salt';

check_same( $secret, Secrets::decrypt( $encrypted ), 'and readable again once the salt is back' );

// -- Nothing reaches the database in plain text ----------------------------

$GLOBALS['__options'] = array();

Tokens::save(
	array(
		'access_token'  => 'ya29.a-real-looking-access-token',
		'refresh_token' => '1//a-real-looking-refresh-token',
		'expires_in'    => 3600,
		'scope'         => 'https://www.googleapis.com/auth/business.manage',
	),
	array( 'account_email' => 'owner@example.test' )
);

$blob = stored_blob();

check( false === strpos( $blob, 'ya29.a-real-looking-access-token' ), 'the access token is not in the database' );
check( false === strpos( $blob, '1//a-real-looking-refresh-token' ), 'nor is the refresh token' );
check( Secrets::is_encrypted( stored_record()['access_token'] ), 'the stored access token is ciphertext' );
check( Secrets::is_encrypted( stored_record()['refresh_token'] ), 'and so is the refresh token' );

// Everything else stays readable: an email in the clear is how support tells
// which account a site is connected to.
check( false !== strpos( $blob, 'owner@example.test' ), 'the account email stays readable' );

$all = Tokens::all();

check_same( 'ya29.a-real-looking-access-token', $all['access_token'], 'reading gives the real access token back' );
check_same( '1//a-real-looking-refresh-token', $all['refresh_token'], 'and the real refresh token' );
check_same( 'owner@example.test', $all['account_email'], 'alongside the account' );

// -- Every write path, not just the first ----------------------------------

Tokens::expire();

$blob = stored_blob();

check( false === strpos( $blob, '1//a-real-looking-refresh-token' ), 'expiring does not rewrite the token in plain text' );
check( Secrets::is_encrypted( stored_record()['refresh_token'] ), 'it stays encrypted' );
check_same( 0, Tokens::all()['expires_at'], 'while the expiry is cleared' );

// A refresh response carries no refresh token; the stored one must survive
// the rewrite, still encrypted.
Tokens::save(
	array(
		'access_token' => 'ya29.a-second-access-token',
		'expires_in'   => 3600,
	)
);

$blob = stored_blob();

check( false === strpos( $blob, 'ya29.a-second-access-token' ), 'a refreshed access token is encrypted too' );
check( false === strpos( $blob, '1//a-real-looking-refresh-token' ), 'and the kept refresh token stays encrypted' );
check_same( '1//a-real-looking-refresh-token', Tokens::all()['refresh_token'], 'and is still the same token' );

// -- Upgrading a site that stored them in plain text ------------------------

$GLOBALS['__options'][ Tokens::OPTION ] = array(
	'access_token'  => 'ya29.stored-before-encryption',
	'refresh_token' => '1//stored-before-encryption',
	'expires_at'    => time() + 3600,
	'scope'         => 'https://www.googleapis.com/auth/business.manage',
	'token_type'    => 'Bearer',
	'account_email' => 'owner@example.test',
	'connected_at'  => time(),
	'source'        => 'connect',
);

check_same( '1//stored-before-encryption', Tokens::all()['refresh_token'], 'an old plain-text token still reads' );
check( Tokens::encrypt_stored(), 'upgrading encrypts what is already there' );

$blob = stored_blob();

check( false === strpos( $blob, '1//stored-before-encryption' ), 'so the plain text is gone from the database' );
check_same( '1//stored-before-encryption', Tokens::all()['refresh_token'], 'and the connection still works' );
check_same( 'connect', Tokens::all()['source'], 'with the rest of the record intact' );
check( ! Tokens::encrypt_stored(), 'running the upgrade again does nothing' );

// -- A connection that cannot be decrypted reads as disconnected -----------

$GLOBALS['__options'][ Tokens::OPTION ]['refresh_token'] = Secrets::PREFIX . 'Y29ycnVwdA==';

check_same( '', Tokens::all()['refresh_token'], 'an unreadable token comes back empty' );
check( ! Tokens::exists(), 'so the site reads as not connected, rather than failing at Google' );

finish( 'Token encryption' );
