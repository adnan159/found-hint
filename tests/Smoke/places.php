<?php
/**
 * Places lookup, comparison and retention.
 *
 * Run with plain PHP: `php tests/Smoke/places.php`.
 *
 * Google is never called; every answer comes from the harness queue. Two
 * things here are not ordinary feature tests and should not be deleted if
 * they ever look redundant:
 *
 * - **the field masks**, because they are what stops this plugin receiving
 *   content it is not allowed to keep; and
 * - **the retention boundary**, because Google's permission to hold
 *   coordinates is conditional on deleting them, and a silent regression
 *   would leave the plugin in breach while looking perfectly healthy.
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\App\Places\Client;
use FHINT\App\Places\Comparison;
use FHINT\App\Places\Credentials;
use FHINT\App\Places\Place;
use FHINT\App\Places\Retention;

echo "Places\n";

/**
 * Forget everything between cases.
 *
 * @return void
 */
function reset_places() {
	$GLOBALS['__options']       = array();
	$GLOBALS['__http_queue']    = array();
	$GLOBALS['__http_requests'] = array();
}

/**
 * The arguments of the last HTTP request made.
 *
 * @return array
 */
function places_last_request() {
	$requests = $GLOBALS['__http_requests'];

	return $requests ? end( $requests ) : array();
}

/**
 * A details response, with overrides merged in.
 *
 * @param array $overrides Fields to replace.
 * @return array
 */
function place_payload( array $overrides = array() ) {
	return array_merge(
		array(
			'id'                  => 'ChIJtest',
			'displayName'         => array( 'text' => 'Harbour Coffee' ),
			'formattedAddress'    => '12 Dock Road, Bristol BS1 4XY, UK',
			'nationalPhoneNumber' => '0117 496 0000',
			'websiteUri'          => 'https://harbourcoffee.example/',
			'googleMapsUri'       => 'https://maps.google.com/?cid=1',
			'businessStatus'      => 'OPERATIONAL',
			'location'            => array(
				'latitude'  => 51.4491,
				'longitude' => -2.5987,
			),
			'addressComponents'   => array(
				array(
					'longText'  => '12',
					'shortText' => '12',
					'types'     => array( 'street_number' ),
				),
				array(
					'longText'  => 'Dock Road',
					'shortText' => 'Dock Rd',
					'types'     => array( 'route' ),
				),
				array(
					'longText'  => 'Bristol',
					'shortText' => 'Bristol',
					'types'     => array( 'postal_town' ),
				),
				array(
					'longText'  => 'BS1 4XY',
					'shortText' => 'BS1 4XY',
					'types'     => array( 'postal_code' ),
				),
				array(
					'longText'  => 'United Kingdom',
					'shortText' => 'GB',
					'types'     => array( 'country', 'political' ),
				),
			),
		),
		$overrides
	);
}

/**
 * Opening periods for a nine-to-five weekday.
 *
 * @param int $day    Day number, 0 = Sunday.
 * @param int $open   Opening hour.
 * @param int $close  Closing hour.
 * @return array
 */
function place_period( $day, $open = 9, $close = 17 ) {
	return array(
		'open'  => array(
			'day'    => $day,
			'hour'   => $open,
			'minute' => 0,
		),
		'close' => array(
			'day'    => $day,
			'hour'   => $close,
			'minute' => 0,
		),
	);
}

/**
 * Our own hours payload for one day.
 *
 * @param int    $day        Day number.
 * @param array  $periods    Periods.
 * @param bool   $configured Whether the day is configured at all.
 * @return array
 */
function our_day( $day, array $periods, $configured = true ) {
	return array(
		'day_of_week' => $day,
		'day_name'    => 'Day ' . $day,
		'configured'  => $configured,
		'periods'     => $periods,
	);
}

/**
 * One of our periods.
 *
 * @param string $open  Open time.
 * @param string $close Close time.
 * @return array
 */
function our_period( $open, $close ) {
	return array(
		'period_index' => 0,
		'open_time'    => $open,
		'close_time'   => $close,
		'is_closed'    => false,
		'is_24h'       => false,
		'is_overnight' => false,
	);
}

// -- The key is write-only ------------------------------------------------

reset_places();

check( ! Credentials::configured(), 'no key to begin with' );
check_same( '', Credentials::hint(), 'no hint without a key' );

Credentials::save( 'AIzaSyEXAMPLEKEYVALUE12345' );

check( Credentials::configured(), 'key stored' );

