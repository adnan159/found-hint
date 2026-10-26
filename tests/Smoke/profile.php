<?php
/**
 * The Business Profile's own rules.
 *
 * Run with plain PHP: `php tests/Smoke/profile.php`.
 *
 * Most of the profile is existing rules reached by a new route, and those
 * are proved where they live. What is new, and proved here, is the part that
 * had no home before: a description Google would refuse, hours for a named
 * date, and attribute values whose kind is Google's to decide.
 *
 * Reading and saving through the route needs a database and is covered in
 * tests/Integration/database.php.
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\App\Business\Business;
use FHINT\App\Location\LocationAttributes;
use FHINT\App\Location\SpecialHours;
use FHINT\App\Profile\Profile;
use FHINT\App\Profile\Sections\Media;

echo "Profile\n";

/**
 * The validation codes for a business with one field changed.
 *
 * @param array $changes Fields to set on an otherwise valid business.
 * @return array<string, string[]>
 */
function fhint_profile_errors( array $changes ) {
	$record = array_merge( Business::blank(), array( 'name' => 'Northside Dental Care' ), $changes );

	return Business::validate( $record )->errors();
}

/**
 * The validation codes for a list of special days.
 *
 * @param array $days Days as a client would send them.
 * @return array<string, string[]>
 */
function fhint_special_errors( array $days ) {
	return SpecialHours::validate( SpecialHours::parse( $days ) )->errors();
}

// ── the description ─────────────────────────────────────────────────────

check_same( 750, Business::DESCRIPTION_MAX, 'Google allows a description of 750 characters' );

check_same( array(), fhint_profile_errors( array( 'description' => str_repeat( 'a', 750 ) ) ), 'exactly 750 characters is accepted' );
check_same(
	array( 'description' => array( 'business.description.too_long' ) ),
	fhint_profile_errors( array( 'description' => str_repeat( 'a', 751 ) ) ),
	'one more is refused'
);
// Counted in characters, not bytes: an accented description must not be
// refused at half the length an unaccented one is allowed.
check_same( array(), fhint_profile_errors( array( 'description' => str_repeat( 'é', 750 ) ) ), 'the limit counts characters, not bytes' );

check( Business::has_link( 'Book at https://northsidedental.example today' ), 'a full web address is a link' );
check( Business::has_link( 'Visit www.northsidedental.example for hours' ), 'so is one starting with www.' );
check( Business::has_link( 'Find us at northsidedental.com' ), 'and a bare domain' );
check( Business::has_link( 'HTTP://SHOUTING.EXAMPLE' ), 'whatever its case' );

check( ! Business::has_link( 'A family and cosmetic dental practice in downtown Austin.' ), 'ordinary prose is not a link' );
check( ! Business::has_link( 'We open late.in an emergency, call us.' ), 'a missing space after a full stop is not a link' );
check( ! Business::has_link( 'Check-ups from $45.00, e.g. cleanings and X-rays.' ), 'prices and abbreviations are not links' );
check( ! Business::has_link( 'Email us any time.' ), 'nor is a sentence that merely ends' );
check( ! Business::has_link( '' ), 'an empty description has no link' );

check_same(
	array( 'description' => array( 'business.description.has_link' ) ),
	fhint_profile_errors( array( 'description' => 'Book online at https://northsidedental.example' ) ),
	'a description with a link is refused, as Google would refuse it'
);
check_same(
	array( 'description' => array( 'business.description.too_long', 'business.description.has_link' ) ),
	fhint_profile_errors( array( 'description' => str_repeat( 'a', 760 ) . ' www.example.com' ) ),
	'a description that is both too long and linked is told both'
);

// ── special hours: reading what was sent ────────────────────────────────

$fhint_rows = SpecialHours::parse(
	array(
		array(
			'date'      => '2026-12-25',
			'is_closed' => true,
			'note'      => 'Christmas Day',
		),
		array(
			'date'    => '2026-12-24',
			'periods' => array(
				array(
					'open_time'  => '09:00',
					'close_time' => '12:00',
				),
				array(
					'open_time'  => '13:00',
					'close_time' => '15:00',
				),
			),
		),
		array(
			'date'   => '2026-12-31',
			'is_24h' => true,
		),
		array(
			'date'       => '2027-01-02',
			'open_time'  => '10:00',
			'close_time' => '14:00',
		),
	)
);

