<?php
/**
 * Guided setup smoke test.
 *
 * The wizard's whole safety argument is that it stores a position and never
 * content, so "start over" can only rewind navigation. That is asserted
 * here against the actual stored option rather than taken on trust.
 *
 * Usage: php tests/Smoke/onboarding.php
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\App\Onboarding\Onboarding;

echo "Guided setup\n";

/**
 * Minimal $wpdb so the repositories' table checks resolve to "no tables",
 * which is the state a fresh install is in.
 */
$GLOBALS['wpdb'] = new class {
	public $prefix = 'wp_';

	public function prepare( $sql, ...$args ) {
		return $sql;
	}

	public function get_var( $sql ) {
		return null;
	}

	public function get_row( $sql, $mode = null ) {
		return null;
	}

	public function get_results( $sql, $mode = null ) {
		return array();
	}
};

// -- Shape -----------------------------------------------------------------

check_same(
	array( 'welcome', 'business', 'location', 'hours', 'services', 'done' ),
	Onboarding::steps(),
	'the steps are the ones the plugin can actually complete'
);
check_same(
	array( 'business', 'location', 'hours', 'services' ),
	Onboarding::data_steps(),
	'only the middle steps collect anything'
);

// -- A fresh site ----------------------------------------------------------

$state = Onboarding::state();
check_same( 'not_started', $state['status'], 'a fresh site has not started setup' );
check_same( 'welcome', $state['current'], 'and sits on the welcome step' );
check_same( 4, $state['total_steps'], 'four steps count towards completion' );
check_same( 0, $state['done_steps'], 'none of them are done yet' );
check( $state['is_open'], 'setup is open' );
check_same( 6, count( $state['steps'] ), 'every step is reported' );
check_same( 'business', $state['next_step'], 'the next step follows welcome' );
check_same( '', $state['previous_step'], 'there is nothing before welcome' );

// -- Moving through --------------------------------------------------------

$state = Onboarding::apply( 'complete', 'welcome' );
check_same( 'in_progress', $state['status'], 'completing a step starts setup' );
check_same( 'business', $state['current'], 'and advances to the next step' );
check( $state['started_at'] > 0, 'the start time is stamped' );

$state = Onboarding::apply( 'skip', 'business' );
check_same( 'location', $state['current'], 'skipping also advances' );

$skipped = array_values(
	array_filter(
		$state['steps'],
		static function ( $step ) {
			return $step['skipped'];
		}
	)
);
check_same( 'business', $skipped[0]['id'], 'the skipped step is recorded as skipped' );
check( ! $skipped[0]['done'], 'a skipped step is not done — it was passed over, not finished' );

$state = Onboarding::apply( 'go', 'services' );
check_same( 'services', $state['current'], 'go moves straight to a step' );
check_same( 'hours', $state['previous_step'], 'and the previous step follows from the order' );

$state = Onboarding::apply( 'finish' );
check_same( 'done', $state['status'], 'finishing marks setup done' );
check( ! $state['is_open'], 'a finished setup is closed' );
check( $state['ended_at'] > 0, 'the end time is stamped' );

$state = Onboarding::apply( 'dismiss' );
check_same( 'dismissed', $state['status'], 'dismissing closes setup' );
check( ! $state['is_open'], 'a dismissed setup is closed' );

// -- The position never holds content --------------------------------------

// Pretend the operator got some way in, then inspect what was actually
// written. This is the assertion that matters: if a business name could
// reach this option, "start over" could throw it away.
Onboarding::apply( 'complete', 'business' );
Onboarding::apply( 'complete', 'location' );

$stored = get_option( Onboarding::OPTION );
$keys   = array_keys( $stored );
sort( $keys );

check_same(
	array( 'completed', 'current', 'ended_at', 'skipped', 'started_at', 'status' ),
	$keys,
	'the stored option holds exactly the position keys and nothing else'
);

$encoded = wp_json_encode( $stored );

foreach ( array( 'name', 'address', 'phone', 'email', 'website', 'city' ) as $content ) {
	check(
		false === strpos( $encoded, '"' . $content . '"' ),
		"the position carries no {$content} field"
	);
}

// -- Restart rewinds the position and nothing else --------------------------

$GLOBALS['__options']['fhint_settings'] = array( 'general' => array( 'delete_data_on_uninstall' => false ) );
$before = $GLOBALS['__options'];

$state = Onboarding::apply( 'restart' );

check_same( 'welcome', $state['current'], 'restart returns to the first step' );
check_same( array(), $state['completed'], 'restart clears completed steps' );
check_same( array(), $state['skipped'], 'restart clears skipped steps' );
check_same( 0, $state['ended_at'], 'restart reopens setup' );
check( $state['is_open'], 'setup is open again after a restart' );

// Everything except the position option must be byte-for-byte unchanged.
unset( $before[ Onboarding::OPTION ] );
$after = $GLOBALS['__options'];
unset( $after[ Onboarding::OPTION ] );

check_same(
	wp_json_encode( $before ),
	wp_json_encode( $after ),
	'restart leaves every other stored value untouched'
);

// -- Done-ness is read from live data, not from the flag -------------------

// Nothing exists on this fake site, so no data step can report has_data,
// however far the position has been moved.
foreach ( Onboarding::state()['steps'] as $step ) {
	if ( $step['is_data_step'] ) {
		check( ! $step['has_data'], "{$step['id']}: has_data is false when the site holds nothing" );
	}
}

check( ! Onboarding::has_data( 'welcome' ), 'the welcome step never reports data' );
check( ! Onboarding::has_data( 'done' ), 'the done step never reports data' );

finish( 'Guided setup' );
