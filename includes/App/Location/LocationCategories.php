<?php
/**
 * Which categories a location trades under.
 *
 * @package FoundHint
 */

namespace FHINT\App\Location;

defined( 'ABSPATH' ) || exit;

/**
 * Resolves categories location first, business second.
 *
 * A category belongs to a Google listing, and one account can hold listings
 * that are different kinds of business — a pet shop and the software company
 * that runs its website. Kept only on the business, the second listing's
 * category would overwrite the first's every time either was saved.
 *
 * So the rule is the one contact details already follow:
 *
 * - **The primary location is the business.** Its categories are the
 *   business's own, which is what every single-location site has always had.
 * - **Any other location may keep its own**, and does once it has a main
 *   category. Until then it shows the business's, so a branch of the same
 *   shop needs nothing entered twice.
 */
class LocationCategories {

	/** The three fields that travel together. */
	const FIELDS = array( 'primary_category', 'primary_category_id', 'secondary_categories' );

	/**
	 * Whether a location stores categories of its own rather than the business's.
	 *
	 * @param array|null $location Location row.
	 * @return bool
	 */
	public static function kept_on_location( $location ) {
		return is_array( $location ) && ! empty( $location['id'] ) && empty( $location['is_primary'] );
	}

	/**
	 * The categories in force for a location.
	 *
	 * @param array|null $location Location row, or null for none.
	 * @param array|null $business Business row.
	 * @return array{primary_category:string, primary_category_id:string, secondary_categories:array}
	 */
	public static function resolve( $location, $business ) {
		$from = self::kept_on_location( $location ) && '' !== trim( (string) $location['primary_category'] )
			? $location
			: ( is_array( $business ) ? $business : array() );

		return array(
			'primary_category'     => isset( $from['primary_category'] ) ? (string) $from['primary_category'] : '',
			'primary_category_id'  => isset( $from['primary_category_id'] ) ? (string) $from['primary_category_id'] : '',
			'secondary_categories' => isset( $from['secondary_categories'] ) && is_array( $from['secondary_categories'] ) ? array_values( $from['secondary_categories'] ) : array(),
		);
	}
}
