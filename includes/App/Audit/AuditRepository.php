<?php
/**
 * Storage for audit runs and their findings.
 *
 * @package FoundHint
 */

namespace FHINT\App\Audit;

use FHINT\Database\Tables;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes `fhint_audits` and `fhint_audit_issues`.
 *
 * A run is written in two steps — a `running` row first, then completed
 * with its results — so **a run that dies leaves a `failed` row rather than
 * nothing**. An audit that vanishes when a rule throws looks to the
 * operator exactly like an audit that was never started.
 */
class AuditRepository {

	const STATUS_RUNNING   = 'running';
	const STATUS_COMPLETED = 'completed';
	const STATUS_FAILED    = 'failed';

	/**
	 * How many completed runs to keep.
	 *
	 * History is worth something — a score moving is the point — but an
	 * unbounded log of every scheduled run is a table nobody prunes.
	 */
	const KEEP_RUNS = 30;

	/**
	 * Open a run.
	 *
	 * @param int    $business_id  Business being audited.
	 * @param int    $location_id  Location, 0 for the business as a whole.
	 * @param string $triggered_by manual | schedule | fix.
	 * @param int    $user_id      Who triggered it, 0 for the scheduler.
	 * @return int Audit id, 0 on failure.
	 */
	public static function start( $business_id, $location_id, $triggered_by, $user_id ) {
		global $wpdb;

		$now = current_time( 'mysql', true );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$inserted = $wpdb->insert(
			Tables::name( Tables::AUDITS ),
			array(
				'business_id'  => (int) $business_id,
				'location_id'  => (int) $location_id,
				'status'       => self::STATUS_RUNNING,
				'triggered_by' => (string) $triggered_by,
				'user_id'      => (int) $user_id,
				'started_at'   => $now,
				'created_at'   => $now,
				'updated_at'   => $now,
			)
		);

		return $inserted ? (int) $wpdb->insert_id : 0;
	}

	/**
	 * Close a run with its results.
	 *
	 * @param int   $audit_id Audit id.
	 * @param array $summary  Score, band, categories and counts.
	 * @return bool
	 */
	public static function complete( $audit_id, array $summary ) {
		global $wpdb;

		$now = current_time( 'mysql', true );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$updated = $wpdb->update(
			Tables::name( Tables::AUDITS ),
			array(
				'status'          => self::STATUS_COMPLETED,
				'score'           => (int) $summary['score'],
				'score_band'      => (string) $summary['band'],
				'category_scores' => wp_json_encode( $summary['categories'] ),
				'rules_run'       => (int) $summary['rules_run'],
				'issues_total'    => (int) $summary['issues_total'],
				'issues_critical' => (int) $summary['issues_critical'],
				'issues_high'     => (int) $summary['issues_high'],
				'issues_medium'   => (int) $summary['issues_medium'],
				'issues_low'      => (int) $summary['issues_low'],
				'issues_passed'   => (int) $summary['issues_passed'],
				'completed_at'    => $now,
				'updated_at'      => $now,
			),
			array( 'id' => (int) $audit_id )
		);

		return false !== $updated;
	}

	/**
	 * Record that a run died.
	 *
	 * @param int    $audit_id Audit id.
	 * @param string $message  What went wrong.
	 * @return void
	 */
	public static function fail( $audit_id, $message ) {
		global $wpdb;

		$now = current_time( 'mysql', true );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->update(
			Tables::name( Tables::AUDITS ),
			array(
				'status'        => self::STATUS_FAILED,
				'error_message' => (string) $message,
				'completed_at'  => $now,
				'updated_at'    => $now,
			),
			array( 'id' => (int) $audit_id )
		);
	}

	/**
	 * Write one rule result.
	 *
	 * @param int   $audit_id Audit id.
	 * @param array $row      Issue row.
	 * @return void
	 */
	public static function add_issue( $audit_id, array $row ) {
		global $wpdb;

		$now = current_time( 'mysql', true );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->insert(
			Tables::name( Tables::AUDIT_ISSUES ),
			array(
				'audit_id'       => (int) $audit_id,
				'rule_id'        => (string) $row['rule_id'],
				'type'           => (string) $row['type'],
				'category'       => (string) $row['category'],
				'severity'       => (string) $row['severity'],
				'entity_type'    => (string) $row['entity_type'],
				'entity_id'      => (int) $row['entity_id'],
				'message'        => (string) $row['message'],
				'recommendation' => (string) $row['recommendation'],
				'context'        => wp_json_encode( $row['context'] ),
				'fixable'        => empty( $row['fix_handler'] ) ? 0 : 1,
				'fix_handler'    => (string) $row['fix_handler'],
				'status'         => 'open',
				'created_at'     => $now,
				'updated_at'     => $now,
			)
		);
	}

