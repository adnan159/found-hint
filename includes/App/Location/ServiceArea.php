<?php
/**
 * The places a location serves.
 *
 * @package FoundHint
 */

namespace FHINT\App\Location;

use FHINT\App\Core\ValidationResult;

defined( 'ABSPATH' ) || exit;

/**
 * A service area: up to twenty places, each a name and, when Google knows
 * it, Google's place id.
 *
 * Google keeps a listing's area as `serviceArea.places.placeInfos`, each
 * `{ placeName, placeId }`, and **requires the place id** — a region in
 * Google's own map, which only Google's Places API can name. So a place is
 * stored here as `{ name, place_id }`:
 *
 * - a place read from Google has both, and is sent back as it came;
 * - a place typed here has a name and no id. It is kept, and published in
 *   the website's markup as an area served, but it cannot be sent to Google
 *   — a publish lists it as skipped, and says why.
 *
 * Pure: values in, values out.
 */
class ServiceArea {

	/** Google's limit. */
	const MAX = 20;

	/** The longest place name kept. */
	const NAME_MAX = 150;

	/**
	 * A list as sent, cleaned: blanks and repeats dropped, the order kept.
	 *
	 * Each entry may be a name, or `{ name, place_id }`. Repeats are compared
	 * by name, ignoring case and spacing. The limit is not applied: a list
	 * that is too long is refused by validation, never quietly cut.
	 *
	 * @param mixed $value List as sent.
	 * @return array[] Each `{ name, place_id }`.
	 */
	public static function sanitize( $value ) {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$places = array();
		$seen   = array();

		foreach ( $value as $entry ) {
			$name     = is_array( $entry ) ? ( isset( $entry['name'] ) ? $entry['name'] : '' ) : $entry;
			$place_id = is_array( $entry ) && isset( $entry['place_id'] ) ? $entry['place_id'] : '';
			$name     = is_scalar( $name ) ? sanitize_text_field( (string) $name ) : '';
			$place_id = is_scalar( $place_id ) ? trim( (string) $place_id ) : '';
			// An id that is not one is dropped, not trimmed into shape: a
			// made-up id sent to Google is worse than none.
			$place_id = preg_match( '/^[A-Za-z0-9_\-]+$/', $place_id ) ? $place_id : '';
			$key      = self::key( $name );

			if ( '' === $name || isset( $seen[ $key ] ) ) {
				continue;
			}

			$seen[ $key ] = true;
			$places[]     = array(
				'name'     => $name,
				'place_id' => $place_id,
			);
		}

		return $places;
	}

	/**
	 * Whether a cleaned list may be kept.
	 *
	 * @param array[] $places Cleaned list.
	 * @return ValidationResult
	 */
	public static function validate( array $places ) {
		$result = new ValidationResult();

		if ( count( $places ) > self::MAX ) {
			$result->add( 'service_area', 'service_area.too_many' );
		}

		foreach ( array_values( $places ) as $index => $place ) {
			if ( mb_strlen( (string) $place['name'] ) > self::NAME_MAX ) {
				$result->add( 'service_area.' . $index, 'service_area.name.too_long' );
			}
		}

		return $result;
	}

	/**
	 * The places a listing serves, from Google's `serviceArea`.
	 *
	 * @param mixed $service_area Google's `serviceArea` object.
	 * @return array[] Each `{ name, place_id }`.
	 */
	public static function from_google( $service_area ) {
		$infos = is_array( $service_area ) && isset( $service_area['places']['placeInfos'] ) && is_array( $service_area['places']['placeInfos'] )
			? $service_area['places']['placeInfos']
			: array();
		$list  = array();

		foreach ( $infos as $info ) {
			if ( is_array( $info ) ) {
				$list[] = array(
					'name'     => isset( $info['placeName'] ) ? $info['placeName'] : '',
					'place_id' => isset( $info['placeId'] ) ? $info['placeId'] : '',
				);
			}
		}

		return self::sanitize( $list );
	}

	/**
	 * The places that can go to Google: those with a place id.
	 *
	 * @param array[] $places Stored list.
	 * @return array[] Google's `placeInfos`.
	 */
	public static function place_infos( array $places ) {
		$infos = array();

		foreach ( $places as $place ) {
			if ( '' !== (string) $place['place_id'] ) {
				$infos[] = array(
					'placeName' => (string) $place['name'],
					'placeId'   => (string) $place['place_id'],
				);
			}
		}

		return $infos;
	}

	/**
	 * The places that cannot go to Google: typed here, with no place id.
	 *
	 * @param array[] $places Stored list.
	 * @return string[] Their names.
	 */
	public static function typed_only( array $places ) {
		$names = array();

		foreach ( $places as $place ) {
			if ( '' === (string) $place['place_id'] ) {
				$names[] = (string) $place['name'];
			}
		}

		return $names;
	}

	/**
	 * Google's place ids, sorted, for comparing two areas.
	 *
	 * @param array[] $infos `placeInfos`.
	 * @return string[]
	 */
	public static function signature( array $infos ) {
		$ids = array();

		foreach ( $infos as $info ) {
			if ( is_array( $info ) && ! empty( $info['placeId'] ) ) {
				$ids[] = (string) $info['placeId'];
			}
		}

		sort( $ids );

		return array_values( array_unique( $ids ) );
	}

	/**
	 * A name reduced for comparing: lower case, single spaces.
	 *
	 * @param string $name Place name.
	 * @return string
	 */
	private static function key( $name ) {
		return strtolower( (string) preg_replace( '/\s+/', ' ', trim( (string) $name ) ) );
	}
}
