<?php
/**
 * Reading a Google Business Profile into FoundHint's shapes.
 *
 * Run with plain PHP: `php tests/Smoke/google-import.php`.
 *
 * Everything here is the translation layer, which is where a wrong answer
 * quietly corrupts somebody's website: Google's day names mapped to the
 * right days, hour 24 meaning midnight, a service whose name lives on the
 * category rather than on the service, and social links that are attributes
 * rather than fields.
 *
 * The reading, writing and preview rules need a database and are covered in
 * tests/Integration/database.php.
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\App\Business\Business;
use FHINT\App\Google\ImportMapper;
use FHINT\App\Location\DayOfWeek;

echo "Google import\n";

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
			'latlng'            => array(
				'latitude'  => 51.4491,
				'longitude' => -2.5987,
			),
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
 * Google's attributes response, carrying social links.
 *
 * @param array $links Attribute name => URL.
 * @return array
 */
function google_attributes( array $links ) {
	$attributes = array();

	foreach ( $links as $name => $uri ) {
		$attributes[] = array(
			'name'      => 'attributes/' . $name,
			'uriValues' => array( array( 'uri' => $uri ) ),
		);
	}

	// Real responses carry plenty that is not a social link.
	$attributes[] = array(
		'name'   => 'attributes/has_delivery',
		'values' => array( true ),
	);

	return array( 'attributes' => $attributes );
}

/**
 * Map a location and return the result.
 *
 * @param array $overrides  Location fields.
 * @param array $attributes Attributes response.
 * @return array
 */
function mapped( array $overrides = array(), array $attributes = array() ) {
	return ImportMapper::from_google( google_location( $overrides ), $attributes );
}

// -- The plain fields ------------------------------------------------------

$theirs = mapped();

check_same( 'Harbour Coffee', $theirs['name'], 'the title becomes the name' );
check_same( '0117 496 0000', $theirs['phone'], 'the primary phone is taken' );
check_same( 'https://harbourcoffee.example', $theirs['website'], 'the website is taken' );
check_same( 'Coffee by the water.', $theirs['description'], 'the profile description is taken' );
check_same( '12 Dock Road', $theirs['address']['address_line_1'], 'number and street make the first line' );
check_same( 'Unit 4', $theirs['address']['address_line_2'], 'the second line survives' );
check_same( 'Bristol', $theirs['address']['city'], 'the locality is the city' );
check_same( 'BS1 4XY', $theirs['address']['postal_code'], 'the postcode survives' );
check_same( 'GB', $theirs['address']['country'], 'and the region code is the country we store' );
check_same( 51.4491, $theirs['coordinates']['latitude'], 'coordinates are read' );
check( $theirs['coordinates']['has_both'], 'and reported as present' );

// Google withholds coordinates for some profiles; that is ordinary.
$no_coords = mapped( array( 'latlng' => array() ) );

check( ! $no_coords['coordinates']['has_both'], 'a profile without coordinates says so' );
check_same( null, $no_coords['coordinates']['latitude'], 'rather than claiming zero' );

$empty = ImportMapper::from_google( array( 'name' => 'locations/1' ) );

check_same( '', $empty['name'], 'a missing title is empty, not null' );
check_same( '', $empty['address']['city'], 'a missing address is empty' );
check_same( array(), $empty['hours'], 'missing hours are nothing at all' );
check_same( array(), $empty['services'], 'and so are missing services' );
check_same( array(), $empty['social'], 'and missing social links' );

// -- Social links, which are attributes rather than fields -----------------

$social = mapped(
	array(),
	google_attributes(
		array(
			'url_facebook'  => 'https://www.facebook.com/harbour',
			'url_youtube'   => 'https://www.youtube.com/@harbour',
			'url_twitter'   => 'https://twitter.com/harbour',
			'url_pinterest' => 'https://pinterest.com/harbour',
		)
	)
)['social'];

check_same( 'https://www.facebook.com/harbour', $social['facebook'], 'facebook is read from attributes' );
check_same( 'https://www.youtube.com/@harbour', $social['youtube'], 'so is youtube' );
check_same( 'https://pinterest.com/harbour', $social['pinterest'], 'and pinterest' );
check_same( 'https://twitter.com/harbour', $social['x'], 'and twitter, under the name this plugin stores' );
check( ! isset( $social['has_delivery'] ), 'attributes that are not social links are ignored' );

