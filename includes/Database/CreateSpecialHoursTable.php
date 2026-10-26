<?php
/**
 * Special opening hours table.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * Hours for one named date, overriding the weekly pattern.
 *
 * Holidays, a half day before Christmas, the afternoon of a staff funeral.
 * They live apart from `location_hours` because they are keyed by a **date**
 * rather than a weekday, and because they expire: a date in the past is
 * history, while a weekday is forever.
 *
 * The shape deliberately mirrors `location_hours` — one row per period, so a
 * day that opens, closes for lunch and reopens is two rows sharing a date.
 * Anything that reads weekly hours can read these with the same code.
 *
 * **A closed day is a row, not a missing row.** "We are shut on Christmas
 * Day" and "nobody has said anything about Christmas Day" are different
 * answers, and only the first is worth sending to Google or showing a
 * customer.
 *
 * @column id           Primary key.
 * @column location_id  Row id in wp_fhint_locations.
 * @column date         The day these hours apply to.
 * @column period_index 0 for the first period of the day, 1 for the next.
 * @column open_time    Opening time, null when closed all day.
 * @column close_time   Closing time, null when closed all day.
 * @column is_closed    1 when the business is shut for the whole date.
 * @column is_24h       1 when it is open round the clock on that date.
 * @column note         The operator's own label, e.g. 'Christmas Day'. Never
 *                      sent to Google, which has no field for it.
 * @column created_at   Row creation timestamp, UTC.
 * @column updated_at   Last write timestamp, UTC.
 */
class CreateSpecialHoursTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed — empty when the table was
	 *               already up to date, which is the idempotency check.
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::SPECIAL_HOURS;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	location_id bigint(20) unsigned NOT NULL default 0,
	date date NULL,
	period_index tinyint(3) unsigned NOT NULL default 0,
	open_time time NULL,
	close_time time NULL,
	is_closed tinyint(1) NOT NULL default 0,
	is_24h tinyint(1) NOT NULL default 0,
	note varchar(191) NOT NULL default '',
	created_at datetime NULL,
	updated_at datetime NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY location_date_period (location_id,date,period_index),
	KEY location_id (location_id),
	KEY date (date)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
