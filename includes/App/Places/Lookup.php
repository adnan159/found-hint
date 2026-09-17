<?php
/**
 * Finding a place, linking to it, and reading it live.
 *
 * @package FoundHint
 */

namespace FHINT\App\Places;

use FHINT\App\Location\LocationRepository;
use FHINT\App\Nap\Nap;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * The Places feature, as the REST layer sees it.
 *
 * Four things happen here: search for a business, remember which result it
 * is, read that place live, and forget it again.
 *
 * **Reading is explicit.** `live()` calls Google, so nothing calls it from a
 * screen's first paint — the operator presses a button. That keeps external
 * HTTP off a render path, keeps a shared quota from being spent by anyone
 * who opens a tab, and makes the freshness on screen mean something.
 *
 * The only thing any of this writes is a place id and a pair of
 * coordinates; see `Database\CreatePlaceLinksTable` for why that list is
 * short and must stay short.
 */
class Lookup {

	/**
	 * What the screen needs before anything is pressed.
	 *
	 * @return array
	 */
	public static function state() {
		$location = LocationRepository::primary();
		$location_id = $location && isset( $location['id'] ) ? (int) $location['id'] : 0;

		// Expiry is enforced on read as well as on a schedule: cron only
		// runs when somebody visits, and the permission does not pause.
		Retention::run();

		$link = $location_id ? PlaceLinkRepository::for_location( $location_id ) : null;

		return array(
			'configured'     => Credentials::configured(),
			'key_hint'       => Credentials::hint(),
			'location_id'    => $location_id,
			'has_location'   => (bool) $location_id,
			'retention_days' => Retention::DAYS,
			'link'           => $link ? self::describe_link( $link ) : null,
		);
	}

	/**
	 * Search for candidate places.
	 *
	 * @param string $query Free text, e.g. a name and a town.
	 * @return array|WP_Error
	 */
	public static function search( $query ) {
		$response = Client::search( $query );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$candidates = Place::candidates( $response );

		return array(
			'query'      => trim( (string) $query ),
			'candidates' => $candidates,
			'count'      => count( $candidates ),
		);
	}

	/**
	 * Remember which place this location is.
	 *
	 * The place is read once before it is stored, for two reasons: an id
	 * that Google will not resolve is worth refusing at the moment somebody
	 * chooses it rather than the next time they press "check", and the same
	 * response carries the coordinates worth keeping.
	 *
	 * @param string $place_id Google place id.
	 * @return array|WP_Error The new state.
	 */
	public static function link( $place_id ) {
		$location = LocationRepository::primary();

		if ( ! $location || empty( $location['id'] ) ) {
			return new WP_Error(
				'fhint_places_no_location',
				__( 'Add your business address first — there is nothing here to link a place to yet.', 'found-hint' ),
				array( 'status' => 409 )
			);
		}

		$response = Client::details( $place_id );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$place = Place::from_details( $response );

		if ( '' === $place['place_id'] ) {
			return new WP_Error(
				'fhint_places_unknown',
				__( 'Google did not return that place. Search again and choose from the list.', 'found-hint' ),
				array( 'status' => 404 )
			);
		}

		$stored = PlaceLinkRepository::link(
			(int) $location['id'],
			$place['place_id'],
			$place['coordinates']['latitude'],
			$place['coordinates']['longitude']
		);

		if ( ! $stored ) {
			return new WP_Error(
				'fhint_places_link_failed',
				__( 'The link could not be saved. Please try again.', 'found-hint' ),
				array( 'status' => 500 )
			);
		}

		return self::state();
	}

	/**
	 * Forget the link.
	 *
	 * @return array The new state.
	 */
	public static function unlink() {
		$location = LocationRepository::primary();

		if ( $location && ! empty( $location['id'] ) ) {
			PlaceLinkRepository::unlink( (int) $location['id'] );
		}

		return self::state();
	}

	/**
	 * Read the linked place now, and compare it with what this site holds.
	 *
	 * The place itself is returned for display and is **not** written
	 * anywhere. Coordinates are refreshed, because they are the one part
	 * that may be kept, and their clock restarts when they are re-read.
	 *
	 * @return array|WP_Error
	 */
	public static function live() {
		$location = LocationRepository::primary();
		$location_id = $location && isset( $location['id'] ) ? (int) $location['id'] : 0;
		$link        = $location_id ? PlaceLinkRepository::for_location( $location_id ) : null;

		if ( ! $link ) {
			return new WP_Error(
				'fhint_places_not_linked',
				__( 'Choose your business on Google first.', 'found-hint' ),
				array( 'status' => 409 )
			);
		}

		$response = Client::details( $link['place_id'] );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$place = Place::from_details( $response );

		PlaceLinkRepository::store_coordinates(
			$location_id,
			$place['coordinates']['latitude'],
			$place['coordinates']['longitude']
		);

		return array(
			'place'      => $place,
			'comparison' => Comparison::build( $place, Nap::resolve( $location_id ) ),
			'read_at'    => current_time( 'mysql', true ),
			// Said in the payload as well as on screen, so an integration
			// reading this route inherits the obligation with the data.
			'storage'    => array(
				'stored'    => array( 'place_id', 'latitude', 'longitude' ),
				'retention' => Retention::DAYS,
				'notice'    => __( 'Read live from Google and not stored. Google permits this plugin to keep only the place id and coordinates.', 'found-hint' ),
			),
		);
	}

	/**
	 * A link as the screen needs it.
	 *
	 * @param array $link Stored link.
	 * @return array
	 */
	private static function describe_link( array $link ) {
		return array(
			'place_id'            => $link['place_id'],
			'linked_at'           => $link['linked_at'],
			'has_coordinates'     => null !== $link['latitude'] && null !== $link['longitude'],
			'coordinates_expire_in_days' => Retention::days_left( $link['coordinates_cached_at'] ),
			'latitude'            => $link['latitude'],
			'longitude'           => $link['longitude'],
		);
	}
}
