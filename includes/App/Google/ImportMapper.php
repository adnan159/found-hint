<?php
/**
 * Google's location, in this plugin's vocabulary.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google;

use FHINT\App\Business\Business;
use FHINT\App\Location\DayOfWeek;

defined( 'ABSPATH' ) || exit;

/**
 * Turns one Google Business Profile into FoundHint's own shapes.
 *
 * Separate from `Import` because this half is pure translation — no reading,
 * no writing, no deciding — and it is where every awkward detail of Google's
 * format lives: hour 24 for midnight, service names held one place and
 * referenced from another, social links that are not fields at all but
 * attributes.
 */
class ImportMapper {

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

	/**
	 * Google's social attributes, in the networks this plugin stores.
	 *
	 * Social links are not location fields: Google keeps them as attributes,
	 * which is why importing them costs a second request.
	 */
	const SOCIAL = array(
		'url_facebook'  => 'facebook',
		'url_instagram' => 'instagram',
		'url_twitter'   => 'x',
		'url_x'         => 'x',
		'url_linkedin'  => 'linkedin',
		'url_youtube'   => 'youtube',
		'url_tiktok'    => 'tiktok',
		'url_pinterest' => 'pinterest',
		'url_yelp'      => 'yelp',
	);

	/**
	 * Everything FoundHint can take from a profile.
	 *
	 * @param array $payload    Decoded location.
	 * @param array $attributes Decoded attributes response.
	 * @return array
	 */
	public static function from_google( array $payload, array $attributes = array() ) {
		return array(
			'name'          => self::text( $payload, 'title' ),
			'description'   => isset( $payload['profile']['description'] ) ? (string) $payload['profile']['description'] : '',
			'phone'         => isset( $payload['phoneNumbers']['primaryPhone'] ) ? (string) $payload['phoneNumbers']['primaryPhone'] : '',
			'website'       => isset( $payload['websiteUri'] ) ? (string) $payload['websiteUri'] : '',
			'business_type' => self::business_type( $payload ),
			'category'      => self::category_name( $payload ),
			'social'        => self::social( $attributes ),
			'address'       => self::address( $payload ),
			'coordinates'   => self::coordinates( $payload ),
			'hours'         => self::hours( $payload ),
			'services'      => self::services( $payload ),
		);
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
	 * The address, in this plugin's columns.
	 *
	 * @param array $payload Decoded location.
	 * @return array
	 */
	private static function address( array $payload ) {
		$address = isset( $payload['storefrontAddress'] ) && is_array( $payload['storefrontAddress'] )
			? $payload['storefrontAddress']
			: array();

		$lines = isset( $address['addressLines'] ) && is_array( $address['addressLines'] ) ? $address['addressLines'] : array();

		return array(
			'address_line_1' => isset( $lines[0] ) ? trim( (string) $lines[0] ) : '',
			'address_line_2' => isset( $lines[1] ) ? trim( (string) $lines[1] ) : '',
			'city'           => isset( $address['locality'] ) ? (string) $address['locality'] : '',
			'region'         => isset( $address['administrativeArea'] ) ? (string) $address['administrativeArea'] : '',
			'postal_code'    => isset( $address['postalCode'] ) ? (string) $address['postalCode'] : '',
			'country'        => isset( $address['regionCode'] ) ? (string) $address['regionCode'] : '',
		);
	}

	/**
	 * Coordinates, when Google publishes them.
	 *
	 * Google withholds these for some profiles — an unverified one, or a
	 * business with no storefront — so their absence is ordinary.
	 *
	 * @param array $payload Decoded location.
	 * @return array
	 */
	private static function coordinates( array $payload ) {
		$lat = isset( $payload['latlng']['latitude'] ) ? (float) $payload['latlng']['latitude'] : null;
		$lng = isset( $payload['latlng']['longitude'] ) ? (float) $payload['latlng']['longitude'] : null;

		return array(
			'latitude'  => $lat,
			'longitude' => $lng,
			'has_both'  => null !== $lat && null !== $lng,
		);
	}

	/**
	 * Google's category name, as the operator sees it on Google.
	 *
	 * @param array $payload Decoded location.
	 * @return string
	 */
	private static function category_name( array $payload ) {
		return isset( $payload['categories']['primaryCategory']['displayName'] )
			? (string) $payload['categories']['primaryCategory']['displayName']
			: '';
	}

	/**
	 * Google's category as a schema.org type.
	 *
	 * Google has thousands of categories and schema.org has dozens, so this
	 * is a mapping of the common ones with a safe fallback: `LocalBusiness`
	 * is correct for any business, just less specific. A wrong *specific*
	 * type would be worse than a general one, which is why nothing is
	 * guessed from a partial word match alone.
	 *
	 * @param array $payload Decoded location.
	 * @return string A type from `Business::types()`, or ''.
	 */
	private static function business_type( array $payload ) {
		$name = strtolower( self::category_name( $payload ) );

		if ( '' === $name ) {
			return '';
		}

		$map = array(
			'pet store'            => 'PetStore',
			'veterinarian'         => 'Veterinarian',
			'veterinary care'      => 'Veterinarian',
			'restaurant'           => 'Restaurant',
			'cafe'                 => 'CafeOrCoffeeShop',
			'coffee shop'          => 'CafeOrCoffeeShop',
			'bakery'               => 'Bakery',
			'bar'                  => 'BarOrPub',
			'pub'                  => 'BarOrPub',
			'hotel'                => 'Hotel',
			'dentist'              => 'Dentist',
			'doctor'               => 'Physician',
			'medical clinic'       => 'MedicalClinic',
			'hospital'             => 'Hospital',
			'pharmacy'             => 'Pharmacy',
			'hair salon'           => 'HairSalon',
			'beauty salon'         => 'BeautySalon',
			'spa'                  => 'DaySpa',
			'gym'                  => 'ExerciseGym',
			'electrician'          => 'Electrician',
			'plumber'              => 'Plumber',
			'locksmith'            => 'Locksmith',
			'florist'              => 'Florist',
			'grocery store'        => 'GroceryStore',
			'supermarket'          => 'GroceryStore',
			'clothing store'       => 'ClothingStore',
			'hardware store'       => 'HardwareStore',
			'furniture store'      => 'FurnitureStore',
			'electronics store'    => 'ElectronicsStore',
			'jewelry store'        => 'JewelryStore',
			'jewellery store'      => 'JewelryStore',
			'shoe store'           => 'ShoeStore',
			'book store'           => 'BookStore',
			'bookstore'            => 'BookStore',
			'sporting goods store' => 'SportingGoodsStore',
			'law firm'             => 'Attorney',
			'lawyer'               => 'Attorney',
			'accountant'           => 'AccountingService',
			'insurance agency'     => 'InsuranceAgency',
			'real estate agency'   => 'RealEstateAgent',
			'travel agency'        => 'TravelAgency',
			'school'               => 'School',
			'child care agency'    => 'ChildCare',
			'auto repair shop'     => 'AutoRepair',
			'car repair'           => 'AutoRepair',
			'car dealer'           => 'AutoDealer',
			'gas station'          => 'GasStation',
			'moving company'       => 'MovingCompany',
			'painter'              => 'HousePainter',
			'roofing contractor'   => 'RoofingContractor',
			'general contractor'   => 'GeneralContractor',
			'hvac contractor'      => 'HVACBusiness',
			'software company'     => 'ProfessionalService',
			'marketing agency'     => 'ProfessionalService',
			'consultant'           => 'ProfessionalService',
			'store'                => 'Store',
		);

		/**
		 * Filters the Google category to schema.org type mapping.
		 *
		 * @param array  $map  Lowercased Google category name => schema type.
		 * @param string $name The category being mapped.
		 */
		$map = (array) apply_filters( 'fhint_google_category_map', $map, $name );

		if ( isset( $map[ $name ] ) ) {
			$type = (string) $map[ $name ];

			return in_array( $type, Business::types(), true ) ? $type : 'LocalBusiness';
		}

		// "Pet supply store", "Italian restaurant": Google's names are a
		// qualifier plus one of these words, so the ending is the reliable
		// part. Only whole words at the end, never a loose substring.
		foreach ( array( 'store' => 'Store', 'restaurant' => 'Restaurant', 'salon' => 'BeautySalon', 'clinic' => 'MedicalClinic', 'agency' => 'ProfessionalService' ) as $suffix => $type ) {
			if ( substr( $name, -strlen( $suffix ) ) === $suffix ) {
				return $type;
			}
		}

		return 'LocalBusiness';
	}

	/**
	 * Social profiles, read from Google's attributes.
	 *
	 * @param array $attributes Decoded attributes response.
	 * @return array<string, string> Network => URL.
	 */
	private static function social( array $attributes ) {
		$items  = isset( $attributes['attributes'] ) && is_array( $attributes['attributes'] ) ? $attributes['attributes'] : array();
		$social = array();

		foreach ( $items as $attribute ) {
			if ( ! is_array( $attribute ) || empty( $attribute['name'] ) ) {
				continue;
			}

			// `attributes/url_facebook` → `url_facebook`.
			$key = substr( (string) $attribute['name'], strrpos( (string) $attribute['name'], '/' ) + 1 );

			if ( ! isset( self::SOCIAL[ $key ] ) || empty( $attribute['uriValues'] ) ) {
				continue;
			}

			$first = reset( $attribute['uriValues'] );
			$uri   = is_array( $first ) && isset( $first['uri'] ) ? (string) $first['uri'] : '';

			if ( '' !== $uri ) {
				$social[ self::SOCIAL[ $key ] ] = $uri;
			}
		}

		return $social;
	}

	/**
	 * Services, as this plugin stores them.
	 *
	 * Google holds a service twice over: the item on the location says only
	 * `serviceTypeId`, and the human name for that id lives on the category.
	 * Joining them is the whole job — without it an import produces a list
	 * of identifiers like `job_type_id:it_consulting`.
	 *
	 * @param array $payload Decoded location.
	 * @return array[] Each with name, description, price and currency.
	 */
	private static function services( array $payload ) {
		$items = isset( $payload['serviceItems'] ) && is_array( $payload['serviceItems'] ) ? $payload['serviceItems'] : array();
		$names = self::service_type_names( $payload );
		$out   = array();

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$name        = '';
			$description = '';

			if ( isset( $item['structuredServiceItem']['serviceTypeId'] ) ) {
				$id   = (string) $item['structuredServiceItem']['serviceTypeId'];
				$name = isset( $names[ $id ] ) ? $names[ $id ] : '';

				if ( isset( $item['structuredServiceItem']['description'] ) ) {
					$description = (string) $item['structuredServiceItem']['description'];
				}
			}

			if ( isset( $item['freeFormServiceItem']['label'] ) && is_array( $item['freeFormServiceItem']['label'] ) ) {
				$label       = $item['freeFormServiceItem']['label'];
				$name        = isset( $label['displayName'] ) ? (string) $label['displayName'] : $name;
				$description = isset( $label['description'] ) ? (string) $label['description'] : $description;
			}

			// A service whose name could not be resolved is skipped: an
			// identifier is not a service name, and storing one would put
			// `job_type_id:it_consulting` on somebody's website.
			if ( '' === trim( $name ) ) {
				continue;
			}

			$price = self::price( $item );

			$out[] = array(
				'name'        => $name,
				'description' => $description,
				'price'       => $price['price'],
				'currency'    => $price['currency'],
			);
		}

		return $out;
	}

