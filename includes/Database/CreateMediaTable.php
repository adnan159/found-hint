<?php
/**
 * Business Profile photos table.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * Photos on the listing, and photos on their way to it.
 *
 * One table for both directions, because the screen shows them together: the
 * logo and cover the owner set, the gallery Google holds, the pictures
 * customers have added, and the ones picked here that have not been sent yet.
 *
 * **`state` is what separates them**, and it is the only honest way to answer
 * "is this photo on Google?". A row that is `pending` exists on this site and
 * nowhere else; `failed` keeps the reason so the owner is told why rather
 * than watching a photo quietly disappear.
 *
 * `source` distinguishes the owner's photos from customers'. Customer photos
 * are read-only — they can be shown and counted, never edited or deleted from
 * here, because they are not the owner's to remove.
 *
 * Photos live in the WordPress media library when they came from this site:
 * `attachment_id` points there, and `url` is kept for the ones that only
 * exist on Google, where there is no attachment to point at.
 *
 * @column id            Primary key.
 * @column location_id   Row id in wp_fhint_locations.
 * @column role          logo | cover | gallery — what the picture is for.
 * @column source        owner | customer — who put it there.
 * @column state         pending | uploading | synced | failed | removed.
 * @column attachment_id WordPress attachment id, 0 for Google-only photos.
 * @column url           Where the image can be fetched, Google's or ours.
 * @column google_name   Google's media resource name once uploaded. Indexed
 *                       but **not unique**: every row waiting to be sent
 *                       carries an empty one, and a unique index would let
 *                       a location queue exactly one photo.
 * @column mime_type     image/jpeg or image/png — Google accepts no others.
 * @column file_size     Bytes. Google refuses anything over 5 MB.
 * @column width         Pixels, used to check the shape a role needs.
 * @column height        Pixels.
 * @column error         Why the last attempt failed, for the owner to read.
 * @column sort_order    Gallery order on this site; Google keeps its own.
 * @column uploaded_at   When Google accepted it, UTC.
 * @column synced_at     When Google last reported this photo, UTC.
 * @column created_at    Row creation timestamp, UTC.
 * @column updated_at    Last write timestamp, UTC.
 */
class CreateMediaTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed — empty when the table was
	 *               already up to date, which is the idempotency check.
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::MEDIA;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	location_id bigint(20) unsigned NOT NULL default 0,
	role varchar(32) NOT NULL default 'gallery',
	source varchar(32) NOT NULL default 'owner',
	state varchar(32) NOT NULL default 'pending',
	attachment_id bigint(20) unsigned NOT NULL default 0,
	url varchar(500) NOT NULL default '',
	google_name varchar(191) NOT NULL default '',
	mime_type varchar(100) NOT NULL default '',
	file_size bigint(20) unsigned NOT NULL default 0,
	width int(11) NOT NULL default 0,
	height int(11) NOT NULL default 0,
	error varchar(500) NOT NULL default '',
	sort_order int(11) NOT NULL default 0,
	uploaded_at datetime NULL,
	synced_at datetime NULL,
	created_at datetime NULL,
	updated_at datetime NULL,
	PRIMARY KEY  (id),
	KEY google_name (google_name),
	KEY location_id (location_id),
	KEY role (role),
	KEY state (state),
	KEY attachment_id (attachment_id)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
