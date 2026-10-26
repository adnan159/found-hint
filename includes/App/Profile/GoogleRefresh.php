<?php
/**
 * Reading the parts of a listing only Google can supply.
 *
 * @package FoundHint
 */

namespace FHINT\App\Profile;

use FHINT\App\Business\AdditionalPhones;
use FHINT\App\Business\BookingLinks;
use FHINT\App\Business\BusinessRepository;
use FHINT\App\Business\OpeningDate;
use FHINT\App\Core\Logger;
use FHINT\App\Google\AttributeCatalog;
use FHINT\App\Google\Client;
use FHINT\App\Google\GoogleLocationRepository;
use FHINT\App\Google\ImportMapper;
use FHINT\App\Google\Profiles;
use FHINT\App\Google\Push\Publisher;
use FHINT\App\Google\ReferenceRepository;
use FHINT\App\Location\LocationAttributeRepository;
use FHINT\App\Location\LocationCategories;
use FHINT\App\Location\LocationRepository;
use FHINT\App\Location\ServiceArea;
use FHINT\App\Media\MediaSync;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Brings the profile screen up to date with its Google listing.
 *
 * Three things on that screen cannot be typed in, only read:
 *
 * - **which attributes exist** for this listing, and the answers it holds;
 * - **the photos** on it;
 * - **its Maps id**, which is what "View on Google" opens.
 *
 * This reads all three, and changes nothing on Google. It is separate from
 * the import on the Google screen on purpose: an import is a choice about
 * which of the owner's own fields to overwrite, and it asks first. Nothing
 * here overwrites a field the owner typed — an attribute answer changed on
 * this site and not yet sent is kept as it is.
 *
 * One field is *filled in*, never replaced: **categories, where the location
 * has none.** A listing always has a category on Google, so a location shown
 * with no category — or a second listing shown with the first one's — is
 * simply wrong, and Google's answer is the only right one available. Once a
 * category is set here, by hand or by import, a refresh leaves it alone.
 *
 * **Each part stands alone.** A listing whose photos cannot be read still
 * gets its attributes, and the answer says which parts arrived.
 */
class GoogleRefresh {

	const LOCATION_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1/%s';

	/**
	 * Read the listing the selected location is mapped to.
	 *
	 * @return array|WP_Error `{ categories, details, opening_date, additional_phones, service_area, social, booking, service_types, attributes, answers, photos, failed }`.
	 */
	public static function run() {
		$ready = Publisher::ready();

		if ( is_wp_error( $ready ) ) {
			return $ready;
		}

		$location = Profile::location();

		if ( ! $location ) {
			return Profile::business_required();
		}

		$location_name = $ready['location_name'];
		$report        = array(
			'categories'    => false,
			'details'       => false,
			'opening_date'  => false,
			'additional_phones' => false,
			'service_area'  => false,
			'social'        => false,
			'booking'       => false,
			'service_types' => null,
			'attributes'    => null,
			'answers'    => null,
			'photos'     => null,
			'failed'     => array(),
		);
		$errors        = array();

		// The Maps id. Small, and nothing else depends on it, so a refusal
		// here is not reported as a failure of the refresh.
		$listing = Client::get( sprintf( self::LOCATION_URL, $location_name ), array( 'readMask' => 'metadata,categories,title,profile,openInfo,phoneNumbers,serviceArea' ) );

		if ( ! is_wp_error( $listing ) ) {
			GoogleLocationRepository::set_cid( $location_name, Profiles::cid( $listing ) );

			$report['categories'] = self::fill_categories( $location, ImportMapper::categories( $listing ) );
			$report['details']    = self::fill_details( $location, $listing );

			$report['opening_date'] = self::fill_opening_date(
				$location,
				OpeningDate::from_google( isset( $listing['openInfo']['openingDate'] ) ? $listing['openInfo']['openingDate'] : null )
			);

			$report['service_area'] = self::fill_service_area(
				$location,
				ServiceArea::from_google( isset( $listing['serviceArea'] ) ? $listing['serviceArea'] : null )
			);

			$report['additional_phones'] = self::fill_additional_phones(
				$location,
				AdditionalPhones::from_google( isset( $listing['phoneNumbers'] ) ? $listing['phoneNumbers'] : null )
			);

			// The services Google already knows for this listing's
			// categories, for the service form to offer.
			$types = array();

			foreach ( ImportMapper::service_type_list( $listing ) as $type ) {
				$types[] = array(
					'item_id'      => $type['id'],
					'display_name' => $type['label'],
					'value_type'   => '',
					'payload'      => $type,
				);
			}

			if ( ReferenceRepository::replace( ReferenceRepository::KIND_SERVICE_TYPE, $location_name, $types ) ) {
				$report['service_types'] = count( $types );
			}
		}

		$offered = AttributeCatalog::fetch( $location_name );

		if ( is_wp_error( $offered ) ) {
			$errors[]           = $offered;
			$report['failed'][] = 'attributes';
		} else {
			$report['attributes'] = (int) $offered;

			$raw = AttributeCatalog::fetch_raw_values( $location_name );

			if ( is_wp_error( $raw ) ) {
				$errors[]           = $raw;
				$report['failed'][] = 'answers';
			} else {
				$report['answers'] = (int) LocationAttributeRepository::store_synced( (int) $location['id'], AttributeCatalog::values_from_google( $raw ) );
				$report['social']  = self::fill_social( $location, ImportMapper::social( $raw ) );
				$report['booking'] = self::fill_booking( $location, BookingLinks::from_google( $raw ) );
			}
		}

		$photos = MediaSync::run( (int) $location['id'], $location_name, $ready['account_name'] );

		if ( is_wp_error( $photos ) ) {
			$errors[]           = $photos;
			$report['failed'][] = 'photos';
		} else {
			$report['photos'] = (int) $photos;
		}

		// Nothing arrived at all: say why, rather than answer "0 photos, 0
		// attributes" as though Google had been asked and had none.
		if ( null === $report['attributes'] && null === $report['photos'] ) {
			return $errors[0];
		}

		Logger::info(
			'google',
			'google.profile_refreshed',
			__( 'Attributes and photos were read from Google.', 'foundhint-local-seo' )
		);

		return $report;
	}

