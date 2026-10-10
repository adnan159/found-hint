<?php
/**
 * Planning a publish to Google.
 *
 * Run with plain PHP: `php tests/Smoke/publish-plan.php`.
 *
 * A plan decides what will be written to a listing the public reads, so the
 * thing most worth proving is what it will **not** do: it must never name a
 * field this site has nothing for, because Google erases a field named with
 * no value. After that, that the same hours, phone number or link always
 * compare as the same however each side happens to spell them — a plan that
 * reports a change where there is none trains its reader to stop reading.
 *
 * The Google shapes used here are the ones a real listing returned.
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\App\Google\Push\GoogleFormat;
use FHINT\App\Google\Push\Plan;

echo "Publish plan\n";

/**
 * A listing as Google returns it, with overrides merged in.
 *
 * @param array $overrides Fields to replace.
 * @return array
 */
function fhint_google( array $overrides = array() ) {
	return array_merge(
		array(
			'name'         => 'locations/7390686751421120583',
			'languageCode' => 'en',
			'title'        => 'Northside Dental Care',
			'phoneNumbers' => array( 'primaryPhone' => '(512) 555-0134' ),
			'websiteUri'   => 'https://www.northsidedental.example/',
			'profile'      => array( 'description' => 'A family dental practice in Austin.' ),
			'categories'   => array(
				'primaryCategory' => array(
					'name'        => 'categories/gcid:dentist',
					'displayName' => 'Dentist',
				),
			),
			'regularHours' => array(
				'periods' => array(
					array(
						'openDay'   => 'MONDAY',
						'openTime'  => array( 'hours' => 9 ),
						'closeDay'  => 'MONDAY',
						'closeTime' => array( 'hours' => 17 ),
					),
					array(
						'openDay'   => 'TUESDAY',
						'openTime'  => array( 'hours' => 9 ),
						'closeDay'  => 'TUESDAY',
						'closeTime' => array(
							'hours'   => 17,
							'minutes' => 30,
						),
					),
				),
			),
			'metadata'     => array( 'canModifyServiceList' => true ),
		),
		$overrides
	);
}

/**
 * One day as this site stores and returns it.
 *
 * @param int   $day     Day number, Sunday is 0.
 * @param array $periods Periods, or an empty list for an unconfigured day.
 * @return array
 */
function fhint_day( $day, array $periods = array() ) {
	return array(
		'day_of_week' => $day,
		'configured'  => (bool) $periods,
		'periods'     => $periods,
	);
}

/**
 * This site's profile, matching fhint_google() exactly, with overrides.
 *
 * @param array $overrides Fields to replace.
 * @return array
 */
function fhint_local( array $overrides = array() ) {
	return array_merge(
		array(
			'name'                 => 'Northside Dental Care',
			'description'          => 'A family dental practice in Austin.',
			'website'              => 'http://northsidedental.example',
			'phone'                => '+1 512 555 0134',
			'primary_category'     => 'Dentist',
			'primary_category_id'  => 'gcid:dentist',
			'secondary_categories' => array(),
			'days'                 => array(
				fhint_day(
					1,
					array(
						array(
							'open_time'  => '09:00',
							'close_time' => '17:00',
						),
					)
				),
				fhint_day(
					2,
					array(
						array(
							'open_time'  => '09:00',
							'close_time' => '17:30',
						),
					)
				),
			),
			'special_rows'         => array(),
			'services'             => array(),
			'social_profiles'      => array(),
			'attributes'           => array(),
		),
		$overrides
	);
}

/**
 * The step with a given id, or null.
 *
 * @param array  $plan A plan.
 * @param string $id   Step id.
 * @return array|null
 */
function fhint_step( array $plan, $id ) {
	foreach ( $plan['steps'] as $step ) {
		if ( $id === $step['id'] ) {
			return $step;
		}
	}

	return null;
}

/**
 * The entry for a skipped field, or null.
 *
 * @param array  $plan  A plan.
 * @param string $field Field id.
 * @return array|null
 */
