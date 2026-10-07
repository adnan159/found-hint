<?php
/**
 * Cached Google reference data table.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * Google's own vocabulary, cached: categories, service types, attributes.
 *
 * None of this is the operator's data. It is the list of things Google will
 * accept — the categories a business may claim, the services Google already
 * knows for a category, the attributes that exist for it — and it is needed
 * before a single field can be pushed, because Google wants ids where this
 * plugin shows names.
 *
 * **It is cached because fetching it is expensive and it barely moves.** The
 * category list runs to thousands of entries per language. Fetching it on
 * every save would spend a shared quota on an answer that was the same
 * yesterday; `fetched_at` is what lets a refresh be deliberate rather than
 * constant.
 *
 * **It is per language.** Google returns display names in the language asked
 * for, and a site in French must show French categories while sending the
 * same ids. `language_code` keeps those apart rather than letting the last
 * fetch win.
 *
 * `parent_id` is what makes one table enough: a category has no parent, while
 * a service type and an attribute both belong to a category. Asking "what can
 * this dentist offer?" is one indexed lookup.
 *
 * @column id            Primary key.
 * @column kind          category | service_type | attribute.
 * @column item_id       Google's id, e.g. 'gcid:dentist' or 'url_facebook'.
 * @column parent_id     The category this belongs to, empty for a category.
 * @column language_code The language the display name is in, e.g. 'en'.
 * @column display_name  What a person reads.
 * @column value_type    For attributes: bool | enum | repeated_enum | url.
 * @column payload       The entry as Google sent it, for fields no column
 *                       covers yet.
 * @column fetched_at    When Google last answered for this entry, UTC.
 * @column created_at    Row creation timestamp, UTC.
 * @column updated_at    Last write timestamp, UTC.
 */
class CreateGoogleReferenceTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed — empty when the table was
	 *               already up to date, which is the idempotency check.
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::GOOGLE_REFERENCE;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	kind varchar(32) NOT NULL default '',
	item_id varchar(150) NOT NULL default '',
	parent_id varchar(100) NOT NULL default '',
	language_code varchar(16) NOT NULL default '',
	display_name varchar(255) NOT NULL default '',
	value_type varchar(32) NOT NULL default '',
	payload longtext NULL,
	fetched_at datetime NULL,
	created_at datetime NULL,
	updated_at datetime NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY entry (kind,item_id,parent_id,language_code),
	KEY kind_parent (kind,parent_id),
	KEY fetched_at (fetched_at)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