	/**
	 * Service type id => display name, from every category on the location.
	 *
	 * @param array $payload Decoded location.
	 * @return array<string, string>
	 */
	private static function service_type_names( array $payload ) {
		$categories = array();

		if ( isset( $payload['categories']['primaryCategory'] ) ) {
			$categories[] = $payload['categories']['primaryCategory'];
		}

		if ( isset( $payload['categories']['additionalCategories'] ) && is_array( $payload['categories']['additionalCategories'] ) ) {
			$categories = array_merge( $categories, $payload['categories']['additionalCategories'] );
		}

		$names = array();

		foreach ( $categories as $category ) {
			if ( ! is_array( $category ) || empty( $category['serviceTypes'] ) || ! is_array( $category['serviceTypes'] ) ) {
				continue;
			}

			foreach ( $category['serviceTypes'] as $type ) {
				if ( is_array( $type ) && isset( $type['serviceTypeId'], $type['displayName'] ) ) {
					$names[ (string) $type['serviceTypeId'] ] = (string) $type['displayName'];
				}
			}
		}

		return $names;
	}

	/**
	 * A service's price, if Google carries one.
	 *
	 * Google sends money as whole units plus nanos — billionths — rather
	 * than a decimal, so the two have to be recombined.
	 *
	 * @param array $item One service item.
	 * @return array{price: float|null, currency: string}
	 */
	private static function price( array $item ) {
		$price = isset( $item['structuredServiceItem']['price'] ) ? $item['structuredServiceItem']['price'] : null;
		$price = isset( $item['freeFormServiceItem']['price'] ) ? $item['freeFormServiceItem']['price'] : $price;

		if ( ! is_array( $price ) || empty( $price['currencyCode'] ) ) {
			return array(
				'price'    => null,
				'currency' => '',
			);
		}

		$units = isset( $price['units'] ) ? (float) $price['units'] : 0.0;
		$nanos = isset( $price['nanos'] ) ? (float) $price['nanos'] / 1000000000 : 0.0;

		return array(
			'price'    => $units + $nanos,
			'currency' => strtoupper( (string) $price['currencyCode'] ),
		);
	}

	/**
	 * Opening hours, in the payload shape this plugin parses.
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
			// anything else accepts: read literally it becomes "closes at
			// 24:00", storage drops it, and the day reads as never shutting.
			if ( '24:00' === $close ) {
				$close = '00:00';
			}

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
}
