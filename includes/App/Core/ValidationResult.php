<?php
/**
 * Validation outcome.
 *
 * @package FoundHint
 */

namespace FHINT\App\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Carries per-field machine error codes, never sentences.
 *
 * Codes like 'business.name.required' travel from the domain rules out to
 * the REST response, where the client maps them to translated strings and
 * attaches each one to its own input. Storing a sentence here would mean
 * the same rule had to be re-worded in every place that runs it, and would
 * put English in the domain layer.
 */
class ValidationResult {

	/**
	 * Error codes keyed by field.
	 *
	 * @var array<string, string[]>
	 */
	private $errors = array();

	/**
	 * Record a failure.
	 *
	 * @param string $field Field name, dot-notated for nested fields.
	 * @param string $code  Machine error code.
	 * @return $this
	 */
	public function add( $field, $code ) {
		$this->errors[ $field ][] = $code;

		return $this;
	}

	/**
	 * Merge another result in, optionally under a field prefix.
	 *
	 * @param ValidationResult $other  Result to merge.
	 * @param string           $prefix Prefix for the merged field names.
	 * @return $this
	 */
	public function merge( ValidationResult $other, $prefix = '' ) {
		foreach ( $other->errors() as $field => $codes ) {
			$key = '' === $prefix ? $field : $prefix . '.' . $field;

			foreach ( $codes as $code ) {
				$this->add( $key, $code );
			}
		}

		return $this;
	}

	/**
	 * Whether everything passed.
	 *
	 * @return bool
	 */
	public function is_valid() {
		return empty( $this->errors );
	}

	/**
	 * All error codes, keyed by field.
	 *
	 * @return array<string, string[]>
	 */
	public function errors() {
		return $this->errors;
	}
}
