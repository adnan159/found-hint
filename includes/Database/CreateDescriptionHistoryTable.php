<?php
/**
 * Business description history table.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * Every description the business has had, newest kept alongside the rest.
 *
 * The description is the one field people rewrite repeatedly, often at the
 * suggestion of a tool, and then want back. Keeping the old ones costs a few
 * hundred bytes and turns "I preferred the last one" from a loss into a
 * click.
 *
 * **A row is written when a description changes, not when it is saved.**
 * Saving the same words twice is not a revision, and a history full of
 * identical entries is a history nobody reads.
 *
 * `source` is kept because it answers the question the owner actually asks
 * when reviewing the list: did I write this, did the tool, or did it come
 * from Google?
 *
 * @column id          Primary key.
 * @column business_id Row id in wp_fhint_business.
 * @column description The text as it stood.
 * @column source      user | ai | google — where this wording came from.
 * @column user_id     WordPress user who made the change, 0 when unknown.
 * @column created_at  When this version was recorded, UTC.
 */
class CreateDescriptionHistoryTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed — empty when the table was
	 *               already up to date, which is the idempotency check.
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::DESCRIPTION_HISTORY;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	business_id bigint(20) unsigned NOT NULL default 0,
	description longtext NULL,
	source varchar(32) NOT NULL default 'user',
	user_id bigint(20) unsigned NOT NULL default 0,
	created_at datetime NULL,
	PRIMARY KEY  (id),
	KEY business_id (business_id),
	KEY created_at (created_at)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
