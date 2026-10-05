<?php
/**
 * Reading Google's reviews into FoundHint's shapes.
 *
 * Run with plain PHP: `php tests/Smoke/reviews.php`.
 *
 * This is the translation layer and the one rule the screens share. A wrong
 * answer here is not a cosmetic bug: a star rating read as zero drags an
 * honest average down, an anonymous reviewer's name kept is somebody's
 * privacy, and a reply mistaken for absent tells an owner they have ignored
 * a customer they already answered.
 *
 * Storing, paging and pruning need a database and are covered in
 * tests/Integration/database.php.
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\App\Review\ReviewMapper;
use FHINT\App\Review\Reviews;

echo "Reviews\n";

/**
 * A Google review, with overrides merged in.
 *
 * @param array $overrides Fields to replace.
 * @return array
 */
function fhint_review( array $overrides = array() ) {
	return array_merge(
		array(
			'reviewId'   => 'rev-1',
			'reviewer'   => array(
				'displayName'     => 'Asha Rahman',
				'profilePhotoUrl' => 'https://lh3.googleusercontent.com/a/photo',
			),
			'starRating' => 'FIVE',
			'comment'    => 'Fixed my boiler the same afternoon.',
			'createTime' => '2026-09-14T09:12:00.123456Z',
			'updateTime' => '2026-09-14T09:12:00.123456Z',
		),
		$overrides
	);
}

/**
 * Map one review with the usual location and account.
 *
 * @param array $overrides Fields to replace.
 * @return array|null
 */
function fhint_map( array $overrides = array() ) {
	return ReviewMapper::from_google( fhint_review( $overrides ), 'locations/42', 'accounts/7' );
}

// ── star ratings ────────────────────────────────────────────────────────

check_same( 5, ReviewMapper::stars( 'FIVE' ), 'FIVE is five stars' );
check_same( 4, ReviewMapper::stars( 'FOUR' ), 'FOUR is four stars' );
check_same( 3, ReviewMapper::stars( 'THREE' ), 'THREE is three stars' );
check_same( 2, ReviewMapper::stars( 'TWO' ), 'TWO is two stars' );
check_same( 1, ReviewMapper::stars( 'ONE' ), 'ONE is one star' );
check_same( 5, ReviewMapper::stars( 'five' ), 'the star word is read case-insensitively' );

// The important one: unspecified must not become one star. Counting it as
// the lowest rating would invent a bad review nobody wrote.
check_same( 0, ReviewMapper::stars( 'STAR_RATING_UNSPECIFIED' ), 'an unspecified rating is 0, not 1' );
check_same( 0, ReviewMapper::stars( '' ), 'a missing rating is 0' );
check_same( 0, ReviewMapper::stars( 'SIX' ), 'a rating word nobody has heard of is 0' );

// ── timestamps ──────────────────────────────────────────────────────────

check_same(
	'2026-09-14 09:12:00',
	ReviewMapper::datetime( '2026-09-14T09:12:00.123456Z' ),
	'an RFC 3339 time with fractional seconds becomes a MySQL datetime'
);
check_same(
	'2026-09-14 09:12:00',
	ReviewMapper::datetime( '2026-09-14T09:12:00Z' ),
	'an RFC 3339 time without fractional seconds works too'
);
// Google sends UTC; storage is UTC. An offset must be converted, not kept,
// or reviews from one timezone sort wrongly against another.
check_same(
	'2026-09-14 09:12:00',
	ReviewMapper::datetime( '2026-09-14T15:12:00+06:00' ),
	'an offset time is converted to UTC rather than stored as written'
);
check_same( null, ReviewMapper::datetime( '' ), 'an empty time is null, not the epoch' );
check_same( null, ReviewMapper::datetime( 'whenever' ), 'an unparseable time is null' );

// ── one review ──────────────────────────────────────────────────────────

$mapped = fhint_map();

