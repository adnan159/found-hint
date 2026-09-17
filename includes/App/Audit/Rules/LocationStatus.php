<?php
/**
 * Is the location published as open.
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
 * Is the location published as open.
 */
class LocationStatus extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'location.status';
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
	 * Judge the site.
	 *
	 * @param Context $context Site snapshot.
	 * @return Result
	 */
	public function evaluate( Context $context ) {
		if ( ! $context->location ) {
			return Result::skip();
		}

		$status = isset( $context->location['status'] ) ? (string) $context->location['status'] : '';

		if ( 'active' === $status ) {
			return Result::pass();
		}

		return Result::fail(
			__( 'This location is not marked as open.', 'found-hint' ),
			__( 'While it is closed or inactive, less of your information is published.', 'found-hint' ),
			array( 'status' => $status )
		)->about( 'location', $context->location_id() );
	}
}