function fhint_skipped( array $plan, $field ) {
	foreach ( $plan['skipped'] as $entry ) {
		if ( $field === $entry['field'] ) {
			return $entry;
		}
	}

	return null;
}

// ── nothing to do ───────────────────────────────────────────────────────

$fhint_plan = Plan::make( fhint_local(), fhint_google() );

check_same( array(), $fhint_plan['steps'], 'a profile that matches its listing plans no steps' );
check_same( 0, $fhint_plan['requests'], 'and would make no requests' );
check( in_array( 'phone', $fhint_plan['unchanged'], true ), 'a number written nationally and internationally is the same number' );
check( in_array( 'website', $fhint_plan['unchanged'], true ), 'a link with and without www, a scheme or a trailing slash is the same link' );
check( in_array( 'hours', $fhint_plan['unchanged'], true ), 'the same hours compare as the same' );
check( in_array( 'categories', $fhint_plan['unchanged'], true ), 'and so does the same category' );

// ── one change is one field ─────────────────────────────────────────────

$fhint_plan = Plan::make( fhint_local( array( 'description' => 'Family and cosmetic dentistry in downtown Austin.' ) ), fhint_google() );
$fhint_step = fhint_step( $fhint_plan, Plan::STEP_LOCATION );

check_same( 1, $fhint_plan['requests'], 'one changed field is one request' );
check_same( array( 'profile.description' ), $fhint_step['mask'], 'and the mask names that field alone' );
check_same(
	array( 'profile' => array( 'description' => 'Family and cosmetic dentistry in downtown Austin.' ) ),
	$fhint_step['payload'],
	'with a payload carrying nothing else'
);
check_same( 'A family dental practice in Austin.', $fhint_step['fields'][0]['from'], 'the plan says what Google has now' );
check_same( 'Family and cosmetic dentistry in downtown Austin.', $fhint_step['fields'][0]['to'], 'and what it would become' );

// ── the rule that matters most: a plan never clears ─────────────────────

$fhint_plan = Plan::make(
	fhint_local(
		array(
			'phone'       => '',
			'website'     => '',
			'description' => '',
			'days'        => array(),
		)
	),
	fhint_google()
);

check_same( array(), $fhint_plan['steps'], 'fields this site has nothing for are not sent — naming them would erase them on the listing' );
check_same( Plan::REASON_EMPTY_HERE, fhint_skipped( $fhint_plan, 'phone' )['reason'], 'an empty phone here is reported, not pushed' );
check_same( '(512) 555-0134', fhint_skipped( $fhint_plan, 'phone' )['google'], 'along with the number Google is showing' );
check( null !== fhint_skipped( $fhint_plan, 'website' ), 'the same for the website' );
check( null !== fhint_skipped( $fhint_plan, 'description' ), 'the description' );
check( null !== fhint_skipped( $fhint_plan, 'hours' ), 'and hours nobody has entered here' );

// Empty on both sides is not a thing to report at all.
$fhint_plan = Plan::make( fhint_local( array( 'phone' => '' ) ), fhint_google( array( 'phoneNumbers' => array() ) ) );

check( in_array( 'phone', $fhint_plan['unchanged'], true ), 'a field empty on both sides is simply unchanged' );
check_same( null, fhint_skipped( $fhint_plan, 'phone' ), 'and is not listed as skipped' );

// ── phone ───────────────────────────────────────────────────────────────

check( GoogleFormat::same_phone( '+1 512 555 0134', '(512) 555-0134' ), 'a country code is the only difference between these' );
check( GoogleFormat::same_phone( '01712-345678', '+880 1712 345678' ), 'a leading zero stands in for one too' );
check( ! GoogleFormat::same_phone( '+1 512 555 0134', '+1 512 555 0135' ), 'a different last digit is a different number' );
check( ! GoogleFormat::same_phone( '0134', '555 0134' ), 'a short fragment does not match a longer number' );
check( GoogleFormat::same_phone( '', '' ), 'two empty numbers are the same' );
check( ! GoogleFormat::same_phone( '', '555 0134' ), 'an empty number is not the same as a real one' );

