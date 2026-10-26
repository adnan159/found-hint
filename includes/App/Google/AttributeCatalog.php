<?php
/**
 * The attributes Google offers a listing, and the answers it holds.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google;

use FHINT\App\Location\LocationAttributes;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Reads a listing's attribute menu from Google and keeps it.
 *
 * **The menu is not fixed.** "Wheelchair accessible entrance" is offered to
 * almost everyone; "Accepting new patients" only to a medical practice, and
 * "Dogs allowed" only where that could be true. Google decides per listing —
 * by its category and its country — so the only honest source for the tick
 * boxes on the profile is Google's answer for that one listing. That answer
 * is stored under the listing's own resource name.
 *
 * Link attributes (`url_facebook`, `url_appointment`) are part of the same
 * menu but are not tick boxes; the Social section owns those, and they are
 * left out of what this class hands to the Attributes section.
 */
class AttributeCatalog {

	/** The attributes available to one listing. */
	const METADATA_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1/attributes';

	/** The answers a listing currently holds. */
	const VALUES_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1/%s/attributes';

	const PAGE_SIZE = 200;
	const MAX_PAGES = 5;

	/**
	 * Read the listing's attribute menu from Google and store it.
	 *
	 * @param string $location_name Google location resource name.
	 * @return int|WP_Error How many attributes Google offers.
	 */
	public static function fetch( $location_name ) {
		$location_name = (string) $location_name;
		$entries       = array();
		$token         = '';
		$pages         = 0;

		do {
			$query = array(
				'parent'   => $location_name,
				'pageSize' => self::PAGE_SIZE,
			);

			if ( '' !== $token ) {
				$query['pageToken'] = $token;
			}

			$response = Client::get( self::METADATA_URL, $query );

			if ( is_wp_error( $response ) ) {
				return $response;
			}

			foreach ( isset( $response['attributeMetadata'] ) && is_array( $response['attributeMetadata'] ) ? $response['attributeMetadata'] : array() as $metadata ) {
				$entry = self::from_google( $metadata );

				if ( $entry ) {
					$entries[] = array(
						'item_id'      => $entry['id'],
						'display_name' => $entry['label'],
						'value_type'   => $entry['type'],
						'payload'      => $entry,
					);
				}
			}

			$token = isset( $response['nextPageToken'] ) ? (string) $response['nextPageToken'] : '';
			++$pages;
		} while ( '' !== $token && $pages < self::MAX_PAGES );

		if ( ! ReferenceRepository::replace( ReferenceRepository::KIND_ATTRIBUTE, $location_name, $entries ) ) {
			return new WP_Error(
				'fhint_save_failed',
				__( 'The attributes Google offers could not be stored.', 'foundhint-local-seo' ),
				array( 'status' => 500 )
			);
		}

		return count( $entries );
	}

	/**
	 * Read the answers the listing holds on Google.
	 *
	 * @param string $location_name Google location resource name.
	 * @return array|WP_Error `attribute_id => { type, value }`, links left out.
	 */
	public static function fetch_values( $location_name ) {
		$response = self::fetch_raw_values( $location_name );

		return is_wp_error( $response ) ? $response : self::values_from_google( $response );
	}

	/**
	 * The listing's attribute answers exactly as Google sent them, links
	 * included.
	 *
	 * @param string $location_name Google location resource name.
	 * @return array|WP_Error Decoded response.
	 */
	public static function fetch_raw_values( $location_name ) {
		return Client::get( sprintf( self::VALUES_URL, (string) $location_name ) );
	}

	/**
	 * One of Google's attribute descriptions, in this plugin's shape.
	 *
	 * @param mixed $metadata Google `AttributeMetadata` object.
	 * @return array|null Null for one that is retired or carries no usable id.
	 */
	public static function from_google( $metadata ) {
		if ( ! is_array( $metadata ) || ! empty( $metadata['deprecated'] ) ) {
			return null;
		}

		$id   = LocationAttributes::normalize_id( isset( $metadata['parent'] ) ? $metadata['parent'] : '' );
		$type = self::type( isset( $metadata['valueType'] ) ? $metadata['valueType'] : '' );

		if ( '' === $id || '' === $type ) {
			return null;
		}

		$options = array();

		foreach ( isset( $metadata['valueMetadata'] ) && is_array( $metadata['valueMetadata'] ) ? $metadata['valueMetadata'] : array() as $option ) {
			if ( ! is_array( $option ) || ! array_key_exists( 'value', $option ) ) {
				continue;
			}

			$options[] = array(
				'value' => LocationAttributes::TYPE_BOOL === $type ? (bool) $option['value'] : (string) $option['value'],
				'label' => isset( $option['displayName'] ) ? (string) $option['displayName'] : '',
			);
		}

		return array(
			'id'      => $id,
			'label'   => isset( $metadata['displayName'] ) ? (string) $metadata['displayName'] : $id,
			'group'   => isset( $metadata['groupDisplayName'] ) ? (string) $metadata['groupDisplayName'] : '',
			'type'    => $type,
			'options' => $options,
		);
	}

