<?php
/**
 * Special opening hours: parsing, rules and the shape sent back.
 *
 * @package FoundHint
 */

namespace FHINT\App\Location;

use FHINT\App\Core\ValidationResult;
use FHINT\App\Core\Validator;

defined( 'ABSPATH' ) || exit;

/**
 * Hours for a named date, overriding the weekly pattern.
 *
 * A special day is one of three things, the same three a weekday can be:
 * **closed**, **open all day**, or open for one or more **periods**. The
 * period rules are exactly the weekly ones — a missing time, a zero-length
 * range, an overlap — so they are checked by `OpeningHours::validate()`
 * rather than written out a second time. What is new here is only what a
 * date adds: it must be a real date, and it may appear once.
 *
 * Errors are keyed by the day's position in the list that was sent
 * (`day_0.date`, `day_1.period_0.close_time`), not by the date itself, so a
 * form can attach each message to the row that caused it even when the date
 * in that row is the thing that is wrong.
 */
class SpecialHours {

	/**
	 * Read a write payload into a flat list of period rows.
	 *
	 * Expects a list of days:
	 *
	 *   [ { "date": "2026-12-25", "is_closed": true, "note": "Christmas Day" },
	 *     { "date": "2026-12-24", "periods": [ { "open_time": "09:00", "close_time": "13:00" } ] } ]
	 *
	 * A day may also carry `open_time` and `close_time` directly when it has
	 * a single period.
	 *
	 * @param mixed $payload Raw special_hours value from a request.
	 * @return array[] Rows: index, date, raw_date, period_index, open_time,
	 *                 close_time, is_closed, is_24h, note.
	 */
	public static function parse( $payload ) {
		if ( ! is_array( $payload ) ) {
			return array();
		}

		$rows  = array();
		$index = 0;

		foreach ( $payload as $day ) {
			if ( ! is_array( $day ) ) {
				continue;
			}

			$raw_date  = isset( $day['date'] ) ? trim( (string) $day['date'] ) : '';
			$date      = Validator::is_date( $raw_date ) ? $raw_date : '';
			$is_closed = ! empty( $day['is_closed'] );
			$is_24h    = ! $is_closed && ! empty( $day['is_24h'] );
			$note      = isset( $day['note'] ) ? sanitize_text_field( (string) $day['note'] ) : '';

			$periods = array();

			if ( isset( $day['periods'] ) && is_array( $day['periods'] ) ) {
				foreach ( $day['periods'] as $period ) {
					if ( is_array( $period ) ) {
						$periods[] = $period;
					}
				}
			} elseif ( isset( $day['open_time'] ) || isset( $day['close_time'] ) ) {
				$periods[] = $day;
			}

			// Closed, or open all day: one row and no times. Anything sent
			// alongside is dropped, because "closed 09:00–17:00" means nothing.
			if ( $is_closed || $is_24h || ! $periods ) {
				$periods = array( array() );
			}

			foreach ( $periods as $period_index => $period ) {
				$rows[] = array(
					'index'        => $index,
					'date'         => $date,
					'raw_date'     => $raw_date,
					'period_index' => $period_index,
					'open_time'    => isset( $period['open_time'] ) ? Validator::normalize_time( $period['open_time'] ) : null,
					'close_time'   => isset( $period['close_time'] ) ? Validator::normalize_time( $period['close_time'] ) : null,
					'is_closed'    => $is_closed,
					'is_24h'       => $is_24h,
					'note'         => $note,
				);
			}

			++$index;
		}

		return $rows;
	}

	/**
	 * Validate parsed rows.
	 *
	 * @param array[] $rows Rows from parse().
	 * @return ValidationResult
	 */
	public static function validate( array $rows ) {
		$result = new ValidationResult();
		$days   = array();

		foreach ( $rows as $row ) {
			$days[ (int) $row['index'] ][] = $row;
		}

		$seen = array();

		foreach ( $days as $index => $periods ) {
			$field = 'day_' . $index;
			$date  = (string) $periods[0]['date'];

			if ( '' === $date ) {
				$result->add( $field . '.date', 'special_hours.date.invalid' );
			} elseif ( isset( $seen[ $date ] ) ) {
				// Two entries for one date would each claim to be the hours
				// for that day; only one of them could be shown or sent.
				$result->add( $field . '.date', 'special_hours.date.duplicate' );
			} else {
				$seen[ $date ] = true;
			}

			// The period rules are the weekly ones. Borrow a weekday so the
			// existing checks run unchanged, then put the day's own key back.
			$as_weekday = array();

			foreach ( $periods as $period ) {
				$period['day_of_week'] = DayOfWeek::MONDAY;
				$as_weekday[]          = $period;
			}

			foreach ( OpeningHours::validate( $as_weekday )->errors() as $key => $codes ) {
				$suffix = substr( (string) $key, strlen( 'day_' . DayOfWeek::MONDAY ) );

				foreach ( (array) $codes as $code ) {
					$result->add( $field . $suffix, $code );
				}
			}
		}

		return $result;
	}

	/**
	 * Shape stored rows for a response: one entry per date, oldest first.
	 *
	 * @param array[] $rows Stored rows for one location.
	 * @return array[]
	 */
	public static function to_payload( array $rows ) {
		$by_date = array();

		foreach ( $rows as $row ) {
			$by_date[ (string) $row['date'] ][] = $row;
		}

		ksort( $by_date );

		$days = array();

		foreach ( $by_date as $date => $periods ) {
			usort(
				$periods,
				static function ( $a, $b ) {
					return (int) $a['period_index'] <=> (int) $b['period_index'];
				}
			);

			$first     = $periods[0];
			$is_closed = ! empty( $first['is_closed'] );
			$is_24h    = ! empty( $first['is_24h'] );
			$shaped    = array();

			if ( ! $is_closed && ! $is_24h ) {
				foreach ( $periods as $period ) {
					$open  = $period['open_time'] ? substr( (string) $period['open_time'], 0, 5 ) : '';
					$close = $period['close_time'] ? substr( (string) $period['close_time'], 0, 5 ) : '';

					$shaped[] = array(
						'open_time'    => $open,
						'close_time'   => $close,
						'is_overnight' => '' !== $open && '' !== $close && $close < $open,
					);
				}
			}

			$days[] = array(
				'date'      => (string) $date,
				'is_closed' => $is_closed,
				'is_24h'    => $is_24h,
				'note'      => isset( $first['note'] ) ? (string) $first['note'] : '',
				'periods'   => $shaped,
			);
		}

		return $days;
	}
}
