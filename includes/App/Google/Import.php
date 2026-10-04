<?php
/**
 * Bringing a Google Business Profile into FoundHint.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google;

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Location\LocationRepository;
use FHINT\App\Location\OpeningHours;
use FHINT\App\Location\OpeningHoursRepository;
use FHINT\App\Nap\Nap;
use FHINT\App\Service\ServiceRepository;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Reads one Google profile and offers it, field by field.
 *
 * **Nothing is written without being chosen.** `preview()` reads Google and
 * returns both sides; `apply()` writes only the fields it is handed. An
 * import that silently replaced a phone number somebody had corrected here
 * would be worse than no import at all.
 *
 * Which fields are *suggested* follows one rule: **empty here wins, filled
 * here is left alone.** A blank field has nothing to lose; a field that
 * already differs is the operator's decision, because FoundHint cannot know
 * which of the two is out of date.
 *
 * **A site with nothing in it is the ordinary first run**, not an error:
 * with no business and no location, Google's profile becomes both. Each
 * Google profile keeps its own FoundHint location, so a business with
 * several branches imports them one after another instead of overwriting
 * itself.
 */
class Import {

	/** One location, read fresh. */
	const LOCATION_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1/%s';

	/** Social links are attributes, not fields, so they cost a second call. */
	const ATTRIBUTES_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1/%s/attributes';

	/**
	 * Fields to ask Google for.
	 *
	 * `readMask` is required by the Business Information API, and asking for
	 * less than is imported would leave fields silently blank.
	 */
	const READ_MASK = 'title,storefrontAddress,phoneNumbers,websiteUri,regularHours,profile,latlng,categories,serviceItems';

	/** What can be imported, in the order the screen lists it. */
	const FIELDS = array(
		'name',
		'description',
		'business_type',
		'phone',
		'website',
		'social',
		'address',
		'coordinates',
		'hours',
		'services',
	);

	/** Fields belonging to the business rather than to one of its locations. */
	const BUSINESS_FIELDS = array( 'name', 'description', 'business_type', 'phone', 'website', 'social' );

	/** Fields that are the location's own. */
	const LOCATION_FIELDS = array( 'address', 'coordinates', 'hours' );

	/**
	 * Read Google and show both sides.
	 *
	 * @param string $location_name Google profile to read. Empty uses the one
	 *                              already mapped, or the only one there is.
	 * @return array|WP_Error
	 */
	public static function preview( $location_name = '' ) {
		$profile = self::profile( $location_name );

		if ( is_wp_error( $profile ) ) {
			return $profile;
		}

		$theirs = self::read( $profile['location_name'] );

		if ( is_wp_error( $theirs ) ) {
			return $theirs;
		}

		$location = self::location_for( $profile );
		$business = BusinessRepository::get();
		$nap      = Nap::resolve( $location ? (int) $location['id'] : 0 );

		return array(
			'location_name'    => $profile['location_name'],
			'profile_title'    => $profile['title'],
			'location_id'      => $location ? (int) $location['id'] : 0,
			// Said plainly on the screen, so nothing appears unannounced.
			'creates_business' => ! $business,
			'creates_location' => ! $location,
			'fields'           => self::compare( $theirs, $nap ),
			'read_at'          => current_time( 'mysql', true ),
		);
	}

	/**
	 * Write the chosen fields.
	 *
	 * Google is read again rather than trusting what the browser sends back:
	 * a preview may be minutes old, and what is written should be what
	 * Google holds now, not something a client could have edited in between.
	 *
	 * @param array  $keys          Field keys to import.
	 * @param string $location_name Google profile to import from.
	 * @return array|WP_Error What was written.
	 */
	public static function apply( array $keys, $location_name = '' ) {
		$preview = self::preview( $location_name );

		if ( is_wp_error( $preview ) ) {
			return $preview;
		}

		$fields = array();

		foreach ( $preview['fields'] as $field ) {
			$fields[ $field['key'] ] = $field;
		}

		$chosen  = array_values( array_intersect( self::FIELDS, array_map( 'strval', $keys ) ) );
		$skipped = array();

		foreach ( $chosen as $key ) {
			// A field Google does not hold is skipped rather than blanking
			// what is here: an import should never take a value away.
			if ( empty( $fields[ $key ]['available'] ) ) {
				$skipped[] = $key;
			}
		}

		$chosen   = array_values( array_diff( $chosen, $skipped ) );
		$business = self::ensure_business( $fields );

		if ( is_wp_error( $business ) ) {
			return $business;
		}

		$location = self::ensure_location( $preview, $fields );

		if ( is_wp_error( $location ) ) {
			return $location;
		}

		$applied = array_merge(
			self::write_business( $fields, $chosen, (bool) $location['is_primary'] ),
			self::write_location( $fields, $chosen, (int) $location['id'] ),
			self::write_services( $fields, $chosen )
		);

		return array(
			'applied'          => array_values( array_intersect( self::FIELDS, $applied ) ),
			'skipped'          => $skipped,
			'location_id'      => (int) $location['id'],
			'created_business' => (bool) $preview['creates_business'],
			'created_location' => (bool) $preview['creates_location'],
			'imported_at'      => current_time( 'mysql', true ),
		);
	}

