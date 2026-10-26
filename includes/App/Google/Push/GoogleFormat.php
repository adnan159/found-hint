<?php
/**
 * This site's data, in the shapes Google's API takes — and back.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google\Push;

defined( 'ABSPATH' ) || exit;

/**
 * Converts stored values into Google's and reduces both to something
 * comparable.
 *
 * **Every comparison is made on Google's shape, by one function, on both
 * sides.** What this site has is first converted into what it would send;
 * then that and what Google holds are reduced by the same `*_signature()`
 * method. Comparing the stored form against Google's directly would need two
 * readings of "the same hours" to agree forever, and the first time they did
 * not, a business would be told its hours had changed when nothing had.
 *
 * Nothing here talks to the network or the database, which is what lets every
 * conversion be proved without either. The shapes were checked against a
 * real listing: times are objects (`{ "hours": 9 }`), a category is a
 * resource name (`categories/gcid:dentist`), and a day that never closes ends
 * at hour 24.
 */
class GoogleFormat {

	/**
	 * Day number, as this plugin stores it, to Google's day name.
	 */
	const DAYS = array(
		0 => 'SUNDAY',
		1 => 'MONDAY',
		2 => 'TUESDAY',
		3 => 'WEDNESDAY',
		4 => 'THURSDAY',
		5 => 'FRIDAY',
		6 => 'SATURDAY',
	);

	/**
	 * Social network, as this plugin names it, to Google's attribute id.
	 *
	 * Taken from the attributes Google reported for a real listing. There is
	 * no `url_x` — the network renamed itself and the attribute did not — and
	 * there is no Yelp attribute at all, so a Yelp link stays on this site.
	 */
	const SOCIAL_ATTRIBUTES = array(
		'facebook'  => 'url_facebook',
		'instagram' => 'url_instagram',
		'x'         => 'url_twitter',
		'linkedin'  => 'url_linkedin',
		'youtube'   => 'url_youtube',
		'tiktok'    => 'url_tiktok',
		'pinterest' => 'url_pinterest',
	);

	/**
	 * A stored time as Google's time-of-day object.
	 *
	 * @param string $time `HH:MM` or `HH:MM:SS`.
	 * @return array{hours:int, minutes:int}
	 */
	public static function time( $time ) {
		$parts = explode( ':', (string) $time );

		return array(
			'hours'   => isset( $parts[0] ) ? (int) $parts[0] : 0,
			'minutes' => isset( $parts[1] ) ? (int) $parts[1] : 0,
		);
	}

	/**
	 * The weekly hours to send, built from this site's and Google's own.
	 *
	 * Google replaces the whole week in one go and has no way to say "not
	 * told" — a day with no period is a closed day. This plugin does
	 * distinguish the two, so **a day nobody has filled in here keeps
	 * whatever Google already shows for it** rather than being published as
	 * closed. Only days this site has an answer for are replaced.
	 *
	 * @param array[] $days           Days as `OpeningHours::to_payload()` returns them.
	 * @param array[] $google_periods Google's current `regularHours.periods`.
	 * @return array[] Google periods.
	 */
	public static function periods( array $days, array $google_periods ) {
		$periods    = array();
		$configured = array();

		foreach ( $days as $day ) {
			if ( empty( $day['configured'] ) ) {
				continue;
			}

			$number                = (int) $day['day_of_week'];
			$configured[ $number ] = true;

			foreach ( $day['periods'] as $period ) {
				if ( ! empty( $period['is_closed'] ) ) {
					continue;
				}

				$name = self::DAYS[ $number ];

				if ( ! empty( $period['is_24h'] ) ) {
					$periods[] = self::period( $name, '00:00', $name, '24:00' );
					continue;
				}

				$open  = substr( (string) $period['open_time'], 0, 5 );
				$close = substr( (string) $period['close_time'], 0, 5 );

				if ( '00:00' === $close ) {
					// Closing at midnight is the end of this day to Google,
					// written as hour 24, not the start of the next.
					$periods[] = self::period( $name, $open, $name, '24:00' );
				} elseif ( $close < $open ) {
					// Past midnight: one shift, ending on the following day.
					$periods[] = self::period( $name, $open, self::DAYS[ ( $number + 1 ) % 7 ], $close );
				} else {
					$periods[] = self::period( $name, $open, $name, $close );
				}
			}
		}

		$names = array_flip( self::DAYS );

		foreach ( $google_periods as $period ) {
			$open_day = isset( $period['openDay'] ) ? (string) $period['openDay'] : '';

			if ( isset( $names[ $open_day ] ) && ! isset( $configured[ $names[ $open_day ] ] ) ) {
				$periods[] = $period;
			}
		}

		return $periods;
	}