$hint = Credentials::hint();

check( false === strpos( 'AIzaSyEXAMPLEKEYVALUE12345', $hint ), 'the hint is not a substring of the key' );
check( false === strpos( $hint, 'VALUE12345' ), 'the hint does not reveal the tail of the key' );
check_same( 'AIzaSyE', substr( $hint, 0, 7 ), 'the hint shows the head of the key' );

// Saving an empty string keeps what is stored, so a screen that never shows
// the key can still be saved.
Credentials::save( '' );
check_same( 'AIzaSyEXAMPLEKEYVALUE12345', Credentials::api_key(), 'an empty save keeps the stored key' );

Credentials::clear();
check( ! Credentials::configured(), 'the key can be removed' );

// -- The request carries the key in a header, never the URL ---------------

reset_places();
Credentials::save( 'AIzaSyEXAMPLEKEYVALUE12345' );

queue_http( 200, array( 'places' => array() ) );
Client::search( 'Harbour Coffee Bristol' );

$request = places_last_request();

check_same( 'POST', $request['method'], 'a search is a POST' );
check( false === strpos( $request['url'], 'AIza' ), 'the key is not in the URL' );
check_same( 'AIzaSyEXAMPLEKEYVALUE12345', $request['args']['headers']['X-Goog-Api-Key'], 'the key travels as a header' );

// -- The field masks ask for nothing we may not receive -------------------

check_same(
	'places.id,places.displayName,places.formattedAddress',
	$request['args']['headers']['X-Goog-FieldMask'],
	'the search mask asks only for what chooses between candidates'
);

reset_places();
Credentials::save( 'AIza-key' );
queue_http( 200, place_payload() );
Client::details( 'ChIJtest' );

$mask = places_last_request()['args']['headers']['X-Goog-FieldMask'];

check( false === strpos( $mask, 'review' ), 'the details mask asks for no reviews' );
check( false === strpos( $mask, 'photo' ), 'the details mask asks for no photos' );
check( false !== strpos( $mask, 'regularOpeningHours' ), 'the details mask asks for opening hours' );
check( false !== strpos( $mask, 'location' ), 'the details mask asks for coordinates' );

// -- A missing key is refused before any request is made ------------------

reset_places();

$result = Client::search( 'anything' );

check( is_wp_error( $result ), 'searching without a key is refused' );
check_same( 'fhint_places_not_configured', $result->get_error_code(), 'and says which credential is missing' );
check_same( array(), $GLOBALS['__http_requests'], 'nothing was sent' );

// -- Google's refusals are translated into something actionable -----------

reset_places();
Credentials::save( 'AIza-key' );

queue_http(
	403,
	array(
		'error' => array(
			'status'  => 'PERMISSION_DENIED',
			'message' => 'This API project is not authorized. Billing must be enabled.',
		),
	)
);

$result = Client::details( 'ChIJtest' );

check( is_wp_error( $result ), 'a 403 is an error' );
check( false !== stripos( $result->get_error_message(), 'billing' ), 'a billing refusal says so' );

reset_places();
Credentials::save( 'AIza-key' );
queue_http(
	403,
	array(
		'error' => array(
			'status'  => 'PERMISSION_DENIED',
			'message' => 'Requests from referer <empty> are blocked.',
		),
	)
);

$result = Client::details( 'ChIJtest' );

check( false !== stripos( $result->get_error_message(), 'restrict' ), 'a referrer restriction is explained as a restriction' );

// -- Normalising a place --------------------------------------------------

$place = Place::from_details( place_payload() );

check_same( 'ChIJtest', $place['place_id'], 'the place id survives' );
check_same( 'Harbour Coffee', $place['name'], 'the display name is unwrapped' );
check_same( '12 Dock Road', $place['address']['line_1'], 'number and route make the first line' );
check_same( 'Bristol', $place['address']['city'], 'the postal town is the city' );
check_same( 'BS1 4XY', $place['address']['postal'], 'the postcode survives' );
check_same( 'GB', $place['address']['country'], 'the country is the two-letter form we store' );
check_same( 51.4491, $place['coordinates']['latitude'], 'coordinates survive' );
check( $place['coordinates']['has_both'], 'both coordinates are present' );

// A place with no hours at all leaves every day unknown, rather than closed.
check( ! $place['hours']['has_any_hours'], 'no periods means no hours' );

foreach ( $place['hours']['days'] as $day ) {
	check( ! $day['configured'], 'day ' . $day['day_of_week'] . ' is unknown, not closed' );
}

