<?php
/**
 * Google Business Profile connection.
 *
 * Run with plain PHP: `php tests/Smoke/google.php`.
 *
 * Google is never called. Every answer comes from the harness queue, which
 * is the point: what needs proving is what this plugin does with an answer
 * — including the answers that are easy to get wrong, like a refresh
 * response that carries no refresh token, and a grant Google has revoked.
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\App\Google\Connection;
use FHINT\App\Google\Credentials;
use FHINT\App\Google\OAuth;
use FHINT\App\Google\Tokens;

echo "Google Business Profile\n";

/**
 * Forget everything between cases.
 *
 * @return void
 */
function reset_google() {
	$GLOBALS['__options']       = array();
	$GLOBALS['__transients']    = array();
	$GLOBALS['__http_queue']    = array();
	$GLOBALS['__http_requests'] = array();
	$GLOBALS['__redirects']     = array();
}

/**
 * The arguments of the last HTTP request made.
 *
 * @return array
 */
function last_request() {
	$requests = $GLOBALS['__http_requests'];

	return $requests ? end( $requests ) : array();
}

// -- Status before anything is configured ---------------------------------

reset_google();

check_same( Connection::STATUS_NOT_CONFIGURED, Connection::status(), 'status is not_configured with no credentials' );
check( ! Credentials::configured(), 'credentials report themselves absent' );

$state = Connection::state();
check( false === $state['configured'], 'state says not configured' );
check_same( '', $state['account_email'], 'no account email yet' );

// Starting a handshake without credentials is refused rather than building
// a URL Google would reject.
$start = OAuth::start( 1 );
check( $start instanceof WP_Error, 'starting without credentials returns an error' );
check_same( 'fhint_google_not_configured', $start->get_error_code(), 'and names the reason' );

// -- Credentials -----------------------------------------------------------

Credentials::save( 'client-id-123.apps.googleusercontent.com', 'secret-value' );

check( Credentials::configured(), 'credentials are configured once both halves are set' );
check_same( Connection::STATUS_DISCONNECTED, Connection::status(), 'status is disconnected once configured' );

// An empty half means "keep what is stored", so the screen can save a new
// client id without the operator re-entering the secret.
Credentials::save( 'client-id-456.apps.googleusercontent.com', '' );
check_same( 'secret-value', Credentials::client_secret(), 'an empty secret keeps the stored one' );
check_same( 'client-id-456.apps.googleusercontent.com', Credentials::client_id(), 'and the new client id is stored' );

// -- The connection state never carries a secret ---------------------------

$state      = Connection::state();
$serialised = json_encode( $state );

check( false === strpos( $serialised, 'secret-value' ), 'state never contains the client secret' );
check( ! array_key_exists( 'client_secret', $state ), 'state has no client_secret key at all' );

// -- Authorize URL ---------------------------------------------------------

reset_google();
Credentials::save( 'client-id-123.apps.googleusercontent.com', 'secret-value' );

// get_current_user_id() is stubbed to 1, so start as that user here.
$url = OAuth::start( 1 );

check( is_string( $url ), 'start() returns a URL' );

$query = array();
parse_str( (string) wp_parse_url( $url, PHP_URL_QUERY ), $query );

check_same( 'code', $query['response_type'], 'asks for an authorization code' );
check_same( 'offline', $query['access_type'], 'asks for offline access, so a refresh token is issued' );
check_same( 'consent', $query['prompt'], 'forces consent, so reconnecting issues a refresh token again' );
check_same( 'S256', $query['code_challenge_method'], 'uses PKCE with S256' );
check( ! empty( $query['code_challenge'] ), 'sends a code challenge' );
check( ! empty( $query['state'] ), 'sends a state' );
check_same( Credentials::redirect_uri(), $query['redirect_uri'], 'sends this site\'s redirect URI' );
check(
	false !== strpos( $query['scope'], OAuth::SCOPE_BUSINESS ),
	'asks for the business.manage scope'
);

// The verifier is stored server-side and is never in the URL — that is the
// whole point of PKCE.
check(
	false === strpos( $url, $GLOBALS['__transients'][ OAuth::HANDSHAKE_PREFIX . $query['state'] ]['verifier'] ),
	'the PKCE verifier never appears in the authorize URL'
);

// The challenge really is the S256 hash of the stored verifier, not a
// second random value that only looks like one.
$verifier  = $GLOBALS['__transients'][ OAuth::HANDSHAKE_PREFIX . $query['state'] ]['verifier'];
$expected  = rtrim( strtr( base64_encode( hash( 'sha256', $verifier, true ) ), '+/', '-_' ), '=' );

check_same( $expected, $query['code_challenge'], 'the challenge is the S256 hash of the verifier' );

// -- State is single use ---------------------------------------------------

$returned_state = $query['state'];

$first = OAuth::claim_handshake( $returned_state );
check( is_array( $first ), 'a fresh state is claimed successfully' );

