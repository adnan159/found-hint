<?php
/**
 * Does the name here match the name on the Google profile.
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
 * Does the name here match the name on the Google profile.
 *
 * This is the check the whole mapping feature exists to make possible, and
 * the one a "local SEO" plugin is judged on: the same business described
 * two ways across the web is the inconsistency that suppresses a listing.
 *
 * Comparison is deliberately forgiving — case, punctuation and spacing are
 * ignored — because "Northside Dental Care" and "Northside Dental Care."
 * are the same name, and reporting them as a conflict would train the
 * operator to ignore this rule.
 */
class GoogleNameMatches extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'technical.google_name';
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

		$ours   = $context->nap_value( 'name' );
		$theirs = trim( (string) $context->google_location['title'] );

		if ( '' === $ours || '' === $theirs ) {
			return Result::skip();
		}

		if ( self::normalise( $ours ) === self::normalise( $theirs ) ) {
			return Result::pass();
		}

		return Result::fail(
			__( 'Your business name does not match your Google profile.', 'found-hint' ),
			__( 'Make them identical. The same business described two ways is what search engines treat as two businesses.', 'found-hint' ),
			array(
				'found'    => $ours,
				'expected' => $theirs,
			)
		)->about( 'location', $context->location_id() );
	}

	/**
	 * Lowercase, letters and digits only.
	 *
	 * @param string $value Raw name.
	 * @return string
	 */
	private static function normalise( $value ) {
		return preg_replace( '/[^a-z0-9]/', '', strtolower( (string) $value ) );
	}
}