$fhint_plan = Plan::make(
	fhint_local( array( 'phone' => '+1 512 555 0199' ) ),
	fhint_google(
		array(
			'phoneNumbers' => array(
				'primaryPhone'     => '(512) 555-0134',
				'additionalPhones' => array( '(512) 555-0100' ),
			),
		)
	)
);

check_same(
	array(
		'additionalPhones' => array( '(512) 555-0100' ),
		'primaryPhone'     => '+1 512 555 0199',
	),
	fhint_step( $fhint_plan, Plan::STEP_LOCATION )['payload']['phoneNumbers'],
	'changing the main number sends the extra ones back with it, or Google would drop them'
);

// ── categories ──────────────────────────────────────────────────────────

check_same( 'categories/gcid:dentist', GoogleFormat::category( 'gcid:dentist' ), 'a category id becomes the resource name Google takes' );
check_same( 'categories/gcid:dentist', GoogleFormat::category( 'categories/gcid:dentist' ), 'and one that already is, is left alone' );

$fhint_plan = Plan::make(
	fhint_local(
		array(
			'primary_category'    => 'Tooth wizard',
			'primary_category_id' => '',
		)
	),
	fhint_google()
);

check_same( Plan::REASON_NO_GOOGLE_ID, fhint_skipped( $fhint_plan, 'categories' )['reason'], 'a category typed freehand has no Google id and cannot be sent' );

$fhint_with_extras = fhint_google(
	array(
		'categories' => array(
			'primaryCategory'      => array(
				'name'        => 'categories/gcid:dentist',
				'displayName' => 'Dentist',
			),
			'additionalCategories' => array(
				array(
					'name'        => 'categories/gcid:dental_clinic',
					'displayName' => 'Dental clinic',
				),
			),
		),
	)
);

$fhint_plan = Plan::make(
	fhint_local(
		array(
			'primary_category'    => 'Orthodontist',
			'primary_category_id' => 'gcid:orthodontist',
		)
	),
	$fhint_with_extras
);

check_same(
	array(
		'primaryCategory'      => array( 'name' => 'categories/gcid:orthodontist' ),
		'additionalCategories' => array( array( 'name' => 'categories/gcid:dental_clinic' ) ),
	),
	fhint_step( $fhint_plan, Plan::STEP_LOCATION )['payload']['categories'],
	'changing the main category keeps the extra ones Google has, when none are chosen here'
);

$fhint_plan = Plan::make(
	fhint_local(
		array(
			'secondary_categories' => array(
				array(
					'id'   => 'gcid:dental_clinic',
					'name' => 'Dental clinic',
				),
			),
		)
	),
	$fhint_with_extras
);

check( in_array( 'categories', $fhint_plan['unchanged'], true ), 'the same extra categories, chosen here, are unchanged' );

// ── weekly hours ────────────────────────────────────────────────────────

check_same(
	array(
		'hours'   => 9,
		'minutes' => 30,
	),
	GoogleFormat::time( '09:30:00' ),
	'a stored time becomes Google\'s time object'
);

$fhint_periods = GoogleFormat::periods(
	array(
		fhint_day(
			0,
			array( array( 'is_closed' => true ) )
		),
		fhint_day(
			3,
			array( array( 'is_24h' => true ) )
		),
		fhint_day(
			4,
			array(
				array(
					'open_time'  => '18:00',
					'close_time' => '00:00',
				),
			)
		),
		fhint_day(
			5,
			array(
				array(
					'open_time'  => '22:00',
					'close_time' => '02:00',
				),
			)
		),
		fhint_day(
			6,
			array(
				array(
					'open_time'  => '09:00',
					'close_time' => '12:00',
				),
				array(
					'open_time'  => '13:00',
					'close_time' => '17:00',
				),
			)
		),
	),
	array()
);