$second = OAuth::claim_handshake( $returned_state );
check( $second instanceof WP_Error, 'the same state cannot be claimed twice' );
check_same(
	'fhint_google_state_invalid',
	$second instanceof WP_Error ? $second->get_error_code() : 'claimed-again',
	'a replayed state is rejected as invalid'
);

// An unknown state is refused outright.
$unknown = OAuth::claim_handshake( 'not-a-real-state' );
check( $unknown instanceof WP_Error, 'an unknown state is rejected' );

$missing = OAuth::claim_handshake( '' );
check( $missing instanceof WP_Error, 'a missing state is rejected' );

// -- State belongs to the user who started it ------------------------------

reset_google();
Credentials::save( 'id', 'secret' );

$url = OAuth::start( 999 );
parse_str( (string) wp_parse_url( $url, PHP_URL_QUERY ), $query );

// get_current_user_id() is stubbed to 1, so a handshake started by user 999
// must not complete here.
$claim = OAuth::claim_handshake( $query['state'] );
check( $claim instanceof WP_Error, 'a handshake started by another user is refused' );
check_same( 'fhint_google_state_mismatch', $claim->get_error_code(), 'and says so' );

// -- Exchanging a code -----------------------------------------------------

reset_google();
Credentials::save( 'client-id-123', 'secret-value' );

queue_http(
	200,
	array(
		'access_token'  => 'access-1',
		'refresh_token' => 'refresh-1',
		'expires_in'    => 3600,
		'scope'         => OAuth::SCOPE_BUSINESS . ' ' . OAuth::SCOPE_EMAIL,
		'token_type'    => 'Bearer',
	)
);

$tokens = OAuth::exchange_code( 'auth-code', 'verifier-value' );

check( is_array( $tokens ), 'a successful exchange returns the decoded response' );

$request = last_request();

check_same( OAuth::TOKEN_URL, $request['url'], 'the exchange posts to the token endpoint' );
check_same( 'authorization_code', $request['args']['body']['grant_type'], 'as an authorization_code grant' );
check_same( 'verifier-value', $request['args']['body']['code_verifier'], 'sending the PKCE verifier' );
check_same( 'secret-value', $request['args']['body']['client_secret'], 'and the client secret' );

Tokens::save( $tokens, array( 'account_email' => 'owner@example.test', 'connected_at' => 1700000000 ) );

check( Tokens::exists(), 'the connection now exists' );
check_same( Connection::STATUS_CONNECTED, Connection::status(), 'status is connected' );
check( Tokens::has_scope( OAuth::SCOPE_BUSINESS ), 'the business scope is recorded as granted' );
check( ! Tokens::is_expired(), 'a token issued for an hour is not expired' );

$state = Connection::state();
check_same( 'owner@example.test', $state['account_email'], 'state reports the connected account' );

// -- No token ever reaches the browser -------------------------------------

$serialised = json_encode( Connection::state() );

check( false === strpos( $serialised, 'access-1' ), 'state never contains the access token' );
check( false === strpos( $serialised, 'refresh-1' ), 'state never contains the refresh token' );
check( false === strpos( $serialised, 'secret-value' ), 'state never contains the client secret' );

// -- Refresh keeps the refresh token ---------------------------------------
//
// Google's refresh responses carry no refresh token. Overwriting the stored
// one with an empty string would look like success and break the connection
// an hour later, which is the kind of failure nobody traces back here.

$GLOBALS['__options'][ Tokens::OPTION ]['expires_at'] = time() - 10;

check( Tokens::is_expired(), 'an elapsed token reports itself expired' );

queue_http(
	200,
	array(
		'access_token' => 'access-2',
		'expires_in'   => 3600,
		'scope'        => OAuth::SCOPE_BUSINESS . ' ' . OAuth::SCOPE_EMAIL,
	)
);

$token = Connection::access_token();

check_same( 'access-2', $token, 'an expired token is refreshed transparently' );
check_same( 'refresh-1', Tokens::refresh_token(), 'the refresh token survives a refresh that omits it' );
check_same( 'owner@example.test', Tokens::all()['account_email'], 'and so does the account email' );

$request = last_request();
check_same( 'refresh_token', $request['args']['body']['grant_type'], 'the refresh uses a refresh_token grant' );

// A still-valid token is used as-is rather than refreshed on every call.
$before = count( $GLOBALS['__http_requests'] );
$token  = Connection::access_token();

check_same( 'access-2', $token, 'a valid token is returned unchanged' );
check_same( $before, count( $GLOBALS['__http_requests'] ), 'and no request is made for it' );

// -- A revoked grant clears the connection ---------------------------------

$GLOBALS['__options'][ Tokens::OPTION ]['expires_at'] = time() - 10;

queue_http( 400, array( 'error' => 'invalid_grant' ) );

$result = Connection::access_token();

check( $result instanceof WP_Error, 'a revoked grant returns an error' );
check( ! Tokens::exists(), 'and the dead connection is cleared rather than left claiming to work' );
check_same( Connection::STATUS_DISCONNECTED, Connection::status(), 'status falls back to disconnected' );

