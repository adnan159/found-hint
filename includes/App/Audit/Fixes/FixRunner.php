<?php
/**
 * Applying a fix.
 *
 * @package FoundHint
 */

namespace FHINT\App\Audit\Fixes;

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Core\Logger;
use FHINT\App\Location\LocationRepository;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * The handlers that can correct a finding without guessing.
 *
 * **"Safe" is a hard line here, not a judgement call.** A fix qualifies
 * only when the correct value is already known — the same address with
 * `https://` in front of it, or "make the one location that exists the
 * primary one". Anything that would invent a value the operator never
 * supplied is not a fix, it is this plugin making up business data and
 * publishing it under their name. Those stay findings with a
 * recommendation, and a human decides.
 *
 * That is why there is no `business.set_phone` handler, and why
 * `business.set_website` only offers the site's own home URL.
 */
class FixRunner {

	/**
	 * Every handler, keyed by the id a rule names.
	 *
	 * @return array<string, callable>
	 */
	public static function handlers() {
		$handlers = array(
			'business.force_https'  => array( __CLASS__, 'force_https' ),
			'business.set_website'  => array( __CLASS__, 'set_website' ),
			'location.set_primary'  => array( __CLASS__, 'set_primary' ),
		);

		/**
		 * Filter the available fix handlers.
		 *
		 * @param array $handlers Handler id => callable.
		 */
		return function_exists( 'apply_filters' )
			? (array) apply_filters( 'fhint_audit_fix_handlers', $handlers )
			: $handlers;
	}

	/**
	 * Whether a handler exists.
	 *
	 * @param string $handler Handler id.
	 * @return bool
	 */
	public static function can_handle( $handler ) {
		$handlers = self::handlers();

		return isset( $handlers[ $handler ] ) && is_callable( $handlers[ $handler ] );
	}

	/**
	 * Apply one fix.
	 *
	 * @param string $handler Handler id.
	 * @param array  $issue   The finding being fixed.
	 * @return array|WP_Error What changed.
	 */
	public static function apply( $handler, array $issue ) {
		if ( ! self::can_handle( $handler ) ) {
			return new WP_Error(
				'fhint_fix_unknown',
				__( 'There is no automatic fix for that.', 'found-hint' ),
				array( 'status' => 400 )
			);
		}

		$handlers = self::handlers();
		$result   = call_user_func( $handlers[ $handler ], $issue );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		Logger::log(
			Logger::INFO,
			'audit',
			'audit.fix_applied',
			sprintf(
				/* translators: %s: fix handler identifier. */
				__( 'Applied the fix "%s".', 'found-hint' ),
				$handler
			)
		);

		return $result;
	}

	/**
	 * Put the stored website address on https.
	 *
	 * Nothing is invented: the same host and path, with the scheme
	 * corrected.
	 *
	 * @param array $issue The finding.
	 * @return array|WP_Error
	 */
	public static function force_https( array $issue ) {
		$business = BusinessRepository::get();
		$website  = $business && isset( $business['website'] ) ? trim( (string) $business['website'] ) : '';

		if ( '' === $website ) {
			return new WP_Error(
				'fhint_fix_nothing_to_do',
				__( 'There is no website address to correct.', 'found-hint' ),
				array( 'status' => 409 )
			);
		}

		if ( 0 === stripos( $website, 'https://' ) ) {
			return array( 'changed' => false );
		}

		$secure = preg_replace( '#^http://#i', 'https://', $website );

		if ( $secure === $website ) {
			// Not an http address either — something this handler should not
			// be rewriting blind.
			return new WP_Error(
				'fhint_fix_not_applicable',
				__( 'That address is not a plain http one, so it was left alone.', 'found-hint' ),
				array( 'status' => 409 )
			);
		}

		BusinessRepository::save( array( 'website' => $secure ) );

		return array(
			'changed' => true,
			'field'   => 'website',
			'from'    => $website,
			'to'      => $secure,
		);
	}

	/**
	 * Use the site's own address as the business website.
	 *
	 * The one value that is genuinely known rather than guessed: the
	 * WordPress install this plugin is running inside.
	 *
	 * @param array $issue The finding.
	 * @return array|WP_Error
	 */
	public static function set_website( array $issue ) {
		$business = BusinessRepository::get();
		$current  = $business && isset( $business['website'] ) ? trim( (string) $business['website'] ) : '';

		if ( '' !== $current ) {
			return array( 'changed' => false );
		}

		$home = function_exists( 'home_url' ) ? home_url( '/' ) : '';

		if ( '' === $home ) {
			return new WP_Error(
				'fhint_fix_nothing_to_do',
				__( 'This site has no address to use.', 'found-hint' ),
				array( 'status' => 409 )
			);
		}

		BusinessRepository::save( array( 'website' => $home ) );

		return array(
			'changed' => true,
			'field'   => 'website',
			'from'    => '',
			'to'      => $home,
		);
	}

	/**
	 * Mark exactly one location primary.
	 *
	 * Applied only when the choice is not a choice: one location, or one
	 * already-primary among several. **With several locations and none
	 * primary, this refuses** — picking one would be this plugin deciding
	 * which of the operator's branches represents the business.
	 *
	 * @param array $issue The finding.
	 * @return array|WP_Error
	 */
	public static function set_primary( array $issue ) {
		$locations = LocationRepository::all();

		if ( ! $locations ) {
			return new WP_Error(
				'fhint_fix_nothing_to_do',
				__( 'There are no locations to mark.', 'found-hint' ),
				array( 'status' => 409 )
			);
		}

		$primaries = array();

		foreach ( $locations as $location ) {
			if ( ! empty( $location['is_primary'] ) ) {
				$primaries[] = (int) $location['id'];
			}
		}

		if ( 1 === count( $primaries ) ) {
			return array( 'changed' => false );
		}

		if ( count( $primaries ) > 1 ) {
			// Too many, not too few: keeping the first is a safe, reversible
			// tidy-up rather than an invention.
			LocationRepository::update( $primaries[0], array( 'is_primary' => true ) );

			return array(
				'changed' => true,
				'field'   => 'is_primary',
				'to'      => $primaries[0],
			);
		}

		if ( count( $locations ) > 1 ) {
			return new WP_Error(
				'fhint_fix_needs_a_decision',
				__( 'Several locations exist and none is marked as the main one. Choose which represents the business.', 'found-hint' ),
				array( 'status' => 409 )
			);
		}

		LocationRepository::update( (int) $locations[0]['id'], array( 'is_primary' => true ) );

		return array(
			'changed' => true,
			'field'   => 'is_primary',
			'to'      => (int) $locations[0]['id'],
		);
	}
}
