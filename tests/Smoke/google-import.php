<?php
/**
 * Importing a Google Business Profile.
 *
 * Run with plain PHP: `php tests/Smoke/google-import.php`.
 *
 * The parts that matter here are the ones a wrong answer would quietly
 * corrupt somebody's website with: Google's day names mapped to the right
 * days, an overnight shift filed under the day it opens, a location with no
 * hours staying *unset* rather than becoming a week of closed days, and the
 * rule that decides what is ticked before an operator looks.
 *
 * The writing side needs a database and is covered in
 * tests/Integration/database.php.
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\App\Google\Import;
use FHINT\App\Location\DayOfWeek;

echo "Google import\n";

/**
 * Reach one of the class's private helpers.
 *
 * The mapping is the whole feature; testing it only through a REST route
 * would need a database and would prove less.
 *
 * @param string $method Method name.
 * @param array  $args   Arguments.
 * @return mixed
 */
function import_call( $method, array $args ) {
	// setAccessible() is a no-op since PHP 8.1 and deprecated in 8.5; a
	// private static method is reachable without it.
	return ( new ReflectionMethod( Import::class, $method ) )->invokeArgs( null, $args );
}

/**
 * A Google location, with overrides merged in.
 *
 * @param array $overrides Fields to replace.
 * @return array
 */
function google_location( array $overrides = array() ) {
	return array_merge(
		array(
			'name'              => 'locations/12345',
			'title'             => 'Harbour Coffee',
			'storefrontAddress' => array(
				'addressLines'       => array( '12 Dock Road', 'Unit 4' ),
				'locality'           => 'Bristol',
				'administrativeArea' => 'England',
				'postalCode'         => 'BS1 4XY',
				'regionCode'         => 'GB',
			),
			'phoneNumbers'      => array( 'primaryPhone' => '0117 496 0000' ),
			'websiteUri'        => 'https://harbourcoffee.example',
			'profile'           => array( 'description' => 'Coffee by the water.' ),
		),
		$overrides
	);
}

/**
 * A Google opening period.
 *
 * @param string $open_day   Opening day name.
 * @param int    $open_hour  Opening hour.
 * @param string $close_day  Closing day name.
 * @param int    $close_hour Closing hour.
 * @return array
 */
function google_period( $open_day, $open_hour, $close_day, $close_hour ) {
	return array(
		'openDay'   => $open_day,
		'openTime'  => array( 'hours' => $open_hour ),
		'closeDay'  => $close_day,
		'closeTime' => array( 'hours' => $close_hour ),
	);
}

/**
 * Our own resolved values, as Nap::resolve() returns them.
 *
 * @param array $overrides Fields to replace.
 * @return array
 */
function our_values( array $overrides = array() ) {
	return array_merge(
		array(
			'name'        => '',
			'phone'       => '',
			'website'     => '',
			'description' => '',
			'address'     => array( 'formatted' => '' ),
			'hours'       => array( 'has_any_hours' => false ),
		),
		$overrides
	);
}

/**
 * The compared fields, keyed by field name.
 *
 * @param array $payload Google location.
 * @param array $nap     Our values.
 * @return array
 */
function compared( array $payload, array $nap ) {
	$theirs = import_call( 'normalise', array( $payload ) );
	$fields = import_call( 'compare', array( $theirs, $nap ) );
	$keyed  = array();

	foreach ( $fields as $field ) {
		$keyed[ $field['key'] ] = $field;
	}

	return $keyed;
}

// -- Reading Google's shape ------------------------------------------------

$theirs = import_call( 'normalise', array( google_location() ) );

check_same( 'Harbour Coffee', $theirs['name'], 'the title becomes the name' );
check_same( '0117 496 0000', $theirs['phone'], 'the primary phone is taken' );
check_same( 'https://harbourcoffee.example', $theirs['website'], 'the website is taken' );
check_same( 'Coffee by the water.', $theirs['description'], 'the profile description is taken' );
check_same( '12 Dock Road', $theirs['address']['address_line_1'], 'the first address line' );
check_same( 'Unit 4', $theirs['address']['address_line_2'], 'and the second' );
check_same( 'Bristol', $theirs['address']['city'], 'the locality is the city' );
check_same( 'BS1 4XY', $theirs['address']['postal_code'], 'the postcode' );
check_same( 'GB', $theirs['address']['country'], 'and the region code is the country we store' );

// A location Google holds nothing for must not invent values.
$empty = import_call( 'normalise', array( array( 'name' => 'locations/1' ) ) );

check_same( '', $empty['name'], 'a missing title is empty, not null' );
check_same( '', $empty['address']['city'], 'a missing address is empty' );
check_same( array(), $empty['hours'], 'and missing hours are nothing at all' );

// -- Opening hours ---------------------------------------------------------

$hours = import_call(
	'normalise',
	array(
		google_location(
			array(
				'regularHours' => array(
					'periods' => array(
						google_period( 'MONDAY', 9, 'MONDAY', 17 ),
						google_period( 'TUESDAY', 9, 'TUESDAY', 17 ),
					),
				),
			)
		),
	)
);

$by_day = array();

foreach ( $hours['hours']['periods'] as $row ) {
	$by_day[ $row['day_of_week'] ][] = $row;
}

check_same( DayOfWeek::MONDAY, $by_day[1][0]['day_of_week'], 'MONDAY maps to day 1' );
check_same( '09:00', $by_day[1][0]['open_time'], 'opening at nine' );
check_same( '17:00', $by_day[1][0]['close_time'], 'closing at five' );
check( ! $by_day[1][0]['is_closed'], 'and the day is not closed' );

