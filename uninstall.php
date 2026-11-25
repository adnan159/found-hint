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

/**
 * Google credentials go unconditionally, ahead of the opt-in.
 *
 * The "keep everything by default" rule protects the operator's *work* —
 * their business profile, locations and services. A refresh token is not
 * work: it is a live grant to their Google account, and a client secret is
 * a credential. Leaving either in the database of a site that no longer
 * has the plugin installed is a liability with nothing on the other side
 * of the scale, since reconnecting takes one click.
 *
 * This removes the site's ability to use the grant, but only the operator
 * can withdraw the grant itself — the Disconnect button does that through
 * Google while the plugin is still installed, which is why it is the
 * better way to leave.
 */
$fhint_google_options = array(
	'fhint_google_credentials',
	'fhint_google_tokens',
	'fhint_google_notice',
	'fhint_places_credentials',
);

foreach ( $fhint_google_options as $fhint_google_option ) {
	delete_option( $fhint_google_option );
}

global $wpdb;

// Every transient this plugin set: caches, and any half-finished sign-in
// (a PKCE verifier, or the connect service's encrypted secret). None of
// them is the operator's data, so they always go.
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
		$wpdb->esc_like( '_transient_fhint_' ) . '%',
		$wpdb->esc_like( '_transient_timeout_fhint_' ) . '%'
	)
);

// Scheduled work always goes, whether or not data is kept: a leftover
// event would fire against code that is no longer installed.
wp_clear_scheduled_hook( 'fhint_purge_logs' );
wp_clear_scheduled_hook( 'fhint_run_audit' );

$fhint_settings = get_option( 'fhint_settings', array() );
$fhint_optin    = is_array( $fhint_settings )
	&& ! empty( $fhint_settings['general']['delete_data_on_uninstall'] );

if ( ! $fhint_optin ) {
	return;
}

/*
 * Every table this plugin owns, spelled out because the autoloader is not
 * available here. It must match `Tables::keys()` exactly: a name missing
 * from this list is a table that survives an uninstall the operator asked
 * for. `tests/Smoke/schema-format.php` compares the two and fails the build
 * when they drift, which is how `reviews` was caught having been forgotten.
 */
$fhint_tables = array(
	'business',
	'locations',
	'location_hours',
	'services',
	'audits',
	'audit_issues',
	'logs',
	'google_locations',
	'reviews',
	'special_hours',
	'location_attributes',
	'media',
	'description_history',
	'google_reference',
	'posts',
);

/*
 * Tables earlier versions created and this one no longer uses. Kept here so
 * a clean removal still leaves nothing behind on sites that ran them.
 */
$fhint_legacy_tables = array(
	'schema_entities',
	'schema_service_providers',
	'schema_service_areas',
);

foreach ( array_merge( $fhint_tables, $fhint_legacy_tables ) as $fhint_table ) {
	$fhint_name = esc_sql( $wpdb->prefix . 'fhint_' . $fhint_table );

	// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.SchemaChange
	$wpdb->query( "DROP TABLE IF EXISTS {$fhint_name}" );
}

$fhint_options = array(
	'fhint_settings',
	'fhint_version',
	'fhint_db_version',
	'fhint_first_install_time',
	'fhint_data_changed_at',
	'fhint_schema_cache',
	'fhint_onboarding',
	'fhint_required_rewrite_flush',
	'fhint_encryption_unavailable',
);

foreach ( $fhint_options as $fhint_option ) {
	delete_option( $fhint_option );
}

// The marker on photos uploaded through this plugin. The photos themselves
// are the site's media and stay in the library.
delete_post_meta_by_key( '_fhint_uploaded' );