	/**
	 * One Google period.
	 *
	 * @param string $open_day  Google day name.
	 * @param string $open      `HH:MM`.
	 * @param string $close_day Google day name.
	 * @param string $close     `HH:MM`, where `24:00` is the end of the day.
	 * @return array
	 */
	private static function period( $open_day, $open, $close_day, $close ) {
		return array(
			'openDay'   => $open_day,
			'openTime'  => self::time( $open ),
			'closeDay'  => $close_day,
			'closeTime' => self::time( $close ),
		);
	}

	/**
	 * Google periods reduced to a sorted list that can be compared.
	 *
	 * Midnight has two spellings — hour 24 of one day, or hour 0 of the next —
	 * and both become the first, so the same hours always compare equal.
	 *
	 * @param array[] $periods Google `periods`.
	 * @return string[]
	 */
	public static function periods_signature( array $periods ) {
		$names = array_flip( self::DAYS );
		$lines = array();

		foreach ( $periods as $period ) {
			if ( ! is_array( $period ) || ! isset( $period['openDay'], $names[ (string) $period['openDay'] ] ) ) {
				continue;
			}

			$open_day  = (string) $period['openDay'];
			$close_day = isset( $period['closeDay'] ) ? (string) $period['closeDay'] : $open_day;
			$open      = self::clock( isset( $period['openTime'] ) ? $period['openTime'] : array() );
			$close     = self::clock( isset( $period['closeTime'] ) ? $period['closeTime'] : array() );

			if ( '00:00' === $close && isset( $names[ $close_day ] ) && ( $names[ $open_day ] + 1 ) % 7 === $names[ $close_day ] ) {
				$close_day = $open_day;
				$close     = '24:00';
			}

			$lines[] = $names[ $open_day ] . ' ' . $open . '-' . ( $close_day === $open_day ? '' : $names[ $close_day ] . ' ' ) . $close;
		}

		sort( $lines );

		return $lines;
	}

	/**
	 * Stored special-hours rows as Google's `specialHourPeriods`.
	 *
	 * @param array[] $rows Rows from the special hours repository.
	 * @return array[]
	 */
	public static function special_periods( array $rows ) {
		$periods = array();

		foreach ( $rows as $row ) {
			$date = self::date( isset( $row['date'] ) ? (string) $row['date'] : '' );

			if ( null === $date ) {
				continue;
			}

			if ( ! empty( $row['is_closed'] ) ) {
				$periods[] = array(
					'startDate' => $date,
					'closed'    => true,
				);
				continue;
			}

			if ( ! empty( $row['is_24h'] ) ) {
				$periods[] = array(
					'startDate' => $date,
					'openTime'  => self::time( '00:00' ),
					'endDate'   => $date,
					'closeTime' => self::time( '24:00' ),
				);
				continue;
			}

			$open  = substr( (string) $row['open_time'], 0, 5 );
			$close = substr( (string) $row['close_time'], 0, 5 );

			$periods[] = array(
				'startDate' => $date,
				'openTime'  => self::time( $open ),
				'endDate'   => $date,
				'closeTime' => self::time( '00:00' === $close ? '24:00' : $close ),
			);
		}

		return $periods;
	}

