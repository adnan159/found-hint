<?php
/**
 * Is something else publishing local business markup too.
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
 * Is something else publishing local business markup too.
 *
 * Two descriptions of one business on a page is worse than one: a search
 * engine picks one and the other's claims are ignored or merged
 * unpredictably, so the published phone number stops being a decision
 * anybody made.
 *
 * This only fires when this plugin is the one publishing *and* something
 * installed might also be. Where the ownership setting has already handed
 * the job over, standing aside is the correct outcome, not a finding.
 */
class SchemaConflict extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'schema.conflict';
	}

	/**
	 * Which part of the score this contributes to.
	 *
	 * @return string
	 */
	public function category() {
		return Category::SCHEMA;
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
		if ( ! $context->schema_published ) {
			return Result::skip();
		}

		$detected = isset( $context->schema_ownership['detected'] )
			? (array) $context->schema_ownership['detected']
			: array();

		if ( ! $detected ) {
			return Result::pass();
		}

		$risky = array();

		foreach ( $detected as $plugin ) {
			// `false` means known not to publish, and is no risk at all.
			// `true` and `null` both are: one certainly publishes, the other
			// cannot be ruled out without looking at the page.
			if ( isset( $plugin['emits_local_business'] ) && false === $plugin['emits_local_business'] ) {
				continue;
			}

			$risky[] = isset( $plugin['name'] ) ? (string) $plugin['name'] : '';
		}

		if ( ! $risky ) {
			return Result::pass();
		}

		return Result::fail(
			sprintf(
				/* translators: %s: comma-separated plugin names. */
				__( '%s may also be publishing local business markup.', 'found-hint' ),
				implode( ', ', $risky )
			),
			__( 'Two descriptions of one business on a page compete. View your page source, then decide who publishes it on the Schema screen.', 'found-hint' ),
			array( 'plugins' => $risky )
		)->about( 'business', $context->business_id() );
	}
}
