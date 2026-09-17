<?php
/**
 * Are any opening hours set at all.
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
 * Are any opening hours set at all.
 *
 * Unset is not closed. A site that has never filled the week in publishes
 * no hours, which is different from a business that is shut — and it is the
 * single most common gap on a local listing.
 */
class HoursSet extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'hours.set';
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
		return Severity::HIGH;
	}

	/**
	 * How much this rule is worth within its category.
	 *
	 * @return int
	 */
	public function weight() {
		return 2;
	}

	/**
	 * Judge the site.
	 *
	 * @param Context $context Site snapshot.
	 * @return Result
	 */
	public function evaluate( Context $context ) {
		if ( ! $context->location ) {
			return Result::skip();
		}

		if ( ! empty( $context->nap['hours']['has_any_hours'] ) ) {
			return Result::pass();
		}

		return Result::fail(
			__( 'No opening hours set.', 'found-hint' ),
			__( 'Fill in the week. "When are they open?" is the question a local search is usually answering.', 'found-hint' )
		)->about( 'location', $context->location_id() );
	}
}
