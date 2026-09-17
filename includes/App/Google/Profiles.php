<?php
/**
 * Reading business profiles from Google.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google;

use FHINT\App\Core\Logger;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Fetches the accounts and locations the connected Google account can see,
 * and normalises them into the shape this plugin stores.
 *
 * **Google is read on demand, never while rendering.** The screen reads the
 * stored copy; a sync happens because somebody asked for one. That is the
 * plugin's standing rule about external HTTP, and it is also the only way
 * a project with a small quota survives a busy admin.
 *
 * Two APIs are involved, and they are genuinely separate products:
 * Account Management lists the accounts, Business Information lists the
 * locations under one. Both need enabling in Google Cloud, and Google has
 * to approve the project before either returns anything.
 */
class Profiles {

	const ACCOUNTS_URL  = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';
	const LOCATIONS_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1/%s/locations';

	/**
	 * Fields to ask for when listing locations.
	 *
	 * `readMask` is **required** by the Business Information API — a request
	 * without it is rejected outright rather than defaulting to everything.
	 */
	const LOCATION_READ_MASK = 'name,title,storeCode,storefrontAddress,phoneNumbers,websiteUri,metadata';

	/**
	 * Largest page Google will return.
	 */
	const PAGE_SIZE = 100;

	/**
	 * A stop on pagination, so a broken `nextPageToken` cannot spin.
	 */
	const MAX_PAGES = 20;

	/**
	 * Read everything from Google and store it.
	 *
	 * @return array|WP_Error Summary of what was found.
	 */
	public static function sync() {
		$accounts = self::fetch_accounts();

		if ( is_wp_error( $accounts ) ) {
			return $accounts;
		}

		$found = 0;

		foreach ( $accounts as $account ) {
			$locations = self::fetch_locations( $account['name'] );

			if ( is_wp_error( $locations ) ) {
				// One account failing must not discard the accounts that
				// worked — a profile the operator can see is more useful
				// than a clean error about one they cannot.
				Logger::log(
					Logger::WARNING,
					'google',
					'google.locations_failed',
					$locations->get_error_message()
				);

				continue;
			}

			foreach ( $locations as $location ) {
				GoogleLocationRepository::upsert( $location );
				$found++;
			}
		}

		Logger::log(
			Logger::INFO,
			'google',
			'google.profiles_synced',
			sprintf(
				/* translators: 1: e.g. "3 locations", 2: e.g. "1 account". */
				__( 'Read %1$s across %2$s.', 'found-hint' ),
				sprintf(
					/* translators: %d: number of Google locations. */
					_n( '%d location', '%d locations', $found, 'found-hint' ),
					$found
				),
				sprintf(
					/* translators: %d: number of Google accounts. */
					_n( '%d account', '%d accounts', count( $accounts ), 'found-hint' ),
					count( $accounts )
				)
			)
		);

		return array(
			'accounts'  => count( $accounts ),
			'locations' => $found,
		);
	}

	/**
	 * List the accounts the signed-in user can manage.
	 *
	 * @return array[]|WP_Error
	 */
	public static function fetch_accounts() {
		$accounts = array();
		$token    = '';

		for ( $page = 0; $page < self::MAX_PAGES; $page++ ) {
			$query = array( 'pageSize' => self::PAGE_SIZE );

			if ( '' !== $token ) {
				$query['pageToken'] = $token;
			}

			$response = Client::get( self::ACCOUNTS_URL, $query );

			if ( is_wp_error( $response ) ) {
				return $response;
			}

			$batch = isset( $response['accounts'] ) && is_array( $response['accounts'] )
				? $response['accounts']
				: array();

			foreach ( $batch as $account ) {
				if ( empty( $account['name'] ) ) {
					continue;
				}

				$accounts[] = array(
					'name'               => (string) $account['name'],
					'account_name'       => isset( $account['accountName'] ) ? (string) $account['accountName'] : '',
					'type'               => isset( $account['type'] ) ? (string) $account['type'] : '',
					'verification_state' => isset( $account['verificationState'] ) ? (string) $account['verificationState'] : '',
				);
			}

			$token = isset( $response['nextPageToken'] ) ? (string) $response['nextPageToken'] : '';

			if ( '' === $token ) {
				break;
			}
		}

		return $accounts;
	}

