<?php
/**
 * Which name, description, phone and website a location shows.
 *
 * @package FoundHint
 */

namespace FHINT\App\Location;

use FHINT\App\Business\BookingLinks;

defined( 'ABSPATH' ) || exit;

/**
 * Resolves a location's own details, location first, business second.
 *
 * The same rule as categories ({@see LocationCategories}), field by field:
 *
 * - **The primary location is the business.** Its name, description, phone
 *   and website are the business's own.
 * - **Any other location may keep its own** — two Google listings under one
 *   account can be two different businesses. A field it has not set shows
 *   the business's, so a branch of the same shop enters nothing twice.
 *
 * The business's `name` is kept on a location as `business_name`, because a
 * location's own `name` column is its label inside this site ("Downtown"),
 * not what it trades as.
 */
class LocationDetails {

	/** Field as the profile names it => column on the location. */
	const COLUMNS = array(
		'name'         => 'business_name',
		'description'  => 'description',
		'phone'        => 'phone',
		'website'      => 'website',
		'opening_date' => 'opening_date',
	);

	/**
	 * Fields the business stores under another name. The opening date is
	 * the business's `founding_date`: for the primary location they are one
	 * date, and schema.org and the business record already call it that.
	 */
	const BUSINESS_KEYS = array(
		'opening_date' => 'founding_date',
	);

	/**
	 * The name, description, phone and website in force for a location.
	 *
	 * @param array|null $location Location row, or null for none.
	 * @param array|null $business Business row.
	 * @return array{name:string, description:string, phone:string, website:string, opening_date:string}
	 */
	public static function resolve( $location, $business ) {
		$own      = LocationCategories::kept_on_location( $location );
		$business = is_array( $business ) ? $business : array();
		$details  = array();

		foreach ( self::COLUMNS as $field => $column ) {
			$value = $own && isset( $location[ $column ] ) ? trim( (string) $location[ $column ] ) : '';
			$key   = isset( self::BUSINESS_KEYS[ $field ] ) ? self::BUSINESS_KEYS[ $field ] : $field;

			$details[ $field ] = '' !== $value
				? (string) $location[ $column ]
				: ( isset( $business[ $key ] ) ? (string) $business[ $key ] : '' );
		}

		return $details;
	}

	/**
	 * Profile fields as the location columns they are stored in.
	 *
	 * @param array $changes Fields keyed as the profile names them.
	 * @return array Only these fields, keyed by column.
	 */
	public static function to_columns( array $changes ) {
		$columns = array();

		foreach ( self::COLUMNS as $field => $column ) {
			if ( array_key_exists( $field, $changes ) ) {
				$columns[ $column ] = $changes[ $field ];
			}
		}

		return $columns;
	}

	/**
	 * The social links in force for a location.
	 *
	 * Unlike the fields above, the links are one set: once a location
	 * has saved links of its own (even all empty), the whole set is its own.
	 * Merging network by network would bring back a link the owner removed.
	 *
	 * @param array|null $location Location row, or null for none.
	 * @param array|null $business Business row.
	 * @return array Network => URL.
	 */
	public static function social( $location, $business ) {
		if ( LocationCategories::kept_on_location( $location ) && isset( $location['social_profiles'] ) && is_array( $location['social_profiles'] ) ) {
			return $location['social_profiles'];
		}

		return is_array( $business ) && isset( $business['social_profiles'] ) && is_array( $business['social_profiles'] )
			? $business['social_profiles']
			: array();
	}

	/**
	 * The booking links in force for a location: one set, like the social
	 * links — NULL on the location means the business's.
	 *
	 * @param array|null $location Location row, or null for none.
	 * @param array|null $business Business row.
	 * @return array<string,string> Every field, '' for none.
	 */
	public static function booking( $location, $business ) {
		if ( LocationCategories::kept_on_location( $location ) && isset( $location['booking_links'] ) && is_array( $location['booking_links'] ) ) {
			return BookingLinks::complete( $location['booking_links'] );
		}

		return BookingLinks::complete( is_array( $business ) && isset( $business['booking_links'] ) ? $business['booking_links'] : array() );
	}

	/**
	 * The extra phone numbers in force for a location.
	 *
	 * One list, like the social links: NULL on the location means "use the
	 * business's"; once it has a list of its own — even an empty one — that
	 * list is what it shows, so a number removed here stays removed.
	 *
	 * @param array|null $location Location row, or null for none.
	 * @param array|null $business Business row.
	 * @return string[]
	 */
	public static function additional_phones( $location, $business ) {
		if ( LocationCategories::kept_on_location( $location ) && isset( $location['additional_phones'] ) && is_array( $location['additional_phones'] ) ) {
			return array_values( $location['additional_phones'] );
		}

		return is_array( $business ) && isset( $business['additional_phones'] ) && is_array( $business['additional_phones'] )
			? array_values( $business['additional_phones'] )
			: array();
	}

	/**
	 * Which list of services a location shows and saves.
	 *
	 * The primary location's list is the business's own (0). Any other
	 * location has a list of its own, which starts empty: a second listing's
	 * services are its own, and a list inherited and then edited would leave
	 * nobody sure which list a change went to.
	 *
	 * @param array|null $location Location row, or null for none.
	 * @return int 0 for the business's list, otherwise the location's id.
	 */
	public static function services_list( $location ) {
		return LocationCategories::kept_on_location( $location ) ? (int) $location['id'] : 0;
	}
}
