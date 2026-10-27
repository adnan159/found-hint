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
	'fhint/v1/profile',
	'fhint/v1/profile/google/refresh',
	'fhint/v1/profile/listing',
	'fhint/v1/profile/media',
	'fhint/v1/profile/media/(?P<id>\d+)',
	'fhint/v1/profile/media/(?P<id>\d+)/publish',
	'fhint/v1/profile/publish/plan',
	'fhint/v1/profile/publish/step',
	'fhint/v1/google',
	'fhint/v1/google/credentials',
	'fhint/v1/google/connect',
	'fhint/v1/google/profiles',
	'fhint/v1/google/mapping',
	'fhint/v1/google/import',
	'fhint/v1/google/import/preview',
	'fhint/v1/google/import/steps',
	'fhint/v1/google/import/step',
	'fhint/v1/google/categories',
	'fhint/v1/reviews',
	'fhint/v1/reviews/state',
	'fhint/v1/reviews/sync',
	'fhint/v1/reviews/(?P<review_id>[A-Za-z0-9_-]+)/reply',
	'fhint/v1/posts',
	'fhint/v1/posts/state',
	'fhint/v1/posts/photos',
	'fhint/v1/posts/media',
	'fhint/v1/posts/sync',
	'fhint/v1/posts/(?P<id>\d+)',
	'fhint/v1/posts/(?P<id>\d+)/publish',
	'fhint/v1/schema',
	'fhint/v1/audits',
	'fhint/v1/dashboard',
	'fhint/v1/audits/issues/(?P<id>\\d+)',
	'fhint/v1/audits/issues/(?P<id>\\d+)/fix',
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

// Posting writes to the public listing: every route that sends a post to
// Google needs a linked account, checked on the server.
$fhint_post_guard = function ( $route, $method ) use ( $routes ) {
	foreach ( $routes[ $route ] as $endpoint ) {
		if ( is_array( $endpoint ) && isset( $endpoint['methods'] ) && $method === $endpoint['methods'] ) {
			return is_array( $endpoint['permission_callback'] ) ? $endpoint['permission_callback'][1] : '';
		}
	}
	return '';
};
check_same( 'google_write_check', $fhint_post_guard( 'fhint/v1/posts', 'POST' ), 'creating a post needs Google connected' );
check_same( 'google_write_check', $fhint_post_guard( 'fhint/v1/posts/(?P<id>\d+)', 'PUT' ), 'editing a post needs Google connected' );
check_same( 'google_write_check', $fhint_post_guard( 'fhint/v1/posts/(?P<id>\d+)/publish', 'POST' ), 'publishing a post needs Google connected' );
check_same( 'google_write_check', $fhint_post_guard( 'fhint/v1/posts/media', 'POST' ), 'uploading a post photo needs Google connected — it may go on the listing' );
check_same( 'permissions_check', $fhint_post_guard( 'fhint/v1/posts', 'GET' ), 'reading posts needs only the capability' );

check( in_array( 'POST, PUT, PATCH', $methods_seen['fhint/v1/business'], true ), 'business accepts POST, PUT and PATCH' );
check( in_array( 'GET', $methods_seen['fhint/v1/business'], true ), 'business is readable' );
check( in_array( 'DELETE', $methods_seen['fhint/v1/locations/(?P<id>\d+)'], true ), 'a location can be deleted' );
check( in_array( 'DELETE', $methods_seen['fhint/v1/logs'], true ), 'logs can be purged' );

// The business details are a Google Business Profile's: every route that
// changes them needs a linked Google account, checked on the server, and no
// route that only reads them does — a read with none linked answers empty.
$details_routes = '#^fhint/v1/(business|locations|services|profile)(/|$)#';
$write_guarded  = 0;

foreach ( $routes as $route => $endpoints ) {
	if ( ! preg_match( $details_routes, $route ) ) {
		continue;
	}

	foreach ( $endpoints as $endpoint ) {
		if ( ! is_array( $endpoint ) || ! isset( $endpoint['methods'] ) ) {
			continue;
		}

		$guard = is_array( $endpoint['permission_callback'] ) ? $endpoint['permission_callback'][1] : '';

		if ( 'GET' === $endpoint['methods'] ) {
			check_same( 'permissions_check', $guard, "{$route} [GET]: reading does not need Google" );
			continue;
		}

		check_same( 'google_write_check', $guard, "{$route} [{$endpoint['methods']}]: changing needs Google" );
		$write_guarded++;
	}
}

check_same( 16, $write_guarded, 'all sixteen routes that change the business details are guarded' );

// And the guard itself: no linked account, no write.
$business_write = $routes['fhint/v1/business'][1]['permission_callback'];

$GLOBALS['__options'] = array();
$refused              = call_user_func( $business_write );

check( is_wp_error( $refused ) && 'fhint_google_required' === $refused->get_error_code(), 'with no Google account linked, a write is refused' );
check_same( 409, is_wp_error( $refused ) ? $refused->get_error_data()['status'] : null, 'as a conflict the screen can explain' );

FHINT\App\Google\Tokens::save(
	array(
		'access_token'  => 'access-1',
		'refresh_token' => 'refresh-1',
		'expires_in'    => 3600,
	)
);

check_same( true, call_user_func( $business_write ), 'with one linked, it is allowed' );

$GLOBALS['__options'] = array();

// A reply is written with PUT — Google's own verb, since the same call
// creates and replaces it — and removed with DELETE.
$reply_route = 'fhint/v1/reviews/(?P<review_id>[A-Za-z0-9_-]+)/reply';
check( in_array( 'PUT', $methods_seen[ $reply_route ], true ), 'a review reply is written with PUT' );
check( in_array( 'DELETE', $methods_seen[ $reply_route ], true ), 'and removed with DELETE' );
check( ! empty( $routes[ $reply_route ][0]['args']['comment']['required'] ), 'writing a reply requires its comment' );

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

// Every import route reaches Google, so each is a POST: a GET would spend the
// project's quota for anyone who opened the screen.
check_same( array( 'POST' ), $methods_seen['fhint/v1/google/import'], 'an import is a POST' );
check_same( array( 'POST' ), $methods_seen['fhint/v1/google/import/preview'], 'and so is its preview' );

finish( 'REST routes' );
