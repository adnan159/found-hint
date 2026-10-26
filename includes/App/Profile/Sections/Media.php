<?php
/**
 * Profile section: photos.
 *
 * @package FoundHint
 */

namespace FHINT\App\Profile\Sections;

use FHINT\App\Media\MediaRepository;
use FHINT\App\Profile\Profile;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * The logo, the cover and the gallery.
 *
 * Read-only here. A photo is a file, not a field: it arrives through an
 * upload and reaches Google one request at a time, and neither of those is a
 * section save. This answers with the shape the Photos card will use so the
 * screen can be built against it now.
 */
class Media {

	/**
	 * The section as stored.
	 *
	 * @return array
	 */
	public static function read() {
		$location = Profile::location();
		$photos   = $location ? MediaRepository::for_location( (int) $location['id'] ) : array();

		$grouped = array(
			'logo'    => null,
			'cover'   => null,
			'gallery' => array(),
			'pending' => array(),
		);

		foreach ( $photos as $photo ) {
			if ( 'pending' === $photo['state'] || 'uploading' === $photo['state'] || 'failed' === $photo['state'] ) {
				$grouped['pending'][] = $photo;
				continue;
			}

			if ( 'logo' === $photo['role'] || 'cover' === $photo['role'] ) {
				$grouped[ $photo['role'] ] = $photo;
				continue;
			}

			$grouped['gallery'][] = $photo;
		}

		$grouped['location_id'] = $location ? (int) $location['id'] : 0;
		$grouped['count']       = count( $grouped['gallery'] ) + ( $grouped['logo'] ? 1 : 0 ) + ( $grouped['cover'] ? 1 : 0 );

		return $grouped;
	}

	/**
	 * Refuse: photos are not saved as a section.
	 *
	 * @param array $fields Fields as sent.
	 * @return WP_Error
	 */
	public static function save( array $fields ) {
		unset( $fields );

		return new WP_Error(
			'fhint_section_read_only',
			__( 'Photos are added by uploading them, not by saving this section.', 'foundhint-local-seo' ),
			array( 'status' => 400 )
		);
	}
}
