<?php
/**
 * Audits table.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * Creates the fhint_audits table.
 *
 * One row per audit run. The dashboard and the audit screen read **stored**
 * figures from the most recent completed row — they never measure on a render
 * path, which is why score and counts are columns here rather than something
 * computed on view.
 *
 * The counts are derived from the run's issue rows rather than being an
 * independent tally, so a score always remains explainable from what was
 * actually found. Run history is pruned to a fixed number of runs, deleting
 * the matching issue rows with it.
 *
 * Columns
 * -------
 *
 * @column id              Auto-increment primary key.
 * @column business_id     FK → fhint_business.id.
 * @column location_id     FK → fhint_locations.id for the location audited, 0 when
 *                         the run covered the business as a whole.
 * @column status          running | completed | failed. A run that throws is recorded
 *                         as failed rather than vanishing, so a broken rule is visible.
 * @column score           0–100 overall score for a completed run.
 * @column score_band      needs_work | fair | good | excellent — the band the score
 *                         fell into under the weights in force at the time.
 * @column category_scores JSON per-category breakdown: weight, effective weight after
 *                         renormalisation, earned, percent, checks, passed, failed.
 *                         The earned values sum to the total, so a score is explainable.
 * @column rules_run       How many rules executed. Distinguishes "everything passed"
 *                         from "nothing ran".
 * @column issues_total    Count of findings (excludes passes).
 * @column issues_critical Findings at critical severity.
 * @column issues_high     Findings at high severity.
 * @column issues_medium   Findings at medium severity.
 * @column issues_low      Findings at low severity.
 * @column issues_passed   Rules that passed.
 * @column triggered_by    manual | schedule | fix — what caused this run.
 * @column user_id         WP user who triggered it, 0 for scheduled runs.
 * @column error_message   Failure detail when status is failed.
 * @column started_at      When the run began, UTC.
 * @column completed_at    When the run finished, UTC. NULL while running.
 * @column created_at      Row creation timestamp, UTC.
 * @column updated_at      Last write timestamp, UTC.
 */
class CreateAuditsTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed — empty when the table was
	 *               already up to date, which is the idempotency check.
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::AUDITS;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	business_id bigint(20) unsigned NOT NULL default 0,
	location_id bigint(20) unsigned NOT NULL default 0,
	status varchar(32) NOT NULL default 'running',
	score smallint(5) unsigned NOT NULL default 0,
	score_band varchar(32) NOT NULL default '',
	category_scores longtext NULL,
	rules_run smallint(5) unsigned NOT NULL default 0,
	issues_total smallint(5) unsigned NOT NULL default 0,
	issues_critical smallint(5) unsigned NOT NULL default 0,
	issues_high smallint(5) unsigned NOT NULL default 0,
	issues_medium smallint(5) unsigned NOT NULL default 0,
	issues_low smallint(5) unsigned NOT NULL default 0,
	issues_passed smallint(5) unsigned NOT NULL default 0,
	triggered_by varchar(32) NOT NULL default 'manual',
	user_id bigint(20) unsigned NOT NULL default 0,
	error_message text NULL,
	started_at datetime NULL,
	completed_at datetime NULL,
	created_at datetime NULL,
	updated_at datetime NULL,
	PRIMARY KEY  (id),
	KEY business_id (business_id),
	KEY location_id (location_id),
	KEY status (status),
	KEY created_at (created_at),
	KEY updated_at (updated_at)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
