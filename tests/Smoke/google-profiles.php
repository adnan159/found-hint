<?php
/**
 * Google business profiles and location mapping.
 *
 * Run with plain PHP: `php tests/Smoke/google-profiles.php`.
 *
 * Covers what can be proved without a database: how the client handles
 * Google's answers, how pages of locations are walked, how Google's shape
 * is flattened into ours, and how mapping candidates are scored.
 *
 * **Not covered: the repository SQL.** `GoogleLocationRepository` has never
 * run against MySQL, like every other repository here — see
 * docs/PROGRESS.md. The mapping *rules* are tested through `Mapping`, whose
 * scoring is pure.
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\App\Google\Client;
use FHINT\App\Google\Credentials;
use FHINT\App\Google\Mapping;
use FHINT\App\Google\OAuth;
use FHINT\App\Google\Profiles;
use FHINT\App\Google\Tokens;

echo "Google profiles and mapping\n";

/**
 * A connected site with a valid token, and nothing queued.
 *
 * @return void
 */
function reset_connected() {
	$GLOBALS['__options']       = array();
	$GLOBALS['__transients']    = array();
	$GLOBALS['__http_queue']    = array();
	$GLOBALS['__http_requests'] = array();

	Credentials::save( 'client-id', 'client-secret' );
	Tokens::save(
		array(
			'access_token'  => 'access-1',
			'refresh_token' => 'refresh-1',
			'expires_in'    => 3600,
			'scope'         => OAuth::SCOPE_BUSINESS,
		)
	);
}

/**
 * Every HTTP request made so far.
 *
 * @return array
 */
function requests() {
	return $GLOBALS['__http_requests'];
}

/**
 * The query string of one recorded request, parsed.
 *
 * @param int $index Request index.
 * @return array
 */
function request_query( $index ) {
	$all = requests();

	if ( ! isset( $all[ $index ] ) ) {
		return array();
	}

	$query = array();
	parse_str( (string) wp_parse_url( $all[ $index ]['url'], PHP_URL_QUERY ), $query );

	return $query;
}

// -- The client sends a bearer token ---------------------------------------

reset_connected();
queue_http( 200, array( 'accounts' => array() ) );

$result = Client::get( 'https://example.test/thing' );

check( is_array( $result ), 'a 200 returns the decoded body' );
check_same(
	'Bearer access-1',
	requests()[0]['args']['headers']['Authorization'],
	'the request carries the access token as a bearer'
);

// -- A 401 is retried exactly once, after a refresh -------------------------
//
// Google can reject a token this site still believes in. Retrying once
// after forcing a refresh turns that into a success; not retrying makes a
// recoverable blip look like a broken connection.

reset_connected();
queue_http( 401, array( 'error' => array( 'status' => 'UNAUTHENTICATED' ) ) );
queue_http( 200, array( 'access_token' => 'access-2', 'expires_in' => 3600 ) );
queue_http( 200, array( 'accounts' => array( array( 'name' => 'accounts/1' ) ) ) );

$result = Client::get( 'https://example.test/thing' );

check( is_array( $result ), 'a 401 followed by a refresh succeeds' );
check_same( 3, count( requests() ), 'exactly three requests: the 401, the refresh, the retry' );
check_same( OAuth::TOKEN_URL, requests()[1]['url'], 'the middle request is the token refresh' );
check_same(
	'Bearer access-2',
	requests()[2]['args']['headers']['Authorization'],
	'the retry uses the new token, not the rejected one'
);
check_same( 'refresh-1', Tokens::refresh_token(), 'the refresh token is untouched by the retry' );

// A second 401 is not retried again — that would be a loop against someone
// else's rate limit.
reset_connected();
queue_http( 401, array( 'error' => array( 'status' => 'UNAUTHENTICATED' ) ) );
queue_http( 200, array( 'access_token' => 'access-2', 'expires_in' => 3600 ) );
queue_http( 401, array( 'error' => array( 'status' => 'UNAUTHENTICATED' ) ) );

