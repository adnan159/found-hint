<?php
/**
 * Reading a listing's photos from Google.
 *
 * @package FoundHint
 */

namespace FHINT\App\Media;

use FHINT\App\Google\Client;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Lists the photos on a Google listing and keeps a pointer to each.
 *
 * **Nothing is downloaded.** A row records where Google serves the photo
 * from; the screen shows it from there. Copying forty full-size pictures
 * into the media library to show forty thumbnails would fill somebody's disk
 * with files they already have.
 *
 * Photos, like reviews, still live on the legacy v4 API. Only the owner's
 * own photos are listed; pictures customers added are a separate collection
 * and are not read here.
 */
class MediaSync {

	/**
	 * `%1$s` is the account resource name, `%2$s` the location's.
	 */
	const MEDIA_URL = 'https://mybusiness.googleapis.com/v4/%1$s/%2$s/media';

	const PAGE_SIZE = 100;

	/**
	 * How many pages to walk. 10 pages is 1,000 photos — past what the
	 * gallery shows, and a bound on how long one request can run.
	 */
	const MAX_PAGES = 10;

	/**
	 * Read every photo on the listing and store a row for each.
	 *
	 * @param int    $location_id   Row id in wp_fhint_locations.
	 * @param string $location_name Google location resource name.
	 * @param string $account_name  Google account resource name.
	 * @return int|WP_Error How many photos Google reported.
	 */
	public static function run( $location_id, $location_name, $account_name ) {
		$url   = sprintf( self::MEDIA_URL, (string) $account_name, (string) $location_name );
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

			foreach ( isset( $response['mediaItems'] ) && is_array( $response['mediaItems'] ) ? $response['mediaItems'] : array() as $item ) {
				$photo = self::from_google( $item );

				if ( $photo && MediaRepository::upsert_from_google( (int) $location_id, $photo ) ) {
					$seen[] = $photo['google_name'];
				}
			}

			$token = isset( $response['nextPageToken'] ) ? (string) $response['nextPageToken'] : '';
			++$pages;
		} while ( '' !== $token && $pages < self::MAX_PAGES );

		// Only when the whole list was read: pruning against half of it
		// would forget every photo on the pages that were not reached.
		if ( '' === $token ) {
			MediaRepository::prune_synced( (int) $location_id, $seen );
		}

		return count( $seen );
	}

	/**
	 * One of Google's media items as a row this plugin stores.
	 *
	 * @param mixed $item Google `MediaItem`.
	 * @return array|null Null for a video, or an item with nothing to show.
	 */
	public static function from_google( $item ) {
		if ( ! is_array( $item ) || empty( $item['name'] ) ) {
			return null;
		}

		if ( isset( $item['mediaFormat'] ) && 'PHOTO' !== strtoupper( (string) $item['mediaFormat'] ) ) {
			return null;
		}

		$url = isset( $item['googleUrl'] ) ? (string) $item['googleUrl'] : '';

		if ( '' === $url && isset( $item['thumbnailUrl'] ) ) {
			$url = (string) $item['thumbnailUrl'];
		}

		if ( '' === $url ) {
			return null;
		}

		$created = isset( $item['createTime'] ) ? strtotime( (string) $item['createTime'] ) : false;

		return array(
			'google_name' => (string) $item['name'],
			'role'        => self::role( isset( $item['locationAssociation']['category'] ) ? $item['locationAssociation']['category'] : '' ),
			'url'         => esc_url_raw( $url ),
			'width'       => isset( $item['dimensions']['widthPixels'] ) ? (int) $item['dimensions']['widthPixels'] : 0,
			'height'      => isset( $item['dimensions']['heightPixels'] ) ? (int) $item['dimensions']['heightPixels'] : 0,
			'uploaded_at' => $created ? gmdate( 'Y-m-d H:i:s', $created ) : null,
		);
	}

	/**
	 * What a photo is for, from the category Google files it under.
	 *
	 * Google has a dozen categories — exterior, interior, team, at work. Two
	 * of them are singular and shown on their own; everything else is the
	 * gallery.
	 *
	 * @param mixed $category e.g. 'COVER', 'LOGO', 'ADDITIONAL'.
	 * @return string
	 */
	public static function role( $category ) {
		$category = strtoupper( (string) $category );

		if ( 'COVER' === $category ) {
			return MediaRepository::ROLE_COVER;
		}

		if ( 'LOGO' === $category || 'PROFILE' === $category ) {
			return MediaRepository::ROLE_LOGO;
		}

		return MediaRepository::ROLE_GALLERY;
	}

	/**
	 * The category Google files a role under, for an upload.
	 *
	 * @param string $role logo | cover | gallery.
	 * @return string
	 */
	public static function category( $role ) {
		if ( MediaRepository::ROLE_COVER === $role ) {
			return 'COVER';
		}

		if ( MediaRepository::ROLE_LOGO === $role ) {
			return 'PROFILE';
		}

		return 'ADDITIONAL';
	}
}
