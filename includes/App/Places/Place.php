<?php
/**
 * One place, as Google currently describes it.
 *
 * @package FoundHint
 */

namespace FHINT\App\Places;

use FHINT\App\Location\DayOfWeek;

defined( 'ABSPATH' ) || exit;

/**
 * Google's answer, reshaped into this plugin's vocabulary.
 *
 * **This is a value, not a record.** Nothing here is written to a table:
 * it is built from a live response, handed to the screen, and forgotten. The
 * shape deliberately matches `App\Nap\Nap::resolve()` so `Comparison` can
 * put the two side by side without either side special-casing the other.
 *
 * Opening hours keep the same three states the rest of the plugin uses —
 * **unset is not closed**. Google omits a day entirely when it holds no
 * hours for it, and a plugin that reads that omission as "closed on Sunday"
 * would report a difference that does not exist, then offer to fix it.
 */
class Place {

	/**
	 * Normalise a Places details response.
	 *
	 * @param array $payload Decoded `places.googleapis.com/v1/places/{id}`
	 *                       response.
	 * @return array
	 */
	public static function from_details( array $payload ) {
		$components = isset( $payload['addressComponents'] ) && is_array( $payload['addressComponents'] )
			? $payload['addressComponents']
			: array();

		return array(
			'place_id'     => isset( $payload['id'] ) ? (string) $payload['id'] : '',
			'name'         => self::text( $payload, 'displayName' ),
			'category'     => self::text( $payload, 'primaryTypeDisplayName' ),
			'phone'        => isset( $payload['nationalPhoneNumber'] ) ? (string) $payload['nationalPhoneNumber'] : '',
			'phone_international' => isset( $payload['internationalPhoneNumber'] ) ? (string) $payload['internationalPhoneNumber'] : '',
			'website'      => isset( $payload['websiteUri'] ) ? (string) $payload['websiteUri'] : '',
			'maps_url'     => isset( $payload['googleMapsUri'] ) ? (string) $payload['googleMapsUri'] : '',
			'status'       => isset( $payload['businessStatus'] ) ? (string) $payload['businessStatus'] : '',
			'address'      => self::address( $payload, $components ),
			'coordinates'  => self::coordinates( $payload ),
			'hours'        => self::hours( $payload ),
		);
	}

	/**
	 * Normalise one search result.
	 *
	 * @param array $payload One entry of a `places:searchText` response.
	 * @return array
	 */
	public static function from_search( array $payload ) {
		return array(
			'place_id' => isset( $payload['id'] ) ? (string) $payload['id'] : '',
			'name'     => self::text( $payload, 'displayName' ),
			'address'  => isset( $payload['formattedAddress'] ) ? (string) $payload['formattedAddress'] : '',
		);
	}

	/**
	 * Every candidate in a search response.
	 *
	 * @param array $payload Decoded `places:searchText` response.
	 * @return array[]
	 */
	public static function candidates( array $payload ) {
		$places = isset( $payload['places'] ) && is_array( $payload['places'] ) ? $payload['places'] : array();
		$out    = array();

		foreach ( $places as $place ) {
			if ( ! is_array( $place ) ) {
				continue;
			}

			$candidate = self::from_search( $place );

			// A candidate with no id cannot be chosen, so it is not offered.
			if ( '' !== $candidate['place_id'] ) {
				$out[] = $candidate;
			}
		}

		return $out;
	}

	/**
	 * A localised text field, which Google wraps in an object.
	 *
	 * @param array  $payload Response.
	 * @param string $key     Field name.
	 * @return string
	 */
	private static function text( array $payload, $key ) {
		if ( ! isset( $payload[ $key ] ) ) {
			return '';
		}

		if ( is_array( $payload[ $key ] ) ) {
			return isset( $payload[ $key ]['text'] ) ? (string) $payload[ $key ]['text'] : '';
		}

		return (string) $payload[ $key ];
	}

	/**
	 * The address, both formatted and in parts.
	 *
	 * Google returns components in an arbitrary order, each tagged with its
	 * types, so they are read by type rather than by position. A street
	 * address is `streetNumber` then `route`, in that order for most of the
	 * world; where Google supplies neither, the formatted line still carries
	 * the address and the parts stay empty rather than guessing.
	 *
	 * @param array $payload    Response.
	 * @param array $components Address components.
	 * @return array
	 */
	private static function address( array $payload, array $components ) {
		$by_type = array();

		foreach ( $components as $component ) {
			if ( ! is_array( $component ) || empty( $component['types'] ) || ! is_array( $component['types'] ) ) {
				continue;
			}

			$value = isset( $component['longText'] ) ? (string) $component['longText'] : '';
			$short = isset( $component['shortText'] ) ? (string) $component['shortText'] : '';

			foreach ( $component['types'] as $type ) {
				$by_type[ (string) $type ] = array(
					'long'  => $value,
					'short' => $short,
				);
			}
		}

		$number = isset( $by_type['street_number']['long'] ) ? $by_type['street_number']['long'] : '';
		$route  = isset( $by_type['route']['long'] ) ? $by_type['route']['long'] : '';
		$line_1 = trim( $number . ' ' . $route );

		return array(
			'line_1'    => $line_1,
			'line_2'    => isset( $by_type['subpremise']['long'] ) ? $by_type['subpremise']['long'] : '',
			'city'      => self::first_of( $by_type, array( 'postal_town', 'locality', 'administrative_area_level_2' ) ),
			'region'    => self::first_of( $by_type, array( 'administrative_area_level_1' ) ),
			'postal'    => isset( $by_type['postal_code']['long'] ) ? $by_type['postal_code']['long'] : '',
			// Countries are compared against our two-letter storage.
			'country'   => isset( $by_type['country']['short'] ) ? $by_type['country']['short'] : '',
			'formatted' => isset( $payload['formattedAddress'] ) ? (string) $payload['formattedAddress'] : '',
		);
	}

