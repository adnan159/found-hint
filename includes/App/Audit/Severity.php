<?php
/**
 * Finding severities.
 *
 * @package FoundHint
 */

namespace FHINT\App\Audit;

defined( 'ABSPATH' ) || exit;

/**
 * How much a finding matters.
 *
 * A `final class` of constants rather than an enum: this plugin supports
 * PHP 7.4.
 *
 * Severity says how urgent a finding is; it does **not** decide the score.
 * Weight does that, and the two are deliberately separate — a missing
 * business name is critical *and* heavily weighted, but a missing logo is
 * low severity while still costing a point, and conflating the two would
 * make one of them unexpressible.
 */
final class Severity {

	const CRITICAL = 'critical';
	const HIGH     = 'high';
	const MEDIUM   = 'medium';
	const LOW      = 'low';

	/**
	 * Every severity, most urgent first.
	 *
	 * @return string[]
	 */
	public static function all() {
		return array( self::CRITICAL, self::HIGH, self::MEDIUM, self::LOW );
	}

	/**
	 * Sort rank — lower is more urgent.
	 *
	 * @param string $severity Severity.
	 * @return int
	 */
	public static function rank( $severity ) {
		$rank = array_flip( self::all() );

		return isset( $rank[ $severity ] ) ? $rank[ $severity ] : count( $rank );
	}

	/**
	 * Whether a value is a known severity.
	 *
	 * @param string $severity Severity.
	 * @return bool
	 */
	public static function is_valid( $severity ) {
		return in_array( $severity, self::all(), true );
	}
}
