<?php
/**
 * How the score has moved.
 *
 * @package FoundHint
 */

namespace FHINT\App\Audit;

defined( 'ABSPATH' ) || exit;

/**
 * Compares the latest score with an earlier one.
 *
 * **It never claims more history than exists.** The prototype's card reads
 * "+6 in the last 30 days", and on a site audited for the first time last
 * Tuesday that sentence is false. So the result says whether the comparison
 * really spans the window: when it does, the screen can say "in the last 30
 * days"; when the oldest run is more recent than that, it says "since" the
 * date it actually compared against.
 *
 * History is also finite by design — runs are pruned to the last
 * `AuditRepository::KEEP_RUNS` — so a busy site that audits many times a day
 * may not have a run from 30 days ago even when it is years old. The same
 * rule covers that: compare with what is really there, and say what it was.
 *
 * Pure: the runs are passed in, so this is testable without a database.
 */
class Trend {

	/**
	 * The comparison window, in days.
	 */
	const WINDOW_DAYS = 30;

	/**
	 * Work out the trend from a location's completed runs.
	 *
	 * @param array[] $runs Completed runs, each with `id`, `score` and
	 *                      `completed_at` (UTC MySQL datetime), in any order.
	 * @param int     $now  Current Unix time.
	 * @param int     $days Window length.
	 * @return array
	 */
	public static function calculate( array $runs, $now, $days = self::WINDOW_DAYS ) {
		$none = array(
			'delta'                 => null,
			'baseline_score'        => null,
			'baseline_completed_at' => '',
			'window_days'           => (int) $days,
			'covers_full_window'    => false,
		);

		$runs = array_values(
			array_filter(
				$runs,
				static function ( $run ) {
					return ! empty( $run['completed_at'] ) && false !== self::timestamp( $run['completed_at'] );
				}
			)
		);

		if ( count( $runs ) < 2 ) {
			// One run is a starting point, not a trend. Reporting "+0" here
			// would claim that nothing changed, which nobody has measured.
			return $none;
		}

		// Newest first, by completion time rather than id: a run can be
		// recorded out of order, and id says when a row was inserted, not
		// when the measurement finished.
		usort(
			$runs,
			static function ( $a, $b ) {
				return self::timestamp( $b['completed_at'] ) <=> self::timestamp( $a['completed_at'] );
			}
		);

		$latest = array_shift( $runs );
		$cutoff = (int) $now - ( (int) $days * DAY_IN_SECONDS );

		// Prefer the newest run at least a full window old, so the
		// comparison is "30 days ago" rather than "the oldest thing kept".
		$baseline = null;

		foreach ( $runs as $run ) {
			if ( self::timestamp( $run['completed_at'] ) <= $cutoff ) {
				$baseline = $run;
				break;
			}
		}

		$covers = null !== $baseline;

		// Without one, fall back to the oldest run there is — and say so.
		if ( ! $baseline ) {
			$baseline = end( $runs );
		}

		return array(
			'delta'                 => (int) $latest['score'] - (int) $baseline['score'],
			'baseline_score'        => (int) $baseline['score'],
			'baseline_completed_at' => (string) $baseline['completed_at'],
			'window_days'           => (int) $days,
			'covers_full_window'    => $covers,
		);
	}

	/**
	 * A stored UTC datetime as a Unix timestamp.
	 *
	 * @param string $datetime MySQL datetime, UTC.
	 * @return int|false
	 */
	private static function timestamp( $datetime ) {
		return strtotime( (string) $datetime . ' UTC' );
	}
}