	/**
	 * Google special-hour periods reduced to a sorted, comparable list.
	 *
	 * @param array[] $periods Google `specialHourPeriods`.
	 * @return string[]
	 */
	public static function special_signature( array $periods ) {
		$lines = array();

		foreach ( $periods as $period ) {
			if ( ! is_array( $period ) || empty( $period['startDate'] ) || ! is_array( $period['startDate'] ) ) {
				continue;
			}

			$day = sprintf(
				'%04d-%02d-%02d',
				isset( $period['startDate']['year'] ) ? (int) $period['startDate']['year'] : 0,
				isset( $period['startDate']['month'] ) ? (int) $period['startDate']['month'] : 0,
				isset( $period['startDate']['day'] ) ? (int) $period['startDate']['day'] : 0
			);

			if ( ! empty( $period['closed'] ) ) {
				$lines[] = $day . ' closed';
				continue;
			}

			$lines[] = $day . ' '
				. self::clock( isset( $period['openTime'] ) ? $period['openTime'] : array() )
				. '-'
				. self::clock( isset( $period['closeTime'] ) ? $period['closeTime'] : array() );
		}

		sort( $lines );

		return $lines;
	}

	/**
	 * Stored services as Google's `serviceItems`.
	 *
	 * A service that matches one Google already publishes for the category is
	 * sent as a *structured* item, by its id. Anything else is *free-form* and
	 * must name a category, which is why one is passed in. Services that are
	 * switched off are left out: on Google an item is either listed or not.
	 *
	 * @param array[] $services Stored services.
	 * @param string  $category Category resource name for free-form items.
	 * @param string  $language Language code for free-form labels.
	 * @return array[]
	 */
	public static function service_items( array $services, $category, $language ) {
		$items = array();

		foreach ( $services as $service ) {
			if ( isset( $service['status'] ) && 'active' !== (string) $service['status'] ) {
				continue;
			}

			$name        = trim( isset( $service['name'] ) ? (string) $service['name'] : '' );
			$description = trim( isset( $service['description'] ) ? (string) $service['description'] : '' );
			$type_id     = trim( isset( $service['google_service_type_id'] ) ? (string) $service['google_service_type_id'] : '' );
			$structured  = isset( $service['google_item_type'] ) && 'structured' === (string) $service['google_item_type'] && '' !== $type_id;

			if ( $structured ) {
				$item = array( 'structuredServiceItem' => array( 'serviceTypeId' => $type_id ) );

				if ( '' !== $description ) {
					$item['structuredServiceItem']['description'] = $description;
				}
			} else {
				if ( '' === $name ) {
					continue;
				}

				$label = array(
					'displayName'  => $name,
					'languageCode' => '' !== (string) $language ? (string) $language : 'en',
				);

				if ( '' !== $description ) {
					$label['description'] = $description;
				}

				$item = array(
					'freeFormServiceItem' => array(
						'category' => (string) $category,
						'label'    => $label,
					),
				);
			}

			$money = self::money(
				isset( $service['price'] ) ? $service['price'] : null,
				isset( $service['currency'] ) ? (string) $service['currency'] : ''
			);

			if ( null !== $money ) {
				$item['price'] = $money;
			}

			$items[] = $item;
		}

		return $items;
	}

	/**
	 * Google service items reduced to a sorted, comparable list.
	 *
	 * @param array[] $items Google `serviceItems`.
	 * @return string[]
	 */
	public static function services_signature( array $items ) {
		$lines = array();

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$price = '';

			foreach ( array( $item, isset( $item['structuredServiceItem'] ) ? $item['structuredServiceItem'] : array(), isset( $item['freeFormServiceItem'] ) ? $item['freeFormServiceItem'] : array() ) as $holder ) {
				if ( isset( $holder['price'] ) && is_array( $holder['price'] ) && ! empty( $holder['price']['currencyCode'] ) ) {
					$price = strtoupper( (string) $holder['price']['currencyCode'] ) . ' ' . number_format(
						( isset( $holder['price']['units'] ) ? (float) $holder['price']['units'] : 0.0 )
						+ ( isset( $holder['price']['nanos'] ) ? (float) $holder['price']['nanos'] / 1000000000 : 0.0 ),
						2,
						'.',
						''
					);
					break;
				}
			}

			if ( isset( $item['structuredServiceItem']['serviceTypeId'] ) ) {
				$lines[] = 'structured|' . (string) $item['structuredServiceItem']['serviceTypeId']
					. '|' . trim( isset( $item['structuredServiceItem']['description'] ) ? (string) $item['structuredServiceItem']['description'] : '' )
					. '|' . $price;
				continue;
			}

			if ( isset( $item['freeFormServiceItem']['label'] ) && is_array( $item['freeFormServiceItem']['label'] ) ) {
				$label   = $item['freeFormServiceItem']['label'];
				$lines[] = 'free|' . self::fold( isset( $label['displayName'] ) ? $label['displayName'] : '' )
					. '|' . trim( isset( $label['description'] ) ? (string) $label['description'] : '' )
					. '|' . $price;
			}
		}