	/**
	 * The most recent completed run.
	 *
	 * @return array|null
	 */
	public static function latest() {
		global $wpdb;

		$table = Tables::name( Tables::AUDITS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT * FROM {$table} WHERE status = %s ORDER BY completed_at DESC, id DESC LIMIT 1",
				self::STATUS_COMPLETED
			),
			ARRAY_A
		);

		return $row ? self::to_array( $row ) : null;
	}

	/**
	 * One run by id.
	 *
	 * @param int $id Audit id.
	 * @return array|null
	 */
	public static function find( $id ) {
		global $wpdb;

		$table = Tables::name( Tables::AUDITS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", (int) $id ),
			ARRAY_A
		);

		return $row ? self::to_array( $row ) : null;
	}

	/**
	 * Recent completed runs, newest first.
	 *
	 * @param int $limit How many.
	 * @return array[]
	 */
	public static function history( $limit = 10 ) {
		global $wpdb;

		$table = Tables::name( Tables::AUDITS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT * FROM {$table} WHERE status = %s ORDER BY completed_at DESC, id DESC LIMIT %d",
				self::STATUS_COMPLETED,
				(int) $limit
			),
			ARRAY_A
		);

		return array_map( array( __CLASS__, 'to_array' ), is_array( $rows ) ? $rows : array() );
	}

	/**
	 * Every completed run for one location, for comparing scores over time.
	 *
	 * Filtered by location so a trend never compares one branch's score with
	 * another's. Bounded by retention, so this is at most `KEEP_RUNS` rows.
	 *
	 * @param int $location_id Location the runs covered.
	 * @return array[] Each with id, score and completed_at, newest first.
	 */
	public static function completed_runs( $location_id ) {
		global $wpdb;

		$table = Tables::name( Tables::AUDITS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT id, score, completed_at FROM {$table} WHERE status = %s AND location_id = %d ORDER BY completed_at DESC, id DESC LIMIT %d",
				self::STATUS_COMPLETED,
				(int) $location_id,
				self::KEEP_RUNS
			),
			ARRAY_A
		);

		$runs = array();

		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$runs[] = array(
				'id'           => (int) $row['id'],
				'score'        => (int) $row['score'],
				'completed_at' => (string) $row['completed_at'],
			);
		}

		return $runs;
	}

	/**
	 * How many findings from one run are still open, by severity.
	 *
	 * Counted from the rows rather than read from the run's own totals:
	 * those totals are fixed at the moment the audit finished, and a finding
	 * the operator has since fixed or chosen to ignore is no longer something
	 * to send them to look at.
	 *
	 * @param int $audit_id Audit id.
	 * @return array Total plus a count per severity.
	 */
	public static function open_counts( $audit_id ) {
		global $wpdb;

		$table = Tables::name( Tables::AUDIT_ISSUES );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT severity, COUNT(*) AS total FROM {$table} WHERE audit_id = %d AND type = %s AND status = %s GROUP BY severity",
				(int) $audit_id,
				'issue',
				'open'
			),
			ARRAY_A
		);

		$counts = array_fill_keys( Severity::all(), 0 );

		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			if ( isset( $counts[ $row['severity'] ] ) ) {
				$counts[ $row['severity'] ] = (int) $row['total'];
			}
		}

		return array(
			'total'       => array_sum( $counts ),
			'by_severity' => $counts,
		);
	}

	/**
	 * A run's rule results.
	 *
	 * @param int    $audit_id Audit id.
	 * @param string $type     issue | pass | '' for both.
	 * @return array[]
	 */
	public static function issues( $audit_id, $type = 'issue' ) {
		global $wpdb;

		$table = Tables::name( Tables::AUDIT_ISSUES );

		if ( '' === $type ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$rows = $wpdb->get_results(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$wpdb->prepare( "SELECT * FROM {$table} WHERE audit_id = %d ORDER BY id ASC", (int) $audit_id ),
				ARRAY_A
			);
		} else {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$rows = $wpdb->get_results(
				$wpdb->prepare(
					// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					"SELECT * FROM {$table} WHERE audit_id = %d AND type = %s ORDER BY id ASC",
					(int) $audit_id,
					(string) $type
				),
				ARRAY_A
			);
		}

		$issues = array_map( array( __CLASS__, 'issue_to_array' ), is_array( $rows ) ? $rows : array() );

		return self::by_urgency( $issues );
	}

	/**
	 * Order findings most urgent first.
	 *
	 * Sorted here rather than in SQL because severity is a set of words, not
	 * an order MySQL knows, and here rather than in each screen because a
	 * list that claims to be urgent-first has to be urgent-first everywhere
	 * — the audit screen, the dashboard, and anything Pro adds.
	 *
	 * Ties keep their insertion order, which is rule registration order, so
	 * two findings of equal severity stay grouped by the area they concern.
	 *
	 * @param array[] $issues Findings.
	 * @return array[]
	 */
	private static function by_urgency( array $issues ) {
		$indexed = array();

		foreach ( $issues as $position => $issue ) {
			$indexed[] = array( $position, $issue );
		}

		usort(
			$indexed,
			static function ( $a, $b ) {
				$rank = Severity::rank( $a[1]['severity'] ) - Severity::rank( $b[1]['severity'] );

				return 0 !== $rank ? $rank : $a[0] - $b[0];
			}
		);

		$sorted = array();

		foreach ( $indexed as $entry ) {
			$sorted[] = $entry[1];
		}

		return $sorted;
	}

	/**
	 * One finding by id.
	 *
	 * @param int $id Issue id.
	 * @return array|null
	 */
	public static function find_issue( $id ) {
		global $wpdb;

		$table = Tables::name( Tables::AUDIT_ISSUES );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", (int) $id ),
			ARRAY_A
		);

		return $row ? self::issue_to_array( $row ) : null;
	}

	/**
	 * Change a finding's status.
	 *
	 * @param int    $id     Issue id.
	 * @param string $status open | resolved | ignored.
	 * @return bool
	 */
	public static function set_issue_status( $id, $status ) {
		global $wpdb;

		$now = current_time( 'mysql', true );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$updated = $wpdb->update(
			Tables::name( Tables::AUDIT_ISSUES ),
			array(
				'status'      => (string) $status,
				'resolved_at' => 'resolved' === $status ? $now : null,
				'updated_at'  => $now,
			),
			array( 'id' => (int) $id )
		);

		return false !== $updated;
	}

	/**
	 * Delete runs beyond the retention limit, and their findings.
	 *
	 * @return int Runs removed.
	 */
	public static function prune() {
		global $wpdb;

		$audits = Tables::name( Tables::AUDITS );
		$issues = Tables::name( Tables::AUDIT_ISSUES );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$keep = $wpdb->get_col(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT id FROM {$audits} ORDER BY id DESC LIMIT %d", self::KEEP_RUNS )
		);

		if ( ! $keep ) {
			return 0;
		}

		$ids = implode( ',', array_map( 'intval', $keep ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$removed = (int) $wpdb->query( "DELETE FROM {$audits} WHERE id NOT IN ({$ids})" );

		// The issue rows go with them: no foreign keys here, so the cascade
		// is this line and nothing else.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$wpdb->query( "DELETE FROM {$issues} WHERE audit_id NOT IN ({$ids})" );

		return $removed;
	}

	/**
	 * Normalise an audit row.
	 *
	 * @param array $row Raw row.
	 * @return array
	 */
	private static function to_array( array $row ) {
		$categories = isset( $row['category_scores'] ) ? json_decode( (string) $row['category_scores'], true ) : array();

		return array(
			'id'              => (int) $row['id'],
			'business_id'     => (int) $row['business_id'],
			'location_id'     => (int) $row['location_id'],
			'status'          => (string) $row['status'],
			'score'           => (int) $row['score'],
			'score_band'      => (string) $row['score_band'],
			'category_scores' => is_array( $categories ) ? $categories : array(),
			'rules_run'       => (int) $row['rules_run'],
			'issues_total'    => (int) $row['issues_total'],
			'issues_critical' => (int) $row['issues_critical'],
			'issues_high'     => (int) $row['issues_high'],
			'issues_medium'   => (int) $row['issues_medium'],
			'issues_low'      => (int) $row['issues_low'],
			'issues_passed'   => (int) $row['issues_passed'],
			'triggered_by'    => (string) $row['triggered_by'],
			'error_message'   => (string) $row['error_message'],
			'started_at'      => (string) $row['started_at'],
			'completed_at'    => (string) $row['completed_at'],
		);
	}

	/**
	 * Normalise an issue row.
	 *
	 * @param array $row Raw row.
	 * @return array
	 */
	private static function issue_to_array( array $row ) {
		$context = isset( $row['context'] ) ? json_decode( (string) $row['context'], true ) : array();

		return array(
			'id'             => (int) $row['id'],
			'audit_id'       => (int) $row['audit_id'],
			'rule_id'        => (string) $row['rule_id'],
			'type'           => (string) $row['type'],
			'category'       => (string) $row['category'],
			'severity'       => (string) $row['severity'],
			'entity_type'    => (string) $row['entity_type'],
			'entity_id'      => (int) $row['entity_id'],
			'message'        => (string) $row['message'],
			'recommendation' => (string) $row['recommendation'],
			'context'        => is_array( $context ) ? $context : array(),
			'fixable'        => (bool) $row['fixable'],
			'fix_handler'    => (string) $row['fix_handler'],
			'status'         => (string) $row['status'],
		);
	}
}
