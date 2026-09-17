<?php
/**
 * Google Business Profile locations table.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * One row per location Google reports for the connected account, plus the
 * link from that location to one of ours.
 *
 * **The mapping lives here rather than as a column on `locations`.** The
 * relationship is owned by the Google side: a Google location maps to at
 * most one of ours, many Google locations may be visible and never mapped,
 * and a mapping has to survive its FoundHint location being deleted long
 * enough to be reported rather than silently lost. Putting it here also
 * keeps the shape of `locations` — a table whose formatting is asserted
 * elsewhere — untouched.
 *
 * The profile fields are a **cache of what Google last said**, not a second
 * source of truth. They exist so the profile list renders without an HTTP
 * request on every page view, and so a later comparison has something to
 * compare against. Nothing reads business data from here.
 *
 * @column id                 Primary key.
 * @column account_name       Google account resource name, e.g. 'accounts/123'.
 * @column location_name      Google location resource name, e.g. 'locations/456'.
 *                            Unique: it is Google's identity for the place.
 * @column fhint_location_id  Row id in wp_fhint_locations, or 0 when unmapped.
 * @column title              Business name as Google holds it.
 * @column store_code         The operator's own code for the place, if set.
 * @column address            Formatted address as Google holds it.
 * @column phone              Primary phone as Google holds it.
 * @column website            Website URI as Google holds it.
 * @column verification_state Google's verification state, e.g. 'VERIFIED'.
 * @column payload            The raw location object, JSON, for fields no
 *                            column covers yet. Read-only to everything but
 *                            the sync.
 * @column synced_at          When Google last answered, UTC.
 * @column created_at         Row creation timestamp, UTC.
 * @column updated_at         Last write timestamp, UTC.
 */
class CreateGoogleLocationsTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed — empty when the table was
	 *               already up to date, which is the idempotency check.
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::GOOGLE_LOCATIONS;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	account_name varchar(191) NOT NULL default '',
	location_name varchar(191) NOT NULL default '',
	fhint_location_id bigint(20) unsigned NOT NULL default 0,
	title varchar(255) NOT NULL default '',
	store_code varchar(191) NOT NULL default '',
	address varchar(500) NOT NULL default '',
	phone varchar(50) NOT NULL default '',
	website varchar(500) NOT NULL default '',
	verification_state varchar(50) NOT NULL default '',
	payload longtext NULL,
	synced_at datetime NULL,
	created_at datetime NULL,
	updated_at datetime NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY location_name (location_name),
	KEY account_name (account_name),
	KEY fhint_location_id (fhint_location_id),
	KEY synced_at (synced_at)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
