<?php
/**
 * Places link table.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * The link between one of our locations and a place on Google.
 *
 * **What is missing from this table is the point of it.** Google's Maps
 * Platform terms forbid storing Places content: §3.2.3(a) of the Terms of
 * Service gives "copy and save business names, addresses, or user reviews"
 * as an example of prohibited scraping, and §3.2.3(b) forbids caching
 * anything the Service Specific Terms do not expressly allow. For the
 * Places API those allowances are exactly two — the place id, cacheable
 * indefinitely under the General Service Terms, and latitude/longitude,
 * cacheable for at most 30 consecutive days under Places API §14.3.
 *
 * So this table holds a place id, a pair of coordinates and the moment
 * those coordinates arrived. There is deliberately no column for a name,
 * an address, a phone number, opening hours or a rating: those are read
 * live, shown, and dropped. A column for them would be the violation, and
 * a column is far harder to remove later than to leave out now.
 *
 * `coordinates_cached_at` exists to be enforced, not merely recorded —
 * `App\Places\Retention` clears expired pairs on a daily schedule and on
 * read, so the 30-day limit holds on a site whose cron never fires.
 *
 * @column id                    Primary key.
 * @column fhint_location_id     Row id in wp_fhint_locations. Unique: a
 *                               location is linked to at most one place.
 * @column place_id              Google's place id. Exempt from the caching
 *                               restrictions, so it may be kept.
 * @column latitude              Latitude, or NULL once expired or unknown.
 * @column longitude             Longitude, or NULL once expired or unknown.
 * @column coordinates_cached_at When the coordinates were read from Google,
 *                               UTC. NULL when none are held.
 * @column linked_at             When the operator chose this place, UTC.
 * @column created_at            Row creation timestamp, UTC.
 * @column updated_at            Last write timestamp, UTC.
 */
class CreatePlaceLinksTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed — empty when the table was
	 *               already up to date, which is the idempotency check.
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::PLACE_LINKS;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	fhint_location_id bigint(20) unsigned NOT NULL default 0,
	place_id varchar(191) NOT NULL default '',
	latitude decimal(10,7) NULL,
	longitude decimal(10,7) NULL,
	coordinates_cached_at datetime NULL,
	linked_at datetime NULL,
	created_at datetime NULL,
	updated_at datetime NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY fhint_location_id (fhint_location_id),
	KEY place_id (place_id),
	KEY coordinates_cached_at (coordinates_cached_at)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
