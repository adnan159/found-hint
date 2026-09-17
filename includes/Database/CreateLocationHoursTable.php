<?php
/**
 * Opening hours table.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * Creates the fhint_location_hours table.
 *
 * **One row per period per day.** A lunch break is two rows sharing a
 * day_of_week, which is what makes split shifts data rather than a schema
 * change. An overnight period (open_time later than close_time, e.g.
 * 22:00–02:00) is stored as-is and interpreted at read time; it is not two
 * rows, because it is one continuous shift.
 *
 * A day with no rows is *unconfigured*, which is not the same as closed —
 * "we never said" and "we are shut" produce different schema output and
 * different audit findings, so they must be distinguishable. Closed is an
 * explicit row with is_closed = 1.
 *
 * day_of_week matches PHP's date('w') (0 = Sunday … 6 = Saturday) so no
 * conversion is needed at a date boundary. Display order — most locales
 * start the week on Monday — is a presentation concern, handled by
 * App\Location\DayOfWeek::display_order().
 *
 * Columns
 * -------
 *
 * @column id           Auto-increment primary key.
 * @column location_id  FK → fhint_locations.id. Deleting a location deletes its hours.
 * @column day_of_week  0 = Sunday … 6 = Saturday, matching PHP's date('w').
 * @column period_index 0-based ordinal of this period within the day, so a second
 *                      shift is addressable for per-field validation errors.
 * @column open_time    Opening time as HH:MM:SS. NULL when closed or 24h.
 * @column close_time   Closing time as HH:MM:SS. NULL when closed or 24h.
 * @column is_closed    1 = explicitly closed all day.
 * @column is_24h       1 = open 24 hours; open_time/close_time are ignored.
 * @column created_at   Row creation timestamp, UTC.
 * @column updated_at   Last write timestamp, UTC.
 */
class CreateLocationHoursTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed — empty when the table was
	 *               already up to date, which is the idempotency check.
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::LOCATION_HOURS;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	location_id bigint(20) unsigned NOT NULL default 0,
	day_of_week tinyint(1) unsigned NOT NULL default 0,
	period_index tinyint(3) unsigned NOT NULL default 0,
	open_time time NULL,
	close_time time NULL,
	is_closed tinyint(1) NOT NULL default 0,
	is_24h tinyint(1) NOT NULL default 0,
	created_at datetime NULL,
	updated_at datetime NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY location_day_period (location_id,day_of_week,period_index),
	KEY location_id (location_id),
	KEY day_of_week (day_of_week),
	KEY created_at (created_at),
	KEY updated_at (updated_at)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
