<?php
/**
 * What Google shows, against what this site holds.
 *
 * @package FoundHint
 */

namespace FHINT\App\Places;

use FHINT\App\Location\DayOfWeek;

defined( 'ABSPATH' ) || exit;

/**
 * Field-by-field agreement between a live place and this plugin's data.
 *
 * **It compares; it never copies.** The result carries both values so the
 * screen can show them side by side, and the caller writes nothing: under
 * Google's terms the plugin may not save their side, and the whole feature
 * exists to tell the operator where to look, not to overwrite their record.
 *
 * Comparison is forgiving where formatting differs and strict where meaning
 * differs. "+44 20 7946 0000" and "020 7946 0000" are the same phone;
 * `https://example.com/` and `http://www.example.com` are the same website;
 * "Mon 09:00-17:00" against "Mon 09:00-17:30" is a real difference and is
 * reported as one.
 *
 * Statuses are codes, not sentences — the admin bundle owns the wording.
 */
class Comparison {

	const MATCH         = 'match';
	const DIFFERS       = 'differs';
	const MISSING_HERE  = 'missing_here';
	const MISSING_THERE = 'missing_there';
	const UNKNOWN       = 'unknown';

	/**
	 * Compare a normalised place against resolved NAP data.
	 *
	 * @param array $place Output of `Place::from_details()`.
	 * @param array $nap   Output of `App\Nap\Nap::resolve()`.
	 * @return array
	 */
	public static function build( array $place, array $nap ) {
		$fields = array(
			self::field( 'name', self::get( $nap, 'name' ), self::get( $place, 'name' ), 'text' ),
			self::field( 'address', self::our_address( $nap ), self::get_address( $place ), 'address' ),
			self::field( 'phone', self::get( $nap, 'phone' ), self::get( $place, 'phone' ), 'phone' ),
			self::field( 'website', self::get( $nap, 'website' ), self::get( $place, 'website' ), 'url' ),
		);

		$hours = self::hours( $nap, $place );

		return array(
			'fields'  => $fields,
			'hours'   => $hours,
			'summary' => self::summarise( $fields, $hours ),
		);
	}

	/**
	 * One compared field.
	 *
	 * @param string $key   Field key.
	 * @param string $ours  Our value.
	 * @param string $their Google's value.
	 * @param string $kind  Comparison rule: text, address, phone or url.
	 * @return array
	 */
	private static function field( $key, $ours, $their, $kind ) {
		return array(
			'key'    => $key,
			'ours'   => $ours,
			'theirs' => $their,
			'status' => self::status( $ours, $their, $kind ),
		);
	}

	/**
	 * The status of one pair of values.
	 *
	 * @param string $ours  Our value.
	 * @param string $their Google's value.
	 * @param string $kind  Comparison rule.
	 * @return string
	 */
	private static function status( $ours, $their, $kind ) {
		$ours  = trim( (string) $ours );
		$their = trim( (string) $their );

		if ( '' === $ours && '' === $their ) {
			return self::UNKNOWN;
		}

		if ( '' === $ours ) {
			return self::MISSING_HERE;
		}

		if ( '' === $their ) {
			return self::MISSING_THERE;
		}

		return self::equivalent( $ours, $their, $kind ) ? self::MATCH : self::DIFFERS;
	}

	/**
	 * Whether two values mean the same thing.
	 *
	 * @param string $ours  Our value.
	 * @param string $their Google's value.
	 * @param string $kind  Comparison rule.
	 * @return bool
	 */
	private static function equivalent( $ours, $their, $kind ) {
		switch ( $kind ) {
			case 'phone':
				return self::same_phone( $ours, $their );
			case 'url':
				return self::same_url( $ours, $their );
			case 'address':
				return self::same_address( $ours, $their );
			default:
				return self::plain( $ours ) === self::plain( $their );
		}
	}

	/**
	 * Casefolded, whitespace-collapsed text.
	 *
	 * @param string $value Value.
	 * @return string
	 */
	private static function plain( $value ) {
		$value = preg_replace( '/\s+/u', ' ', (string) $value );

		return trim( function_exists( 'mb_strtolower' ) ? mb_strtolower( $value ) : strtolower( $value ) );
	}