	/**
	 * Which Google profile this import reads.
	 *
	 * A profile already mapped to a location decides it; otherwise an
	 * explicit choice does. A site with exactly one profile needs no choice
	 * at all — asking somebody to pick from a list of one is a question with
	 * no information in it.
	 *
	 * @param string $location_name Google profile asked for.
	 * @return array|WP_Error Stored Google location row.
	 */
	private static function profile( $location_name ) {
		$location_name = trim( (string) $location_name );

		if ( '' !== $location_name ) {
			$chosen = GoogleLocationRepository::find_by_location_name( $location_name );

			if ( ! $chosen ) {
				return new WP_Error(
					'fhint_import_unknown_profile',
					__( 'That Google profile is not one this site has read. Read your profiles again.', 'foundhint-local-seo' ),
					array( 'status' => 404 )
				);
			}

			return $chosen;
		}

		$profiles = GoogleLocationRepository::all();

		if ( ! $profiles ) {
			return new WP_Error(
				'fhint_import_no_profiles',
				__( 'Read your Google profiles first, under Business profiles.', 'foundhint-local-seo' ),
				array( 'status' => 409 )
			);
		}

		if ( 1 === count( $profiles ) ) {
			return $profiles[0];
		}

		foreach ( $profiles as $profile ) {
			if ( (int) $profile['fhint_location_id'] > 0 ) {
				return $profile;
			}
		}

		return new WP_Error(
			'fhint_import_choose_profile',
			__( 'Choose which Google profile to import from.', 'foundhint-local-seo' ),
			array( 'status' => 409 )
		);
	}

	/**
	 * The FoundHint location this profile belongs to, if there is one.
	 *
	 * A profile keeps its own location, so a second profile imports into a
	 * second location rather than overwriting the first.
	 *
	 * @param array $profile Stored Google location row.
	 * @return array|null
	 */
	private static function location_for( array $profile ) {
		if ( (int) $profile['fhint_location_id'] > 0 ) {
			$location = LocationRepository::find( (int) $profile['fhint_location_id'] );

			if ( $location ) {
				return $location;
			}
		}

		// Nothing mapped yet: a site with one location and no other profile
		// claiming it means this profile is that location.
		$locations = LocationRepository::all();

		if ( 1 === count( $locations ) && ! GoogleLocationRepository::find_by_fhint_location( (int) $locations[0]['id'] ) ) {
			return $locations[0];
		}

		return null;
	}

	/**
	 * Create the business when the site has none.
	 *
	 * @param array $fields Compared fields, keyed.
	 * @return array|WP_Error The business.
	 */
	private static function ensure_business( array $fields ) {
		$business = BusinessRepository::get();

		if ( $business ) {
			return $business;
		}

		// A business needs a name, and Google's title is the only candidate.
		if ( empty( $fields['name']['available'] ) ) {
			return new WP_Error(
				'fhint_import_no_name',
				__( 'Google holds no business name for this profile, so there is nothing to create a business from.', 'foundhint-local-seo' ),
				array( 'status' => 409 )
			);
		}

		$created = BusinessRepository::save( array( 'name' => $fields['name']['theirs_raw'] ) );

		if ( ! $created ) {
			return new WP_Error(
				'fhint_import_business_failed',
				__( 'The business could not be created.', 'foundhint-local-seo' ),
				array( 'status' => 500 )
			);
		}

		return $created;
	}

