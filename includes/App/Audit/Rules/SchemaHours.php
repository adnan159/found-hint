<?php
/**
 * Do the published hours reach the markup.
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
 * Do the published hours reach the markup.
 */
class SchemaHours extends Rule {

	/**
	 * Stable identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'schema.hours';
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
		return Severity::MEDIUM;
	}

	/**
	 * Judge the site.
	 *
	 * @param Context $context Site snapshot.
	 * @return Result
	 */
	public function evaluate( Context $context ) {
		if ( ! $context->schema_published || empty( $context->schema['@graph'] ) ) {
			return Result::skip();
		}

		$node = $context->schema['@graph'][0];

		if ( ! empty( $node['openingHoursSpecification'] ) ) {
			return Result::pass();
		}

		return Result::fail(
			__( 'Your published markup carries no opening hours.', 'found-hint' ),
			__( 'Set the week on the location, and make sure the location is marked open.', 'found-hint' )
		)->about( 'location', $context->location_id() );
	}
}
