<?php
/**
 * Answering a review on Google.
 *
 * @package FoundHint
 */

namespace FHINT\App\Review;

use FHINT\App\Core\Logger;
use FHINT\App\Core\ValidationResult;
use FHINT\App\Google\Client;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Posts, edits and removes the owner's reply to one review.
 *
 * **Google first, then the row.** A reply is public the moment Google takes
 * it, so the stored copy changes only after Google has said yes. A refused
 * reply leaves the row as it was, and the screen goes on showing what the
 * public sees.
 *
 * Google keeps one reply per review: the same PUT creates it and replaces
 * it, so "edit" is not a separate operation here either.
 */
class ReviewReply {

	/**
	 * The longest reply Google accepts, in bytes of UTF-8 — not characters.
	 * A reply in Bengali or with emoji reaches it well before 4,096 letters.
	 */
	const MAX_BYTES = 4096;

	/**
	 * The legacy endpoint a review's reply lives at.
	 *
	 * `%1$s` is the account, `%2$s` the location, `%3$s` the review id.
	 */
	const REPLY_URL = 'https://mybusiness.googleapis.com/v4/%1$s/%2$s/reviews/%3$s/reply';

	/**
	 * Clean a reply as typed.
	 *
	 * Replies are plain text on Google, so tags are stripped; line breaks are
	 * kept, because an owner writing two paragraphs means two paragraphs.
	 *
	 * @param mixed $comment Reply as sent.
	 * @return string
	 */
	public static function sanitize( $comment ) {
		// sanitize_textarea_field() trims as well, so nothing more is needed.
		return sanitize_textarea_field( is_string( $comment ) ? $comment : '' );
	}

	/**
	 * Whether a cleaned reply can be sent.
	 *
	 * @param string $comment Sanitised reply.
	 * @return ValidationResult
	 */
	public static function validate( $comment ) {
		$result = new ValidationResult();

		if ( '' === (string) $comment ) {
			$result->add( 'comment', 'review.reply.required' );
		} elseif ( strlen( (string) $comment ) > self::MAX_BYTES ) {
			$result->add( 'comment', 'review.reply.too_long' );
		}

		return $result;
	}

	/**
	 * Post or replace the reply to one review.
	 *
	 * @param string $review_id Google review id.
	 * @param mixed  $comment   Reply as sent.
	 * @return array|ValidationResult|WP_Error The review as stored afterwards.
	 */
	public static function save( $review_id, $comment ) {
		$review = ReviewRepository::find( $review_id );

		if ( ! $review ) {
			return self::not_found();
		}

		if ( ! empty( $review['removed_at'] ) ) {
			return self::removed();
		}

		$comment    = self::sanitize( $comment );
		$validation = self::validate( $comment );

		if ( ! $validation->is_valid() ) {
			return $validation;
		}

		$response = Client::put( self::url( $review ), array(), array( 'comment' => $comment ) );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		// What Google stored, which is what the public now reads. It echoes
		// the reply back; the text sent stands in if it ever does not.
		$stored = isset( $response['comment'] ) && '' !== (string) $response['comment'] ? (string) $response['comment'] : $comment;
		$when   = ReviewMapper::datetime( isset( $response['updateTime'] ) ? (string) $response['updateTime'] : '' );

		if ( ! ReviewRepository::set_reply( $review['review_id'], $stored, $when ? $when : current_time( 'mysql', true ) ) ) {
			return self::save_failed();
		}

		Logger::info( 'reviews', 'reviews.replied', __( 'Replied to a review on Google.', 'foundhint-local-seo' ) );

		return Reviews::one( $review['review_id'] );
	}

	/**
	 * Remove the reply to one review.
	 *
	 * @param string $review_id Google review id.
	 * @return array|WP_Error The review as stored afterwards.
	 */
	public static function delete( $review_id ) {
		$review = ReviewRepository::find( $review_id );

		if ( ! $review ) {
			return self::not_found();
		}

		$response = Client::delete( self::url( $review ) );

		// Google answers 404 when there is no reply to remove — one already
		// deleted on Google itself. The outcome the owner asked for is true
		// either way, so the stored copy is brought into line rather than
		// showing them an error about a reply that is gone.
		if ( is_wp_error( $response ) && ! self::is_missing( $response ) ) {
			return $response;
		}

		if ( ! ReviewRepository::set_reply( $review['review_id'], '', null ) ) {
			return self::save_failed();
		}

		Logger::info( 'reviews', 'reviews.reply_deleted', __( 'Removed a reply to a review on Google.', 'foundhint-local-seo' ) );

		return Reviews::one( $review['review_id'] );
	}

	/**
	 * Where a review's reply lives on Google.
	 *
	 * Built from the stored row — names Google gave this site during a sync —
	 * and never from the request, so a caller cannot point a write at a
	 * listing this site did not read.
	 *
	 * @param array $review Stored review.
	 * @return string
	 */
	private static function url( array $review ) {
		return sprintf(
			self::REPLY_URL,
			$review['account_name'],
			$review['location_name'],
			rawurlencode( $review['review_id'] )
		);
	}

	/**
	 * Whether Google refused because the reply is not there.
	 *
	 * @param WP_Error $error Error from the client.
	 * @return bool
	 */
	private static function is_missing( WP_Error $error ) {
		$data = $error->get_error_data();

		return is_array( $data ) && isset( $data['http_status'] ) && 404 === (int) $data['http_status'];
	}

	/**
	 * A review its author removed from Google: there is nothing left there
	 * to reply to.
	 *
	 * @return WP_Error
	 */
	private static function removed() {
		return new WP_Error(
			'fhint_review_removed',
			__( 'This review was removed from Google, so it can no longer be replied to.', 'foundhint-local-seo' ),
			array( 'status' => 409 )
		);
	}

	/**
	 * A review this site has not stored.
	 *
	 * @return WP_Error
	 */
	private static function not_found() {
		return new WP_Error(
			'fhint_review_not_found',
			__( 'That review could not be found. Read your reviews from Google again.', 'foundhint-local-seo' ),
			array( 'status' => 404 )
		);
	}

	/**
	 * Google took the change but the copy here could not be written.
	 *
	 * @return WP_Error
	 */
	private static function save_failed() {
		return new WP_Error(
			'fhint_save_failed',
			__( 'Google has the change, but it could not be saved here. Read your reviews from Google to catch up.', 'foundhint-local-seo' ),
			array( 'status' => 500 )
		);
	}
}
