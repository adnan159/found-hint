<?php
/**
 * Database round-trip verification.
 *
 * Everything the smoke suites cannot prove: that the SQL runs, that dbDelta
 * is idempotent, that the cascades fire, and that a value written comes
 * back out the same.
 *
 * Run inside a WordPress install:
 *
 *     docker exec foundhunt_app php /var/www/html/wp-content/plugins/found-hint/tests/Integration/database.php
 *
 * **It does not touch the site's own data.** Every table name resolves
 * through `Tables::name()`, which reads `$wpdb->prefix` at call time, so
 * swapping the prefix gives this suite its own copy of every table against the
 * real MySQL. They are created at the start and dropped at the end. The
 * handful of `fhint_*` options the repositories stamp are snapshotted and
 * restored, so the site is left exactly as it was found.
 *
 * @package FoundHint
 */

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.Security.EscapeOutput.OutputNotEscaped

use FHINT\App\Audit\AuditRepository;
use FHINT\App\Audit\Runner;
use FHINT\App\Business\BusinessRepository;
use FHINT\App\Core\Limits;
use FHINT\App\Google\GoogleLocationRepository;
use FHINT\App\Google\Import;
use FHINT\App\Location\DayOfWeek;
use FHINT\App\Location\Location;
use FHINT\App\Location\LocationRepository;
use FHINT\App\Location\OpeningHoursRepository;
use FHINT\App\Location\SpecialHoursRepository;
use FHINT\App\Business\DescriptionHistoryRepository;
use FHINT\App\Location\LocationAttributeRepository;
use FHINT\App\Media\MediaRepository;
use FHINT\App\Nap\Nap;
use FHINT\App\Review\ReviewReply;
use FHINT\App\Review\ReviewRepository;
use FHINT\App\Review\Reviews as ReviewService;
use FHINT\App\Schema\Graph;
use FHINT\App\Schema\SchemaCache;
use FHINT\App\Service\ServiceRepository;
use FHINT\Database;
use FHINT\Database\Tables;

// Walk up to wp-load.php rather than counting directories, so the suite
// does not care how deeply the plugin happens to be installed.
$fhint_dir = __DIR__;

while ( ! file_exists( $fhint_dir . '/wp-load.php' ) ) {
	$parent = dirname( $fhint_dir );

	if ( $parent === $fhint_dir ) {
		fwrite( STDERR, "Could not find wp-load.php above " . __DIR__ . "\n" );
		exit( 1 );
	}

	$fhint_dir = $parent;
}

require_once $fhint_dir . '/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/upgrade.php';

global $wpdb;

$GLOBALS['__passed'] = 0;
$GLOBALS['__failed'] = 0;

/**
 * Assert a condition.
 *
 * @param bool   $condition Result under test.
 * @param string $label     What was checked.
 * @return void
 */
function check( $condition, $label ) {
	if ( $condition ) {
		$GLOBALS['__passed']++;
		return;
	}

	$GLOBALS['__failed']++;
	echo "  FAIL  {$label}\n";
}

/**
 * Assert two values match.
 *
 * @param mixed  $expected Expected.
 * @param mixed  $actual   Actual.
 * @param string $label    What was checked.
 * @return void
 */
function check_same( $expected, $actual, $label ) {
	if ( $expected === $actual ) {
		$GLOBALS['__passed']++;
		return;
	}

	$GLOBALS['__failed']++;
	echo "  FAIL  {$label}\n";
	echo '          expected: ' . var_export( $expected, true ) . "\n";
	echo '          actual:   ' . var_export( $actual, true ) . "\n";
}

echo "Database round-trip\n";

// -- Isolation -------------------------------------------------------------

$real_prefix = $wpdb->prefix;
$test_prefix = 'fhitest_';

// Options the repositories stamp. Restored at the end so the site is left
// as it was found.
$touched_options = array(
	'fhint_data_changed_at',
	'fhint_schema_cache',
	'fhint_settings',
	'fhint_google_tokens',
);

$saved_options = array();

foreach ( $touched_options as $option ) {
	$saved_options[ $option ] = get_option( $option, null );
}

$wpdb->prefix = $test_prefix;

/**
 * Put everything back, whatever happened.
 *
 * @return void
 */
function fhint_teardown() {
	global $wpdb, $real_prefix, $test_prefix, $saved_options;

	foreach ( array_keys( Tables::all() ) as $key ) {
		$name = $test_prefix . 'fhint_' . $key;
		$wpdb->query( "DROP TABLE IF EXISTS {$name}" );
	}

	$wpdb->prefix = $real_prefix;

	foreach ( $saved_options as $option => $value ) {
		if ( null === $value ) {
			delete_option( $option );
			continue;
		}

		update_option( $option, $value );
	}
}

register_shutdown_function( 'fhint_teardown' );

// -- Installation ----------------------------------------------------------

$changes = Database::create_tables();

check( ! empty( $changes ), 'the first run creates tables' );

$missing = Tables::missing();

check_same( array(), $missing, 'every declared table exists after installation' );
check_same( 14, count( Tables::all() ), 'all fourteen tables are declared' );

foreach ( array_keys( Tables::all() ) as $key ) {
	check( Tables::exists( $key ), "table {$key} exists in MySQL" );
}

// -- dbDelta idempotency ---------------------------------------------------
//
// The check that cannot be done without a database, and the one with the
// most expensive failure: a definition dbDelta disagrees with makes it
// re-issue the same ALTER on every single request, invisibly, forever.

$second = Database::create_tables();

check_same( array(), $second, 'running dbDelta again against an up-to-date database changes nothing' );

if ( ! empty( $second ) ) {
	echo "          dbDelta wanted to change:\n";

	foreach ( $second as $table => $change ) {
		echo '            ' . $table . ': ' . $change . "\n";
	}
}

$third = Database::create_tables();

check_same( array(), $third, 'and a third run is still empty' );

// -- Business --------------------------------------------------------------

$business = BusinessRepository::save(
	array(
		'name'            => 'Round Trip Dental',
		'legal_name'      => 'Round Trip Dental LLC',
		'business_type'   => 'Dentist',
		'description'     => 'Testing that values survive the database.',
		'phone'           => '+1 512 555 0134',
		'email'           => 'hello@roundtrip.test',
		'website'         => 'https://roundtrip.test',
		'social_profiles' => array( 'facebook' => 'https://facebook.com/roundtrip' ),
	)
);

check( is_array( $business ) && ! empty( $business['id'] ), 'a business can be written' );

$read = BusinessRepository::get();

check_same( 'Round Trip Dental', $read['name'], 'the name comes back unchanged' );
check_same( '+1 512 555 0134', $read['phone'], 'and the phone' );
check_same(
	'https://facebook.com/roundtrip',
	$read['social_profiles']['facebook'],
	'a JSON column round-trips back into an array'
);

// Unicode and quotes survive — the things that break when a column collation
// or an escape is wrong.
BusinessRepository::save( array( 'name' => "Ólafur's Café — 北京 ☕" ) );

check_same(
	"Ólafur's Café — 北京 ☕",
	BusinessRepository::get()['name'],
	'unicode, an apostrophe and an em dash all survive the round trip'
);

BusinessRepository::save( array( 'name' => 'Round Trip Dental' ) );

$business_id = (int) BusinessRepository::get()['id'];

// -- Locations -------------------------------------------------------------

$location = LocationRepository::create(
	array(
		'business_id'    => $business_id,
		'name'           => 'Downtown',
		'address_line_1' => '401 Congress Ave',
		'city'           => 'Austin',
		'region'         => 'TX',
		'postal_code'    => '78701',
		'country'        => 'US',
		'latitude'       => 30.2672,
		'longitude'      => -97.7431,
		'is_primary'     => true,
	)
);

check( is_array( $location ) && ! empty( $location['id'] ), 'a location can be written' );

$location_id = (int) $location['id'];
$read        = LocationRepository::find( $location_id );

check_same( 'Downtown', $read['name'], 'the location name round-trips' );
check_same( 30.2672, (float) $read['latitude'], 'a decimal column keeps its precision' );
check( $read['is_primary'], 'the primary flag round-trips as a boolean' );
check( ! empty( $read['created_at'] ), 'created_at is stamped by the repository' );

LocationRepository::update( $location_id, array( 'city' => 'Round Rock' ) );

check_same( 'Round Rock', LocationRepository::find( $location_id )['city'], 'an update writes' );
check_same(
	'401 Congress Ave',
	LocationRepository::find( $location_id )['address_line_1'],
	'and leaves the fields it was not given alone'
);

// -- Opening hours, including the three-state model ------------------------

// Flat rows, the shape OpeningHours::parse() produces. Wednesday is
// deliberately absent: never configured, which is not the same as closed.
OpeningHoursRepository::replace(
	$location_id,
	array(
		array( 'day_of_week' => DayOfWeek::MONDAY, 'period_index' => 0, 'open_time' => '09:00', 'close_time' => '12:00', 'is_closed' => false, 'is_24h' => false ),
		array( 'day_of_week' => DayOfWeek::MONDAY, 'period_index' => 1, 'open_time' => '13:00', 'close_time' => '17:00', 'is_closed' => false, 'is_24h' => false ),
		array( 'day_of_week' => DayOfWeek::TUESDAY, 'period_index' => 0, 'open_time' => '', 'close_time' => '', 'is_closed' => true, 'is_24h' => false ),
		array( 'day_of_week' => DayOfWeek::SATURDAY, 'period_index' => 0, 'open_time' => '', 'close_time' => '', 'is_closed' => false, 'is_24h' => true ),
	)
);

$rows  = OpeningHoursRepository::for_location( $location_id );
$byday = array();

foreach ( $rows as $row ) {
	$byday[ (int) $row['day_of_week'] ][] = $row;
}

check_same( 2, count( $byday[ DayOfWeek::MONDAY ] ), 'a split shift stores two rows' );
check_same( '09:00:00', $byday[ DayOfWeek::MONDAY ][0]['open_time'], 'the morning shift opens at 09:00' );
check_same( '13:00:00', $byday[ DayOfWeek::MONDAY ][1]['open_time'], 'the afternoon shift at 13:00' );
check( (bool) $byday[ DayOfWeek::TUESDAY ][0]['is_closed'], 'an explicitly closed day is stored as closed' );
check( (bool) $byday[ DayOfWeek::SATURDAY ][0]['is_24h'], 'a 24-hour day is stored as such' );
check( ! isset( $byday[ DayOfWeek::WEDNESDAY ] ), 'a day nobody configured has no rows at all — unset is not closed' );

// -- Services and ordering -------------------------------------------------

$one   = ServiceRepository::create( array( 'business_id' => $business_id, 'name' => 'Check-up' ) );
$two   = ServiceRepository::create( array( 'business_id' => $business_id, 'name' => 'Whitening' ) );
$three = ServiceRepository::create( array( 'business_id' => $business_id, 'name' => 'Cleaning' ) );

check_same( 3, ServiceRepository::count(), 'three services are stored' );
check_same( 'check-up', $one['slug'], 'a slug is derived on write' );

ServiceRepository::reorder( array( (int) $three['id'], (int) $one['id'], (int) $two['id'] ) );

$ordered = array_map(
	static function ( $service ) {
		return $service['name'];
	},
	ServiceRepository::all()
);

check_same( array( 'Cleaning', 'Check-up', 'Whitening' ), $ordered, 'reordering persists and reads back in order' );

// -- Plan limits against real counts ---------------------------------------

$limits = Limits::report( Limits::LOCATIONS, LocationRepository::count() );

check_same( 1, (int) $limits['used'], 'the location limit counts the real row' );
check( $limits['can_add'], 'and a second location is allowed, because Free is not capped at one' );
check( $limits['unlimited'], 'which the report says plainly' );

// The limit is enforced by the REST layer, not the repository — so it is
// checked there, over the real stack, further down.

// -- Google mapping SQL ----------------------------------------------------
//
// None of this had ever executed. The rules it encodes — a sync never
// changing a mapping, one-to-one in both directions — live entirely in SQL.

GoogleLocationRepository::upsert(
	array(
		'account_name'       => 'accounts/1',
		'location_name'      => 'locations/456',
		'title'              => 'Round Trip Dental',
		'store_code'         => 'DT-01',
		'address'            => '401 Congress Ave, Austin',
		'phone'              => '+1 512 555 0134',
		'website'            => 'https://roundtrip.test',
		'verification_state' => 'OK',
		'payload'            => array( 'metadata' => array( 'canOperateLocalPost' => true ) ),
	)
);

check_same( 1, count( GoogleLocationRepository::all() ), 'a Google location is stored' );

$stored = GoogleLocationRepository::find_by_location_name( 'locations/456' );

check_same( 'Round Trip Dental', $stored['title'], 'its title round-trips' );
check_same( 0, $stored['fhint_location_id'], 'and it starts unmapped' );

GoogleLocationRepository::map( 'locations/456', $location_id );

check_same(
	$location_id,
	GoogleLocationRepository::find_by_location_name( 'locations/456' )['fhint_location_id'],
	'mapping writes the link'
);
check_same(
	'locations/456',
	GoogleLocationRepository::find_by_fhint_location( $location_id )['location_name'],
	'and it can be found from our side'
);

// A sync must never undo the operator's decision.
GoogleLocationRepository::upsert(
	array(
		'account_name'       => 'accounts/1',
		'location_name'      => 'locations/456',
		'title'              => 'Round Trip Dental (renamed in Google)',
		'store_code'         => 'DT-01',
		'address'            => '401 Congress Ave, Austin',
		'phone'              => '',
		'website'            => '',
		'verification_state' => 'PENDING_EDITS',
		'payload'            => array(),
	)
);

$after = GoogleLocationRepository::find_by_location_name( 'locations/456' );

check_same( 'Round Trip Dental (renamed in Google)', $after['title'], 're-reading Google updates the profile' );
check_same( $location_id, $after['fhint_location_id'], 'but leaves the mapping alone' );
check_same( 1, count( GoogleLocationRepository::all() ), 'and updates rather than inserting a duplicate' );

// One-to-one: mapping our location to a different profile releases the old.
GoogleLocationRepository::upsert(
	array(
		'account_name'       => 'accounts/1',
		'location_name'      => 'locations/789',
		'title'              => 'Second Profile',
		'store_code'         => '',
		'address'            => '',
		'phone'              => '',
		'website'            => '',
		'verification_state' => 'OK',
		'payload'            => array(),
	)
);

GoogleLocationRepository::map( 'locations/789', $location_id );

check_same(
	0,
	GoogleLocationRepository::find_by_location_name( 'locations/456' )['fhint_location_id'],
	'mapping elsewhere releases the previous profile'
);
check_same(
	$location_id,
	GoogleLocationRepository::find_by_location_name( 'locations/789' )['fhint_location_id'],
	'and claims the new one'
);

check( '' !== GoogleLocationRepository::last_synced_at(), 'the last sync time is readable' );

// -- Importing a Google profile, with Google answered in-process -----------
//
// The read is stubbed; everything else is real: the mapping lookup, the
// comparison, and the writes through the ordinary repositories.

update_option(
	'fhint_google_tokens',
	array(
		'access_token'  => 'ya29.integration',
		'refresh_token' => '1//integration',
		'expires_at'    => time() + 3600,
		'scope'         => 'https://www.googleapis.com/auth/business.manage',
		'token_type'    => 'Bearer',
		'account_email' => 'integration@example.test',
		'connected_at'  => time(),
		'source'        => 'connect',
	)
);

GoogleLocationRepository::upsert(
	array(
		'account_name'       => 'accounts/999',
		'location_name'      => 'locations/import-me',
		'store_code'         => '',
		'title'              => 'Imported Coffee',
		'address'            => '12 Dock Road, Bristol',
		'phone'              => '0117 496 0000',
		'website'            => 'https://imported.example',
		'verification_state' => 'VERIFIED',
		'payload'            => array(),
	)
);

GoogleLocationRepository::map( 'locations/import-me', $location_id );

$import_requests = array();

