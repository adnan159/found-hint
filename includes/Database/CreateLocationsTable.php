<?php
/**
 * Locations table.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * Creates the fhint_locations table.
 *
 * One row per physical place the business trades from. Free allows a single
 * location (enforced by App\Core\Limits, not by this schema) — the table is
 * shaped for many from the start so raising that limit is a settings change
 * rather than a migration.
 *
 * Contact columns are deliberately nullable-by-emptiness: an empty phone,
 * email or website means "use the business value", which is what lets a
 * single-location site enter its number exactly once. App\Nap\Nap resolves
 * location first, business second.
 *
 * Columns
 * -------
 *
 * @column id                Auto-increment primary key.
 * @column business_id       FK → fhint_business.id. No database-level constraint;
 *                           the repositories own referential integrity.
 * @column wordpress_post_id Post/page representing this location on the site. Ships
 *                           unused; carrying it from the first release means the
 *                           location-pages feature needs no migration later.
 * @column name              Branch name, e.g. "Downtown" or "Gulshan Branch".
 * @column address_line_1    Street address.
 * @column address_line_2    Suite, unit or floor.
 * @column city              City / locality.
 * @column region            State, province or region.
 * @column country           ISO 3166-1 alpha-2 country code, uppercase.
 * @column postal_code       Postal or ZIP code.
 * @column latitude          Decimal degrees, 7 decimal places (~11mm precision).
 *                           NULL when unknown — 0 is a real coordinate, so it
 *                           can't double as "unset".
 * @column longitude         Decimal degrees, 7 decimal places. NULL when unknown.
 * @column phone             Overrides the business phone when set.
 * @column email             Overrides the business email when set.
 * @column website           Overrides the business website when set.
 * @column timezone          PHP timezone identifier, e.g. 'Asia/Dhaka'.
 * @column status            active | inactive | temporarily_closed | permanently_closed.
 *                           Mirrors what Google lets an operator publish.
 * @column is_primary        1 for the location used when a single place is needed
 *                           (schema output, the dashboard). Exactly one row should hold it.
 * @column created_at        Row creation timestamp, UTC.
 * @column updated_at        Last write timestamp, UTC.
 */
class CreateLocationsTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return void
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::LOCATIONS;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	business_id bigint(20) unsigned NOT NULL default 0,
	wordpress_post_id bigint(20) unsigned NOT NULL default 0,
	name varchar(255) NOT NULL default '',
	address_line_1 varchar(255) NOT NULL default '',
	address_line_2 varchar(255) NOT NULL default '',
	city varchar(150) NOT NULL default '',
	region varchar(150) NOT NULL default '',
	country char(2) NOT NULL default '',
	postal_code varchar(30) NOT NULL default '',
	latitude decimal(10,7) NULL,
	longitude decimal(10,7) NULL,
	phone varchar(50) NOT NULL default '',
	email varchar(191) NOT NULL default '',
	website varchar(500) NOT NULL default '',
	timezone varchar(64) NOT NULL default '',
	status varchar(32) NOT NULL default 'active',
	is_primary tinyint(1) NOT NULL default 0,
	created_at datetime NULL,
	updated_at datetime NULL,
	PRIMARY KEY  (id),
	KEY business_id (business_id),
	KEY wordpress_post_id (wordpress_post_id),
	KEY status (status),
	KEY country_city (country,city),
	KEY created_at (created_at),
	KEY updated_at (updated_at)
) {$charset_collate};";

		dbDelta( $sql );
	}
}