	/**
	 * Whether two phone numbers are the same line.
	 *
	 * Compared as digits, ignoring a country code one side spells out and
	 * the other does not: a local and an international rendering of one
	 * number must not be reported as a difference to fix.
	 *
	 * @param string $ours  Our value.
	 * @param string $their Google's value.
	 * @return bool
	 */
	private static function same_phone( $ours, $their ) {
		$a = preg_replace( '/\D+/', '', (string) $ours );
		$b = preg_replace( '/\D+/', '', (string) $their );

		if ( '' === $a || '' === $b ) {
			return false;
		}

		if ( $a === $b ) {
			return true;
		}

		// A national number carries a trunk zero that the international
		// form replaces with a country code — "0117 496 0000" and
		// "+44 117 496 0000" are one line. Dropping the trunk zero and
		// comparing from the right reconciles them; two numbers that
		// genuinely differ are the same length and still differ.
		$a = ltrim( $a, '0' );
		$b = ltrim( $b, '0' );

		$length = min( strlen( $a ), strlen( $b ) );

		if ( $length < 7 ) {
			return false;
		}

		return substr( $a, -$length ) === substr( $b, -$length );
	}

	/**
	 * Whether two URLs point at the same site.
	 *
	 * @param string $ours  Our value.
	 * @param string $their Google's value.
	 * @return bool
	 */
	private static function same_url( $ours, $their ) {
		return self::canonical_url( $ours ) === self::canonical_url( $their );
	}

	/**
	 * A URL reduced to host and path.
	 *
	 * @param string $value URL.
	 * @return string
	 */
	private static function canonical_url( $value ) {
		$value = trim( (string) $value );
		$value = preg_replace( '#^https?://#i', '', $value );
		$value = preg_replace( '#^www\.#i', '', $value );
		$value = rtrim( $value, '/' );

		return strtolower( $value );
	}

	/**
	 * Whether two addresses describe the same doorway.
	 *
	 * Formatted addresses differ by punctuation, country suffix and line
	 * order between any two sources, so they are compared as the set of
	 * their alphanumeric tokens: one side carrying "United Kingdom" or a
	 * comma the other omits is not a difference an operator should be sent
	 * to fix. A different street or postcode changes the tokens and is
	 * reported.
	 *
	 * @param string $ours  Our formatted address.
	 * @param string $their Google's formatted address.
	 * @return bool
	 */
	private static function same_address( $ours, $their ) {
		$a = self::address_tokens( $ours );
		$b = self::address_tokens( $their );

		if ( ! $a || ! $b ) {
			return false;
		}

		// Either side may carry a country or a county the other leaves out,
		// so the test is that the shorter is wholly contained in the longer.
		$common = array_intersect( $a, $b );

		return count( $common ) === min( count( $a ), count( $b ) );
	}

	/**
	 * An address as a set of comparable tokens.
	 *
	 * @param string $value Address.
	 * @return string[]
	 */
	private static function address_tokens( $value ) {
		$value  = self::plain( $value );
		$value  = preg_replace( '/[^\p{L}\p{N}\s]+/u', ' ', $value );
		$tokens = preg_split( '/\s+/u', trim( (string) $value ) );

		if ( ! is_array( $tokens ) ) {
			return array();
		}

		$tokens = array_filter(
			$tokens,
			static function ( $token ) {
				return '' !== $token;
			}
		);

		return array_values( array_unique( $tokens ) );
	}

	/**
	 * Our formatted address.
	 *
	 * @param array $nap Resolved NAP.
	 * @return string
	 */
	private static function our_address( array $nap ) {
		return isset( $nap['address']['formatted'] ) ? (string) $nap['address']['formatted'] : '';
	}

	/**
	 * Google's formatted address.
	 *
	 * @param array $place Normalised place.
	 * @return string
	 */
	private static function get_address( array $place ) {
		return isset( $place['address']['formatted'] ) ? (string) $place['address']['formatted'] : '';
	}

	/**
	 * A top-level string from an array.
	 *
	 * @param array  $source Source.
	 * @param string $key    Key.
	 * @return string
	 */
	private static function get( array $source, $key ) {
		return isset( $source[ $key ] ) ? (string) $source[ $key ] : '';
	}

