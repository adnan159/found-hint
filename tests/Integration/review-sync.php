<?php
/**
 * Reading reviews from Google against a real database: a short read, a
 * full one, and when reviews are marked removed. Google is answered here.
 * Then what a reply's placeholders become for a listing (ReplyContext).
 *
 * Run inside the WordPress container:
 *   docker exec foundhunt_app php /var/www/html/wp-content/plugins/found-hint/tests/Integration/review-sync.php
 *
 * Runs on its own tables (swapped $wpdb->prefix) and restores the options
 * it touches.
 */

// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.Security.EscapeOutput.OutputNotEscaped, WordPress.NamingConventions.PrefixAllGlobals

$fhint_dir = __DIR__;

while ( ! file_exists( $fhint_dir . '/wp-load.php' ) ) {
	$parent = dirname( $fhint_dir );

	if ( $parent === $fhint_dir ) {
		fwrite( STDERR, 'Could not find wp-load.php above ' . __DIR__ . "\n" );
		exit( 1 );
	}

	$fhint_dir = $parent;
}

require_once $fhint_dir . '/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/upgrade.php';

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Google\GoogleLocationRepository;
use FHINT\App\Location\LocationRepository;
use FHINT\App\Review\ReplyContext;
use FHINT\App\Google\Tokens;
use FHINT\App\Review\ReviewRepository;
use FHINT\App\Review\ReviewSync;
use FHINT\Database\Tables;

global $wpdb;

$GLOBALS['__passed'] = 0;
$GLOBALS['__failed'] = 0;

function check_same( $expected, $actual, $label ) {
	if ( $expected === $actual ) {
		$GLOBALS['__passed']++;
		return;
	}
	$GLOBALS['__failed']++;
	echo "  FAIL  {$label}\n          expected: " . var_export( $expected, true ) . "\n          actual:   " . var_export( $actual, true ) . "\n";
}

$real_prefix   = $wpdb->prefix;
$saved_options = array();

foreach ( array( 'fhint_data_changed_at', 'fhint_settings' ) as $option ) {
	$saved_options[ $option ] = get_option( $option, null );
}

$wpdb->prefix = 'fhsynctest_';

register_shutdown_function(
	function () use ( $real_prefix, $saved_options ) {
		global $wpdb;

		foreach ( array_keys( Tables::all() ) as $key ) {
			$wpdb->query( "DROP TABLE IF EXISTS fhsynctest_fhint_{$key}" );
		}

		$wpdb->prefix = $real_prefix;

		// Another request may have changed an option meanwhile; read the table,
		// not this process's cache, so a restore is never silently skipped.
		wp_cache_flush();

		foreach ( $saved_options as $option => $value ) {
			null === $value ? delete_option( $option ) : update_option( $option, $value, false );
		}

		echo "\nReview sync database: {$GLOBALS['__passed']} passed, {$GLOBALS['__failed']} failed\n";
	}
);

FHINT\Database::create_tables();

// Fake Google tokens live in this process only. Written to the site's real
// options table (which a swapped prefix does not change), a real request on
// the site could pick them up, be refused by Google and clear the owner's
// own connection — which is how one was lost.
$fake_tokens = null;
add_filter(
	'pre_option_fhint_google_tokens',
	static function ( $pre ) use ( &$fake_tokens ) {
		return null === $fake_tokens ? $pre : $fake_tokens;
	}
);
add_filter(
	'pre_update_option_fhint_google_tokens',
	static function ( $value, $old ) use ( &$fake_tokens ) {
		$fake_tokens = $value;

		return $old;
	},
	10,
	2
);

Tokens::save(
	array(
		'access_token'  => 'test',
		'refresh_token' => 'test',
		'expires_in'    => 3600,
	)
);

GoogleLocationRepository::upsert(
	array(
		'account_name'       => 'accounts/1',
		'location_name'      => 'locations/1',
		'title'              => 'Northside Dental',
		'store_code'         => '',
		'address'            => '',
		'phone'              => '',
		'website'            => '',
		'verification_state' => 'VERIFIED',
		'cid'                => '',
		'payload'            => array(),
	)
);

// Google: three pages of 50, newest first ("r0" is the newest). $gone are
// reviews Google no longer returns.
$requests = 0;
$gone     = array();
$total    = 3;

