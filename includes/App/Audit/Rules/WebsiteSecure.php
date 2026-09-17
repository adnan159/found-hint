<?php
/**
 * Is the published website address served over https.
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
 * Is the published website address served over https.
 *
 * A plain http address in structured data is a link search engines and
 * browsers will treat as insecure, and it is usually a leftover rather than
 * a decision.
 */
class WebsiteSecure extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'website.secure';
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
	 * Judge the site.
	 *
	 * @param Context $context Site snapshot.
	 * @return Result
	 */
	public function evaluate( Context $context ) {
		$website = $context->nap_value( 'website' );

		if ( '' === $website ) {
			// WebsiteAddress already reports the absence.
			return Result::skip();
		}

		if ( 0 === stripos( $website, 'https://' ) ) {
			return Result::pass();
		}

		return Result::fail(
			__( 'Your website address is not secure.', 'found-hint' ),
			__( 'Use the https:// version of the address.', 'found-hint' ),
			array( 'found' => $website )
		)->about( 'business', $context->business_id() )->fixable_by( 'business.force_https' );
	}
}
