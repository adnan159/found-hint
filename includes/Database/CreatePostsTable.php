<?php
/**
 * Google Business Profile posts table.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * One row per post on a Google listing: the ones written here, and the ones
 * Google reports for a location this site has synced.
 *
 * Unlike reviews, a post here is partly this site's own: a **draft** exists
 * only in this table until it is published, and a **failed** post keeps
 * what the owner wrote so it can be tried again. Once a post is on Google
 * (`google_name` set), Google is the truth and a sync replaces what it
 * finds.
 *
 * The link to a location is `location_name`, Google's resource name, for
 * the same reasons as the reviews table.
 *
 * **Status lifecycle:**
 *
 *     draft ──publish──▶ live | processing | rejected
 *       │                  ▲
 *       └──publish fails──▶ failed ──retry──┘
 *     scheduled (set by FoundHint Pro only) ──▶ live | failed
 *
 * - `draft`      saved here, never sent.
 * - `live`       on the listing (Google's LIVE).
 * - `processing` Google accepted it and is still checking it (PROCESSING).
 * - `rejected`   Google refused it after review (REJECTED); `error` says why
 *                when Google does.
 * - `failed`     the last attempt to send it was refused before Google kept
 *                it; `error` holds the message. Nothing is on Google unless
 *                `google_name` is set (an edit to a live post that failed).
 * - `scheduled`  waiting for `scheduled_at`. The free plugin never sets it.
 *
 * Event and offer dates are the business's own wall-clock time, as Google
 * holds them (a date and a time of day, no zone) — **not UTC**, unlike every
 * other datetime here.
 *
 * @column id            Primary key.
 * @column location_name Google location resource name, e.g. 'locations/456'.
 * @column account_name  Google account resource name, kept for the URL.
 * @column google_name   Google's resource name for the post
 *                       ('accounts/…/locations/…/localPosts/…'), '' until it
 *                       is on Google. A sync upserts on it.
 * @column topic_type    update | event | offer (Google's STANDARD, EVENT, OFFER).
 * @column status        See the lifecycle above.
 * @column source        Where it came from: manual (written by the owner, or
 *                       read from Google), review (made from a review). Pro
 *                       adds ai, csv and blog.
 * @column source_ref    The id behind the source — the review id for a post
 *                       made from a review. '' otherwise.
 * @column title         Event or offer title (Google caps it at 58). '' for an update.
 * @column summary       The post's text (Google caps it at 1,500).
 * @column cta_type      Button: '' (none), learn_more, order, book, sign_up,
 *                       shop, call. Offers have no button of their own.
 * @column cta_url       Where the button goes. '' for none and for call.
 * @column starts_at     Event/offer start, business-local wall time. NULL for an update.
 * @column ends_at       Event/offer end, business-local wall time.
 * @column coupon_code   Offer coupon, ''.
 * @column redeem_url    Offer's "redeem online" link, ''.
 * @column terms         Offer terms and conditions.
 * @column media_url     The photo, as a URL Google can fetch, ''. Google takes
 *                       a post's photo only by URL.
 * @column attachment_id Media-library id when the photo was uploaded here, 0 otherwise.
 * @column search_url    Google's link to the post on Search, once live.
 * @column error         Why the last send failed or Google rejected it, ''.
 * @column payload       Google's last answer for the post, JSON.
 * @column scheduled_at  When a scheduled post is due, UTC (Pro).
 * @column published_at  Google's createTime, UTC. NULL until on Google.
 * @column synced_at     When Google last answered for this row, UTC.
 * @column created_at    Row creation timestamp, UTC.
 * @column updated_at    Last write timestamp, UTC — "last edited" on a draft.
 */
class CreatePostsTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed.
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::POSTS;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	location_name varchar(191) NOT NULL default '',
	account_name varchar(191) NOT NULL default '',
	google_name varchar(191) NOT NULL default '',
	topic_type varchar(20) NOT NULL default 'update',
	status varchar(20) NOT NULL default 'draft',
	source varchar(20) NOT NULL default 'manual',
	source_ref varchar(191) NOT NULL default '',
	title varchar(191) NOT NULL default '',
	summary longtext NULL,
	cta_type varchar(20) NOT NULL default '',
	cta_url varchar(2048) NOT NULL default '',
	starts_at datetime NULL,
	ends_at datetime NULL,
	coupon_code varchar(191) NOT NULL default '',
	redeem_url varchar(2048) NOT NULL default '',
	terms longtext NULL,
	media_url varchar(2048) NOT NULL default '',
	attachment_id bigint(20) unsigned NOT NULL default 0,
	search_url varchar(2048) NOT NULL default '',
	error varchar(1000) NOT NULL default '',
	payload longtext NULL,
	scheduled_at datetime NULL,
	published_at datetime NULL,
	synced_at datetime NULL,
	created_at datetime NULL,
	updated_at datetime NULL,
	PRIMARY KEY  (id),
	KEY location_name (location_name),
	KEY google_name (google_name),
	KEY topic_type (topic_type),
	KEY status (status),
	KEY source (source),
	KEY published_at (published_at),
	KEY updated_at (updated_at)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
