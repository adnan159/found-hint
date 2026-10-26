<?php
/**
 * Turning rule results into a score.
 *
 * @package FoundHint
 */

namespace FHINT\App\Audit;

defined( 'ABSPATH' ) || exit;

/**
 * Weighted scoring with renormalisation.
 *
 * Two properties matter more than the exact arithmetic:
 *
 * **A score is explainable.** The per-category `earned` values sum to the
 * total, so "78" can always be decomposed into where the missing 22 went.
 * A number an operator cannot take apart is a number they cannot act on.
 *
 * **A category with nothing to judge is removed, not failed.** If schema
 * publishing is off, or there is no Google connection, those rules skip and
 * their category's weight is redistributed across the categories that did
 * run. Scoring an unused feature as zero would tell every such site it is
 * broken, which is both untrue and unactionable.
 */
class Score {

	const BAND_NEEDS_WORK = 'needs_work';
	const BAND_FAIR       = 'fair';
	const BAND_GOOD       = 'good';
	const BAND_EXCELLENT  = 'excellent';

	/**
	 * Compute the score from a run's results.
	 *
	 * @param array $entries List of array( 'rule' => Rule, 'result' => Result ).
	 * @return array Score, band and the per-category breakdown.
	 */
	public static function calculate( array $entries ) {
		$categories = array();

		foreach ( $entries as $entry ) {
			$rule   = $entry['rule'];
			$result = $entry['result'];

			if ( ! $result->counts() ) {
				continue;
			}

			$category = $rule->category();
			$weight   = max( 1, (int) $rule->weight() );

			if ( ! isset( $categories[ $category ] ) ) {
				$categories[ $category ] = array(
					'weight'           => Category::weight( $category ),
					'effective_weight' => 0.0,
					'earned'           => 0.0,
					'percent'          => 0,
					'checks'           => 0,
					'passed'           => 0,
					'failed'           => 0,
					'possible_points'  => 0,
					'earned_points'    => 0,
				);
			}

			$categories[ $category ]['checks']++;
			$categories[ $category ]['possible_points'] += $weight;

			if ( $result->passed() ) {
				$categories[ $category ]['passed']++;
				$categories[ $category ]['earned_points'] += $weight;
				continue;
			}

			$categories[ $category ]['failed']++;
		}

		if ( ! $categories ) {
			// Nothing ran. A score of 0 would say "you failed everything";
			// this says "there is nothing to report", which is the truth.
			return array(
				'score'      => 0,
				'band'       => self::BAND_NEEDS_WORK,
				'categories' => array(),
				'scored'     => false,
			);
		}

		// Renormalise over the categories that actually had checks.
		$total_weight = 0;

		foreach ( $categories as $data ) {
			$total_weight += $data['weight'];
		}

		$score = 0.0;

		foreach ( $categories as $name => $data ) {
			$percent = $data['possible_points'] > 0
				? $data['earned_points'] / $data['possible_points']
				: 0.0;

			$effective = $total_weight > 0 ? ( $data['weight'] / $total_weight ) * 100 : 0.0;
			$earned    = $effective * $percent;

			$categories[ $name ]['percent']          = (int) round( $percent * 100 );
			$categories[ $name ]['effective_weight'] = round( $effective, 2 );
			$categories[ $name ]['earned']           = round( $earned, 2 );

			$score += $earned;
		}

		$score = (int) round( $score );
		$score = max( 0, min( 100, $score ) );

		return array(
			'score'      => $score,
			'band'       => self::band( $score ),
			'categories' => $categories,
			'scored'     => true,
		);
	}

	/**
	 * The band a score falls into.
	 *
	 * @param int $score 0-100.
	 * @return string
	 */
	public static function band( $score ) {
		$score = (int) $score;

		if ( $score >= 90 ) {
			return self::BAND_EXCELLENT;
		}

		if ( $score >= 70 ) {
			return self::BAND_GOOD;
		}

		if ( $score >= 50 ) {
			return self::BAND_FAIR;
		}

		return self::BAND_NEEDS_WORK;
	}

	/**
	 * Every band, worst first.
	 *
	 * @return string[]
	 */
	public static function bands() {
		return array( self::BAND_NEEDS_WORK, self::BAND_FAIR, self::BAND_GOOD, self::BAND_EXCELLENT );
	}
}
