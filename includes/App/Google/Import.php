<?php
/**
 * Bringing a Google Business Profile into FoundHint.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google;

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Location\DayOfWeek;
use FHINT\App\Location\LocationRepository;
use FHINT\App\Location\OpeningHours;
use FHINT\App\Location\OpeningHoursRepository;
use FHINT\App\Nap\Nap;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Reads the mapped Google location and offers its values, field by field.
 *
 * **Nothing is written without being chosen.** `preview()` reads Google and
 * returns both sides; `apply()` writes only the fields it is handed. The two
 * are separate calls because an import that silently overwrote a phone number
 * somebody had corrected here would be worse than no import at all.
 *
 * Which fields are *suggested* follows one rule: **empty here wins, filled
 * here is left alone.** A blank field has nothing to lose, so it is ticked;
 * a field that already differs is the operator's decision, because FoundHint
 * cannot know which of the two is out of date.
 *
 * Unlike the Places API, this is the owner's own listing read with the
 * owner's permission, so the values may be kept.
 */
class Import {

	/** One location, read fresh. */
	const LOCATION_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1/%s';

	/**
	 * Fields to ask Google for.
	 *
	 * `readMask` is required by the Business Information API, and asking for
	 * less than is imported would leave fields silently blank.
	 */
	const READ_MASK = 'title,storefrontAddress,phoneNumbers,websiteUri,regularHours,profile,latlng';

	/** Google's day names, in this plugin's numbering. */
	const DAYS = array(
		'SUNDAY'    => DayOfWeek::SUNDAY,
		'MONDAY'    => DayOfWeek::MONDAY,
		'TUESDAY'   => DayOfWeek::TUESDAY,
		'WEDNESDAY' => DayOfWeek::WEDNESDAY,
		'THURSDAY'  => DayOfWeek::THURSDAY,
		'FRIDAY'    => DayOfWeek::FRIDAY,
		'SATURDAY'  => DayOfWeek::SATURDAY,
	);

	/** What can be imported, and where each value belongs. */
	const FIELDS = array( 'name', 'address', 'phone', 'website', 'description', 'hours' );

	/**
	 * Read Google and show both sides.
	 *
	 * **A site with no location yet is the ordinary case**, not an error: the
	 * whole point of importing is not typing the address twice. When there is
	 * nothing here, the address Google holds becomes the location, and the
	 * preview says so through `creates_location`.
	 *
	 * @param int    $location_id   FoundHint location, 0 for the primary one.
	 * @param string $location_name Google profile to read, when none is
	 *                              mapped yet.
	 * @return array|WP_Error
	 */
	public static function preview( $location_id = 0, $location_name = '' ) {
		$location = $location_id ? LocationRepository::find( $location_id ) : LocationRepository::primary();
		$profile  = self::profile_for( $location, $location_name );

		if ( is_wp_error( $profile ) ) {
			return $profile;
		}

		$theirs = self::read( $profile['location_name'] );

		if ( is_wp_error( $theirs ) ) {
			return $theirs;
		}

		$nap = Nap::resolve( $location ? (int) $location['id'] : 0 );

		return array(
			'location_id'      => $location ? (int) $location['id'] : 0,
			'location_name'    => $profile['location_name'],
			'profile_title'    => $profile['title'],
			// The screen says "this will create your location" rather than
			// letting one appear unannounced.
			'creates_location' => ! $location,
			'fields'           => self::compare( $theirs, $nap ),
			'read_at'          => current_time( 'mysql', true ),
		);
	}

	/**
	 * Which Google profile this import reads.
	 *
	 * A mapped location decides it. Without one, an explicit choice decides
	 * it, and a site with exactly one profile needs no choice at all —
	 * asking somebody to pick from a list of one is a question with no
	 * information in it.
	 *
	 * @param array|null $location      FoundHint location, or null.
	 * @param string     $location_name Google profile asked for.
	 * @return array|WP_Error Stored Google location row.
	 */
	private static function profile_for( $location, $location_name ) {
		if ( $location ) {
			$mapped = GoogleLocationRepository::find_by_fhint_location( (int) $location['id'] );

			if ( $mapped ) {
				return $mapped;
			}
		}

		$location_name = trim( (string) $location_name );

		if ( '' !== $location_name ) {
			$chosen = GoogleLocationRepository::find_by_location_name( $location_name );

			if ( ! $chosen ) {
				return new WP_Error(
					'fhint_import_unknown_profile',
					__( 'That Google profile is not one this site has read. Read your profiles again.', 'found-hint' ),
					array( 'status' => 404 )
				);
			}

			return $chosen;
		}

		$profiles = GoogleLocationRepository::all();

		if ( 1 === count( $profiles ) ) {
			return $profiles[0];
		}

		if ( ! $profiles ) {
			return new WP_Error(
				'fhint_import_no_profiles',
				__( 'Read your Google profiles first, under Business profiles.', 'found-hint' ),
				array( 'status' => 409 )
			);
		}

		return new WP_Error(
			'fhint_import_choose_profile',
			__( 'Choose which Google profile to import from.', 'found-hint' ),
			array( 'status' => 409 )
		);
	}