check_same( 5, count( $fhint_rows ), 'a closed day is one row, a split day two, and a single period one' );
check( $fhint_rows[0]['is_closed'] && null === $fhint_rows[0]['open_time'], 'a closed day carries no times' );
check_same( 'Christmas Day', $fhint_rows[0]['note'], 'the owner\'s label for the day is kept' );
check_same( array( 0, 1 ), array( $fhint_rows[1]['period_index'], $fhint_rows[2]['period_index'] ), 'a day with a break numbers its periods' );
check_same( '09:00:00', $fhint_rows[1]['open_time'], 'times are normalised the way weekly hours are' );
check( $fhint_rows[3]['is_24h'] && ! $fhint_rows[3]['is_closed'], 'a day open round the clock is its own state' );
check_same( '10:00:00', $fhint_rows[4]['open_time'], 'a day may give its one period directly' );

// Closed wins over times sent alongside it: "closed 09:00–17:00" means nothing.
$fhint_closed = SpecialHours::parse(
	array(
		array(
			'date'       => '2026-12-25',
			'is_closed'  => true,
			'open_time'  => '09:00',
			'close_time' => '17:00',
		),
	)
);

check_same( null, $fhint_closed[0]['open_time'], 'times sent with a closed day are dropped' );

check_same( array(), SpecialHours::parse( 'nonsense' ), 'a payload that is not a list is no days' );

// ── special hours: the rules ────────────────────────────────────────────

check_same(
	array(),
	fhint_special_errors(
		array(
			array(
				'date'      => '2026-12-25',
				'is_closed' => true,
			),
			array(
				'date'       => '2026-12-24',
				'open_time'  => '09:00',
				'close_time' => '13:00',
			),
		)
	),
	'well-formed special days are accepted'
);

check_same(
	array( 'day_0.date' => array( 'special_hours.date.invalid' ) ),
	fhint_special_errors(
		array(
			array(
				'date'      => '2026-02-30',
				'is_closed' => true,
			),
		)
	),
	'a date that does not exist is refused'
);
check_same(
	array( 'day_0.date' => array( 'special_hours.date.invalid' ) ),
	fhint_special_errors( array( array( 'is_closed' => true ) ) ),
	'and so is a day with no date at all'
);

// Keyed by position, so the message lands on the second row — the one that
// repeats — and not on the first, which was fine.
check_same(
	array( 'day_1.date' => array( 'special_hours.date.duplicate' ) ),
	fhint_special_errors(
		array(
			array(
				'date'      => '2026-12-25',
				'is_closed' => true,
			),
			array(
				'date'   => '2026-12-25',
				'is_24h' => true,
			),
		)
	),
	'the same date twice is refused, on the row that repeats it'
);

// The period rules are the weekly ones, reached through the same code.
check_same(
	array( 'day_0.period_0.close_time' => array( 'hours.close_time.required' ) ),
	fhint_special_errors(
		array(
			array(
				'date'      => '2026-12-24',
				'open_time' => '09:00',
			),
		)
	),
	'a period missing its closing time is refused'
);
check_same(
	array( 'day_1' => array( 'hours.periods.overlap' ) ),
	fhint_special_errors(
		array(
			array(
				'date'      => '2026-12-25',
				'is_closed' => true,
			),
			array(
				'date'    => '2026-12-24',
				'periods' => array(
					array(
						'open_time'  => '09:00',
						'close_time' => '13:00',
					),
					array(
						'open_time'  => '12:00',
						'close_time' => '15:00',
					),
				),
			),
		)
	),
	'overlapping periods on one date are refused, keyed to that date\'s row'
);
check(
	isset( fhint_special_errors( array( array( 'date' => '2026-12-24' ) ) )['day_0.period_0.open_time'] ),
	'a day that is neither closed nor given hours is asked for them'
);

// ── special hours: the shape sent back ──────────────────────────────────

$fhint_payload = SpecialHours::to_payload(
	array(
		array(
			'date'         => '2026-12-25',
			'period_index' => 0,
			'open_time'    => null,
			'close_time'   => null,
			'is_closed'    => 1,
			'is_24h'       => 0,
			'note'         => 'Christmas Day',
		),
		array(
			'date'         => '2026-12-24',
			'period_index' => 1,
			'open_time'    => '13:00:00',
			'close_time'   => '15:00:00',
			'is_closed'    => 0,
			'is_24h'       => 0,
			'note'         => '',
		),
		array(
			'date'         => '2026-12-24',
			'period_index' => 0,
			'open_time'    => '09:00:00',
			'close_time'   => '12:00:00',
			'is_closed'    => 0,
			'is_24h'       => 0,
			'note'         => '',
		),
	)
);

