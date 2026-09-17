<?php
/**
 * Running an audit.
 *
 * @package FoundHint
 */

namespace FHINT\App\Audit;

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Core\Logger;
use Throwable;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Executes the rule set and stores what it found.
 *
 * **An audit never runs on a front-end request.** It runs when somebody
 * asks for one, or on the schedule; the front end and the dashboard read
 * stored figures. That is not a performance nicety — a measurement taken
 * on a render path makes every page view depend on every rule, and a slow
 * rule becomes a slow website.
 *
 * A rule that throws is caught and recorded as a finding against itself
 * rather than killing the run. One broken extension should cost its own
 * check, not the other twenty-one.
 */
class Runner {

	const TRIGGER_MANUAL   = 'manual';
	const TRIGGER_SCHEDULE = 'schedule';
	const TRIGGER_FIX      = 'fix';

	/**
	 * Run an audit and store the result.
	 *
	 * @param int    $location_id  Location to audit, 0 for the primary one.
	 * @param string $triggered_by One of the trigger constants.
	 * @return array|WP_Error The stored run.
	 */
	public static function run( $location_id = 0, $triggered_by = self::TRIGGER_MANUAL ) {
		$context = Context::build( $location_id );

		if ( ! $context->has_subject() ) {
			return new WP_Error(
				'fhint_audit_no_business',
				__( 'Add your business details before running an audit.', 'found-hint' ),
				array( 'status' => 409 )
			);
		}

		$audit_id = AuditRepository::start(
			$context->business_id(),
			$context->location_id(),
			$triggered_by,
			function_exists( 'get_current_user_id' ) ? get_current_user_id() : 0
		);

		if ( ! $audit_id ) {
			return new WP_Error(
				'fhint_audit_start_failed',
				__( 'The audit could not be started.', 'found-hint' ),
				array( 'status' => 500 )
			);
		}

		try {
			$entries = self::evaluate( $context );
			$summary = self::summarise( $entries );

			foreach ( $entries as $entry ) {
				$result = $entry['result'];

				if ( ! $result->counts() ) {
					// Skipped rules are not stored. A row saying "this did
					// not apply" is noise in a list the operator is meant to
					// work through.
					continue;
				}

				AuditRepository::add_issue( $audit_id, self::to_row( $entry ) );
			}

			AuditRepository::complete( $audit_id, $summary );
			AuditRepository::prune();

			Logger::log(
				Logger::INFO,
				'audit',
				'audit.completed',
				sprintf(
					/* translators: 1: score, 2: number of findings. */
					__( 'Audit scored %1$d with %2$d findings.', 'found-hint' ),
					$summary['score'],
					$summary['issues_total']
				)
			);

			return AuditRepository::find( $audit_id );
		} catch ( Throwable $error ) {
			// Recorded rather than swallowed: a failed run is visible, which
			// is the difference between a broken audit and one nobody ran.
			AuditRepository::fail( $audit_id, $error->getMessage() );

			Logger::log( Logger::ERROR, 'audit', 'audit.failed', $error->getMessage() );

			return new WP_Error(
				'fhint_audit_failed',
				__( 'The audit did not finish.', 'found-hint' ),
				array( 'status' => 500 )
			);
		}
	}

	/**
	 * Evaluate every rule against one context.
	 *
	 * Public so a caller can preview what an audit *would* find without
	 * storing a run — the dashboard's "what would change" and the fix
	 * handlers both want that.
	 *
	 * @param Context $context Site snapshot.
	 * @return array[] Each array( 'rule' => Rule, 'result' => Result ).
	 */
	public static function evaluate( Context $context ) {
		$entries = array();

		foreach ( Registry::rules() as $rule ) {
			try {
				$result = $rule->evaluate( $context );
			} catch ( Throwable $error ) {
				$result = Result::fail(
					sprintf(
						/* translators: %s: rule identifier. */
						__( 'The check "%s" could not run.', 'found-hint' ),
						$rule->id()
					),
					__( 'This is a fault in the check itself, not in your business details.', 'found-hint' ),
					array( 'error' => $error->getMessage() )
				);
			}

			if ( ! $result instanceof Result ) {
				continue;
			}

			$entries[] = array(
				'rule'   => $rule,
				'result' => $result,
			);
		}

		return $entries;
	}

	/**
	 * Turn results into the columns an audit row stores.
	 *
	 * @param array[] $entries Rule results.
	 * @return array
	 */
	public static function summarise( array $entries ) {
		$score = Score::calculate( $entries );

		$summary = array(
			'score'           => $score['score'],
			'band'            => $score['band'],
			'categories'      => $score['categories'],
			'rules_run'       => 0,
			'issues_total'    => 0,
			'issues_critical' => 0,
			'issues_high'     => 0,
			'issues_medium'   => 0,
			'issues_low'      => 0,
			'issues_passed'   => 0,
		);

		foreach ( $entries as $entry ) {
			$result = $entry['result'];

			if ( ! $result->counts() ) {
				continue;
			}

			$summary['rules_run']++;

			if ( $result->passed() ) {
				$summary['issues_passed']++;
				continue;
			}

			$summary['issues_total']++;

			$key = 'issues_' . $entry['rule']->severity();

			if ( isset( $summary[ $key ] ) ) {
				$summary[ $key ]++;
			}
		}

		return $summary;
	}

	/**
	 * Build the issue row for one result.
	 *
	 * @param array $entry array( 'rule' => Rule, 'result' => Result ).
	 * @return array
	 */
	private static function to_row( array $entry ) {
		$rule   = $entry['rule'];
		$result = $entry['result'];
		$passed = $result->passed();

		return array(
			'rule_id'        => $rule->id(),
			'type'           => $passed ? 'pass' : 'issue',
			'category'       => $rule->category(),
			// A pass has no severity: there is nothing to be urgent about,
			// and storing one would make "critical" counts meaningless.
			'severity'       => $passed ? '' : $rule->severity(),
			'entity_type'    => $result->entity_type,
			'entity_id'      => $result->entity_id,
			'message'        => $result->message,
			'recommendation' => $result->recommendation,
			'context'        => $result->context,
			'fix_handler'    => $passed ? '' : $result->fix_handler,
		);
	}

	/**
	 * Whether the stored score is older than the data it describes.
	 *
	 * The dashboard shows a stale score **with a warning** rather than
	 * hiding it or silently re-running: re-measuring on a render path is
	 * exactly what this design forbids, and hiding the number leaves the
	 * operator with nothing.
	 *
	 * @param array|null $audit The stored run.
	 * @return bool
	 */
	public static function is_stale( $audit ) {
		if ( ! $audit || empty( $audit['completed_at'] ) ) {
			return false;
		}

		$changed = (int) get_option( 'fhint_data_changed_at', 0 );

		if ( ! $changed ) {
			return false;
		}

		return $changed > (int) strtotime( $audit['completed_at'] . ' UTC' );
	}

	/**
	 * The business id an audit would run against.
	 *
	 * @return int
	 */
	public static function business_id() {
		return (int) BusinessRepository::current_id();
	}
}
