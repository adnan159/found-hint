<?php
/**
 * Google Business Profile reviews table.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * One row per review Google reports for a location this site has synced.
 *
 * **This is a cache of what Google last said, not a source of truth.** The
 * review belongs to the person who wrote it and to Google; nothing here is
 * edited by this plugin, and a sync replaces what it finds. It is stored at
 * all for one reason: a review list, a rating on the dashboard and an audit
 * rule must never cost an HTTP request to Google on a page render.
 *
 * The link to a location is `location_name` — Google's own resource name —
 * rather than our row id, for the same reason the mapping table uses it: it
 * is Google's identity for the place, it survives a FoundHint location being
 * deleted and remade, and a review that arrives for an unmapped location is
 * still worth keeping.
 *
 * `star_rating` is stored as 1–5 rather than Google's `FIVE`/`FOUR` strings
 * so that averaging and ordering are the database's job. 0 means Google sent
 * `STAR_RATING_UNSPECIFIED`, which is not the same as one star.
 *
 * @column id                Primary key.
 * @column review_id         Google's review id. Unique: it is Google's
 *                           identity for the review, and a sync upserts on it.
 * @column location_name     Google location resource name, e.g. 'locations/456'.
 * @column account_name      Google account resource name the review was read
 *                           through, kept so a re-read knows the path.
 * @column reviewer_name     Display name as Google holds it, empty when the
 *                           reviewer chose to stay anonymous.
 * @column reviewer_photo    Reviewer's profile photo URL, if any.
 * @column is_anonymous      1 when Google marked the reviewer anonymous.
 * @column star_rating       1–5, or 0 when Google did not say.
 * @column comment           The review text. Empty for a rating with no words,
 *                           which is a normal and common review.
 * @column reply_comment     The owner's reply, empty when unanswered. This is
 *                           what "needs a reply" is read from.
 * @column replied_at        When the reply was last updated, UTC.
 * @column reviewed_at       Google's createTime for the review, UTC.
 * @column review_updated_at Google's updateTime for the review, UTC. A review
 *                           edited by its author moves this and not reviewed_at.
 * @column payload           The raw review object, JSON, for fields no column
 *                           covers yet. Read-only to everything but the sync.
 * @column synced_at         When Google last answered for this row, UTC.
 * @column created_at        Row creation timestamp, UTC.
 * @column updated_at        Last write timestamp, UTC.
 */
class CreateReviewsTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed — empty when the table was
	 *               already up to date, which is the idempotency check.
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::REVIEWS;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	review_id varchar(191) NOT NULL default '',
	location_name varchar(191) NOT NULL default '',
	account_name varchar(191) NOT NULL default '',
	reviewer_name varchar(191) NOT NULL default '',
	reviewer_photo varchar(500) NOT NULL default '',
	is_anonymous tinyint(1) NOT NULL default 0,
	star_rating tinyint(3) unsigned NOT NULL default 0,
	comment longtext NULL,
	reply_comment longtext NULL,
	replied_at datetime NULL,
	reviewed_at datetime NULL,
	review_updated_at datetime NULL,
	payload longtext NULL,
	synced_at datetime NULL,
	created_at datetime NULL,
	updated_at datetime NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY review_id (review_id),
	KEY location_name (location_name),
	KEY star_rating (star_rating),
	KEY reviewed_at (reviewed_at),
	KEY replied_at (replied_at)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
