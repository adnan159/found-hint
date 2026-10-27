<?php
/**
 * Reading posts from Google into this site's own storage.
 *
 * @package FoundHint
 */

namespace FHINT\App\Post;

use FHINT\App\Core\Logger;
use FHINT\App\Google\Client;
use FHINT\App\Google\GoogleLocationRepository;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Fetches a location's posts from Google — including ones written on
 * Google itself — and forgets the ones Google no longer has.
 *
 * Read on demand only, like reviews: the Posts screen reads stored rows.
 */
class PostSync {

	/** `%1$s` account, `%2$s` location. */
	const LIST_URL = 'https://mybusiness.googleapis.com/v4/%1$s/%2$s/localPosts';

	/** Google's ceiling for one page. */
	const PAGE_SIZE = 100;

	/** 10 pages is 1,000 posts — years of posting. The stop is not silent. */
	const MAX_PAGES = 10;

	/**
	 * Read one location's posts.
	 *
	 * @param string $location_name Google location resource name.
	 * @return array|WP_Error `{ posts, removed }`.
	 */
	public static function run( $location_name ) {
		$location = GoogleLocationRepository::find_by_location_name( (string) $location_name );

		if ( ! $location ) {
			return new WP_Error(
				'fhint_no_google_location',
				__( 'That location has no Google listing. Read your Google profile first.', 'foundhint-local-seo' ),
				array( 'status' => 404 )
			);
		}

		$url   = sprintf( self::LIST_URL, $location['account_name'], $location['location_name'] );
		$seen  = array();
		$token = '';
		$pages = 0;

		do {
			$query = array( 'pageSize' => self::PAGE_SIZE );

			if ( '' !== $token ) {
				$query['pageToken'] = $token;
			}

			$response = Client::get( $url, $query );

			if ( is_wp_error( $response ) ) {
				return $response;
			}

			$items = isset( $response['localPosts'] ) && is_array( $response['localPosts'] ) ? $response['localPosts'] : array();

			foreach ( $items as $item ) {
				$mapped = is_array( $item ) ? PostMapper::from_google( $item, $location['location_name'], $location['account_name'] ) : null;

				if ( $mapped ) {
					PostRepository::upsert_from_google( $mapped );
					$seen[] = $mapped['google_name'];
				}
			}

			$token = isset( $response['nextPageToken'] ) ? (string) $response['nextPageToken'] : '';
			$pages++;
		} while ( '' !== $token && $pages < self::MAX_PAGES );

		// Only a complete read may forget anything: a post past the last
		// page walked is still on Google.
		$removed = '' === $token ? PostRepository::prune_missing( $location['location_name'], $seen ) : 0;

		Logger::info(
			'posts',
			'posts.synced',
			sprintf(
				/* translators: %d: number of posts. */
				_n( 'Read %d post from Google.', 'Read %d posts from Google.', count( $seen ), 'foundhint-local-seo' ),
				count( $seen )
			)
		);

		return array(
			'posts'   => count( $seen ),
			'removed' => $removed,
		);
	}
}
