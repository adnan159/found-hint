<?php
/**
 * Is there a description worth reading.
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
 * Is there a description worth reading.
 */
class BusinessDescription extends Rule {

	/**
	 * Shorter than this says nothing useful to a reader or a search engine.
	 */
	const MINIMUM_LENGTH = 50;

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'business.description';
	}

	/**
	 * Which part of the score this contributes to.
	 *
	 * @return string
	 */
	public function category() {
		return Category::BUSINESS;
	}

	/**
	 * How urgent a finding from this rule is.
	 *
	 * @return string
	 */
	public function severity() {
		return Severity::LOW;
	}

	/**
	 * Judge the site.
	 *
	 * @param Context $context Site snapshot.
	 * @return Result
	 */
	public function evaluate( Context $context ) {
		$description = $context->nap_value( 'description' );

		if ( strlen( $description ) >= self::MINIMUM_LENGTH ) {
			return Result::pass();
		}

		return Result::fail(
			'' === $description
				? __( 'No description.', 'found-hint' )
				: __( 'Your description is very short.', 'found-hint' ),
			__( 'Describe what you do in a sentence or two.', 'found-hint' ),
			array( 'length' => strlen( $description ) )
		)->about( 'business', $context->business_id() );
	}
}
