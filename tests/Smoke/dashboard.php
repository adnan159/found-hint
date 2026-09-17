<?php
/**
 * The dashboard's score trend.
 *
 * Run with plain PHP: `php tests/Smoke/dashboard.php`.
 *
 * `Trend::calculate()` takes the runs as an argument, so every rule about
 * what the card may claim is checked here without a database. The rule
 * that matters most: never say "in the last 30 days" about a history that
 * is shorter than that.
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

if ( ! defined( 'DAY_IN_SECONDS' ) ) {
	define( 'DAY_IN_SECONDS', 86400 );
}

use FHINT\App\Audit\Trend;

echo "Dashboard trend\n";

$now = strtotime( '2026-09-16 12:00:00 UTC' );

/**
 * A run completed some days before now.
 *
 * @param int $id       Id.
 * @param int $score    Score.
 * @param int $days_ago Days before now.
 * @return array
 */
function run_ago( $id, $score, $days_ago ) {
	global $now;

	return array(
		'id'           => $id,
		'score'        => $score,
		'completed_at' => gmdate( 'Y-m-d H:i:s', $now - (int) round( $days_ago * DAY_IN_SECONDS ) ),
	);
}

// -- Not enough history is not a trend --------------------------------------

$none = Trend::calculate( array(), $now );
check( null === $none['delta'], 'no runs means no delta' );

$one = Trend::calculate( array( run_ago( 1, 78, 0 ) ), $now );
check( null === $one['delta'], 'a single run means no delta, rather than a claimed "+0"' );
check( false === $one['covers_full_window'], 'and no claim about the window' );

// -- A full window ------------------------------------------------------------

$full = Trend::calculate(
	array(
		run_ago( 3, 84, 0 ),
		run_ago( 2, 80, 12 ),
		run_ago( 1, 78, 31 ),
	),
	$now
);

check_same( 6, $full['delta'], 'the delta compares the latest run with one from a full window ago' );
check_same( 78, $full['baseline_score'], 'naming the score it compared against' );
check( true === $full['covers_full_window'], 'and says the comparison really spans 30 days' );

// The newest run that is at least a window old is the baseline — not the
// oldest thing kept, which could be a year back.
$long = Trend::calculate(
	array(
		run_ago( 4, 90, 0 ),
		run_ago( 3, 85, 35 ),
		run_ago( 2, 60, 200 ),
		run_ago( 1, 40, 365 ),
	),
	$now
);

check_same( 85, $long['baseline_score'], 'the baseline is the newest run at least 30 days old' );
check_same( 5, $long['delta'], 'so the delta is "over the last 30 days", not "since the beginning"' );

// -- A shorter history says so ------------------------------------------------

$short = Trend::calculate(
	array(
		run_ago( 2, 84, 0 ),
		run_ago( 1, 78, 6 ),
	),
	$now
);

check_same( 6, $short['delta'], 'a history shorter than the window still gives a delta' );
check( false === $short['covers_full_window'], 'but admits it does not cover 30 days' );
check_same( run_ago( 1, 78, 6 )['completed_at'], $short['baseline_completed_at'], 'and says which date it compared against' );

// With several recent runs and none old enough, compare against the oldest.
$recent = Trend::calculate(
	array(
		run_ago( 3, 88, 0 ),
		run_ago( 2, 70, 2 ),
		run_ago( 1, 60, 9 ),
	),
	$now
);

check_same( 60, $recent['baseline_score'], 'without a full window, the oldest run is the baseline' );
check_same( 28, $recent['delta'], 'giving the largest honest comparison available' );

// -- Direction ----------------------------------------------------------------

$down = Trend::calculate( array( run_ago( 2, 70, 0 ), run_ago( 1, 82, 40 ) ), $now );
check_same( -12, $down['delta'], 'a falling score gives a negative delta' );

$flat = Trend::calculate( array( run_ago( 2, 82, 0 ), run_ago( 1, 82, 40 ) ), $now );
check_same( 0, $flat['delta'], 'an unchanged score gives zero, which is a measurement here' );

// -- Order is decided by completion time, not by the order given ---------------

$shuffled = Trend::calculate(
	array(
		run_ago( 1, 78, 31 ),
		run_ago( 3, 84, 0 ),
		run_ago( 2, 80, 12 ),
	),
	$now
);

check_same( 6, $shuffled['delta'], 'runs given out of order are sorted by when they finished' );

// A row inserted later but completed earlier must not be taken as the latest.
$out_of_order = Trend::calculate(
	array(
		array( 'id' => 99, 'score' => 50, 'completed_at' => gmdate( 'Y-m-d H:i:s', $now - 40 * DAY_IN_SECONDS ) ),
		array( 'id' => 1, 'score' => 80, 'completed_at' => gmdate( 'Y-m-d H:i:s', $now ) ),
	),
	$now
);

check_same( 30, $out_of_order['delta'], 'the latest run is the one that finished last, not the highest id' );

// -- Bad rows are ignored, not fatal -------------------------------------------

$dirty = Trend::calculate(
	array(
		run_ago( 3, 84, 0 ),
		array( 'id' => 2, 'score' => 10, 'completed_at' => '' ),
		array( 'id' => 5, 'score' => 10, 'completed_at' => 'not a date' ),
		run_ago( 1, 78, 31 ),
	),
	$now
);

check_same( 6, $dirty['delta'], 'runs with no usable completion time are skipped' );

// Exactly on the boundary counts as a full window.
$edge = Trend::calculate( array( run_ago( 2, 84, 0 ), run_ago( 1, 78, 30 ) ), $now );
check( true === $edge['covers_full_window'], 'a run exactly 30 days old covers the window' );

finish( 'Dashboard trend' );
