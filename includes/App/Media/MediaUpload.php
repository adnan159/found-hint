<?php
/**
 * Choosing a photo here and sending it to Google.
 *
 * @package FoundHint
 */

namespace FHINT\App\Media;

use FHINT\App\Core\Logger;
use FHINT\App\Core\ValidationResult;
use FHINT\App\Google\Client;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * The two halves of adding a photo.
 *
 * **Choosing is not sending.** `add()` puts the file in the media library
 * and records it as waiting; nothing reaches Google until `publish()` is
 * asked for, one photo per request. That gap is deliberate: a photo on a
 * public listing cannot be quietly taken back, so the owner sees what is
 * queued before any of it goes.
 *
 * Google's limits are checked here, before the file is kept, because a
 * refusal three steps later — after the upload — says only "invalid
 * argument".
 */
class MediaUpload {

	const MAX_BYTES = 5242880; // 5 MB.
	const MIN_BYTES = 10240;   // 10 KB.
	const MIN_SIDE  = 250;

	const TYPES = array( 'image/jpeg', 'image/png' );

	/**
	 * Step one of three: ask Google for somewhere to put the bytes.
	 *
	 * `%1$s` is the account resource name, `%2$s` the location's.
	 */
	const START_URL = 'https://mybusiness.googleapis.com/v4/%1$s/%2$s/media:startUpload';

	/** Step two: the bytes, to the reference step one returned. */
	const BYTES_URL = 'https://mybusiness.googleapis.com/upload/v1/media/%s';

	/** Step three: make the uploaded bytes a photo on the listing. */
	const CREATE_URL = 'https://mybusiness.googleapis.com/v4/%1$s/%2$s/media';

	/**
	 * Whether a file is one Google will take.
	 *
	 * @param array $file `{ mime_type, file_size, width, height }`.
	 * @return ValidationResult
	 */
	public static function validate( array $file ) {
		$result = new ValidationResult();

		if ( ! in_array( (string) $file['mime_type'], self::TYPES, true ) ) {
			$result->add( 'file', 'media.type.unsupported' );

			return $result;
		}

		if ( (int) $file['file_size'] > self::MAX_BYTES ) {
			$result->add( 'file', 'media.size.too_large' );
		} elseif ( (int) $file['file_size'] < self::MIN_BYTES ) {
			$result->add( 'file', 'media.size.too_small' );
		}

		if ( (int) $file['width'] < self::MIN_SIDE || (int) $file['height'] < self::MIN_SIDE ) {
			$result->add( 'file', 'media.dimensions.too_small' );
		}

		return $result;
	}

