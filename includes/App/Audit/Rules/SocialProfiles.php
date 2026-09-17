<?php
/**
 * Is there at least one social profile to corroborate the business.
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
 * Is there at least one social profile to corroborate the business.
 */
class SocialProfiles extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'website.social';
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
		return Severity::LOW;
	}

	/**
	 * Judge the site.
	 *
	 * @param Context $context Site snapshot.
	 * @return Result
	 */
	public function evaluate( Context $context ) {
		$profiles = isset( $context->nap['social_profiles'] ) ? (array) $context->nap['social_profiles'] : array();

		foreach ( $profiles as $url ) {
			if ( '' !== trim( (string) $url ) ) {
				return Result::pass();
			}
		}

		return Result::fail(
			__( 'No social profiles.', 'found-hint' ),
			__( 'Add at least one. They are published as corroborating links for the same business.', 'found-hint' )
		)->about( 'business', $context->business_id() );
	}
}