	/**
	 * Find or create the location this profile imports into.
	 *
	 * @param array $preview The preview this apply is working from.
	 * @param array $fields  Compared fields, keyed.
	 * @return array|WP_Error The location.
	 */
	private static function ensure_location( array $preview, array $fields ) {
		if ( $preview['location_id'] ) {
			$location = LocationRepository::find( (int) $preview['location_id'] );

			if ( $location ) {
				GoogleLocationRepository::map( $preview['location_name'], (int) $location['id'] );

				return $location;
			}
		}

		if ( empty( $fields['address']['available'] ) ) {
			return new WP_Error(
				'fhint_import_no_address',
				__( 'Google holds no address for this profile, so there is nothing to create a location from.', 'foundhint-local-seo' ),
				array( 'status' => 409 )
			);
		}

		$business = BusinessRepository::get();

		$data = array_merge(
			$fields['address']['theirs_raw'],
			array(
				'business_id' => (int) $business['id'],
				'name'        => $preview['profile_title'],
				// The first location is the primary one; later imports are
				// branches of the same business.
				'is_primary'  => ! LocationRepository::all(),
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
				__( 'The location could not be created from Google\'s address.', 'foundhint-local-seo' ),
				array( 'status' => 500 )
			);
		}

		// Mapped straight away, so a second import updates this location
		// rather than making another one.
		GoogleLocationRepository::map( $preview['location_name'], (int) $location['id'] );

		return $location;
	}

	/**
	 * Write the fields the business owns.
	 *
	 * @param array $fields     Compared fields, keyed.
	 * @param array $chosen     Field keys being imported.
	 * @param bool  $is_primary Whether this profile is the primary location.
	 * @return array Keys written.
	 */
	private static function write_business( array $fields, array $chosen, $is_primary = true ) {
		$changes = array();
		$written = array();

		foreach ( array_intersect( self::BUSINESS_FIELDS, $chosen ) as $key ) {
			// A branch's phone and website are its own. Writing them to the
			// business as well would make the second shop's number answer
			// for the first.
			if ( ! $is_primary && in_array( $key, array( 'phone', 'website' ), true ) ) {
				continue;
			}

			$value = $fields[ $key ]['theirs_raw'];

			if ( 'social' === $key ) {
				$business = BusinessRepository::get();
				$current  = $business && is_array( $business['social_profiles'] ) ? $business['social_profiles'] : array();

				// Merged, not replaced: a network the operator filled in here
				// that Google does not know about is still theirs.
				$changes['social_profiles'] = array_merge( $current, $value );
				$written[]                  = $key;
				continue;
			}

			$changes[ $key ] = $value;
			$written[]       = $key;
		}

		if ( $changes ) {
			BusinessRepository::save( $changes );
		}

		return $written;
	}

	/**
	 * Write the fields a location owns.
	 *
	 * Phone and website are written in both places: the business is where
	 * they are read from by default, and the location keeps its own copy so
	 * a second branch can differ from the first.
	 *
	 * @param array $fields      Compared fields, keyed.
	 * @param array $chosen      Field keys being imported.
	 * @param int   $location_id Location to write to.
	 * @return array Keys written.
	 */
	private static function write_location( array $fields, array $chosen, $location_id ) {
		$changes = array();
		$written = array();

		if ( in_array( 'address', $chosen, true ) ) {
			$changes   = array_merge( $changes, $fields['address']['theirs_raw'] );
			$written[] = 'address';
		}

		if ( in_array( 'coordinates', $chosen, true ) ) {
			$changes['latitude']  = $fields['coordinates']['theirs_raw']['latitude'];
			$changes['longitude'] = $fields['coordinates']['theirs_raw']['longitude'];
			$written[]            = 'coordinates';
		}

		foreach ( array( 'phone', 'website' ) as $key ) {
			if ( in_array( $key, $chosen, true ) ) {
				$changes[ $key ] = $fields[ $key ]['theirs_raw'];
			}
		}

		if ( $changes ) {
			LocationRepository::update( $location_id, $changes );
		}

		if ( in_array( 'hours', $chosen, true ) ) {
			$rows = OpeningHours::parse( $fields['hours']['theirs_raw'] );

			if ( $rows ) {
				OpeningHoursRepository::replace( $location_id, $rows );
				$written[] = 'hours';
			}
		}

		return $written;
	}

	/**
	 * Add services this site does not have yet.
	 *
	 * Matched by name rather than replaced wholesale: an operator may have
	 * written their own description or price, and re-importing should not
	 * throw that away.
	 *
	 * @param array $fields Compared fields, keyed.
	 * @param array $chosen Field keys being imported.
	 * @return array Keys written.
	 */
	private static function write_services( array $fields, array $chosen ) {
		if ( ! in_array( 'services', $chosen, true ) ) {
			return array();
		}

		$existing = array();

		foreach ( ServiceRepository::all() as $service ) {
			$existing[ strtolower( trim( $service['name'] ) ) ] = true;
		}

		$added = 0;

		foreach ( $fields['services']['theirs_raw'] as $service ) {
			if ( isset( $existing[ strtolower( trim( $service['name'] ) ) ] ) ) {
				continue;
			}

			$created = ServiceRepository::create(
				array(
					'name'        => $service['name'],
					'description' => $service['description'],
					'price'       => $service['price'],
					'currency'    => $service['currency'],
				)
			);

			if ( $created ) {
				$added++;
			}
		}

		return $added ? array( 'services' ) : array();
	}