foreach ( array_keys( $social ) as $network ) {
	check(
		in_array( $network, Business::social_networks(), true ),
		"{$network} is a network this plugin can store"
	);
}

// -- Services, whose names live on the category ----------------------------

$with_services = mapped(
	array(
		'categories'   => array(
			'primaryCategory' => array(
				'displayName'  => 'Software company',
				'serviceTypes' => array(
					array(
						'serviceTypeId' => 'job_type_id:it_consulting',
						'displayName'   => 'IT consulting',
					),
					array(
						'serviceTypeId' => 'job_type_id:application_development',
						'displayName'   => 'Application development',
					),
				),
			),
		),
		'serviceItems' => array(
			array( 'structuredServiceItem' => array( 'serviceTypeId' => 'job_type_id:it_consulting' ) ),
			array( 'structuredServiceItem' => array( 'serviceTypeId' => 'job_type_id:application_development' ) ),
			array(
				'freeFormServiceItem' => array(
					'label' => array(
						'displayName' => 'Website audit',
						'description' => 'A one-off review.',
					),
				),
			),
		),
	)
);

$services = $with_services['services'];

check_same( 3, count( $services ), 'every service item becomes a service' );
check_same( 'IT consulting', $services[0]['name'], 'a structured item takes its name from the category' );
check_same( 'Application development', $services[1]['name'], 'and so does the next' );
check_same( 'Website audit', $services[2]['name'], 'a free-form item uses its own label' );
check_same( 'A one-off review.', $services[2]['description'], 'with its description' );

// An id with no name on the category would otherwise be imported as
// "job_type_id:something", which is not a service name.
$unnamed = mapped(
	array(
		'categories'   => array( 'primaryCategory' => array( 'displayName' => 'Software company' ) ),
		'serviceItems' => array(
			array( 'structuredServiceItem' => array( 'serviceTypeId' => 'job_type_id:unknown_thing' ) ),
		),
	)
)['services'];

check_same( array(), $unnamed, 'a service whose name cannot be resolved is skipped' );

// Prices, which Google sends as units plus billionths.
$priced = mapped(
	array(
		'categories'   => array(
			'primaryCategory' => array(
				'displayName'  => 'Software company',
				'serviceTypes' => array(
					array(
						'serviceTypeId' => 'job_type_id:it_consulting',
						'displayName'   => 'IT consulting',
					),
				),
			),
		),
		'serviceItems' => array(
			array(
				'structuredServiceItem' => array(
					'serviceTypeId' => 'job_type_id:it_consulting',
					'price'         => array(
						'currencyCode' => 'gbp',
						'units'        => '150',
						'nanos'        => 500000000,
					),
				),
			),
		),
	)
)['services'];

check_same( 150.5, $priced[0]['price'], 'units and nanos recombine into one price' );
check_same( 'GBP', $priced[0]['currency'], 'and the currency is uppercased' );
check_same( null, $services[0]['price'], 'a service with no price has none, rather than zero' );

// -- Google's category as a schema.org type --------------------------------

$cases = array(
	'Pet store'        => 'PetStore',
	'Dentist'          => 'Dentist',
	'Software company' => 'ProfessionalService',
	'Coffee shop'      => 'CafeOrCoffeeShop',
	// Not in the table: Google's names end with the word that identifies them.
	'Pet supply store' => 'Store',
	'Thai restaurant'  => 'Restaurant',
	// Nothing recognisable: correct for any business, just less specific.
	'Marine surveyor'  => 'LocalBusiness',
);

foreach ( $cases as $google => $expected ) {
	$result = mapped( array( 'categories' => array( 'primaryCategory' => array( 'displayName' => $google ) ) ) );

	check_same( $expected, $result['business_type'], "\"{$google}\" maps to {$expected}" );
	check_same( $google, $result['category'], "and keeps \"{$google}\" to show on screen" );
	check(
		in_array( $result['business_type'], Business::types(), true ),
		"{$expected} is a type this plugin accepts"
	);
}

