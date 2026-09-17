<?php
/**
 * Has every day been answered, one way or the other.
 *
 * @package FoundHint
 */

namespace FHINT\App\Audit\Rules;

use FHINT\App\Audit\Category;
use FHINT\App\Audit\Context;
use FHINT\App\Audit\Result;
use FHINT\App\Audit\Rule;
use FHINT\App\Audit\Severity;

defined( 'ABSPATH' ) || exit;

/**
 * Has every day been answered, one way or the other.
 *
 * A day left unset publishes nothing — not "closed". Saying a day is closed
 * is an answer; leaving it blank is a gap, and the operator is the only one
 * who can tell the difference.
 */
class HoursComplete extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'hours.complete';
	}

	/**
	 * Which part of the score this contributes to.
	 *
	 * @return string
	 */
	public function category() {
		return Category::HOURS;
	}

	/**
	 * How urgent a finding from this rule is.
	 *
	 * @return string
	 */
	public function severity() {
		return Severity::MEDIUM;
	}

	/**
	 * Judge the site.
	 *
	 * @param Context $context Site snapshot.
	 * @return Result
	 */
	public function evaluate( Context $context ) {
		if ( ! $context->location || empty( $context->nap['hours']['days'] ) ) {
			return Result::skip();
		}

		if ( empty( $context->nap['hours']['has_any_hours'] ) ) {
			// HoursSet already reports this; two findings for one gap is noise.
			return Result::skip();
		}

		$unset = array();

		foreach ( $context->nap['hours']['days'] as $day ) {
			if ( empty( $day['configured'] ) ) {
				$unset[] = $day['day_name'];
			}
		}

		if ( ! $unset ) {
			return Result::pass();
		}

		return Result::fail(
			sprintf(
				/* translators: %d: number of days with no answer. */
				_n( '%d day has no answer.', '%d days have no answer.', count( $unset ), 'found-hint' ),
				count( $unset )
			),
			__( 'Set every day to open or closed. A day left blank publishes nothing, which is not the same as saying you are shut.', 'found-hint' ),
			array( 'days' => $unset )
		)->about( 'location', $context->location_id() );
	}
}
