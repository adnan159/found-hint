<?php
/**
 * Translation from Google's review payload into this plugin's shape.
 *
 * @package FoundHint
 */

namespace FHINT\App\Review;

defined( 'ABSPATH' ) || exit;

/**
 * Turns one review as Google sends it into one row this plugin understands.
 *
 * It exists so that Google's vocabulary stops at the edge: everything inland
 * deals in integers and MySQL datetimes, and the day Google renames a field
 * there is one file to change.
 *
 * Nothing here talks to the network or the database — give it an array, get
 * an array — which is what lets the whole translation be tested without
 * either.
 */
class ReviewMapper {

	/**
	 * Google's star words, in the order a human counts them.
	 *
	 * `STAR_RATING_UNSPECIFIED`, and anything unrecognised, map to 0 rather
	 * than to one star. Zero means "Google did not say", and the averaging
	 * in {@see ReviewRepository::summary()} skips it; treating it as the
	 * lowest rating would invent a bad review that nobody wrote.
	 */
	const STARS = array(
		'ONE'   => 1,
		'TWO'   => 2,
		'THREE' => 3,
		'FOUR'  => 4,
		'FIVE'  => 5,
	);

	/**
	 * Map one review.
	 *
	 * @param array  $review        One entry of Google's `reviews` array.
	 * @param string $location_name Google location resource name.
	 * @param string $account_name  Google account resource name.
	 * @return array|null Null when the payload carries no review id, which
	 *                    is the one field nothing can be stored without.
	 */
	public static function from_google( array $review, $location_name, $account_name ) {
		$review_id = isset( $review['reviewId'] ) ? trim( (string) $review['reviewId'] ) : '';

		if ( '' === $review_id ) {
			return null;
		}

		$reviewer = isset( $review['reviewer'] ) && is_array( $review['reviewer'] ) ? $review['reviewer'] : array();
		$reply    = isset( $review['reviewReply'] ) && is_array( $review['reviewReply'] ) ? $review['reviewReply'] : array();

		$is_anonymous = ! empty( $reviewer['isAnonymous'] );

		return array(
			'review_id'         => $review_id,
			'location_name'     => (string) $location_name,
			'account_name'      => (string) $account_name,
			// An anonymous reviewer's display name is not ours to keep, even
			// when Google happens to send one.
			'reviewer_name'     => $is_anonymous ? '' : self::text( $reviewer, 'displayName' ),
			'reviewer_photo'    => $is_anonymous ? '' : esc_url_raw( self::text( $reviewer, 'profilePhotoUrl' ) ),
			'is_anonymous'      => $is_anonymous,
			'star_rating'       => self::stars( isset( $review['starRating'] ) ? $review['starRating'] : '' ),
			'comment'           => self::text( $review, 'comment' ),
			'reply_comment'     => self::text( $reply, 'comment' ),
			'replied_at'        => self::datetime( isset( $reply['updateTime'] ) ? $reply['updateTime'] : '' ),
			'reviewed_at'       => self::datetime( isset( $review['createTime'] ) ? $review['createTime'] : '' ),
			'review_updated_at' => self::datetime( isset( $review['updateTime'] ) ? $review['updateTime'] : '' ),
			'payload'           => $review,
		);
	}

	/**
	 * Map a whole page of reviews, dropping any that cannot be identified.
	 *
	 * @param array  $payload       Google's response body.
	 * @param string $location_name Google location resource name.
	 * @param string $account_name  Google account resource name.
	 * @return array[]
	 */
	public static function from_page( array $payload, $location_name, $account_name ) {
		$reviews = isset( $payload['reviews'] ) && is_array( $payload['reviews'] ) ? $payload['reviews'] : array();
		$mapped  = array();

		foreach ( $reviews as $review ) {
			if ( ! is_array( $review ) ) {
				continue;
			}

			$row = self::from_google( $review, $location_name, $account_name );

			if ( null !== $row ) {
				$mapped[] = $row;
			}
		}

		return $mapped;
	}

	/**
	 * Google's star word as a number.
	 *
	 * @param mixed $value Whatever the payload held.
	 * @return int 1–5, or 0 when Google did not say.
	 */
	public static function stars( $value ) {
		$key = strtoupper( trim( (string) $value ) );

		return isset( self::STARS[ $key ] ) ? self::STARS[ $key ] : 0;
	}

	/**
	 * An RFC 3339 timestamp as a MySQL datetime in UTC.
	 *
	 * Google sends `2026-10-04T06:32:28.123456Z`. Storage is UTC throughout
	 * this plugin, so the value is only reformatted, never shifted.
	 *
	 * @param mixed $value Whatever the payload held.
	 * @return string|null MySQL datetime, or null when unparseable.
	 */
	public static function datetime( $value ) {
		$raw = trim( (string) $value );

		if ( '' === $raw ) {
			return null;
		}

		$timestamp = strtotime( $raw );

		if ( false === $timestamp ) {
			return null;
		}

		return gmdate( 'Y-m-d H:i:s', $timestamp );
	}

	/**
	 * One string field, trimmed, never null.
	 *
	 * @param array  $source Array to read from.
	 * @param string $key    Field name.
	 * @return string
	 */
	private static function text( array $source, $key ) {
		return isset( $source[ $key ] ) ? trim( (string) $source[ $key ] ) : '';
	}
}