		sort( $lines );

		return $lines;
	}

	/**
	 * A price as Google's money object: whole units, plus billionths.
	 *
	 * @param mixed  $price    Amount, or null/'' for none.
	 * @param string $currency ISO currency code.
	 * @return array|null Null when there is no price to state.
	 */
	public static function money( $price, $currency ) {
		if ( null === $price || '' === $price || '' === trim( (string) $currency ) ) {
			return null;
		}

		$amount = round( (float) $price, 2 );
		$units  = (int) floor( $amount );

		return array(
			'currencyCode' => strtoupper( trim( (string) $currency ) ),
			'units'        => (string) $units,
			'nanos'        => (int) round( ( $amount - $units ) * 1000000000 ),
		);
	}

	/**
	 * A category id as the resource name Google's API takes.
	 *
	 * @param string $id `gcid:dentist`, or already `categories/gcid:dentist`.
	 * @return string
	 */
	public static function category( $id ) {
		$id = strtolower( trim( (string) $id ) );

		if ( '' === $id ) {
			return '';
		}

		return 0 === strpos( $id, 'categories/' ) ? $id : 'categories/' . $id;
	}

	/**
	 * A phone number reduced to its digits, for comparing.
	 *
	 * Google hands numbers back in national format and this site may hold the
	 * international one. Two numbers are taken to be the same when one's
	 * digits end with the other's — the country code is the only part that
	 * comes and goes.
	 *
	 * @param string $a One number.
	 * @param string $b Another.
	 * @return bool
	 */
	public static function same_phone( $a, $b ) {
		$a = ltrim( preg_replace( '/\D+/', '', (string) $a ), '0' );
		$b = ltrim( preg_replace( '/\D+/', '', (string) $b ), '0' );

		if ( '' === $a || '' === $b ) {
			return $a === $b;
		}

		if ( $a === $b ) {
			return true;
		}

		$short = strlen( $a ) < strlen( $b ) ? $a : $b;
		$long  = strlen( $a ) < strlen( $b ) ? $b : $a;

		return strlen( $short ) >= 7 && substr( $long, -strlen( $short ) ) === $short;
	}

	/**
	 * A web address reduced to what makes it the same address.
	 *
	 * @param string $url A URL.
	 * @return string
	 */
	public static function url_key( $url ) {
		$url = strtolower( trim( (string) $url ) );
		$url = preg_replace( '#^https?://(www\.)?#', '', $url );

		return rtrim( (string) $url, '/' );
	}

	/**
	 * Text compared without regard to case or stray spacing.
	 *
	 * @param mixed $text Anything.
	 * @return string
	 */
	public static function fold( $text ) {
		$text = trim( preg_replace( '/\s+/u', ' ', (string) $text ) );

		return function_exists( 'mb_strtolower' ) ? mb_strtolower( $text ) : strtolower( $text );
	}

	/**
	 * A Google time-of-day object as `HH:MM`.
	 *
	 * @param mixed $time `{ hours, minutes }`; either may be absent, meaning 0.
	 * @return string
	 */
	private static function clock( $time ) {
		$time = is_array( $time ) ? $time : array();

		return sprintf(
			'%02d:%02d',
			isset( $time['hours'] ) ? (int) $time['hours'] : 0,
			isset( $time['minutes'] ) ? (int) $time['minutes'] : 0
		);
	}

	/**
	 * A stored date as Google's date object.
	 *
	 * @param string $date `YYYY-MM-DD`.
	 * @return array|null
	 */
	private static function date( $date ) {
		if ( ! preg_match( '/^(\d{4})-(\d{2})-(\d{2})$/', $date, $m ) ) {
			return null;
		}

		return array(
			'year'  => (int) $m[1],
			'month' => (int) $m[2],
			'day'   => (int) $m[3],
		);
	}
}
