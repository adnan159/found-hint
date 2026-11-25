<?php
/**
 * Google's business categories: searching Google's list, and storing a choice.
 *
 * Run with plain PHP: `php tests/Smoke/google-categories.php`.
 *
 * A category is what decides which searches a business appears in, and what
 * Google is sent is an id, not the name a person picked. The list itself is
 * Google's and is read from Google, so what is proved here is what this
 * plugin does with Google's answers: the thing meant comes first, the noise
 * of Google's broad filter is dropped, answers are cached, nothing is asked
 * without a connection, and a save never waits on Google.
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\App\Business\Business;
use FHINT\App\Google\Categories;
use FHINT\App\Google\OAuth;
use FHINT\App\Google\Tokens;

echo "Google categories\n";

/**
 * Forget the connection, the cache and the HTTP log.
 *
 * @return void
 */
function fhint_reset_categories() {
	$GLOBALS['__options']       = array();
	$GLOBALS['__transients']    = array();
	$GLOBALS['__http_queue']    = array();
	$GLOBALS['__http_requests'] = array();

	$memo = new ReflectionProperty( Categories::class, 'memo' );
	$memo->setAccessible( true );
	$memo->setValue( null, array() );
}

/**
 * Connect a Google account with a fresh token.
 *
 * @return void
 */
function fhint_connect() {
	Tokens::save(
		array(
			'access_token'  => 'ya29.test',
			'refresh_token' => '1//refresh',
			'expires_in'    => 3600,
			'scope'         => OAuth::SCOPE_BUSINESS,
		),
		array(
			'account_email' => 'owner@example.test',
			'connected_at'  => time(),
		)
	);
}

/**
 * One of Google's category entries.
 *
 * @param string $id   e.g. 'gcid:dentist'.
 * @param string $name Display name.
 * @return array
 */
function fhint_gcat( $id, $name ) {
	return array(
		'name'        => 'categories/' . $id,
		'displayName' => $name,
	);
}

/**
 * The validation codes for a business record, by field.
 *
 * @param array $changes Fields to set on an otherwise valid business.
 * @return array<string, string>
 */
function fhint_category_errors( array $changes ) {
	$record = array_merge( Business::blank(), array( 'name' => 'Northside Dental Care' ), Business::sanitize( $changes ) );

	return Business::validate( $record )->errors();
}

// ── without a Google connection ─────────────────────────────────────────

fhint_reset_categories();

check_same( array(), Categories::search( 'dentist' )['items'], 'with no connection a search finds nothing' );
check_same( 0, count( $GLOBALS['__http_requests'] ), 'and asks nobody' );
check_same( null, Categories::find( 'gcid:dentist' ), 'nor is a name looked up' );
check_same( 'meta', 'google' === Categories::meta()['source'] ? 'meta' : 'other', 'the list is said to be Google\'s' );

check( Categories::exists( 'gcid:dentist' ), 'an id shaped like Google\'s is accepted' );
check( Categories::exists( 'categories/gcid:dentist' ), 'Google\'s full resource name too' );
check( Categories::exists( ' GCID:Dentist ' ), 'whatever its case or padding' );
check( ! Categories::exists( 'dentist' ), 'a bare word is not an id' );
check( ! Categories::exists( 'gcid:Bad Id!' ), 'nor is anything with spaces or punctuation' );
check( ! Categories::exists( '' ), 'nor is nothing' );

check_same( 'categories/gcid:dentist', Categories::resource_name( 'GCID:dentist' ), 'the resource name is what Google\'s API is sent' );
check_same( '', Categories::resource_name( 'not an id' ), 'and there is none for a malformed id' );

check_same( array( 'id' => 'gcid:dentist', 'name' => 'Dentist' ), Categories::resolve( array( 'id' => 'categories/gcid:dentist', 'name' => 'Dentist' ) ), 'an id sent with its name keeps both, normalised' );
check_same( array( 'id' => 'gcid:dentist', 'name' => 'Dentist' ), Categories::resolve( 'gcid:dentist' ), 'an id alone, with Google out of reach, gets a readable name from the id' );
check_same( 'Pet store', Categories::resolve( 'gcid:pet_store' )['name'], 'underscores read as spaces' );
check_same( array( 'id' => '', 'name' => 'Made up' ), Categories::resolve( 'Made up' ), 'a name that cannot be matched keeps no id' );

// ── searching Google ────────────────────────────────────────────────────

fhint_reset_categories();
fhint_connect();

// Google's filter is broad: it answers "dent" with a deli and a passport
// office too. Those must not reach the person choosing.
queue_http(
	200,
	array(
		'categories' => array(
			fhint_gcat( 'gcid:auto_dent_removal_service', 'Auto dent removal service' ),
			fhint_gcat( 'gcid:cosmetic_dentist', 'Cosmetic dentist' ),
			fhint_gcat( 'gcid:deli', 'Deli' ),
			fhint_gcat( 'gcid:dental_clinic', 'Dental clinic' ),
			fhint_gcat( 'gcid:dentist', 'Dentist' ),
			fhint_gcat( 'gcid:passport_office', 'Passport office' ),
			array( 'name' => 'categories/not-an-id', 'displayName' => 'Broken' ),
			array( 'displayName' => 'No id at all' ),
		),
	)
);

