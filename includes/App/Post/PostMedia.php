<?php
/**
 * The photo on a post.
 *
 * @package FoundHint
 */

namespace FHINT\App\Post;

use FHINT\App\Core\Logger;
use FHINT\App\Google\Client;
use FHINT\App\Google\GoogleLocationRepository;
use FHINT\App\Media\MediaRepository;
use FHINT\App\Media\MediaSync;
use FHINT\App\Media\MediaUpload;
use FHINT\App\Review\ReviewRepository;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Where a post's photo can come from.
 *
 * **Google takes a post's photo only as a link it fetches itself** — unlike
 * a listing photo, it cannot be sent as bytes. On a public site the link to
 * the media-library file is enough. On a site Google cannot reach (local,
 * staging behind a login, a private network) the photo is first put on the
 * listing's own gallery — which *can* be sent as bytes — and the post uses
 * Google's copy. The photo then also shows in the profile's Photos; the
 * screen says so before the owner uploads (`uploads_reachable` in the
 * posts state).
 *
 * Photos already on Google — the listing's gallery and customers' review
 * photos — are on Google's own servers and always work.
 */
class PostMedia {

	/**
	 * Put an uploaded photo in the media library for a post.
	 *
	 * Google's limits for a photo are the same as the listing's, so the
	 * listing's checks are reused.
	 *
	 * @param array  $upload        One entry of `$_FILES`.
	 * @param string $location_name The listing the post is for; its gallery
	 *                              takes the photo when Google cannot reach
	 *                              this site.
	 * @return array|\FHINT\App\Core\ValidationResult|WP_Error `{ attachment_id, url, reachable, via_gallery }`.
	 */
	public static function upload( array $upload, $location_name = '' ) {
		$listing = GoogleLocationRepository::find_by_location_name( (string) $location_name );

		if ( ! $listing ) {
			return new WP_Error(
				'fhint_no_google_location',
				__( 'That location has no Google listing. Read your Google profile first.', 'foundhint-local-seo' ),
				array( 'status' => 404 )
			);
		}

		if ( empty( $upload['tmp_name'] ) || ! empty( $upload['error'] ) || ! is_readable( (string) $upload['tmp_name'] ) ) {
			return new WP_Error(
				'fhint_media_no_file',
				__( 'No photo arrived. Choose the file again.', 'foundhint-local-seo' ),
				array( 'status' => 400 )
			);
		}

		// Measured from the file itself, not from what the browser claimed.
		$size  = getimagesize( (string) $upload['tmp_name'] );
		$check = wp_check_filetype_and_ext( (string) $upload['tmp_name'], isset( $upload['name'] ) ? (string) $upload['name'] : '' );

		$validation = MediaUpload::validate(
			array(
				'mime_type' => is_array( $size ) && ! empty( $size['mime'] ) && ! empty( $check['type'] ) ? (string) $size['mime'] : '',
				'file_size' => (int) filesize( (string) $upload['tmp_name'] ),
				'width'     => is_array( $size ) ? (int) $size[0] : 0,
				'height'    => is_array( $size ) ? (int) $size[1] : 0,
			)
		);

		if ( ! $validation->is_valid() ) {
			return $validation;
		}

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$attachment_id = media_handle_sideload(
			array(
				'name'     => sanitize_file_name( isset( $upload['name'] ) ? (string) $upload['name'] : 'photo.jpg' ),
				'tmp_name' => (string) $upload['tmp_name'],
			),
			0
		);

		if ( is_wp_error( $attachment_id ) ) {
			return new WP_Error(
				'fhint_media_store_failed',
				__( 'The photo could not be added to your media library.', 'foundhint-local-seo' ),
				array( 'status' => 500 )
			);
		}

		$url = (string) wp_get_attachment_url( $attachment_id );

		if ( self::is_reachable( $url ) ) {
			return array(
				'attachment_id' => (int) $attachment_id,
				'url'           => $url,
				'reachable'     => true,
				'via_gallery'   => false,
			);
		}

		return self::via_gallery( (int) $attachment_id, (string) $size['mime'], $listing );
	}