// -- A transient failure does NOT clear the connection ---------------------
//
// The opposite case, and the more dangerous one to get wrong: a network
// blip must not cost the operator a working connection.

reset_google();
Credentials::save( 'id', 'secret' );
Tokens::save(
	array(
		'access_token'  => 'access-1',
		'refresh_token' => 'refresh-1',
		'expires_in'    => -10,
		'scope'         => OAuth::SCOPE_BUSINESS,
	)
);

queue_http( 500, array( 'error' => 'backendError' ) );

$result = Connection::access_token();

check( $result instanceof WP_Error, 'a server error returns an error' );
check( Tokens::exists(), 'but the connection is kept — a blip is not a revocation' );

// Unreachable host, same rule.
$GLOBALS['__http_queue'][] = new WP_Error( 'http_request_failed', 'down' );

$result = Connection::access_token();

check( $result instanceof WP_Error, 'an unreachable Google returns an error' );
check_same( 'fhint_google_unreachable', $result->get_error_code(), 'reported as unreachable, not as a bad grant' );
check( Tokens::exists(), 'and the connection is still kept' );

// -- Token responses that are not successes --------------------------------

reset_google();
Credentials::save( 'id', 'secret' );

queue_http( 401, array( 'error' => 'invalid_client' ) );
$result = OAuth::exchange_code( 'code', 'verifier' );

check( $result instanceof WP_Error, 'invalid_client is an error' );
check_same( 'invalid_client', $result->get_error_data()['google_error'], 'Google\'s own error code is preserved' );

// A 200 with no access token is a failure, not a success with an empty
// token — the difference decides whether the site thinks it is connected.
queue_http( 200, array( 'token_type' => 'Bearer' ) );
$result = OAuth::exchange_code( 'code', 'verifier' );

check( $result instanceof WP_Error, 'a 200 with no access token is an error' );
check_same( 'fhint_google_token_missing', $result->get_error_code(), 'and says which' );

// Malformed JSON is not mistaken for a grant.
queue_http( 200, 'not json at all' );
$result = OAuth::exchange_code( 'code', 'verifier' );

check( $result instanceof WP_Error, 'a non-JSON body is an error' );

// -- Partial consent -------------------------------------------------------
//
// Google may grant fewer scopes than were asked for and still return 200.
// A connection without business.manage cannot do the thing it exists for.

reset_google();
Credentials::save( 'id', 'secret' );
Tokens::save(
	array(
		'access_token'  => 'access-1',
		'refresh_token' => 'refresh-1',
		'expires_in'    => 3600,
		'scope'         => OAuth::SCOPE_EMAIL,
	)
);

check_same( Connection::STATUS_NEEDS_RECONNECT, Connection::status(), 'a connection missing business.manage needs reconnecting' );
check( false === Connection::state()['can_manage_profile'], 'and reports that it cannot manage the profile' );

// -- Disconnect ------------------------------------------------------------

reset_google();
Credentials::save( 'id', 'secret' );
Tokens::save(
	array(
		'access_token'  => 'access-1',
		'refresh_token' => 'refresh-1',
		'expires_in'    => 3600,
		'scope'         => OAuth::SCOPE_BUSINESS,
	)
);

queue_http( 200, '' );

$result = Connection::disconnect();

check( true === $result['revoked'], 'disconnect reports that Google confirmed' );
check( ! Tokens::exists(), 'the tokens are gone' );
check_same( OAuth::REVOKE_URL, last_request()['url'], 'the revocation went to the revoke endpoint' );
check_same( 'refresh-1', last_request()['args']['body']['token'], 'revoking the refresh token, which ends the whole grant' );

// Credentials survive a disconnect: the operator disconnected an account,
// not their Google Cloud project.
check( Credentials::configured(), 'the client credentials survive a disconnect' );

// Google refusing the revocation must not leave a usable token behind.
Tokens::save(
	array(
		'access_token'  => 'access-1',
		'refresh_token' => 'refresh-1',
		'expires_in'    => 3600,
		'scope'         => OAuth::SCOPE_BUSINESS,
	)
);

$GLOBALS['__http_queue'][] = new WP_Error( 'http_request_failed', 'down' );

$result = Connection::disconnect();

check( false === $result['revoked'], 'a refused revocation is reported' );
check( ! Tokens::exists(), 'but the tokens are cleared locally anyway' );

// -- The stored option holds only what it should ---------------------------

reset_google();
Tokens::save(
	array(
		'access_token'  => 'access-1',
		'refresh_token' => 'refresh-1',
		'expires_in'    => 3600,
		'scope'         => OAuth::SCOPE_BUSINESS,
	)
);

$stored = $GLOBALS['__options'][ Tokens::OPTION ];
ksort( $stored );

check_same(
	array( 'access_token', 'account_email', 'connected_at', 'expires_at', 'refresh_token', 'scope', 'token_type' ),
	array_keys( $stored ),
	'the token option holds exactly the expected keys'
);

finish( 'Google Business Profile' );
