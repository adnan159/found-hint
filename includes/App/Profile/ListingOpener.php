<?php
/**
 * Opening a Google listing that has no location here yet.
 *
 * @package FoundHint
 */

namespace FHINT\App\Profile;

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Google\GoogleLocationRepository;
use FHINT\App\Google\Import;
use FHINT\App\Location\LocationRepository;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Gives a Google listing a location of its own, so the profile can show it.
 *
 * The location switcher lists every listing on the Google account, imported
 * or not. Choosing one that has never been imported needs somewhere for its
 * address, hours and photos to live, and that is a location.
 *
 * **Only the listing's own details are brought across** — its name,
 * description, address, map pin, hours, phone, website, categories, social
 * links and services — all kept on the new location. The business's own
 * values are not touched.
 *
 * The location is always a new one. An existing location without a listing
 * is the owner's own, typed by hand, and a switch is not the place to decide
 * it was really this listing all along — that is what the mapping screen is
 * for.
 */
class ListingOpener {

	/** What is imported for a listing opened from the switcher. */
	const FIELDS = array( 'name', 'description', 'address', 'coordinates', 'hours', 'phone', 'website', 'categories', 'social', 'services' );

	/**
	 * The location for a listing, creating it on first use.
	 *
	 * @param string $location_name Google location resource name.
	 * @return array|WP_Error `{ location_id, created, imported }`.
	 */
	public static function open( $location_name ) {
		$listing = GoogleLocationRepository::find_by_location_name( (string) $location_name );

		if ( ! $listing ) {
			return new WP_Error(
				'fhint_import_unknown_profile',
				__( 'That Google profile is not one this site has read. Read your profiles again.', 'foundhint-local-seo' ),
				array( 'status' => 404 )
			);
		}

		// Already has a location: nothing to create, nothing to import.
		if ( (int) $listing['fhint_location_id'] > 0 && LocationRepository::find( (int) $listing['fhint_location_id'] ) ) {
			return array(
				'location_id' => (int) $listing['fhint_location_id'],
				'created'     => false,
				'imported'    => array(),
			);
		}

		if ( ! BusinessRepository::exists() ) {
			return Profile::business_required();
		}

		$location = LocationRepository::create( array( 'name' => (string) $listing['title'] ) );

		if ( ! $location || empty( $location['id'] ) ) {
			return Profile::save_failed();
		}

		GoogleLocationRepository::map( (string) $location_name, (int) $location['id'] );

		// The location exists and is linked whatever Google says next, so a
		// listing with no public address — a business that visits its
		// customers — still opens. What Google does hold is filled in.
		$imported = Import::apply( self::FIELDS, (string) $location_name );

		return array(
			'location_id' => (int) $location['id'],
			'created'     => true,
			'imported'    => is_wp_error( $imported ) ? array() : $imported['applied'],
		);
	}

	/**
	 * Every listing on the account, for the switcher.
	 *
	 * @return array[] Each `{ location_name, title, address, location_id }`;
	 *                 `location_id` is 0 for one with no location here yet.
	 */
	public static function listings() {
		$listings = array();

		foreach ( GoogleLocationRepository::all() as $listing ) {
			$listings[] = array(
				'location_name' => (string) $listing['location_name'],
				'title'         => (string) $listing['title'],
				'address'       => (string) $listing['address'],
				'location_id'   => (int) $listing['fhint_location_id'],
			);
		}

		return $listings;
	}
}
