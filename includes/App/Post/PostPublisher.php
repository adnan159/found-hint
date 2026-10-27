<?php
/**
 * Sending posts to Google, and taking them down.
 *
 * @package FoundHint
 */

namespace FHINT\App\Post;

use FHINT\App\Core\Logger;
use FHINT\App\Google\Client;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Talks to Google about one post at a time.
 *
 * Two rules, from the two kinds of post:
 *
 * - **A new post is kept whatever Google says.** It is stored first; a
 *   refusal marks it `failed` with Google's reason, so what the owner wrote
 *   is never lost and "Retry" can send it again.
 * - **An edit to a live post changes the row only once Google has taken
 *   it.** The row is what the public sees; a refused edit leaves it saying
 *   so, and the error goes back to the form that is still open.
 */
class PostPublisher {

	/** Where a new post is created. `%1$s` account, `%2$s` location. */
	const CREATE_URL = 'https://mybusiness.googleapis.com/v4/%1$s/%2$s/localPosts';

	/** One post. `%s` is its resource name, which carries the account and location. */
	const POST_URL = 'https://mybusiness.googleapis.com/v4/%s';

	/**
	 * Send a stored post that is not on Google yet — a draft, or one that
	 * failed before.
	 *
	 * @param array $post Stored post.
	 * @return array|WP_Error The post as stored afterwards.
	 */
	public static function send_new( array $post ) {
		$response = Client::post(
			sprintf( self::CREATE_URL, $post['account_name'], $post['location_name'] ),
			array(),
			PostMapper::to_google( $post, self::language() )
		);

		if ( is_wp_error( $response ) ) {
			PostRepository::update(
				$post['id'],
				array(
					'status' => 'failed',
					'error'  => self::reason( $response ),
				)
			);

			Logger::error( 'posts', 'posts.publish_failed', __( 'Google refused a post.', 'foundhint-local-seo' ) );

			return self::with_post( $response, $post['id'] );
		}

		$stored = self::store_answer( $post, (array) $response );

		Logger::info( 'posts', 'posts.published', __( 'A post was sent to Google.', 'foundhint-local-seo' ) );

		return $stored;
	}

	/**
	 * Replace a post that is on Google with an edited version.
	 *
	 * @param array $post    The post as stored now.
	 * @param array $changes Its edited fields, already validated.
	 * @return array|WP_Error The post as stored afterwards.
	 */
	public static function send_edit( array $post, array $changes ) {
		$edited = array_merge( $post, $changes );

		$response = Client::patch(
			sprintf( self::POST_URL, $post['google_name'] ),
			array(
				'updateMask' => PostMapper::update_mask(
					$post['topic_type'],
					isset( $changes['media_url'] ) && (string) $changes['media_url'] !== (string) $post['media_url']
				),
			),
			PostMapper::to_google( $edited, self::language() )
		);

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		PostRepository::update( $post['id'], $changes );

		$stored = self::store_answer( PostRepository::find( $post['id'] ), (array) $response );

		Logger::info( 'posts', 'posts.updated', __( 'A post was updated on Google.', 'foundhint-local-seo' ) );

		return $stored;
	}

	/**
	 * Take a post off Google, then forget it here.
	 *
	 * @param array $post Stored post.
	 * @return true|WP_Error
	 */
	public static function delete( array $post ) {
		if ( '' !== $post['google_name'] ) {
			$response = Client::delete( sprintf( self::POST_URL, $post['google_name'] ) );

			// 404: already gone from Google — deleted there by hand. What the
			// owner asked for is true either way.
			if ( is_wp_error( $response ) && ! self::is_missing( $response ) ) {
				return $response;
			}

			Logger::info( 'posts', 'posts.deleted', __( 'A post was deleted from Google.', 'foundhint-local-seo' ) );
		}

		PostRepository::delete( $post['id'] );

		return true;
	}

	/**
	 * Record Google's answer for a post it accepted.
	 *
	 * @param array $post     Stored post.
	 * @param array $response Google's LocalPost.
	 * @return array|WP_Error
	 */
	private static function store_answer( array $post, array $response ) {
		$mapped = PostMapper::from_google( $response, $post['location_name'], $post['account_name'] );

		$changes = array(
			'status'    => 'live',
			'error'     => '',
			'synced_at' => current_time( 'mysql', true ),
		);

		if ( $mapped ) {
			$changes['google_name']  = $mapped['google_name'];
			$changes['status']       = $mapped['status'];
			$changes['search_url']   = $mapped['search_url'];
			$changes['payload']      = $mapped['payload'];
			$changes['published_at'] = $mapped['published_at'] ? $mapped['published_at'] : current_time( 'mysql', true );
		} else {
			$changes['published_at'] = current_time( 'mysql', true );
		}

		$stored = PostRepository::update( $post['id'], $changes );

		if ( ! $stored ) {
			return new WP_Error(
				'fhint_save_failed',
				__( 'Google took the post, but it could not be saved here. Sync posts to see it.', 'foundhint-local-seo' ),
				array( 'status' => 500 )
			);
		}

		return $stored;
	}

	/**
	 * Google's language code for the site's language: 'en_GB' → 'en-GB'.
	 *
	 * @return string
	 */
	private static function language() {
		$locale = function_exists( 'get_locale' ) ? (string) get_locale() : 'en_US';

		return '' !== $locale ? str_replace( '_', '-', $locale ) : 'en';
	}

	/**
	 * Google's reason, short enough to store.
	 *
	 * @param WP_Error $error Refusal.
	 * @return string
	 */
	private static function reason( WP_Error $error ) {
		return function_exists( 'mb_substr' ) ? mb_substr( $error->get_error_message(), 0, 1000 ) : substr( $error->get_error_message(), 0, 1000 );
	}

	/**
	 * A refusal, carrying the post as it is now stored, so the screen can
	 * show it as failed without another request.
	 *
	 * @param WP_Error $error Refusal.
	 * @param int      $id    Row id.
	 * @return WP_Error
	 */
	private static function with_post( WP_Error $error, $id ) {
		$data = $error->get_error_data();
		$data = is_array( $data ) ? $data : array();

		$data['post_id'] = (int) $id;

		$error->add_data( $data );

		return $error;
	}

	/**
	 * Whether Google answered "not found".
	 *
	 * @param WP_Error $error Refusal.
	 * @return bool
	 */
	private static function is_missing( WP_Error $error ) {
		$data = $error->get_error_data();

		return is_array( $data ) && isset( $data['http_status'] ) && 404 === (int) $data['http_status'];
	}
}
