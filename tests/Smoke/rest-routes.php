<?php
/**
 * REST route registration smoke test.
 *
 * Boots the plugin against stubbed WordPress and inspects what every
 * controller registers. It proves the routes exist, are namespaced
 * correctly, and — the part that actually matters for security — that
 * every single one has a real permission callback and every argument has
 * a validate_callback.
 *
 * It does not call the handlers; that needs a database. See docs/PROGRESS.md.
 *
 * Usage: php tests/Smoke/rest-routes.php
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\API;

echo "REST routes\n";

$GLOBALS['__routes'] = array();

/**
 * Record a route registration.
 *
 * @param string $namespace Route namespace.
 * @param string $route     Route pattern.
 * @param array  $args      Route definition.
 * @return bool
 */
function register_rest_route( $namespace, $route, $args = array(), $override = false ) {
	$GLOBALS['__routes'][ $namespace . $route ] = $args;
	return true;
}

API::init();

// The controllers hooked themselves to rest_api_init; fire it.
foreach ( $GLOBALS['__rest_init'] as $callback ) {
	call_user_func( $callback );
}

$routes = $GLOBALS['__routes'];

$expected = array(
	'fhint/v1/business',
	'fhint/v1/locations',
	'fhint/v1/locations/(?P<id>\d+)',
	'fhint/v1/services',
	'fhint/v1/services/reorder',
	'fhint/v1/services/(?P<id>\d+)',
	'fhint/v1/settings',
	'fhint/v1/logs',
	'fhint/v1/onboarding',
);

foreach ( $expected as $route ) {
	check( isset( $routes[ $route ] ), "registers {$route}" );
}

check_same( count( $expected ), count( $routes ), 'registers exactly the expected routes and no others' );

// Every endpoint on every route must be guarded. __return_true here would be
// a bug, not a shortcut: these routes read and write the whole profile.
$methods_seen = array();

foreach ( $routes as $route => $endpoints ) {
	foreach ( $endpoints as $index => $endpoint ) {
		if ( ! is_array( $endpoint ) || ! isset( $endpoint['methods'] ) ) {
			continue;
		}

		$label = $route . ' [' . $endpoint['methods'] . ']';

		check( isset( $endpoint['permission_callback'] ), "{$label}: declares a permission callback" );
		check( '__return_true' !== $endpoint['permission_callback'], "{$label}: does not use __return_true" );
		check( is_callable( $endpoint['permission_callback'] ), "{$label}: permission callback is callable" );
		check( is_callable( $endpoint['callback'] ), "{$label}: handler is callable" );

		$methods_seen[ $route ][] = $endpoint['methods'];

		// WordPress silently ignores enum/minimum/type on an argument with no
		// validate_callback — an out-of-range value would be accepted with a
		// 200 and then quietly discarded on write.
		if ( ! empty( $endpoint['args'] ) ) {
			foreach ( $endpoint['args'] as $name => $definition ) {
				check( isset( $definition['validate_callback'] ), "{$label}: arg '{$name}' has a validate_callback" );
				check( isset( $definition['sanitize_callback'] ), "{$label}: arg '{$name}' has a sanitize_callback" );
			}
		}
	}
}

// The documented write verbs must actually be accepted.
check( in_array( 'POST, PUT, PATCH', $methods_seen['fhint/v1/business'], true ), 'business accepts POST, PUT and PATCH' );
check( in_array( 'GET', $methods_seen['fhint/v1/business'], true ), 'business is readable' );
check( in_array( 'DELETE', $methods_seen['fhint/v1/locations/(?P<id>\d+)'], true ), 'a location can be deleted' );
check( in_array( 'DELETE', $methods_seen['fhint/v1/logs'], true ), 'logs can be purged' );

// Reordering takes the complete new order, so it needs the ids argument.
$reorder_args = $routes['fhint/v1/services/reorder'][0]['args'];
check( isset( $reorder_args['ids'] ), 'reorder declares an ids argument' );
check( ! empty( $reorder_args['ids']['required'] ), 'reorder requires ids' );

// Status enums must come from the entities, so a new status cannot be
// accepted by the route while being rejected by validation.
$location_args = null;

foreach ( $routes['fhint/v1/locations'] as $endpoint ) {
	if ( is_array( $endpoint ) && 'GET' === $endpoint['methods'] ) {
		$location_args = $endpoint['args'];
	}
}

check_same(
	\FHINT\App\Location\Location::statuses(),
	$location_args['status']['enum'],
	'the location status enum comes from the entity'
);

finish( 'REST routes' );
