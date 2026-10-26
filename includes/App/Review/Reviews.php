<?php
/**
 * What the review screens and the dashboard ask for.
 *
 * @package FoundHint
 */

namespace FHINT\App\Review;

use FHINT\App\Google\GoogleLocationRepository;

defined( 'ABSPATH' ) || exit;

/**
 * Reads stored reviews and answers questions about them.
 *
 * Everything here reads rows. Nothing in this class contacts Google — that
 * is {@see ReviewSync}'s single job — so a dashboard card or an audit rule
 * can call these freely without putting an HTTP request on a render path.
 */
class Reviews {

	/**
	 * A review counts as answered when the owner has written a reply.
	 *
	 * Kept as one named rule because two screens and an audit rule each ask
	 * the question, and "empty reply" is the sort of condition that drifts
	 * into three slightly different versions if every caller writes its own.
	 *
	 * @param array $review One review, as the repository returns it.
	 * @return bool
	 */
	public static function needs_reply( array $review ) {
		return '' === trim( (string) ( isset( $review['reply_comment'] ) ? $review['reply_comment'] : '' ) );
	}

	/**
	 * Where a review stands: 'live', 'edited' by its author, or 'removed'
	 * from Google — the same rule the list's status filter uses.
	 *
	 * @param array $review One review, as the repository returns it.
	 * @return string
	 */
	public static function status( array $review ) {
		if ( ! empty( $review['removed_at'] ) ) {
			return 'removed';
		}

		$written = isset( $review['reviewed_at'] ) ? strtotime( (string) $review['reviewed_at'] . ' UTC' ) : false;
		$changed = isset( $review['review_updated_at'] ) ? strtotime( (string) $review['review_updated_at'] . ' UTC' ) : false;

		return $written && $changed && $changed - $written > ReviewRepository::EDIT_GRACE_SECONDS ? 'edited' : 'live';
	}

	/**
	 * One page of reviews, with the location each belongs to named.
	 *
	 * @param array $args location_name, unanswered, per_page, offset.
	 * @return array{items:array[], total:int}
	 */
	public static function listing( array $args = array() ) {
		$items  = ReviewRepository::all( $args );
		$titles = self::location_titles();

		foreach ( $items as $index => $item ) {
			$items[ $index ] = self::present( $item, $titles );
		}

		// The same filters, without the paging, for "Showing 1 to 10 of 24".
		return array(
			'items' => $items,
			'total' => ReviewRepository::count( array_diff_key( $args, array_flip( array( 'per_page', 'offset' ) ) ) ),
		);
	}

	/**
	 * One stored review, shaped as the listing shapes it.
	 *
	 * @param string $review_id Google review id.
	 * @return array|null
	 */
	public static function one( $review_id ) {
		$review = ReviewRepository::find( $review_id );

		return $review ? self::present( $review, self::location_titles() ) : null;
	}

	/**
	 * Add what a screen shows beside a review: the listing's title and
	 * whether it is still waiting on an answer.
	 *
	 * @param array                $review One review, as the repository returns it.
	 * @param array<string,string> $titles Listing titles by location name.
	 * @return array
	 */
	private static function present( array $review, array $titles ) {
		$name = $review['location_name'];

		$review['location_title'] = isset( $titles[ $name ] ) ? $titles[ $name ] : '';
		$review['status']         = self::status( $review );
		// A removed review cannot be answered, so it is not waiting on one.
		$review['needs_reply']    = 'removed' !== $review['status'] && self::needs_reply( $review );

		return $review;
	}

	/**
	 * The figures a screen or card leads with.
	 *
	 * @param string $location_name Google location resource name, or ''.
	 * @return array
	 */
	public static function state( $location_name = '' ) {
		$summary = ReviewRepository::summary( $location_name );

		return array(
			'count'        => $summary['count'],
			'unanswered'   => $summary['unanswered'],
			'average'      => $summary['average'],
			'distribution' => $summary['distribution'],
			'synced_at'    => ReviewRepository::last_synced_at( $location_name ),
			'locations'    => self::locations(),
		);
	}

	/**
	 * The locations reviews can be read for, for a chooser.
	 *
	 * @return array[]
	 */
	public static function locations() {
		$locations = array();

		foreach ( GoogleLocationRepository::all() as $location ) {
			$locations[] = array(
				'location_name' => $location['location_name'],
				'title'         => $location['title'],
				// The FoundHint location this listing belongs to, 0 for none —
				// so a screen can open on the location chosen elsewhere.
				'location_id'   => (int) $location['fhint_location_id'],
				'count'         => ReviewRepository::count( array( 'location_name' => $location['location_name'] ) ),
			);
		}

		return $locations;
	}

	/**
	 * Google location resource name to the title Google holds for it.
	 *
	 * Loaded in one query rather than one per review — a list of fifty
	 * reviews across two locations should cost two lookups, not fifty.
	 *
	 * @return array<string, string>
	 */
	private static function location_titles() {
		$titles = array();

		foreach ( GoogleLocationRepository::all() as $location ) {
			$titles[ $location['location_name'] ] = $location['title'];
		}

		return $titles;
	}
}
