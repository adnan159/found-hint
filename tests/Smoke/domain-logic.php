<?php
/**
 * Domain logic smoke test — runs with WordPress absent.
 *
 * Everything here is pure: validation, sanitisation, hours parsing, limits.
 * No database, so a failure is a real logic bug rather than an environment
 * problem.
 *
 * Usage: php tests/Smoke/domain-logic.php
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\App\Business\Business;
use FHINT\App\Core\Limits;
use FHINT\App\Core\Logger;
use FHINT\App\Core\Validator;
use FHINT\App\Location\DayOfWeek;
use FHINT\App\Location\Location;
use FHINT\App\Location\OpeningHours;
use FHINT\App\Service\Service;

echo "Domain logic\n";

// -- Validator -------------------------------------------------------------

check( Validator::is_email( 'a@b.com' ), 'accepts a valid email' );
check( ! Validator::is_email( 'not-an-email' ), 'rejects a malformed email' );
check( Validator::is_email( '' ), 'treats an empty email as acceptable' );

check( Validator::is_url( 'https://example.com/x' ), 'accepts an https URL' );
check( ! Validator::is_url( 'javascript:alert(1)' ), 'rejects a non-http scheme' );
check( ! Validator::is_url( 'example.com' ), 'rejects a URL with no scheme' );

check( Validator::is_phone( '+880 1711-111111' ), 'accepts an international phone' );
check( ! Validator::is_phone( '12' ), 'rejects a too-short phone' );
check( ! Validator::is_phone( 'call me' ), 'rejects letters in a phone' );

check( Validator::is_country_code( 'BD' ), 'accepts an ISO country code' );
check( ! Validator::is_country_code( 'BGD' ), 'rejects a three-letter country code' );

check( Validator::is_latitude( 0 ), 'accepts latitude 0 as a real coordinate' );
check( Validator::is_latitude( -90 ), 'accepts the latitude lower bound' );
check( ! Validator::is_latitude( 90.1 ), 'rejects latitude past the upper bound' );
check( ! Validator::is_longitude( 180.5 ), 'rejects longitude past the upper bound' );

check( Validator::is_date( '2026-02-28' ), 'accepts a real date' );
check( ! Validator::is_date( '2026-02-30' ), 'rejects a date that does not exist' );
check( ! Validator::is_date( '28-02-2026' ), 'rejects a non-ISO date' );

// Single-digit hours are what a person types; rejecting them would be a
// validation error the user cannot make sense of.
check_same( '09:00:00', Validator::normalize_time( '9:00' ), 'normalises a single-digit hour' );
check_same( '17:30:00', Validator::normalize_time( '17:30' ), 'normalises HH:MM' );
check_same( null, Validator::normalize_time( '25:00' ), 'rejects an impossible hour' );
check_same( null, Validator::normalize_time( 'noon' ), 'rejects unparseable text' );

// -- Business --------------------------------------------------------------

$invalid = Business::validate( array_merge( Business::blank(), array( 'name' => '' ) ) );
check( ! $invalid->is_valid(), 'a business with no name is invalid' );
check_same( array( 'business.name.required' ), $invalid->errors()['name'], 'reports the documented name code' );

$bad = Business::validate(
	array_merge(
		Business::blank(),
		array(
			'name'          => 'Testmart',
			'email'         => 'nope',
			'website'       => 'example.com',
			'business_type' => 'NotARealType',
			'founding_date' => '2026-13-01',
		)
	)
);
check( ! $bad->is_valid(), 'a business with bad fields is invalid' );
check( isset( $bad->errors()['email'] ), 'reports the bad email' );
check( isset( $bad->errors()['website'] ), 'reports the bad website' );
check( isset( $bad->errors()['business_type'] ), 'reports the unknown business type' );
check( isset( $bad->errors()['founding_date'] ), 'reports the impossible founding date' );

$good = Business::validate(
	array_merge(
		Business::blank(),
		array(
			'name'          => 'Testmart Ltd',
			'email'         => 'hello@testmart.test',
			'website'       => 'https://testmart.test',
			'business_type' => 'Store',
			'phone'         => '+880 1711-111111',
		)
	)
);
check( $good->is_valid(), 'a well-formed business passes' );

// An absent key must mean "leave it alone", not "clear it" — otherwise a
// phone-only edit would wipe the rest of the profile.
$sanitised = Business::sanitize( array( 'phone' => '+1 555 0100', 'unknown_field' => 'x' ) );
check_same( array( 'phone' ), array_keys( $sanitised ), 'sanitize keeps only present writable keys' );

check_same( 0, Business::completeness( Business::blank() ), 'an empty profile is 0% complete' );
check(
	Business::completeness(
		array_merge(
			Business::blank(),
			array(
				'name'             => 'X',
				'business_type'    => 'Store',
				'primary_category' => 'Grocery',
				'description'      => 'd',
				'phone'            => '+1 555 0100',
				'email'            => 'a@b.com',
				'website'          => 'https://x.test',
				'logo_url'         => 'https://x.test/l.png',
				'social_profiles'  => array( 'facebook' => 'https://f.test' ),
			)
		)
	) === 100,
	'a fully filled profile is 100% complete'
);

// -- Location --------------------------------------------------------------

$loc = Location::validate( array_merge( Location::blank(), array( 'name' => '' ) ) );
check( isset( $loc->errors()['name'] ), 'a location with no name is invalid' );

$loc = Location::validate(
	array_merge(
		Location::blank(),
		array(
			'name'     => 'Downtown',
			'country'  => 'BGD',
			'latitude' => 120,
			'timezone' => 'Mars/Olympus',
			'status'   => 'exploded',
		)
	)
);
check( isset( $loc->errors()['country'] ), 'reports a bad country code' );
check( isset( $loc->errors()['latitude'] ), 'reports an out-of-range latitude' );
check( isset( $loc->errors()['timezone'] ), 'reports an unknown timezone' );
check( isset( $loc->errors()['status'] ), 'reports an unknown status' );

// 0,0 is in the Gulf of Guinea — a real place, and it must not be mistaken
// for "no coordinates".
$zero = Location::validate( array_merge( Location::blank(), array( 'name' => 'Null Island', 'latitude' => 0, 'longitude' => 0 ) ) );
check( $zero->is_valid(), 'accepts 0,0 as real coordinates' );

$cleared = Location::sanitize( array( 'latitude' => '', 'longitude' => '' ) );
check_same( null, $cleared['latitude'], 'an empty latitude clears to null' );

$kept = Location::sanitize( array( 'latitude' => 0 ) );
check_same( 0, $kept['latitude'], 'a zero latitude is not treated as empty' );

check_same(
	'12 Road 1, Gulshan, Dhaka, 1212, BD',
	Location::formatted_address(
		array_merge(
			Location::blank(),
			array( 'address_line_1' => '12 Road 1', 'city' => 'Gulshan', 'region' => 'Dhaka', 'postal_code' => '1212', 'country' => 'BD' )
		)
	),
	'formats an address, skipping empty parts'
);

check( ! Location::has_complete_address( Location::blank() ), 'an empty address is incomplete' );

// -- Opening hours ---------------------------------------------------------

$rows = OpeningHours::parse(
	array(
		'1' => array( 'open_time' => '09:00', 'close_time' => '17:30' ),
		'2' => array( 'is_closed' => true ),
		'3' => array( 'is_24h' => true ),
		'5' => array(
			'periods' => array(
				array( 'open_time' => '09:00', 'close_time' => '12:00' ),
				array( 'open_time' => '13:00', 'close_time' => '18:00' ),
			),
		),
	)
);
check_same( 5, count( $rows ), 'parses one row per period' );
check( OpeningHours::validate( $rows )->is_valid(), 'a well-formed week validates' );

$split = array_values(
	array_filter(
		$rows,
		static function ( $row ) {
			return 5 === $row['day_of_week'];
		}
	)
);
check_same( 2, count( $split ), 'a split shift is two rows on one day' );
check_same( array( 0, 1 ), array( $split[0]['period_index'], $split[1]['period_index'] ), 'split periods are indexed in order' );

// In a flat list, indexes 0 and 1 are themselves valid day numbers — trusting
// the index instead of the entry's own day would silently reassign days.
$flat = OpeningHours::parse(
	array(
		'periods' => array(
			array( 'day_of_week' => 6, 'open_time' => '10:00', 'close_time' => '14:00' ),
			array( 'day_of_week' => 0, 'is_closed' => true ),
		),
	)
);
check_same( array( 6, 0 ), array_column( $flat, 'day_of_week' ), 'an entry day_of_week wins over its array index' );

$overlap = OpeningHours::parse(
	array(
		'1' => array(
			'periods' => array(
				array( 'open_time' => '09:00', 'close_time' => '13:00' ),
				array( 'open_time' => '12:00', 'close_time' => '18:00' ),
			),
		),
	)
);
$overlap_result = OpeningHours::validate( $overlap );
check( ! $overlap_result->is_valid(), 'overlapping periods are rejected' );
check_same( array( 'hours.periods.overlap' ), $overlap_result->errors()['day_1'], 'overlap is keyed by day' );

// 22:00–02:00 is one continuous shift crossing midnight, not an error.
$overnight = OpeningHours::parse( array( '5' => array( 'open_time' => '22:00', 'close_time' => '02:00' ) ) );
check( OpeningHours::validate( $overnight )->is_valid(), 'an overnight period is valid' );

$zero_length = OpeningHours::parse( array( '1' => array( 'open_time' => '09:00', 'close_time' => '09:00' ) ) );
check(
	isset( OpeningHours::validate( $zero_length )->errors()['day_1.period_0.close_time'] ),
	'a zero-length period is rejected, keyed to its own field'
);

$missing_close = OpeningHours::parse( array( '1' => array( 'open_time' => '09:00' ) ) );
check(
	isset( OpeningHours::validate( $missing_close )->errors()['day_1.period_0.close_time'] ),
	'a missing close time is reported against that field'
);

$bad_day = OpeningHours::validate( OpeningHours::parse( array( '9' => array( 'open_time' => '09:00', 'close_time' => '10:00' ) ) ) );
check( ! $bad_day->is_valid(), 'an impossible day number is rejected' );

// Unconfigured is not closed: conflating them silently publishes
// "closed Sunday" for a business that just hasn't filled Sunday in.
$payload = OpeningHours::to_payload(
	array(
		array( 'day_of_week' => 1, 'period_index' => 0, 'open_time' => '09:00:00', 'close_time' => '17:30:00', 'is_closed' => 0, 'is_24h' => 0 ),
	)
);
$by_day = array();
foreach ( $payload['days'] as $day ) {
	$by_day[ $day['day_of_week'] ] = $day;
}
check_same( 7, count( $payload['days'] ), 'the payload always covers all seven days' );
check( $by_day[1]['configured'], 'a day with rows reads as configured' );
check( ! $by_day[4]['configured'], 'a day with no rows reads as unconfigured, not closed' );
check_same( array(), $by_day[4]['periods'], 'an unconfigured day has no periods' );
check( $payload['has_any_hours'], 'has_any_hours is true when a day is open' );
check_same( '09:00', $by_day[1]['periods'][0]['open_time'], 'times are trimmed to HH:MM for display' );

$overnight_payload = OpeningHours::to_payload(
	array( array( 'day_of_week' => 5, 'period_index' => 0, 'open_time' => '22:00:00', 'close_time' => '02:00:00', 'is_closed' => 0, 'is_24h' => 0 ) )
);
foreach ( $overnight_payload['days'] as $day ) {
	if ( 5 === $day['day_of_week'] ) {
		check( $day['periods'][0]['is_overnight'], 'an overnight period is flagged as such' );
	}
}

$order = DayOfWeek::display_order();
$sorted = $order;
sort( $sorted );
check_same( 7, count( $order ), 'display order covers every day exactly once' );
check_same( array( 0, 1, 2, 3, 4, 5, 6 ), $sorted, 'display order contains each day once' );

// Storage numbering is date('w') and display order is a separate concern —
// conflating them would shift every location's hours by a day.
check_same( 1, $order[0], 'display order starts on the site week-start day, not day 0' );

// -- Service ---------------------------------------------------------------

$svc = Service::validate( array_merge( Service::blank(), array( 'name' => 'SEO', 'slug' => 'seo', 'price' => 120 ) ) );
check( ! $svc->is_valid(), 'a price without a currency is invalid' );
check_same( array( 'service.currency.required_with_price' ), $svc->errors()['currency'], 'reports the documented currency code' );

$svc = Service::validate( array_merge( Service::blank(), array( 'name' => 'SEO', 'slug' => 'seo', 'price' => 120, 'currency' => 'USD' ) ) );
check( $svc->is_valid(), 'a price with a currency is valid' );

// Zero is a real published price ("free consultation"); no price is null.
$svc = Service::validate( array_merge( Service::blank(), array( 'name' => 'Consult', 'slug' => 'consult', 'price' => 0, 'currency' => 'USD' ) ) );
check( $svc->is_valid(), 'a price of zero is a real price' );

$svc = Service::validate( array_merge( Service::blank(), array( 'name' => 'SEO', 'slug' => 'seo', 'price' => -5, 'currency' => 'USD' ) ) );
check( isset( $svc->errors()['price'] ), 'a negative price is rejected' );

$cleared = Service::sanitize( array( 'price' => '' ) );
check_same( null, $cleared['price'], 'an empty price clears to null' );

$svc = Service::validate( array_merge( Service::blank(), array( 'name' => 'SEO', 'slug' => 'seo', 'currency' => 'DOLLARS' ) ) );
check( isset( $svc->errors()['currency'] ), 'a non-ISO currency is rejected' );

// -- Limits ----------------------------------------------------------------

check_same( 1, Limits::get( Limits::LOCATIONS ), 'free allows one location' );
check_same( 5, Limits::get( Limits::SERVICES ), 'free allows five services' );
check( Limits::can_add( Limits::LOCATIONS, 0 ), 'the first location is allowed' );
check( ! Limits::can_add( Limits::LOCATIONS, 1 ), 'a second location is refused' );

// Raising a limit must be a filter, not a code change — this is what stops a
// Pro tier having to rewrite core.
add_filter(
	'fhint_limits',
	static function ( $limits ) {
		$limits['locations'] = 5;
		return $limits;
	}
);
check_same( 5, Limits::get( Limits::LOCATIONS ), 'the limits filter raises the ceiling' );
check( Limits::can_add( Limits::LOCATIONS, 1 ), 'a second location is allowed once filtered' );

$report = Limits::report( Limits::LOCATIONS, 2 );
check_same( 3, $report['remaining'], 'the limit report counts what is left' );

// -- Logger redaction ------------------------------------------------------

$redacted = Logger::redact(
	array(
		'api_key'      => 'sk-secret',
		'google'       => array( 'access_token' => 'tok', 'account' => 'a@b.com' ),
		'monkey'       => 'not a secret',
		'client_secret' => 'shh',
		'Authorization' => 'Bearer x',
	)
);
check_same( '[redacted]', $redacted['api_key'], 'redacts an api key' );
check_same( '[redacted]', $redacted['google']['access_token'], 'redacts nested credentials' );
check_same( '[redacted]', $redacted['client_secret'], 'redacts a client secret' );
check_same( '[redacted]', $redacted['Authorization'], 'redacts regardless of case' );
check_same( 'not a secret', $redacted['monkey'], 'does not redact a word merely containing "key"' );
check_same( 'a@b.com', $redacted['google']['account'], 'leaves non-secret values intact' );

finish( 'Domain logic' );
