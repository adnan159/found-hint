<?php
/**
 * Profile section: business information.
 *
 * @package FoundHint
 */

namespace FHINT\App\Profile\Sections;

use FHINT\App\Business\Business;
use FHINT\App\Business\BusinessRepository;
use FHINT\App\Business\DescriptionHistoryRepository;
use FHINT\App\Core\ValidationResult;
use FHINT\App\Profile\Profile;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Name, categories, description, website and phone.
 *
 * The fields carry the same names here as on `/business`, deliberately: a
 * validation error is keyed by field, and one vocabulary means the message
 * for `description` attaches to the description box whichever route saved it.
 */
class Info {

	/**
	 * The fields this section may write. Anything else sent is ignored, so
	 * this card cannot quietly change a value another card owns.
	 */
	const FIELDS = array(
		'name',
		'primary_category',
		'primary_category_id',
		'secondary_categories',
		'description',
		'website',
		'phone',
	);

	/**
	 * The section as stored.
	 *
	 * @return array
	 */
	public static function read() {
		$business = BusinessRepository::get();
		$business = $business ? $business : Business::blank();
		$google   = Profile::google_location();

		return array(
			'name'                 => (string) $business['name'],
			'primary_category'     => (string) $business['primary_category'],
			'primary_category_id'  => (string) $business['primary_category_id'],
			'secondary_categories' => array_values( (array) $business['secondary_categories'] ),
			'description'          => (string) $business['description'],
			'website'              => (string) $business['website'],
			'phone'                => (string) $business['phone'],
			// Google's own id for the listing. Read-only: it is shown because
			// directories ask for it, and it only exists once a listing is mapped.
			'cid'                  => $google && isset( $google['cid'] ) ? (string) $google['cid'] : '',
			'history'              => $business['id'] ? DescriptionHistoryRepository::latest( (int) $business['id'] ) : array(),
		);
	}

	/**
	 * Save the section.
	 *
	 * @param array $fields Fields as sent.
	 * @return true|ValidationResult|WP_Error
	 */
	public static function save( array $fields ) {
		$current = BusinessRepository::get();
		$changes = Business::sanitize( array_intersect_key( $fields, array_flip( self::FIELDS ) ) );
		$merged  = array_merge( $current ? $current : Business::blank(), $changes );

		$validation = Business::validate( $merged );

		if ( ! $validation->is_valid() ) {
			return $validation;
		}

		$saved = BusinessRepository::save( $changes );

		if ( ! $saved ) {
			return Profile::save_failed();
		}

		// A new wording becomes a version; saving the same words again does not.
		if ( array_key_exists( 'description', $changes ) ) {
			$source = isset( $fields['description_source'] ) ? (string) $fields['description_source'] : DescriptionHistoryRepository::SOURCE_USER;

			DescriptionHistoryRepository::record( (int) $saved['id'], (string) $saved['description'], $source );
		}

		return true;
	}
}
