<?php
/**
 * The rule set.
 *
 * @package FoundHint
 */

namespace FHINT\App\Audit;

defined( 'ABSPATH' ) || exit;

/**
 * Collects the rules an audit will run.
 *
 * **Free lists its own rules here and nowhere else; Pro appends to the
 * filter.** That is the whole extension contract — adding a rule must never
 * require editing a Free class, or every Pro release becomes a merge.
 *
 * Rules are registered as class names, not instances, so a run builds only
 * what it is about to use and an extension that registers thirty rules
 * costs nothing on the requests that never audit.
 */
class Registry {

	/**
	 * The Free rule set, in the order findings are grouped.
	 *
	 * @return string[]
	 */
	public static function core_rules() {
		return array(
			Rules\BusinessName::class,
			Rules\BusinessPhone::class,
			Rules\BusinessType::class,
			Rules\BusinessDescription::class,
			Rules\BusinessLogo::class,
			Rules\BusinessServices::class,

			Rules\LocationAddress::class,
			Rules\LocationPrimary::class,
			Rules\LocationStatus::class,
			Rules\LocationCoordinates::class,

			Rules\HoursSet::class,
			Rules\HoursComplete::class,

			Rules\SchemaPublished::class,
			Rules\SchemaHours::class,
			Rules\SchemaConflict::class,

			Rules\WebsiteAddress::class,
			Rules\WebsiteSecure::class,
			Rules\SocialProfiles::class,

			Rules\GoogleConnected::class,
			Rules\GoogleMapped::class,
			Rules\GoogleNameMatches::class,
			Rules\GooglePhoneMatches::class,
		);
	}

	/**
	 * Every rule that will run, instantiated.
	 *
	 * Anything that is not a Rule, or that duplicates an id already
	 * registered, is dropped rather than allowed to break a run — a badly
	 * behaved extension should cost its own rule, not the whole audit. A
	 * duplicate id would also corrupt the score by counting one check twice.
	 *
	 * @return Rule[]
	 */
	public static function rules() {
		$classes = self::core_rules();

		/**
		 * Filter the audit rule set.
		 *
		 * @param string[] $classes Rule class names.
		 */
		if ( function_exists( 'apply_filters' ) ) {
			$classes = (array) apply_filters( 'fhint_audit_rules', $classes );
		}

		$rules = array();
		$seen  = array();

		foreach ( $classes as $class ) {
			if ( ! is_string( $class ) || ! class_exists( $class ) ) {
				continue;
			}

			$rule = new $class();

			if ( ! $rule instanceof Rule ) {
				continue;
			}

			$id = $rule->id();

			if ( '' === $id || isset( $seen[ $id ] ) ) {
				continue;
			}

			if ( ! Category::is_valid( $rule->category() ) || ! Severity::is_valid( $rule->severity() ) ) {
				continue;
			}

			$seen[ $id ] = true;
			$rules[]     = $rule;
		}

		return $rules;
	}
}
