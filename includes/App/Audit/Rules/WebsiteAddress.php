<?php
/**
 * Is there a website address, and is it this site.
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
 * Is there a website address, and is it this site.
 */
class WebsiteAddress extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'website.address';
	}

	/**
	 * Which part of the score this contributes to.
	 *
	 * @return string
	 */
	public function category() {
		return Category::WEBSITE;
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
		$website = $context->nap_value( 'website' );

		if ( '' === $website ) {
			return Result::fail(
				__( 'No website address.', 'found-hint' ),
				__( 'Add your website so it can be published with your business details.', 'found-hint' )
			)->about( 'business', $context->business_id() )->fixable_by( 'business.set_website' );
		}

		return Result::pass();
	}
}