check_same( array( '2026-12-24', '2026-12-25' ), array_column( $fhint_payload, 'date' ), 'days come back oldest first' );
check_same( array( '09:00', '13:00' ), array_column( $fhint_payload[0]['periods'], 'open_time' ), 'with a day\'s periods in order, as HH:MM' );
check( $fhint_payload[1]['is_closed'] && array() === $fhint_payload[1]['periods'], 'a closed day comes back closed, with no periods' );
check_same( 'Christmas Day', $fhint_payload[1]['note'], 'and its label' );

// ── attribute values ────────────────────────────────────────────────────

$fhint_parsed = LocationAttributes::parse(
	array(
		'has_wheelchair_accessible_entrance' => true,
		'attributes/has_restroom'            => 'false',
		'wi_fi'                              => 'free_wi_fi',
		'pay_credit_card_types_accepted'     => array( 'visa', 'mastercard', 'visa' ),
		'url_appointment'                    => array( 'https://northsidedental.example/book' ),
		'has_delivery'                       => null,
		'Not An Id!'                         => true,
		'pay_check'                          => 12,
	)
);

check_same( LocationAttributes::TYPE_BOOL, $fhint_parsed['set']['has_wheelchair_accessible_entrance']['type'], 'true is a yes/no answer' );
check_same( false, $fhint_parsed['set']['has_restroom']['value'], 'the word "false" is a no, and Google\'s attributes/ prefix is understood' );
check_same( LocationAttributes::TYPE_ENUM, $fhint_parsed['set']['wi_fi']['type'], 'a single word is one choice' );
check_same( array( 'visa', 'mastercard' ), $fhint_parsed['set']['pay_credit_card_types_accepted']['value'], 'a list is several choices, without repeats' );
check_same( LocationAttributes::TYPE_REPEATED_ENUM, $fhint_parsed['set']['pay_credit_card_types_accepted']['type'], 'and typed as such' );
check_same( LocationAttributes::TYPE_URL, $fhint_parsed['set']['url_appointment']['type'], 'a list of web addresses is a link attribute' );

// null withdraws an answer; false gives one. They must not be confused.
check_same( array( 'has_delivery' ), $fhint_parsed['remove'], 'null removes the answer' );
check( ! isset( $fhint_parsed['set']['has_delivery'] ), 'and is not stored as a no' );
check( isset( $fhint_parsed['set']['has_restroom'] ), 'while an explicit no is stored' );

check_same( array( 'Not An Id!', 'pay_check' ), $fhint_parsed['invalid'], 'an id that could not be Google\'s, and a value of no kind Google has, are both rejected' );
check_same(
	array(
		'Not An Id!' => array( 'attributes.value.invalid' ),
		'pay_check'  => array( 'attributes.value.invalid' ),
	),
	LocationAttributes::validate( $fhint_parsed )->errors(),
	'and each is named in the errors'
);

check_same( array(), LocationAttributes::parse( 'nonsense' )['set'], 'a payload that is not a map stores nothing' );
check_same( 'has_wifi', LocationAttributes::normalize_id( ' Attributes/Has_WiFi ' ), 'an id is normalised to the form it is stored in' );
check_same( '', LocationAttributes::normalize_id( '1st' ), 'and one that could not be an attribute id is refused' );

// ── the document's shape ────────────────────────────────────────────────

check_same(
	array( 'info', 'address', 'hours', 'social', 'attributes', 'services', 'media' ),
	array_keys( Profile::SECTIONS ),
	'the profile has its seven sections, in screen order'
);

$fhint_unknown = Profile::save( 'payments', array() );

check( is_wp_error( $fhint_unknown ) && 'fhint_unknown_section' === $fhint_unknown->get_error_code(), 'saving a section that does not exist is refused' );

$fhint_photos = Media::save( array( 'logo' => 'anything' ) );

check( is_wp_error( $fhint_photos ) && 'fhint_section_read_only' === $fhint_photos->get_error_code(), 'photos cannot be saved as a section' );

finish( 'Profile' );
