<?php
/**
 * Logs table.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * Creates the fhint_logs table.
 *
 * An event log for support and debugging: what the plugin did, when, and to
 * what. Trimmed on a schedule to the configured retention period so it can
 * never grow without bound on a busy site.
 *
 * **Never log a secret.** API keys, tokens and credentials must be redacted
 * before they reach this table — a log is the most-pasted artefact in any
 * support thread, and a value written here has effectively been published.
 *
 * Columns
 * -------
 *
 * @column id          Auto-increment primary key.
 * @column level       debug | info | notice | warning | error | critical.
 * @column module      Which part of the plugin emitted this, e.g. 'business', 'audit'.
 * @column event       Machine-readable event name, e.g. 'business.updated'. Queryable,
 *                     unlike free text.
 * @column message     Human-readable detail.
 * @column location_id Location the event concerned, 0 when not location-specific.
 * @column user_id     WP user who caused it, 0 for system events.
 * @column request_id  Correlates several entries written during one request.
 * @column metadata    JSON structured context, redacted of anything credential-shaped.
 * @column created_at  When the event happened, UTC.
 */
class CreateLogsTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed — empty when the table was
	 *               already up to date, which is the idempotency check.
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::LOGS;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	level varchar(20) NOT NULL default 'info',
	module varchar(50) NOT NULL default '',
	event varchar(100) NOT NULL default '',
	message text NULL,
	location_id bigint(20) unsigned NOT NULL default 0,
	user_id bigint(20) unsigned NOT NULL default 0,
	request_id varchar(64) NOT NULL default '',
	metadata longtext NULL,
	created_at datetime NULL,
	PRIMARY KEY  (id),
	KEY level (level),
	KEY module (module),
	KEY event (event),
	KEY location_id (location_id),
	KEY user_id (user_id),
	KEY request_id (request_id),
	KEY created_at (created_at)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
