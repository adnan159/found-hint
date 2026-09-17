<?php
/**
 * Is the address complete enough to put on a map.
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
 * Is the address complete enough to put on a map.
 */
class LocationAddress extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'location.address';
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
		return Severity::CRITICAL;
	}

	/**
	 * How much this rule is worth within its category.
	 *
	 * @return int
	 */
	public function weight() {
		return 3;
	}

	/**
	 * Judge the site.
	 *
	 * @param Context $context Site snapshot.
	 * @return Result
	 */
	public function evaluate( Context $context ) {
		if ( ! $context->location ) {
			return Result::fail(
				__( 'No location.', 'found-hint' ),
				__( 'Add the address customers visit. Without it there is nothing to put on a map.', 'found-hint' )
			)->about( 'business', $context->business_id() );
		}

		if ( ! empty( $context->nap['address']['complete'] ) ) {
			return Result::pass();
		}

		$missing = array();

		foreach ( array( 'line_1', 'city', 'country' ) as $part ) {
			if ( '' === trim( (string) $context->nap['address'][ $part ] ) ) {
				$missing[] = $part;
			}
		}

		return Result::fail(
			__( 'The address is incomplete.', 'found-hint' ),
			__( 'A street, a city and a country are the minimum a search engine needs.', 'found-hint' ),
			array( 'missing' => $missing )
		)->about( 'location', $context->location_id() );
	}
}
