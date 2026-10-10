<?php
/**
 * Attribute values for a location: reading what was sent, and the rules.
 *
 * @package FoundHint
 */

namespace FHINT\App\Location;

use FHINT\App\Core\ValidationResult;
use FHINT\App\Core\Validator;

defined( 'ABSPATH' ) || exit;

/**
 * "Wheelchair accessible entrance: yes." "Payments: credit cards, cash."
 *
 * Google decides which attributes exist for a category and what kind each
 * one is — a yes/no, one choice, several choices, or links. Those
 * definitions are Google's, and until they have been fetched for a location
 * this class cannot know whether `has_wheelchair_accessible_entrance` is real
 * or a typo. So what is enforced here is **shape**: an id that could be a
 * Google attribute id, and a value of a kind Google has. Whether the pair
 * exists is checked against the definitions when those are available, and
 * again by Google when it is pushed.
 *
 * **`null` is the one value with a meaning of its own: remove my answer.**
 * That is different from `false`. "No, we are not wheelchair accessible" is
 * an answer Google publishes; removing the row is declining to say.
 */
class LocationAttributes {

	const TYPE_BOOL          = 'bool';
	const TYPE_ENUM          = 'enum';
	const TYPE_REPEATED_ENUM = 'repeated_enum';
	const TYPE_URL           = 'url';

	/**
	 * Read a write payload into what to store and what to remove.
	 *
	 * @param mixed $payload `{ attribute_id: value }`.
	 * @return array{set:array<string,array>, remove:string[], invalid:string[]}
	 */
	public static function parse( $payload ) {
		$parsed = array(
			'set'     => array(),
			'remove'  => array(),
			'invalid' => array(),
		);

		if ( ! is_array( $payload ) ) {
			return $parsed;
		}

		foreach ( $payload as $key => $value ) {
			$id = self::normalize_id( $key );

			if ( '' === $id ) {
				$parsed['invalid'][] = (string) $key;
				continue;
			}

			if ( null === $value ) {
				$parsed['remove'][] = $id;
				continue;
			}

			$typed = self::typed( $value );

			if ( null === $typed ) {
				$parsed['invalid'][] = $id;
				continue;
			}

			$parsed['set'][ $id ] = $typed;
		}

		return $parsed;
	}

	/**
	 * Validate a parsed payload.
	 *
	 * @param array $parsed Result of parse().
	 * @return ValidationResult
	 */
	public static function validate( array $parsed ) {
		$result = new ValidationResult();

		foreach ( $parsed['invalid'] as $id ) {
			$result->add( (string) $id, 'attributes.value.invalid' );
		}

		return $result;
	}

	/**
	 * A Google attribute id in the form it is stored.
	 *
	 * Accepts Google's resource form (`attributes/has_wifi`) as well, since
	 * that is how its API names them.
	 *
	 * @param mixed $id Anything.
	 * @return string '' when it could not be an attribute id.
	 */
	public static function normalize_id( $id ) {
		$id = strtolower( trim( (string) $id ) );

		if ( 0 === strpos( $id, 'attributes/' ) ) {
			$id = substr( $id, strlen( 'attributes/' ) );
		}

		return preg_match( '/^[a-z][a-z0-9_]{1,190}$/', $id ) ? $id : '';
	}

	/**
	 * Work out which kind of value was sent, and clean it.
	 *
	 * @param mixed $value The value.
	 * @return array{type:string, value:mixed}|null Null when it is no kind Google has.
	 */
	private static function typed( $value ) {
		if ( is_bool( $value ) ) {
			return array(
				'type'  => self::TYPE_BOOL,
				'value' => $value,
			);
		}

		if ( is_string( $value ) ) {
			$value = sanitize_text_field( $value );

			// A form posts booleans as words.
			if ( in_array( strtolower( $value ), array( 'true', 'false' ), true ) ) {
				return array(
					'type'  => self::TYPE_BOOL,
					'value' => 'true' === strtolower( $value ),
				);
			}

			if ( '' === $value ) {
				return null;
			}

			return array(
				'type'  => self::TYPE_ENUM,
				'value' => $value,
			);
		}

		if ( is_array( $value ) ) {
			$items = array();

			foreach ( $value as $item ) {
				if ( ! is_string( $item ) ) {
					return null;
				}

				$item = trim( $item );

				if ( '' !== $item ) {
					$items[] = $item;
				}
			}

			$items = array_values( array_unique( $items ) );

			if ( ! $items ) {
				return null;
			}

			$all_urls = true;

			foreach ( $items as $item ) {
				if ( ! Validator::is_url( $item ) ) {
					$all_urls = false;
					break;
				}
			}

			if ( $all_urls ) {
				return array(
					'type'  => self::TYPE_URL,
					'value' => array_map( 'esc_url_raw', $items ),
				);
			}

			return array(
				'type'  => self::TYPE_REPEATED_ENUM,
				'value' => array_map( 'sanitize_text_field', $items ),
			);
		}

		return null;
	}
}
