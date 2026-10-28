<?php
/**
 * Schema Manager: per-entity schema settings.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * One row per thing the Schema Manager describes — the business, a
 * location, a service — holding only what schema adds on top of the
 * record that already exists for it.
 *
 * **Not a copy of the business data.** Name, phone, address and hours stay
 * in the business, locations and services tables (one source of truth, see
 * `Nap`). A value typed on the Schema screen is an *override* for the markup
 * only, kept here with the Google value it replaced, so the screen can say
 * "Edited here" and "Use Google's value", and warn when Google later changes.
 *
 * The free plugin creates this table; FoundHint Pro reads and writes it
 * (docs/SCHEMA-PLAN.md). No row for an entity means every default: the type
 * derived from the Google category, no overrides, active, default placement.
 *
 * **Status lifecycle:** `draft` (saved, never printed — the state a record
 * with a missing required field is held in) → `active` (printed) ⇄
 * `inactive` (kept, not printed).
 *
 * @column id          Primary key.
 * @column entity_kind business | location | service.
 * @column entity_id   Row id in fhint_business / fhint_locations / fhint_services.
 * @column schema_kind Business only: localbusiness | organization. '' for others.
 * @column schema_type Schema.org type chosen on the screen, e.g. 'Dentist'.
 *                     '' = derive it from the Google category.
 * @column overrides   JSON object { field: value } — values typed on the Schema
 *                     screen, used in the markup instead of the stored record's.
 * @column google_seen JSON object { field: value } — the Google value each
 *                     override replaced. When Google's value later differs,
 *                     the screen warns that the website and Google disagree.
 * @column extras      JSON object — properties the stored records have no
 *                     column for: type extras (isAcceptingNewPatients,
 *                     medicalSpecialty…), chosen photos, service extras
 *                     (serviceType, provider person, pricing, page).
 * @column status      draft | active | inactive. Only active is printed.
 * @column schema_id   The @id as first built. Kept stable; rewritten only when
 *                     the URL it is built from changes.
 * @column placement   every_page | home_only | chosen | own_page.
 * @column post_ids    JSON array of post ids, for placement "chosen".
 * @column sort_order  Services: list order, which is output order.
 * @column created_at  Row creation timestamp, UTC.
 * @column updated_at  Last write timestamp, UTC.
 */
class CreateSchemaEntitiesTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed.
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::SCHEMA_ENTITIES;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	entity_kind varchar(20) NOT NULL default '',
	entity_id bigint(20) unsigned NOT NULL default 0,
	schema_kind varchar(20) NOT NULL default '',
	schema_type varchar(100) NOT NULL default '',
	overrides longtext NULL,
	google_seen longtext NULL,
	extras longtext NULL,
	status varchar(20) NOT NULL default 'active',
	schema_id varchar(500) NOT NULL default '',
	placement varchar(20) NOT NULL default '',
	post_ids longtext NULL,
	sort_order int(11) NOT NULL default 0,
	created_at datetime NULL,
	updated_at datetime NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY entity (entity_kind,entity_id),
	KEY status (status),
	KEY placement (placement)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