// -- Hours: the three states ----------------------------------------------

$with_hours = Place::from_details(
	place_payload(
		array(
			'regularOpeningHours' => array(
				'periods' => array(
					place_period( 1 ),
					place_period( 2 ),
				),
			),
		)
	)
);

$by_day = array();

foreach ( $with_hours['hours']['days'] as $day ) {
	$by_day[ $day['day_of_week'] ] = $day;
}

check_same( '09:00', $by_day[1]['periods'][0]['open_time'], 'Monday opens at nine' );
check_same( '17:00', $by_day[1]['periods'][0]['close_time'], 'Monday closes at five' );
check( $by_day[3]['configured'], 'a day Google omits is still configured when the place publishes hours' );
check( $by_day[3]['periods'][0]['is_closed'], 'and is reported closed, which is how Google models it' );

// A period with no close is around the clock, not a broken record.
$always = Place::from_details(
	place_payload(
		array(
			'regularOpeningHours' => array(
				'periods' => array(
					array(
						'open' => array(
							'day'    => 0,
							'hour'   => 0,
							'minute' => 0,
						),
					),
				),
			),
		)
	)
);

$sunday = null;

foreach ( $always['hours']['days'] as $day ) {
	if ( 0 === $day['day_of_week'] ) {
		$sunday = $day;
	}
}

check( $sunday['periods'][0]['is_24h'], 'a period with no close is 24 hours' );

// An overnight period belongs to the day it opens.
$overnight = Place::from_details(
	place_payload(
		array(
			'regularOpeningHours' => array(
				'periods' => array(
					array(
						'open'  => array(
							'day'    => 5,
							'hour'   => 20,
							'minute' => 0,
						),
						'close' => array(
							'day'    => 6,
							'hour'   => 2,
							'minute' => 0,
						),
					),
				),
			),
		)
	)
);

foreach ( $overnight['hours']['days'] as $day ) {
	if ( 5 === $day['day_of_week'] ) {
		check( $day['periods'][0]['is_overnight'], 'a period closing after midnight is overnight' );
		check_same( '20:00', $day['periods'][0]['open_time'], 'and keeps its opening time' );
	}
}

// -- Candidates -----------------------------------------------------------

$candidates = Place::candidates(
	array(
		'places' => array(
			array(
				'id'               => 'ChIJone',
				'displayName'      => array( 'text' => 'Harbour Coffee' ),
				'formattedAddress' => '12 Dock Road',
			),
			// No id: cannot be chosen, so must not be offered.
			array(
				'displayName'      => array( 'text' => 'Harbour Coffee Kiosk' ),
				'formattedAddress' => '4 Quay Street',
			),
		),
	)
);

check_same( 1, count( $candidates ), 'a candidate with no id is dropped' );
check_same( 'ChIJone', $candidates[0]['place_id'], 'the usable candidate survives' );

// -- Comparison -----------------------------------------------------------

$nap = array(
	'name'    => 'Harbour Coffee',
	'phone'   => '0117 496 0000',
	'website' => 'http://www.harbourcoffee.example',
	'address' => array( 'formatted' => '12 Dock Road, Bristol, BS1 4XY' ),
	'hours'   => array( 'days' => array() ),
);

$result = Comparison::build( Place::from_details( place_payload() ), $nap );
$fields = array();

foreach ( $result['fields'] as $field ) {
	$fields[ $field['key'] ] = $field;
}

check_same( Comparison::MATCH, $fields['name']['status'], 'identical names match' );
check_same( Comparison::MATCH, $fields['phone']['status'], 'the same phone matches' );
check_same( Comparison::MATCH, $fields['website']['status'], 'http/www differences are not differences' );
check_same( Comparison::MATCH, $fields['address']['status'], 'a country suffix is not an address difference' );
check_same( 0, $result['summary']['attention'], 'nothing needs attention when everything agrees' );

// Both values are returned, because the screen shows them side by side.
check_same( 'Harbour Coffee', $fields['name']['ours'], 'our value is returned' );
check_same( 'Harbour Coffee', $fields['name']['theirs'], "Google's value is returned" );

// A real difference is reported as one.
$different = Comparison::build(
	Place::from_details( place_payload( array( 'nationalPhoneNumber' => '0117 496 9999' ) ) ),
	$nap
);

$phone = null;

foreach ( $different['fields'] as $field ) {
	if ( 'phone' === $field['key'] ) {
		$phone = $field;
	}
}