	/**
	 * Give a location Google's categories when it has none of its own.
	 *
	 * "None of its own" follows where categories are kept: on the business
	 * for the primary location, on the location itself for any other.
	 *
	 * @param array $location   The selected location.
	 * @param array $categories `{ primary, additional }` as Google holds them.
	 * @return bool Whether anything was written.
	 */
	private static function fill_categories( array $location, array $categories ) {
		if ( empty( $categories['primary'] ) ) {
			return false;
		}

		$values = array(
			'primary_category'     => (string) $categories['primary']['name'],
			'primary_category_id'  => (string) $categories['primary']['id'],
			'secondary_categories' => $categories['additional'],
		);

		if ( LocationCategories::kept_on_location( $location ) ) {
			if ( '' !== trim( (string) $location['primary_category'] ) ) {
				return false;
			}

			return (bool) LocationRepository::update( (int) $location['id'], $values );
		}

		$business = BusinessRepository::get();

		if ( ! $business || '' !== trim( (string) $business['primary_category'] ) ) {
			return false;
		}

		return (bool) BusinessRepository::save( $values );
	}

	/**
	 * Give a location that keeps its own details Google's name and
	 * description, where it has none.
	 *
	 * Only a location that is not the primary one: the primary location's
	 * name and description are the business's, which is never filled from a
	 * refresh. And only an empty field — a name or description set here,
	 * by hand or by import, is left alone.
	 *
	 * @param array $location The selected location.
	 * @param array $listing  The listing as Google sent it.
	 * @return bool Whether anything was written.
	 */
	private static function fill_details( array $location, array $listing ) {
		if ( ! LocationCategories::kept_on_location( $location ) ) {
			return false;
		}

		$theirs = array(
			'business_name' => isset( $listing['title'] ) ? trim( (string) $listing['title'] ) : '',
			'description'   => isset( $listing['profile']['description'] ) ? trim( (string) $listing['profile']['description'] ) : '',
		);
		$values = array();

		foreach ( $theirs as $column => $value ) {
			if ( '' !== $value && '' === trim( (string) $location[ $column ] ) ) {
				$values[ $column ] = $value;
			}
		}

		return $values ? (bool) LocationRepository::update( (int) $location['id'], $values ) : false;
	}

