<?php
/**
 * Audit issues table.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * Creates the fhint_audit_issues table.
 *
 * One row per rule result within a run — both findings and passes, so a score
 * can be recalculated from these rows alone and "22 rules ran, 19 passed" is
 * a fact rather than a subtraction.
 *
 * **Messages are stored as resolved text, not as codes.** An audit records
 * what was reported at a moment in time; re-rendering a historic finding
 * against rule copy that has since changed would misrepresent what the
 * operator was actually told.
 *
 * Columns
 * -------
 *
 * @column id             Auto-increment primary key.
 * @column audit_id       FK → fhint_audits.id. Deleting a run deletes its issues.
 * @column rule_id        Stable rule identifier, e.g. 'business.phone'. Survives
 *                        copy changes and is what a fix handler is matched against.
 * @column type           issue | pass — a pass is recorded so the denominator is known.
 * @column category       business | location | hours | schema | website | technical.
 *                        Drives the per-category score breakdown.
 * @column severity       critical | high | medium | low. Empty for a pass.
 * @column entity_type    business | location | service — what the finding is about.
 * @column entity_id      Id of that entity, 0 when site-wide.
 * @column message        What was wrong, in resolved display text.
 * @column recommendation What to do about it, in resolved display text. The plugin
 *                        tells the operator the action, not just the problem.
 * @column context        JSON detail the UI may render (found/expected values).
 * @column fixable        1 when a fix handler can apply this safely without guessing.
 * @column fix_handler    Identifier of the handler that can fix it, e.g.
 *                        'business.set_website'. Empty when not fixable.
 * @column status         open | resolved | ignored.
 * @column resolved_at    When it was resolved, UTC. NULL while open.
 * @column created_at     Row creation timestamp, UTC.
 * @column updated_at     Last write timestamp, UTC.
 */
class CreateAuditIssuesTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return void
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::AUDIT_ISSUES;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	audit_id bigint(20) unsigned NOT NULL default 0,
	rule_id varchar(100) NOT NULL default '',
	type varchar(20) NOT NULL default 'issue',
	category varchar(50) NOT NULL default '',
	severity varchar(20) NOT NULL default '',
	entity_type varchar(32) NOT NULL default '',
	entity_id bigint(20) unsigned NOT NULL default 0,
	message text NULL,
	recommendation text NULL,
	context longtext NULL,
	fixable tinyint(1) NOT NULL default 0,
	fix_handler varchar(100) NOT NULL default '',
	status varchar(20) NOT NULL default 'open',
	resolved_at datetime NULL,
	created_at datetime NULL,
	updated_at datetime NULL,
	PRIMARY KEY  (id),
	KEY audit_id (audit_id),
	KEY rule_id (rule_id),
	KEY severity (severity),
	KEY category (category),
	KEY status (status),
	KEY entity (entity_type,entity_id),
	KEY created_at (created_at),
	KEY updated_at (updated_at)
) {$charset_collate};";

		dbDelta( $sql );
	}
}