	/**
	 * Write the chosen fields.
	 *
	 * Google is read again rather than trusting anything the browser sends
	 * back: a preview may be minutes old, and the values written must be the
	 * ones Google holds now, not ones a client could have edited in between.
	 *
	 * @param array $keys        Field keys to import.
	 * @param int   $location_id FoundHint location, 0 for the primary one.
	 * @return array|WP_Error What was written.
	 */
	public static function apply( array $keys, $location_id = 0, $location_name = '' ) {
		$preview = self::preview( $location_id, $location_name );

		if ( is_wp_error( $preview ) ) {
			return $preview;
		}

		$chosen    = array_values( array_intersect( self::FIELDS, array_map( 'strval', $keys ) ) );
		$available = array();

		foreach ( $preview['fields'] as $field ) {
			$available[ $field['key'] ] = $field;
		}

		$business_changes = array();
		$location_changes = array();
		$applied          = array();
		$skipped          = array();
		$created          = false;

		// Nothing here to import into: Google's address becomes the location,
		// which is then mapped to the profile it came from, so a second
		// import updates it rather than making another one.
		if ( ! $preview['location_id'] ) {
			$made = self::create_location( $available, $preview['location_name'], $preview['profile_title'] );

			if ( is_wp_error( $made ) ) {
				return $made;
			}

			$preview['location_id'] = (int) $made['id'];
			$created                = true;
		}

		foreach ( $chosen as $key ) {
			// A field Google does not hold is skipped rather than blanking
			// what is here: an import should never take a value away.
			if ( ! isset( $available[ $key ] ) || ! $available[ $key ]['available'] ) {
				$skipped[] = $key;
				continue;
			}

			$value = $available[ $key ]['theirs_raw'];

			switch ( $key ) {
				case 'name':
					$business_changes['name'] = $value;
					break;
				case 'description':
					$business_changes['description'] = $value;
					break;
				case 'phone':
					$location_changes['phone'] = $value;
					break;
				case 'website':
					$location_changes['website'] = $value;
					break;
				case 'address':
					$location_changes = array_merge( $location_changes, $value );
					break;
				case 'hours':
					$rows = OpeningHours::parse( $value );

					if ( $rows ) {
						OpeningHoursRepository::replace( (int) $preview['location_id'], $rows );
						$applied[] = $key;
						continue 2;
					}

					$skipped[] = $key;
					continue 2;
			}

			$applied[] = $key;
		}

		if ( $business_changes ) {
			$saved = BusinessRepository::save( $business_changes );

			if ( ! $saved ) {
				return new WP_Error(
					'fhint_import_save_failed',
					__( 'The business details could not be saved.', 'found-hint' ),
					array( 'status' => 500 )
				);
			}
		}

		if ( $location_changes ) {
			LocationRepository::update( (int) $preview['location_id'], $location_changes );
		}

		return array(
			'applied'          => $applied,
			'skipped'          => $skipped,
			'location_id'      => (int) $preview['location_id'],
			'created_location' => $created,
			'imported_at'      => current_time( 'mysql', true ),
		);
	}

	/**
	 * Create this site's location from what Google holds.
	 *
	 * @param array  $fields        Compared fields, keyed.
	 * @param string $location_name Google resource name, for the mapping.
	 * @param string $title         Google's title, as a fallback label.
	 * @return array|WP_Error The new location.
	 */
	private static function create_location( array $fields, $location_name, $title ) {
		$business = BusinessRepository::get();

		if ( ! $business ) {
			return new WP_Error(
				'fhint_import_no_business',
				__( 'Add your business name first, so the location has something to belong to.', 'found-hint' ),
				array( 'status' => 409 )
			);
		}

		if ( empty( $fields['address']['available'] ) ) {
			return new WP_Error(
				'fhint_import_no_address',
				__( 'Google holds no address for this profile, so there is nothing to create a location from.', 'found-hint' ),
				array( 'status' => 409 )
			);
		}

		$data = array_merge(
			$fields['address']['theirs_raw'],
			array(
				'business_id' => (int) $business['id'],
				'name'        => (string) $title,
				'is_primary'  => true,
			)
		);

		if ( ! empty( $fields['phone']['available'] ) ) {
			$data['phone'] = $fields['phone']['theirs_raw'];
		}

		if ( ! empty( $fields['website']['available'] ) ) {
			$data['website'] = $fields['website']['theirs_raw'];
		}

		$location = LocationRepository::create( $data );

		if ( ! $location || empty( $location['id'] ) ) {
			return new WP_Error(
				'fhint_import_create_failed',
				__( 'The location could not be created from Google\'s address.', 'found-hint' ),
				array( 'status' => 500 )
			);
		}

		GoogleLocationRepository::map( (string) $location_name, (int) $location['id'] );

		return $location;
	}