$result = Client::get( 'https://example.test/thing' );

check( $result instanceof WP_Error, 'a second 401 gives up' );
check_same( 3, count( requests() ), 'and does not keep retrying' );

// -- Errors an operator can act on -----------------------------------------

reset_connected();
queue_http( 403, array( 'error' => array( 'status' => 'PERMISSION_DENIED' ) ) );

$result = Client::get( 'https://example.test/thing' );

check( $result instanceof WP_Error, 'a 403 is an error' );
check(
	false !== strpos( $result->get_error_message(), 'approve your project' ),
	'and explains that Google has to approve the project, rather than blaming the operator\'s settings'
);

// -- "Over quota" usually means "not approved yet" ------------------------
//
// Google starts every project at a quota of zero for these APIs and lifts
// it only on approval, so an unapproved project's first request comes back
// as "quota exceeded" rather than "permission denied". Telling that
// operator to wait a few minutes is advice that can never come true —
// which is exactly what this plugin used to say.

/**
 * A Google quota error carrying the limit it applied.
 *
 * @param string|null $limit Quota limit value, or null to omit the detail.
 * @return array
 */
function quota_error( $limit ) {
	$error = array(
		'code'    => 429,
		'message' => "Quota exceeded for quota metric 'Requests' and limit 'Requests per minute'.",
		'status'  => 'RESOURCE_EXHAUSTED',
	);

	if ( null !== $limit ) {
		$error['details'] = array(
			array(
				'@type'    => 'type.googleapis.com/google.rpc.ErrorInfo',
				'reason'   => 'RATE_LIMIT_EXCEEDED',
				'domain'   => 'googleapis.com',
				'metadata' => array(
					'quota_limit_value' => $limit,
					'service'           => 'mybusinessbusinessinformation.googleapis.com',
				),
			),
		);
	}

	return array( 'error' => $error );
}

reset_connected();
queue_http( 429, quota_error( '0' ) );

$message = Client::get( 'https://example.test/thing' )->get_error_message();

check( false !== strpos( $message, 'not been approved' ), 'a quota of zero is explained as an unapproved project' );
check( false === strpos( $message, 'Wait a few minutes' ), 'and never tells the operator to wait, which would never help' );

// A real rate limit — the project has quota, it just used it up.
reset_connected();
queue_http( 429, quota_error( '300' ) );

$message = Client::get( 'https://example.test/thing' )->get_error_message();

check( false !== strpos( $message, 'rate limiting' ), 'a non-zero quota is described as rate limiting' );
check( false === strpos( $message, 'approved' ), 'and does not send the operator to Google for approval they already have' );

// Google did not say which. The message covers both rather than guessing.
reset_connected();
queue_http( 429, quota_error( null ) );

$message = Client::get( 'https://example.test/thing' )->get_error_message();

check( false !== strpos( $message, 'not approved' ), 'without the detail, approval is offered as the likely cause' );
check( false !== strpos( $message, 'too many requests' ), 'and rate limiting as the other' );

// A disconnected site does not reach the network at all.
$GLOBALS['__options']       = array();
$GLOBALS['__http_requests'] = array();

$result = Client::get( 'https://example.test/thing' );

check( $result instanceof WP_Error, 'a disconnected site cannot call Google' );
check_same( 'fhint_google_not_connected', $result->get_error_code(), 'and says so' );
check_same( 0, count( requests() ), 'without making a request' );

// -- Accounts, across pages ------------------------------------------------

reset_connected();
queue_http(
	200,
	array(
		'accounts'      => array(
			array( 'name' => 'accounts/1', 'accountName' => 'Northside Dental', 'type' => 'LOCATION_GROUP' ),
		),
		'nextPageToken' => 'page-2',
	)
);
queue_http(
	200,
	array(
		'accounts' => array(
			array( 'name' => 'accounts/2', 'accountName' => 'Second Group' ),
			array( 'accountName' => 'Nameless' ),
		),
	)
);

