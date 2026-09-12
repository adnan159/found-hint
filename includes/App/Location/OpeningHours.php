<?php
/**
 * Opening hours model.
 *
 * @package FoundHint
 */

namespace FHINT\App\Location;

use FHINT\App\Core\ValidationResult;
use FHINT\App\Core\Validator;

defined( 'ABSPATH' ) || exit;

/**
 * Parses, validates and shapes a week of opening hours.
 *
 * Three states per day, and they are genuinely different things:
 *
 * - **unconfigured** — no rows. "We never said." Produces no schema output
 *   and an audit finding asking the operator to fill it in.
 * - **closed** — one row with is_closed. "We are shut that day." Valid,
 *   complete, and emitted as such.
 * - **open** — one or more periods. Two periods on one day is a lunch break;
 *   that is why hours are rows rather than two columns on the location.
 *
 * Conflating unconfigured with closed is the classic bug here: it silently
 * publishes "closed Sunday" for a business that simply hasn't filled in
 * Sunday yet.
 *
 * A period whose close_time is earlier than its open_time is **overnight**
 * (22:00–02:00), not an error — it is one continuous shift crossing
 * midnight, and it is stored and emitted as one period.
 */
class OpeningHours {

	/**
	 * Read a write payload into a flat list of period rows.
	 *
	 * Two shapes are accepted, because both are natural to send:
	 *
	 *   { "1": { "open_time": "09:00", "close_time": "17:30" },
	 *     "2": { "is_closed": true },
	 *     "5": { "periods": [ {…}, {…} ] } }
	 *
	 *   { "periods": [ { "day_of_week": 6, "open_time": "10:00", … } ] }
	 *
	 * An entry's own day_of_week always wins over its array index — in a
	 * flat list the indexes 0 and 1 are themselves valid day numbers, so
	 * trusting the index there would silently reassign days.
	 *
	 * @param mixed $payload Raw opening_hours value from a request.
	 * @return array[] Period rows: day_of_week, period_index, open_time, close_time, is_closed, is_24h.
	 */
	public static function parse( $payload ) {
		if ( ! is_array( $payload ) ) {
			return array();
		}

		$entries = array();

		if ( isset( $payload['periods'] ) && is_array( $payload['periods'] ) ) {
			foreach ( $payload['periods'] as $entry ) {
				if ( is_array( $entry ) && isset( $entry['day_of_week'] ) ) {
					$entries[] = array(
						'day' => $entry['day_of_week'],
						'entry' => $entry,
					);
				}
			}
		}

		foreach ( $payload as $key => $value ) {
			if ( 'periods' === $key || ! is_array( $value ) ) {
				continue;
			}

			if ( isset( $value['periods'] ) && is_array( $value['periods'] ) ) {
				foreach ( $value['periods'] as $entry ) {
					if ( is_array( $entry ) ) {
						$day       = isset( $entry['day_of_week'] ) ? $entry['day_of_week'] : $key;
						$entries[] = array(
							'day' => $day,
							'entry' => $entry,
						);
					}
				}
				continue;
			}

			$day       = isset( $value['day_of_week'] ) ? $value['day_of_week'] : $key;
			$entries[] = array(
				'day' => $day,
				'entry' => $value,
			);
		}

		$rows    = array();
		$indexes = array();

		foreach ( $entries as $item ) {
			if ( ! DayOfWeek::is_valid( $item['day'] ) ) {
				// Keep it, so validation can report the bad day rather than
				// silently dropping what the user sent.
				$day = is_numeric( $item['day'] ) ? (int) $item['day'] : -1;
			} else {
				$day = (int) $item['day'];
			}

			$entry = $item['entry'];

			$indexes[ $day ] = isset( $indexes[ $day ] ) ? $indexes[ $day ] + 1 : 0;

			$rows[] = array(
				'day_of_week'  => $day,
				'period_index' => $indexes[ $day ],
				'open_time'    => isset( $entry['open_time'] ) ? Validator::normalize_time( $entry['open_time'] ) : null,
				'close_time'   => isset( $entry['close_time'] ) ? Validator::normalize_time( $entry['close_time'] ) : null,
				'is_closed'    => ! empty( $entry['is_closed'] ),
				'is_24h'       => ! empty( $entry['is_24h'] ),
				'raw_open'     => isset( $entry['open_time'] ) ? (string) $entry['open_time'] : '',
				'raw_close'    => isset( $entry['close_time'] ) ? (string) $entry['close_time'] : '',
			);
		}

		return $rows;
	}