check_same( 'rev-1', $mapped['review_id'], 'the review id is carried' );
check_same( 'locations/42', $mapped['location_name'], 'the location is recorded' );
check_same( 'accounts/7', $mapped['account_name'], 'the account is recorded' );
check_same( 'Asha Rahman', $mapped['reviewer_name'], 'the reviewer is named' );
check_same( 5, $mapped['star_rating'], 'the rating is a number' );
check_same( 'Fixed my boiler the same afternoon.', $mapped['comment'], 'the comment is carried' );
check_same( '2026-09-14 09:12:00', $mapped['reviewed_at'], 'the review date is converted' );
check_same( '', $mapped['reply_comment'], 'an unanswered review has an empty reply, not null' );
check_same( null, $mapped['replied_at'], 'an unanswered review has no reply date' );
check( is_array( $mapped['payload'] ), 'the raw payload is kept for fields no column covers' );

// A rating with no words is a normal review, not a broken one.
check_same( '', fhint_map( array( 'comment' => '' ) )['comment'], 'a rating with no comment maps cleanly' );
check_same( 4, fhint_map( array( 'starRating' => 'FOUR', 'comment' => '' ) )['star_rating'], 'and keeps its rating' );

// ── the review id is the one thing nothing works without ────────────────

check_same( null, fhint_map( array( 'reviewId' => '' ) ), 'a review with no id is refused' );
check_same( null, ReviewMapper::from_google( array(), 'locations/42', 'accounts/7' ), 'an empty payload is refused' );

// ── anonymity ───────────────────────────────────────────────────────────

$anon = fhint_map(
	array(
		'reviewer' => array(
			'displayName'     => 'Asha Rahman',
			'profilePhotoUrl' => 'https://lh3.googleusercontent.com/a/photo',
			'isAnonymous'     => true,
		),
	)
);

check( $anon['is_anonymous'], 'an anonymous reviewer is flagged' );
check_same( '', $anon['reviewer_name'], 'an anonymous reviewer keeps no name, even when Google sends one' );
check_same( '', $anon['reviewer_photo'], 'an anonymous reviewer keeps no photo' );

// ── replies ─────────────────────────────────────────────────────────────

$answered = fhint_map(
	array(
		'reviewReply' => array(
			'comment'    => 'Thank you, Asha — glad we could help.',
			'updateTime' => '2026-09-15T11:00:00Z',
		),
	)
);

check_same( 'Thank you, Asha — glad we could help.', $answered['reply_comment'], 'the reply is carried' );
check_same( '2026-09-15 11:00:00', $answered['replied_at'], 'the reply date is converted' );

// ── needs_reply, the rule two screens and an audit rule share ───────────

check( Reviews::needs_reply( array( 'reply_comment' => '' ) ), 'an empty reply needs one' );
check( Reviews::needs_reply( array() ), 'a missing reply field needs one' );
// Whitespace is not an answer. An owner who typed a space has not replied.
check( Reviews::needs_reply( array( 'reply_comment' => "  \n " ) ), 'a whitespace-only reply still needs one' );
check( ! Reviews::needs_reply( array( 'reply_comment' => 'Thanks!' ) ), 'a real reply does not need another' );

// ── a page of reviews ───────────────────────────────────────────────────

$page = ReviewMapper::from_page(
	array(
		'reviews' => array(
			fhint_review( array( 'reviewId' => 'a' ) ),
			fhint_review( array( 'reviewId' => '' ) ),
			'not an array',
			fhint_review( array( 'reviewId' => 'b' ) ),
		),
	),
	'locations/42',
	'accounts/7'
);

check_same( 2, count( $page ), 'a page drops entries that cannot be identified' );
check_same( 'a', $page[0]['review_id'], 'and keeps the ones that can, in order' );
check_same( 'b', $page[1]['review_id'], 'including the one after the bad entry' );

check_same( array(), ReviewMapper::from_page( array(), 'locations/42', 'accounts/7' ), 'a response with no reviews is an empty list' );
check_same(
	array(),
	ReviewMapper::from_page( array( 'reviews' => 'nonsense' ), 'locations/42', 'accounts/7' ),
	'a response whose reviews are not a list is an empty list'
);

finish( 'Reviews' );
