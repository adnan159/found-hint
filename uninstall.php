<?php
/**
 * Uninstall routine.
 *
 * @package FoundHint
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

/**
 * **Default: everything is kept.**
 *
 * Deleting the plugin to troubleshoot something must not cost the operator
 * their business profile, locations and services. Data is removed only when
 * they have explicitly opted in through Settings.
 *
 * The plugin is not running at this point, so nothing here may rely on the
 * autoloader or on any class having been bootstrapped.
 */

$fhint_settings = get_option( 'fhint_settings', array() );
$fhint_optin    = is_array( $fhint_settings )
	&& ! empty( $fhint_settings['general']['delete_data_on_uninstall'] );

if ( ! $fhint_optin ) {
	return;
}

global $wpdb;

$fhint_tables = array(
	'business',
	'locations',
	'location_hours',
	'services',
	'audits',
	'audit_issues',
	'logs',
);

foreach ( $fhint_tables as $fhint_table ) {
	$fhint_name = $wpdb->prefix . 'fhint_' . $fhint_table;

	// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	$wpdb->query( "DROP TABLE IF EXISTS {$fhint_name}" );
}

$fhint_options = array(
	'fhint_settings',
	'fhint_version',
	'fhint_first_install_time',
	'fhint_data_changed_at',
	'fhint_onboarding',
	'fhint_required_rewrite_flush',
);

foreach ( $fhint_options as $fhint_option ) {
	delete_option( $fhint_option );
}

$fhint_timestamp = wp_next_scheduled( 'fhint_purge_logs' );

if ( $fhint_timestamp ) {
	wp_unschedule_event( $fhint_timestamp, 'fhint_purge_logs' );
}