check_same( Comparison::DIFFERS, $phone['status'], 'a different number differs' );
check_same( 1, $different['summary']['attention'], 'and counts as something to look at' );

// International and national renderings of one number agree.
$international = Comparison::build(
	Place::from_details( place_payload( array( 'nationalPhoneNumber' => '+44 117 496 0000' ) ) ),
	$nap
);

foreach ( $international['fields'] as $field ) {
	if ( 'phone' === $field['key'] ) {
		check_same( Comparison::MATCH, $field['status'], 'a country code is not a difference' );
	}
}

// A value we do not hold is missing here, not different.
$blank = $nap;
$blank['phone'] = '';

$missing = Comparison::build( Place::from_details( place_payload() ), $blank );

foreach ( $missing['fields'] as $field ) {
	if ( 'phone' === $field['key'] ) {
		check_same( Comparison::MISSING_HERE, $field['status'], 'a value only Google has is missing here' );
	}
}

// Neither side knowing is unknown, and is not something to fix.
$empty = array(
	'name'    => '',
	'phone'   => '',
	'website' => '',
	'address' => array( 'formatted' => '' ),
	'hours'   => array( 'days' => array() ),
);

$nothing = Comparison::build(
	Place::from_details(
		array(
			'id'          => 'ChIJtest',
			'displayName' => array( 'text' => '' ),
		)
	),
	$empty
);

check_same( 0, $nothing['summary']['attention'], 'two blanks are not a finding' );
check_same( 4, $nothing['summary']['unknown'], 'they are unknown' );

// -- Comparing hours ------------------------------------------------------

$ours_hours = $nap;
$ours_hours['hours'] = array(
	'days' => array(
		our_day( 1, array( our_period( '09:00', '17:00' ) ) ),
		our_day( 2, array( our_period( '09:00', '18:00' ) ) ),
		our_day( 3, array(), false ),
	),
);

$theirs = Place::from_details(
	place_payload(
		array(
			'regularOpeningHours' => array(
				'periods' => array(
					place_period( 1 ),
					place_period( 2 ),
					place_period( 3 ),
				),
			),
		)
	)
);

$hours = Comparison::build( $theirs, $ours_hours )['hours'];
$days  = array();

foreach ( $hours['days'] as $day ) {
	$days[ $day['day_of_week'] ] = $day;
}

check_same( Comparison::MATCH, $days[1]['status'], 'the same Monday matches' );
check_same( Comparison::DIFFERS, $days[2]['status'], 'a half-hour difference on Tuesday is a difference' );
check_same( Comparison::MISSING_HERE, $days[3]['status'], 'a day we never configured is missing here, not different' );
check_same( 1, $hours['differing'], 'one day differs' );

// -- Retention ------------------------------------------------------------

check_same( 30, Retention::DAYS, "Google's permission is 30 days and the code says so" );

$now       = current_time( 'mysql', true );
$yesterday = gmdate( 'Y-m-d H:i:s', time() - DAY_IN_SECONDS );
$day_29    = gmdate( 'Y-m-d H:i:s', time() - ( 29 * DAY_IN_SECONDS ) );
$day_31    = gmdate( 'Y-m-d H:i:s', time() - ( 31 * DAY_IN_SECONDS ) );

check( Retention::is_fresh( $now ), 'coordinates read now are fresh' );
check( Retention::is_fresh( $day_29 ), 'day 29 is still inside the permission' );
check( ! Retention::is_fresh( $day_31 ), 'day 31 is outside it' );
check( ! Retention::is_fresh( '' ), 'nothing held is not fresh' );

check_same( 30, Retention::days_left( $now ), 'a fresh pair has the full window' );
check_same( 29, Retention::days_left( $yesterday ), 'a day-old pair has 29 left' );
check_same( 0, Retention::days_left( $day_31 ), 'an expired pair has none' );
check_same( 0, Retention::days_left( '' ), 'nothing held has none' );

// The cutoff is what the repository deletes against, so it must be a plain
// UTC datetime 30 days back — not a timestamp, and not local time.
$cutoff = Retention::cutoff();

check( 1 === preg_match( '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $cutoff ), 'the cutoff is a MySQL datetime' );
check( $cutoff < $now, 'the cutoff is in the past' );
check( $cutoff < $day_29 && $cutoff > $day_31, 'the cutoff falls between day 29 and day 31' );

finish( 'Places' );