	/**
	 * Put an uploaded photo on the listing's Google gallery, and answer with
	 * Google's link to it — one Google can always fetch.
	 *
	 * @param int    $attachment_id Media-library id.
	 * @param string $mime_type     Measured type.
	 * @param array  $listing       Stored Google listing.
	 * @return array|WP_Error
	 */
	private static function via_gallery( $attachment_id, $mime_type, array $listing ) {
		$path = (string) get_attached_file( $attachment_id );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- A local file, read to be sent.
		$bytes = is_readable( $path ) ? file_get_contents( $path ) : false;

		$created = MediaUpload::send_file(
			false === $bytes ? '' : $bytes,
			$mime_type,
			$listing['location_name'],
			$listing['account_name'],
			MediaSync::category( MediaRepository::ROLE_GALLERY )
		);

		if ( is_wp_error( $created ) ) {
			return $created;
		}

		$photo = MediaSync::from_google( self::settled( $created ) );

		if ( ! $photo || ! PostValidator::is_url( $photo['url'] ) ) {
			return new WP_Error(
				'fhint_media_upload_failed',
				__( 'The photo was added to your Google profile, but Google did not say where. Choose it from Your gallery after a refresh.', 'foundhint-local-seo' ),
				array( 'status' => 502 )
			);
		}

		// The Photos tab shows it at once, as on Google, rather than after the
		// next refresh.
		if ( ! empty( $listing['fhint_location_id'] ) ) {
			MediaRepository::upsert_from_google( (int) $listing['fhint_location_id'], $photo );
		}

		Logger::info( 'posts', 'posts.photo_to_gallery', __( "A post's photo was added to the Google profile's photos.", 'foundhint-local-seo' ) );

		return array(
			'attachment_id' => (int) $attachment_id,
			'url'           => $photo['url'],
			'reachable'     => true,
			'via_gallery'   => true,
		);
	}

	/**
	 * A just-uploaded photo, once Google has given it its lasting link.
	 *
	 * Google's answer to an upload carries a temporary address (under
	 * `/gpu-csl/`) while it processes the photo. It loads in a browser, but
	 * Google's own post service refuses it — a post sent with it fails with
	 * "Internal error encountered". Asking for the photo again a moment later
	 * returns its lasting address, which posts accept.
	 *
	 * @param array $created Google's answer to the upload.
	 * @return array The media item, with the best link Google gave.
	 */
	public static function settled( array $created ) {
		if ( ! self::is_temporary( isset( $created['googleUrl'] ) ? (string) $created['googleUrl'] : '' ) || empty( $created['name'] ) ) {
			return $created;
		}

		/**
		 * Filters the pause, in seconds, between asks for a just-uploaded
		 * photo's lasting link. Tests set it to 0.
		 *
		 * @param int $seconds Pause.
		 */
		$pause = max( 0, (int) apply_filters( 'fhint_media_settle_pause', 2 ) );

		for ( $attempt = 0; $attempt < 4; $attempt++ ) {
			if ( $attempt && $pause ) {
				sleep( $pause );
			}

			$item = Client::get( sprintf( 'https://mybusiness.googleapis.com/v4/%s', (string) $created['name'] ) );

			if ( is_array( $item ) && ! is_wp_error( $item ) && ! empty( $item['googleUrl'] ) && ! self::is_temporary( (string) $item['googleUrl'] ) ) {
				return $item;
			}
		}

		return $created;
	}

	/**
	 * Whether a Google photo link is the temporary one an upload answers with.
	 *
	 * @param string $url Link.
	 * @return bool
	 */
	public static function is_temporary( $url ) {
		return false !== strpos( (string) $url, '.googleusercontent.com/gpu-csl/' );
	}

	/**
	 * Photos already on Google that a post can use, for one location.
	 *
	 * @param string $location_name Google location resource name.
	 * @return array{gallery: array[], customer: array[]}
	 */
	public static function choices( $location_name ) {
		$listing = GoogleLocationRepository::find_by_location_name( (string) $location_name );
		$gallery = array();

		if ( $listing && $listing['fhint_location_id'] ) {
			foreach ( MediaRepository::for_location( $listing['fhint_location_id'] ) as $photo ) {
				if ( MediaRepository::STATE_SYNCED === $photo['state'] && PostValidator::is_url( $photo['url'] ) ) {
					$gallery[] = array(
						'url'   => $photo['url'],
						'label' => '',
					);
				}
			}
		}

		$customer = array();

		if ( $listing ) {
			foreach ( ReviewRepository::all( array( 'location_name' => $listing['location_name'] ) ) as $review ) {
				foreach ( $review['photos'] as $photo ) {
					$customer[] = array(
						'url'   => $photo['full'],
						'thumb' => $photo['thumb'],
						'label' => $review['is_anonymous'] ? '' : (string) $review['reviewer_name'],
					);
				}
			}
		}

		return array(
			'gallery'  => $gallery,
			'customer' => $customer,
		);
	}

	/**
	 * Whether Google could fetch a link: an http(s) address on a public
	 * host — not localhost, not a .test/.local/.localhost/.internal name,
	 * not a private or reserved IP.
	 *
	 * @param string $url Link.
	 * @return bool
	 */
	public static function is_reachable( $url ) {
		if ( ! PostValidator::is_url( $url ) ) {
			return false;
		}

		$host = strtolower( trim( (string) wp_parse_url( $url, PHP_URL_HOST ), '[]' ) );

		if ( 'localhost' === $host || preg_match( '/\.(test|local|localhost|internal|example|invalid)$/', $host ) ) {
			return false;
		}

		if ( filter_var( $host, FILTER_VALIDATE_IP ) ) {
			return false !== filter_var( $host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE );
		}

		// A bare name with no dot is a machine on a private network.
		return false !== strpos( $host, '.' );
	}
}
