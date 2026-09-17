<?php
/**
 * Services table.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * Creates the fhint_services table.
 *
 * What the business actually offers. Free allows five (enforced by
 * App\Core\Limits, not by this schema).
 *
 * The slug is unique per business and is **not** regenerated when the name
 * changes: it may already be in a published URL, and silently changing it
 * would break that link. Changing a slug is an explicit write.
 *
 * price is decimal(18,4) rather than a float — money compared with floats
 * eventually disagrees with itself. A price requires a currency; the pair is
 * validated together in App\Service\Service.
 *
 * Columns
 * -------
 *
 * @column id                  Auto-increment primary key.
 * @column business_id         FK → fhint_business.id.
 * @column name                Service name as displayed. Required.
 * @column slug                URL-safe identifier, unique within the business.
 *                             Collisions are resolved by suffixing (-2, -3).
 * @column description         Short description for schema and service listings.
 * @column image_attachment_id WP media attachment id, 0 when a raw URL is used.
 * @column image_url           Resolved image URL.
 * @column price               Numeric price. NULL means "no price published",
 *                             which is different from a price of zero.
 * @column currency            ISO 4217 code, uppercase. Required whenever price is set.
 * @column url                 Link to a page describing this service.
 * @column status              active | inactive. Inactive services are kept but
 *                             excluded from schema and public output.
 * @column sort_order          Manual display order, resequenced as a block by the
 *                             reorder endpoint so two services can't share a position.
 * @column created_at          Row creation timestamp, UTC.
 * @column updated_at          Last write timestamp, UTC.
 */
class CreateServicesTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed — empty when the table was
	 *               already up to date, which is the idempotency check.
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::SERVICES;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	business_id bigint(20) unsigned NOT NULL default 0,
	name varchar(255) NOT NULL default '',
	slug varchar(200) NOT NULL default '',
	description text NULL,
	image_attachment_id bigint(20) unsigned NOT NULL default 0,
	image_url varchar(500) NOT NULL default '',
	price decimal(18,4) NULL,
	currency char(3) NOT NULL default '',
	url varchar(500) NOT NULL default '',
	status varchar(32) NOT NULL default 'active',
	sort_order int(11) NOT NULL default 0,
	created_at datetime NULL,
	updated_at datetime NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY business_slug (business_id,slug),
	KEY business_id (business_id),
	KEY status (status),
	KEY sort_order (sort_order),
	KEY created_at (created_at),
	KEY updated_at (updated_at)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
