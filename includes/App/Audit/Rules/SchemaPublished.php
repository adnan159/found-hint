<?php
/**
 * Is the structured data actually being published.
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
 * Is the structured data actually being published.
 */
class SchemaPublished extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'schema.published';
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
		return 3;
	}

	/**
	 * Judge the site.
	 *
	 * @param Context $context Site snapshot.
	 * @return Result
	 */
	public function evaluate( Context $context ) {
		if ( 'disabled' === $context->schema_mode || 'seo_plugin' === $context->schema_mode ) {
			// Switched off deliberately. Scoring a decision as a failure would
			// tell the operator they are broken for choosing.
			return Result::skip();
		}

		if ( $context->schema_published ) {
			return Result::pass();
		}

		return Result::fail(
			__( 'No structured data is being published.', 'found-hint' ),
			__( 'Check the Schema screen — something is either missing or another plugin has been given the job.', 'found-hint' )
		)->about( 'business', $context->business_id() );
	}
}
