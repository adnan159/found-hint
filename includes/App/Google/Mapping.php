<?php
/**
 * Linking Google locations to FoundHint locations.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google;

use FHINT\App\Core\Logger;
use FHINT\App\Location\LocationRepository;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * The join between what Google knows and what this site knows.
 *
 * A mapping says "this place in Google is this place here". It is the
 * operator's judgement, not something to guess: two branches on the same
 * street can have near-identical names and addresses, and a wrong mapping
 * would later push one branch's hours onto another. So nothing here maps
 * automatically — `suggestions()` offers candidates and the operator
 * chooses.
 */
class Mapping {

	/**
	 * Everything the mapping screen needs: our locations, Google's, and the
	 * links between them.
	 *
	 * @return array
	 */
	public static function overview() {
		$google_locations = GoogleLocationRepository::all();
		$our_locations    = LocationRepository::all();

		$by_fhint_id = array();

		foreach ( $google_locations as $google_location ) {
			if ( $google_location['fhint_location_id'] > 0 ) {
				$by_fhint_id[ $google_location['fhint_location_id'] ] = $google_location;
			}
		}

		$locations = array();

		foreach ( $our_locations as $location ) {
			$id      = (int) $location['id'];
			$mapped  = isset( $by_fhint_id[ $id ] ) ? $by_fhint_id[ $id ] : null;

			$locations[] = array(
				'id'                => $id,
				'name'              => (string) $location['name'],
				'address'           => self::our_address( $location ),
				'mapped_to'         => $mapped ? $mapped['location_name'] : '',
				'mapped_title'      => $mapped ? $mapped['title'] : '',
				'mapped_address'    => $mapped ? $mapped['address'] : '',
				'suggestions'       => $mapped ? array() : self::suggestions( $location, $google_locations ),
			);
		}

		return array(
			'locations'        => $locations,
			'google_locations' => $google_locations,
			'synced_at'        => GoogleLocationRepository::last_synced_at(),
		);
	}

	/**
	 * Link one of our locations to a Google location.
	 *
	 * @param string $location_name     Google location resource name.
	 * @param int    $fhint_location_id Row id in wp_fhint_locations.
	 * @return array|WP_Error The refreshed overview.
	 */
	public static function map( $location_name, $fhint_location_id ) {
		$fhint_location_id = (int) $fhint_location_id;

		if ( ! LocationRepository::find( $fhint_location_id ) ) {
			return new WP_Error(
				'fhint_location_not_found',
				__( 'That location could not be found.', 'found-hint' ),
				array( 'status' => 404 )
			);
		}

		if ( ! GoogleLocationRepository::find_by_location_name( $location_name ) ) {
			return new WP_Error(
				'fhint_google_location_not_found',
				__( 'That Google location is not in the last read from Google. Refresh and try again.', 'found-hint' ),
				array( 'status' => 404 )
			);
		}

		GoogleLocationRepository::map( $location_name, $fhint_location_id );

		// The resource names are identifiers, not secrets, and knowing which
		// place was linked is the whole value of the entry.
		Logger::log(
			Logger::INFO,
			'google',
			'google.location_mapped',
			sprintf(
				/* translators: 1: Google location resource name, 2: local location id. */
				__( 'Mapped %1$s to location #%2$d.', 'found-hint' ),
				(string) $location_name,
				$fhint_location_id
			),
			array( 'location_id' => $fhint_location_id )
		);

		return self::overview();
	}

	/**
	 * Release a link.
	 *
	 * @param string $location_name Google location resource name.
	 * @return array The refreshed overview.
	 */
	public static function unmap( $location_name ) {
		GoogleLocationRepository::unmap( $location_name );

		Logger::log(
			Logger::INFO,
			'google',
			'google.location_unmapped',
			sprintf(
				/* translators: %s: Google location resource name. */
				__( 'Unmapped %s.', 'found-hint' ),
				(string) $location_name
			)
		);

		return self::overview();
	}

	/**
	 * Google locations that plausibly match one of ours.
	 *
	 * Ordered best first, and never applied automatically — this narrows a
	 * list for a person, it does not make the decision.
	 *
	 * @param array $location         One of our locations.
	 * @param array $google_locations Every stored Google location.
	 * @return array[] Candidates, each with a reason.
	 */
	public static function suggestions( array $location, array $google_locations ) {
		$candidates = array();

		foreach ( $google_locations as $google_location ) {
			if ( $google_location['fhint_location_id'] > 0 ) {
				continue;
			}

			$score = self::score( $location, $google_location );

			if ( $score <= 0 ) {
				continue;
			}

			$candidates[] = array(
				'location_name' => $google_location['location_name'],
				'title'         => $google_location['title'],
				'address'       => $google_location['address'],
				'score'         => $score,
			);
		}

		usort(
			$candidates,
			static function ( $a, $b ) {
				return $b['score'] - $a['score'];
			}
		);

		return array_slice( $candidates, 0, 3 );
	}

	/**
	 * How alike two places look.
	 *
	 * Crude on purpose. A cleverer score would invite trusting it, and the
	 * cost of a confident wrong answer here is publishing one branch's
	 * details to another.
	 *
	 * @param array $location        One of our locations.
	 * @param array $google_location A stored Google location.
	 * @return int
	 */
	private static function score( array $location, array $google_location ) {
		$score = 0;

		$our_name    = self::normalise( isset( $location['name'] ) ? $location['name'] : '' );
		$their_title = self::normalise( $google_location['title'] );

		if ( '' !== $our_name && $our_name === $their_title ) {
			$score += 3;
		} elseif ( '' !== $our_name && '' !== $their_title
			&& ( false !== strpos( $their_title, $our_name ) || false !== strpos( $our_name, $their_title ) ) ) {
			++$score;
		}

		$our_street = self::normalise( isset( $location['address_line_1'] ) ? $location['address_line_1'] : '' );

		if ( '' !== $our_street && false !== strpos( self::normalise( $google_location['address'] ), $our_street ) ) {
			$score += 3;
		}

		$our_postal = self::normalise( isset( $location['postal_code'] ) ? $location['postal_code'] : '' );

		if ( '' !== $our_postal && false !== strpos( self::normalise( $google_location['address'] ), $our_postal ) ) {
			$score += 2;
		}

		return $score;
	}

	/**
	 * Lowercase, strip everything but letters and digits.
	 *
	 * @param string $value Raw value.
	 * @return string
	 */
	private static function normalise( $value ) {
		return preg_replace( '/[^a-z0-9]/', '', strtolower( (string) $value ) );
	}

	/**
	 * One-line address for one of our locations.
	 *
	 * @param array $location Location row.
	 * @return string
	 */
	private static function our_address( array $location ) {
		$parts = array();

		foreach ( array( 'address_line_1', 'city', 'region', 'postal_code', 'country' ) as $key ) {
			if ( ! empty( $location[ $key ] ) ) {
				$parts[] = (string) $location[ $key ];
			}
		}

		return implode( ', ', $parts );
	}
}
