<?php
/**
 * Is this location linked to a Google profile.
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
 * Is this location linked to a Google profile.
 */
class GoogleMapped extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'technical.google_mapped';
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
		return Severity::MEDIUM;
	}

	/**
	 * Judge the site.
	 *
	 * @param Context $context Site snapshot.
	 * @return Result
	 */
	public function evaluate( Context $context ) {
		$status = isset( $context->google['status'] ) ? (string) $context->google['status'] : '';

		if ( 'connected' !== $status ) {
			// Nothing to link to yet — GoogleConnected reports that.
			return Result::skip();
		}

		if ( ! $context->location ) {
			return Result::skip();
		}

		if ( ! empty( $context->google_location['location_name'] ) ) {
			return Result::pass();
		}

		return Result::fail(
			__( 'This location is not linked to a Google profile.', 'found-hint' ),
			__( 'Link it on the Google screen so the two can be compared.', 'found-hint' )
		)->about( 'location', $context->location_id() );
	}
}
