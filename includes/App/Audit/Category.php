<?php
/**
 * Audit categories and their weights.
 *
 * @package FoundHint
 */

namespace FHINT\App\Audit;

defined( 'ABSPATH' ) || exit;

/**
 * The areas a score is broken down into.
 *
 * Weights are relative, not percentages, and they are **renormalised over
 * the categories that actually ran**. A site with schema publishing turned
 * off is not a site that failed its schema checks — the category simply has
 * nothing to say, and its weight is redistributed rather than counted as
 * zero. Scoring a switched-off feature as failure would push every such
 * site into a band it does not belong in.
 */
final class Category {

	const BUSINESS  = 'business';
	const LOCATION  = 'location';
	const HOURS     = 'hours';
	const SCHEMA    = 'schema';
	const WEBSITE   = 'website';
	const TECHNICAL = 'technical';

	/**
	 * Every category.
	 *
	 * @return string[]
	 */
	public static function all() {
		return array_keys( self::weights() );
	}

	/**
	 * Relative weights, filterable so Pro can retune them.
	 *
	 * @return array<string, int>
	 */
	public static function weights() {
		$weights = array(
			self::BUSINESS  => 30,
			self::LOCATION  => 25,
			self::HOURS     => 15,
			self::SCHEMA    => 15,
			self::WEBSITE   => 10,
			self::TECHNICAL => 5,
		);

		return function_exists( 'apply_filters' )
			? (array) apply_filters( 'fhint_audit_category_weights', $weights )
			: $weights;
	}

	/**
	 * One category's weight.
	 *
	 * @param string $category Category.
	 * @return int
	 */
	public static function weight( $category ) {
		$weights = self::weights();

		return isset( $weights[ $category ] ) ? (int) $weights[ $category ] : 0;
	}

	/**
	 * Whether a value is a known category.
	 *
	 * @param string $category Category.
	 * @return bool
	 */
	public static function is_valid( $category ) {
		return array_key_exists( $category, self::weights() );
	}
}
