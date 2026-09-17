<?php
/**
 * Is there a logo to publish.
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
 * Is there a logo to publish.
 */
class BusinessLogo extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'business.logo';
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
		if ( '' !== $context->nap_value( 'logo_url' ) ) {
			return Result::pass();
		}

		return Result::fail(
			__( 'No logo.', 'found-hint' ),
			__( 'Add a logo — it is published in your structured data and used in some search results.', 'found-hint' )
		)->about( 'business', $context->business_id() );
	}
}
