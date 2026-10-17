<?php
/**
 * Which name, description, phone and website a location shows.
 *
 * @package FoundHint
 */

namespace FHINT\App\Location;

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
		'name'        => 'business_name',
		'description' => 'description',
		'phone'       => 'phone',
		'website'     => 'website',
	);

	/**
	 * The name, description, phone and website in force for a location.
	 *
	 * @param array|null $location Location row, or null for none.
	 * @param array|null $business Business row.
	 * @return array{name:string, description:string, phone:string, website:string}
	 */
	public static function resolve( $location, $business ) {
		$own      = LocationCategories::kept_on_location( $location );
		$business = is_array( $business ) ? $business : array();
		$details  = array();

		foreach ( self::COLUMNS as $field => $column ) {
			$value = $own && isset( $location[ $column ] ) ? trim( (string) $location[ $column ] ) : '';

			$details[ $field ] = '' !== $value
				? (string) $location[ $column ]
				: ( isset( $business[ $field ] ) ? (string) $business[ $field ] : '' );
		}

		return $details;
	}

	/**
	 * Profile fields as the location columns they are stored in.
	 *
	 * @param array $changes Fields keyed as the profile names them.
	 * @return array Only the four fields, keyed by column.
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
	 * Unlike the four fields above, the links are one set: once a location
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
