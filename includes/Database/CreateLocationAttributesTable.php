<?php
/**
 * Google Business Profile attribute values table.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * What is true about a location: the ticks, and the social links.
 *
 * On Google these are one thing. "Wheelchair accessible entrance" and the
 * Facebook URL are both attributes, read and written through the same
 * endpoint, which is why one table holds both rather than social links
 * living somewhere prettier.
 *
 * **The value is stored as JSON, because an attribute's type is not ours to
 * decide.** Google defines each one as a boolean, an enum, a repeated enum
 * or a list of URLs, and the valid set differs by category — a dentist and a
 * hotel do not have the same attributes. `value_type` records which kind this
 * one is so a reader never has to guess, and `value` holds it in Google's own
 * shape.
 *
 * A row here means the operator has expressed an intent. An attribute with no
 * row has not been answered, which is not the same as answering "no" — and
 * the difference matters, because a push that names an attribute with no
 * value **clears it** on the live listing.
 *
 * @column id           Primary key.
 * @column location_id  Row id in wp_fhint_locations.
 * @column attribute_id Google's id without its prefix, e.g. 'url_facebook'
 *                      or 'wheelchair_accessible_entrance'.
 * @column value_type   bool | enum | repeated_enum | url — Google's own kind.
 * @column value        The value as JSON, in the shape Google expects back.
 * @column is_dirty     1 when changed here since the last push to Google.
 * @column synced_at    When this value last matched what Google reported, UTC.
 * @column created_at   Row creation timestamp, UTC.
 * @column updated_at   Last write timestamp, UTC.
 */
class CreateLocationAttributesTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed — empty when the table was
	 *               already up to date, which is the idempotency check.
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::LOCATION_ATTRIBUTES;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	location_id bigint(20) unsigned NOT NULL default 0,
	attribute_id varchar(191) NOT NULL default '',
	value_type varchar(32) NOT NULL default 'bool',
	value longtext NULL,
	is_dirty tinyint(1) NOT NULL default 0,
	synced_at datetime NULL,
	created_at datetime NULL,
	updated_at datetime NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY location_attribute (location_id,attribute_id),
	KEY location_id (location_id),
	KEY is_dirty (is_dirty)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
