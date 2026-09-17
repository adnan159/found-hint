<?php
/**
 * Is a business type set, so the markup can be specific.
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
 * Is a business type set, so the markup can be specific.
 */
class BusinessType extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'business.type';
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
		return Severity::MEDIUM;
	}

	/**
	 * Judge the site.
	 *
	 * @param Context $context Site snapshot.
	 * @return Result
	 */
	public function evaluate( Context $context ) {
		$type = $context->nap_value( 'business_type' );

		if ( '' !== $type && 'LocalBusiness' !== $type ) {
			return Result::pass();
		}

		return Result::fail(
			__( 'Your business type is generic.', 'found-hint' ),
			__( 'Choose the most specific type that fits — "Dentist" tells a search engine far more than "Local business".', 'found-hint' ),
			array( 'found' => $type )
		)->about( 'business', $context->business_id() );
	}
}
