<?php
/**
 * The details a reply's placeholders are filled with.
 *
 * @package FoundHint
 */

namespace FHINT\App\Review;

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Google\GoogleLocationRepository;
use FHINT\App\Location\LocationRepository;

defined( 'ABSPATH' ) || exit;

/**
 * For one Google listing: `{ location_name, location_city, keyword }` —
 * what `{{location_name}}`, `{{location_city}}` and `{{business_keyword}}`
 * become in a reply. One place, so a reply typed on the Reviews screen and
 * one sent by auto-reply (Premium) say the same thing.
 *
 * - Name: the listing's title on Google.
 * - City: the linked FoundHint location's city, else the city on Google's
 *   own address for the listing.
 * - Keyword: the business category — the linked location's own, else the
 *   business's. A listing not linked to FoundHint gets none: it may be
 *   another business on the same Google account, and naming the wrong
 *   trade in a public reply is worse than naming none.
 */
class ReplyContext {

	/**
	 * The details for one listing.
	 *
	 * @param string $location_name Google location resource name.
	 * @return array `{ location_name, location_city, keyword }`, '' where unknown.
	 */
	public static function for_listing( $location_name ) {
		$listing = GoogleLocationRepository::find_by_location_name( (string) $location_name );

		if ( ! $listing ) {
			return array(
				'location_name' => '',
				'location_city' => '',
				'keyword'       => '',
			);
		}

		$location = $listing['fhint_location_id'] ? LocationRepository::find( (int) $listing['fhint_location_id'] ) : null;
		$city     = $location ? trim( (string) $location['city'] ) : '';
		$keyword  = $location ? trim( (string) $location['primary_category'] ) : '';

		if ( '' === $city ) {
			$payload = GoogleLocationRepository::payload( (string) $location_name );
			$city    = isset( $payload['storefrontAddress']['locality'] ) ? trim( (string) $payload['storefrontAddress']['locality'] ) : '';
		}

		if ( $location && '' === $keyword ) {
			$business = BusinessRepository::get();
			$keyword  = $business ? trim( (string) $business['primary_category'] ) : '';
		}

		return array(
			'location_name' => (string) $listing['title'],
			'location_city' => $city,
			'keyword'       => self::common_noun( $keyword ),
		);
	}

	/**
	 * A category reads mid-sentence: "Dentist" → "dentist", "Pet store" →
	 * "pet store". A name in capitals ("BMW dealer") is left alone.
	 *
	 * @param string $category Category name.
	 * @return string
	 */
	public static function common_noun( $category ) {
		$category = (string) $category;

		if ( mb_strlen( $category ) < 2 || mb_strtolower( mb_substr( $category, 1, 1 ) ) !== mb_substr( $category, 1, 1 ) ) {
			return $category;
		}

		return mb_strtolower( mb_substr( $category, 0, 1 ) ) . mb_substr( $category, 1 );
	}
}