$accounts = Profiles::fetch_accounts();

check_same( 2, count( requests() ), 'both pages are requested' );
check_same( 2, count( $accounts ), 'and an account with no resource name is skipped' );
check_same( 'accounts/2', $accounts[1]['name'], 'the second page\'s account is included' );
check_same( 'accounts/1', $accounts[0]['name'], 'the first account is kept' );
check_same( 'Northside Dental', $accounts[0]['account_name'], 'with its display name' );
check_same( 'page-2', request_query( 1 )['pageToken'], 'the second request carries the page token' );
check( ! isset( request_query( 0 )['pageToken'] ), 'and the first does not' );

// -- Locations -------------------------------------------------------------

reset_connected();
queue_http(
	200,
	array(
		'locations' => array(
			array(
				'name'              => 'locations/456',
				'title'             => 'Northside Dental Care',
				'storeCode'         => 'DT-01',
				'storefrontAddress' => array(
					'addressLines'       => array( '401 Congress Ave', 'Suite 200' ),
					'locality'           => 'Austin',
					'administrativeArea' => 'TX',
					'postalCode'         => '78701',
					'regionCode'         => 'US',
				),
				'phoneNumbers'      => array( 'primaryPhone' => '+1 512 555 0134' ),
				'websiteUri'        => 'https://northsidedental.test',
				'metadata'          => array( 'canOperateLocalPost' => true ),
			),
		),
	)
);

$locations = Profiles::fetch_locations( 'accounts/1' );

check_same( 1, count( $locations ), 'the location is returned' );

$location = $locations[0];

check_same( 'locations/456', $location['location_name'], 'the resource name is kept as the identity' );
check_same( 'accounts/1', $location['account_name'], 'along with the owning account' );
check_same( 'Northside Dental Care', $location['title'], 'the title is flattened out' );
check_same( 'DT-01', $location['store_code'], 'and the store code' );
check_same( '+1 512 555 0134', $location['phone'], 'the primary phone is lifted out of phoneNumbers' );
check_same( 'https://northsidedental.test', $location['website'], 'and the website' );
check_same(
	'401 Congress Ave, Suite 200, Austin, TX, 78701, US',
	$location['address'],
	'the structured address becomes one line, address lines first'
);
check_same( 'OK', $location['verification_state'], 'an operable location reads as OK' );
check( isset( $location['payload']['metadata'] ), 'the raw object is kept for fields no column covers' );

// readMask is required by the Business Information API — a request without
// it is rejected outright rather than defaulting to everything.
$query = request_query( 0 );

check( ! empty( $query['readMask'] ), 'the request sends a readMask' );
check( false !== strpos( $query['readMask'], 'storefrontAddress' ), 'asking for the address' );
check( false !== strpos( $query['readMask'], 'title' ), 'and the title' );
check(
	false !== strpos( requests()[0]['url'], 'accounts%2F1/locations' ),
	'the account name is URL-encoded into the path'
);

// -- Locations Google says less about --------------------------------------

reset_connected();
queue_http(
	200,
	array(
		'locations' => array(
			array( 'name' => 'locations/789', 'title' => 'Bare' ),
			array( 'title' => 'No resource name' ),
		),
	)
);

$locations = Profiles::fetch_locations( 'accounts/1' );

check_same( 1, count( $locations ), 'a location with no resource name is skipped' );
check_same( '', $locations[0]['address'], 'a missing address flattens to an empty string, not a fatal' );
check_same( '', $locations[0]['phone'], 'and a missing phone' );
check_same( '', $locations[0]['verification_state'], 'and missing metadata leaves the state unknown' );

// Pending edits and limited locations are called out, because they change
// what an operator can expect after mapping.
reset_connected();
queue_http(
	200,
	array(
		'locations' => array(
			array( 'name' => 'locations/1', 'metadata' => array( 'hasPendingEdits' => true ) ),
			array( 'name' => 'locations/2', 'metadata' => array( 'canOperateLocalPost' => false ) ),
		),
	)
);

