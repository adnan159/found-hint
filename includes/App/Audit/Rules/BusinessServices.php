<?php
/**
 * Are there services listed.
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
 * Are there services listed.
 */
class BusinessServices extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'business.services';
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
		if ( count( $context->services ) > 0 ) {
			return Result::pass();
		}

		return Result::fail(
			__( 'No services listed.', 'found-hint' ),
			__( 'Add the things people actually come to you for. They are published as part of your structured data.', 'found-hint' )
		)->about( 'business', $context->business_id() );
	}
}
