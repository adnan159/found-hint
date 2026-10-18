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
use FHINT\App\Business\OpeningDate;
use FHINT\App\Core\ValidationResult;
use FHINT\App\Location\LocationCategories;
use FHINT\App\Location\LocationDetails;
use FHINT\App\Location\LocationRepository;
use FHINT\App\Profile\Profile;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Name, categories, description, website, phone and opening date.
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
		'additional_phones',
		'opening_date',
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
		$location = Profile::location();
		$own      = LocationCategories::kept_on_location( $location );
		// The selected location's own when it has them, the business's otherwise.
		$category = LocationCategories::resolve( $location, $business );
		$details  = LocationDetails::resolve( $location, $business );

		return array(
			'name'                 => $details['name'],
			'primary_category'     => $category['primary_category'],
			'primary_category_id'  => $category['primary_category_id'],
			'secondary_categories' => $category['secondary_categories'],
			'description'          => $details['description'],
			'website'              => $details['website'],
			'phone'                => $details['phone'],
			// Up to two more numbers, in order: Google's `additionalPhones`.
			'additional_phones'    => LocationDetails::additional_phones( $location, $business ),
			// The location's country, for the phone fields' country code.
			'country'              => $location ? (string) $location['country'] : '',
			// `YYYY-MM`: kept to the month, as Google shows it ("Opened March 2014").
			'opening_date'         => OpeningDate::for_screen( $details['opening_date'] ),
			// Google's own id for the listing. Read-only: it is shown because
			// directories ask for it, and it only exists once a listing is mapped.
			'cid'                  => $google && isset( $google['cid'] ) ? (string) $google['cid'] : '',
			// A location with descriptions of its own has a history of its own.
			'history'              => $business['id'] ? DescriptionHistoryRepository::latest( (int) $business['id'], 10, $own ? (int) $location['id'] : 0 ) : array(),
		);
	}

	/**
	 * Save the section.
	 *
	 * @param array $fields Fields as sent.
	 * @return true|ValidationResult|WP_Error
	 */
	public static function save( array $fields ) {
		$current  = BusinessRepository::get();
		$location = Profile::location();
		$changes  = Business::sanitize( array_intersect_key( $fields, array_flip( self::FIELDS ) ) );

		// Checked against what this location shows, so "that is already your
		// main category" means the one on screen.
		$merged = array_merge(
			$current ? $current : Business::blank(),
			LocationCategories::resolve( $location, $current ),
			LocationDetails::resolve( $location, $current ),
			array( 'additional_phones' => LocationDetails::additional_phones( $location, $current ) ),
			$changes
		);

		$validation = Business::validate( $merged );

		// The opening date is not a field of the business entity — on the
		// business it is `founding_date` — so it is cleaned and checked here.
		$opening = array_key_exists( 'opening_date', $fields ) ? OpeningDate::sanitize( $fields['opening_date'] ) : null;

		if ( null !== $opening ) {
			$validation->merge( OpeningDate::validate( $opening ) );
		}

		if ( ! $validation->is_valid() ) {
			return $validation;
		}

		// A location that is not the primary one keeps these to itself: its
		// name, description, phone, website and categories. The business's
		// are left alone, so saving a second listing never rewrites the first.
		if ( LocationCategories::kept_on_location( $location ) ) {
			$own = LocationDetails::to_columns( $changes );

			if ( null !== $opening ) {
				$own['opening_date'] = $opening;
			}

			// A list of its own from the first save, even an empty one, so a
			// number removed on this branch is not replaced by the business's.
			if ( array_key_exists( 'additional_phones', $changes ) ) {
				$own['additional_phones'] = $changes['additional_phones'];
			}

			// The three category fields are written together even when one was
			// sent: a location with extra categories and no main one would fall
			// back to the business's, and the edit would vanish.
			if ( array_intersect_key( $changes, array_flip( LocationCategories::FIELDS ) ) ) {
				$own = array_merge( $own, array_intersect_key( $merged, array_flip( LocationCategories::FIELDS ) ) );
			}

			if ( $own && ! LocationRepository::update( (int) $location['id'], $own ) ) {
				return Profile::save_failed();
			}

			if ( array_key_exists( 'description', $changes ) && $current ) {
				$source = isset( $fields['description_source'] ) ? (string) $fields['description_source'] : DescriptionHistoryRepository::SOURCE_USER;

				DescriptionHistoryRepository::record( (int) $current['id'], (string) $changes['description'], $source, (int) $location['id'] );
			}

			$changes = array_diff_key(
				$changes,
				array_flip( LocationCategories::FIELDS ),
				LocationDetails::COLUMNS,
				array( 'additional_phones' => true )
			);

			if ( ! $changes ) {
				return true;
			}
		}

		// The primary location's opening date is the business's founding date.
		if ( null !== $opening ) {
			$changes['founding_date'] = $opening;
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
