<?php
/**
 * Is a Google Business Profile connected.
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
 * Is a Google Business Profile connected.
 *
 * Not connecting is a legitimate choice, so this reports rather than
 * skipping: an operator who has not connected should be told what they are
 * missing, but it is weighted as one check among several rather than
 * treated as a failure of the site itself.
 */
class GoogleConnected extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'technical.google_connected';
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
		$status = isset( $context->google['status'] ) ? (string) $context->google['status'] : '';

		if ( 'connected' === $status ) {
			return Result::pass();
		}

		if ( 'needs_reconnect' === $status ) {
			return Result::fail(
				__( 'Your Google connection is missing permission to manage the profile.', 'found-hint' ),
				__( 'Connect again and accept all the requested permissions.', 'found-hint' )
			)->about( 'business', $context->business_id() );
		}

		return Result::fail(
			__( 'No Google Business Profile connected.', 'found-hint' ),
			__( 'Connect one to see how Google shows your business today.', 'found-hint' ),
			array( 'status' => $status )
		)->about( 'business', $context->business_id() );
	}
}