check_same(
	array(
		'3 00:00-24:00',
		'4 18:00-24:00',
		'5 22:00-6 02:00',
		'6 09:00-12:00',
		'6 13:00-17:00',
	),
	GoogleFormat::periods_signature( $fhint_periods ),
	'a closed day sends nothing; all day and closing at midnight end at hour 24; past midnight ends the next day; a break is two periods'
);
check_same( 'WEDNESDAY', $fhint_periods[0]['closeDay'], 'a day open round the clock closes on the same day, at hour 24' );
check_same( 24, $fhint_periods[0]['closeTime']['hours'], 'which is how Google itself writes it' );

// Compared, hour 24 today and hour 0 tomorrow are the same moment. Sent, the
// first is the spelling Google itself uses, so that is the one to send.
check_same( 'THURSDAY', $fhint_periods[1]['closeDay'], 'a day that closes at midnight is sent as closing on that same day' );
check_same( 24, $fhint_periods[1]['closeTime']['hours'], 'at hour 24, not at hour 0 of the next' );
check_same( 'SATURDAY', $fhint_periods[2]['closeDay'], 'while a shift that runs past midnight does end on the next day' );

// Midnight has two spellings and they are the same time.
check_same(
	GoogleFormat::periods_signature(
		array(
			array(
				'openDay'   => 'MONDAY',
				'openTime'  => array( 'hours' => 18 ),
				'closeDay'  => 'MONDAY',
				'closeTime' => array( 'hours' => 24 ),
			),
		)
	),
	GoogleFormat::periods_signature(
		array(
			array(
				'openDay'   => 'MONDAY',
				'openTime'  => array( 'hours' => 18 ),
				'closeDay'  => 'TUESDAY',
				'closeTime' => array(),
			),
		)
	),
	'hour 24 on Monday and hour 0 on Tuesday compare as the same closing time'
);

// A day nobody filled in here keeps what Google shows for it.
$fhint_plan = Plan::make(
	fhint_local(
		array(
			'days' => array(
				fhint_day(
					6,
					array(
						array(
							'open_time'  => '10:00',
							'close_time' => '14:00',
						),
					)
				),
			),
		)
	),
	fhint_google()
);

check_same(
	array( '1 09:00-17:00', '2 09:00-17:30', '6 10:00-14:00' ),
	fhint_step( $fhint_plan, Plan::STEP_LOCATION )['fields'][0]['to'],
	'adding Saturday keeps Monday and Tuesday as Google has them, rather than publishing them as closed'
);

// A day this site does have an answer for replaces Google's.
$fhint_plan = Plan::make(
	fhint_local(
		array(
			'days' => array(
				fhint_day( 1, array( array( 'is_closed' => true ) ) ),
				fhint_day(
					2,
					array(
						array(
							'open_time'  => '09:00',
							'close_time' => '17:30',
						),
					)
				),
			),
		)
	),
	fhint_google()
);

check_same( array( '2 09:00-17:30' ), fhint_step( $fhint_plan, Plan::STEP_LOCATION )['fields'][0]['to'], 'a day marked closed here is closed on Google' );

// ── special hours ───────────────────────────────────────────────────────

$fhint_special = GoogleFormat::special_periods(
	array(
		array(
			'date'      => '2026-12-25',
			'is_closed' => 1,
		),
		array(
			'date'       => '2026-12-24',
			'open_time'  => '09:00:00',
			'close_time' => '13:00:00',
		),
		array(
			'date'   => '2026-12-31',
			'is_24h' => 1,
		),
		array( 'date' => 'not a date' ),
	)
);

check_same(
	array( '2026-12-24 09:00-13:00', '2026-12-25 closed', '2026-12-31 00:00-24:00' ),
	GoogleFormat::special_signature( $fhint_special ),
	'a closed date, a short day and an all-day one become Google\'s special periods; a bad date is left out'
);
check_same(
	array(
		'year'  => 2026,
		'month' => 12,
		'day'   => 25,
	),
	$fhint_special[0]['startDate'],
	'a date is sent as Google\'s date object'
);
check_same( true, $fhint_special[0]['closed'], 'and a closed day says so' );

$fhint_plan = Plan::make(
	fhint_local(),
	fhint_google( array( 'specialHours' => array( 'specialHourPeriods' => $fhint_special ) ) )
);

