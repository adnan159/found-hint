<?php
/**
 * Are there map coordinates.
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
 * Are there map coordinates.
 */
class LocationCoordinates extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'location.coordinates';
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
		return Severity::MEDIUM;
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

		if ( ! empty( $context->nap['coordinates']['has_both'] ) ) {
			return Result::pass();
		}

		return Result::fail(
			__( 'No map coordinates.', 'found-hint' ),
			__( 'Add a latitude and longitude so you can be placed precisely rather than approximately.', 'found-hint' )
		)->about( 'location', $context->location_id() );
	}
}