	/**
	 * List the locations under one account.
	 *
	 * @param string $account_name Account resource name, e.g. 'accounts/123'.
	 * @return array[]|WP_Error Normalised locations.
	 */
	public static function fetch_locations( $account_name ) {
		$url       = sprintf( self::LOCATIONS_URL, rawurlencode( (string) $account_name ) );
		$locations = array();
		$token     = '';

		for ( $page = 0; $page < self::MAX_PAGES; $page++ ) {
			$query = array(
				'readMask' => self::LOCATION_READ_MASK,
				'pageSize' => self::PAGE_SIZE,
			);

			if ( '' !== $token ) {
				$query['pageToken'] = $token;
			}

			$response = Client::get( $url, $query );

			if ( is_wp_error( $response ) ) {
				return $response;
			}

			$batch = isset( $response['locations'] ) && is_array( $response['locations'] )
				? $response['locations']
				: array();

			foreach ( $batch as $location ) {
				if ( empty( $location['name'] ) ) {
					continue;
				}

				$locations[] = self::normalise( $account_name, $location );
			}

			$token = isset( $response['nextPageToken'] ) ? (string) $response['nextPageToken'] : '';

			if ( '' === $token ) {
				break;
			}
		}

		return $locations;
	}

	/**
	 * Flatten one of Google's location objects into our columns.
	 *
	 * The raw object is kept alongside, because Google's shape changes
	 * faster than a schema should and the fields nobody has needed yet are
	 * exactly the ones a later comparison will want.
	 *
	 * @param string $account_name Owning account resource name.
	 * @param array  $location     Raw location object.
	 * @return array
	 */
	private static function normalise( $account_name, array $location ) {
		return array(
			'account_name'       => (string) $account_name,
			'location_name'      => (string) $location['name'],
			'title'              => isset( $location['title'] ) ? (string) $location['title'] : '',
			'store_code'         => isset( $location['storeCode'] ) ? (string) $location['storeCode'] : '',
			'address'            => self::format_address( $location ),
			'phone'              => isset( $location['phoneNumbers']['primaryPhone'] )
				? (string) $location['phoneNumbers']['primaryPhone']
				: '',
			'website'            => isset( $location['websiteUri'] ) ? (string) $location['websiteUri'] : '',
			'verification_state' => self::verification_state( $location ),
			'payload'            => $location,
		);
	}

	/**
	 * Build a one-line address from Google's structured one.
	 *
	 * @param array $location Raw location object.
	 * @return string
	 */
	private static function format_address( array $location ) {
		if ( empty( $location['storefrontAddress'] ) || ! is_array( $location['storefrontAddress'] ) ) {
			return '';
		}

		$address = $location['storefrontAddress'];
		$parts   = array();

		if ( ! empty( $address['addressLines'] ) && is_array( $address['addressLines'] ) ) {
			foreach ( $address['addressLines'] as $line ) {
				$parts[] = (string) $line;
			}
		}

		foreach ( array( 'locality', 'administrativeArea', 'postalCode', 'regionCode' ) as $key ) {
			if ( ! empty( $address[ $key ] ) ) {
				$parts[] = (string) $address[ $key ];
			}
		}

		return implode( ', ', array_filter( $parts ) );
	}

	/**
	 * Read the verification state out of Google's metadata.
	 *
	 * Google does not return a plain "verified" field on the location; what
	 * it exposes here is whether the place can be edited and published,
	 * which is the thing an operator actually needs to know before mapping
	 * to it.
	 *
	 * @param array $location Raw location object.
	 * @return string
	 */
	private static function verification_state( array $location ) {
		if ( empty( $location['metadata'] ) || ! is_array( $location['metadata'] ) ) {
			return '';
		}

		if ( ! empty( $location['metadata']['hasPendingEdits'] ) ) {
			return 'PENDING_EDITS';
		}

		if ( isset( $location['metadata']['canOperateLocalPost'] ) && ! $location['metadata']['canOperateLocalPost'] ) {
			return 'LIMITED';
		}

		return 'OK';
	}
}