add_filter(
	'pre_http_request',
	static function ( $pre, $args, $url ) use ( &$requests, &$gone, &$total ) {
		++$requests;
		parse_str( (string) wp_parse_url( $url, PHP_URL_QUERY ), $query );
		$page    = isset( $query['pageToken'] ) ? (int) $query['pageToken'] : 0;
		$reviews = array();

		for ( $i = $page * 50; $i < ( $page + 1 ) * 50; $i++ ) {
			if ( in_array( "r{$i}", $gone, true ) ) {
				continue;
			}
			$when      = gmdate( 'Y-m-d\TH:i:s\Z', strtotime( '2026-11-01' ) - $i * HOUR_IN_SECONDS );
			$reviews[] = array(
				'reviewId'   => "r{$i}",
				'reviewer'   => array( 'displayName' => 'Pat Lee' ),
				'starRating' => 'FIVE',
				'comment'    => 'Great',
				'createTime' => $when,
				'updateTime' => $when,
			);
		}

		$body = array( 'reviews' => $reviews );

		if ( $page < $total - 1 ) {
			$body['nextPageToken'] = (string) ( $page + 1 );
		}

		return array(
			'headers'  => array(),
			'body'     => wp_json_encode( $body ),
			'response' => array(
				'code'    => 200,
				'message' => '',
			),
			'cookies'  => array(),
		);
	},
	10,
	3
);

$live = static function () {
	return ReviewRepository::count( array() );
};

ReviewSync::run();
check_same( 3, $requests, 'a full read walks every page' );
check_same( 150, $live(), 'and stores every review' );

// A short read: only the newest page, and nothing older marked removed.
$requests = 0;
$result   = ReviewSync::run( '', 1 );
check_same( array( 1, 50 ), array( $requests, $result['reviews'] ), 'a short read asks for one page' );
check_same( 150, $live(), 'and the reviews it did not reach are not marked removed' );

// A review Google dropped: a full read notices; a short one cannot.
$gone     = array( 'r120' );
$requests = 0;
ReviewSync::run( '', 1 );
check_same( 150, $live(), 'a short read never removes a review it did not read' );
ReviewSync::run();
check_same( 149, $live(), 'a full read marks a review Google dropped as removed' );
check_same( true, null !== ReviewRepository::find( 'r120' )['removed_at'], 'that one' );

// The page cap on a large location: a read that stops early removes nothing.
$gone = array( 'r10' );
ReviewSync::run( '', 2 );
check_same( 149, $live(), 'a read cut short by its page limit removes nothing either' );

// A location with 25 pages: a full read stops at 20, whatever is asked.
$total    = 25;
$requests = 0;
ReviewSync::run( '', 99 );
check_same( 20, $requests, 'a full read stops at 20 pages, even when more are asked for' );
check_same( 1000, $live(), 'storing the newest 1,000' );

// -- What a reply's placeholders become -----------------------------------

$listing = static function ( $name, array $address = array() ) {
	GoogleLocationRepository::upsert(
		array(
			'account_name'       => 'accounts/1',
			'location_name'      => $name,
			'title'              => 'Northside Dental',
			'store_code'         => '',
			'address'            => '',
			'phone'              => '',
			'website'            => '',
			'verification_state' => 'VERIFIED',
			'cid'                => '',
			'payload'            => $address ? array( 'storefrontAddress' => $address ) : array(),
		)
	);
};

// A business with a category exists from the start, so a listing
// not linked to it must not borrow it.
$business = BusinessRepository::save(
	array(
		'name'             => 'Northside Dental',
		'primary_category' => 'Dentist',
	)
);
$listing( 'locations/9', array( 'locality' => 'Round Rock' ) );
check_same(
	array(
		'location_name' => 'Northside Dental',
		'location_city' => 'Round Rock',
		'keyword'       => '',
	),
	ReplyContext::for_listing( 'locations/9' ),
	"a listing not linked to FoundHint: Google's title and city, and no keyword — it may be another business"
);

$listing( 'locations/8' );
check_same( '', ReplyContext::for_listing( 'locations/8' )['location_city'], 'no city anywhere: none' );
check_same( '', ReplyContext::for_listing( 'locations/nope' )['location_name'], 'an unknown listing: nothing' );

$branch   = LocationRepository::create(
	array(
		'business_id' => (int) $business['id'],
		'name'        => 'Downtown',
		'city'        => 'Austin',
		'is_primary'  => true,
	)
);
GoogleLocationRepository::map( 'locations/9', (int) $branch['id'] );
check_same( array( 'Austin', 'dentist' ), array_values( array_slice( ReplyContext::for_listing( 'locations/9' ), 1 ) ), "linked: the location's city first, and the business's category, read mid-sentence" );

LocationRepository::update( (int) $branch['id'], array( 'primary_category' => 'Pediatric dentist' ) );
check_same( 'pediatric dentist', ReplyContext::for_listing( 'locations/9' )['keyword'], "the location's own category over the business's" );

LocationRepository::update( (int) $branch['id'], array( 'city' => '' ) );
check_same( 'Round Rock', ReplyContext::for_listing( 'locations/9' )['location_city'], "a linked location with no city falls back to Google's" );

$state = FHINT\App\Review\Reviews::locations();
$ours  = array_values( array_filter( $state, static function ( $row ) { return 'locations/9' === $row['location_name']; } ) );
check_same( 'pediatric dentist', $ours[0]['reply']['keyword'] ?? null, 'the Reviews screen gets the same, for its reply dialog' );

