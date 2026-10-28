<?php
/**
 * Schema Manager: who provides each service.
 *
 * @package FoundHint
 */

namespace FHINT\Database;

defined( 'ABSPATH' ) || exit;

/**
 * Which business or locations provide a service, for the Service schema's
 * `provider`. One row per provider; a service with none is provided by the
 * main business.
 *
 * Created by the free plugin; read and written by FoundHint Pro.
 *
 * @column id            Primary key.
 * @column service_id    Row id in fhint_services.
 * @column provider_kind business | location.
 * @column provider_id   Row id in fhint_business or fhint_locations.
 * @column sort_order    Order the providers are listed in.
 */
class CreateSchemaServiceProvidersTable {

	/**
	 * Run the table definition through dbDelta.
	 *
	 * @param string $prefix          Database table prefix.
	 * @param string $charset_collate Charset/collation clause.
	 * @return array Whatever dbDelta changed.
	 */
	public static function up( $prefix, $charset_collate ) {
		$table = $prefix . 'fhint_' . Tables::SCHEMA_SERVICE_PROVIDERS;

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL auto_increment,
	service_id bigint(20) unsigned NOT NULL default 0,
	provider_kind varchar(20) NOT NULL default '',
	provider_id bigint(20) unsigned NOT NULL default 0,
	sort_order int(11) NOT NULL default 0,
	PRIMARY KEY  (id),
	KEY service_id (service_id),
	KEY provider (provider_kind,provider_id)
) {$charset_collate};";

		return dbDelta( $sql );
	}
}
