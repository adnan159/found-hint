<?php
/**
 * Schema Manager: where each service is offered.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * The places a service is offered in, for the Service schema's `areaServed`.
 * A service area is not an address: it never creates a business per place.
 *
 * Created by the free plugin; read and written by FoundHint Pro.
 *
 * @column id          Primary key.
 * @column service_id  Row id in fhint_services.
 * @column location_id The provider location this area belongs to; 0 = every
 *                     provider of the service.
 * @column name        Place name as published, e.g. 'Gulshan'.
 * @column area_type   Place | City | AdministrativeArea | Country.
 * @column source      google (suggested from the listing's service area) | manual.
 * @column sort_order  Display and output order.
 */
class CreateSchemaServiceAreasTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed.
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::SCHEMA_SERVICE_AREAS;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	service_id bigint(20) unsigned NOT NULL default 0,
	location_id bigint(20) unsigned NOT NULL default 0,
	name varchar(191) NOT NULL default '',
	area_type varchar(30) NOT NULL default 'Place',
	source varchar(20) NOT NULL default 'manual',
	sort_order int(11) NOT NULL default 0,
	PRIMARY KEY  (id),
	KEY service_id (service_id)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