	/**
	 * The first component present, by type preference.
	 *
	 * @param array    $by_type Components keyed by type.
	 * @param string[] $types   Types to try, most specific first.
	 * @return string
	 */
	private static function first_of( array $by_type, array $types ) {
		foreach ( $types as $type ) {
			if ( isset( $by_type[ $type ]['long'] ) && '' !== $by_type[ $type ]['long'] ) {
				return $by_type[ $type ]['long'];
			}
		}

		return '';
	}

	/**
	 * Coordinates, or nulls.
	 *
	 * @param array $payload Response.
	 * @return array
	 */
	private static function coordinates( array $payload ) {
		$lat = isset( $payload['location']['latitude'] ) ? (float) $payload['location']['latitude'] : null;
		$lng = isset( $payload['location']['longitude'] ) ? (float) $payload['location']['longitude'] : null;

		return array(
			'latitude'  => $lat,
			'longitude' => $lng,
			'has_both'  => null !== $lat && null !== $lng,
		);
	}

	/**
	 * Opening hours in this plugin's payload shape.
	 *
	 * Google gives periods as `open`/`close` pairs carrying a day number and
	 * a wall-clock time, with three shapes worth handling:
	 *
	 * - a period with no `close` means open around the clock;
	 * - a period whose close day differs from its open day is overnight, and
	 *   belongs to the day it opens;
	 * - a day with no period at all is *unknown*, not closed, unless Google
	 *   says the place is open on other days — in which case a missing day
	 *   genuinely is a closed day, which is how Google models it.
	 *
	 * @param array $payload Response.
	 * @return array
	 */
	private static function hours( array $payload ) {
		$periods = isset( $payload['regularOpeningHours']['periods'] ) && is_array( $payload['regularOpeningHours']['periods'] )
			? $payload['regularOpeningHours']['periods']
			: array();

		$has_hours = (bool) $periods;
		$grouped   = array();

		foreach ( $periods as $period ) {
			if ( ! is_array( $period ) || ! isset( $period['open']['day'] ) ) {
				continue;
			}

			$day = (int) $period['open']['day'];

			if ( ! DayOfWeek::is_valid( $day ) ) {
				continue;
			}

			$open  = self::clock( $period['open'] );
			$close = isset( $period['close'] ) ? self::clock( $period['close'] ) : '';
			$is24h = '' === $close;

			$grouped[ $day ][] = array(
				'period_index' => count( isset( $grouped[ $day ] ) ? $grouped[ $day ] : array() ),
				'open_time'    => $is24h ? '00:00' : $open,
				'close_time'   => $is24h ? '00:00' : $close,
				'is_closed'    => false,
				'is_24h'       => $is24h,
				'is_overnight' => ! $is24h && '' !== $open && '' !== $close && $close < $open,
			);
		}

		$days         = array();
		$period_count = 0;

		foreach ( DayOfWeek::display_order() as $day ) {
			$day_periods = isset( $grouped[ $day ] ) ? $grouped[ $day ] : array();

			if ( ! $day_periods && $has_hours ) {
				// Google publishes hours for this place and none for this
				// day: that is a closed day, and stating it is the whole
				// value of the comparison.
				$day_periods = array(
					array(
						'period_index' => 0,
						'open_time'    => '',
						'close_time'   => '',
						'is_closed'    => true,
						'is_24h'       => false,
						'is_overnight' => false,
					),
				);
			}

			$period_count += count( $day_periods );

			$days[] = array(
				'day_of_week' => $day,
				'day_name'    => DayOfWeek::name( $day ),
				// Without any hours at all, every day is unknown — Google
				// simply does not say, and neither do we.
				'configured'  => $has_hours,
				'periods'     => $day_periods,
			);
		}

		return array(
			'days'          => $days,
			'has_any_hours' => $has_hours,
			'period_count'  => $period_count,
		);
	}

	/**
	 * A Google time object as HH:MM.
	 *
	 * @param array $point `{hour, minute}`.
	 * @return string
	 */
	private static function clock( $point ) {
		if ( ! is_array( $point ) ) {
			return '';
		}

		$hour   = isset( $point['hour'] ) ? (int) $point['hour'] : 0;
		$minute = isset( $point['minute'] ) ? (int) $point['minute'] : 0;

		return sprintf( '%02d:%02d', $hour, $minute );
	}
}