// Google lists only the days it opens, so the rest are genuinely closed.
check( $by_day[0][0]['is_closed'], 'Sunday, which Google omits, is closed' );
check( $by_day[3][0]['is_closed'], 'so is Wednesday' );
check_same( 7, count( $hours['hours']['periods'] ), 'every day of the week is accounted for' );

// A day with two shifts keeps both, in order.
$split = import_call(
	'normalise',
	array(
		google_location(
			array(
				'regularHours' => array(
					'periods' => array(
						google_period( 'FRIDAY', 9, 'FRIDAY', 13 ),
						google_period( 'FRIDAY', 14, 'FRIDAY', 18 ),
					),
				),
			)
		),
	)
);

$friday = array();

foreach ( $split['hours']['periods'] as $row ) {
	if ( DayOfWeek::FRIDAY === $row['day_of_week'] && empty( $row['is_closed'] ) ) {
		$friday[] = $row;
	}
}

check_same( 2, count( $friday ), 'a lunch break is two periods' );
check_same( 0, $friday[0]['period_index'], 'the morning is first' );
check_same( 1, $friday[1]['period_index'], 'the afternoon second' );
check_same( '14:00', $friday[1]['open_time'], 'reopening at two' );

// An overnight shift belongs to the day it opens.
$overnight = import_call(
	'normalise',
	array(
		google_location(
			array(
				'regularHours' => array(
					'periods' => array( google_period( 'SATURDAY', 20, 'SUNDAY', 2 ) ),
				),
			)
		),
	)
);

foreach ( $overnight['hours']['periods'] as $row ) {
	if ( DayOfWeek::SATURDAY === $row['day_of_week'] ) {
		check_same( '20:00', $row['open_time'], 'a Saturday night opens on Saturday' );
		check_same( '02:00', $row['close_time'], 'and closes after midnight' );
		check( ! $row['is_closed'], 'without being marked closed' );
	}
}

// Around the clock: Google writes midnight to midnight.
$always = import_call(
	'normalise',
	array(
		google_location(
			array(
				'regularHours' => array(
					'periods' => array( google_period( 'MONDAY', 0, 'TUESDAY', 0 ) ),
				),
			)
		),
	)
);

foreach ( $always['hours']['periods'] as $row ) {
	if ( DayOfWeek::MONDAY === $row['day_of_week'] ) {
		check( $row['is_24h'], 'midnight to midnight is 24 hours' );
	}
}

// A period on a day Google does not name is dropped rather than guessed at.
$nonsense = import_call(
	'normalise',
	array(
		google_location(
			array(
				'regularHours' => array(
					'periods' => array(
						array(
							'openDay'  => 'FUNDAY',
							'openTime' => array( 'hours' => 9 ),
						),
					),
				),
			)
		),
	)
);

check_same( array(), $nonsense['hours'], 'an unknown day name leaves hours unset' );

// -- What gets ticked ------------------------------------------------------

$fields = compared( google_location(), our_values() );

foreach ( array( 'name', 'phone', 'website', 'description', 'address' ) as $key ) {
	check( $fields[ $key ]['suggested'], "{$key} is ticked when we hold nothing" );
	check( $fields[ $key ]['empty_here'], "{$key} knows it is empty here" );
	check( ! $fields[ $key ]['differs'], "{$key} is not reported as differing" );
}

// A value already here is left for the operator to decide on.
$filled = compared(
	google_location(),
	our_values(
		array(
			'phone' => '0117 496 9999',
			'name'  => 'Harbour Coffee',
		)
	)
);

check( ! $filled['phone']['suggested'], 'a phone we already hold is not ticked' );
check( $filled['phone']['differs'], 'but it is flagged as different' );
check_same( '0117 496 9999', $filled['phone']['ours'], 'showing our value' );
check_same( '0117 496 0000', $filled['phone']['theirs'], "and Google's" );

check( ! $filled['name']['suggested'], 'a name that already matches is not ticked' );
check( ! $filled['name']['differs'], 'and is not flagged as different' );

// Google holding nothing means there is nothing to offer.
$blank = compared( array( 'name' => 'locations/1' ), our_values() );

foreach ( Import::FIELDS as $key ) {
	check( ! $blank[ $key ]['available'], "{$key} is unavailable when Google has nothing" );
	check( ! $blank[ $key ]['suggested'], "{$key} is not ticked" );
}

// The address needs a street, town or postcode before it is worth offering.
$thin = compared(
	google_location( array( 'storefrontAddress' => array( 'regionCode' => 'GB' ) ) ),
	our_values()
);

check( ! $thin['address']['available'], 'a country on its own is not an address' );

// -- What would be written -------------------------------------------------

$fields = compared( google_location(), our_values() );

check_same( 'Harbour Coffee', $fields['name']['theirs_raw'], 'the name is written as text' );
check_same(
	'12 Dock Road',
	$fields['address']['theirs_raw']['address_line_1'],
	'the address is written as columns'
);
check_same( 'GB', $fields['address']['theirs_raw']['country'], 'including the country' );
check(
	false !== strpos( $fields['address']['theirs'], '12 Dock Road, Unit 4, Bristol' ),
	'and reads as one line on screen'
);

check_same( Import::FIELDS, array_keys( $fields ), 'every importable field is offered, and no others' );

finish( 'Google import' );