$locations = Profiles::fetch_locations( 'accounts/1' );

check_same( 'PENDING_EDITS', $locations[0]['verification_state'], 'pending edits are reported' );
check_same( 'LIMITED', $locations[1]['verification_state'], 'and a limited location is reported' );

// -- Pagination stops --------------------------------------------------------
//
// A nextPageToken that never clears would otherwise spin against Google
// until the request timed out.

reset_connected();

for ( $i = 0; $i < 30; $i++ ) {
	queue_http( 200, array( 'locations' => array( array( 'name' => 'locations/' . $i ) ), 'nextPageToken' => 'always' ) );
}

$locations = Profiles::fetch_locations( 'accounts/1' );

check_same( Profiles::MAX_PAGES, count( requests() ), 'pagination stops at the page limit' );
check_same( Profiles::MAX_PAGES, count( $locations ), 'returning what it read rather than nothing' );

// A failing page fails the whole read rather than returning half a profile
// list that looks complete.
reset_connected();
queue_http( 200, array( 'locations' => array( array( 'name' => 'locations/1' ) ), 'nextPageToken' => 'p2' ) );
queue_http( 500, array( 'error' => array( 'status' => 'INTERNAL' ) ) );

$result = Profiles::fetch_locations( 'accounts/1' );

check( $result instanceof WP_Error, 'a failed page fails the read' );

// -- Mapping suggestions ---------------------------------------------------
//
// Candidates only. Nothing is ever mapped automatically: two branches on
// one street can look nearly identical, and a confident wrong answer here
// ends with one branch's details published to another.

$google_locations = array(
	array(
		'location_name'     => 'locations/1',
		'title'             => 'Northside Dental Care',
		'address'           => '401 Congress Ave, Austin, TX, 78701, US',
		'fhint_location_id' => 0,
	),
	array(
		'location_name'     => 'locations/2',
		'title'             => 'Southside Dental',
		'address'           => '99 Other Road, Austin, TX, 78702, US',
		'fhint_location_id' => 0,
	),
	array(
		'location_name'     => 'locations/3',
		'title'             => 'Northside Dental Care',
		'address'           => '401 Congress Ave, Austin, TX, 78701, US',
		'fhint_location_id' => 12,
	),
);

$ours = array(
	'name'           => 'Northside Dental Care',
	'address_line_1' => '401 Congress Ave',
	'postal_code'    => '78701',
);

$suggestions = Mapping::suggestions( $ours, $google_locations );

check( count( $suggestions ) > 0, 'a matching location is suggested' );
check_same( 'locations/1', $suggestions[0]['location_name'], 'the best match comes first' );
check(
	! in_array( 'locations/3', array_column( $suggestions, 'location_name' ), true ),
	'a location already mapped elsewhere is never suggested'
);

// Nothing in common, nothing suggested — an empty list is a better answer
// than a bad guess.
$unrelated = Mapping::suggestions(
	array( 'name' => 'Completely Different', 'address_line_1' => '1 Nowhere St', 'postal_code' => 'ZZ1' ),
	$google_locations
);

check_same( 0, count( $unrelated ), 'nothing plausible means no suggestions' );

// A name match alone is weaker than a name and address match.
$name_only = Mapping::suggestions(
	array( 'name' => 'Southside Dental', 'address_line_1' => '', 'postal_code' => '' ),
	$google_locations
);

check_same( 'locations/2', $name_only[0]['location_name'], 'a name-only match still surfaces' );

// At most three, so the control stays a shortlist rather than the whole
// account.
$many = array();

for ( $i = 0; $i < 10; $i++ ) {
	$many[] = array(
		'location_name'     => 'locations/' . $i,
		'title'             => 'Northside Dental Care',
		'address'           => '401 Congress Ave',
		'fhint_location_id' => 0,
	);
}

check_same( 3, count( Mapping::suggestions( $ours, $many ) ), 'suggestions are capped at three' );

finish( 'Google profiles and mapping' );
