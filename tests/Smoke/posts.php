<?php
/**
 * Google Business Profile posts: reading Google's shape, writing it, and
 * the rules a post must pass before it is sent.
 *
 * Run with plain PHP: `php tests/Smoke/posts.php`.
 *
 * Storing, filtering, counting and pruning need a database and are covered
 * in tests/Integration/database.php.
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

if ( ! function_exists( 'absint' ) ) {
	function absint( $value ) {
		return abs( (int) $value );
	}
}

use FHINT\App\Post\PostMapper;
use FHINT\App\Post\PostMedia;
use FHINT\App\Post\PostValidator;
use FHINT\App\Post\Posts;
use FHINT\App\Post\PostRepository;

echo "Posts\n";

$fhint_name = 'accounts/1/locations/2/localPosts/3';

// ── Google → row ──────────────────────────────────────────────────────

$event = PostMapper::from_google(
	array(
		'name'         => $fhint_name,
		'topicType'    => 'EVENT',
		'state'        => 'PROCESSING',
		'summary'      => 'Open evening',
		'callToAction' => array( 'actionType' => 'BOOK', 'url' => 'https://example.com/book' ),
		'event'        => array(
			'title'    => 'Invisalign evening',
			'schedule' => array(
				'startDate' => array( 'year' => 2026, 'month' => 10, 'day' => 17 ),
				'startTime' => array( 'hours' => 10 ),
				'endDate'   => array( 'year' => 2026, 'month' => 10, 'day' => 17 ),
				'endTime'   => array( 'hours' => 14, 'minutes' => 30 ),
			),
		),
		'media'        => array( array( 'sourceUrl' => 'https://example.com/a.jpg', 'googleUrl' => 'https://lh3.googleusercontent.com/p/x' ) ),
		'searchUrl'    => 'https://local.google.com/place?id=1',
		'createTime'   => '2026-10-01T08:00:00Z',
	),
	'locations/2',
	'accounts/1'
);
check_same( 'event', $event['topic_type'], 'EVENT is an event' );
check_same( 'processing', $event['status'], 'PROCESSING is processing, not live' );
check_same( 'book', $event['cta_type'], 'BOOK is the book button' );
check_same( '2026-10-17 10:00:00', $event['starts_at'], 'the start date and time are read' );
check_same( '2026-10-17 14:30:00', $event['ends_at'], 'the end time keeps its minutes' );
check_same( 'Invisalign evening', $event['title'], 'the event title is read' );
check_same( 'https://lh3.googleusercontent.com/p/x', $event['media_url'], "Google's own copy of the photo is preferred" );
check_same( '2026-10-01 08:00:00', $event['published_at'], 'createTime is the published time, UTC' );

$plain = PostMapper::from_google( array( 'name' => $fhint_name, 'topicType' => 'ALERT', 'state' => 'LIVE' ), 'l', 'a' );
check_same( 'update', $plain['topic_type'], 'a type this plugin does not know reads as an update' );
check_same( 'live', $plain['status'], 'LIVE is live' );
check_same( '', $plain['cta_type'], 'no button is no button' );
check_same( null, $plain['starts_at'], 'no schedule is no start' );

check_same( null, PostMapper::from_google( array( 'name' => 'accounts/1/../../x' ), 'l', 'a' ), 'a post whose name is not a post name is not stored' );
check_same( null, PostMapper::from_google( array(), 'l', 'a' ), 'a post with no name is not stored' );

$bad = PostMapper::from_google(
	array(
		'name'         => $fhint_name,
		'callToAction' => array( 'actionType' => 'LEARN_MORE', 'url' => 'javascript:alert(1)' ),
		'event'        => array( 'schedule' => array( 'startDate' => array( 'year' => 2026, 'month' => 2, 'day' => 30 ) ) ),
	),
	'l',
	'a'
);
check_same( '', $bad['cta_url'], 'a link that is not http(s) is dropped' );
check_same( null, $bad['starts_at'], 'a date that does not exist is dropped' );

check( PostMapper::is_post_name( $fhint_name ), 'a real post name is a post name' );
check( ! PostMapper::is_post_name( 'accounts/1/locations/2' ), 'a location name is not a post name' );
check( ! PostMapper::is_post_name( $fhint_name . '/extra' ), 'nothing may follow the post id' );

// ── row → Google ──────────────────────────────────────────────────────

$fhint_row = array_merge(
	PostRepository::COLUMNS,
	array(
		'topic_type' => 'update',
		'summary'    => 'Evening hours',
		'cta_type'   => 'call',
		'cta_url'    => 'https://ignored.example',
		'media_url'  => 'https://example.com/p.jpg',
	)
);
$body = PostMapper::to_google( $fhint_row, 'en-GB' );
check_same( 'STANDARD', $body['topicType'], 'an update is STANDARD' );
check_same( 'en-GB', $body['languageCode'], 'the language is sent' );
check_same( array( 'actionType' => 'CALL' ), $body['callToAction'], 'a call button carries no link' );
check_same( array( array( 'mediaFormat' => 'PHOTO', 'sourceUrl' => 'https://example.com/p.jpg' ) ), $body['media'], 'the photo is sent by link' );
check( ! isset( $body['event'] ), 'an update has no event block' );

$offer = PostMapper::to_google(
	array_merge(
		PostRepository::COLUMNS,
		array(
			'topic_type'  => 'offer',
			'title'       => '20% off',
			'summary'     => 'All month',
			'cta_type'    => 'book',
			'cta_url'     => 'https://example.com',
			'starts_at'   => '2026-10-01 00:00:00',
			'ends_at'     => '2026-10-31 00:00:00',
			'coupon_code' => 'SMILE20',
		)
	)
);
check_same( 'OFFER', $offer['topicType'], 'an offer is OFFER' );
check( ! isset( $offer['callToAction'] ), "an offer sends no button — Google's is View offer" );
check_same( '20% off', $offer['event']['title'], "an offer's title travels on event" );
check_same( array( 'year' => 2026, 'month' => 10, 'day' => 31 ), $offer['event']['schedule']['endDate'], "an offer's end date is sent" );
check( ! isset( $offer['event']['schedule']['startTime'] ), 'an offer runs whole days: no time of day' );
check_same( array( 'couponCode' => 'SMILE20' ), $offer['offer'], 'only the offer fields that were filled are sent' );

$evt = PostMapper::to_google(
	array_merge(
		PostRepository::COLUMNS,
		array(
			'topic_type' => 'event',
			'title'      => 'Open day',
			'starts_at'  => '2026-10-17 10:00:00',
			'ends_at'    => '2026-10-17 14:30:00',
		)
	)
);
check_same( array( 'hours' => 14, 'minutes' => 30, 'seconds' => 0, 'nanos' => 0 ), $evt['event']['schedule']['endTime'], 'an event sends its time of day' );

check_same( 'summary,callToAction', PostMapper::update_mask( 'update' ), 'an update edit leaves the media alone by default' );
check_same( 'summary,media,callToAction', PostMapper::update_mask( 'update', true ), 'a changed photo is in the mask' );
check_same( 'summary,event,offer', PostMapper::update_mask( 'offer' ), 'an offer edit has no button and carries its event and offer' );
check_same( 'summary,callToAction,event', PostMapper::update_mask( 'event' ), 'an event edit carries its button and event' );

// ── cleaning ──────────────────────────────────────────────────────────

$clean = PostValidator::sanitize(
	array(
		'summary'  => "<b>Two</b>\nlines",
		'cta_url'  => 'not a link',
		'starts_at' => '2026-10-17T10:00',
		'ends_at'  => '2026-10-17',
		'unknown'  => 'dropped',
	)
);
check_same( "Two\nlines", $clean['summary'], 'tags are stripped and line breaks kept' );
check_same( 'not a link', $clean['cta_url'], '"not a link" stays as typed so it can be refused' );
check_same( '2026-10-17 10:00:00', $clean['starts_at'], 'a date input value is read' );
check_same( '2026-10-17 00:00:00', $clean['ends_at'], 'a date alone is midnight' );
check( ! isset( $clean['unknown'] ), 'a field that is not a post field is dropped' );
check( ! isset( $clean['title'] ), 'a field not sent stays absent, so an update changes only what was sent' );

check_same( 'invalid', PostValidator::datetime( '2026-02-30' ), 'a date that does not exist is invalid' );
check_same( 'invalid', PostValidator::datetime( '2026-10-17T24:00' ), 'hour 24 is invalid' );
check_same( 'invalid', PostValidator::datetime( 'next friday' ), 'words are not a date' );
check_same( '', PostValidator::datetime( '' ), 'empty is empty' );

// ── rules ─────────────────────────────────────────────────────────────

$fhint_post = function ( array $fields ) {
	return Posts::shape( array_merge( PostRepository::COLUMNS, array( 'topic_type' => 'update', 'source' => 'manual' ), $fields ) );
};
$fhint_codes = function ( $result ) {
	$codes = array();
	foreach ( $result->errors() as $field => $list ) {
		$codes[ $field ] = $list[0];
	}
	return $codes;
};

check_same( array(), $fhint_codes( PostValidator::validate( $fhint_post( array() ), false ) ), 'an empty draft can be saved' );
check_same( array( 'summary' => 'post.summary.required' ), $fhint_codes( PostValidator::validate( $fhint_post( array( 'cta_type' => '' ) ), true ) ), 'an update needs words to be published' );
check_same(
	array(
		'title'    => 'post.title.required',
		'starts_at' => 'post.starts_at.required',
		'ends_at'  => 'post.ends_at.required',
	),
	$fhint_codes( PostValidator::validate( $fhint_post( array( 'topic_type' => 'event' ) ), true ) ),
	'an event needs a title and dates, but not words'
);
check_same( array( 'summary' => 'post.summary.too_long' ), $fhint_codes( PostValidator::validate( $fhint_post( array( 'summary' => str_repeat( 'é', 1501 ) ) ), false ) ), 'over 1,500 characters is too long even for a draft' );
check_same( array(), $fhint_codes( PostValidator::validate( $fhint_post( array( 'summary' => str_repeat( 'é', 1500 ) ) ), false ) ), '1,500 accented characters are 1,500, not 3,000' );
check_same( 'post.title.too_long', $fhint_codes( PostValidator::validate( $fhint_post( array( 'topic_type' => 'event', 'title' => str_repeat( 'a', 59 ) ) ), false ) )['title'], 'a 59-character title is too long' );

$fhint_dates = function ( $type, $starts, $ends ) use ( $fhint_post, $fhint_codes ) {
	$codes = $fhint_codes( PostValidator::validate( $fhint_post( array( 'topic_type' => $type, 'title' => 'T', 'summary' => 'S', 'starts_at' => $starts, 'ends_at' => $ends ) ), true ) );
	return isset( $codes['ends_at'] ) ? $codes['ends_at'] : '';
};
check_same( 'post.ends_at.before_start', $fhint_dates( 'event', '2026-10-17 10:00:00', '2026-10-17 10:00:00' ), 'an event that ends as it starts is refused' );
check_same( '', $fhint_dates( 'event', '2026-10-17 10:00:00', '2026-10-17 10:30:00' ), 'an event that ends later is fine' );
check_same( '', $fhint_dates( 'offer', '2026-10-17 00:00:00', '2026-10-17 00:00:00' ), 'a one-day offer is fine' );
check_same( 'post.ends_at.before_start', $fhint_dates( 'offer', '2026-10-17 00:00:00', '2026-10-16 00:00:00' ), 'an offer that ends the day before it starts is refused' );
check_same( 'post.starts_at.invalid', $fhint_codes( PostValidator::validate( $fhint_post( array( 'topic_type' => 'event', 'starts_at' => 'invalid' ) ), false ) )['starts_at'], 'an impossible date is refused even on a draft' );

$fhint_button = function ( $type, $url, $publish ) use ( $fhint_post, $fhint_codes ) {
	$codes = $fhint_codes( PostValidator::validate( $fhint_post( array( 'summary' => 'S', 'cta_type' => $type, 'cta_url' => $url ) ), $publish ) );
	return isset( $codes['cta_url'] ) ? $codes['cta_url'] : ( isset( $codes['cta_type'] ) ? $codes['cta_type'] : '' );
};
check_same( 'post.cta_url.required', $fhint_button( 'book', '', true ), 'a button needs a link to be published' );
check_same( '', $fhint_button( 'book', '', false ), 'a draft may leave the link for later' );
check_same( 'post.cta_url.invalid', $fhint_button( 'book', 'not a link', false ), 'a link that is not a link is refused even on a draft' );
check_same( 'post.cta_url.invalid', $fhint_button( 'book', 'ftp://example.com', true ), 'only http(s) links' );
check_same( '', $fhint_button( 'call', '', true ), 'a call button needs no link' );
check_same( 'post.cta_type.invalid', $fhint_button( 'teleport', '', true ), 'an unknown button is refused' );

check_same( 'post.redeem_url.invalid', $fhint_codes( PostValidator::validate( $fhint_post( array( 'topic_type' => 'offer', 'redeem_url' => 'nope' ) ), false ) )['redeem_url'], "an offer's redeem link must be a link" );
check_same( 'post.media_url.invalid', $fhint_codes( PostValidator::validate( $fhint_post( array( 'media_url' => 'data:image/png;base64,AAA' ) ), false ) )['media_url'], 'a photo must be a link Google can fetch' );
check_same( 'post.type.invalid', $fhint_codes( PostValidator::validate( $fhint_post( array( 'topic_type' => 'alert' ) ), false ) )['topic_type'], 'an unknown type is refused' );
check_same( 'post.source.invalid', $fhint_codes( PostValidator::validate( $fhint_post( array( 'source' => 'ai' ) ), false ) )['source'], 'the free plugin does not accept AI as a source' );

add_filter(
	'fhint_post_sources',
	function ( $sources ) {
		$sources[] = 'ai';
		return $sources;
	}
);
check_same( array(), $fhint_codes( PostValidator::validate( $fhint_post( array( 'source' => 'ai' ) ), false ) ), 'Pro can add a source through fhint_post_sources' );

// ── shape ─────────────────────────────────────────────────────────────

$shaped = Posts::shape( array_merge( PostRepository::COLUMNS, array( 'topic_type' => 'update', 'title' => 'x', 'starts_at' => '2026-01-01 00:00:00', 'coupon_code' => 'C' ) ) );
check_same( array( '', '', '' ), array( $shaped['title'], $shaped['starts_at'], $shaped['coupon_code'] ), "an update drops an event's and an offer's fields" );
$shaped = Posts::shape( array_merge( PostRepository::COLUMNS, array( 'topic_type' => 'offer', 'cta_type' => 'book', 'cta_url' => 'https://x.example' ) ) );
check_same( array( '', '' ), array( $shaped['cta_type'], $shaped['cta_url'] ), 'an offer drops the button' );
$shaped = Posts::shape( array_merge( PostRepository::COLUMNS, array( 'topic_type' => 'event', 'coupon_code' => 'C', 'cta_type' => 'call', 'cta_url' => 'https://x.example' ) ) );
check_same( array( '', '' ), array( $shaped['coupon_code'], $shaped['cta_url'] ), "an event drops the coupon, and a call button its link" );

// ── can Google fetch the photo ────────────────────────────────────────

foreach ( array(
	'http://localhost:8100/wp-content/uploads/a.jpg' => false,
	'http://mysite.test/a.jpg'                       => false,
	'http://shop.local/a.jpg'                        => false,
	'http://127.0.0.1/a.jpg'                         => false,
	'http://192.168.1.20/a.jpg'                      => false,
	'http://10.0.0.5/a.jpg'                          => false,
	'http://[::1]/a.jpg'                             => false,
	'http://intranet/a.jpg'                          => false,
	'https://lh3.googleusercontent.com/p/abc'        => true,
	'https://example.org/a.jpg'                      => true,
	'https://8.8.8.8/a.jpg'                          => true,
) as $url => $expected ) {
	check_same( $expected, PostMedia::is_reachable( $url ), ( $expected ? 'Google can fetch ' : 'Google cannot fetch ' ) . $url );
}

// ── Google's temporary photo link ────────────────────────────────────

check( PostMedia::is_temporary( 'https://lh3.googleusercontent.com/gpu-csl/AM3A8OY' ), "an upload's processing link is temporary" );
check( ! PostMedia::is_temporary( 'https://lh3.googleusercontent.com/grass-cs/AABk=s0' ), 'a lasting link is not' );
check( ! PostMedia::is_temporary( 'https://lh3.googleusercontent.com/p/AF1Qip' ), "a listing photo's link is not" );
check_same( 'post.media_url.processing', $fhint_codes( PostValidator::validate( $fhint_post( array( 'summary' => 'S', 'cta_type' => '', 'media_url' => 'https://lh3.googleusercontent.com/gpu-csl/x' ) ), true ) )['media_url'] ?? '', 'publishing with a still-processing photo is refused with a reason' );
check_same( array(), $fhint_codes( PostValidator::validate( $fhint_post( array( 'media_url' => 'https://lh3.googleusercontent.com/gpu-csl/x' ) ), false ) ), 'a draft may keep it, to publish once it settles' );

finish( 'Posts' );
