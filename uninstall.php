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
	// The Maps Platform key is a bearer credential too: anyone holding it
	// can spend the project's quota, so it goes with the others whatever
	// the operator chose about their own data.
	'fhint_places_credentials',
);

foreach ( $fhint_google_options as $fhint_google_option ) {
	delete_option( $fhint_google_option );
}

global $wpdb;

// Any half-finished handshake, which holds a PKCE verifier.
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
		$wpdb->esc_like( '_transient_fhint_google_oauth_' ) . '%',
		$wpdb->esc_like( '_transient_timeout_fhint_google_oauth_' ) . '%'
	)
);

$fhint_settings = get_option( 'fhint_settings', array() );
$fhint_optin    = is_array( $fhint_settings )
	&& ! empty( $fhint_settings['general']['delete_data_on_uninstall'] );

if ( ! $fhint_optin ) {
	return;
}

$fhint_tables = array(
	'business',
	'locations',
	'location_hours',
	'services',
	'audits',
	'audit_issues',
	'logs',
	'google_locations',
	'place_links',
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

$fhint_places_timestamp = wp_next_scheduled( 'fhint_places_expire_coordinates' );

if ( $fhint_places_timestamp ) {
	wp_unschedule_event( $fhint_places_timestamp, 'fhint_places_expire_coordinates' );
}