$fhint_result = Categories::search( 'dent' );
$fhint_names  = array_column( $fhint_result['items'], 'name' );

check_same( array( 'Dentist', 'Dental clinic', 'Cosmetic dentist', 'Auto dent removal service' ), $fhint_names, 'names starting with the search lead, shortest first, then a word starting with it' );
check( ! in_array( 'Deli', $fhint_names, true ) && ! in_array( 'Passport office', $fhint_names, true ), 'Google\'s loose matches are dropped' );
check( ! in_array( 'Broken', $fhint_names, true ) && ! in_array( 'No id at all', $fhint_names, true ), 'and so is anything without a real id' );
check_same( 4, $fhint_result['total'], 'the total counts what is shown' );
check_same( array( 'id' => 'gcid:dentist', 'name' => 'Dentist' ), $fhint_result['items'][0], 'each result is the id and Google\'s name' );

$fhint_request = $GLOBALS['__http_requests'][0];

check( 0 === strpos( $fhint_request['url'], Categories::LIST_URL ), 'the search asks Google\'s categories endpoint' );
check( false !== strpos( $fhint_request['url'], 'filter=displayName%3Ddent' ), 'with what was typed as its filter' );
check( false !== strpos( $fhint_request['url'], 'regionCode=US' ) && false !== strpos( $fhint_request['url'], 'languageCode=en' ), 'in a region and a language' );

check_same( $fhint_names, array_column( Categories::search( '  DENT ' )['items'], 'name' ), 'case and stray spaces ask the same question' );
check_same( 1, count( $GLOBALS['__http_requests'] ), 'and the cached answer is used: Google is asked once' );

check_same( array( 'Dental clinic' ), array_column( Categories::search( 'dent', 1, 1 )['items'], 'name' ), 'paging skips and caps' );
$fhint_many = array();
for ( $i = 1; $i <= 60; $i++ ) {
	$fhint_many[] = fhint_gcat( 'gcid:shop_' . $i, 'Shop ' . $i );
}
queue_http( 200, array( 'categories' => $fhint_many ) );
check_same( Categories::MAX_RESULTS, count( Categories::search( 'shop', 5000 )['items'] ), 'a search never returns more than the cap' );

queue_http( 200, array( 'categories' => array( fhint_gcat( 'gcid:dental_clinic', 'Dental clinic' ) ) ) );
check_same( array( 'Dental clinic' ), array_column( Categories::search( 'clinic dental' )['items'], 'name' ), 'words are matched in any order' );

queue_http( 500, array( 'error' => array( 'message' => 'Backend error' ) ) );
check_same( array(), Categories::search( 'plumber' )['items'], 'when Google fails, a search finds nothing rather than breaking' );
queue_http( 200, array( 'categories' => array( fhint_gcat( 'gcid:plumber', 'Plumber' ) ) ) );
check_same( array( 'Plumber' ), array_column( Categories::search( 'plumber' )['items'], 'name' ), 'and a failure is not cached: the next search asks again' );

check_same( array(), Categories::search( '' )['items'], 'an empty search asks nothing' );

// ── ids and exact names ─────────────────────────────────────────────────

fhint_reset_categories();
fhint_connect();

queue_http( 200, array( 'categories' => array( fhint_gcat( 'gcid:dentist', 'Dentist' ) ) ) );

check_same( array( 'Dentist' ), array_column( Categories::search( 'gcid:dentist' )['items'], 'name' ), 'searching for an id returns exactly that category' );
check( false !== strpos( end( $GLOBALS['__http_requests'] )['url'], Categories::BATCH_URL ), 'looked up by id' );
check_same( 'Dentist', Categories::find( 'categories/gcid:dentist' )['name'], 'a looked-up name is remembered' );
check_same( 1, count( $GLOBALS['__http_requests'] ), 'without asking again' );
check_same( array( 'id' => 'gcid:dentist', 'name' => 'Dentist' ), Categories::resolve( 'gcid:dentist' ), 'an id alone resolves to Google\'s name' );

queue_http( 200, array( 'categories' => array() ) );
check_same( null, Categories::find( 'gcid:not_a_real_category' ), 'an id Google does not know is not found' );

queue_http(
	200,
	array(
		'categories' => array(
			fhint_gcat( 'gcid:dental_clinic', 'Dental clinic' ),
			fhint_gcat( 'gcid:dentist', 'Dentist' ),
		),
	)
);
check_same( 'gcid:dentist', Categories::find_by_name( 'DENTIST' )['id'], 'a category is found by its exact name, ignoring case' );
check_same( null, Categories::find_by_name( 'dent' ), 'but not by part of a name — a near miss would attach the wrong business type' );
check_same( array( 'id' => 'gcid:dentist', 'name' => 'Dentist' ), Categories::resolve( 'dentist' ), 'so a typed name Google uses is tied to its id' );