check_same( '', mapped()['business_type'], 'a profile with no category maps to nothing' );

// -- Opening hours ---------------------------------------------------------

$hours = mapped(
	array(
		'regularHours' => array(
			'periods' => array(
				google_period( 'MONDAY', 9, 'MONDAY', 17 ),
				google_period( 'TUESDAY', 9, 'TUESDAY', 17 ),
			),
		),
	)
)['hours'];

$by_day = array();

foreach ( $hours['periods'] as $row ) {
	$by_day[ $row['day_of_week'] ][] = $row;
}

check_same( '09:00', $by_day[ DayOfWeek::MONDAY ][0]['open_time'], 'MONDAY maps to Monday, opening at nine' );
check_same( '17:00', $by_day[ DayOfWeek::MONDAY ][0]['close_time'], 'and closing at five' );
check( $by_day[ DayOfWeek::SUNDAY ][0]['is_closed'], 'a day Google omits is closed, which is how Google means it' );
check_same( 7, count( $hours['periods'] ), 'every day of the week is accounted for' );

// The shape a real profile came back in: Google ends a day at hour 24, which
// is not a valid time. Read literally it produced "closes at 24:00", storage
// dropped it, and seven days looked like they never shut.
$all_day = mapped(
	array(
		'regularHours' => array(
			'periods' => array(
				array(
					'openDay'   => 'MONDAY',
					'openTime'  => array(),
					'closeDay'  => 'MONDAY',
					'closeTime' => array( 'hours' => 24 ),
				),
			),
		),
	)
)['hours'];

foreach ( $all_day['periods'] as $row ) {
	if ( DayOfWeek::MONDAY === $row['day_of_week'] ) {
		check( $row['is_24h'], 'midnight to hour 24 is open all day' );
		check_same( '00:00', $row['close_time'], 'stored as midnight, never as 24:00' );
	}
}

// The same rule on an evening that runs to midnight.
$evening = mapped(
	array(
		'regularHours' => array(
			'periods' => array(
				array(
					'openDay'   => 'FRIDAY',
					'openTime'  => array( 'hours' => 18 ),
					'closeDay'  => 'FRIDAY',
					'closeTime' => array( 'hours' => 24 ),
				),
			),
		),
	)
)['hours'];

foreach ( $evening['periods'] as $row ) {
	if ( DayOfWeek::FRIDAY === $row['day_of_week'] && empty( $row['is_closed'] ) ) {
		check_same( '18:00', $row['open_time'], 'an evening shift keeps its opening time' );
		check_same( '00:00', $row['close_time'], 'and closes at midnight' );
		check( ! $row['is_24h'], 'without being mistaken for all day' );
	}
}

// A split shift keeps both halves, in order.
$split = mapped(
	array(
		'regularHours' => array(
			'periods' => array(
				google_period( 'FRIDAY', 9, 'FRIDAY', 13 ),
				google_period( 'FRIDAY', 14, 'FRIDAY', 18 ),
			),
		),
	)
)['hours'];

$friday = array();

foreach ( $split['periods'] as $row ) {
	if ( DayOfWeek::FRIDAY === $row['day_of_week'] && empty( $row['is_closed'] ) ) {
		$friday[] = $row;
	}
}

check_same( 2, count( $friday ), 'a lunch break is two periods' );
check_same( 0, $friday[0]['period_index'], 'the morning is first' );
check_same( '14:00', $friday[1]['open_time'], 'and the afternoon reopens at two' );

// An overnight shift belongs to the day it opens.
$overnight = mapped(
	array(
		'regularHours' => array(
			'periods' => array( google_period( 'SATURDAY', 20, 'SUNDAY', 2 ) ),
		),
	)
)['hours'];

foreach ( $overnight['periods'] as $row ) {
	if ( DayOfWeek::SATURDAY === $row['day_of_week'] ) {
		check_same( '20:00', $row['open_time'], 'a Saturday night opens on Saturday' );
		check_same( '02:00', $row['close_time'], 'and closes after midnight' );
	}
}

// A day name Google does not use is dropped rather than guessed at.
$nonsense = mapped(
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
)['hours'];

check_same( array(), $nonsense, 'an unknown day name leaves hours unset' );

finish( 'Google import' );
