<?php
/**
 * Guided setup position.
 *
 * @package FoundHint
 */

namespace FHINT\App\Onboarding;

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Location\LocationRepository;
use FHINT\App\Location\OpeningHoursRepository;
use FHINT\App\Service\ServiceRepository;

defined( 'ABSPATH' ) || exit;

/**
 * Where the operator has got to in guided setup.
 *
 * **This stores a position and nothing else.** Every value the wizard
 * collects is written through the ordinary REST routes — PUT /business,
 * POST /locations, POST /services — so there is exactly one set of
 * validation rules and one write path per entity. A second one here would
 * mean two places to keep in step, and would make "start over" capable of
 * destroying real work. Restarting only rewinds the position.
 *
 * Whether a step is *done* is answered from the live data every time, not
 * from a stored flag. A business named through the Business screen, WP-CLI
 * or the REST API therefore counts as done without the wizard ever having
 * been opened — which is what stops setup asking for something the site
 * already has.
 */
class Onboarding {

	/**
	 * Option holding the position. Position keys only.
	 */
	const OPTION = 'fhint_onboarding';

	const STATUS_NOT_STARTED = 'not_started';
	const STATUS_IN_PROGRESS = 'in_progress';
	const STATUS_DONE        = 'done';
	const STATUS_DISMISSED   = 'dismissed';

	/**
	 * The steps, in order.
	 *
	 * They cover what this plugin can actually do today. The prototype's
	 * wizard asks about Google Business Profile in steps two and three;
	 * there is no Google integration behind that, and a step whose button
	 * does nothing is worse than an absent step.
	 *
	 * @return string[]
	 */
	public static function steps() {
		return array( 'welcome', 'business', 'location', 'hours', 'services', 'done' );
	}

	/**
	 * Steps that collect something, as opposed to the bookends.
	 *
	 * @return string[]
	 */
	public static function data_steps() {
		return array( 'business', 'location', 'hours', 'services' );
	}

	/**
	 * Whether the site already holds what a step asks for.
	 *
	 * @param string $step Step id.
	 * @return bool
	 */
	public static function has_data( $step ) {
		switch ( $step ) {
			case 'business':
				$business = BusinessRepository::get();

				return $business && '' !== trim( (string) $business['name'] );

			case 'location':
				$location = LocationRepository::primary();

				return $location
					&& '' !== trim( (string) $location['address_line_1'] )
					&& '' !== trim( (string) $location['city'] );

			case 'hours':
				$location = LocationRepository::primary();

				if ( ! $location ) {
					return false;
				}

				return (bool) OpeningHoursRepository::for_location( $location['id'] );

			case 'services':
				return ServiceRepository::count() > 0;
		}

		return false;
	}

	/**
	 * The stored position, with every key present.
	 *
	 * @return array
	 */
	public static function position() {
		$stored = get_option( self::OPTION, array() );
		$stored = is_array( $stored ) ? $stored : array();

		return array(
			'status'     => isset( $stored['status'] ) ? (string) $stored['status'] : self::STATUS_NOT_STARTED,
			'current'    => isset( $stored['current'] ) && in_array( $stored['current'], self::steps(), true )
				? (string) $stored['current']
				: 'welcome',
			'completed'  => isset( $stored['completed'] ) && is_array( $stored['completed'] ) ? array_values( $stored['completed'] ) : array(),
			'skipped'    => isset( $stored['skipped'] ) && is_array( $stored['skipped'] ) ? array_values( $stored['skipped'] ) : array(),
			'started_at' => isset( $stored['started_at'] ) ? (int) $stored['started_at'] : 0,
			'ended_at'   => isset( $stored['ended_at'] ) ? (int) $stored['ended_at'] : 0,
		);
	}

	/**
	 * The full state a client needs: position plus live per-step status.
	 *
	 * @return array
	 */
	public static function state() {
		$position = self::position();
		$steps    = array();
		$done     = 0;

		foreach ( self::steps() as $index => $step ) {
			$is_data  = in_array( $step, self::data_steps(), true );
			$has_data = $is_data && self::has_data( $step );
			$complete = $has_data || in_array( $step, $position['completed'], true );

			if ( $is_data && $complete ) {
				$done++;
			}

			$steps[] = array(
				'id'           => $step,
				'position'     => $index + 1,
				'is_data_step' => $is_data,
				'has_data'     => $has_data,
				'completed'    => in_array( $step, $position['completed'], true ),
				'skipped'      => in_array( $step, $position['skipped'], true ),
				'done'         => $complete,
			);
		}

		$current_index = array_search( $position['current'], self::steps(), true );
		$all           = self::steps();

		return array_merge(
			$position,
			array(
				'steps'         => $steps,
				'total_steps'   => count( self::data_steps() ),
				'done_steps'    => $done,
				'is_open'       => self::STATUS_DONE !== $position['status'] && self::STATUS_DISMISSED !== $position['status'],
				'next_step'     => isset( $all[ $current_index + 1 ] ) ? $all[ $current_index + 1 ] : '',
				'previous_step' => $current_index > 0 ? $all[ $current_index - 1 ] : '',
			)
		);
	}

	/**
	 * Move the position.
	 *
	 * @param string $action go|complete|skip|finish|dismiss|restart.
	 * @param string $step   Step the action applies to; defaults to current.
	 * @return array The new state.
	 */
	public static function apply( $action, $step = '' ) {
		$position = self::position();
		$steps    = self::steps();
		$step     = in_array( $step, $steps, true ) ? $step : $position['current'];

		if ( ! $position['started_at'] ) {
			$position['started_at'] = time();
		}

		if ( self::STATUS_NOT_STARTED === $position['status'] ) {
			$position['status'] = self::STATUS_IN_PROGRESS;
		}

		switch ( $action ) {
			case 'go':
				$position['current'] = $step;
				break;

			case 'complete':
			case 'skip':
				$key = 'complete' === $action ? 'completed' : 'skipped';

				if ( ! in_array( $step, $position[ $key ], true ) ) {
					$position[ $key ][] = $step;
				}

				$index               = array_search( $step, $steps, true );
				$position['current'] = isset( $steps[ $index + 1 ] ) ? $steps[ $index + 1 ] : $step;
				break;

			case 'finish':
				$position['status']   = self::STATUS_DONE;
				$position['current']  = 'done';
				$position['ended_at'] = time();
				break;

			case 'dismiss':
				$position['status']   = self::STATUS_DISMISSED;
				$position['ended_at'] = time();
				break;

			case 'restart':
				// Only the position rewinds. Nothing the operator entered is
				// touched, which is what makes starting over safe.
				$position = array(
					'status'     => self::STATUS_IN_PROGRESS,
					'current'    => 'welcome',
					'completed'  => array(),
					'skipped'    => array(),
					'started_at' => time(),
					'ended_at'   => 0,
				);
				break;
		}

		update_option( self::OPTION, $position, false );

		return self::state();
	}
}
