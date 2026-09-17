<?php
/**
 * Does the phone number here match the one on the Google profile.
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
 * Does the phone number here match the one on the Google profile.
 *
 * Compared on digits alone: `+1 512 555 0134` and `(512) 555-0134` reach
 * the same telephone, and only the last several digits are compared because
 * one side often carries a country code the other omits.
 */
class GooglePhoneMatches extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'technical.google_phone';
	}

	/**
	 * Which part of the score this contributes to.
	 *
	 * @return string
	 */
	public function category() {
		return Category::TECHNICAL;
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
		if ( empty( $context->google_location['location_name'] ) ) {
			return Result::skip();
		}

		$ours   = preg_replace( '/\D+/', '', $context->nap_value( 'phone' ) );
		$theirs = preg_replace( '/\D+/', '', (string) $context->google_location['phone'] );

		if ( '' === $ours || '' === $theirs ) {
			return Result::skip();
		}

		$length = min( 7, min( strlen( $ours ), strlen( $theirs ) ) );

		if ( substr( $ours, -$length ) === substr( $theirs, -$length ) ) {
			return Result::pass();
		}

		return Result::fail(
			__( 'Your phone number does not match your Google profile.', 'found-hint' ),
			__( 'Use the same number in both places.', 'found-hint' ),
			array(
				'found'    => $context->nap_value( 'phone' ),
				'expected' => (string) $context->google_location['phone'],
			)
		)->about( 'location', $context->location_id() );
	}
}