	/**
	 * Keep an uploaded file as a photo waiting to go to Google.
	 *
	 * @param int    $location_id Row id in wp_fhint_locations.
	 * @param string $role        logo | cover | gallery.
	 * @param array  $upload      One entry of `$_FILES`, as REST hands it over.
	 * @return array|ValidationResult|WP_Error The stored row.
	 */
	public static function add( $location_id, $role, array $upload ) {
		$role = in_array( (string) $role, MediaRepository::roles(), true ) ? (string) $role : MediaRepository::ROLE_GALLERY;

		if ( empty( $upload['tmp_name'] ) || ! empty( $upload['error'] ) || ! is_readable( (string) $upload['tmp_name'] ) ) {
			return new WP_Error(
				'fhint_media_no_file',
				__( 'No photo arrived. Choose the file again.', 'foundhint-local-seo' ),
				array( 'status' => 400 )
			);
		}

		// Measured from the file itself. The type and size a browser claims
		// are whatever the browser was told to say.
		$size  = getimagesize( (string) $upload['tmp_name'] );
		$check = wp_check_filetype_and_ext( (string) $upload['tmp_name'], isset( $upload['name'] ) ? (string) $upload['name'] : '' );

		$validation = self::validate(
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

		// A listing has one logo and one cover. Choosing another replaces the
		// one that was waiting rather than queueing two.
		if ( MediaRepository::ROLE_GALLERY !== $role ) {
			foreach ( MediaRepository::for_location( (int) $location_id ) as $photo ) {
				if ( $role === $photo['role'] && MediaRepository::STATE_SYNCED !== $photo['state'] ) {
					self::discard( $photo );
				}
			}
		}

		$row = MediaRepository::create_pending(
			array(
				'location_id'   => (int) $location_id,
				'role'          => $role,
				'attachment_id' => (int) $attachment_id,
				'url'           => (string) wp_get_attachment_url( $attachment_id ),
				'mime_type'     => (string) $size['mime'],
				'file_size'     => (int) filesize( (string) get_attached_file( $attachment_id ) ),
				'width'         => (int) $size[0],
				'height'        => (int) $size[1],
			)
		);

		if ( ! $row ) {
			wp_delete_attachment( $attachment_id, true );

			return new WP_Error(
				'fhint_save_failed',
				__( 'The photo could not be saved.', 'foundhint-local-seo' ),
				array( 'status' => 500 )
			);
		}

		return $row;
	}

	/**
	 * Remove a photo that has not reached Google.
	 *
	 * @param int $id          Row id.
	 * @param int $location_id The location the request is for.
	 * @return true|WP_Error
	 */
	public static function remove( $id, $location_id ) {
		$photo = self::owned( $id, $location_id );

		if ( is_wp_error( $photo ) ) {
			return $photo;
		}

		if ( MediaRepository::STATE_SYNCED === $photo['state'] ) {
			return new WP_Error(
				'fhint_media_on_google',
				__( 'This photo is on Google. Remove it from your Google Business Profile.', 'foundhint-local-seo' ),
				array( 'status' => 409 )
			);
		}

		self::discard( $photo );

		return true;
	}

	/**
	 * Send one waiting photo to Google.
	 *
	 * Three requests, because that is how Google takes a file: a place to
	 * put it, the bytes, then the photo itself. The bytes are sent rather
	 * than a link to them so this works on a site Google cannot reach — a
	 * staging site, a site behind a login, a laptop.
	 *
	 * @param int    $id            Row id.
	 * @param int    $location_id   The location the request is for.
	 * @param string $location_name Google location resource name.
	 * @param string $account_name  Google account resource name.
	 * @return array|WP_Error The row as it now reads.
	 */
	public static function publish( $id, $location_id, $location_name, $account_name ) {
		$photo = self::owned( $id, $location_id );

		if ( is_wp_error( $photo ) ) {
			return $photo;
		}

		if ( MediaRepository::STATE_SYNCED === $photo['state'] ) {
			return new WP_Error(
				'fhint_media_already_sent',
				__( 'This photo is already on Google.', 'foundhint-local-seo' ),
				array( 'status' => 409 )
			);
		}

		$path = $photo['attachment_id'] ? get_attached_file( $photo['attachment_id'] ) : '';

		if ( ! $path || ! is_readable( $path ) ) {
			return self::fail( $photo, __( 'The file is no longer in your media library.', 'foundhint-local-seo' ), 409, 'fhint_media_file_missing' );
		}

		MediaRepository::update( $photo['id'], array( 'state' => MediaRepository::STATE_UPLOADING ) );

		$started = Client::post( sprintf( self::START_URL, (string) $account_name, (string) $location_name ), array(), array() );

		if ( is_wp_error( $started ) || empty( $started['resourceName'] ) ) {
			return self::refused( $photo, $started );
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- A local file, read to be sent.
		$bytes = file_get_contents( $path );

		$sent = Client::upload(
			sprintf( self::BYTES_URL, (string) $started['resourceName'] ),
			array( 'upload_type' => 'media' ),
			false === $bytes ? '' : $bytes,
			$photo['mime_type'] ? $photo['mime_type'] : 'image/jpeg'
		);

		if ( is_wp_error( $sent ) ) {
			return self::refused( $photo, $sent );
		}

		$created = Client::post(
			sprintf( self::CREATE_URL, (string) $account_name, (string) $location_name ),
			array(),
			array(
				'mediaFormat'         => 'PHOTO',
				'locationAssociation' => array( 'category' => MediaSync::category( $photo['role'] ) ),
				'dataRef'             => array( 'resourceName' => (string) $started['resourceName'] ),
			)
		);

		if ( is_wp_error( $created ) || empty( $created['name'] ) ) {
			return self::refused( $photo, $created );
		}

		$stored = MediaSync::from_google( $created );

		MediaRepository::update(
			$photo['id'],
			array(
				'state'       => MediaRepository::STATE_SYNCED,
				'google_name' => (string) $created['name'],
				// Google's copy when it says where that is; otherwise the
				// file here, which is the same picture.
				'url'         => $stored ? $stored['url'] : $photo['url'],
				'error'       => '',
				'uploaded_at' => gmdate( 'Y-m-d H:i:s' ),
				'synced_at'   => gmdate( 'Y-m-d H:i:s' ),
			)
		);

		// The listing has one logo and one cover: the one just sent has
		// replaced whatever Google showed before.
		if ( MediaRepository::ROLE_GALLERY !== $photo['role'] ) {
			foreach ( MediaRepository::for_location( (int) $photo['location_id'] ) as $other ) {
				if ( $other['id'] !== $photo['id'] && $other['role'] === $photo['role'] && MediaRepository::STATE_SYNCED === $other['state'] ) {
					MediaRepository::delete( $other['id'] );
				}
			}
		}

		Logger::info( 'google', 'google.photo_published', __( 'A photo was sent to Google.', 'foundhint-local-seo' ) );

		return MediaRepository::find( $photo['id'] );
	}

	/**
	 * A photo, provided it belongs to the location the request named.
	 *
	 * @param int $id          Row id.
	 * @param int $location_id The location the request is for.
	 * @return array|WP_Error
	 */
	private static function owned( $id, $location_id ) {
		$photo = MediaRepository::find( (int) $id );

		if ( ! $photo || (int) $photo['location_id'] !== (int) $location_id ) {
			return new WP_Error(
				'fhint_media_not_found',
				__( 'That photo no longer exists.', 'foundhint-local-seo' ),
				array( 'status' => 404 )
			);
		}

		return $photo;
	}

	/**
	 * Forget a waiting photo and the file kept for it.
	 *
	 * @param array $photo Stored row.
	 * @return void
	 */
	private static function discard( array $photo ) {
		if ( $photo['attachment_id'] ) {
			wp_delete_attachment( $photo['attachment_id'], true );
		}

		MediaRepository::delete( $photo['id'] );
	}

	/**
	 * Record what Google said and pass it on.
	 *
	 * @param array          $photo  Stored row.
	 * @param array|WP_Error $result What the failed step returned.
	 * @return WP_Error
	 */
	private static function refused( array $photo, $result ) {
		if ( ! is_wp_error( $result ) ) {
			return self::fail( $photo, __( 'Google did not confirm the photo.', 'foundhint-local-seo' ), 502, 'fhint_google_request_failed' );
		}

		$data   = $result->get_error_data();
		$reason = is_array( $data ) && ! empty( $data['google_message'] ) ? (string) $data['google_message'] : $result->get_error_message();

		MediaRepository::update(
			$photo['id'],
			array(
				'state' => MediaRepository::STATE_FAILED,
				'error' => mb_substr( $reason, 0, 480 ),
			)
		);

		return $result;
	}

	/**
	 * Mark a photo as failed and answer with the reason.
	 *
	 * @param array  $photo   Stored row.
	 * @param string $message Why, for the owner to read.
	 * @param int    $status  HTTP status.
	 * @param string $code    Machine code.
	 * @return WP_Error
	 */
	private static function fail( array $photo, $message, $status, $code ) {
		MediaRepository::update(
			$photo['id'],
			array(
				'state' => MediaRepository::STATE_FAILED,
				'error' => $message,
			)
		);

		return new WP_Error( $code, $message, array( 'status' => $status ) );
	}
}
