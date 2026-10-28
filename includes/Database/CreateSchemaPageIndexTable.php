<?php
/**
 * Schema Manager: which entities a page carries.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * Placement resolved ahead of time: one row per (page, entity) for entities
 * placed on chosen pages or on their own page, so a page request finds its
 * entities with one indexed lookup instead of reading every placement.
 *
 * **Derived data.** FoundHint Pro rebuilds it from fhint_schema_entities on
 * every save; it can be emptied at any time and rebuilt. Entities placed on
 * every page or on the home page only need no rows here.
 *
 * @column id          Primary key.
 * @column post_id     The WordPress post the entity is printed on.
 * @column entity_kind business | location | service.
 * @column entity_id   Row id of the entity (see fhint_schema_entities).
 */
class CreateSchemaPageIndexTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed.
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::SCHEMA_PAGE_INDEX;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	post_id bigint(20) unsigned NOT NULL default 0,
	entity_kind varchar(20) NOT NULL default '',
	entity_id bigint(20) unsigned NOT NULL default 0,
	PRIMARY KEY  (id),
	KEY post_id (post_id),
	KEY entity (entity_kind,entity_id)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