$fake_business_information = static function ( $pre, $args, $url ) use ( &$import_requests ) {
	if ( false === strpos( $url, 'mybusinessbusinessinformation.googleapis.com' ) ) {
		return $pre;
	}

	$import_requests[] = $url;

	if ( false !== strpos( $url, '/attributes' ) ) {
		return array(
			'headers'  => array(),
			'body'     => wp_json_encode(
				array(
					'attributes' => array(
						array(
							'name'      => 'attributes/url_facebook',
							'uriValues' => array( array( 'uri' => 'https://facebook.com/imported' ) ),
						),
						array(
							'name'   => 'attributes/has_delivery',
							'values' => array( true ),
						),
					),
				)
			),
			'response' => array(
				'code'    => 200,
				'message' => 'OK',
			),
			'cookies'  => array(),
		);
	}

	return array(
		'headers'  => array(),
		'body'     => wp_json_encode(
			array(
				'name'              => 'locations/import-me',
				'title'             => 'Imported Coffee',
				'categories'        => array(
					'primaryCategory' => array(
						'displayName'  => 'Coffee shop',
						'serviceTypes' => array(
							array(
								'serviceTypeId' => 'job_type_id:espresso',
								'displayName'   => 'Espresso bar',
							),
						),
					),
				),
				'serviceItems'      => array(
					array( 'structuredServiceItem' => array( 'serviceTypeId' => 'job_type_id:espresso' ) ),
				),
				'storefrontAddress' => array(
					'addressLines'       => array( '12 Dock Road' ),
					'locality'           => 'Bristol',
					'administrativeArea' => 'England',
					'postalCode'         => 'BS1 4XY',
					'regionCode'         => 'GB',
				),
				'phoneNumbers'      => array( 'primaryPhone' => '0117 496 0000' ),
				'websiteUri'        => 'https://imported.example',
				'profile'           => array( 'description' => 'Coffee by the water.' ),
				// The shape a real profile came back in: open all day, which
				// Google writes as midnight to hour 24.
				'regularHours'      => array(
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
		),
		'response' => array(
			'code'    => 200,
			'message' => 'OK',
		),
		'cookies'  => array(),
	);
};

add_filter( 'pre_http_request', $fake_business_information, 10, 3 );

// Cleared first, so "empty here is ticked" is tested against a known state
// rather than whatever earlier sections happened to leave behind.
BusinessRepository::save( array( 'description' => '' ) );

$preview = Import::preview( 'locations/import-me' );

check( ! is_wp_error( $preview ), 'a preview can be read' );
check_same( 'locations/import-me', $preview['location_name'], 'for the mapped profile' );
check( false === $preview['creates_location'], 'and it imports into the location that exists' );
check( false !== strpos( $import_requests[0], 'readMask=' ), 'the read carries a readMask, which Google requires' );
check( false !== strpos( rawurldecode( $import_requests[0] ), 'locations/import-me' ), 'and names the location unencoded' );

$preview_fields = array();

foreach ( $preview['fields'] as $field ) {
	$preview_fields[ $field['key'] ] = $field;
}

check( $preview_fields['description']['suggested'], 'a field we hold nothing for is ticked' );
check( ! $preview_fields['phone']['suggested'], 'a phone already stored here is not' );

$before_phone = LocationRepository::find( $location_id )['phone'];

$result = Import::apply( array( 'description', 'hours' ), 'locations/import-me' );

check( ! is_wp_error( $result ), 'the chosen fields import' );
check_same( array( 'description', 'hours' ), $result['applied'], 'and only those' );

check_same(
	'Coffee by the water.',
	BusinessRepository::get()['description'],
	'the description reached the business record'
);
check_same( $before_phone, LocationRepository::find( $location_id )['phone'], 'an unticked phone was left alone' );

$imported_hours = OpeningHoursRepository::for_location( $location_id );
$monday         = array();

foreach ( $imported_hours as $row ) {
	if ( DayOfWeek::MONDAY === (int) $row['day_of_week'] ) {
		$monday[] = $row;
	}
}

check( (bool) $monday[0]['is_24h'], 'a day Google says is open round the clock is stored as 24 hours' );
check_same( 7, count( $imported_hours ), 'and every other day is stored closed, as Google means it' );

$skipped = Import::apply( array( 'website' ), 'locations/import-me' );

check_same( 'https://imported.example', LocationRepository::find( $location_id )['website'], 'a second import writes the website' );
check( in_array( 'website', $skipped['applied'], true ), 'and reports it as applied' );

// A site with nothing in it at all: the ordinary first run, where Google's
// profile has to become the business as well as the location. This used to
// refuse with "add your business name first", which is exactly the typing
// an import exists to avoid.
$saved_business = BusinessRepository::get();

BusinessRepository::delete();
GoogleLocationRepository::map( 'locations/import-me', 0 );

check_same( null, BusinessRepository::get(), 'the site now has no business' );
check_same( 0, LocationRepository::count(), 'and no location' );

$empty_preview = Import::preview( 'locations/import-me' );

check( true === $empty_preview['creates_business'], 'the preview says it will create the business' );
check( true === $empty_preview['creates_location'], 'and the location' );

$from_nothing = Import::apply(
	array( 'name', 'description', 'phone', 'address', 'hours' ),
	'locations/import-me'
);

check( ! is_wp_error( $from_nothing ), 'importing into an empty site works' );
check( true === $from_nothing['created_business'], 'and reports creating the business' );

$new_business = BusinessRepository::get();

check_same( 'Imported Coffee', $new_business['name'], 'whose name came from Google' );
check_same( '0117 496 0000', $new_business['phone'], 'with the phone on the business, where the screens read it' );
check_same( 1, LocationRepository::count(), 'and one location to go with it' );
check(
	(bool) LocationRepository::find( (int) $from_nothing['location_id'] )['is_primary'],
	'marked primary, being the first'
);

// -- The guided import: one request per step ---------------------------------
//
// Run against the business the import above just created, which is about to
// be removed anyway.
$fhint_reads_before = count( $import_requests );
$fhint_step_results = array();

foreach ( array_keys( Import::STEPS ) as $fhint_step_id ) {
	$fhint_step_results[ $fhint_step_id ] = Import::step( $fhint_step_id, 'locations/import-me' );
}

check_same(
	array( 'identity', 'category', 'address', 'contact', 'hours', 'services' ),
	array_keys( $fhint_step_results ),
	'the guided import has six steps, in the order a person is shown them'
);
check_same(
	array(
		'identity' => 'imported',
		'category' => 'imported',
		'address'  => 'imported',
		'contact'  => 'imported',
		'hours'    => 'imported',
		'services' => 'imported',
	),
	array_map(
		static function ( $result ) {
			return is_wp_error( $result ) ? $result->get_error_code() : $result['status'];
		},
		$fhint_step_results
	),
	'each step imports its own part'
);
check_same( array( 'name', 'description' ), $fhint_step_results['identity']['applied'], 'a step writes only the fields that are its own' );
check_same( array( 'phone', 'website', 'social' ), $fhint_step_results['contact']['applied'], 'the contact step carries the phone, the website and the social links' );
check_same( array( 'business_type' ), $fhint_step_results['category']['applied'], 'a step imports what Google has and leaves out what it does not' );
check_same( array( 'category', '' ), array( $fhint_step_results['identity']['next'], $fhint_step_results['services']['next'] ), 'and says which step follows, or that none does' );
check_same( 2, count( $import_requests ) - $fhint_reads_before, 'six steps cost one read of Google — the location and its attributes — not six' );
check_same( 'CafeOrCoffeeShop', BusinessRepository::get()['business_type'], 'what a step imports is saved' );
check( in_array( 'Espresso bar', array_column( ServiceRepository::all(), 'name' ), true ), 'down to the services' );

$fhint_reads_before = count( $import_requests );

Import::step( 'identity', 'locations/import-me' );

check_same( 2, count( $import_requests ) - $fhint_reads_before, 'starting again reads Google again rather than trusting the earlier answer' );

delete_transient( 'fhint_import_read_' . md5( 'locations/import-me' ) );

$fhint_reads_before = count( $import_requests );

Import::step( 'hours', 'locations/import-me' );

check_same( 2, count( $import_requests ) - $fhint_reads_before, 'and a later step with no stored answer to use asks Google itself' );
check( is_wp_error( Import::step( 'everything', 'locations/import-me' ) ), 'a step that does not exist is refused' );
check_same( 'unchanged', Import::step( 'services', 'locations/import-me' )['status'], 'a step with nothing new to add says so instead of claiming an import' );

// Where a sign-in lands: the guided import the first time, the Google screen
// once a listing is in use.
check_same( '#/google', FHINT\App\Google\Connection::landing_route(), 'connecting again with a listing in use returns to the Google screen' );

GoogleLocationRepository::map( 'locations/import-me', 0 );

check_same( '#/setup/google', FHINT\App\Google\Connection::landing_route(), 'a first connection lands on the guided import' );

GoogleLocationRepository::map( 'locations/import-me', (int) $from_nothing['location_id'] );

foreach ( ServiceRepository::all() as $fhint_leftover ) {
	ServiceRepository::delete( (int) $fhint_leftover['id'] );
}

// Put the suite's own business and location back for the sections below.
LocationRepository::delete( (int) $from_nothing['location_id'] );
BusinessRepository::delete();

$restored = BusinessRepository::save( $saved_business );
$location = LocationRepository::create(
	array(
		'business_id'    => (int) $restored['id'],
		'name'           => 'Downtown',
		'address_line_1' => '401 Congress Ave',
		'city'           => 'Round Rock',
		'region'         => 'TX',
		'postal_code'    => '78701',
		'country'        => 'US',
		'phone'          => '+1 512 555 0134',
		'is_primary'     => true,
	)
);

$location_id = (int) $location['id'];

GoogleLocationRepository::map( 'locations/import-me', $location_id );
OpeningHoursRepository::replace(
	$location_id,
	array(
		array( 'day_of_week' => DayOfWeek::MONDAY, 'period_index' => 0, 'open_time' => '09:00', 'close_time' => '12:00', 'is_closed' => false, 'is_24h' => false ),
		array( 'day_of_week' => DayOfWeek::MONDAY, 'period_index' => 1, 'open_time' => '13:00', 'close_time' => '17:00', 'is_closed' => false, 'is_24h' => false ),
		array( 'day_of_week' => DayOfWeek::TUESDAY, 'period_index' => 0, 'open_time' => '', 'close_time' => '', 'is_closed' => true, 'is_24h' => false ),
		array( 'day_of_week' => DayOfWeek::SATURDAY, 'period_index' => 0, 'open_time' => '', 'close_time' => '', 'is_closed' => false, 'is_24h' => true ),
	)
);

// Social links, services and the business type: the parts a real profile
// showed were not importing at all.
$everything = Import::apply(
	array( 'social', 'services', 'business_type', 'coordinates' ),
	'locations/import-me'
);

check( ! is_wp_error( $everything ), 'social links, services and the type import together' );

$business_now = BusinessRepository::get();

check_same(
	'https://facebook.com/imported',
	$business_now['social_profiles']['facebook'],
	'a social link read from Google\'s attributes reaches the business'
);
check_same( 'CafeOrCoffeeShop', $business_now['business_type'], 'and Google\'s category becomes a schema.org type' );

$imported_services = array();

foreach ( ServiceRepository::all() as $service ) {
	$imported_services[] = $service['name'];
}

check( in_array( 'Espresso bar', $imported_services, true ), 'a service named by the category is created' );

$before_services = count( $imported_services );

Import::apply( array( 'services' ), 'locations/import-me' );

check_same( $before_services, ServiceRepository::count(), 'importing services twice does not duplicate them' );

// A second profile is a second branch, not an overwrite of the first.
GoogleLocationRepository::upsert(
	array(
		'account_name'       => 'accounts/999',
		'location_name'      => 'locations/branch-two',
		'store_code'         => '',
		'title'              => 'Imported Coffee — Harbourside',
		'address'            => '2 Quay Street, Bristol',
		'phone'              => '0117 496 1111',
		'website'            => 'https://imported.example',
		'verification_state' => 'VERIFIED',
		'payload'            => array(),
	)
);

$branch_preview = Import::preview( 'locations/branch-two' );

check( true === $branch_preview['creates_location'], 'a profile with no location of its own will create one' );
check( false === $branch_preview['creates_business'], 'while the business it belongs to already exists' );

$branch_fields = array();

foreach ( $branch_preview['fields'] as $field ) {
	$branch_fields[ $field['key'] ] = $field;
}

check_same( 'business', $branch_fields['name']['scope'], 'the name is shared by every location' );
check_same( 'location', $branch_fields['address']['scope'], 'the address belongs to this one' );

$business_phone_before = BusinessRepository::get()['phone'];
$branch                = Import::apply( array( 'address', 'phone', 'hours' ), 'locations/branch-two' );

check( ! is_wp_error( $branch ), 'the branch imports' );
check( true === $branch['created_location'], 'creating its own location' );
check_same( 2, LocationRepository::count(), 'so the site now has two, which Free allows' );
check(
	(int) $branch['location_id'] !== (int) $location_id,
	'and the first location was not overwritten'
);
check_same(
	$business_phone_before,
	BusinessRepository::get()['phone'],
	'a branch phone stays on the branch rather than becoming the business phone'
);
check_same(
	'0117 496 0000',
	LocationRepository::find( (int) $branch['location_id'] )['phone'],
	'while the branch keeps its own'
);

GoogleLocationRepository::release_for_location( (int) $branch['location_id'] );
LocationRepository::delete( (int) $branch['location_id'] );

// The import genuinely changed the business type; the sections below assert
// the one this suite set up.
BusinessRepository::save( array( 'business_type' => 'Dentist' ) );

// -- Planning a publish, with Google answered in-process --------------------

// The import above wrote this site's hours from the listing: Monday open all
// day, which Google spells as midnight to hour 24. A plan now has to turn the
// stored row back into that spelling and find it unchanged — the round trip
// that, done wrongly, tells every business its hours have changed.
$fhint_reads_before = count( $import_requests );
$fhint_plan         = FHINT\App\Google\Push\Publisher::plan();

check( ! is_wp_error( $fhint_plan ), 'a publish can be planned' );
check_same( 2, count( $import_requests ) - $fhint_reads_before, 'planning reads Google twice: the location and its attributes' );
check( false !== strpos( $import_requests[ $fhint_reads_before ], 'readMask=' ), 'the location read carries a readMask' );
check( false !== strpos( $import_requests[ $fhint_reads_before + 1 ], '/attributes' ), 'and the second read is the attributes' );
$fhint_planned = array();

foreach ( $fhint_plan['steps'] as $fhint_candidate ) {
	foreach ( $fhint_candidate['fields'] as $fhint_field ) {
		$fhint_planned[ $fhint_field['field'] ] = $fhint_field;
	}
}

// This site's Saturday is stored as open all day. Read from MySQL and turned
// into what Google takes, it must come out as midnight to hour 24.
check( isset( $fhint_planned['hours'] ) && in_array( '6 00:00-24:00', $fhint_planned['hours']['to'], true ), 'a day stored as open all day is planned as midnight to hour 24' );
check_same( array( '1 00:00-24:00' ), $fhint_planned['hours']['from'], 'against the hour-24 form Google sent' );

// The service this suite imported from Google is one of Google's own types.
// It must plan as unchanged, not as a free-form service to send in its place.
check( in_array( 'services', $fhint_plan['unchanged'], true ), 'a structured service imported from Google plans as unchanged' );
check( in_array( 'description', $fhint_plan['unchanged'], true ), 'and so does the imported description' );
check_same( 'locations/import-me', $fhint_plan['listing']['location'], 'the plan names the listing it was made against' );

$fhint_before_plan = BusinessRepository::get();

BusinessRepository::save( array( 'description' => 'A new description, written here.' ) );

$fhint_plan = FHINT\App\Google\Push\Publisher::plan();
$fhint_step = null;

foreach ( $fhint_plan['steps'] as $fhint_candidate ) {
	if ( 'location' === $fhint_candidate['id'] ) {
		$fhint_step = $fhint_candidate;
	}
}

check( null !== $fhint_step && in_array( 'profile.description', $fhint_step['mask'], true ), 'a description edited here is planned as a change' );
$fhint_described = null;

foreach ( $fhint_step['fields'] as $fhint_field ) {
	if ( 'description' === $fhint_field['field'] ) {
		$fhint_described = $fhint_field;
	}
}

check_same( 'Coffee by the water.', $fhint_described['from'], 'from what Google holds' );
check_same( 'A new description, written here.', BusinessRepository::get()['description'], 'and planning leaves this site\'s data as it was' );

BusinessRepository::save( array( 'description' => $fhint_before_plan['description'] ) );

// Over REST, as the screen will call it.
if ( $admins ?? get_users( array( 'role' => 'administrator', 'number' => 1 ) ) ) {
	$fhint_admin = get_users( array( 'role' => 'administrator', 'number' => 1 ) );

	wp_set_current_user( $fhint_admin[0]->ID );

	$fhint_response = rest_do_request( new WP_REST_Request( 'POST', '/fhint/v1/profile/publish/plan' ) );
	$fhint_body     = $fhint_response->get_data();

	check_same( 200, $fhint_response->get_status(), 'POST /profile/publish/plan answers' );
	check( isset( $fhint_body['data']['steps'], $fhint_body['data']['skipped'], $fhint_body['data']['unchanged'], $fhint_body['data']['requests'] ), 'with the plan under data' );
	check_same( 'locations/import-me', $fhint_body['meta']['listing']['location'], 'and the listing in meta' );

	// A plan needs a listing to compare against.
	GoogleLocationRepository::unmap( 'locations/import-me' );

	$fhint_response = rest_do_request( new WP_REST_Request( 'POST', '/fhint/v1/profile/publish/plan' ) );

	check_same( 409, $fhint_response->get_status(), 'with no listing mapped, planning is refused' );
	check_same( 'fhint_google_not_mapped', $fhint_response->get_data()['code'], 'with a code that says what is missing' );

	GoogleLocationRepository::map( 'locations/import-me', $location_id );

	wp_set_current_user( 0 );

	check_same( 401, rest_do_request( new WP_REST_Request( 'POST', '/fhint/v1/profile/publish/plan' ) )->get_status(), 'and a logged-out request is refused' );
}

// -- Running a publish step, with Google answered in-process ----------------

// Writes are answered here rather than by the read-only stand-in above, and
// every one is recorded: the method, the address, and the body. What this plugin
// sends to a listing the public reads is the thing to be sure of.
$fhint_writes  = array();
$fhint_refuse  = false;
$fhint_fake_write = static function ( $pre, $args, $url ) use ( &$fhint_writes, &$fhint_refuse ) {
	if ( ! isset( $args['method'] ) || 'PATCH' !== strtoupper( (string) $args['method'] ) ) {
		return $pre;
	}

	$fhint_writes[] = array(
		'url'  => rawurldecode( (string) $url ),
		'body' => json_decode( (string) $args['body'], true ),
	);

	if ( $fhint_refuse ) {
		return array(
			'headers'  => array(),
			'body'     => wp_json_encode(
				array(
					'error' => array(
						'code'    => 400,
						'message' => 'Request contains an invalid argument.',
						'status'  => 'INVALID_ARGUMENT',
						'details' => array(
							array(
								'@type'    => 'type.googleapis.com/google.rpc.ErrorInfo',
								'reason'   => 'PROFILE_DESCRIPTION_CONTAINS_URL',
								'metadata' => array( 'field_mask' => 'profile.description' ),
							),
						),
					),
				)
			),
			'response' => array(
				'code'    => 400,
				'message' => 'Bad Request',
			),
			'cookies'  => array(),
		);
	}

	return array(
		'headers'  => array(),
		'body'     => '{}',
		'response' => array(
			'code'    => 200,
			'message' => 'OK',
		),
		'cookies'  => array(),
	);
};

// After the read-only stand-in, not before: it answers every request it is
// handed and ignores what an earlier filter decided, so a refusal returned
// ahead of it would be replaced by its 200.
add_filter( 'pre_http_request', $fhint_fake_write, 11, 3 );

/**
 * The step with a given id from a fresh plan, or null.
 *
 * @param string $id Step id.
 * @return array|null
 */
$fhint_planned_step = static function ( $id ) {
	foreach ( FHINT\App\Google\Push\Publisher::plan()['steps'] as $candidate ) {
		if ( $id === $candidate['id'] ) {
			return $candidate;
		}
	}

	return null;
};

$fhint_original = BusinessRepository::get();

BusinessRepository::save( array( 'description' => 'Published from this site.' ) );

$fhint_step = $fhint_planned_step( 'location' );

// A fingerprint that is not this plan's is refused before anything is sent.
$fhint_result = FHINT\App\Google\Push\Publisher::step( 'location', str_repeat( 'a', 32 ) );

check( is_wp_error( $fhint_result ) && 'fhint_publish_stale' === $fhint_result->get_error_code(), 'a step with a fingerprint from another plan is refused' );
check_same( array(), $fhint_writes, 'and nothing is sent to Google' );

// Google checks the request and saves nothing.
$fhint_result = FHINT\App\Google\Push\Publisher::step( 'location', $fhint_step['token'], true );

check( ! is_wp_error( $fhint_result ) && true === $fhint_result['validate_only'], 'a step can be checked by Google without being saved' );
check( false !== strpos( $fhint_writes[0]['url'], 'validateOnly=true' ), 'by asking Google to validate only' );
check_same( '', GoogleLocationRepository::find_by_location_name( 'locations/import-me' )['pushed_at'], 'and it is not recorded as a publish' );

// The real thing.
$fhint_writes = array();
$fhint_result = FHINT\App\Google\Push\Publisher::step( 'location', $fhint_step['token'] );

check( ! is_wp_error( $fhint_result ) && true === $fhint_result['ok'], 'the step publishes' );
check_same( 1, count( $fhint_writes ), 'with exactly one write' );
check( false !== strpos( $fhint_writes[0]['url'], 'v1/locations/import-me?' ), 'to the mapped listing' );
check( false !== strpos( $fhint_writes[0]['url'], 'updateMask=' . implode( ',', $fhint_step['mask'] ) ), 'naming exactly the fields the plan named' );
check( false === strpos( $fhint_writes[0]['url'], 'validateOnly' ), 'and not as a dry run' );
check_same( $fhint_step['payload'], $fhint_writes[0]['body'], 'carrying exactly the payload the plan showed' );
check_same( 'Published from this site.', $fhint_writes[0]['body']['profile']['description'], 'which holds the description written here' );
check( in_array( 'description', $fhint_result['fields'], true ), 'the answer lists the fields that were sent' );
check( '' !== GoogleLocationRepository::find_by_location_name( 'locations/import-me' )['pushed_at'], 'and the publish is recorded on the listing' );

// Edited after the plan was read: the fingerprint no longer matches.
$fhint_writes = array();

BusinessRepository::save( array( 'description' => 'Edited in another tab, after the plan was shown.' ) );

$fhint_result = FHINT\App\Google\Push\Publisher::step( 'location', $fhint_step['token'] );

check( is_wp_error( $fhint_result ) && 'fhint_publish_stale' === $fhint_result->get_error_code(), 'a profile edited since the plan was shown is not published from the old plan' );
check_same( array(), $fhint_writes, 'so what reaches Google is only ever what somebody saw' );

// Google refuses a value: the refusal names the field.
$fhint_refuse = true;
$fhint_step   = $fhint_planned_step( 'location' );

$fhint_pushed_before = GoogleLocationRepository::find_by_location_name( 'locations/import-me' )['pushed_at'];
$fhint_result        = FHINT\App\Google\Push\Publisher::step( 'location', $fhint_step['token'] );
$fhint_refuse        = false;

check( is_wp_error( $fhint_result ) && 'fhint_google_rejected' === $fhint_result->get_error_code(), 'a value Google refuses fails the step' );
check_same(
	array( 'description' => array( 'google.profile_description_contains_url' ) ),
	is_wp_error( $fhint_result ) ? $fhint_result->get_error_data()['fields'] : array(),
	'with Google\'s reason attached to the field at fault'
);
check_same( $fhint_pushed_before, GoogleLocationRepository::find_by_location_name( 'locations/import-me' )['pushed_at'], 'and a refused step is not recorded as a publish' );

BusinessRepository::save( array( 'description' => $fhint_original['description'] ) );

// Links and attributes: one request, and no dry run.
$fhint_place_id = (int) LocationRepository::primary()['id'];
$fhint_result   = FHINT\App\Google\Push\Publisher::step( 'attributes', str_repeat( 'a', 32 ), true );

check( is_wp_error( $fhint_result ) && 'fhint_validate_only_unsupported' === $fhint_result->get_error_code(), 'attributes cannot be checked without saving, and the step says so' );

BusinessRepository::save( array( 'social_profiles' => array( 'facebook' => 'https://facebook.com/changed-here' ) ) );
LocationAttributeRepository::save(
	$fhint_place_id,
	array(
		'has_wheelchair_accessible_entrance' => array(
			'type'  => 'bool',
			'value' => true,
		),
		// Google's stand-in already answers yes to this one, so it is not
		// part of what gets sent.
		'has_delivery'                       => array(
			'type'  => 'bool',
			'value' => true,
		),
	)
);

$fhint_writes = array();
$fhint_step   = $fhint_planned_step( 'attributes' );
$fhint_result = FHINT\App\Google\Push\Publisher::step( 'attributes', $fhint_step['token'] );

check( ! is_wp_error( $fhint_result ) && true === $fhint_result['ok'], 'the attributes step publishes' );
check( false !== strpos( $fhint_writes[0]['url'], 'v1/locations/import-me/attributes?attributeMask=' ), 'to the listing\'s attributes, with an attribute mask' );
check( false !== strpos( $fhint_writes[0]['url'], 'attributes/url_facebook' ) && false !== strpos( $fhint_writes[0]['url'], 'attributes/has_wheelchair_accessible_entrance' ), 'naming the link and the answer that changed' );
check_same( 'locations/import-me/attributes', $fhint_writes[0]['body']['name'], 'the body names the resource Google expects' );
check_same( 'https://facebook.com/changed-here', $fhint_writes[0]['body']['attributes'][0]['uriValues'][0]['uri'], 'and carries the new link' );

$fhint_answers = array();

foreach ( LocationAttributeRepository::for_location( $fhint_place_id ) as $fhint_answer ) {
	$fhint_answers[ $fhint_answer['attribute_id'] ] = $fhint_answer;
}

check( false === strpos( $fhint_writes[0]['url'], 'attributes/has_delivery' ), 'an answer Google already has is not named in the mask' );
check( false === $fhint_answers['has_wheelchair_accessible_entrance']['is_dirty'] && null !== $fhint_answers['has_wheelchair_accessible_entrance']['synced_at'], 'an answer that reached Google is no longer marked as waiting to be sent' );
check( true === $fhint_answers['has_delivery']['is_dirty'], 'and only the answers that were sent are marked — the one left out is untouched' );

LocationAttributeRepository::delete_for_location( $fhint_place_id );
BusinessRepository::save( array( 'social_profiles' => $fhint_original['social_profiles'] ) );

// Over REST, as the screen will call it.
$fhint_admin = get_users( array( 'role' => 'administrator', 'number' => 1 ) );

if ( $fhint_admin ) {
	wp_set_current_user( $fhint_admin[0]->ID );

	$fhint_call = static function ( array $params ) {
		$request = new WP_REST_Request( 'POST', '/fhint/v1/profile/publish/step' );
		$request->set_header( 'content-type', 'application/json' );
		$request->set_body( wp_json_encode( $params ) );

		return rest_do_request( $request );
	};

	$fhint_step     = $fhint_planned_step( 'location' );
	$fhint_response = $fhint_call(
		array(
			'step'          => 'location',
			'token'         => $fhint_step['token'],
			'validate_only' => true,
		)
	);

	check_same( 200, $fhint_response->get_status(), 'POST /profile/publish/step answers' );
	check_same( 'location', $fhint_response->get_data()['data']['step'], 'with the step it ran, under data' );

	check_same( 400, $fhint_call( array( 'step' => 'location', 'token' => 'not-a-fingerprint' ) )->get_status(), 'a token that could not be a fingerprint is refused before the step runs' );
	check_same( 400, $fhint_call( array( 'step' => 'photos', 'token' => str_repeat( 'a', 32 ) ) )->get_status(), 'and so is a step that does not exist' );
	check_same( 409, $fhint_call( array( 'step' => 'location', 'token' => str_repeat( 'a', 32 ) ) )->get_status(), 'a well-formed but wrong fingerprint is a conflict' );

	$fhint_response = $fhint_call( array( 'step' => 'attributes', 'token' => str_repeat( 'a', 32 ) ) );

	check_same( 409, $fhint_response->get_status(), 'a step with nothing to send is refused' );
	check_same( 'fhint_publish_nothing_to_send', $fhint_response->get_data()['code'], 'saying Google already has it' );

	wp_set_current_user( 0 );

	check_same( 401, $fhint_call( array( 'step' => 'location', 'token' => $fhint_step['token'] ) )->get_status(), 'and a logged-out publish is refused' );
}

remove_filter( 'pre_http_request', $fhint_fake_write, 11 );

remove_filter( 'pre_http_request', $fake_business_information, 10 );

// Put the hours back as the sections after this one expect them, including
// Wednesday being absent rather than closed.
OpeningHoursRepository::replace(
	$location_id,
	array(
		array( 'day_of_week' => DayOfWeek::MONDAY, 'period_index' => 0, 'open_time' => '09:00', 'close_time' => '12:00', 'is_closed' => false, 'is_24h' => false ),
		array( 'day_of_week' => DayOfWeek::MONDAY, 'period_index' => 1, 'open_time' => '13:00', 'close_time' => '17:00', 'is_closed' => false, 'is_24h' => false ),
		array( 'day_of_week' => DayOfWeek::TUESDAY, 'period_index' => 0, 'open_time' => '', 'close_time' => '', 'is_closed' => true, 'is_24h' => false ),
		array( 'day_of_week' => DayOfWeek::SATURDAY, 'period_index' => 0, 'open_time' => '', 'close_time' => '', 'is_closed' => false, 'is_24h' => true ),
	)
);

// -- Nap and the schema graph, from real rows ------------------------------

$nap = Nap::resolve();

check_same( 'Downtown', $nap['name'], 'Nap resolves the location name over the business name' );
check_same( '+1 512 555 0134', $nap['phone'], 'and falls back to the business phone' );
check( Graph::is_publishable( $nap ), 'the real record is publishable' );

$graph = Graph::build();
$node  = $graph['@graph'][0];

check_same( 'Dentist', $node['@type'], 'the graph is built from real rows' );
check_same( 'Downtown', $node['name'], 'with the resolved name' );
check( isset( $node['openingHoursSpecification'] ), 'and the hours read back out of the database' );

$days = array();

foreach ( $node['openingHoursSpecification'] as $spec ) {
	$days[] = $spec['dayOfWeek'];
}

check( ! in_array( 'Wednesday', $days, true ), 'a day never configured stays out of the published markup' );
check( in_array( 'Tuesday', $days, true ), 'an explicitly closed day is published' );
check_same( 3, count( array_keys( array_flip( $days ) ) ), 'exactly the three configured days appear' );

// -- The schema cache against a real stamp ---------------------------------

$first_graph = SchemaCache::graph();

check( ! empty( $first_graph['@graph'] ), 'the cache returns a graph' );

$stamp_before = (int) get_option( 'fhint_data_changed_at', 0 );

LocationRepository::update( $location_id, array( 'name' => 'Downtown Renamed' ) );

$stamp_after = (int) get_option( 'fhint_data_changed_at', 0 );

check( $stamp_after >= $stamp_before, 'a write moves the data-changed stamp' );

// Force the stamp forward so the comparison cannot be lost to same-second
// writes, then confirm the cache rebuilds rather than serving the old name.
update_option( 'fhint_data_changed_at', $stamp_after + 1, false );

check_same(
	'Downtown Renamed',
	SchemaCache::graph()['@graph'][0]['name'],
	'a moved stamp rebuilds the cached graph'
);

// -- The audit engine, stored -----------------------------------------------

$audit = Runner::run( 0, Runner::TRIGGER_MANUAL );

check( is_array( $audit ), 'an audit runs and returns its stored row' );
check_same( AuditRepository::STATUS_COMPLETED, $audit['status'], 'and completes' );
check( $audit['rules_run'] > 0, 'with rules actually executed' );
check( $audit['score'] >= 0 && $audit['score'] <= 100, 'producing a score in range' );
check( in_array( $audit['score_band'], \FHINT\App\Audit\Score::bands(), true ), 'in a known band' );
check( ! empty( $audit['category_scores'] ), 'and a category breakdown that survived the JSON column' );

// The counts are a fact about the rows, not an independent tally.
$issues = AuditRepository::issues( $audit['id'] );
$passes = AuditRepository::issues( $audit['id'], 'pass' );

check_same( count( $issues ), $audit['issues_total'], 'the finding count matches the stored rows' );
check_same( count( $passes ), $audit['issues_passed'], 'and so does the pass count' );
check_same( count( $issues ) + count( $passes ), $audit['rules_run'], 'every rule that ran left a row' );

// A list that claims to be most-urgent-first has to be.
$ranks = array();

foreach ( $issues as $issue ) {
	$ranks[] = \FHINT\App\Audit\Severity::rank( $issue['severity'] );
}

$sorted = $ranks;
sort( $sorted );

check_same( $sorted, $ranks, 'findings come back most urgent first' );

// A score has to be explainable from its own breakdown.
$earned = 0.0;

foreach ( $audit['category_scores'] as $data ) {
	$earned += (float) $data['earned'];
}

check( abs( $earned - $audit['score'] ) < 1.5, 'the stored category scores sum to the stored score' );

// Passes carry no severity — otherwise "3 critical" would be meaningless.
$severities = array();

foreach ( $passes as $pass ) {
	$severities[] = $pass['severity'];
}

check_same( array_unique( $severities ? $severities : array( '' ) ), array( '' ), 'stored passes carry no severity' );

// Staleness is reported, never acted on. Both directions are forced
// explicitly rather than relying on wall-clock ordering — an earlier test
// moves the stamp, and a write landing in the same second as a run would
// otherwise make this assertion depend on timing.
update_option( 'fhint_data_changed_at', strtotime( $audit['completed_at'] . ' UTC' ) - 60, false );

check( ! Runner::is_stale( $audit ), 'an audit newer than the last write is not stale' );

update_option( 'fhint_data_changed_at', strtotime( $audit['completed_at'] . ' UTC' ) + 60, false );

check( Runner::is_stale( $audit ), 'and one older than the last write is' );

// History and retention.
check( count( AuditRepository::history( 10 ) ) >= 1, 'the run appears in the history' );

$second_audit = Runner::run( 0, Runner::TRIGGER_SCHEDULE );

check_same( 'schedule', $second_audit['triggered_by'], 'a scheduled run records what triggered it' );
check_same( $second_audit['id'], AuditRepository::latest()['id'], 'and the latest run is the newest one' );

// Findings can be ignored, and the status sticks.
if ( $issues ) {
	AuditRepository::set_issue_status( $issues[0]['id'], 'ignored' );

	check_same( 'ignored', AuditRepository::find_issue( $issues[0]['id'] )['status'], 'a finding can be ignored' );
}

// Deleting a run takes its findings with it — there are no foreign keys, so
// this cascade is code rather than a constraint.
$before_prune = count( AuditRepository::issues( $audit['id'], '' ) );

check( $before_prune > 0, 'the first run still has its rows' );

// -- The Google push columns round-trip -------------------------------------

// A column nothing can write is dead storage. These four were added for the
// write-back, and each is whitelisted somewhere — the repository builds its
// column list by hand, so a column missing from that list exists in MySQL
// and can never hold a value.

BusinessRepository::save(
	array(
		'name'                => 'Column Round Trip',
		'primary_category'    => 'Dentist',
		'primary_category_id' => 'gcid:dentist',
	)
);

check_same( 'gcid:dentist', BusinessRepository::get()['primary_category_id'], 'the Google category id round-trips' );
check_same( 'Dentist', BusinessRepository::get()['primary_category'], 'alongside the name a person reads' );

$fhint_service = ServiceRepository::create(
	array(
		'name'                   => 'Teeth whitening',
		'google_item_type'       => 'structured',
		'google_service_type_id' => 'job_type_id:teeth_whitening',
	)
);

check( is_array( $fhint_service ), 'the service was created' );

// Read it back from the database rather than trusting what create() returned,
// which would pass even if the columns were never written.
$fhint_stored = ServiceRepository::find( (int) $fhint_service['id'] );

check_same( 'structured', $fhint_stored['google_item_type'], 'a service remembers which shape Google wants' );
check_same( 'job_type_id:teeth_whitening', $fhint_stored['google_service_type_id'], 'and the structured id' );

ServiceRepository::delete( (int) $fhint_service['id'] );

GoogleLocationRepository::upsert(
	array(
		'account_name'       => 'accounts/1',
		'location_name'      => 'locations/cid-test',
		'title'              => 'CID Test',
		'store_code'         => '',
		'address'            => '',
		'phone'              => '',
		'website'            => '',
		'verification_state' => 'VERIFIED',
		'cid'                => '9451387654872888532',
		'payload'            => array(),
	)
);

check_same(
	'9451387654872888532',
	GoogleLocationRepository::find_by_location_name( 'locations/cid-test' )['cid'],
	'the Maps CID round-trips'
);

// -- Reviews, stored -------------------------------------------------------

/**
 * One review ready for the repository, with overrides merged in.
 *
 * @param array $overrides Fields to replace.
 * @return array
 */
function fhint_review_row( array $overrides = array() ) {
	return array_merge(
		array(
			'review_id'         => 'rev-1',
			'location_name'     => 'locations/1',
			'account_name'      => 'accounts/1',
			'reviewer_name'     => 'Asha Rahman',
			'reviewer_photo'    => '',
			'is_anonymous'      => false,
			'star_rating'       => 5,
			'comment'           => 'Same-day repair.',
			'reply_comment'     => '',
			'replied_at'        => null,
			'reviewed_at'       => '2026-09-14 09:12:00',
			'review_updated_at' => '2026-09-14 09:12:00',
			'payload'           => array( 'reviewId' => 'rev-1' ),
		),
		$overrides
	);
}

ReviewRepository::truncate();

check( ReviewRepository::upsert( fhint_review_row() ), 'a review is stored' );
check_same( 1, ReviewRepository::count(), 'and counted' );

$stored = ReviewRepository::find( 'rev-1' );
check_same( 5, $stored['star_rating'], 'the rating round-trips' );
check_same( 'Same-day repair.', $stored['comment'], 'the comment round-trips' );
check_same( '2026-09-14 09:12:00', $stored['reviewed_at'], 'the review date round-trips' );
check( null === $stored['replied_at'], 'an unanswered review stores no reply date' );

// Upserting on Google's id is what keeps a re-read from multiplying rows.
ReviewRepository::upsert( fhint_review_row( array( 'reply_comment' => 'Thank you!' ) ) );
check_same( 1, ReviewRepository::count(), 're-reading the same review updates rather than duplicates' );
check_same( 'Thank you!', ReviewRepository::find( 'rev-1' )['reply_comment'], 'and the reply lands' );

check( ! ReviewRepository::upsert( fhint_review_row( array( 'review_id' => '' ) ) ), 'a review with no id is refused' );
check_same( 1, ReviewRepository::count(), 'and nothing was written' );

ReviewRepository::upsert( fhint_review_row( array( 'review_id' => 'rev-2', 'star_rating' => 3, 'reviewed_at' => '2026-09-20 10:00:00' ) ) );
ReviewRepository::upsert( fhint_review_row( array( 'review_id' => 'rev-3', 'star_rating' => 0, 'location_name' => 'locations/2', 'reviewed_at' => '2026-09-01 10:00:00' ) ) );

check_same( 3, ReviewRepository::count(), 'three reviews are stored' );
check_same( 1, ReviewRepository::count( array( 'location_name' => 'locations/2' ) ), 'filtering by location counts only that location' );
check_same( 2, ReviewRepository::count( array( 'unanswered' => true ) ), 'the unanswered filter excludes the answered one' );

// Newest first, so the screen opens on what just arrived.
$ordered = ReviewRepository::all();
check_same( 'rev-2', $ordered[0]['review_id'], 'reviews come back newest first' );

$paged = ReviewRepository::all( array( 'per_page' => 1, 'offset' => 1 ) );
check_same( 1, count( $paged ), 'paging limits the rows' );
check_same( 'rev-1', $paged[0]['review_id'], 'and offsets into the same order' );

// The summary is where a wrong answer is most visible: an unrated review
// must not be averaged in as zero stars.
$summary = ReviewRepository::summary();
check_same( 2, $summary['count'], 'the summary counts only rated reviews' );
check_same( 4.0, $summary['average'], 'five and three stars average to four, with the unrated one ignored' );
check_same( 1, $summary['distribution'][5], 'the distribution holds the five-star review' );
check_same( 1, $summary['distribution'][3], 'and the three-star one' );
check_same( 2, $summary['unanswered'], 'the summary carries the unanswered count' );

$one_location = ReviewRepository::summary( 'locations/1' );
check_same( 2, $one_location['count'], 'a per-location summary counts only that location' );

check( null !== ReviewRepository::last_synced_at(), 'a sync time is stamped' );

// Pruning: a review Google stops returning must not linger in a count the
// owner is judged on.
$removed = ReviewRepository::delete_for_location( 'locations/1', array( 'rev-1' ) );
check_same( 1, $removed, 'a review no longer returned is removed' );
check_same( 2, ReviewRepository::count(), 'and the others stay' );
check( null !== ReviewRepository::find( 'rev-1' ), 'including the one that was kept' );

check_same( 1, ReviewRepository::delete_for_location( 'locations/1' ), 'passing no keep-list clears the location' );
check_same( 1, ReviewRepository::count(), 'leaving the other location untouched' );

// The rule the screens share, over real rows.
ReviewRepository::truncate();
ReviewRepository::upsert( fhint_review_row( array( 'review_id' => 'rev-9', 'reply_comment' => '' ) ) );
$listing = ReviewService::listing();
check_same( 1, count( $listing['items'] ), 'the listing returns the stored review' );
check( $listing['items'][0]['needs_reply'], 'and marks it as needing a reply' );
check_same( 1, $listing['total'], 'with a total that ignores paging' );

// -- Replying to a review, with Google answered in-process ------------------
//
// A reply is public the moment Google takes it, so what is sent — and that
// nothing is stored unless Google said yes — is the thing to be sure of.

$fhint_reply_calls  = array();
$fhint_reply_answer = array( 200, array() );
$fhint_fake_reply   = static function ( $pre, $args, $url ) use ( &$fhint_reply_calls, &$fhint_reply_answer ) {
	if ( false === strpos( (string) $url, '/reply' ) ) {
		return $pre;
	}

	$fhint_reply_calls[] = array(
		'method' => isset( $args['method'] ) ? strtoupper( (string) $args['method'] ) : 'GET',
		'url'    => (string) $url,
		'body'   => isset( $args['body'] ) ? json_decode( (string) $args['body'], true ) : null,
	);

	return array(
		'headers'  => array(),
		'body'     => wp_json_encode( $fhint_reply_answer[1] ),
		'response' => array(
			'code'    => $fhint_reply_answer[0],
			'message' => '',
		),
		'cookies'  => array(),
	);
};

add_filter( 'pre_http_request', $fhint_fake_reply, 10, 3 );

$fhint_result = ReviewReply::save( 'rev-unknown', 'Thanks!' );
check( is_wp_error( $fhint_result ) && 'fhint_review_not_found' === $fhint_result->get_error_code(), 'a reply to a review this site never read is refused' );
check_same( 404, $fhint_result->get_error_data()['status'], 'as not found' );

$fhint_result = ReviewReply::save( 'rev-9', "  \n " );
check( $fhint_result instanceof FHINT\App\Core\ValidationResult, 'a blank reply is refused before anything is sent' );
check_same( array(), $fhint_reply_calls, 'so Google is never asked' );

$fhint_reply_answer = array(
	200,
	array(
		'comment'    => 'Thank you, Asha!',
		'updateTime' => '2026-10-18T08:30:00.5Z',
	),
);

$fhint_result = ReviewReply::save( 'rev-9', '<b>Thank you, Asha!</b>' );
check( is_array( $fhint_result ) && ! is_wp_error( $fhint_result ), 'a reply is posted' );
check_same( 'PUT', $fhint_reply_calls[0]['method'], 'with PUT' );
check_same( 'https://mybusiness.googleapis.com/v4/accounts/1/locations/1/reviews/rev-9/reply', $fhint_reply_calls[0]['url'], 'to the review the stored row names' );
check_same( array( 'comment' => 'Thank you, Asha!' ), $fhint_reply_calls[0]['body'], 'carrying the reply as plain text' );
check_same( 'Thank you, Asha!', ReviewRepository::find( 'rev-9' )['reply_comment'], 'and the reply is stored' );
check_same( '2026-10-18 08:30:00', ReviewRepository::find( 'rev-9' )['replied_at'], "stamped with Google's time" );
check( ! $fhint_result['needs_reply'], 'so the review no longer needs a reply' );

// Google refuses: the stored reply stays what the public sees.
$fhint_reply_answer = array(
	400,
	array(
		'error' => array(
			'code'    => 400,
			'message' => 'Request contains an invalid argument.',
			'status'  => 'INVALID_ARGUMENT',
		),
	),
);

$fhint_result = ReviewReply::save( 'rev-9', 'An edit Google will refuse.' );
check( is_wp_error( $fhint_result ), "a reply Google refuses is reported as an error" );
check_same( 'Thank you, Asha!', ReviewRepository::find( 'rev-9' )['reply_comment'], 'and the stored reply is left as Google has it' );

$fhint_result = ReviewReply::delete( 'rev-9' );
check( is_wp_error( $fhint_result ), 'a delete Google refuses is reported' );
check_same( 'Thank you, Asha!', ReviewRepository::find( 'rev-9' )['reply_comment'], 'and the reply is kept' );

$fhint_reply_calls  = array();
$fhint_reply_answer = array( 200, array() );

$fhint_result = ReviewReply::delete( 'rev-9' );
check_same( 'DELETE', $fhint_reply_calls[0]['method'], 'a reply is removed with DELETE' );
check_same( '', ReviewRepository::find( 'rev-9' )['reply_comment'], 'and the stored reply is cleared' );
check( null === ReviewRepository::find( 'rev-9' )['replied_at'], 'with its date' );
check( $fhint_result['needs_reply'], 'so the review needs a reply again' );

// Removed on Google already: the owner's goal holds, so the copy catches up.
ReviewRepository::set_reply( 'rev-9', 'Removed on Google itself.', '2026-10-01 00:00:00' );
$fhint_reply_answer = array( 404, array( 'error' => array( 'code' => 404, 'status' => 'NOT_FOUND' ) ) );

$fhint_result = ReviewReply::delete( 'rev-9' );
check( ! is_wp_error( $fhint_result ), 'deleting a reply Google no longer has succeeds' );
check_same( '', ReviewRepository::find( 'rev-9' )['reply_comment'], 'and clears the stale copy' );

// Over REST, as the screen calls it.
$fhint_admin = get_users( array( 'role' => 'administrator', 'number' => 1 ) );

if ( $fhint_admin ) {
	wp_set_current_user( $fhint_admin[0]->ID );

	$fhint_reply_answer = array( 200, array( 'comment' => 'See you again!' ) );

	$fhint_request = new WP_REST_Request( 'PUT', '/fhint/v1/reviews/rev-9/reply' );
	$fhint_request->set_param( 'comment', 'See you again!' );
	$fhint_response = rest_do_request( $fhint_request );

	check_same( 200, $fhint_response->get_status(), 'PUT /reviews/{id}/reply answers' );
	check_same( 'See you again!', $fhint_response->get_data()['data']['reply_comment'], 'with the review as now stored' );
	check_same( 0, $fhint_response->get_data()['meta']['state']['unanswered'], "and that listing's counts, so the screen's figures move with it" );

	$fhint_request = new WP_REST_Request( 'PUT', '/fhint/v1/reviews/rev-9/reply' );
	$fhint_request->set_param( 'comment', '' );
	$fhint_response = rest_do_request( $fhint_request );

	check_same( 400, $fhint_response->get_status(), 'an empty reply over REST is a 400' );
	check_same( array( 'review.reply.required' ), $fhint_response->get_data()['data']['fields']['comment'], 'with the code on the comment field' );

	$fhint_request = new WP_REST_Request( 'PUT', '/fhint/v1/reviews/rev-nope/reply' );
	$fhint_request->set_param( 'comment', 'Hello' );
	check_same( 404, rest_do_request( $fhint_request )->get_status(), 'a reply to an unknown review over REST is a 404' );

	$fhint_response = rest_do_request( new WP_REST_Request( 'DELETE', '/fhint/v1/reviews/rev-9/reply' ) );
	check_same( 200, $fhint_response->get_status(), 'DELETE /reviews/{id}/reply answers' );
	check_same( '', $fhint_response->get_data()['data']['reply_comment'], 'with the reply gone' );

	wp_set_current_user( 0 );

	$fhint_calls_before = count( $fhint_reply_calls );
	$fhint_request      = new WP_REST_Request( 'PUT', '/fhint/v1/reviews/rev-9/reply' );
	$fhint_request->set_param( 'comment', 'Not allowed.' );

	check_same( 401, rest_do_request( $fhint_request )->get_status(), 'a logged-out reply is refused' );
	check_same( $fhint_calls_before, count( $fhint_reply_calls ), 'before Google is asked' );
}

remove_filter( 'pre_http_request', $fhint_fake_reply, 10 );

// -- No Google account linked: nothing shown, nothing changed ---------------
//
// Unlinked by taking the tokens away, and given back afterwards. The stored
// details must survive untouched — locked is not deleted.

$fhint_tokens = get_option( 'fhint_google_tokens' );
$fhint_admin  = get_users( array( 'role' => 'administrator', 'number' => 1 ) );

if ( $fhint_admin ) {
	wp_set_current_user( $fhint_admin[0]->ID );

	$fhint_name_before   = BusinessRepository::get()['name'];
	$fhint_linked_shape  = rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/profile' ) )->get_data()['data'];

	delete_option( 'fhint_google_tokens' );

	$fhint_response = rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/profile' ) );
	$fhint_profile  = $fhint_response->get_data();

	check_same( 200, $fhint_response->get_status(), 'with no Google account, the profile still answers' );
	check_same( false, $fhint_profile['meta']['google']['linked'], 'and says nothing is linked' );
	check_same( '', $fhint_profile['data']['info']['name'], 'with the business name left out' );
	check_same( '', $fhint_profile['data']['address']['city'], 'and the address' );
	check_same( array(), $fhint_profile['data']['address']['service_area'], 'and the service area' );
	check_same( array(), $fhint_profile['data']['services']['items'], 'and the services' );
	check_same( '', $fhint_profile['data']['social']['social_profiles']['facebook'], 'and the social links' );
	check( ! $fhint_profile['data']['hours']['opening_hours']['has_any_hours'], 'and the hours' );
	check( null === $fhint_profile['data']['media']['logo'], 'and the photos' );
	check( count( $fhint_profile['data']['social']['networks'] ) > 0, 'while the form keeps its shape' );
	check_same( $fhint_linked_shape['attributes']['definitions'], $fhint_profile['data']['attributes']['definitions'], 'including the attribute definitions' );

	$fhint_request = new WP_REST_Request( 'PATCH', '/fhint/v1/profile' );
	$fhint_request->set_param( 'section', 'info' );
	$fhint_request->set_param( 'fields', array( 'name' => 'Changed while unlinked' ) );
	$fhint_response = rest_do_request( $fhint_request );

	check_same( 409, $fhint_response->get_status(), 'a profile save is refused' );
	check_same( 'fhint_google_required', $fhint_response->get_data()['code'], 'saying Google is needed' );

	$fhint_request = new WP_REST_Request( 'PATCH', '/fhint/v1/business' );
	$fhint_request->set_param( 'name', 'Changed while unlinked' );
	check_same( 409, rest_do_request( $fhint_request )->get_status(), 'and so is a business save' );

	check_same( 409, rest_do_request( new WP_REST_Request( 'DELETE', '/fhint/v1/locations/' . $location_id ) )->get_status(), 'and a location delete' );
	check( null !== LocationRepository::find( $location_id ), 'which leaves the location in place' );
	check_same( $fhint_name_before, BusinessRepository::get()['name'], 'and the stored name untouched' );

	update_option( 'fhint_google_tokens', $fhint_tokens );

	$fhint_profile = rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/profile' ) )->get_data();

	check_same( true, $fhint_profile['meta']['google']['linked'], 'linked again' );
	check_same( $fhint_name_before, $fhint_profile['data']['info']['name'], 'the details are all back' );

	wp_set_current_user( 0 );
}

update_option( 'fhint_google_tokens', $fhint_tokens );

ReviewRepository::truncate();
check_same( 0, ReviewRepository::count(), 'truncate clears the table' );

// -- Disconnect and reconnect the same account ------------------------------
//
// A disconnect empties google_locations. Reconnecting must link each listing
// back to its own location, not import a second copy of the business.

$fhint_listing_row = static function ( $location_name, $title ) {
	return array(
		'account_name'       => 'accounts/reconnect',
		'location_name'      => $location_name,
		'title'              => $title,
		'store_code'         => '',
		'address'            => '',
		'phone'              => '',
		'website'            => '',
		'verification_state' => 'OK',
		'payload'            => array(),
	);
};

$fhint_kept_listings = GoogleLocationRepository::all();
$fhint_shop          = LocationRepository::create(
	array(
		'business_id'    => (int) BusinessRepository::get()['id'],
		'name'           => 'Reconnect Shop',
		'address_line_1' => '1 Reconnect Road',
		'city'           => 'Dhaka',
		'country'        => 'BD',
	)
);

GoogleLocationRepository::upsert( $fhint_listing_row( 'locations/reconnect-1', 'Reconnect Shop' ) );
GoogleLocationRepository::map( 'locations/reconnect-1', (int) $fhint_shop['id'] );

check_same( 'locations/reconnect-1', LocationRepository::find( (int) $fhint_shop['id'] )['google_location_name'], 'linking a listing records it on the location too' );

// Editing the location must not lose the memory: update() writes every column.
LocationRepository::update( (int) $fhint_shop['id'], array( 'phone' => '01700-123456' ) );
check_same( 'locations/reconnect-1', LocationRepository::find( (int) $fhint_shop['id'] )['google_location_name'], 'and an edit to the location keeps it' );

$fhint_count_before = LocationRepository::count();

// What a disconnect does, then what a reconnect does.
GoogleLocationRepository::truncate();
GoogleLocationRepository::upsert( $fhint_listing_row( 'locations/reconnect-1', 'Reconnect Shop' ) );

check_same( (int) $fhint_shop['id'], (int) GoogleLocationRepository::find_by_location_name( 'locations/reconnect-1' )['fhint_location_id'], 'after a disconnect, reading the listing again links it back to its location' );
check_same( $fhint_count_before, LocationRepository::count(), 'with no new location made' );

// Unlinking on purpose is the one thing that makes a location forget.
GoogleLocationRepository::unmap( 'locations/reconnect-1' );
check_same( '', LocationRepository::find( (int) $fhint_shop['id'] )['google_location_name'], 'unlinking on purpose clears the memory' );

GoogleLocationRepository::truncate();
GoogleLocationRepository::upsert( $fhint_listing_row( 'locations/reconnect-1', 'Reconnect Shop' ) );
check_same( 0, (int) GoogleLocationRepository::find_by_location_name( 'locations/reconnect-1' )['fhint_location_id'], 'so an unlinked listing is not linked back by a reconnect' );

// A listing is one location's: linking it elsewhere moves the memory.
$fhint_other = LocationRepository::create(
	array(
		'business_id'    => (int) BusinessRepository::get()['id'],
		'name'           => 'Other Shop',
		'address_line_1' => '2 Reconnect Road',
		'city'           => 'Dhaka',
		'country'        => 'BD',
	)
);

GoogleLocationRepository::map( 'locations/reconnect-1', (int) $fhint_shop['id'] );
GoogleLocationRepository::map( 'locations/reconnect-1', (int) $fhint_other['id'] );
check_same( '', LocationRepository::find( (int) $fhint_shop['id'] )['google_location_name'], 'a listing linked to another location is forgotten by the first' );
check_same( 'locations/reconnect-1', LocationRepository::find( (int) $fhint_other['id'] )['google_location_name'], 'and remembered by the second' );

// The backfill for links made before the memory existed.
global $wpdb;
$wpdb->update( Tables::name( Tables::LOCATIONS ), array( 'google_location_name' => '' ), array( 'id' => (int) $fhint_other['id'] ) );

$fhint_migrate = new ReflectionMethod( FHINT\Installer::class, 'remember_google_listings' );
$fhint_migrate->setAccessible( true );
$fhint_migrate->invoke( null );

check_same( 'locations/reconnect-1', LocationRepository::find( (int) $fhint_other['id'] )['google_location_name'], 'the migration gives an already-linked location its memory' );

// Leave the table as the later sections expect it.
LocationRepository::delete( (int) $fhint_shop['id'] );
LocationRepository::delete( (int) $fhint_other['id'] );
GoogleLocationRepository::truncate();

foreach ( $fhint_kept_listings as $fhint_kept ) {
	GoogleLocationRepository::upsert( $fhint_kept );

	if ( (int) $fhint_kept['fhint_location_id'] > 0 ) {
		GoogleLocationRepository::map( $fhint_kept['location_name'], (int) $fhint_kept['fhint_location_id'] );
	}
}

// -- Cascades --------------------------------------------------------------

check_same( 4, count( OpeningHoursRepository::for_location( $location_id ) ), 'all four period rows are there before the delete' );

// The location's other rows: dated exceptions, attribute answers, photo
// records. There are no foreign keys, so each must be let go explicitly.
SpecialHoursRepository::replace(
	$location_id,
	array(
		array(
			'date'         => '2026-12-25',
			'period_index' => 0,
			'open_time'    => null,
			'close_time'   => null,
			'is_closed'    => true,
			'is_24h'       => false,
			'note'         => 'Christmas Day',
		),
	)
);
LocationAttributeRepository::save(
	$location_id,
	array(
		'has_wifi' => array(
			'type'  => 'bool',
			'value' => true,
		),
	)
);
$wpdb->insert(
	Tables::name( Tables::MEDIA ),
	array(
		'location_id' => $location_id,
		'role'        => 'logo',
		'url'         => 'https://example.com/logo.png',
	)
);

check_same( 1, count( SpecialHoursRepository::for_location( $location_id ) ), 'a special day is stored before the delete' );
check_same( 1, count( LocationAttributeRepository::for_location( $location_id ) ), 'and an attribute answer' );
check_same( 1, count( MediaRepository::for_location( $location_id ) ), 'and a photo record' );

LocationRepository::delete( $location_id );

check_same( array(), SpecialHoursRepository::for_location( $location_id ), 'deleting the location removes its special hours' );
check_same( array(), LocationAttributeRepository::for_location( $location_id ), 'and its attribute answers' );
check_same( array(), MediaRepository::for_location( $location_id ), 'and its photo records, through the fhint_location_deleted hook' );

check_same( 0, LocationRepository::count(), 'the location is gone' );
check_same( array(), OpeningHoursRepository::for_location( $location_id ), 'and its hours went with it' );
check_same(
	0,
	GoogleLocationRepository::find_by_location_name( 'locations/789' )['fhint_location_id'],
	'and the Google mapping was released by the fhint_location_deleted hook'
);

// Deleting the business takes its services with it. The count is read rather
// than fixed: the import section above adds one of its own.
check( ServiceRepository::count() > 0, 'services exist before the business is deleted' );

$fhint_doomed_business = (int) BusinessRepository::get()['id'];
$fhint_doomed_location = LocationRepository::create( array( 'name' => 'Doomed branch' ) );

DescriptionHistoryRepository::record( $fhint_doomed_business, 'A description that will not outlive its business.' );
SpecialHoursRepository::replace(
	(int) $fhint_doomed_location['id'],
	array(
		array(
			'date'         => '2026-12-26',
			'period_index' => 0,
			'open_time'    => null,
			'close_time'   => null,
			'is_closed'    => true,
			'is_24h'       => false,
			'note'         => '',
		),
	)
);
LocationAttributeRepository::save(
	(int) $fhint_doomed_location['id'],
	array(
		'has_wifi' => array(
			'type'  => 'bool',
			'value' => true,
		),
	)
);

check_same( 1, count( DescriptionHistoryRepository::latest( $fhint_doomed_business ) ), 'a description version exists before the business is deleted' );

BusinessRepository::delete();

check_same( array(), DescriptionHistoryRepository::latest( $fhint_doomed_business ), 'deleting the business removes its description history' );
check_same( array(), SpecialHoursRepository::for_location( (int) $fhint_doomed_location['id'] ), 'and the special hours of its locations' );
check_same( array(), LocationAttributeRepository::for_location( (int) $fhint_doomed_location['id'] ), 'and their attribute answers' );
check_same( 0, ServiceRepository::count(), 'deleting the business cascades to its services' );
check_same( null, BusinessRepository::get(), 'and the business is gone' );

// -- REST over the real stack ----------------------------------------------

$admins = get_users( array( 'role' => 'administrator', 'number' => 1 ) );

if ( $admins ) {
	wp_set_current_user( $admins[0]->ID );

	$response = rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/business' ) );
	check_same( 200, $response->get_status(), 'an administrator can read /business' );

	// The documented envelope, asserted on a reviews route. Nothing checked
	// this before, and the screen silently rendered "no locations" against a
	// 200 that carried the data at the top level instead of under `data` —
	// a controller that forgets the envelope breaks its screen and nothing
	// else, which is exactly the kind of bug a test has to catch.
	ReviewRepository::truncate();
	ReviewRepository::upsert( fhint_review_row( array( 'review_id' => 'rest-1' ) ) );

	$response = rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/reviews' ) );
	$body     = $response->get_data();

	check_same( 200, $response->get_status(), 'an administrator can read /reviews' );
	check( isset( $body['data'] ), '/reviews wraps its payload in the documented envelope' );
	check( is_array( $body['data'] ) && isset( $body['data'][0]['review_id'] ), 'and returns the collection as a list under data' );
	check_same( 1, isset( $body['meta']['total'] ) ? $body['meta']['total'] : -1, 'with the total in meta, not in data' );

	$response = rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/reviews/state' ) );
	$body     = $response->get_data();


	check( isset( $body['data']['count'] ), '/reviews/state answers under data as well' );
	check( isset( $body['data']['locations'] ), 'and carries the locations a chooser needs' );


	ReviewRepository::truncate();

	$create = new WP_REST_Request( 'POST', '/fhint/v1/business' );
	$create->set_body_params( array( 'name' => 'Created Over REST' ) );

	$response = rest_do_request( $create );

	check_same( 201, $response->get_status(), 'and create through it, answering 201' );
	check_same( 'Created Over REST', BusinessRepository::get()['name'], 'which reaches the database' );

	// Same whitelist, same trap, on the business side.
	$fhint_cat = new WP_REST_Request( 'PATCH', '/fhint/v1/business' );
	$fhint_cat->set_body_params(
		array(
			'primary_category'    => 'Dentist',
			'primary_category_id' => 'gcid:dentist',
		)
	);

	rest_do_request( $fhint_cat );

	check_same(
		'gcid:dentist',
		BusinessRepository::get()['primary_category_id'],
		'PATCH /business accepts the Google category id'
	);

	// -- Google categories: searched from the bundled list, saved as ids ----

	$fhint_search = new WP_REST_Request( 'GET', '/fhint/v1/google/categories' );
	$fhint_search->set_query_params(
		array(
			'search'   => 'dentist',
			'per_page' => 5,
		)
	);

	$fhint_found = rest_do_request( $fhint_search );
	$fhint_body  = $fhint_found->get_data();

	check_same( 200, $fhint_found->get_status(), 'an administrator can search Google categories' );
	check_same( 'gcid:dentist', isset( $fhint_body['data'][0]['id'] ) ? $fhint_body['data'][0]['id'] : '', 'the best match leads, under data' );
	check( isset( $fhint_body['meta']['total'] ) && $fhint_body['meta']['total'] >= 1, 'with the total in meta' );

	$fhint_greedy = new WP_REST_Request( 'GET', '/fhint/v1/google/categories' );
	$fhint_greedy->set_query_params( array( 'per_page' => 500 ) );

	check_same( 400, rest_do_request( $fhint_greedy )->get_status(), 'asking for more than the cap is refused before the search runs' );

	// The chosen categories reach the database as Google's ids, with
	// Google's names — whatever name the request claimed.
	$fhint_choose = new WP_REST_Request( 'PATCH', '/fhint/v1/business' );
	$fhint_choose->set_body_params(
		array(
			'primary_category_id'  => 'gcid:dentist',
			'primary_category'     => 'Best dentist in town',
			'secondary_categories' => array( 'gcid:dental_clinic', 'Cosmetic dentist' ),
		)
	);

	check_same( 200, rest_do_request( $fhint_choose )->get_status(), 'choosing categories saves' );

	$fhint_saved = BusinessRepository::get();

	check_same( 'gcid:dentist', $fhint_saved['primary_category_id'], 'the primary category is stored as Google\'s id' );
	check_same( 'Dentist', $fhint_saved['primary_category'], 'beside Google\'s name for it, not the request\'s' );
	check_same(
		array(
			array(
				'id'   => 'gcid:dental_clinic',
				'name' => 'Dental clinic',
			),
			array(
				'id'   => 'gcid:cosmetic_dentist',
				'name' => 'Cosmetic dentist',
			),
		),
		$fhint_saved['secondary_categories'],
		'and the additional ones round-trip through MySQL as { id, name } pairs'
	);

	// A category Google does not have is refused, and nothing is written.
	$fhint_bogus = new WP_REST_Request( 'PATCH', '/fhint/v1/business' );
	$fhint_bogus->set_body_params( array( 'primary_category_id' => 'gcid:not_a_real_category' ) );

	check_same( 400, rest_do_request( $fhint_bogus )->get_status(), 'an id Google does not have is refused with a 400' );
	check_same( 'gcid:dentist', BusinessRepository::get()['primary_category_id'], 'leaving the stored category untouched' );

	// The legacy text field: a name alone, tied back to its id on the way in.
	$fhint_typed = new WP_REST_Request( 'PATCH', '/fhint/v1/business' );
	$fhint_typed->set_body_params( array( 'primary_category' => 'orthodontist' ) );

	rest_do_request( $fhint_typed );

	check_same( 'gcid:orthodontist', BusinessRepository::get()['primary_category_id'], 'a typed name Google uses replaces the id to match' );

	$fhint_typed->set_body_params( array( 'primary_category' => 'Tooth wizard' ) );

	rest_do_request( $fhint_typed );

	check_same( '', BusinessRepository::get()['primary_category_id'], 'and a freehand one clears it, rather than keeping a stale id' );

	wp_set_current_user( 0 );

	check_same( 401, rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/google/categories' ) )->get_status(), 'the category search refuses a logged-out request' );

	wp_set_current_user( $admins[0]->ID );

	// The writable-field whitelist, which only the REST path goes through:
	// create() merges defaults straight in, so a field missing from the
	// whitelist is written by code and silently dropped by the API.
	$fhint_create = new WP_REST_Request( 'POST', '/fhint/v1/services' );
	$fhint_create->set_body_params(
		array(
			'name'                   => 'Whitelist Check',
			'google_item_type'       => 'structured',
			'google_service_type_id' => 'job_type_id:check',
		)
	);

	$fhint_created = rest_do_request( $fhint_create )->get_data();
	$fhint_back    = ServiceRepository::find( (int) $fhint_created['data']['id'] );

	check_same( 'structured', $fhint_back['google_item_type'], 'POST /services accepts the Google item type' );
	check_same( 'job_type_id:check', $fhint_back['google_service_type_id'], 'and the structured id' );

	ServiceRepository::delete( (int) $fhint_created['data']['id'] );

	// -- The profile: read whole, saved a section at a time ----------------

	/**
	 * Save one profile section over REST.
	 *
	 * @param string $section Section id.
	 * @param array  $fields  The section's fields.
	 * @return WP_REST_Response
	 */
	$fhint_profile_save = static function ( $section, array $fields ) {
		$request = new WP_REST_Request( 'PATCH', '/fhint/v1/profile' );
		$request->set_header( 'content-type', 'application/json' );
		$request->set_body(
			wp_json_encode(
				array(
					'section' => $section,
					'fields'  => $fields,
				)
			)
		);

		return rest_do_request( $request );
	};

	$fhint_profile = rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/profile' ) )->get_data();

	check_same(
		array( 'info', 'address', 'hours', 'social', 'attributes', 'services', 'media' ),
		array_keys( $fhint_profile['data'] ),
		'GET /profile returns every section, under data'
	);
	check( isset( $fhint_profile['meta']['google']['connected'] ) && is_bool( $fhint_profile['meta']['google']['connected'] ), 'and says whether Google is connected' );
	check_same( 750, $fhint_profile['meta']['limits']['description'], 'with the limits a form needs' );

	// Info.
	$fhint_logo_before = BusinessRepository::get()['logo_url'];

	$fhint_response = $fhint_profile_save(
		'info',
		array(
			'name'                => 'Profile Dental',
			'description'         => 'First wording.',
			'primary_category_id' => 'gcid:dentist',
			'website'             => 'https://profile.example',
			'logo_url'            => 'https://elsewhere.example/logo.png',
		)
	);
	$fhint_body     = $fhint_response->get_data();

	check_same( 200, $fhint_response->get_status(), 'saving the info section succeeds' );
	check_same( 'info', $fhint_body['meta']['section'], 'the answer names the section saved' );

	// The opening date: a month, stored on the first of it. On the primary
	// location it is the business's founding date.
	$fhint_founding_before = BusinessRepository::get()['founding_date'];

	$fhint_body = $fhint_profile_save( 'info', array( 'opening_date' => '2014-03' ) )->get_data();

	check_same( '2014-03', $fhint_body['data']['opening_date'], 'an opening date is saved as a month' );
	$fhint_primary_location = null;

	foreach ( LocationRepository::all() as $fhint_candidate ) {
		if ( $fhint_candidate['is_primary'] ) {
			$fhint_primary_location = $fhint_candidate;
		}
	}

	check_same( $fhint_primary_location ? $fhint_primary_location['country'] : '', isset( $fhint_body['data']['country'] ) ? $fhint_body['data']['country'] : null, "the Info section carries the location's country, for the phone fields' country code" );
	check_same( 200, $fhint_profile_save( 'info', array( 'phone' => '+8801518984873' ) )->get_status(), 'a main number in international form, as the country code field writes it, is accepted' );
	check_same( '2014-03-01', BusinessRepository::get()['founding_date'], "on the primary location, as the business's founding date" );

	$fhint_response = $fhint_profile_save( 'info', array( 'opening_date' => '2014-13' ) );
	check_same( 400, $fhint_response->get_status(), 'a month that does not exist is refused' );
	check_same( array( 'opening_date.invalid' ), $fhint_response->get_data()['data']['fields']['opening_date'], 'with its code on the field' );

	$fhint_response = $fhint_profile_save( 'info', array( 'opening_date' => gmdate( 'Y-m', strtotime( '+14 months' ) ) ) );
	check_same( array( 'opening_date.too_far' ), $fhint_response->get_data()['data']['fields']['opening_date'], 'and so is one more than a year ahead, as Google refuses it' );
	check_same( '2014-03-01', BusinessRepository::get()['founding_date'], 'leaving the saved date alone' );

	$fhint_profile_save( 'info', array( 'opening_date' => '' ) );
	check_same( '', BusinessRepository::get()['founding_date'], 'an empty date clears it' );

	BusinessRepository::save( array( 'founding_date' => $fhint_founding_before ) );

	// Extra numbers: up to two, each a real number, none repeating the main.
	$fhint_phones_before = BusinessRepository::get();

	$fhint_body = $fhint_profile_save(
		'info',
		array(
			'phone'             => '(512) 555-0148',
			'additional_phones' => array( '(512) 555-0199', '', '512 555 0199' ),
		)
	)->get_data();

	check_same( array( '(512) 555-0199' ), $fhint_body['data']['additional_phones'], 'extra numbers are saved, with blanks and repeats dropped' );
	check_same( array( '(512) 555-0199' ), BusinessRepository::get()['additional_phones'], "on the primary location, as the business's" );

	$fhint_response = $fhint_profile_save( 'info', array( 'additional_phones' => array( '01700-000001', '01700-000002', '01700-000003' ) ) );
	check_same( 400, $fhint_response->get_status(), 'a third extra number is refused' );
	check_same( array( 'business.additional_phones.too_many' ), $fhint_response->get_data()['data']['fields']['additional_phones'], 'as too many, on the list' );

	$fhint_response = $fhint_profile_save( 'info', array( 'additional_phones' => array( '01700-000001', 'call us' ) ) );
	check_same( array( 'business.phone.invalid' ), $fhint_response->get_data()['data']['fields']['additional_phones.1'], 'a number that is not one is refused, on its own box' );

	$fhint_response = $fhint_profile_save( 'info', array( 'additional_phones' => array( '+1 (512) 555-0148' ) ) );
	check_same( array( 'business.additional_phones.same_as_main' ), $fhint_response->get_data()['data']['fields']['additional_phones.0'], 'and so is the main number again' );
	check_same( array( '(512) 555-0199' ), BusinessRepository::get()['additional_phones'], 'leaving the saved numbers alone' );

	$fhint_profile_save( 'info', array( 'additional_phones' => array() ) );
	check_same( array(), BusinessRepository::get()['additional_phones'], 'an empty list removes them' );

	BusinessRepository::save(
		array(
			'phone'             => $fhint_phones_before['phone'],
			'additional_phones' => $fhint_phones_before['additional_phones'],
		)
	);
	check_same( 'Profile Dental', $fhint_body['data']['name'], 'and carries the section as it now reads' );
	check_same( 'Profile Dental', BusinessRepository::get()['name'], 'which is what reached the database' );
	check_same( 'Dentist', BusinessRepository::get()['primary_category'], 'through the same category rules as /business' );
	check_same( $fhint_logo_before, BusinessRepository::get()['logo_url'], 'a field this section does not own is ignored, not written' );

	check_same( 1, count( $fhint_body['data']['history'] ), 'a new description becomes a version' );

	$fhint_profile_save( 'info', array( 'description' => 'First wording.' ) );

	check_same( 1, count( rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/profile' ) )->get_data()['data']['info']['history'] ), 'saving the same words again does not' );

	$fhint_history = $fhint_profile_save( 'info', array( 'description' => 'Second wording.' ) )->get_data()['data']['history'];

	check_same( array( 'Second wording.', 'First wording.' ), array_column( $fhint_history, 'description' ), 'versions come back newest first' );

	$fhint_response = $fhint_profile_save( 'info', array( 'description' => 'Book at https://profile.example' ) );

	check_same( 400, $fhint_response->get_status(), 'a description with a link is refused' );
	check_same( array( 'business.description.has_link' ), $fhint_response->get_data()['data']['fields']['description'], 'with the code keyed to the description' );
	check_same( 'Second wording.', BusinessRepository::get()['description'], 'and the stored description is untouched' );

	// Address.
	$fhint_response = $fhint_profile_save(
		'address',
		array(
			'address_line_1' => '410 Congress Ave',
			'city'           => 'Austin',
			'region'         => 'TX',
			'postal_code'    => '78701',
			'country'        => 'US',
		)
	);
	$fhint_place    = LocationRepository::primary();

	check_same( 200, $fhint_response->get_status(), 'saving the address succeeds' );
	check( is_array( $fhint_place ), 'creating the location when the business had none' );
	check_same( '410 Congress Ave', $fhint_place['address_line_1'], 'and storing the address on it' );
	check_same( false, $fhint_response->get_data()['data']['locked'], 'an address with no Google listing behind it is editable' );

	GoogleLocationRepository::upsert(
		array(
			'account_name'       => 'accounts/1',
			'location_name'      => 'locations/profile-lock',
			'title'              => 'Profile Dental',
			'store_code'         => '',
			'address'            => '',
			'phone'              => '',
			'website'            => '',
			'verification_state' => 'VERIFIED',
			'cid'                => '9451387654872888532',
			'payload'            => array(),
		)
	);
	GoogleLocationRepository::map( 'locations/profile-lock', (int) $fhint_place['id'] );

	$fhint_response = $fhint_profile_save( 'address', array( 'city' => 'Dallas' ) );

	check_same( 409, $fhint_response->get_status(), 'once mapped to a Google listing, the address is refused' );
	check_same( 'fhint_address_locked', $fhint_response->get_data()['code'], 'with a code that says why' );
	check_same( 'Austin', LocationRepository::primary()['city'], 'and is not changed' );

	$fhint_profile = rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/profile' ) )->get_data();

	check_same( true, $fhint_profile['data']['address']['locked'], 'the screen is told the address is locked' );
	check_same( '9451387654872888532', $fhint_profile['data']['info']['cid'], 'and shown the listing\'s CID' );
	check_same( true, $fhint_profile['meta']['google']['verified'], 'and that the listing is verified' );

	GoogleLocationRepository::unmap( 'locations/profile-lock' );

	// Hours.
	update_option( 'fhint_data_changed_at', 1, false );

	$fhint_response = $fhint_profile_save(
		'hours',
		array(
			'opening_hours' => array(
				'1' => array(
					'open_time'  => '09:00',
					'close_time' => '17:00',
				),
			),
			'special_hours' => array(
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
			),
		)
	);
	$fhint_hours    = $fhint_response->get_data()['data'];

	check_same( 200, $fhint_response->get_status(), 'saving hours succeeds' );
	check_same( array( '2026-12-24', '2026-12-25' ), array_column( $fhint_hours['special_hours'], 'date' ), 'special days round-trip through MySQL, oldest first' );
	check_same( 2, count( $fhint_hours['special_hours'][0]['periods'] ), 'a special day keeps its break' );
	check_same( 'Christmas Day', $fhint_hours['special_hours'][1]['note'], 'and a closed one its label' );
	check_same( 1, count( OpeningHoursRepository::for_location( (int) $fhint_place['id'] ) ), 'the week is stored beside them' );
	check( (int) get_option( 'fhint_data_changed_at' ) > 1, 'and the data is marked changed, so cached schema is rebuilt' );

	// Each key is saved on its own: a week sent alone must not be read as
	// "and no special days".
	$fhint_profile_save(
		'hours',
		array(
			'opening_hours' => array(
				'1' => array(
					'open_time'  => '08:00',
					'close_time' => '16:00',
				),
			),
		)
	);

	check_same( 3, count( SpecialHoursRepository::for_location( (int) $fhint_place['id'] ) ), 'saving only the week leaves the special days alone' );
	check_same( '08:00:00', OpeningHoursRepository::for_location( (int) $fhint_place['id'] )[0]['open_time'], 'while the week itself is replaced' );

	$fhint_response = $fhint_profile_save( 'hours', array( 'special_hours' => array( array( 'date' => '2026-02-30', 'is_closed' => true ) ) ) );

	check_same( 400, $fhint_response->get_status(), 'a special day on a date that does not exist is refused' );
	check_same( array( 'special_hours.date.invalid' ), $fhint_response->get_data()['data']['fields']['special_hours.day_0.date'], 'keyed to the row and field at fault' );
	check_same( 3, count( SpecialHoursRepository::for_location( (int) $fhint_place['id'] ) ), 'leaving the stored days as they were' );

	$fhint_profile_save( 'hours', array( 'special_hours' => array() ) );

	check_same( 0, count( SpecialHoursRepository::for_location( (int) $fhint_place['id'] ) ), 'an empty list clears the special days' );
	check_same( 1, count( OpeningHoursRepository::for_location( (int) $fhint_place['id'] ) ), 'without touching the week, which was not sent' );

	// Social.
	$fhint_social = $fhint_profile_save( 'social', array( 'social_profiles' => array( 'facebook' => 'https://facebook.com/profiledental' ) ) )->get_data()['data'];

	check_same( array( 'https://facebook.com/profiledental' ), $fhint_social['same_as'], 'a social link is saved and listed for the markup' );
	check_same( 400, $fhint_profile_save( 'social', array( 'social_profiles' => array( 'facebook' => 'not a link' ) ) )->get_status(), 'and one that is not a link is refused' );

	// Attributes.
	$fhint_values = $fhint_profile_save(
		'attributes',
		array(
			'values' => array(
				'has_wheelchair_accessible_entrance' => true,
				'pay_credit_card_types_accepted'     => array( 'visa', 'mastercard' ),
			),
		)
	)->get_data()['data']['values'];

	check_same( 2, count( $fhint_values ), 'attribute values are stored' );
	check_same( array( 'visa', 'mastercard' ), $fhint_values[1]['value'], 'a list survives MySQL as a list' );
	check( $fhint_values[0]['is_dirty'] && $fhint_values[1]['is_dirty'], 'each marked as changed since the last push' );

	$fhint_values = $fhint_profile_save( 'attributes', array( 'values' => array( 'has_wheelchair_accessible_entrance' => null ) ) )->get_data()['data']['values'];

	check_same( array( 'pay_credit_card_types_accepted' ), array_column( $fhint_values, 'attribute_id' ), 'null withdraws one answer and leaves the others' );

	// Services: the whole list, in order.
	$fhint_items = $fhint_profile_save(
		'services',
		array(
			'items' => array(
				array(
					'name'     => 'Teeth whitening',
					'price'    => 320,
					'currency' => 'USD',
				),
				array( 'name' => 'Check-up' ),
			),
		)
	)->get_data()['data']['items'];

	check_same( array( 'Teeth whitening', 'Check-up' ), array_column( $fhint_items, 'name' ), 'a list of services is created in the order sent' );

	$fhint_items = $fhint_profile_save(
		'services',
		array(
			'items' => array(
				array(
					'id'   => $fhint_items[1]['id'],
					'name' => 'Check-up and clean',
				),
				array( 'name' => 'Dental implants' ),
			),
		)
	)->get_data()['data']['items'];

	check_same( array( 'Check-up and clean', 'Dental implants' ), array_column( $fhint_items, 'name' ), 'an entry with an id is updated, one without is created, and one left out is removed' );
	check_same( 2, ServiceRepository::count(), 'so the stored list is exactly the list sent' );

	$fhint_response = $fhint_profile_save( 'services', array( 'items' => array( array( 'name' => '' ), array( 'name' => 'Fine' ) ) ) );

	check_same( 400, $fhint_response->get_status(), 'a list with one bad entry is refused whole' );
	check( isset( $fhint_response->get_data()['data']['fields']['items.0.name'] ), 'keyed to the entry and field at fault' );
	check_same( array( 'Check-up and clean', 'Dental implants' ), array_column( ServiceRepository::all(), 'name' ), 'and nothing is half-applied' );

	$fhint_cap = static function ( $limits ) {
		$limits['services'] = 2;

		return $limits;
	};

	add_filter( 'fhint_limits', $fhint_cap );

	$fhint_ids      = array_column( ServiceRepository::all(), 'id' );
	$fhint_response = $fhint_profile_save(
		'services',
		array(
			'items' => array(
				array( 'id' => $fhint_ids[0] ),
				array( 'id' => $fhint_ids[1] ),
				array( 'name' => 'One too many' ),
			),
		)
	);

	check_same( 403, $fhint_response->get_status(), 'growing the list past the plan limit is refused' );
	check_same( 'fhint_service_limit_reached', $fhint_response->get_data()['code'], 'with the same code /services uses' );
	check_same(
		200,
		$fhint_profile_save(
			'services',
			array(
				'items' => array(
					array(
						'id'   => $fhint_ids[0],
						'name' => 'Check-up, clean and polish',
					),
					array( 'id' => $fhint_ids[1] ),
				),
			)
		)->get_status(),
		'while editing a list already at the limit is allowed'
	);

	remove_filter( 'fhint_limits', $fhint_cap );

	// Photos are not a section save, and an unknown section is not a section.
	check_same( 400, $fhint_profile_save( 'media', array( 'logo' => 'x' ) )->get_status(), 'the media section refuses a save' );
	check_same( 400, $fhint_profile_save( 'payments', array() )->get_status(), 'a section that does not exist is refused' );

	// A second branch: every profile route can be pointed at one location.
	$fhint_branch = LocationRepository::create(
		array(
			'name'           => 'Harbour branch',
			'address_line_1' => '2 Harbour Road',
			'city'           => 'Chittagong',
			'country'        => 'BD',
			'phone'          => '+8801000000002',
		)
	);

	$fhint_profile_at = static function ( $location_id ) {
		$request = new WP_REST_Request( 'GET', '/fhint/v1/profile' );

		if ( null !== $location_id ) {
			$request->set_query_params( array( 'location_id' => $location_id ) );
		}

		return rest_do_request( $request );
	};

	$fhint_branch_profile = $fhint_profile_at( (int) $fhint_branch['id'] )->get_data();

	check_same( (int) $fhint_branch['id'], $fhint_branch_profile['data']['address']['location_id'], 'GET /profile?location_id reads the named location' );
	check_same( 'Chittagong', $fhint_branch_profile['data']['address']['city'], 'with its own address' );
	check_same( (int) $fhint_branch['id'], $fhint_branch_profile['meta']['location']['id'], 'and says which location it is describing' );
	check_same(
		array( (int) $fhint_place['id'], (int) $fhint_branch['id'] ),
		array_column( $fhint_branch_profile['meta']['locations'], 'id' ),
		'alongside every location there is to switch to, primary first'
	);
	check( null === $fhint_branch_profile['meta']['reviews'], 'a location with no Google listing is given no rating' );
	check_same( (int) $fhint_place['id'], $fhint_profile_at( null )->get_data()['data']['address']['location_id'], 'a read naming no location is the primary one, even straight after one that did' );
	check_same( 404, $fhint_profile_at( 999999 )->get_status(), 'a location that does not exist is a 404' );

	$fhint_request = new WP_REST_Request( 'PATCH', '/fhint/v1/profile' );
	$fhint_request->set_header( 'content-type', 'application/json' );
	$fhint_request->set_body(
		wp_json_encode(
			array(
				'section'     => 'address',
				'location_id' => (int) $fhint_branch['id'],
				'fields'      => array( 'city' => 'Cox\'s Bazar' ),
			)
		)
	);

	$fhint_primary_city = LocationRepository::find( (int) $fhint_place['id'] )['city'];
	$fhint_response     = rest_do_request( $fhint_request );

	check_same( 200, $fhint_response->get_status(), 'a section can be saved for a named location' );
	check_same( 'Cox\'s Bazar', LocationRepository::find( (int) $fhint_branch['id'] )['city'], 'which is the one that changes' );
	check_same( $fhint_primary_city, LocationRepository::find( (int) $fhint_place['id'] )['city'], 'while the primary location is left alone' );
	check_same( 'Cox\'s Bazar', $fhint_response->get_data()['data']['city'], 'and the answer is that location as it now reads' );

	FHINT\App\Profile\Profile::select( (int) $fhint_branch['id'] );
	check_same( '+8801000000002', FHINT\App\Google\Push\Publisher::local()['phone'], 'a publish compares the chosen location, not the primary one' );
	FHINT\App\Profile\Profile::select( 0 );

	// Categories follow the location. Two listings under one account can be
	// two kinds of business, and saving one must not re-categorise the other.
	$fhint_info_at = static function ( $location_id, array $fields ) {
		$request = new WP_REST_Request( 'PATCH', '/fhint/v1/profile' );
		$request->set_header( 'content-type', 'application/json' );
		$request->set_body(
			wp_json_encode(
				array(
					'section'     => 'info',
					'location_id' => (int) $location_id,
					'fields'      => $fields,
				)
			)
		);

		return rest_do_request( $request );
	};

	$fhint_info_at( (int) $fhint_place['id'], array( 'primary_category_id' => 'gcid:dentist', 'secondary_categories' => array( 'gcid:orthodontist' ) ) );

	check_same( 'gcid:dentist', BusinessRepository::get()['primary_category_id'], 'the main location\'s category is the business\'s' );
	check_same( 'gcid:dentist', $fhint_profile_at( (int) $fhint_branch['id'] )->get_data()['data']['info']['primary_category_id'], 'and a branch with none of its own shows it too' );

	$fhint_response = $fhint_info_at( (int) $fhint_branch['id'], array( 'secondary_categories' => array( 'gcid:pet_groomer' ) ) );
	$fhint_own      = $fhint_profile_at( (int) $fhint_branch['id'] )->get_data()['data']['info'];

	check_same( 200, $fhint_response->get_status(), 'a branch can be given categories of its own' );
	check_same( array( 'gcid:dentist', array( 'gcid:pet_groomer' ) ), array( $fhint_own['primary_category_id'], array_column( $fhint_own['secondary_categories'], 'id' ) ), 'an extra category alone is kept, with the main one it was shown beside' );

	$fhint_info_at( (int) $fhint_branch['id'], array( 'primary_category_id' => 'gcid:pet_store', 'name' => BusinessRepository::get()['name'] ) );

	$fhint_own = $fhint_profile_at( (int) $fhint_branch['id'] )->get_data()['data']['info'];

	check_same( array( 'gcid:pet_store', 'Pet store' ), array( $fhint_own['primary_category_id'], $fhint_own['primary_category'] ), 'and its main category is its own' );
	check_same( array( 'gcid:dentist', array( 'gcid:orthodontist' ) ), array( BusinessRepository::get()['primary_category_id'], array_column( BusinessRepository::get()['secondary_categories'], 'id' ) ), 'while the business keeps the categories it had' );
	check_same( 'gcid:dentist', $fhint_profile_at( null )->get_data()['data']['info']['primary_category_id'], 'so switching back to the main location shows its category unchanged' );
	check_same( 400, $fhint_info_at( (int) $fhint_branch['id'], array( 'secondary_categories' => array( 'gcid:pet_store' ) ) )->get_status(), 'a branch\'s extra category is checked against its own main one' );

	// Name, description, phone and website follow the location too.
	$fhint_business_details = BusinessRepository::get();

	check_same( $fhint_business_details['name'], $fhint_profile_at( (int) $fhint_branch['id'] )->get_data()['data']['info']['name'], 'a branch with no name of its own shows the business\'s' );

	$fhint_response = $fhint_info_at(
		(int) $fhint_branch['id'],
		array(
			'name'        => 'Harbour Pets',
			'description' => 'Pet food and grooming by the harbour.',
			'phone'       => '+880 1700 000002',
			'website'     => 'https://harbourpets.example',
		)
	);
	$fhint_branch_info = $fhint_profile_at( (int) $fhint_branch['id'] )->get_data()['data']['info'];

	check_same( 200, $fhint_response->get_status(), 'a branch can be given its own name, description, phone and website' );
	check_same(
		array( 'Harbour Pets', 'Pet food and grooming by the harbour.', '+880 1700 000002', 'https://harbourpets.example' ),
		array( $fhint_branch_info['name'], $fhint_branch_info['description'], $fhint_branch_info['phone'], $fhint_branch_info['website'] ),
		'and shows them'
	);
	check_same(
		array( $fhint_business_details['name'], $fhint_business_details['description'], $fhint_business_details['phone'], $fhint_business_details['website'] ),
		array( BusinessRepository::get()['name'], BusinessRepository::get()['description'], BusinessRepository::get()['phone'], BusinessRepository::get()['website'] ),
		'while the business keeps its own'
	);
	check_same( $fhint_business_details['name'], $fhint_profile_at( null )->get_data()['data']['info']['name'], 'so the main location still shows the business\'s name' );
	check_same( array( 'Pet food and grooming by the harbour.' ), array_column( $fhint_branch_info['history'], 'description' ), 'a branch\'s description has a history of its own' );
	check(
		! in_array( 'Pet food and grooming by the harbour.', array_column( $fhint_profile_at( null )->get_data()['data']['info']['history'], 'description' ), true ),
		'which does not appear in the business\'s'
	);

	$fhint_info_at( (int) $fhint_branch['id'], array( 'phone' => '' ) );

	check_same( $fhint_business_details['phone'], $fhint_profile_at( (int) $fhint_branch['id'] )->get_data()['data']['info']['phone'], 'clearing a branch\'s own phone shows the business\'s again' );
	check_same( 400, $fhint_info_at( (int) $fhint_branch['id'], array( 'name' => '' ) )->get_status(), 'and a branch cannot be left with no name at all' );

	// Social links and services follow the location too.
	$fhint_section_at = static function ( $location_id, $section, array $fields ) {
		$request = new WP_REST_Request( 'PATCH', '/fhint/v1/profile' );
		$request->set_header( 'content-type', 'application/json' );
		$request->set_body(
			wp_json_encode(
				array(
					'section'     => $section,
					'location_id' => (int) $location_id,
					'fields'      => $fields,
				)
			)
		);

		return rest_do_request( $request );
	};

	$fhint_business_social = BusinessRepository::get()['social_profiles'];
	$fhint_main_social     = $fhint_profile_at( null )->get_data()['data']['social']['social_profiles'];

	check_same( $fhint_main_social, $fhint_profile_at( (int) $fhint_branch['id'] )->get_data()['data']['social']['social_profiles'], 'a branch with no links of its own shows the business\'s' );

	$fhint_section_at( (int) $fhint_branch['id'], 'social', array( 'social_profiles' => array( 'facebook' => 'https://facebook.com/harbourpets' ) ) );

	$fhint_branch_social = $fhint_profile_at( (int) $fhint_branch['id'] )->get_data()['data']['social'];

	check_same( 'https://facebook.com/harbourpets', $fhint_branch_social['social_profiles']['facebook'], 'a branch can be given links of its own' );
	check_same( array( 'https://facebook.com/harbourpets' ), $fhint_branch_social['same_as'], 'and only its own are in its markup list' );
	check_same( $fhint_business_social, BusinessRepository::get()['social_profiles'], 'while the business keeps its links' );
	check_same( $fhint_main_social, $fhint_profile_at( null )->get_data()['data']['social']['social_profiles'], 'and the main location still shows them' );

	$fhint_section_at( (int) $fhint_branch['id'], 'social', array( 'social_profiles' => array( 'facebook' => '' ) ) );

	check_same( array(), $fhint_profile_at( (int) $fhint_branch['id'] )->get_data()['data']['social']['same_as'], 'removing a branch\'s last link leaves it with none, not with the business\'s back' );

	$fhint_section_at( (int) $fhint_branch['id'], 'social', array( 'social_profiles' => array( 'facebook' => 'https://facebook.com/harbourpets' ) ) );

	$fhint_main_services = array_column( ServiceRepository::all(), 'name' );

	check_same( array(), $fhint_profile_at( (int) $fhint_branch['id'] )->get_data()['data']['services']['items'], 'a branch starts with a list of services of its own, empty' );

	$fhint_response = $fhint_section_at(
		(int) $fhint_branch['id'],
		'services',
		array(
			'items' => array(
				array( 'name' => 'Dog grooming' ),
				array( 'name' => 'Cat boarding' ),
			),
		)
	);
	$fhint_branch_services = $fhint_profile_at( (int) $fhint_branch['id'] )->get_data()['data']['services']['items'];

	check_same( 200, $fhint_response->get_status(), 'a branch\'s services can be saved' );
	check_same( array( 'Dog grooming', 'Cat boarding' ), array_column( $fhint_branch_services, 'name' ), 'onto its own list' );
	check_same( array( (int) $fhint_branch['id'], (int) $fhint_branch['id'] ), array_map( 'intval', array_column( $fhint_branch_services, 'location_id' ) ), 'which belongs to the branch' );
	check_same( $fhint_main_services, array_column( ServiceRepository::all(), 'name' ), 'and the business\'s own list is untouched' );

	$fhint_section_at( (int) $fhint_branch['id'], 'services', array( 'items' => array( array( 'name' => 'Dog grooming' ) ) ) );

	check_same( array( 'Dog grooming' ), array_column( $fhint_profile_at( (int) $fhint_branch['id'] )->get_data()['data']['services']['items'], 'name' ), 'saving a branch\'s list removes only from that list' );
	check_same( $fhint_main_services, array_column( ServiceRepository::all(), 'name' ), 'never from the business\'s' );

	// The same service name on two lists is two services, not a clash.
	$fhint_branch_slug = ServiceRepository::all( array( 'location_id' => (int) $fhint_branch['id'] ) )[0]['slug'];
	$fhint_main_dog    = ServiceRepository::create(
		array(
			'name' => 'Dog grooming',
			'slug' => $fhint_branch_slug,
		)
	);

	check( null !== $fhint_main_dog && $fhint_branch_slug === $fhint_main_dog['slug'], 'two lists can each have a service with the same name and address' );

	ServiceRepository::delete( (int) $fhint_main_dog['id'] );

	FHINT\App\Profile\Profile::select( (int) $fhint_branch['id'] );
	check_same( 'gcid:pet_store', FHINT\App\Google\Push\Publisher::local()['primary_category_id'], 'and a publish sends each listing its own location\'s category' );
	check_same( array( 'Dog grooming' ), array_column( FHINT\App\Google\Push\Publisher::local()['services'], 'name' ), 'its own services' );
	check_same( 'https://facebook.com/harbourpets', FHINT\App\Google\Push\Publisher::local()['social_profiles']['facebook'], 'and its own links' );
	check_same( array( 'Harbour Pets', 'Pet food and grooming by the harbour.' ), array( FHINT\App\Google\Push\Publisher::local()['name'], FHINT\App\Google\Push\Publisher::local()['description'] ), 'and its own name and description' );
	FHINT\App\Profile\Profile::select( 0 );
	check_same( 'gcid:dentist', FHINT\App\Google\Push\Publisher::local()['primary_category_id'], 'the main listing the business\'s' );

	// The site's structured data: one business per location, each its own.
	LocationRepository::update( (int) $fhint_branch['id'], array( 'postal_code' => '4100' ) );

	$fhint_site_nodes = static function () {
		$nodes = array();

		foreach ( Graph::build_site()['@graph'] as $node ) {
			$nodes[ $node['@id'] ] = $node;
		}

		return $nodes;
	};

	$fhint_nodes      = $fhint_site_nodes();
	$fhint_branch_id  = Graph::location_business_id( (int) $fhint_branch['id'] );
	$fhint_branch_node = isset( $fhint_nodes[ $fhint_branch_id ] ) ? $fhint_nodes[ $fhint_branch_id ] : array();

	check( ! empty( $fhint_branch_node ), 'the site\'s structured data has a business entry for each location' );
	check_same(
		array( 'Harbour Pets', 'Pet food and grooming by the harbour.', 'PetStore', array( 'https://facebook.com/harbourpets' ) ),
		array(
			isset( $fhint_branch_node['name'] ) ? $fhint_branch_node['name'] : '',
			isset( $fhint_branch_node['description'] ) ? $fhint_branch_node['description'] : '',
			isset( $fhint_branch_node['@type'] ) ? $fhint_branch_node['@type'] : '',
			isset( $fhint_branch_node['sameAs'] ) ? $fhint_branch_node['sameAs'] : array(),
		),
		'with that location\'s own name, description, type from its own category, and links'
	);
	check_same( '4100', isset( $fhint_branch_node['address']['postalCode'] ) ? $fhint_branch_node['address']['postalCode'] : '', 'and its own address' );
	check( ! isset( $fhint_branch_node['parentOrganization'] ), 'a location with a name of its own is published as a business of its own' );

	$fhint_branch_catalog_id = isset( $fhint_branch_node['hasOfferCatalog']['@id'] ) ? $fhint_branch_node['hasOfferCatalog']['@id'] : '';

	check( '' !== $fhint_branch_catalog_id && Graph::catalog_id() !== $fhint_branch_catalog_id, 'its services are a catalog of their own' );
	check_same(
		array( 'Dog grooming' ),
		isset( $fhint_nodes[ $fhint_branch_catalog_id ] ) ? array_column( array_column( $fhint_nodes[ $fhint_branch_catalog_id ]['itemListElement'], 'itemOffered' ), 'name' ) : array(),
		'listing that location\'s services only'
	);

	if ( isset( $fhint_nodes[ Graph::business_id() ] ) ) {
		check( 'Harbour Pets' !== $fhint_nodes[ Graph::business_id() ]['name'], 'while the main location keeps its own entry' );
	}

	LocationRepository::update( (int) $fhint_branch['id'], array( 'business_name' => '' ) );

	$fhint_nodes = $fhint_site_nodes();

	check_same(
		array( '@id' => Graph::business_id() ),
		isset( $fhint_nodes[ $fhint_branch_id ]['parentOrganization'] ) ? $fhint_nodes[ $fhint_branch_id ]['parentOrganization'] : null,
		'a branch trading under the business\'s name points to the business as its parent'
	);

	$fhint_only_branch = static function () use ( $fhint_branch ) {
		return array( (int) $fhint_branch['id'] );
	};

	add_filter( 'fhint_schema_locations', $fhint_only_branch );
	check_same( array( $fhint_branch_id, trailingslashit( home_url( '/' ) ) . '#services-' . (int) $fhint_branch['id'] ), array_keys( $fhint_site_nodes() ), 'a page can be limited to one location' );
	remove_filter( 'fhint_schema_locations', $fhint_only_branch );

	LocationRepository::update( (int) $fhint_branch['id'], array( 'postal_code' => '' ) );

	check( ! isset( $fhint_site_nodes()[ $fhint_branch_id ] ), 'a location that cannot be published is left out on its own' );

	LocationRepository::update(
		(int) $fhint_branch['id'],
		array(
			'business_name' => 'Harbour Pets',
			'postal_code'   => '4100',
		)
	);

	// The audit and the schema preview are per location too.
	$fhint_audit_at = static function ( $location_id ) {
		$request = new WP_REST_Request( 'GET', '/fhint/v1/audits' );

		if ( null !== $location_id ) {
			$request->set_query_params( array( 'location_id' => $location_id ) );
		}

		return rest_do_request( $request );
	};

	$fhint_main_run   = FHINT\App\Audit\Runner::run( 0, FHINT\App\Audit\Runner::TRIGGER_MANUAL );
	$fhint_branch_run = FHINT\App\Audit\Runner::run( (int) $fhint_branch['id'], FHINT\App\Audit\Runner::TRIGGER_MANUAL );
	$fhint_branch_audit = $fhint_audit_at( (int) $fhint_branch['id'] )->get_data();
	$fhint_main_audit   = $fhint_audit_at( null )->get_data();

	check_same( $fhint_branch_run['id'], $fhint_branch_audit['data']['id'], 'GET /audits?location_id shows that location\'s latest audit' );
	check_same( (int) $fhint_branch['id'], $fhint_branch_audit['meta']['location_id'], 'and says which location it is for' );
	check_same( $fhint_main_run['id'], $fhint_main_audit['data']['id'], 'while GET /audits shows the main location\'s, though the branch ran later' );
	check(
		! in_array( $fhint_main_run['id'], array_column( $fhint_branch_audit['meta']['history'], 'id' ), true ),
		'and a location\'s history holds only its own runs'
	);
	check_same( 404, $fhint_audit_at( 999999 )->get_status(), 'an audit for a location that does not exist is a 404' );

	$fhint_dashboard_at = static function ( $location_id ) {
		$request = new WP_REST_Request( 'GET', '/fhint/v1/dashboard' );

		if ( null !== $location_id ) {
			$request->set_query_params( array( 'location_id' => $location_id ) );
		}

		return rest_do_request( $request );
	};

	check_same( $fhint_branch_run['id'], $fhint_dashboard_at( (int) $fhint_branch['id'] )->get_data()['data']['score']['audit_id'], 'the dashboard\'s score card shows the chosen location\'s audit' );
	check_same( $fhint_main_run['id'], $fhint_dashboard_at( null )->get_data()['data']['score']['audit_id'], 'and the main location\'s when none is chosen, though the branch ran later' );
	check_same( 404, $fhint_dashboard_at( 999999 )->get_status(), 'a dashboard for a location that does not exist is a 404' );

	$fhint_unaudited = LocationRepository::create( array( 'name' => 'Never audited' ) );

	check( false === $fhint_dashboard_at( (int) $fhint_unaudited['id'] )->get_data()['data']['score']['has_audit'], 'a location never audited shows no score, not another location\'s' );

	LocationRepository::delete( (int) $fhint_unaudited['id'] );

	$fhint_schema_request = new WP_REST_Request( 'GET', '/fhint/v1/schema' );
	$fhint_schema_request->set_query_params( array( 'location_id' => (int) $fhint_branch['id'] ) );

	check_same( 'Harbour Pets', rest_do_request( $fhint_schema_request )->get_data()['data']['@graph'][0]['name'], 'GET /schema?location_id previews that location\'s own markup' );

	$fhint_schema_request->set_query_params( array( 'location_id' => 999999 ) );

	check_same( 404, rest_do_request( $fhint_schema_request )->get_status(), 'and a location that does not exist is a 404' );

	// The dashboard checks further down count on their own runs being the
	// newest, so these two go.
	foreach ( array( $fhint_main_run['id'], $fhint_branch_run['id'] ) as $fhint_run_id ) {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->delete( Tables::name( Tables::AUDIT_ISSUES ), array( 'audit_id' => (int) $fhint_run_id ) );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->delete( Tables::name( Tables::AUDITS ), array( 'id' => (int) $fhint_run_id ) );
	}

	// The rating in the header is the chosen listing's own, from stored
	// reviews. Borrow a listing already in the table, then hand it back.
	$fhint_listings = GoogleLocationRepository::all();

	if ( $fhint_listings ) {
		$fhint_listing = $fhint_listings[0];
		$fhint_review  = static function ( $id, $listing, $stars ) {
			return array(
				'review_id'         => $id,
				'location_name'     => $listing,
				'account_name'      => 'accounts/1',
				'reviewer_name'     => 'A customer',
				'reviewer_photo'    => '',
				'is_anonymous'      => false,
				'star_rating'       => $stars,
				'comment'           => '',
				'reply_comment'     => '',
				'replied_at'        => null,
				'reviewed_at'       => null,
				'review_updated_at' => null,
				'payload'           => array(),
			);
		};

		GoogleLocationRepository::map( $fhint_listing['location_name'], (int) $fhint_branch['id'] );
		FHINT\App\Review\ReviewRepository::upsert( $fhint_review( 'fhint-rating-1', $fhint_listing['location_name'], 5 ) );
		FHINT\App\Review\ReviewRepository::upsert( $fhint_review( 'fhint-rating-2', $fhint_listing['location_name'], 4 ) );
		FHINT\App\Review\ReviewRepository::upsert( $fhint_review( 'fhint-rating-3', 'locations/somewhere-else', 1 ) );

		check_same(
			array(
				'average' => 4.5,
				'count'   => 2,
			),
			$fhint_profile_at( (int) $fhint_branch['id'] )->get_data()['meta']['reviews'],
			'a mapped location carries the rating of its own listing, and no other listing\'s reviews'
		);

		FHINT\App\Review\ReviewRepository::delete_for_location( $fhint_listing['location_name'] );
		FHINT\App\Review\ReviewRepository::delete_for_location( 'locations/somewhere-else' );
		GoogleLocationRepository::map( $fhint_listing['location_name'], (int) $fhint_listing['fhint_location_id'] );
	} else {
		check( false, 'a Google listing exists to test the rating against' );
	}

	// -- What only Google can supply: attributes, photos, categories --------
	//
	// A listing of its own, answered in-process, so nothing here depends on
	// what the import section above left behind.
	GoogleLocationRepository::upsert(
		array(
			'account_name'       => 'accounts/999',
			'location_name'      => 'locations/refresh-me',
			'store_code'         => '',
			'title'              => 'Harbour Pets',
			'address'            => '2 Harbour Road, Chittagong',
			'phone'              => '',
			'website'            => '',
			'verification_state' => 'VERIFIED',
			'payload'            => array(),
		)
	);
	GoogleLocationRepository::map( 'locations/refresh-me', (int) $fhint_branch['id'] );

	// The Reviews screen opens on the location chosen in the Business
	// profile, so each listing it offers says which location it belongs to.
	$fhint_review_listings = array_column(
		rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/reviews/state' ) )->get_data()['data']['locations'],
		'location_id',
		'location_name'
	);

	check_same( (int) $fhint_branch['id'], isset( $fhint_review_listings['locations/refresh-me'] ) ? $fhint_review_listings['locations/refresh-me'] : null, 'each listing on the Reviews screen says which location it belongs to' );

	$fhint_google = array(
		'calls'         => array(),
		'fewer'         => false,
		'refuse_create' => false,
	);

	$fhint_answer = static function ( $body, $code = 200 ) {
		return array(
			'headers'  => array(),
			'body'     => wp_json_encode( $body ),
			'response' => array(
				'code'    => $code,
				'message' => 200 === $code ? 'OK' : 'Bad Request',
			),
			'cookies'  => array(),
		);
	};

	$fhint_fake_listing = static function ( $pre, $args, $url ) use ( &$fhint_google, $fhint_answer ) {
		$url = rawurldecode( (string) $url );

		if ( false === strpos( $url, 'refresh-me' ) && false === strpos( $url, 'upload-ref-1' ) ) {
			return $pre;
		}

		$method = isset( $args['method'] ) ? strtoupper( (string) $args['method'] ) : 'GET';

		$fhint_google['calls'][] = array(
			'method' => $method,
			'url'    => $url,
			'body'   => isset( $args['body'] ) ? $args['body'] : null,
			'type'   => isset( $args['headers']['Content-Type'] ) ? $args['headers']['Content-Type'] : '',
		);

		if ( 'POST' === $method ) {
			if ( false !== strpos( $url, 'media:startUpload' ) ) {
				return $fhint_answer( array( 'resourceName' => 'upload-ref-1' ) );
			}

			if ( false !== strpos( $url, '/upload/v1/media/upload-ref-1' ) ) {
				return $fhint_answer( array() );
			}

			if ( $fhint_google['refuse_create'] ) {
				return $fhint_answer(
					array(
						'error' => array(
							'code'    => 400,
							'message' => 'Photo is too blurry.',
							'status'  => 'INVALID_ARGUMENT',
						),
					),
					400
				);
			}

			return $fhint_answer(
				array(
					'name'                => 'accounts/999/locations/refresh-me/media/sent-1',
					'mediaFormat'         => 'PHOTO',
					'locationAssociation' => array( 'category' => 'ADDITIONAL' ),
					'googleUrl'           => 'https://lh3.googleusercontent.com/sent-1',
				)
			);
		}

		if ( false !== strpos( $url, '/media' ) ) {
			$items = array(
				array(
					'name'                => 'accounts/999/locations/refresh-me/media/cover-1',
					'mediaFormat'         => 'PHOTO',
					'locationAssociation' => array( 'category' => 'COVER' ),
					'googleUrl'           => 'https://lh3.googleusercontent.com/cover-1',
					'dimensions'          => array(
						'widthPixels'  => 1600,
						'heightPixels' => 900,
					),
				),
				array(
					'name'                => 'accounts/999/locations/refresh-me/media/shop-1',
					'mediaFormat'         => 'PHOTO',
					'locationAssociation' => array( 'category' => 'ADDITIONAL' ),
					'googleUrl'           => 'https://lh3.googleusercontent.com/shop-1',
				),
				array(
					'name'        => 'accounts/999/locations/refresh-me/media/film-1',
					'mediaFormat' => 'VIDEO',
					'googleUrl'   => 'https://lh3.googleusercontent.com/film-1',
				),
			);

			return $fhint_answer( array( 'mediaItems' => $fhint_google['fewer'] ? array_slice( $items, 0, 1 ) : $items ) );
		}

		if ( false !== strpos( $url, 'v1/attributes?' ) ) {
			return $fhint_answer(
				array(
					'attributeMetadata' => array(
						array(
							'parent'           => 'attributes/has_delivery',
							'valueType'        => 'BOOL',
							'displayName'      => 'Delivery',
							'groupDisplayName' => 'Service options',
							'valueMetadata'    => array(
								array(
									'value'       => true,
									'displayName' => 'Delivery',
								),
								array(
									'value'       => false,
									'displayName' => 'No delivery',
								),
							),
						),
						array(
							'parent'           => 'attributes/is_owned_by_women',
							'valueType'        => 'BOOL',
							'displayName'      => 'Identifies as women-owned',
							'groupDisplayName' => 'From the business',
							'valueMetadata'    => array(
								array(
									'value'       => true,
									'displayName' => 'Identifies as women-owned',
								),
							),
						),
						array(
							'parent'           => 'attributes/wi_fi',
							'valueType'        => 'ENUM',
							'displayName'      => 'Wi-Fi',
							'groupDisplayName' => 'Amenities',
							'valueMetadata'    => array(
								array(
									'value'       => 'free_wi_fi',
									'displayName' => 'Free',
								),
							),
						),
						array(
							'parent'      => 'attributes/url_facebook',
							'valueType'   => 'URL',
							'displayName' => 'Facebook',
						),
						array(
							'parent'      => 'attributes/url_whatsapp',
							'valueType'   => 'URL',
							'displayName' => 'WhatsApp',
						),
						array(
							'parent'      => 'attributes/url_text_messaging',
							'valueType'   => 'URL',
							'displayName' => 'Texting number',
						),
					),
				)
			);
		}

		if ( false !== strpos( $url, 'refresh-me/attributes' ) ) {
			$values = array(
				array(
					'name'      => 'attributes/has_delivery',
					'valueType' => 'BOOL',
					'values'    => array( true ),
				),
				array(
					'name'      => 'attributes/url_facebook',
					'valueType' => 'URL',
					'uriValues' => array( array( 'uri' => 'https://facebook.com/harbour-from-google' ) ),
				),
				array(
					'name'      => 'attributes/url_whatsapp',
					'valueType' => 'URL',
					'uriValues' => array( array( 'uri' => 'https://wa.me/8801700000009' ) ),
				),
				array(
					'name'      => 'attributes/url_text_messaging',
					'valueType' => 'URL',
					'uriValues' => array( array( 'uri' => 'sms:+8801700000008' ) ),
				),
				array(
					'name'      => 'attributes/wi_fi',
					'valueType' => 'ENUM',
					'values'    => array( 'free_wi_fi' ),
				),
			);

			return $fhint_answer( array( 'attributes' => $fhint_google['fewer'] ? array_slice( $values, 0, 1 ) : $values ) );
		}

		return $fhint_answer(
			array(
				'name'       => 'locations/refresh-me',
				'title'      => 'Harbour Pets',
				'metadata'   => array( 'mapsUri' => 'https://maps.google.com/maps?cid=777000111' ),
				'serviceArea'  => array(
					'businessType' => 'CUSTOMER_AND_BUSINESS_LOCATION',
					'places'       => array(
						'placeInfos' => array(
							array(
								'placeName' => 'Mirpur, Dhaka',
								'placeId'   => 'ChIJ-mirpur',
							),
							array(
								'placeName' => 'Pallabi, Dhaka',
								'placeId'   => 'ChIJ-pallabi',
							),
						),
					),
				),
				'phoneNumbers' => array(
					'primaryPhone'     => '01700-000001',
					'additionalPhones' => array( '01700-000002', '01700-000003' ),
				),
				'openInfo'   => array(
					'status'      => 'OPEN',
					'openingDate' => array(
						'year'  => 2014,
						'month' => 3,
						'day'   => 15,
					),
				),
				'categories' => array(
					'primaryCategory'      => array(
						'name'        => 'categories/gcid:pet_store',
						'displayName' => 'Pet store',
					),
					'additionalCategories' => array(
						array(
							'name'         => 'categories/gcid:pet_groomer',
							'displayName'  => 'Pet groomer',
							'serviceTypes' => array(
								array(
									'serviceTypeId' => 'job_type_id:cat_bathing',
									'displayName'   => 'Cat bathing',
								),
								array(
									'serviceTypeId' => 'job_type_id:dog_grooming',
									'displayName'   => 'Dog grooming',
								),
							),
						),
					),
				),
			)
		);
	};

	// After both stand-ins above, which answer everything they are handed.
	add_filter( 'pre_http_request', $fhint_fake_listing, 12, 3 );

	$fhint_branch_post = static function ( $path, array $params = array(), array $files = array(), $method = 'POST' ) use ( $fhint_branch ) {
		$request = new WP_REST_Request( $method, '/fhint/v1' . $path );
		$request->set_body_params( array_merge( array( 'location_id' => (int) $fhint_branch['id'] ), $params ) );

		if ( $files ) {
			$request->set_file_params( $files );
		}

		return rest_do_request( $request );
	};

	// Emptied, so the refresh below has a name and description to fill in.
	LocationRepository::update(
		(int) $fhint_branch['id'],
		array(
			'business_name' => '',
			'description'   => '',
		)
	);

	// The branch was given a category of its own above. A refresh fills in
	// categories only where there are none, so this one must survive it.
	$fhint_response = $fhint_branch_post( '/profile/google/refresh' );
	$fhint_read     = $fhint_response->get_data();

	check_same( 200, $fhint_response->get_status(), 'POST /profile/google/refresh answers' );
	check_same(
		array(
			'categories'    => false,
			'details'       => true,
			'opening_date'  => true,
			'additional_phones' => true,
			'service_area'  => true,
			'social'        => false,
			'booking'       => true,
			'service_types' => 2,
			'attributes'    => 6,
			'answers'    => 2,
			'photos'     => 2,
			'failed'     => array(),
		),
		$fhint_read['meta']['refresh'],
		'and says what arrived: the attributes offered, the answers held, the photos'
	);
	check_same( 'gcid:pet_store', $fhint_read['data']['info']['primary_category_id'], 'a location that has a category keeps it through a refresh' );
	check_same( 'Harbour Pets', LocationRepository::find( (int) $fhint_branch['id'] )['business_name'], 'a branch with no name of its own is given its listing\'s' );
	check_same( '2014-03-01', LocationRepository::find( (int) $fhint_branch['id'] )['opening_date'], "a branch with no opening date is given its listing's, to the month" );
	check_same( '2014-03', $fhint_read['data']['info']['opening_date'], 'and the Info section shows it as a month' );
	check_same( array( '01700-000002', '01700-000003' ), LocationRepository::find( (int) $fhint_branch['id'] )['additional_phones'], "a branch with no extra numbers is given its listing's" );
	check_same( array( '01700-000002', '01700-000003' ), $fhint_read['data']['info']['additional_phones'], 'and the Info section lists them' );
	check_same(
		array(
			array( 'name' => 'Mirpur, Dhaka', 'place_id' => 'ChIJ-mirpur' ),
			array( 'name' => 'Pallabi, Dhaka', 'place_id' => 'ChIJ-pallabi' ),
		),
		$fhint_read['data']['address']['service_area'],
		"a location with no service area is given its listing's, with Google's place ids"
	);
	check_same( 20, $fhint_read['data']['address']['service_area_max'], 'and told the most it may have' );

	// The branch is mapped, so its address is Google's — but its service
	// area is still the owner's to edit.
	$fhint_area_save = static function ( array $fields ) use ( $fhint_branch_post ) {
		return $fhint_branch_post(
			'/profile',
			array(
				'section' => 'address',
				'fields'  => $fields,
			),
			array(),
			'PATCH'
		);
	};

	$fhint_saved = $fhint_area_save(
		array(
			'service_area' => array(
				array( 'name' => 'Mirpur, Dhaka', 'place_id' => 'ChIJ-mirpur' ),
				'Uttara, Dhaka',
			),
		)
	);

	check_same( 200, $fhint_saved->get_status(), 'a mapped location saves its service area though its address is locked' );
	check_same(
		array(
			array( 'name' => 'Mirpur, Dhaka', 'place_id' => 'ChIJ-mirpur' ),
			array( 'name' => 'Uttara, Dhaka', 'place_id' => '' ),
		),
		LocationRepository::find( (int) $fhint_branch['id'] )['service_area'],
		"a removed place goes, a typed one is kept without a place id"
	);
	check_same( 409, $fhint_area_save( array( 'city' => 'Elsewhere' ) )->get_status(), 'while the address itself stays locked' );
	check_same(
		array( 'service_area' => array( 'service_area.too_many' ) ),
		$fhint_area_save( array( 'service_area' => array_map( static function ( $i ) { return 'Area ' . $i; }, range( 1, 21 ) ) ) )->get_data()['data']['fields'],
		'a 21st place is refused'
	);

	$fhint_kept_area = $fhint_branch_post( '/profile/google/refresh' )->get_data();
	check_same( false, $fhint_kept_area['meta']['refresh']['service_area'], 'a refresh leaves an area edited here alone' );
	check_same( 2, count( LocationRepository::find( (int) $fhint_branch['id'] )['service_area'] ), 'with both its places' );

	$fhint_branch_node = null;

	foreach ( FHINT\App\Schema\Graph::build_site()['@graph'] as $fhint_graph_node ) {
		if ( isset( $fhint_graph_node['@id'] ) && FHINT\App\Schema\Graph::location_business_id( (int) $fhint_branch['id'] ) === $fhint_graph_node['@id'] ) {
			$fhint_branch_node = $fhint_graph_node;
		}
	}

	check_same(
		array(
			array( '@type' => 'Place', 'name' => 'Mirpur, Dhaka' ),
			array( '@type' => 'Place', 'name' => 'Uttara, Dhaka' ),
		),
		$fhint_branch_node && isset( $fhint_branch_node['areaServed'] ) ? $fhint_branch_node['areaServed'] : null,
		"the website's markup names every place, the typed one too"
	);
	check_same(
		array(
			'appointment'    => '',
			'text_messaging' => '+8801700000008',
			'whatsapp'       => 'https://wa.me/8801700000009',
		),
		$fhint_read['data']['social']['booking_links'],
		"a branch with no booking links is given its listing's, the texting number without its sms: prefix"
	);
	check_same(
		array(
			'appointment'    => false,
			'text_messaging' => true,
			'whatsapp'       => true,
		),
		$fhint_read['data']['social']['booking_offered'],
		"and the Social section says which of them Google offers this listing"
	);

	// A refresh leaves a set the branch already has alone.
	LocationRepository::update( (int) $fhint_branch['id'], array( 'booking_links' => array( 'whatsapp' => 'https://wa.me/111111111' ) ) );
	$fhint_kept_links = $fhint_branch_post( '/profile/google/refresh' )->get_data();

	check_same( false, $fhint_kept_links['meta']['refresh']['booking'], 'a refresh fills no booking links when the branch has its own' );
	check_same( 'https://wa.me/111111111', LocationRepository::find( (int) $fhint_branch['id'] )['booking_links']['whatsapp'], 'and its own link is kept' );

	// Real WordPress escaping: esc_url_raw() would make "not a link" into an
	// address that looks valid. It must reach validation as typed.
	check_same( 'not a link', FHINT\App\Business\BookingLinks::sanitize( array( 'appointment' => 'not a link' ) )['appointment'], 'text that is not a link is not turned into one' );

	$fhint_business_booking = BusinessRepository::get()['booking_links'];

	// Saved on the branch: its own set; refused values name their field.
	$fhint_saved = $fhint_branch_post(
		'/profile',
		array(
			'section' => 'social',
			'fields'  => array(
				'booking_links' => array(
					'appointment'    => '',
					'text_messaging' => '+880 1700-000007',
					'whatsapp'       => 'https://wa.me/8801700000007',
				),
			),
		),
		array(),
		'PATCH'
	);

	check_same( 200, $fhint_saved->get_status(), 'a branch saves booking links of its own, through the Social section' );
	check_same( $fhint_business_booking, BusinessRepository::get()['booking_links'], "and the business's are untouched" );
	check_same( '+8801700000007', LocationRepository::find( (int) $fhint_branch['id'] )['booking_links']['text_messaging'], 'the texting number kept as + and digits' );
	check_same( $fhint_business_booking, BusinessRepository::get()['booking_links'], "and the business's links are untouched" );

	$fhint_saved = $fhint_branch_post(
		'/profile',
		array(
			'section' => 'social',
			'fields'  => array(
				'booking_links' => array(
					'appointment'    => 'not a link',
					'text_messaging' => '01700000007',
					'whatsapp'       => 'https://example.com/chat',
				),
			),
		),
		array(),
		'PATCH'
	);

	check_same( 400, $fhint_saved->get_status(), 'bad booking links are refused' );
	check_same(
		array(
			'booking_links.appointment'    => array( 'booking.appointment.invalid' ),
			'booking_links.text_messaging' => array( 'booking.text_messaging.invalid' ),
			'booking_links.whatsapp'       => array( 'booking.whatsapp.invalid' ),
		),
		$fhint_saved->get_data()['data']['fields'],
		'each on its own field: not a link, no country code, not WhatsApp'
	);
	check_same( '+8801700000007', LocationRepository::find( (int) $fhint_branch['id'] )['booking_links']['text_messaging'], 'leaving the saved links alone' );

	// One card, one save: a good social link sent with a bad booking link
	// is not saved either.
	$fhint_social_before = LocationRepository::find( (int) $fhint_branch['id'] )['social_profiles'];
	$fhint_saved         = $fhint_branch_post(
		'/profile',
		array(
			'section' => 'social',
			'fields'  => array(
				'social_profiles' => array( 'facebook' => 'https://facebook.com/saved-with-a-bad-booking-link' ),
				'booking_links'   => array( 'whatsapp' => 'https://example.com/chat' ),
			),
		),
		array(),
		'PATCH'
	);

	check_same( 400, $fhint_saved->get_status(), 'a bad booking link refuses the whole card' );
	check_same( $fhint_social_before, LocationRepository::find( (int) $fhint_branch['id'] )['social_profiles'], 'so the social link sent with it is not saved either' );

	LocationRepository::update( (int) $fhint_branch['id'], array( 'additional_phones' => array() ) );
	$fhint_kept_phones = $fhint_branch_post( '/profile/google/refresh' )->get_data();

	check_same( false, $fhint_kept_phones['meta']['refresh']['additional_phones'], 'a branch that removed its extra numbers is not given them back' );
	check_same( array(), LocationRepository::find( (int) $fhint_branch['id'] )['additional_phones'], 'its empty list is kept' );

	LocationRepository::update( (int) $fhint_branch['id'], array( 'opening_date' => '2019-06-01' ) );
	$fhint_kept_date = $fhint_branch_post( '/profile/google/refresh' )->get_data();

	check_same( false, $fhint_kept_date['meta']['refresh']['opening_date'], 'a refresh reports nothing filled when the date is set here' );
	check_same( '2019-06-01', LocationRepository::find( (int) $fhint_branch['id'] )['opening_date'], 'and the owner\'s date is kept' );

	// Saved on a branch, the date is the branch's own and the business's is
	// left alone; cleared, the branch shows the business's again.
	$fhint_business_date = BusinessRepository::get()['founding_date'];

	BusinessRepository::save( array( 'founding_date' => '2001-05-01' ) );

	$fhint_saved = $fhint_branch_post(
		'/profile',
		array(
			'section' => 'info',
			'fields'  => array( 'opening_date' => '2020-09' ),
		),
		array(),
		'PATCH'
	)->get_data();

	check_same( '2020-09', $fhint_saved['data']['opening_date'], 'a branch saves an opening date of its own' );
	check_same( '2020-09-01', LocationRepository::find( (int) $fhint_branch['id'] )['opening_date'], 'on the branch' );
	check_same( '2001-05-01', BusinessRepository::get()['founding_date'], "and the business's is untouched" );

	$fhint_saved = $fhint_branch_post(
		'/profile',
		array(
			'section' => 'info',
			'fields'  => array( 'opening_date' => '' ),
		),
		array(),
		'PATCH'
	)->get_data();

	check_same( '', LocationRepository::find( (int) $fhint_branch['id'] )['opening_date'], "cleared, the branch keeps none of its own" );
	check_same( '2001-05', $fhint_saved['data']['opening_date'], "and shows the business's" );

	BusinessRepository::save( array( 'founding_date' => $fhint_business_date ) );

	// Extra numbers on a branch are its own list; NULL shows the business's.
	$fhint_business_phones = BusinessRepository::get()['additional_phones'];

	BusinessRepository::save( array( 'additional_phones' => array( '01800-111111' ) ) );
	LocationRepository::update( (int) $fhint_branch['id'], array( 'additional_phones' => null ) );

	$fhint_shown = rest_do_request(
		( static function () use ( $fhint_branch ) {
			$request = new WP_REST_Request( 'GET', '/fhint/v1/profile' );
			$request->set_param( 'location_id', (int) $fhint_branch['id'] );

			return $request;
		} )()
	)->get_data();

	check_same( array( '01800-111111' ), $fhint_shown['data']['info']['additional_phones'], "a branch with no list of its own shows the business's numbers" );

	$fhint_saved = $fhint_branch_post(
		'/profile',
		array(
			'section' => 'info',
			'fields'  => array( 'additional_phones' => array( '01900-222222', ' ', '01900 222222' ) ),
		),
		array(),
		'PATCH'
	)->get_data();

	check_same( array( '01900-222222' ), $fhint_saved['data']['additional_phones'], 'a branch saves its own, blanks and repeats dropped' );
	check_same( array( '01800-111111' ), BusinessRepository::get()['additional_phones'], "and the business's are untouched" );

	BusinessRepository::save( array( 'additional_phones' => $fhint_business_phones ) );

	LocationRepository::update( (int) $fhint_branch['id'], array( 'social_profiles' => null ) );

	$fhint_filled_social = $fhint_branch_post( '/profile/google/refresh' )->get_data();

	check_same(
		array( true, 'https://facebook.com/harbour-from-google' ),
		array( $fhint_filled_social['meta']['refresh']['social'], $fhint_filled_social['data']['social']['social_profiles']['facebook'] ),
		'a branch with no links of its own is given its listing\'s'
	);

	LocationRepository::update( (int) $fhint_branch['id'], array( 'business_name' => 'Named Here' ) );
	$fhint_branch_post( '/profile/google/refresh' );

	check_same( 'Named Here', LocationRepository::find( (int) $fhint_branch['id'] )['business_name'], 'and one that has a name keeps it' );
	check_same(
		array(
			array(
				'id'       => 'job_type_id:cat_bathing',
				'label'    => 'Cat bathing',
				'category' => 'Pet groomer',
			),
			array(
				'id'       => 'job_type_id:dog_grooming',
				'label'    => 'Dog grooming',
				'category' => 'Pet groomer',
			),
		),
		$fhint_read['data']['services']['google_types'],
		'the Services section offers the ready-made services Google has for the listing\'s categories'
	);
	check_same( array(), $fhint_profile_at( (int) $fhint_place['id'] )->get_data()['data']['services']['google_types'], 'and a location with no listing is offered none' );
	check_same( array( 'has_delivery', 'is_owned_by_women', 'wi_fi' ), array_column( $fhint_read['data']['attributes']['definitions'], 'id' ), 'the Attributes section now offers what Google offers this listing, links left out' );
	check_same( array( true, false, false ), array_column( $fhint_read['data']['attributes']['definitions'], 'allows_false' ), 'and knows which yes/no attributes can be answered "no"' );

	$fhint_stored_answers = array();

	foreach ( $fhint_read['data']['attributes']['values'] as $fhint_value ) {
		$fhint_stored_answers[ $fhint_value['attribute_id'] ] = $fhint_value;
	}

	check_same( array( 'has_delivery', 'wi_fi' ), array_keys( $fhint_stored_answers ), 'the answers Google holds are stored' );
	check( false === $fhint_stored_answers['has_delivery']['is_dirty'], 'as copies, not as edits waiting to be sent' );
	check_same( 'https://lh3.googleusercontent.com/cover-1', $fhint_read['data']['media']['cover']['url'], 'the cover photo is the listing\'s' );
	check_same( array( 'https://lh3.googleusercontent.com/shop-1' ), array_column( $fhint_read['data']['media']['gallery'], 'url' ), 'the gallery holds its photos, and no video' );
	check_same( '777000111', $fhint_read['data']['info']['cid'], 'and the listing\'s Maps id is known' );
	check( ! empty( $fhint_read['meta']['google']['refreshed_at'] ), 'with a record of when Google was last read' );
	check_same( array(), array_values( array_filter( array_column( $fhint_google['calls'], 'method' ), static function ( $method ) { return 'GET' !== $method; } ) ), 'reading changes nothing on Google' );

	// An answer changed here is newer than Google's and survives a re-read;
	// a copy of something Google no longer holds does not.
	$fhint_request = new WP_REST_Request( 'PATCH', '/fhint/v1/profile' );
	$fhint_request->set_header( 'content-type', 'application/json' );
	$fhint_request->set_body(
		wp_json_encode(
			array(
				'section'     => 'attributes',
				'location_id' => (int) $fhint_branch['id'],
				'fields'      => array( 'values' => array( 'has_delivery' => false ) ),
			)
		)
	);
	rest_do_request( $fhint_request );

	$fhint_google['fewer'] = true;
	$fhint_read            = $fhint_branch_post( '/profile/google/refresh' )->get_data();
	$fhint_google['fewer'] = false;

	check_same(
		array(
			array(
				'attribute_id' => 'has_delivery',
				'value'        => false,
				'is_dirty'     => true,
			),
		),
		array_map(
			static function ( $value ) {
				return array(
					'attribute_id' => $value['attribute_id'],
					'value'        => $value['value'],
					'is_dirty'     => $value['is_dirty'],
				);
			},
			$fhint_read['data']['attributes']['values']
		),
		'a re-read keeps an answer edited here and forgets one Google no longer holds'
	);
	check_same( array(), $fhint_read['data']['media']['gallery'], 'and a photo no longer on the listing is forgotten too' );

	// Categories are the business's: a branch's listing does not set them,
	// the main location's does.
	$fhint_categories_before = BusinessRepository::get();

	// A location with no category of its own is given the listing's by a
	// refresh — and one that has a category is not given a different one.
	LocationRepository::update(
		(int) $fhint_branch['id'],
		array(
			'primary_category'     => 'Dentist',
			'primary_category_id'  => 'gcid:dentist',
			'secondary_categories' => array(),
		)
	);

	$fhint_kept = $fhint_branch_post( '/profile/google/refresh' )->get_data();

	check_same( array( false, 'gcid:dentist' ), array( $fhint_kept['meta']['refresh']['categories'], $fhint_kept['data']['info']['primary_category_id'] ), 'a refresh does not replace a category chosen here with Google\'s' );

	LocationRepository::update(
		(int) $fhint_branch['id'],
		array(
			'primary_category'     => '',
			'primary_category_id'  => '',
			'secondary_categories' => array(),
		)
	);

	$fhint_filled = $fhint_branch_post( '/profile/google/refresh' )->get_data();

	check_same(
		array( true, 'gcid:pet_store', 'Pet store', array( 'gcid:pet_groomer' ) ),
		array(
			$fhint_filled['meta']['refresh']['categories'],
			$fhint_filled['data']['info']['primary_category_id'],
			$fhint_filled['data']['info']['primary_category'],
			array_column( $fhint_filled['data']['info']['secondary_categories'], 'id' ),
		),
		'but a location with none is given the ones its listing has on Google'
	);
	check_same( $fhint_categories_before['primary_category_id'], BusinessRepository::get()['primary_category_id'], 'without touching the business\'s' );

	// Emptied first, so what the branch ends up with can only have come
	// from the import.
	LocationRepository::update(
		(int) $fhint_branch['id'],
		array(
			'primary_category'     => '',
			'primary_category_id'  => '',
			'secondary_categories' => array(),
		)
	);

	Import::apply( array( 'categories' ), 'locations/refresh-me' );

	check_same( $fhint_categories_before['primary_category_id'], BusinessRepository::get()['primary_category_id'], 'importing categories from a branch leaves the business\'s categories alone' );
	check_same(
		array( 'gcid:pet_store', array( 'gcid:pet_groomer' ) ),
		array(
			LocationRepository::find( (int) $fhint_branch['id'] )['primary_category_id'],
			array_column( LocationRepository::find( (int) $fhint_branch['id'] )['secondary_categories'], 'id' ),
		),
		'and gives them to the branch itself'
	);

	$fhint_main_listing = GoogleLocationRepository::find_by_fhint_location( (int) $fhint_place['id'] );

	GoogleLocationRepository::map( 'locations/refresh-me', (int) $fhint_place['id'] );

	$fhint_imported = Import::apply( array( 'categories' ), 'locations/refresh-me' );

	check( ! is_wp_error( $fhint_imported ) && in_array( 'categories', $fhint_imported['applied'], true ), 'categories can be imported from the main location\'s listing' );
	check_same( array( 'gcid:pet_store', 'Pet store' ), array( BusinessRepository::get()['primary_category_id'], BusinessRepository::get()['primary_category'] ), 'the main category arrives with Google\'s id' );
	check_same(
		array(
			array(
				'id'   => 'gcid:pet_groomer',
				'name' => 'Pet groomer',
			),
		),
		BusinessRepository::get()['secondary_categories'],
		'and so do the extra ones'
	);

	BusinessRepository::save(
		array(
			'primary_category'     => $fhint_categories_before['primary_category'],
			'primary_category_id'  => $fhint_categories_before['primary_category_id'],
			'secondary_categories' => $fhint_categories_before['secondary_categories'],
		)
	);
	GoogleLocationRepository::map( 'locations/refresh-me', (int) $fhint_branch['id'] );

	if ( $fhint_main_listing ) {
		GoogleLocationRepository::map( $fhint_main_listing['location_name'], (int) $fhint_place['id'] );
	}

	// A photo: chosen first, sent only when asked.
	$fhint_make_image = static function ( $side, $format = 'jpeg' ) {
		$image = imagecreatetruecolor( $side, $side );

		// Noise, so the file is a realistic size and not a few hundred bytes.
		for ( $x = 0; $x < $side; $x += 2 ) {
			for ( $y = 0; $y < $side; $y += 2 ) {
				imagesetpixel( $image, $x, $y, imagecolorallocate( $image, ( $x * 7 ) % 255, ( $y * 13 ) % 255, ( $x * $y ) % 255 ) );
			}
		}

		$path = wp_tempnam( 'fhint-photo' );

		if ( 'gif' === $format ) {
			imagegif( $image, $path );
		} else {
			imagejpeg( $image, $path, 95 );
		}

		return $path;
	};

	$fhint_file = static function ( $path, $name ) {
		return array(
			'file' => array(
				'name'     => $name,
				'tmp_name' => $path,
				'error'    => 0,
				'size'     => filesize( $path ),
			),
		);
	};

	$fhint_google['calls'] = array();
	$fhint_photo_path      = $fhint_make_image( 400 );
	$fhint_photo_bytes     = filesize( $fhint_photo_path );
	$fhint_response        = $fhint_branch_post( '/profile/media', array( 'role' => 'gallery' ), $fhint_file( $fhint_photo_path, 'shopfront.jpg' ) );
	$fhint_pending         = $fhint_response->get_data()['data']['media']['pending'];

	check_same( 200, $fhint_response->get_status(), 'POST /profile/media keeps a chosen photo' );
	check_same( array( 'pending' ), array_column( $fhint_pending, 'state' ), 'as one waiting to be sent' );
	check( $fhint_pending[0]['attachment_id'] > 0 && false !== get_attached_file( $fhint_pending[0]['attachment_id'] ), 'with its file in the media library' );
	check_same( array(), $fhint_google['calls'], 'and choosing it sends nothing to Google' );

	$fhint_response = $fhint_branch_post( '/profile/media', array(), $fhint_file( $fhint_make_image( 400, 'gif' ), 'animated.gif' ) );

	check_same( 400, $fhint_response->get_status(), 'a file that is not a JPEG or PNG is refused' );
	check_same( array( 'media.type.unsupported' ), $fhint_response->get_data()['data']['fields']['file'], 'with the reason against the file' );

	$fhint_response = $fhint_branch_post( '/profile/media', array(), $fhint_file( $fhint_make_image( 120 ), 'tiny.jpg' ) );

	check_same( 400, $fhint_response->get_status(), 'and so is one too small for Google' );
	check_same( 1, count( $fhint_branch_post( '/profile/google/refresh' )->get_data()['data']['media']['pending'] ), 'a refused file is not kept, and a re-read of Google leaves the waiting photo alone' );

	// Asking for another location's photo is asking for one that is not there.
	$fhint_request = new WP_REST_Request( 'DELETE', '/fhint/v1/profile/media/' . $fhint_pending[0]['id'] );
	$fhint_request->set_body_params( array( 'location_id' => (int) $fhint_place['id'] ) );

	check_same( 404, rest_do_request( $fhint_request )->get_status(), 'a photo cannot be reached through a location it does not belong to' );
	check_same( 'pending', FHINT\App\Media\MediaRepository::find( $fhint_pending[0]['id'] )['state'], 'and it is left waiting' );

	// Google refuses it: the photo stays here, with the reason.
	$fhint_google['calls']         = array();
	$fhint_google['refuse_create'] = true;
	$fhint_response                = $fhint_branch_post( '/profile/media/' . $fhint_pending[0]['id'] . '/publish' );
	$fhint_google['refuse_create'] = false;
	$fhint_failed                  = FHINT\App\Media\MediaRepository::find( $fhint_pending[0]['id'] );

	check_same( 502, $fhint_response->get_status(), 'a photo Google refuses is reported as refused' );
	check_same( array( 'failed', 'Photo is too blurry.' ), array( $fhint_failed['state'], $fhint_failed['error'] ), 'and is kept, marked failed, with what Google said' );

	// And accepts it.
	$fhint_google['calls'] = array();
	$fhint_response        = $fhint_branch_post( '/profile/media/' . $fhint_pending[0]['id'] . '/publish' );
	$fhint_sent            = FHINT\App\Media\MediaRepository::find( $fhint_pending[0]['id'] );
	$fhint_posts           = array_values(
		array_filter(
			$fhint_google['calls'],
			static function ( $call ) {
				return 'POST' === $call['method'];
			}
		)
	);

	check_same( 200, $fhint_response->get_status(), 'POST /profile/media/{id}/publish sends a waiting photo' );
	check_same( 3, count( $fhint_posts ), 'in three requests' );
	check( false !== strpos( $fhint_posts[0]['url'], 'accounts/999/locations/refresh-me/media:startUpload' ), 'first asking the listing for somewhere to put it' );
	check_same( '{}', (string) $fhint_posts[0]['body'], 'with an empty object for a body, which is the only empty body Google accepts' );
	check( false !== strpos( $fhint_posts[1]['url'], '/upload/v1/media/upload-ref-1' ) && false !== strpos( $fhint_posts[1]['url'], 'upload_type=media' ), 'then sending the bytes there' );
	check_same( array( $fhint_photo_bytes, 'image/jpeg' ), array( strlen( (string) $fhint_posts[1]['body'] ), $fhint_posts[1]['type'] ), 'the whole file, as the kind of image it is' );
	check_same(
		array(
			'mediaFormat'         => 'PHOTO',
			'locationAssociation' => array( 'category' => 'ADDITIONAL' ),
			'dataRef'             => array( 'resourceName' => 'upload-ref-1' ),
		),
		json_decode( (string) $fhint_posts[2]['body'], true ),
		'and last making those bytes a gallery photo on the listing'
	);
	check_same( array( 'synced', 'accounts/999/locations/refresh-me/media/sent-1', '' ), array( $fhint_sent['state'], $fhint_sent['google_name'], $fhint_sent['error'] ), 'the photo is then recorded as on Google, under Google\'s name for it' );
	check_same( 409, $fhint_branch_post( '/profile/media/' . $fhint_pending[0]['id'] . '/publish' )->get_status(), 'and cannot be sent twice' );
	check_same( 409, $fhint_branch_post( '/profile/media/' . $fhint_pending[0]['id'], array(), array(), 'DELETE' )->get_status(), 'nor removed from here, being Google\'s now' );

	// One still waiting can be taken back, file and all.
	$fhint_waiting    = $fhint_branch_post( '/profile/media', array( 'role' => 'logo' ), $fhint_file( $fhint_make_image( 400 ), 'logo.jpg' ) )->get_data()['data']['media']['pending'];
	$fhint_attachment = $fhint_waiting[0]['attachment_id'];

	check_same( array( 'logo' ), array_column( $fhint_waiting, 'role' ), 'a photo can be chosen as the logo' );

	$fhint_replaced = $fhint_branch_post( '/profile/media', array( 'role' => 'logo' ), $fhint_file( $fhint_make_image( 420 ), 'logo-2.jpg' ) )->get_data()['data']['media']['pending'];

	check_same( 1, count( $fhint_replaced ), 'choosing another logo replaces the one that was waiting' );
	check( null === get_post( $fhint_attachment ), 'and discards its file' );
	check_same( 200, $fhint_branch_post( '/profile/media/' . $fhint_replaced[0]['id'], array(), array(), 'DELETE' )->get_status(), 'DELETE /profile/media/{id} removes a waiting photo' );
	check( null === FHINT\App\Media\MediaRepository::find( $fhint_replaced[0]['id'] ) && null === get_post( $fhint_replaced[0]['attachment_id'] ), 'together with the file kept for it' );

	wp_set_current_user( 0 );
	check_same( 401, $fhint_branch_post( '/profile/google/refresh' )->get_status(), 'a logged-out request cannot read Google' );
	check_same( 401, $fhint_branch_post( '/profile/media/' . $fhint_pending[0]['id'] . '/publish' )->get_status(), 'or send a photo' );
	wp_set_current_user( $admins[0]->ID );

	// Leave nothing behind: the file, the listing, and what was read for it.
	if ( $fhint_sent['attachment_id'] ) {
		wp_delete_attachment( $fhint_sent['attachment_id'], true );
	}

	// A listing on the account with no location here yet: the switcher
	// offers it, and choosing it gives it a location of its own.
	GoogleLocationRepository::upsert(
		array(
			'account_name'       => 'accounts/999',
			'location_name'      => 'locations/refresh-me-too',
			'store_code'         => '',
			'title'              => 'Harbour Pets, North',
			'address'            => '9 North Road, Chittagong',
			'phone'              => '',
			'website'            => '',
			'verification_state' => 'VERIFIED',
			'payload'            => array(),
		)
	);

	$fhint_listings = array_column(
		$fhint_profile_at( null )->get_data()['meta']['listings'],
		'location_id',
		'location_name'
	);

	check( isset( $fhint_listings['locations/refresh-me-too'] ) && 0 === $fhint_listings['locations/refresh-me-too'], 'GET /profile lists every listing on the account, including one with no location here' );
	check_same( (int) $fhint_branch['id'], $fhint_listings['locations/refresh-me'], 'and says which location an imported one belongs to' );

	$fhint_business_before = BusinessRepository::get();
	$fhint_locations_before = LocationRepository::count();

	$fhint_open = static function ( $location_name ) {
		$request = new WP_REST_Request( 'POST', '/fhint/v1/profile/listing' );
		$request->set_body_params( array( 'location_name' => $location_name ) );

		return rest_do_request( $request );
	};

	$fhint_response = $fhint_open( 'locations/refresh-me-too' );
	$fhint_opened   = $fhint_response->get_data()['data'];
	$fhint_new      = LocationRepository::find( (int) $fhint_opened['location_id'] );

	check_same( 200, $fhint_response->get_status(), 'POST /profile/listing opens a listing with no location' );
	check( true === $fhint_opened['created'] && null !== $fhint_new, 'by creating one for it' );
	check_same( $fhint_locations_before + 1, LocationRepository::count(), 'a new location, not one that already existed' );
	check_same( array( 'Harbour Pets, North', false ), array( $fhint_new['name'], (bool) $fhint_new['is_primary'] ), 'named after the listing, and not the main location' );
	check_same( (int) $fhint_new['id'], GoogleLocationRepository::find_by_location_name( 'locations/refresh-me-too' )['fhint_location_id'], 'and linked to the listing' );
	check_same( 'gcid:pet_store', $fhint_new['primary_category_id'], 'with the listing\'s own details brought across' );
	check_same( 'Harbour Pets', $fhint_new['business_name'], 'its name among them, kept on the location' );
	check_same(
		array( $fhint_business_before['name'], $fhint_business_before['description'], $fhint_business_before['primary_category_id'] ),
		array( BusinessRepository::get()['name'], BusinessRepository::get()['description'], BusinessRepository::get()['primary_category_id'] ),
		'while the business\'s name, description and categories are left alone'
	);

	$fhint_again = $fhint_open( 'locations/refresh-me-too' )->get_data()['data'];

	check_same( array( (int) $fhint_new['id'], false ), array( $fhint_again['location_id'], $fhint_again['created'] ), 'opening it again goes to the same location' );
	check_same( $fhint_locations_before + 1, LocationRepository::count(), 'without making another' );
	check_same( 404, $fhint_open( 'locations/not-on-this-account' )->get_status(), 'a listing this site has not read is a 404' );

	LocationRepository::delete( (int) $fhint_new['id'] );
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
	$wpdb->delete( fhint_table( 'google_locations' ), array( 'location_name' => 'locations/refresh-me-too' ) );

	remove_filter( 'pre_http_request', $fhint_fake_listing, 12 );
	FHINT\App\Google\ReferenceRepository::replace( 'attribute', 'locations/refresh-me', array() );
	FHINT\App\Google\ReferenceRepository::replace( 'service_type', 'locations/refresh-me', array() );
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
	$wpdb->delete( fhint_table( 'google_locations' ), array( 'location_name' => 'locations/refresh-me' ) );

	$fhint_branch_list = ServiceRepository::count( (int) $fhint_branch['id'] );

	LocationRepository::delete( (int) $fhint_branch['id'] );

	check( $fhint_branch_list > 0 && 0 === ServiceRepository::count( (int) $fhint_branch['id'] ), 'deleting a location deletes its own services with it' );

	// Put things back as this block found them: the checks further down
	// count locations and services from zero.
	foreach ( ServiceRepository::all() as $fhint_leftover ) {
		ServiceRepository::delete( (int) $fhint_leftover['id'] );
	}

	LocationRepository::delete( (int) $fhint_place['id'] );

	wp_set_current_user( 0 );

	check_same( 401, rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/profile' ) )->get_status(), 'the profile refuses a logged-out read' );
	check_same( 401, $fhint_profile_save( 'info', array( 'name' => 'Intruder' ) )->get_status(), 'and a logged-out save' );

	wp_set_current_user( $admins[0]->ID );


	// Validation is enforced server-side regardless of what a client sent.
	$invalid = new WP_REST_Request( 'POST', '/fhint/v1/business' );
	$invalid->set_body_params( array( 'name' => '', 'email' => 'not-an-email' ) );

	$response = rest_do_request( $invalid );

	check_same( 400, $response->get_status(), 'an invalid write is refused with a 400' );

	$schema = rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/schema' ) );
	check_same( 200, $schema->get_status(), '/schema answers' );

	// -- The dashboard reads stored figures and never measures -------------

	// Push the first run 40 days back and give it a known score, so the
	// trend is deterministic rather than depending on two same-second runs.
	$wpdb->update(
		Tables::name( Tables::AUDITS ),
		array(
			'score'        => 40,
			'completed_at' => gmdate( 'Y-m-d H:i:s', time() - 40 * DAY_IN_SECONDS ),
		),
		array( 'id' => $audit['id'] )
	);

	$runs_before = (int) $wpdb->get_var( 'SELECT COUNT(*) FROM ' . Tables::name( Tables::AUDITS ) );
	$dashboard   = rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/dashboard' ) );
	$runs_after  = (int) $wpdb->get_var( 'SELECT COUNT(*) FROM ' . Tables::name( Tables::AUDITS ) );

	check_same( 200, $dashboard->get_status(), '/dashboard answers' );
	check_same( $runs_before, $runs_after, 'and reading it runs no audit — it never measures' );

	$card = $dashboard->get_data()['data']['score'];

	check( true === $card['has_audit'], 'the card reports a stored audit' );
	check_same( $second_audit['id'], $card['audit_id'], 'the newest completed run' );
	check_same( $second_audit['score'], $card['score'], 'with its stored score' );
	check_same( 40, $card['trend']['baseline_score'], 'compared against the run from a full window ago' );
	check_same( $second_audit['score'] - 40, $card['trend']['delta'], 'giving the difference as the delta' );
	check( true === $card['trend']['covers_full_window'], 'and saying it spans the whole 30 days' );

	// Open counts come from the rows, so an ignored finding stops counting.
	$open_before = $card['open_findings'];
	$first_open  = AuditRepository::issues( $second_audit['id'] );

	if ( $first_open ) {
		AuditRepository::set_issue_status( $first_open[0]['id'], 'ignored' );

		$card = rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/dashboard' ) )->get_data()['data']['score'];

		check_same( $open_before - 1, $card['open_findings'], 'ignoring a finding removes it from the open count' );
		check_same( $card['open_findings'], array_sum( $card['open_by_severity'] ), 'and the per-severity counts add up to it' );
	}

	// There is no way to write through it.
	$write = rest_do_request( new WP_REST_Request( 'POST', '/fhint/v1/dashboard' ) );
	check( in_array( $write->get_status(), array( 404, 405 ), true ), 'the dashboard route has no write method' );

	// -- Plan limits, where they are actually enforced ---------------------

	$first = new WP_REST_Request( 'POST', '/fhint/v1/locations' );
	$first->set_body_params(
		array(
			'name'           => 'Only One',
			'address_line_1' => '1 First St',
			'city'           => 'Austin',
			'country'        => 'US',
		)
	);

	check_same( 201, rest_do_request( $first )->get_status(), 'the first location is created' );

	$second = new WP_REST_Request( 'POST', '/fhint/v1/locations' );
	$second->set_body_params(
		array(
			'name'           => 'One Too Many',
			'address_line_1' => '2 Second St',
			'city'           => 'Austin',
			'country'        => 'US',
		)
	);

	$response = rest_do_request( $second );

	// A business with branches is an ordinary small business, and importing
	// its Google profiles creates one location each — so Free allows them.
	check_same( 201, $response->get_status(), 'a second location is allowed' );
	check_same( 2, LocationRepository::count(), 'and both rows are written' );

	for ( $i = 1; $i <= 6; $i++ ) {
		$request = new WP_REST_Request( 'POST', '/fhint/v1/services' );
		$request->set_body_params( array( 'name' => 'Service ' . $i ) );

		check_same( 201, rest_do_request( $request )->get_status(), "service {$i} is created" );
	}

	check( ServiceRepository::count() >= 6, 'services are not capped either' );

	// The limits remain enforceable: a filter is still the way to cap them,
	// which is what a Pro plan would use.
	add_filter(
		'fhint_limits',
		static function ( $limits ) {
			$limits['locations'] = 1;

			return $limits;
		}
	);

	$capped = new WP_REST_Request( 'POST', '/fhint/v1/locations' );
	$capped->set_body_params(
		array(
			'name'           => 'Over The Cap',
			'address_line_1' => '3 Third St',
			'city'           => 'Austin',
			'country'        => 'US',
		)
	);

	$refused = rest_do_request( $capped );

	check_same( 403, $refused->get_status(), 'a filtered limit still refuses' );
	check_same(
		'fhint_location_limit_reached',
		$refused->as_error()->get_error_code(),
		'with the documented code, so the screen can explain it'
	);

	$GLOBALS['wp_filter']['fhint_limits'] = new WP_Hook();

	// Slugs are unique per business, derived from the name.
	$slugs = array_map(
		static function ( $service ) {
			return $service['slug'];
		},
		ServiceRepository::all()
	);

	check_same( count( $slugs ), count( array_unique( $slugs ) ), 'every stored slug is unique' );
	check( ! in_array( '', $slugs, true ), 'and none of them is empty' );

	// A logged-out request must not reach any of it.
	wp_set_current_user( 0 );

	$denied = rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/business' ) );
	check_same( 401, $denied->get_status(), 'a logged-out request is refused' );

	$denied = rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/schema' ) );
	check_same( 401, $denied->get_status(), 'including the schema route' );

	$denied = rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/dashboard' ) );
	check_same( 401, $denied->get_status(), 'and the dashboard route' );

	// A subscriber has an account but not the capability.
	$subscriber = get_users( array( 'role' => 'subscriber', 'number' => 1 ) );

	if ( $subscriber ) {
		wp_set_current_user( $subscriber[0]->ID );

		$denied = rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/business' ) );
		check_same( 403, $denied->get_status(), 'a subscriber is refused with 403, not 401' );
	}

	wp_set_current_user( 0 );
}

// -- Summary ---------------------------------------------------------------

$passed = $GLOBALS['__passed'];
$failed = $GLOBALS['__failed'];

echo "\nDatabase round-trip: {$passed} passed, {$failed} failed\n";

exit( $failed > 0 ? 1 : 0 );