check_same( Plan::REASON_EMPTY_HERE, fhint_skipped( $fhint_plan, 'special_hours' )['reason'], 'special days Google has and this site does not are left alone' );

// ── services ────────────────────────────────────────────────────────────

$fhint_items = GoogleFormat::service_items(
	array(
		array(
			'name'                   => 'Teeth whitening',
			'description'            => 'In-chair whitening.',
			'price'                  => 320,
			'currency'               => 'usd',
			'status'                 => 'active',
			'google_item_type'       => 'structured',
			'google_service_type_id' => 'job_type_id:teeth_whitening',
		),
		array(
			'name'     => 'Emergency callout',
			'price'    => 19.99,
			'currency' => 'USD',
			'status'   => 'active',
		),
		array(
			'name'   => 'Not offered at the moment',
			'status' => 'inactive',
		),
		array(
			'name'   => '',
			'status' => 'active',
		),
	),
	'categories/gcid:dentist',
	'en'
);

check_same( 2, count( $fhint_items ), 'a service switched off, and one with no name, are not sent' );
check_same( 'job_type_id:teeth_whitening', $fhint_items[0]['structuredServiceItem']['serviceTypeId'], 'a service Google already knows is sent by its id' );
check_same( 'categories/gcid:dentist', $fhint_items[1]['freeFormServiceItem']['category'], 'any other names the category it belongs to' );
check_same( 'Emergency callout', $fhint_items[1]['freeFormServiceItem']['label']['displayName'], 'and carries its own name' );
check_same(
	array(
		'currencyCode' => 'USD',
		'units'        => '320',
		'nanos'        => 0,
	),
	$fhint_items[0]['price'],
	'a price is whole units plus billionths, with the currency upper-cased'
);
check_same( 990000000, $fhint_items[1]['price']['nanos'], 'and cents become nanos' );
check_same( null, GoogleFormat::money( 320, '' ), 'a price with no currency is not a price Google can take' );
check_same( null, GoogleFormat::money( '', 'USD' ), 'nor is a currency with no amount' );
check( null !== GoogleFormat::money( 0, 'USD' ), 'but free is a real price' );

$fhint_services = array(
	array(
		'name'     => 'Emergency callout',
		'price'    => 19.99,
		'currency' => 'USD',
		'status'   => 'active',
	),
);

$fhint_plan = Plan::make( fhint_local( array( 'services' => $fhint_services ) ), fhint_google() );

check_same( array( 'serviceItems' ), fhint_step( $fhint_plan, Plan::STEP_LOCATION )['mask'], 'a new service list is sent whole, as one field' );

// The same service already on Google, with the price where Google may put it.
$fhint_plan = Plan::make(
	fhint_local( array( 'services' => $fhint_services ) ),
	fhint_google(
		array(
			'serviceItems' => array(
				array(
					'freeFormServiceItem' => array(
						'category' => 'categories/gcid:dentist',
						'label'    => array( 'displayName' => 'EMERGENCY CALLOUT' ),
					),
					'price'               => array(
						'currencyCode' => 'USD',
						'units'        => '19',
						'nanos'        => 990000000,
					),
				),
			),
		)
	)
);

check( in_array( 'services', $fhint_plan['unchanged'], true ), 'a service already listed, differing only in capitals, is unchanged' );

$fhint_plan = Plan::make(
	fhint_local( array( 'services' => $fhint_services ) ),
	fhint_google( array( 'metadata' => array( 'canModifyServiceList' => false ) ) )
);

check_same( Plan::REASON_NOT_ALLOWED, fhint_skipped( $fhint_plan, 'services' )['reason'], 'a listing whose service list Google will not let be changed is not sent one' );
check_same( array(), $fhint_plan['steps'], 'so no request is made that could only fail' );

// ── social links and attributes ─────────────────────────────────────────

$fhint_google_attributes = array(
	'attributes' => array(
		array(
			'name'      => 'locations/7390686751421120583/attributes/url_instagram',
			'valueType' => 'URL',
			'uriValues' => array( array( 'uri' => 'https://www.instagram.com/northside/' ) ),
		),
		array(
			'name'      => 'attributes/has_restroom',
			'valueType' => 'BOOL',
			'values'    => array( true ),
		),
	),
);