	/**
	 * Opening hours, day by day.
	 *
	 * The three states survive here. A day this site has never configured is
	 * `missing_here` rather than "closed", because the plugin does not know
	 * — and telling somebody their Sunday disagrees with Google when they
	 * have simply not filled it in is how a comparison loses their trust.
	 *
	 * @param array $nap   Resolved NAP.
	 * @param array $place Normalised place.
	 * @return array
	 */
	private static function hours( array $nap, array $place ) {
		$ours   = isset( $nap['hours']['days'] ) && is_array( $nap['hours']['days'] ) ? $nap['hours']['days'] : array();
		$theirs = isset( $place['hours']['days'] ) && is_array( $place['hours']['days'] ) ? $place['hours']['days'] : array();

		$ours_by_day   = self::index_days( $ours );
		$theirs_by_day = self::index_days( $theirs );

		$days      = array();
		$differing = 0;

		foreach ( DayOfWeek::display_order() as $day ) {
			$our_day   = isset( $ours_by_day[ $day ] ) ? $ours_by_day[ $day ] : null;
			$their_day = isset( $theirs_by_day[ $day ] ) ? $theirs_by_day[ $day ] : null;

			$our_configured   = $our_day && ! empty( $our_day['configured'] );
			$their_configured = $their_day && ! empty( $their_day['configured'] );

			if ( ! $our_configured && ! $their_configured ) {
				$status = self::UNKNOWN;
			} elseif ( ! $our_configured ) {
				$status = self::MISSING_HERE;
			} elseif ( ! $their_configured ) {
				$status = self::MISSING_THERE;
			} else {
				$status = self::same_periods( $our_day, $their_day ) ? self::MATCH : self::DIFFERS;
			}

			if ( self::DIFFERS === $status ) {
				$differing++;
			}

			$days[] = array(
				'day_of_week' => $day,
				'day_name'    => DayOfWeek::name( $day ),
				'ours'        => $our_configured ? $our_day['periods'] : array(),
				'theirs'      => $their_configured ? $their_day['periods'] : array(),
				'status'      => $status,
			);
		}

		return array(
			'days'       => $days,
			'differing'  => $differing,
			'comparable' => (bool) $ours_by_day && (bool) $theirs_by_day,
		);
	}

	/**
	 * Days keyed by day number.
	 *
	 * @param array $days Day payloads.
	 * @return array
	 */
	private static function index_days( array $days ) {
		$indexed = array();

		foreach ( $days as $day ) {
			if ( is_array( $day ) && isset( $day['day_of_week'] ) ) {
				$indexed[ (int) $day['day_of_week'] ] = $day;
			}
		}

		return $indexed;
	}

	/**
	 * Whether two days keep the same hours.
	 *
	 * @param array $ours  Our day payload.
	 * @param array $their Google's day payload.
	 * @return bool
	 */
	private static function same_periods( array $ours, array $their ) {
		return self::periods_signature( $ours ) === self::periods_signature( $their );
	}

	/**
	 * A day reduced to something comparable.
	 *
	 * Sorted, because two sources may list the same split shift in either
	 * order, and a morning-then-afternoon pair is not a difference from an
	 * afternoon-then-morning one.
	 *
	 * @param array $day Day payload.
	 * @return string
	 */
	private static function periods_signature( array $day ) {
		$periods = isset( $day['periods'] ) && is_array( $day['periods'] ) ? $day['periods'] : array();
		$parts   = array();

		foreach ( $periods as $period ) {
			if ( ! is_array( $period ) ) {
				continue;
			}

			if ( ! empty( $period['is_closed'] ) ) {
				$parts[] = 'closed';
				continue;
			}

			if ( ! empty( $period['is_24h'] ) ) {
				$parts[] = '24h';
				continue;
			}

			$parts[] = substr( (string) $period['open_time'], 0, 5 ) . '-' . substr( (string) $period['close_time'], 0, 5 );
		}

		// A day holding only "closed" markers is closed however it was
		// written, and an empty list means the same thing as no periods.
		$parts = array_values( array_unique( $parts ) );
		sort( $parts );

		return implode( ',', $parts );
	}

	/**
	 * Counts across everything compared.
	 *
	 * @param array $fields Compared fields.
	 * @param array $hours  Compared hours.
	 * @return array
	 */
	private static function summarise( array $fields, array $hours ) {
		$counts = array(
			self::MATCH         => 0,
			self::DIFFERS       => 0,
			self::MISSING_HERE  => 0,
			self::MISSING_THERE => 0,
			self::UNKNOWN       => 0,
		);

		foreach ( $fields as $field ) {
			$counts[ $field['status'] ]++;
		}

		return array(
			'match'         => $counts[ self::MATCH ],
			'differs'       => $counts[ self::DIFFERS ],
			'missing_here'  => $counts[ self::MISSING_HERE ],
			'missing_there' => $counts[ self::MISSING_THERE ],
			'unknown'       => $counts[ self::UNKNOWN ],
			'hours_differ'  => (int) $hours['differing'],
			// What the screen leads with: everything worth a second look,
			// hours included.
			'attention'     => $counts[ self::DIFFERS ] + $counts[ self::MISSING_HERE ] + (int) $hours['differing'],
		);
	}
}
