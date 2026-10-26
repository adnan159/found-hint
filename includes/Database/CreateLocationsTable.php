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
 * @column business_name     The business name this location trades under on its
 *                           own Google listing, when it differs from the
 *                           business's. Empty means "use the business name".
 *                           Not the same as `name`, which is the branch's own
 *                           label ("Downtown") inside this site. Only a location
 *                           that is not the primary one keeps its own.
 * @column description       This location's own description, when it differs
 *                           from the business's. Empty means "use the
 *                           business's". Same rule as `business_name`.
 * @column social_profiles   JSON object, network => URL: this location's own
 *                           links. NULL means "use the business's"; once set,
 *                           the whole set is the location's, so a link removed
 *                           here is not quietly replaced by the business's.
 *                           Only a location that is not the primary one keeps
 *                           its own.
 * @column primary_category  This location's own main category, when it differs
 *                           from the business's. Empty means "use the business
 *                           value" — the same rule as the contact columns. Only
 *                           a location that is not the primary one keeps its
 *                           own: two Google listings under one account can be
 *                           two kinds of business.
 * @column primary_category_id Google's id for that category, e.g. 'gcid:pet_store'.
 * @column secondary_categories JSON array of this location's own additional
 *                           categories, each `{ id, name }`. Read only when
 *                           primary_category is set.
 * @column booking_links     JSON object of this location's own appointment link,
 *                           texting number and WhatsApp link (see the business
 *                           table). NULL means "use the business's"; once set,
 *                           the whole set is the location's own, the same rule
 *                           as `social_profiles`.
 * @column additional_phones JSON array of this location's own extra numbers, up
 *                           to two (Google's `phoneNumbers.additionalPhones`).
 *                           NULL means "use the business's"; once set — even
 *                           to an empty list — the list is the location's own,
 *                           the same rule as `social_profiles`. Only a location
 *                           that is not the primary one keeps its own.
 * @column service_area      JSON array of the places this location serves, up to
 *                           20, each `{ name, place_id }`. `place_id` is
 *                           Google's id for the region and is set only on a
 *                           place read from Google — Google requires it, so a
 *                           place typed here (no id) is published on the
 *                           website but never sent to Google. NULL or empty
 *                           means no service area. Per location, like the
 *                           address: every location keeps its own.
 * @column opening_date      When this location opened, to the month: stored on
 *                           the first of that month. NULL means "use the
 *                           business's founding date" — the same rule as
 *                           `business_name`. Only a location that is not the
 *                           primary one keeps its own; Google holds it per
 *                           listing as `openInfo.openingDate`.
 * @column google_location_name The Google listing this location is, e.g.
 *                           'locations/495652196029249217' — the location's own
 *                           memory of the link, kept here because the link
 *                           table (`google_locations`) is emptied on disconnect.
 *                           When the listings are read again after a reconnect,
 *                           each re-links to the location that remembers it,
 *                           so an import updates that location instead of
 *                           creating a second one. Empty when never linked or
 *                           deliberately unlinked.
 * @column created_at        Row creation timestamp, UTC.
 * @column updated_at        Last write timestamp, UTC.
 */
class CreateLocationsTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed — empty when the table was
	 *               already up to date, which is the idempotency check.
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
	business_name varchar(255) NOT NULL default '',
	description text NULL,
	social_profiles longtext NULL,
	primary_category varchar(150) NOT NULL default '',
	primary_category_id varchar(100) NOT NULL default '',
	secondary_categories longtext NULL,
	additional_phones longtext NULL,
	booking_links longtext NULL,
	service_area longtext NULL,
	opening_date date NULL,
	google_location_name varchar(191) NOT NULL default '',
	created_at datetime NULL,
	updated_at datetime NULL,
	PRIMARY KEY  (id),
	KEY business_id (business_id),
	KEY wordpress_post_id (wordpress_post_id),
	KEY status (status),
	KEY country_city (country,city),
	KEY google_location_name (google_location_name),
	KEY created_at (created_at),
	KEY updated_at (updated_at)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