$fhint_plan = Plan::make(
	fhint_local(
		array(
			'social_profiles' => array(
				'facebook'  => 'https://facebook.com/northside',
				'instagram' => 'http://instagram.com/northside',
				'x'         => 'https://x.com/northside',
				'linkedin'  => '',
				'yelp'      => 'https://yelp.com/biz/northside',
			),
			'attributes'      => array(
				array(
					'attribute_id' => 'has_wheelchair_accessible_entrance',
					'value_type'   => 'bool',
					'value'        => true,
					'is_dirty'     => true,
				),
				array(
					'attribute_id' => 'has_restroom',
					'value_type'   => 'bool',
					'value'        => true,
					'is_dirty'     => true,
				),
				array(
					'attribute_id' => 'has_wifi',
					'value_type'   => 'bool',
					'value'        => true,
					'is_dirty'     => false,
				),
			),
		)
	),
	fhint_google(),
	$fhint_google_attributes
);
$fhint_step = fhint_step( $fhint_plan, Plan::STEP_ATTRIBUTES );

check_same(
	array( 'attributes/url_facebook', 'attributes/url_twitter', 'attributes/has_wheelchair_accessible_entrance' ),
	$fhint_step['mask'],
	'links and answers that differ are named; X goes to the attribute Google still calls twitter'
);
check( in_array( 'social.instagram', $fhint_plan['unchanged'], true ), 'a link Google already has, spelled differently, is unchanged' );
check( in_array( 'attribute.has_restroom', $fhint_plan['unchanged'], true ), 'an answer Google already has is unchanged, even though it was edited here' );
check_same( Plan::REASON_NOT_ON_GOOGLE, fhint_skipped( $fhint_plan, 'social.yelp' )['reason'], 'Google has no attribute for a Yelp link, so it stays on this site' );
check( ! in_array( 'attributes/has_wifi', $fhint_step['mask'], true ), 'an answer that has not changed here is not named, so it cannot be disturbed' );
check_same(
	array(
		'name'      => 'attributes/url_facebook',
		'valueType' => 'URL',
		'uriValues' => array( array( 'uri' => 'https://facebook.com/northside' ) ),
	),
	$fhint_step['payload']['attributes'][0],
	'a link is sent as Google\'s URL attribute'
);
check_same( array( true ), $fhint_step['payload']['attributes'][2]['values'], 'and a yes/no answer as a boolean' );
check_same( 1, $fhint_plan['requests'], 'however many links and answers change, attributes are one request' );

// ── both steps, and the fingerprint ─────────────────────────────────────

$fhint_plan = Plan::make(
	fhint_local(
		array(
			'description'     => 'New wording.',
			'social_profiles' => array( 'facebook' => 'https://facebook.com/northside' ),
		)
	),
	fhint_google()
);

check_same( array( Plan::STEP_LOCATION, Plan::STEP_ATTRIBUTES ), array_column( $fhint_plan['steps'], 'id' ), 'details and links are two steps, in that order' );
check_same( 2, $fhint_plan['requests'], 'and two requests' );

$fhint_token = fhint_step( $fhint_plan, Plan::STEP_LOCATION )['token'];

check_same( 32, strlen( $fhint_token ), 'each step carries a fingerprint of what it would send' );
check_same(
	$fhint_token,
	fhint_step(
		Plan::make(
			fhint_local(
				array(
					'description'     => 'New wording.',
					'social_profiles' => array( 'facebook' => 'https://facebook.com/northside' ),
				)
			),
			fhint_google()
		),
		Plan::STEP_LOCATION
	)['token'],
	'the same plan made twice has the same fingerprint'
);
check(
	fhint_step( Plan::make( fhint_local( array( 'description' => 'Different wording.' ) ), fhint_google() ), Plan::STEP_LOCATION )['token'] !== $fhint_token,
	'and a different payload has a different one, so a stale plan can be refused'
);

finish( 'Publish plan' );
