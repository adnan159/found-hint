<?php
/**
 * Reading reviews from Google into this site's own storage.
 *
 * @package FoundHint
 */

namespace FHINT\App\Review;

use FHINT\App\Core\Logger;
use FHINT\App\Google\Client;
use FHINT\App\Google\GoogleLocationRepository;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Fetches reviews for the locations this site has synced from Google.
 *
 * **Reviews are read on demand, never while a page is being rendered.** The
 * screens, the dashboard figure and any audit rule read stored rows; this
 * class is the only thing that talks to Google about reviews, and it runs
 * from an explicit request.
 *
 * Reviews still live on the legacy v4 API — Google never moved them onto the
 * versioned Business Information surface — so the host here differs from the
 * one the rest of the Google module uses. That is Google's doing, not an
 * oversight, and the constant says so in one place.
 */
class ReviewSync {

	/**
	 * The legacy endpoint reviews are still served from.
	 *
	 * `%1$s` is the account resource name, `%2$s` the location's.
	 */
	const REVIEWS_URL = 'https://mybusiness.googleapis.com/v4/%1$s/%2$s/reviews';

	/**
	 * How many reviews to ask for at once. Google's ceiling is 50.
	 */
	const PAGE_SIZE = 50;

	/**
	 * How many pages to walk before giving up.
	 *
	 * A location with thousands of reviews would otherwise hold a request
	 * open indefinitely. 20 pages is 1,000 reviews, far past what any screen
	 * shows, and the stop is reported rather than hidden.
	 */
	const MAX_PAGES = 20;

	/**
	 * Read reviews for one location, or for every synced location.
	 *
	 * @param string $location_name Google location resource name, or '' for all.
	 * @return array|WP_Error Counts, or an error when nothing could be read.
	 */
	public static function run( $location_name = '' ) {
		$locations = self::targets( $location_name );

		if ( ! $locations ) {
			return new WP_Error(
				'fhint_no_google_locations',
				__( 'There are no Google locations to read reviews for yet. Read your Google profile first.', 'foundhint-local-seo' ),
				array( 'status' => 409 )
			);
		}

		$read      = 0;
		$failed    = array();
		$succeeded = 0;

		foreach ( $locations as $location ) {
			$result = self::run_one( $location['location_name'], $location['account_name'] );

			if ( is_wp_error( $result ) ) {
				$failed[] = $result;
				continue;
			}

			$succeeded++;
			$read += $result;
		}

		Logger::info(
			'reviews',
			'reviews.synced',
			sprintf(
				/* translators: 1: e.g. "12 reviews", 2: e.g. "2 locations". */
				__( 'Read %1$s across %2$s.', 'foundhint-local-seo' ),
				sprintf(
					/* translators: %d: number of reviews. */
					_n( '%d review', '%d reviews', $read, 'foundhint-local-seo' ),
					$read
				),
				sprintf(
					/* translators: %d: number of locations. */
					_n( '%d location', '%d locations', $succeeded, 'foundhint-local-seo' ),
					$succeeded
				)
			)
		);

		// Every location refused: reporting "0 reviews" as a success would
		// tell the owner nobody has reviewed them, when in fact this plugin
		// never got an answer. The same trap the profile sync fell into.
		if ( $failed && 0 === $succeeded ) {
			return $failed[0];
		}

		return array(
			'locations' => $succeeded,
			'reviews'   => $read,
			'failed'    => count( $failed ),
		);
	}

	/**
	 * Read every page of reviews for one location and store them.
	 *
	 * @param string $location_name Google location resource name.
	 * @param string $account_name  Google account resource name.
	 * @return int|WP_Error How many reviews were stored.
	 */
	private static function run_one( $location_name, $account_name ) {
		$url   = sprintf( self::REVIEWS_URL, (string) $account_name, (string) $location_name );
		$seen  = array();
		$token = '';
		$pages = 0;

		do {
			$query = array( 'pageSize' => self::PAGE_SIZE );

			if ( '' !== $token ) {
				$query['pageToken'] = $token;
			}

			$response = Client::get( $url, $query );

			if ( is_wp_error( $response ) ) {
				return $response;
			}

			$mapped = ReviewMapper::from_page( (array) $response, $location_name, $account_name );

			foreach ( $mapped as $review ) {
				ReviewRepository::upsert( $review );
				$seen[] = $review['review_id'];
			}

			$token = isset( $response['nextPageToken'] ) ? (string) $response['nextPageToken'] : '';
			$pages++;
		} while ( '' !== $token && $pages < self::MAX_PAGES );

		// A review Google no longer returns has been deleted or taken down.
		// Leaving it behind would keep it in a count the owner is judged on,
		// and would show them a review that no longer exists anywhere.
		ReviewRepository::delete_for_location( $location_name, $seen );

		return count( $seen );
	}

	/**
	 * Which locations a run covers.
	 *
	 * @param string $location_name Google location resource name, or ''.
	 * @return array[] Each with location_name and account_name.
	 */
	private static function targets( $location_name ) {
		if ( '' !== (string) $location_name ) {
			$stored = GoogleLocationRepository::find_by_location_name( $location_name );

			// The name is looked up rather than trusted: it reaches this
			// method from a request, and it becomes part of a URL.
			return $stored ? array( $stored ) : array();
		}

		return GoogleLocationRepository::all();
	}
}