// ── what a save stores and accepts ──────────────────────────────────────
//
// Connected on purpose: Google could be asked, and must not be.

fhint_reset_categories();
fhint_connect();

// A choice comes from a search: the search is what teaches the names.
queue_http(
	200,
	array(
		'categories' => array(
			fhint_gcat( 'gcid:dental_clinic', 'Dental clinic' ),
			fhint_gcat( 'gcid:dentist', 'Dentist' ),
		),
	)
);
Categories::search( 'dent' );
$GLOBALS['__http_requests'] = array();

$memo = new ReflectionProperty( Categories::class, 'memo' );
$memo->setAccessible( true );
$memo->setValue( null, array() );

$fhint_clean = Business::sanitize(
	array(
		'primary_category_id' => 'categories/gcid:dentist',
		'primary_category'    => 'Dentist',
	)
);

check_same( 'gcid:dentist', $fhint_clean['primary_category_id'], 'choosing a category stores Google\'s id' );
check_same( 'Dentist', $fhint_clean['primary_category'], 'with Google\'s name beside it' );
check_same( 0, count( $GLOBALS['__http_requests'] ), 'and the save asks Google nothing: the search already said' );

// A name carried over from another category must not end up beside this id.
$fhint_clean = Business::sanitize(
	array(
		'primary_category_id' => 'gcid:dentist',
		'primary_category'    => 'Pet store',
	)
);
check_same( 'Dentist', $fhint_clean['primary_category'], 'a stale name sent with an id is replaced by Google\'s' );

// An id sent with a name, not yet known: no request is spent on it.
$GLOBALS['__http_requests'] = array();
$fhint_clean = Business::sanitize(
	array(
		'primary_category_id' => 'gcid:pet_store',
		'primary_category'    => 'Pet store',
	)
);
check_same( 'Pet store', $fhint_clean['primary_category'], 'an unknown id keeps the name it came with' );
check_same( 0, count( $GLOBALS['__http_requests'] ), 'without asking Google' );

$fhint_clean = Business::sanitize( array( 'primary_category' => 'Tooth wizard' ) );
check_same( 'Tooth wizard', $fhint_clean['primary_category'], 'a freehand category is still kept' );
check_same( '', $fhint_clean['primary_category_id'], 'but carries no id' );

check( ! array_key_exists( 'primary_category_id', Business::sanitize( array( 'phone' => '+1 512 555 0134' ) ) ), 'a save that does not mention the category leaves it alone' );

$GLOBALS['__http_requests'] = array();

check_same( array(), fhint_category_errors( array( 'primary_category_id' => 'gcid:dentist', 'primary_category' => 'Dentist' ) ), 'a category id is accepted' );
check_same( array( 'business.category_id.unknown' ), fhint_category_errors( array( 'primary_category_id' => 'not an id' ) )['primary_category_id'] ?? array(), 'a malformed one is refused' );

check_same(
	array(),
	fhint_category_errors(
		array(
			'primary_category_id'  => 'gcid:dentist',
			'primary_category'     => 'Dentist',
			'secondary_categories' => array( array( 'id' => 'gcid:dental_clinic', 'name' => 'Dental clinic' ) ),
		)
	),
	'additional categories with ids are accepted'
);
check_same(
	array( 'business.categories.includes_primary' ),
	fhint_category_errors(
		array(
			'primary_category_id'  => 'gcid:dentist',
			'primary_category'     => 'Dentist',
			'secondary_categories' => array( array( 'id' => 'gcid:dentist', 'name' => 'Dentist' ) ),
		)
	)['secondary_categories'] ?? array(),
	'but not one repeating the primary'
);
check_same( 0, count( $GLOBALS['__http_requests'] ), 'validating ids never asks Google' );

// An id that arrives without its name is looked up once, for the name.
queue_http( 200, array( 'categories' => array( fhint_gcat( 'gcid:dentist', 'Dentist' ) ) ) );
check_same( 'Dentist', Business::sanitize( array( 'primary_category_id' => 'gcid:dentist' ) )['primary_category'] ?? '', 'an id sent alone gets Google\'s name' );

// A bare name has no id to check; it is looked up in Google's list (and
// kept without an id when it is not there).
check_same( array(), fhint_category_errors( array( 'primary_category' => 'Tooth wizard' ) ), 'a freehand category with no id is not an error' );
check_same(
	array( 'business.categories.unknown' ),
	fhint_category_errors( array( 'secondary_categories' => array( 'Made up' ) ) )['secondary_categories'] ?? array(),
	'and not one without an id'
);

finish( 'Google categories' );
