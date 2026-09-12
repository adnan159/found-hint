<?php
/**
 * Plan limits.
 *
 * @package FoundHint
 */

namespace FHINT\App\Core;

defined( 'ABSPATH' ) || exit;

/**
 * How much of each thing this install may create.
 *
 * **Every limit check in the plugin goes through this class.** A hardcoded
 * `if ( count( $locations ) >= 1 )` anywhere else is what would force a Pro
 * tier to rewrite core instead of filtering a number, so there must not be
 * one. Raising a limit is a filter, not a code change:
 *
 *     add_filter( 'fhint_limits', function ( $limits ) {
 *         $limits['locations'] = 0; // 0 = unlimited
 *         return $limits;
 *     } );
 */
class Limits {

	const LOCATIONS = 'locations';
	const SERVICES  = 'services';

	/**
	 * Free-tier limits. 0 means unlimited.
	 *
	 * @return array<string, int>
	 */
	public static function defaults() {
		return array(
			self::LOCATIONS => 1,
			self::SERVICES  => 5,
		);
	}

	/**
	 * The limits in force, after filtering.
	 *
	 * @return array<string, int>
	 */
	public static function all() {
		/**
		 * Filters the plan limits. 0 means unlimited.
		 *
		 * @param array<string, int> $limits Limits keyed by resource.
		 */
		$limits = apply_filters( 'fhint_limits', self::defaults() );

		if ( ! is_array( $limits ) ) {
			return self::defaults();
		}

		foreach ( self::defaults() as $key => $default ) {
			$limits[ $key ] = isset( $limits[ $key ] ) && is_numeric( $limits[ $key ] )
				? max( 0, (int) $limits[ $key ] )
				: $default;
		}

		return $limits;
	}

	/**
	 * The limit for one resource. 0 means unlimited.
	 *
	 * @param string $resource One of the class constants.
	 * @return int
	 */
	public static function get( $resource ) {
		$limits = self::all();

		return isset( $limits[ $resource ] ) ? (int) $limits[ $resource ] : 0;
	}

	/**
	 * Whether another one may be created given how many already exist.
	 *
	 * @param string $resource One of the class constants.
	 * @param int    $current  How many exist now.
	 * @return bool
	 */
	public static function can_add( $resource, $current ) {
		$limit = self::get( $resource );

		return 0 === $limit || (int) $current < $limit;
	}

	/**
	 * Limit state for a REST meta payload.
	 *
	 * @param string $resource One of the class constants.
	 * @param int    $current  How many exist now.
	 * @return array
	 */
	public static function report( $resource, $current ) {
		$limit = self::get( $resource );

		return array(
			'limit'     => $limit,
			'used'      => (int) $current,
			'remaining' => 0 === $limit ? null : max( 0, $limit - (int) $current ),
			'unlimited' => 0 === $limit,
			'can_add'   => self::can_add( $resource, $current ),
		);
	}
}
