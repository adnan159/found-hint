<?php
/**
 * Exactly one location is marked primary.
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
 * Exactly one location must be the primary one.
 *
 * Anything that needs a single place — the schema output, the dashboard —
 * asks for the primary location. None, or several, and which one answers
 * becomes a matter of row order.
 */
class LocationPrimary extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'location.primary';
	}

	/**
	 * Which part of the score this contributes to.
	 *
	 * @return string
	 */
	public function category() {
		return Category::LOCATION;
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
		if ( ! $context->locations ) {
			return Result::skip();
		}

		$primaries = 0;

		foreach ( $context->locations as $location ) {
			if ( ! empty( $location['is_primary'] ) ) {
				$primaries++;
			}
		}

		if ( 1 === $primaries ) {
			return Result::pass();
		}

		return Result::fail(
			0 === $primaries
				? __( 'No location is marked as the main one.', 'found-hint' )
				: __( 'More than one location is marked as the main one.', 'found-hint' ),
			__( 'Mark exactly one location as primary — it is the one published when a single place is needed.', 'found-hint' ),
			array( 'primaries' => $primaries )
		)->about( 'location', $context->location_id() )->fixable_by( 'location.set_primary' );
	}
}