	/**
	 * Read one location from Google.
	 *
	 * @param string $location_name Google resource name, e.g. `locations/123`.
	 * @return array|WP_Error Normalised values.
	 */
	private static function read( $location_name ) {
		// The resource name carries its own slash and must reach Google
		// unencoded — it is a path, not a parameter.
		$response = Client::get(
			sprintf( self::LOCATION_URL, (string) $location_name ),
			array( 'readMask' => self::READ_MASK )
		);

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		return self::normalise( $response );
	}

	/**
	 * Google's location, in this plugin's vocabulary.
	 *
	 * @param array $payload Decoded location.
	 * @return array
	 */
	private static function normalise( array $payload ) {
		$address = isset( $payload['storefrontAddress'] ) && is_array( $payload['storefrontAddress'] )
			? $payload['storefrontAddress']
			: array();

		$lines = isset( $address['addressLines'] ) && is_array( $address['addressLines'] ) ? $address['addressLines'] : array();

		return array(
			'name'        => isset( $payload['title'] ) ? (string) $payload['title'] : '',
			'description' => isset( $payload['profile']['description'] ) ? (string) $payload['profile']['description'] : '',
			'phone'       => isset( $payload['phoneNumbers']['primaryPhone'] ) ? (string) $payload['phoneNumbers']['primaryPhone'] : '',
			'website'     => isset( $payload['websiteUri'] ) ? (string) $payload['websiteUri'] : '',
			'address'     => array(
				'address_line_1' => isset( $lines[0] ) ? (string) $lines[0] : '',
				'address_line_2' => isset( $lines[1] ) ? (string) $lines[1] : '',
				'city'           => isset( $address['locality'] ) ? (string) $address['locality'] : '',
				'region'         => isset( $address['administrativeArea'] ) ? (string) $address['administrativeArea'] : '',
				'postal_code'    => isset( $address['postalCode'] ) ? (string) $address['postalCode'] : '',
				'country'        => isset( $address['regionCode'] ) ? (string) $address['regionCode'] : '',
			),
			'hours'       => self::hours( $payload ),
		);
	}

	/**
	 * Opening hours, in the payload shape this plugin parses.
	 *
	 * Google gives periods named by day, with a separate close day so an
	 * overnight shift can be expressed. A period is filed under the day it
	 * opens, which is how this plugin stores one.
	 *
	 * A location Google holds no hours for returns nothing at all, rather
	 * than a week of closed days — **unset is not closed**, and inventing
	 * closures would put a wrong "Closed today" on somebody's website.
	 *
	 * @param array $payload Decoded location.
	 * @return array
	 */
	private static function hours( array $payload ) {
		$periods = isset( $payload['regularHours']['periods'] ) && is_array( $payload['regularHours']['periods'] )
			? $payload['regularHours']['periods']
			: array();

		$by_day = array();

		foreach ( $periods as $period ) {
			if ( ! is_array( $period ) || ! isset( $period['openDay'] ) ) {
				continue;
			}

			$day = strtoupper( (string) $period['openDay'] );

			if ( ! isset( self::DAYS[ $day ] ) ) {
				continue;
			}

			$number = self::DAYS[ $day ];
			$open   = self::clock( isset( $period['openTime'] ) ? $period['openTime'] : array() );
			$close  = self::clock( isset( $period['closeTime'] ) ? $period['closeTime'] : array() );

			// Google writes the end of a day as hour 24, which is not a time
			// anything else accepts — a real profile came back as "opens at
			// midnight, closes at 24:00", and storage dropped the close,
			// leaving every day looking like it never shut.
			if ( '24:00' === $close ) {
				$close = '00:00';
			}

			// Around the clock, in both the shapes Google uses for it:
			// midnight to hour 24 of the same day, and midnight to midnight
			// of the next.
			$is_24h = '00:00' === $open && '00:00' === $close;

			$by_day[ $number ][] = array(
				'day_of_week'  => $number,
				'period_index' => isset( $by_day[ $number ] ) ? count( $by_day[ $number ] ) : 0,
				'open_time'    => $open,
				'close_time'   => $close,
				'is_closed'    => false,
				'is_24h'       => $is_24h,
			);
		}

		if ( ! $by_day ) {
			return array();
		}

		$rows = array();

		// Google publishes hours for this place, so a day it does not list is
		// a closed day rather than an unknown one.
		foreach ( DayOfWeek::all() as $day ) {
			if ( isset( $by_day[ $day ] ) ) {
				$rows = array_merge( $rows, $by_day[ $day ] );
				continue;
			}

			$rows[] = array(
				'day_of_week'  => $day,
				'period_index' => 0,
				'open_time'    => '',
				'close_time'   => '',
				'is_closed'    => true,
				'is_24h'       => false,
			);
		}

		return array( 'periods' => $rows );
	}