	/**
	 * Google's attribute values, as the answers this plugin stores.
	 *
	 * @param mixed $response Decoded `locations/x/attributes` response.
	 * @return array `attribute_id => { type, value }`.
	 */
	public static function values_from_google( $response ) {
		$values = array();

		foreach ( is_array( $response ) && isset( $response['attributes'] ) && is_array( $response['attributes'] ) ? $response['attributes'] : array() as $attribute ) {
			if ( ! is_array( $attribute ) || empty( $attribute['name'] ) ) {
				continue;
			}

			$name     = (string) $attribute['name'];
			$position = strrpos( $name, 'attributes/' );
			$id       = LocationAttributes::normalize_id( false === $position ? $name : substr( $name, $position ) );
			$type     = self::type( isset( $attribute['valueType'] ) ? $attribute['valueType'] : '' );

			if ( '' === $id ) {
				continue;
			}

			if ( LocationAttributes::TYPE_REPEATED_ENUM === $type ) {
				$set = isset( $attribute['repeatedEnumValue']['setValues'] ) && is_array( $attribute['repeatedEnumValue']['setValues'] )
					? array_values( array_map( 'strval', $attribute['repeatedEnumValue']['setValues'] ) )
					: array();

				if ( $set ) {
					$values[ $id ] = array(
						'type'  => $type,
						'value' => $set,
					);
				}

				continue;
			}

			if ( ! isset( $attribute['values'] ) || ! is_array( $attribute['values'] ) || ! array_key_exists( 0, $attribute['values'] ) ) {
				continue;
			}

			$first = $attribute['values'][0];

			if ( LocationAttributes::TYPE_BOOL === $type || is_bool( $first ) ) {
				$values[ $id ] = array(
					'type'  => LocationAttributes::TYPE_BOOL,
					'value' => (bool) $first,
				);
			} elseif ( LocationAttributes::TYPE_ENUM === $type ) {
				$values[ $id ] = array(
					'type'  => $type,
					'value' => (string) $first,
				);
			}
		}

		return $values;
	}

	/**
	 * The stored menu for a listing, as the Attributes section offers it.
	 *
	 * @param string $location_name Google location resource name.
	 * @return array[] Each `{ id, label, group, type, options, allows_false }`.
	 */
	public static function definitions( $location_name ) {
		$definitions = array();

		foreach ( ReferenceRepository::for_parent( ReferenceRepository::KIND_ATTRIBUTE, (string) $location_name ) as $entry ) {
			if ( LocationAttributes::TYPE_URL === $entry['value_type'] ) {
				continue;
			}

			$payload = $entry['payload'];
			$options = isset( $payload['options'] ) && is_array( $payload['options'] ) ? $payload['options'] : array();

			$definitions[] = array(
				'id'           => $entry['item_id'],
				'label'        => $entry['display_name'],
				'group'        => isset( $payload['group'] ) ? (string) $payload['group'] : '',
				'type'         => $entry['value_type'],
				'options'      => $options,
				// Some yes/no attributes can only ever be "yes" — Google has
				// no "not women-owned" to publish. For those, unticking
				// withdraws the answer instead of sending a "no" Google
				// would refuse.
				'allows_false' => LocationAttributes::TYPE_BOOL === $entry['value_type'] && self::has_option( $options, false ),
			);
		}

		return $definitions;
	}

	/**
	 * When the menu was last read for a listing.
	 *
	 * @param string $location_name Google location resource name.
	 * @return string|null
	 */
	public static function fetched_at( $location_name ) {
		return ReferenceRepository::fetched_at( ReferenceRepository::KIND_ATTRIBUTE, (string) $location_name );
	}

	/**
	 * Whether a listing's menu holds each of some attributes.
	 *
	 * @param string   $location_name Google location resource name.
	 * @param string[] $ids           Attribute ids, e.g. 'url_appointment'.
	 * @return array<string,bool>|null Id => offered; null when the menu has
	 *                                 never been read, which is not "no".
	 */
	public static function offers( $location_name, array $ids ) {
		$menu = array();

		foreach ( ReferenceRepository::for_parent( ReferenceRepository::KIND_ATTRIBUTE, (string) $location_name ) as $entry ) {
			$menu[ (string) $entry['item_id'] ] = true;
		}

		if ( ! $menu ) {
			return null;
		}

		$offered = array();

		foreach ( $ids as $id ) {
			$offered[ $id ] = isset( $menu[ $id ] );
		}

		return $offered;
	}

	/**
	 * Google's value type as this plugin names it.
	 *
	 * @param mixed $type e.g. 'BOOL', 'REPEATED_ENUM'.
	 * @return string '' for a type this plugin does not know.
	 */
	private static function type( $type ) {
		$map = array(
			'BOOL'          => LocationAttributes::TYPE_BOOL,
			'ENUM'          => LocationAttributes::TYPE_ENUM,
			'REPEATED_ENUM' => LocationAttributes::TYPE_REPEATED_ENUM,
			'URL'           => LocationAttributes::TYPE_URL,
		);

		$type = strtoupper( (string) $type );

		return isset( $map[ $type ] ) ? $map[ $type ] : '';
	}

	/**
	 * Whether a set of options includes a given value.
	 *
	 * @param array $options Each `{ value, label }`.
	 * @param mixed $value   The value to look for.
	 * @return bool
	 */
	private static function has_option( array $options, $value ) {
		foreach ( $options as $option ) {
			if ( is_array( $option ) && array_key_exists( 'value', $option ) && $option['value'] === $value ) {
				return true;
			}
		}

		return false;
	}
}
