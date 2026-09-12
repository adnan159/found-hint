<?php
/**
 * Business table.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * Creates the fhint_business table.
 *
 * Holds the single business profile. Everything local — the name, phone,
 * address, website and hours a visitor sees — resolves back to this row plus
 * its locations, and nothing else may keep its own copy: a block, a schema
 * node and an audit rule must all read the same value or they will disagree
 * with each other on the same page.
 *
 * Free ships one business row. The table carries an id anyway so multi-brand
 * support never needs a migration on an existing site.
 *
 * Columns
 * -------
 *
 * @column id                   Auto-increment primary key.
 * @column name                 Public-facing business name, exactly as it should appear
 *                              in search results and on the listing. Required.
 * @column legal_name           Registered legal entity name when it differs from the
 *                              trading name (schema.org legalName).
 * @column business_type        schema.org type emitted for this business — 'LocalBusiness'
 *                              or a subtype such as 'Restaurant', 'Dentist', 'Store'.
 * @column primary_category     The main category the business trades under, in the
 *                              operator's own words (e.g. "Grocery Store").
 * @column secondary_categories JSON array of additional categories.
 * @column description          Short description used for schema and location pages.
 * @column logo_attachment_id   WP media attachment id for the logo, 0 when a raw URL is used.
 * @column logo_url             Resolved logo URL. Kept alongside the attachment id so an
 *                              external logo works without a media library entry.
 * @column phone                Primary contact number. Locations may override it.
 * @column email                Primary contact email.
 * @column website              Primary website URL.
 * @column price_range          schema.org priceRange indicator, e.g. '$$'.
 * @column founding_date        ISO 8601 date (YYYY-MM-DD) the business was founded.
 * @column social_profiles      JSON object of network => profile URL, emitted as sameAs.
 * @column created_at           Row creation timestamp, UTC.
 * @column updated_at           Last write timestamp, UTC.
 */
class CreateBusinessTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return void
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::BUSINESS;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	name varchar(255) NOT NULL default '',
	legal_name varchar(255) NOT NULL default '',
	business_type varchar(100) NOT NULL default '',
	primary_category varchar(150) NOT NULL default '',
	secondary_categories longtext NULL,
	description text NULL,
	logo_attachment_id bigint(20) unsigned NOT NULL default 0,
	logo_url varchar(500) NOT NULL default '',
	phone varchar(50) NOT NULL default '',
	email varchar(191) NOT NULL default '',
	website varchar(500) NOT NULL default '',
	price_range varchar(20) NOT NULL default '',
	founding_date date NULL,
	social_profiles longtext NULL,
	created_at datetime NULL,
	updated_at datetime NULL,
	PRIMARY KEY  (id),
	KEY business_type (business_type),
	KEY created_at (created_at),
	KEY updated_at (updated_at)
) {$charset_collate};";

		dbDelta( $sql );
	}
}