	/**
	 * Read one location from Google, with its attributes.
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

		// Social links live here and nowhere else. A profile with none, or a
		// refusal on this one call, must not fail the whole import —
		// everything else is still worth having.
		$attributes = Client::get( sprintf( self::ATTRIBUTES_URL, (string) $location_name ) );

		return ImportMapper::from_google( $response, is_wp_error( $attributes ) ? array() : $attributes );
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
	 * `theirs_raw` is what would be written; `ours` and `theirs` are for
	 * reading on screen.
	 *
	 * @param string $key    Field key.
	 * @param array  $theirs Normalised Google values.
	 * @param array  $nap    Resolved FoundHint values.
	 * @return array
	 */
	private static function field( $key, array $theirs, array $nap ) {
		switch ( $key ) {
			case 'address':
				$their_address = $theirs['address'];
				$available     = '' !== trim( $their_address['address_line_1'] . $their_address['city'] . $their_address['postal_code'] );
				$their_text    = implode( ', ', array_filter( array_values( $their_address ) ) );
				$our_text      = isset( $nap['address']['formatted'] ) ? (string) $nap['address']['formatted'] : '';
				$differs       = self::address_key( $their_address ) !== self::address_key(
					array(
						'address_line_1' => isset( $nap['address']['line_1'] ) ? $nap['address']['line_1'] : '',
						'city'           => isset( $nap['address']['city'] ) ? $nap['address']['city'] : '',
						'postal_code'    => isset( $nap['address']['postal'] ) ? $nap['address']['postal'] : '',
					)
				);

				return self::describe( $key, $our_text, $their_text, $their_address, $available, $differs );

			case 'coordinates':
				$available  = (bool) $theirs['coordinates']['has_both'];
				$their_text = $available
					? $theirs['coordinates']['latitude'] . ', ' . $theirs['coordinates']['longitude']
					: '';
				$our_text   = ! empty( $nap['coordinates']['has_both'] )
					? $nap['coordinates']['latitude'] . ', ' . $nap['coordinates']['longitude']
					: '';

				return self::describe( $key, $our_text, $their_text, $theirs['coordinates'], $available );

			case 'hours':
				$available  = ! empty( $theirs['hours'] );
				$their_text = $available ? self::hours_summary( $theirs['hours'] ) : '';
				$our_text   = ! empty( $nap['hours']['period_count'] ) ? __( 'Already set', 'foundhint-local-seo' ) : '';
				$differs    = $available && self::hours_signature( $theirs['hours'] ) !== self::stored_hours_signature( $nap );

				return self::describe( $key, $our_text, $their_text, $theirs['hours'], $available, $differs );

			case 'social':
				$available  = ! empty( $theirs['social'] );
				$their_text = $available ? implode( ', ', array_keys( $theirs['social'] ) ) : '';
				$ours       = isset( $nap['social_profiles'] ) && is_array( $nap['social_profiles'] ) ? $nap['social_profiles'] : array();
				$our_text   = $ours ? implode( ', ', array_keys( $ours ) ) : '';
				$differs    = false;

				foreach ( $theirs['social'] as $network => $url ) {
					if ( ! isset( $ours[ $network ] ) || $ours[ $network ] !== $url ) {
						$differs = true;
					}
				}

				return self::describe( $key, $our_text, $their_text, $theirs['social'], $available, $differs );

			case 'services':
				$available = ! empty( $theirs['services'] );
				$names     = array();

				foreach ( $theirs['services'] as $service ) {
					$names[] = $service['name'];
				}

				$their_text = $available
					? sprintf(
						/* translators: 1: number of services Google lists, 2: the first few names. */
						__( '%1$d from Google: %2$s', 'foundhint-local-seo' ),
						count( $names ),
						implode( ', ', array_slice( $names, 0, 3 ) ) . ( count( $names ) > 3 ? '…' : '' )
					)
					: '';

				$count    = ServiceRepository::count();
				$our_text = $count
					? sprintf(
						/* translators: %d: how many services this site already has. */
						_n( '%d service', '%d services', $count, 'foundhint-local-seo' ),
						$count
					)
					: '';

				$have = array();

				foreach ( ServiceRepository::all() as $service ) {
					$have[ strtolower( trim( $service['name'] ) ) ] = true;
				}

				$missing = 0;

				foreach ( $names as $service_name ) {
					if ( ! isset( $have[ strtolower( trim( $service_name ) ) ] ) ) {
						$missing++;
					}
				}

				return self::describe( $key, $our_text, $their_text, $theirs['services'], $available, $missing > 0 );

			case 'business_type':
				$available  = '' !== $theirs['business_type'];
				$their_text = $available
					? sprintf(
						/* translators: 1: Google's category name, 2: the schema.org type it maps to. */
						__( '%1$s → %2$s', 'foundhint-local-seo' ),
						$theirs['category'],
						$theirs['business_type']
					)
					: '';
				$our_text   = isset( $nap['business_type'] ) ? (string) $nap['business_type'] : '';
				// Compared as types, not as the label: the screen shows
				// "Pet store → PetStore", and that arrow is not a difference.
				$differs    = $available && $our_text !== $theirs['business_type'];

				return self::describe( $key, $our_text, $their_text, $theirs['business_type'], $available, $differs );
		}

		$their_value = isset( $theirs[ $key ] ) ? (string) $theirs[ $key ] : '';
		$our_value   = isset( $nap[ $key ] ) ? (string) $nap[ $key ] : '';
		$available   = '' !== trim( $their_value );

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
	private static function describe( $key, $ours, $theirs, $theirs_raw, $available, $differs = null ) {
		$empty_here = '' === trim( (string) $ours );

		// Text fields compare as text. Everything else — hours, services,
		// social links — is summarised on screen, and two summaries saying
		// different words is not a difference, so those pass their own
		// answer in rather than being guessed at from the labels.
		if ( null === $differs ) {
			$differs = ! $empty_here && trim( (string) $ours ) !== trim( (string) $theirs );
		}

		$differs = ! $empty_here && (bool) $differs;

		// Said out loud because it decides what a tick costs: a business
		// field is shared by every location, so importing a branch's name
		// would rename the whole business.
		if ( in_array( $key, self::BUSINESS_FIELDS, true ) ) {
			$scope = 'business';
		} elseif ( 'services' === $key ) {
			$scope = 'services';
		} else {
			$scope = 'location';
		}

		return array(
			'key'        => $key,
			'scope'      => $scope,
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
	 * A street, town and postcode, reduced to something comparable.
	 *
	 * Formatting, punctuation and case differ between any two sources; a
	 * different doorway does not.
	 *
	 * @param array $address Address parts.
	 * @return string
	 */
	private static function address_key( array $address ) {
		$parts = array(
			isset( $address['address_line_1'] ) ? $address['address_line_1'] : '',
			isset( $address['city'] ) ? $address['city'] : '',
			isset( $address['postal_code'] ) ? $address['postal_code'] : '',
		);

		$key = strtolower( preg_replace( '/[^\p{L}\p{N}]+/u', '', implode( '', $parts ) ) );

		return (string) $key;
	}

	/**
	 * Google's week, as one comparable string.
	 *
	 * @param array $hours Payload-shaped hours.
	 * @return string
	 */
	private static function hours_signature( array $hours ) {
		$periods = isset( $hours['periods'] ) ? $hours['periods'] : array();
		$parts   = array();

		foreach ( $periods as $period ) {
			$parts[] = self::period_signature( $period );
		}

		sort( $parts );

		return implode( '|', $parts );
	}

	/**
	 * This site's week, as the same comparable string.
	 *
	 * @param array $nap Resolved FoundHint values.
	 * @return string
	 */
	private static function stored_hours_signature( array $nap ) {
		$days  = isset( $nap['hours']['days'] ) && is_array( $nap['hours']['days'] ) ? $nap['hours']['days'] : array();
		$parts = array();

		foreach ( $days as $day ) {
			if ( empty( $day['configured'] ) ) {
				continue;
			}

			foreach ( $day['periods'] as $period ) {
				$period['day_of_week'] = $day['day_of_week'];
				$parts[]               = self::period_signature( $period );
			}
		}

		sort( $parts );

		return implode( '|', $parts );
	}

	/**
	 * One period, as text that can be compared across both shapes.
	 *
	 * @param array $period Period row.
	 * @return string
	 */
	private static function period_signature( array $period ) {
		$day = isset( $period['day_of_week'] ) ? (int) $period['day_of_week'] : 0;

		if ( ! empty( $period['is_closed'] ) ) {
			return $day . ':closed';
		}

		if ( ! empty( $period['is_24h'] ) ) {
			return $day . ':24h';
		}

		return $day . ':' . substr( (string) $period['open_time'], 0, 5 ) . '-' . substr( (string) $period['close_time'], 0, 5 );
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
			__( '%1$d days with hours, %2$d closed', 'foundhint-local-seo' ),
			$open,
			$closed
		);
	}
}
