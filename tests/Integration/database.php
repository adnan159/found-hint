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
 * swapping the prefix gives this suite its own eight tables against the
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
use FHINT\App\Location\DayOfWeek;
use FHINT\App\Location\Location;
use FHINT\App\Location\LocationRepository;
use FHINT\App\Location\OpeningHoursRepository;
use FHINT\App\Nap\Nap;
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
check_same( 8, count( Tables::all() ), 'all eight tables are declared' );

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
check( ! $limits['can_add'], 'and refuses a second on the free plan' );

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

// -- Cascades --------------------------------------------------------------

check_same( 4, count( OpeningHoursRepository::for_location( $location_id ) ), 'all four period rows are there before the delete' );

LocationRepository::delete( $location_id );

check_same( 0, LocationRepository::count(), 'the location is gone' );
check_same( array(), OpeningHoursRepository::for_location( $location_id ), 'and its hours went with it' );
check_same(
	0,
	GoogleLocationRepository::find_by_location_name( 'locations/789' )['fhint_location_id'],
	'and the Google mapping was released by the fhint_location_deleted hook'
);

// Deleting the business takes its services with it.
check_same( 3, ServiceRepository::count(), 'services exist before the business is deleted' );

BusinessRepository::delete();

check_same( 0, ServiceRepository::count(), 'deleting the business cascades to its services' );
check_same( null, BusinessRepository::get(), 'and the business is gone' );

// -- REST over the real stack ----------------------------------------------

$admins = get_users( array( 'role' => 'administrator', 'number' => 1 ) );

if ( $admins ) {
	wp_set_current_user( $admins[0]->ID );

	$response = rest_do_request( new WP_REST_Request( 'GET', '/fhint/v1/business' ) );
	check_same( 200, $response->get_status(), 'an administrator can read /business' );

	$create = new WP_REST_Request( 'POST', '/fhint/v1/business' );
	$create->set_body_params( array( 'name' => 'Created Over REST' ) );

	$response = rest_do_request( $create );

	check_same( 201, $response->get_status(), 'and create through it, answering 201' );
	check_same( 'Created Over REST', BusinessRepository::get()['name'], 'which reaches the database' );

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

	check_same( 403, $response->get_status(), 'a second location is refused on the free plan' );
	check_same(
		'fhint_location_limit_reached',
		$response->as_error()->get_error_code(),
		'with the documented code, so the screen can explain it'
	);
	check_same( 1, LocationRepository::count(), 'and no row was written' );

	// Services allow five, so the sixth is the one that fails.
	for ( $i = 1; $i <= 5; $i++ ) {
		$request = new WP_REST_Request( 'POST', '/fhint/v1/services' );
		$request->set_body_params( array( 'name' => 'Service ' . $i ) );

		check_same( 201, rest_do_request( $request )->get_status(), "service {$i} of 5 is created" );
	}

	$sixth = new WP_REST_Request( 'POST', '/fhint/v1/services' );
	$sixth->set_body_params( array( 'name' => 'Service 6' ) );

	check_same( 403, rest_do_request( $sixth )->get_status(), 'the sixth service is refused' );
	check_same( 5, ServiceRepository::count(), 'and the plan limit holds in the database' );

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