	/**
	 * A Google time as HH:MM.
	 *
	 * Google omits `hours` and `minutes` when they are zero, so a missing
	 * value is midnight rather than an error.
	 *
	 * @param array $time `{hours, minutes}`.
	 * @return string
	 */
	private static function clock( $time ) {
		if ( ! is_array( $time ) ) {
			return '00:00';
		}

		return sprintf(
			'%02d:%02d',
			isset( $time['hours'] ) ? (int) $time['hours'] : 0,
			isset( $time['minutes'] ) ? (int) $time['minutes'] : 0
		);
	}

	/**
	 * Both sides, field by field.
	 *
	 * @param array $theirs Normalised Google values.
	 * @param array $nap    Resolved FoundHint values.
	 * @return array[]
	 */
	private static function compare( array $theirs, array $nap ) {
		$fields = array();

		foreach ( self::FIELDS as $key ) {
			$fields[] = self::field( $key, $theirs, $nap );
		}

		return $fields;
	}

	/**
	 * One compared field.
	 *
	 * `theirs_raw` is what would be written; `theirs` and `ours` are for
	 * reading on screen.
	 *
	 * @param string $key    Field key.
	 * @param array  $theirs Normalised Google values.
	 * @param array  $nap    Resolved FoundHint values.
	 * @return array
	 */
	private static function field( $key, array $theirs, array $nap ) {
		if ( 'address' === $key ) {
			$their_address = $theirs['address'];
			$available     = '' !== trim( $their_address['address_line_1'] . $their_address['city'] . $their_address['postal_code'] );

			$their_text = trim(
				implode(
					', ',
					array_filter(
						array(
							$their_address['address_line_1'],
							$their_address['address_line_2'],
							$their_address['city'],
							$their_address['region'],
							$their_address['postal_code'],
							$their_address['country'],
						)
					)
				)
			);

			$our_text = isset( $nap['address']['formatted'] ) ? (string) $nap['address']['formatted'] : '';

			return self::describe( $key, $our_text, $their_text, $their_address, $available );
		}

		if ( 'hours' === $key ) {
			$available  = ! empty( $theirs['hours'] );
			$their_text = $available ? self::hours_summary( $theirs['hours'] ) : '';
			$our_text   = ! empty( $nap['hours']['has_any_hours'] )
				? __( 'Set for this location', 'found-hint' )
				: '';

			return self::describe( $key, $our_text, $their_text, $theirs['hours'], $available );
		}

		$their_value = isset( $theirs[ $key ] ) ? (string) $theirs[ $key ] : '';
		$our_value   = isset( $nap[ $key ] ) ? (string) $nap[ $key ] : '';

		$available = '' !== trim( $their_value );

		return self::describe( $key, $our_value, $their_value, $their_value, $available );
	}

	/**
	 * Assemble a field, including whether to suggest it.
	 *
	 * @param string $key        Field key.
	 * @param string $ours       Our value, for reading.
	 * @param string $theirs     Google's value, for reading.
	 * @param mixed  $theirs_raw Google's value, for writing.
	 * @param bool   $available  Whether Google holds anything.
	 * @return array
	 */
	private static function describe( $key, $ours, $theirs, $theirs_raw, $available ) {
		$empty_here = '' === trim( (string) $ours );
		$differs    = ! $empty_here && trim( (string) $ours ) !== trim( (string) $theirs );

		return array(
			'key'        => $key,
			'ours'       => (string) $ours,
			'theirs'     => (string) $theirs,
			'theirs_raw' => $theirs_raw,
			'available'  => (bool) $available,
			'empty_here' => $empty_here,
			'differs'    => $differs,
			// Empty here and Google has it: nothing to lose, so it is ticked.
			// Anything already filled in is the operator's call.
			'suggested'  => (bool) $available && $empty_here,
		);
	}

	/**
	 * Opening hours as one readable line.
	 *
	 * @param array $hours Payload-shaped hours.
	 * @return string
	 */
	private static function hours_summary( array $hours ) {
		$periods = isset( $hours['periods'] ) ? $hours['periods'] : array();
		$open    = 0;
		$closed  = 0;

		foreach ( $periods as $period ) {
			if ( ! empty( $period['is_closed'] ) ) {
				$closed++;
				continue;
			}

			$open++;
		}

		return sprintf(
			/* translators: 1: number of days with opening times, 2: number of closed days. */
			__( '%1$d days with hours, %2$d closed', 'found-hint' ),
			$open,
			$closed
		);
	}
}