	/**
	 * Take the listing's opening date, where none is set here.
	 *
	 * Unlike the name and description, this fills the primary location too
	 * — its date is the business's founding date — because it is the one
	 * detail an import made before this plugin read it could not have
	 * brought across. Only ever into an empty date: one set here is the
	 * owner's, and a refresh does not touch it.
	 *
	 * @param array  $location The selected location.
	 * @param string $date     Google's date, in the stored form; '' for none.
	 * @return bool Whether anything was written.
	 */
	private static function fill_opening_date( array $location, $date ) {
		if ( '' === (string) $date ) {
			return false;
		}

		if ( LocationCategories::kept_on_location( $location ) ) {
			if ( '' !== trim( (string) $location['opening_date'] ) ) {
				return false;
			}

			return (bool) LocationRepository::update( (int) $location['id'], array( 'opening_date' => $date ) );
		}

		$business = BusinessRepository::get();

		if ( ! $business || '' !== trim( (string) $business['founding_date'] ) ) {
			return false;
		}

		return (bool) BusinessRepository::save( array( 'founding_date' => $date ) );
	}

	/**
	 * Take the listing's service area, where none is held here.
	 *
	 * Every location keeps its own area, like its address. Only an empty one
	 * is filled: a list edited here — places removed, or typed — is the
	 * owner's, and a refresh does not touch it.
	 *
	 * @param array   $location The selected location.
	 * @param array[] $places   Google's places.
	 * @return bool Whether anything was written.
	 */
	private static function fill_service_area( array $location, array $places ) {
		if ( ! $places || ! empty( $location['service_area'] ) ) {
			return false;
		}

		return (bool) LocationRepository::update( (int) $location['id'], array( 'service_area' => $places ) );
	}

	/**
	 * Take the listing's extra numbers, where there are none here.
	 *
	 * The same rule as the opening date: the primary location too (its
	 * numbers are the business's), and only when nothing is held — a branch
	 * with a list of its own, even an empty one, and a business with any
	 * number, are the owner's and are left alone.
	 *
	 * @param array    $location The selected location.
	 * @param string[] $numbers  Google's extra numbers.
	 * @return bool Whether anything was written.
	 */
	private static function fill_additional_phones( array $location, array $numbers ) {
		if ( ! $numbers ) {
			return false;
		}

		if ( LocationCategories::kept_on_location( $location ) ) {
			if ( is_array( $location['additional_phones'] ) ) {
				return false;
			}

			return (bool) LocationRepository::update( (int) $location['id'], array( 'additional_phones' => $numbers ) );
		}

		$business = BusinessRepository::get();

		if ( ! $business || ! empty( $business['additional_phones'] ) ) {
			return false;
		}

		return (bool) BusinessRepository::save( array( 'additional_phones' => $numbers ) );
	}

	/**
	 * Take the listing's booking links, where none are held here.
	 *
	 * The same rule as the extra numbers: a branch only while it has no set
	 * of its own (NULL), the primary location only while the business has
	 * no booking link at all. A set saved here — even an empty one — is the
	 * owner's.
	 *
	 * @param array $location The selected location.
	 * @param array $links    Field => link, as Google holds them.
	 * @return bool Whether anything was written.
	 */
	private static function fill_booking( array $location, array $links ) {
		if ( ! $links ) {
			return false;
		}

		$links = array_merge( BookingLinks::complete( array() ), $links );

		if ( LocationCategories::kept_on_location( $location ) ) {
			if ( is_array( $location['booking_links'] ) ) {
				return false;
			}

			return (bool) LocationRepository::update( (int) $location['id'], array( 'booking_links' => $links ) );
		}

		$business = BusinessRepository::get();

		if ( ! $business || array_filter( BookingLinks::complete( $business['booking_links'] ) ) ) {
			return false;
		}

		return (bool) BusinessRepository::save( array( 'booking_links' => $links ) );
	}

	/**
	 * Give a location that keeps its own links Google's, when it has none.
	 *
	 * Only a location that is not the primary one, and only while it has no
	 * links of its own at all (`NULL`): a set saved here — even an empty one
	 * — is the owner's, and a refresh does not touch it.
	 *
	 * @param array $location The selected location.
	 * @param array $links    Network => URL, as Google holds them.
	 * @return bool Whether anything was written.
	 */
	private static function fill_social( array $location, array $links ) {
		if ( ! $links || ! LocationCategories::kept_on_location( $location ) || is_array( $location['social_profiles'] ) ) {
			return false;
		}

		return (bool) LocationRepository::update( (int) $location['id'], array( 'social_profiles' => $links ) );
	}
}