	/**
	 * Validate parsed period rows.
	 *
	 * Errors are keyed by day and period so a form can attach each message
	 * to the input that caused it:
	 * `day_1.period_0.close_time`, or `day_2` for an overlap.
	 *
	 * @param array[] $rows Rows from parse().
	 * @return ValidationResult
	 */
	public static function validate( array $rows ) {
		$result  = new ValidationResult();
		$by_day  = array();

		foreach ( $rows as $row ) {
			$day = (int) $row['day_of_week'];

			if ( ! DayOfWeek::is_valid( $day ) ) {
				$result->add( 'day_' . $day, 'hours.day.invalid' );
				continue;
			}

			$field = 'day_' . $day . '.period_' . (int) $row['period_index'];

			if ( $row['is_closed'] || $row['is_24h'] ) {
				continue;
			}

			if ( null === $row['open_time'] ) {
				$result->add( $field . '.open_time', 'hours.open_time.required' );
			}

			if ( null === $row['close_time'] ) {
				$result->add( $field . '.close_time', 'hours.close_time.required' );
			}

			if ( null === $row['open_time'] || null === $row['close_time'] ) {
				continue;
			}

			if ( $row['open_time'] === $row['close_time'] ) {
				$result->add( $field . '.close_time', 'hours.range.zero_length' );
				continue;
			}

			$by_day[ $day ][] = $row;
		}

		foreach ( $by_day as $day => $periods ) {
			if ( self::has_overlap( $periods ) ) {
				$result->add( 'day_' . $day, 'hours.periods.overlap' );
			}
		}

		return $result;
	}

	/**
	 * Whether any two periods on a day overlap.
	 *
	 * Overnight periods are expanded past midnight before comparing, so
	 * 22:00–02:00 and 01:00–03:00 are correctly seen as overlapping.
	 *
	 * @param array[] $periods Periods for one day.
	 * @return bool
	 */
	private static function has_overlap( array $periods ) {
		$ranges = array();

		foreach ( $periods as $period ) {
			$open  = self::to_minutes( $period['open_time'] );
			$close = self::to_minutes( $period['close_time'] );

			if ( $close <= $open ) {
				$close += 1440;
			}

			$ranges[] = array( $open, $close );
		}

		$count = count( $ranges );

		for ( $i = 0; $i < $count; $i++ ) {
			for ( $j = $i + 1; $j < $count; $j++ ) {
				if ( $ranges[ $i ][0] < $ranges[ $j ][1] && $ranges[ $j ][0] < $ranges[ $i ][1] ) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Minutes since midnight for an HH:MM:SS time.
	 *
	 * @param string $time Time value.
	 * @return int
	 */
	private static function to_minutes( $time ) {
		$parts = explode( ':', (string) $time );

		return ( (int) $parts[0] * 60 ) + ( isset( $parts[1] ) ? (int) $parts[1] : 0 );
	}

	/**
	 * Shape stored rows for a REST response: grouped by day, in display order.
	 *
	 * @param array[] $rows Stored hour rows for one location.
	 * @return array
	 */
	public static function to_payload( array $rows ) {
		$grouped = array();

		foreach ( $rows as $row ) {
			$grouped[ (int) $row['day_of_week'] ][] = $row;
		}

		$days          = array();
		$period_count  = 0;
		$has_any_hours = false;

		foreach ( DayOfWeek::display_order() as $day ) {
			$periods    = array();
			$configured = isset( $grouped[ $day ] );

			if ( $configured ) {
				usort(
					$grouped[ $day ],
					static function ( $a, $b ) {
						return (int) $a['period_index'] <=> (int) $b['period_index'];
					}
				);

				foreach ( $grouped[ $day ] as $row ) {
					$open  = $row['open_time'] ? substr( (string) $row['open_time'], 0, 5 ) : '';
					$close = $row['close_time'] ? substr( (string) $row['close_time'], 0, 5 ) : '';

					$periods[] = array(
						'period_index' => (int) $row['period_index'],
						'open_time'    => $open,
						'close_time'   => $close,
						'is_closed'    => (bool) $row['is_closed'],
						'is_24h'       => (bool) $row['is_24h'],
						'is_overnight' => '' !== $open && '' !== $close && $close < $open,
					);

					$period_count++;

					if ( ! $row['is_closed'] ) {
						$has_any_hours = true;
					}
				}
			}

			$days[] = array(
				'day_of_week' => $day,
				'day_name'    => DayOfWeek::name( $day ),
				'configured'  => $configured,
				'periods'     => $periods,
			);
		}

		return array(
			'days'          => $days,
			'has_any_hours' => $has_any_hours,
			'period_count'  => $period_count,
		);
	}
}
