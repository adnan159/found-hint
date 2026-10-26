<?php
/**
 * What a publish to Google would send, worked out without sending anything.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google\Push;

use FHINT\App\Business\AdditionalPhones;
use FHINT\App\Business\BookingLinks;
use FHINT\App\Business\OpeningDate;
use FHINT\App\Location\ServiceArea;

defined( 'ABSPATH' ) || exit;

/**
 * Compares this site's profile with the listing Google holds.
 *
 * The answer is a list of **steps** — one per request a publish would make —
 * each naming the fields it would change, from what, to what. The screen
 * shows that before anything is sent, and then runs the steps one at a time.
 *
 * **A plan never clears anything.** Google's update takes a mask of field
 * names, and a field named with no value is erased from the live listing. So
 * a field this site has nothing for is not put in the mask; it is reported
 * under `skipped` instead, with the value Google has. This site cannot tell
 * "the owner removed their phone number on purpose" from "the owner never
 * typed it here", and guessing the first would delete a number the public is
 * using. Removing something from Google deliberately is a separate act, to
 * be asked for explicitly.
 *
 * Pure: arrays in, an array out. Reading Google and the database is
 * {@see Publisher}'s job, which is what lets every rule here be proved with
 * neither.
 */
class Plan {

	const STEP_LOCATION   = 'location';
	const STEP_ATTRIBUTES = 'attributes';

	const REASON_EMPTY_HERE    = 'empty_here';
	const REASON_NO_GOOGLE_ID  = 'no_google_id';
	const REASON_NO_PLACE_ID   = 'no_place_id';
	const REASON_NOT_ALLOWED   = 'not_allowed';
	const REASON_NOT_ON_GOOGLE = 'not_on_google';

	/**
	 * Build the plan.
	 *
	 * @param array $local      This site's profile, as {@see Publisher} gathers it.
	 * @param array $google     The location as Google returned it.
	 * @param array $attributes Google's attribute values for the location.
	 * @return array{steps:array[], skipped:array[], unchanged:string[], requests:int}
	 */
	public static function make( array $local, array $google, array $attributes = array() ) {
		$plan = array(
			'steps'     => array(),
			'skipped'   => array(),
			'unchanged' => array(),
			'requests'  => 0,
		);

		$location   = self::location_step( $local, $google, $plan );
		$attributes = self::attributes_step( $local, $attributes, $plan );

		foreach ( array( $location, $attributes ) as $step ) {
			if ( $step['fields'] ) {
				$step['token']   = self::token( $step );
				$plan['steps'][] = $step;
				++$plan['requests'];
			}
		}

		return $plan;
	}

	/**
	 * The step that patches the location: details, hours and services.
	 *
	 * @param array $local  This site's profile.
	 * @param array $google The location as Google returned it.
	 * @param array $plan   The plan, for recording what is skipped or unchanged.
	 * @return array
	 */
	private static function location_step( array $local, array $google, array &$plan ) {
		$step = array(
			'id'      => self::STEP_LOCATION,
			'fields'  => array(),
			'mask'    => array(),
			'payload' => array(),
		);

		// Name.
		self::text(
			$step,
			$plan,
			'name',
			'title',
			self::value( $local, 'name' ),
			self::value( $google, 'title' ),
			static function ( $value ) {
				return array( 'title' => $value );
			}
		);

		// Description.
		self::text(
			$step,
			$plan,
			'description',
			'profile.description',
			self::value( $local, 'description' ),
			isset( $google['profile']['description'] ) ? trim( (string) $google['profile']['description'] ) : '',
			static function ( $value ) {
				return array( 'profile' => array( 'description' => $value ) );
			}
		);

		// Website.
		$website        = self::value( $local, 'website' );
		$google_website = self::value( $google, 'websiteUri' );

		if ( '' === $website ) {
			self::skip_or_unchanged( $plan, 'website', $google_website );
		} elseif ( GoogleFormat::url_key( $website ) === GoogleFormat::url_key( $google_website ) ) {
			$plan['unchanged'][] = 'website';
		} else {
			self::change( $step, 'website', 'websiteUri', $google_website, $website, array( 'websiteUri' => $website ) );
		}

		self::phones( $step, $plan, $local, $google );

		self::opening_date( $step, $plan, $local, $google );
		self::service_area( $step, $plan, $local, $google );
		self::categories( $step, $plan, $local, $google );
		self::hours( $step, $plan, $local, $google );
		self::special_hours( $step, $plan, $local, $google );
		self::services( $step, $plan, $local, $google );

		return $step;
	}

	/**
	 * The main number and the extra ones.
	 *
	 * Two fields on screen, one to Google: `phoneNumbers` is replaced whole,
	 * so whichever side changed, both are sent, and the side this site did
	 * not change goes back as Google has it — otherwise sending a new main
	 * number would drop the extra ones, and the other way round. Each side
	 * follows the plan's rule on its own: nothing here is skipped, never
	 * sent as a clear.
	 *
	 * @param array $step   The location step.
	 * @param array $plan   The plan.
	 * @param array $local  This site's profile.
	 * @param array $google The location as Google returned it.
	 * @return void
	 */
	private static function phones( array &$step, array &$plan, array $local, array $google ) {
		$phone        = self::value( $local, 'phone' );
		$google_phone = isset( $google['phoneNumbers']['primaryPhone'] ) ? trim( (string) $google['phoneNumbers']['primaryPhone'] ) : '';
		$extra        = isset( $local['additional_phones'] ) && is_array( $local['additional_phones'] ) ? array_values( $local['additional_phones'] ) : array();
		$google_extra = AdditionalPhones::from_google( isset( $google['phoneNumbers'] ) ? $google['phoneNumbers'] : null );
		$changes      = array();

		if ( '' === $phone ) {
			self::skip_or_unchanged( $plan, 'phone', $google_phone );
		} elseif ( GoogleFormat::same_phone( $phone, $google_phone ) ) {
			$plan['unchanged'][] = 'phone';
		} else {
			$changes['phone'] = array( $google_phone, $phone );
		}

		if ( ! $extra ) {
			self::skip_or_unchanged( $plan, 'additional_phones', $google_extra );
		} elseif ( AdditionalPhones::same( $extra, $google_extra ) ) {
			$plan['unchanged'][] = 'additional_phones';
		} else {
			$changes['additional_phones'] = array( $google_extra, $extra );
		}

		if ( ! $changes ) {
			return;
		}

		$numbers = array( 'additionalPhones' => isset( $changes['additional_phones'] ) ? $extra : $google_extra );
		$primary = isset( $changes['phone'] ) ? $phone : $google_phone;

		if ( '' !== $primary ) {
			$numbers['primaryPhone'] = $primary;
		}

		foreach ( $changes as $field => $values ) {
			$step['fields'][] = array(
				'field' => $field,
				'from'  => $values[0],
				'to'    => $values[1],
			);
		}

		// One mask entry and one payload for the two fields: Google's field
		// is `phoneNumbers`, and naming it twice would be one request saying
		// the same thing twice.
		$step['mask'][]  = 'phoneNumbers';
		$step['payload'] = array_replace_recursive( $step['payload'], array( 'phoneNumbers' => $numbers ) );
	}

	/**
	 * The places the listing serves.
	 *
	 * Google needs a place id for every place, and only a place read from
	 * Google has one. So only those are sent; a place typed here is listed
	 * as skipped (`no_place_id`) — it stays in the website's markup. The
	 * places are compared by id, and sent as one list, which Google replaces
	 * whole: removing a place here and publishing removes it there.
	 *
	 * The business type is kept as Google has it; a listing that has none
	 * yet is sent "at the customer's and at the business", because a
	 * listing with a storefront that also travels is the common case and
	 * the other one would make Google drop its address.
	 *
	 * @param array $step   The location step.
	 * @param array $plan   The plan.
	 * @param array $local  This site's profile.
	 * @param array $google The location as Google returned it.
	 * @return void
	 */
	private static function service_area( array &$step, array &$plan, array $local, array $google ) {
		$places  = isset( $local['service_area'] ) && is_array( $local['service_area'] ) ? $local['service_area'] : array();
		$current = ServiceArea::from_google( isset( $google['serviceArea'] ) ? $google['serviceArea'] : null );
		$typed   = ServiceArea::typed_only( $places );

		if ( $typed ) {
			$plan['skipped'][] = array(
				'field'  => 'service_area',
				'reason' => self::REASON_NO_PLACE_ID,
				'google' => $typed,
			);
		}

		$infos   = ServiceArea::place_infos( $places );
		$names   = static function ( array $list ) {
			return array_column( $list, 'name' );
		};

		if ( ! $infos ) {
			// Nothing here Google could take. Never a clear: an area Google
			// has stays until someone removes its places here one by one.
			if ( ! $typed ) {
				self::skip_or_unchanged( $plan, 'service_area', $names( $current ) );
			}

			return;
		}

		if ( ServiceArea::signature( $infos ) === ServiceArea::signature( ServiceArea::place_infos( $current ) ) ) {
			$plan['unchanged'][] = 'service_area';

			return;
		}

		$type = isset( $google['serviceArea']['businessType'] ) && 'BUSINESS_TYPE_UNSPECIFIED' !== $google['serviceArea']['businessType']
			? (string) $google['serviceArea']['businessType']
			: 'CUSTOMER_AND_BUSINESS_LOCATION';

		$area = array(
			'businessType' => $type,
			'places'       => array( 'placeInfos' => $infos ),
		);

		if ( isset( $google['serviceArea']['regionCode'] ) ) {
			$area['regionCode'] = (string) $google['serviceArea']['regionCode'];
		}

		self::change( $step, 'service_area', 'serviceArea', $names( $current ), array_column( $infos, 'placeName' ), array( 'serviceArea' => $area ) );
	}

	/**
	 * The opening date, compared and sent to the month.
	 *
	 * Sent as a year and a month with no day, which Google takes as "opened
	 * in March 2014". A day Google already holds within the same month is
	 * not a difference: this site keeps no day, and sending one back would
	 * erase it for nothing. Only `openInfo.openingDate` is named in the
	 * mask, so the listing's open or closed status is never touched.
	 *
	 * @param array $step   The location step.
	 * @param array $plan   The plan.
	 * @param array $local  This site's profile.
	 * @param array $google The location as Google returned it.
	 * @return void
	 */
	private static function opening_date( array &$step, array &$plan, array $local, array $google ) {
		$here  = OpeningDate::for_screen( self::value( $local, 'opening_date' ) );
		$there = OpeningDate::for_screen(
			OpeningDate::from_google( isset( $google['openInfo']['openingDate'] ) ? $google['openInfo']['openingDate'] : null )
		);

		if ( '' === $here ) {
			self::skip_or_unchanged( $plan, 'opening_date', $there );

			return;
		}

		if ( $here === $there ) {
			$plan['unchanged'][] = 'opening_date';

			return;
		}

		self::change(
			$step,
			'opening_date',
			'openInfo.openingDate',
			$there,
			$here,
			array( 'openInfo' => array( 'openingDate' => OpeningDate::to_google( $here ) ) )
		);
	}

	/**
	 * Categories: the primary one and the additional ones, as one field.
	 *
	 * @param array $step   The location step.
	 * @param array $plan   The plan.
	 * @param array $local  This site's profile.
	 * @param array $google The location as Google returned it.
	 * @return void
	 */
	private static function categories( array &$step, array &$plan, array $local, array $google ) {
		$google_primary = isset( $google['categories']['primaryCategory'] ) && is_array( $google['categories']['primaryCategory'] )
			? $google['categories']['primaryCategory']
			: array();
		$google_extra   = isset( $google['categories']['additionalCategories'] ) && is_array( $google['categories']['additionalCategories'] )
			? $google['categories']['additionalCategories']
			: array();

		$from = array(
			'primary'    => isset( $google_primary['displayName'] ) ? (string) $google_primary['displayName'] : '',
			'additional' => array(),
		);

		foreach ( $google_extra as $category ) {
			$from['additional'][] = isset( $category['displayName'] ) ? (string) $category['displayName'] : (string) ( isset( $category['name'] ) ? $category['name'] : '' );
		}

		$primary_id = self::value( $local, 'primary_category_id' );

		if ( '' === $primary_id ) {
			// A category typed freehand has a name and no id; Google takes
			// only ids, so it cannot be sent however it is worded.
			if ( '' !== self::value( $local, 'primary_category' ) ) {
				$plan['skipped'][] = array(
					'field'  => 'categories',
					'reason' => self::REASON_NO_GOOGLE_ID,
					'google' => $from,
				);
			} else {
				self::skip_or_unchanged( $plan, 'categories', '' !== $from['primary'] ? $from : '' );
			}

			return;
		}

		$extra = array();
		$names = array();

		foreach ( isset( $local['secondary_categories'] ) && is_array( $local['secondary_categories'] ) ? $local['secondary_categories'] : array() as $category ) {
			if ( is_array( $category ) && ! empty( $category['id'] ) ) {
				$extra[] = array( 'name' => GoogleFormat::category( $category['id'] ) );
				$names[] = isset( $category['name'] ) ? (string) $category['name'] : (string) $category['id'];
			}
		}

		// Categories are one field too. With no additional ones chosen here,
		// Google's are kept rather than wiped by naming the field.
		if ( ! $extra && $google_extra ) {
			foreach ( $google_extra as $category ) {
				if ( isset( $category['name'] ) ) {
					$extra[] = array( 'name' => (string) $category['name'] );
				}
			}

			$names = $from['additional'];
		}

		$wanted  = array_merge( array( GoogleFormat::category( $primary_id ) ), array_column( $extra, 'name' ) );
		$current = array( isset( $google_primary['name'] ) ? strtolower( (string) $google_primary['name'] ) : '' );

		foreach ( $google_extra as $category ) {
			$current[] = isset( $category['name'] ) ? strtolower( (string) $category['name'] ) : '';
		}

		if ( $wanted[0] === $current[0] && self::same_set( array_slice( $wanted, 1 ), array_slice( $current, 1 ) ) ) {
			$plan['unchanged'][] = 'categories';

			return;
		}

		$payload = array( 'primaryCategory' => array( 'name' => $wanted[0] ) );

		if ( $extra ) {
			$payload['additionalCategories'] = $extra;
		}

		self::change(
			$step,
			'categories',
			'categories',
			$from,
			array(
				'primary'    => self::value( $local, 'primary_category' ),
				'additional' => $names,
			),
			array( 'categories' => $payload )
		);
	}

	/**
	 * The weekly hours.
	 *
	 * @param array $step   The location step.
	 * @param array $plan   The plan.
	 * @param array $local  This site's profile.
	 * @param array $google The location as Google returned it.
	 * @return void
	 */
	private static function hours( array &$step, array &$plan, array $local, array $google ) {
		$google_periods = isset( $google['regularHours']['periods'] ) && is_array( $google['regularHours']['periods'] )
			? $google['regularHours']['periods']
			: array();

		$days       = isset( $local['days'] ) && is_array( $local['days'] ) ? $local['days'] : array();
		$configured = false;

		foreach ( $days as $day ) {
			if ( ! empty( $day['configured'] ) ) {
				$configured = true;
				break;
			}
		}

		$current = GoogleFormat::periods_signature( $google_periods );

		if ( ! $configured ) {
			self::skip_or_unchanged( $plan, 'hours', $current );

			return;
		}

		$periods = GoogleFormat::periods( $days, $google_periods );
		$wanted  = GoogleFormat::periods_signature( $periods );

		if ( $wanted === $current ) {
			$plan['unchanged'][] = 'hours';

			return;
		}

		self::change( $step, 'hours', 'regularHours', $current, $wanted, array( 'regularHours' => array( 'periods' => $periods ) ) );
	}

	/**
	 * Hours for named dates.
	 *
	 * @param array $step   The location step.
	 * @param array $plan   The plan.
	 * @param array $local  This site's profile.
	 * @param array $google The location as Google returned it.
	 * @return void
	 */
	private static function special_hours( array &$step, array &$plan, array $local, array $google ) {
		$google_periods = isset( $google['specialHours']['specialHourPeriods'] ) && is_array( $google['specialHours']['specialHourPeriods'] )
			? $google['specialHours']['specialHourPeriods']
			: array();

		$rows    = isset( $local['special_rows'] ) && is_array( $local['special_rows'] ) ? $local['special_rows'] : array();
		$current = GoogleFormat::special_signature( $google_periods );

		if ( ! $rows ) {
			self::skip_or_unchanged( $plan, 'special_hours', $current );

			return;
		}

		$periods = GoogleFormat::special_periods( $rows );
		$wanted  = GoogleFormat::special_signature( $periods );

		if ( $wanted === $current ) {
			$plan['unchanged'][] = 'special_hours';

			return;
		}

		self::change( $step, 'special_hours', 'specialHours', $current, $wanted, array( 'specialHours' => array( 'specialHourPeriods' => $periods ) ) );
	}

	/**
	 * The service list, which Google replaces whole.
	 *
	 * @param array $step   The location step.
	 * @param array $plan   The plan.
	 * @param array $local  This site's profile.
	 * @param array $google The location as Google returned it.
	 * @return void
	 */
	private static function services( array &$step, array &$plan, array $local, array $google ) {
		$google_items = isset( $google['serviceItems'] ) && is_array( $google['serviceItems'] ) ? $google['serviceItems'] : array();
		$current      = GoogleFormat::services_signature( $google_items );

		// A free-form service must name a category. The one chosen here is
		// used, or failing that the one the listing already has.
		$category = GoogleFormat::category( self::value( $local, 'primary_category_id' ) );

		if ( '' === $category && isset( $google['categories']['primaryCategory']['name'] ) ) {
			$category = (string) $google['categories']['primaryCategory']['name'];
		}

		$items = GoogleFormat::service_items(
			isset( $local['services'] ) && is_array( $local['services'] ) ? $local['services'] : array(),
			$category,
			self::value( $google, 'languageCode' )
		);

		if ( ! $items ) {
			self::skip_or_unchanged( $plan, 'services', $current );

			return;
		}

		$wanted = GoogleFormat::services_signature( $items );

		if ( $wanted === $current ) {
			$plan['unchanged'][] = 'services';

			return;
		}

		// Google says per listing whether its service list may be changed.
		// Sending one that may not be is a request that can only fail.
		if ( isset( $google['metadata']['canModifyServiceList'] ) && false === $google['metadata']['canModifyServiceList'] ) {
			$plan['skipped'][] = array(
				'field'  => 'services',
				'reason' => self::REASON_NOT_ALLOWED,
				'google' => $current,
			);

			return;
		}

		self::change( $step, 'services', 'serviceItems', $current, $wanted, array( 'serviceItems' => $items ) );
	}

	/**
	 * The appointment link, texting number and WhatsApp link.
	 *
	 * Link attributes like the social ones, with one difference: Google does
	 * not offer every listing all three, and a link it does not offer is a
	 * request that can only be refused. So a link the listing's menu leaves
	 * out is skipped and said so. A menu never read holds nothing back.
	 *
	 * @param array $step   The attributes step.
	 * @param array $plan   The plan.
	 * @param array $local  This site's profile.
	 * @param array $google Google's attributes, by id.
	 * @return void
	 */
	private static function booking( array &$step, array &$plan, array $local, array $google ) {
		$links   = BookingLinks::complete( isset( $local['booking_links'] ) ? $local['booking_links'] : array() );
		$offered = isset( $local['booking_offered'] ) && is_array( $local['booking_offered'] ) ? $local['booking_offered'] : null;

		foreach ( BookingLinks::ATTRIBUTES as $field => $id ) {
			$here    = trim( $links[ $field ] );
			$label   = 'booking.' . $field;
			$current = isset( $google[ $id ]['uriValues'][0]['uri'] ) ? (string) $google[ $id ]['uriValues'][0]['uri'] : '';

			if ( '' === $here ) {
				self::skip_or_unchanged( $plan, $label, $current );
				continue;
			}

			if ( null !== $offered && empty( $offered[ $id ] ) ) {
				$plan['skipped'][] = array(
					'field'  => $label,
					'reason' => self::REASON_NOT_ON_GOOGLE,
					'google' => $current,
				);
				continue;
			}

			if ( BookingLinks::same( $field, $here, $current ) ) {
				$plan['unchanged'][] = $label;
				continue;
			}

			$uri = BookingLinks::to_google( $field, $here );

			self::attribute(
				$step,
				$label,
				$id,
				$current,
				$uri,
				array(
					'name'      => 'attributes/' . $id,
					'valueType' => 'URL',
					'uriValues' => array( array( 'uri' => $uri ) ),
				)
			);
		}
	}

	/**
	 * The step that patches attributes: social links and attribute answers.
	 *
	 * @param array $local      This site's profile.
	 * @param array $attributes Google's attribute values for the location.
	 * @param array $plan       The plan.
	 * @return array
	 */
	private static function attributes_step( array $local, array $attributes, array &$plan ) {
		$step = array(
			'id'      => self::STEP_ATTRIBUTES,
			'fields'  => array(),
			'mask'    => array(),
			'payload' => array( 'attributes' => array() ),
		);

		$google = array();

		foreach ( isset( $attributes['attributes'] ) && is_array( $attributes['attributes'] ) ? $attributes['attributes'] : array() as $attribute ) {
			if ( is_array( $attribute ) && isset( $attribute['name'] ) ) {
				$google[ self::attribute_id( $attribute['name'] ) ] = $attribute;
			}
		}

		$social = isset( $local['social_profiles'] ) && is_array( $local['social_profiles'] ) ? $local['social_profiles'] : array();

		foreach ( $social as $network => $url ) {
			$url   = trim( (string) $url );
			$field = 'social.' . $network;

			if ( ! isset( GoogleFormat::SOCIAL_ATTRIBUTES[ $network ] ) ) {
				if ( '' !== $url ) {
					$plan['skipped'][] = array(
						'field'  => $field,
						'reason' => self::REASON_NOT_ON_GOOGLE,
						'google' => '',
					);
				}

				continue;
			}

			$id      = GoogleFormat::SOCIAL_ATTRIBUTES[ $network ];
			$current = isset( $google[ $id ]['uriValues'][0]['uri'] ) ? (string) $google[ $id ]['uriValues'][0]['uri'] : '';

			if ( '' === $url ) {
				self::skip_or_unchanged( $plan, $field, $current );
				continue;
			}

			if ( GoogleFormat::url_key( $url ) === GoogleFormat::url_key( $current ) ) {
				$plan['unchanged'][] = $field;
				continue;
			}

			self::attribute(
				$step,
				$field,
				$id,
				$current,
				$url,
				array(
					'name'      => 'attributes/' . $id,
					'valueType' => 'URL',
					'uriValues' => array( array( 'uri' => $url ) ),
				)
			);
		}

		self::booking( $step, $plan, $local, $google );

		// Attribute answers changed here since the last push. Only those: an
		// answer that has not changed is not named, so it cannot be disturbed.
		foreach ( isset( $local['attributes'] ) && is_array( $local['attributes'] ) ? $local['attributes'] : array() as $answer ) {
			if ( empty( $answer['is_dirty'] ) || empty( $answer['attribute_id'] ) ) {
				continue;
			}

			$id      = (string) $answer['attribute_id'];
			$value   = self::attribute_value( $id, isset( $answer['value_type'] ) ? (string) $answer['value_type'] : '', isset( $answer['value'] ) ? $answer['value'] : null );
			$current = isset( $google[ $id ] ) ? self::attribute_summary( $google[ $id ] ) : '';

			if ( null === $value ) {
				continue;
			}

			if ( self::attribute_summary( $value ) === $current ) {
				$plan['unchanged'][] = 'attribute.' . $id;
				continue;
			}

			self::attribute( $step, 'attribute.' . $id, $id, $current, self::attribute_summary( $value ), $value );
		}

		$step['mask'] = array_values( array_unique( $step['mask'] ) );

		return $step;
	}

	/**
	 * A stored attribute answer as Google's attribute object.
	 *
	 * @param string $id    Attribute id.
	 * @param string $type  bool | enum | repeated_enum | url.
	 * @param mixed  $value The stored value.
	 * @return array|null
	 */
	private static function attribute_value( $id, $type, $value ) {
		$name = 'attributes/' . $id;

		switch ( $type ) {
			case 'bool':
				return array(
					'name'      => $name,
					'valueType' => 'BOOL',
					'values'    => array( (bool) $value ),
				);

			case 'enum':
				return array(
					'name'      => $name,
					'valueType' => 'ENUM',
					'values'    => array( (string) $value ),
				);

			case 'repeated_enum':
				return array(
					'name'              => $name,
					'valueType'         => 'REPEATED_ENUM',
					'repeatedEnumValue' => array( 'setValues' => array_values( array_map( 'strval', (array) $value ) ) ),
				);

			case 'url':
				$uris = array();

				foreach ( (array) $value as $uri ) {
					$uris[] = array( 'uri' => (string) $uri );
				}

				return array(
					'name'      => $name,
					'valueType' => 'URL',
					'uriValues' => $uris,
				);
		}

		return null;
	}

	/**
	 * A Google attribute reduced to something that can be compared and shown.
	 *
	 * @param array $attribute Google attribute object.
	 * @return string
	 */
	private static function attribute_summary( array $attribute ) {
		if ( isset( $attribute['uriValues'] ) && is_array( $attribute['uriValues'] ) ) {
			$uris = array();

			foreach ( $attribute['uriValues'] as $uri ) {
				$uris[] = GoogleFormat::url_key( isset( $uri['uri'] ) ? $uri['uri'] : '' );
			}

			sort( $uris );

			return implode( ', ', $uris );
		}

		if ( isset( $attribute['repeatedEnumValue']['setValues'] ) && is_array( $attribute['repeatedEnumValue']['setValues'] ) ) {
			$values = array_map( 'strval', $attribute['repeatedEnumValue']['setValues'] );

			sort( $values );

			return implode( ', ', $values );
		}

		if ( isset( $attribute['values'] ) && is_array( $attribute['values'] ) ) {
			$values = array();

			foreach ( $attribute['values'] as $value ) {
				$values[] = is_bool( $value ) ? ( $value ? 'true' : 'false' ) : (string) $value;
			}

			return implode( ', ', $values );
		}

		return '';
	}

	/**
	 * Record a change to an attribute.
	 *
	 * @param array  $step  The attributes step.
	 * @param string $field Field id for the screen.
	 * @param string $id    Google attribute id.
	 * @param mixed  $from  What Google has.
	 * @param mixed  $to    What would be sent.
	 * @param array  $value The attribute object to send.
	 * @return void
	 */
	private static function attribute( array &$step, $field, $id, $from, $to, array $value ) {
		$step['fields'][] = array(
			'field' => $field,
			'from'  => $from,
			'to'    => $to,
		);

		$step['mask'][]                  = 'attributes/' . $id;
		$step['payload']['attributes'][] = $value;
	}

	/**
	 * Compare a plain text field and record the outcome.
	 *
	 * @param array    $step    The location step.
	 * @param array    $plan    The plan.
	 * @param string   $field   Field id for the screen.
	 * @param string   $mask    Google's name for the field.
	 * @param string   $here    This site's value.
	 * @param string   $there   Google's value.
	 * @param callable $payload Builds the payload fragment from the value.
	 * @return void
	 */
	private static function text( array &$step, array &$plan, $field, $mask, $here, $there, $payload ) {
		if ( '' === $here ) {
			self::skip_or_unchanged( $plan, $field, $there );

			return;
		}

		if ( $here === $there ) {
			$plan['unchanged'][] = $field;

			return;
		}

		self::change( $step, $field, $mask, $there, $here, call_user_func( $payload, $here ) );
	}

	/**
	 * Record a change to the location.
	 *
	 * @param array  $step    The location step.
	 * @param string $field   Field id for the screen.
	 * @param string $mask    Google's name for the field.
	 * @param mixed  $from    What Google has.
	 * @param mixed  $to      What would be sent.
	 * @param array  $payload Payload fragment to merge in.
	 * @return void
	 */
	private static function change( array &$step, $field, $mask, $from, $to, array $payload ) {
		$step['fields'][] = array(
			'field' => $field,
			'from'  => $from,
			'to'    => $to,
		);

		$step['mask'][]  = $mask;
		$step['payload'] = array_replace_recursive( $step['payload'], $payload );
	}

	/**
	 * A field this site has nothing for: skipped if Google has something,
	 * unchanged if neither side does.
	 *
	 * @param array  $plan   The plan.
	 * @param string $field  Field id.
	 * @param mixed  $google What Google has; '' or an empty array for nothing.
	 * @return void
	 */
	private static function skip_or_unchanged( array &$plan, $field, $google ) {
		if ( '' === $google || array() === $google ) {
			$plan['unchanged'][] = $field;

			return;
		}

		$plan['skipped'][] = array(
			'field'  => $field,
			'reason' => self::REASON_EMPTY_HERE,
			'google' => $google,
		);
	}

	/**
	 * A trimmed string from an array, '' when absent.
	 *
	 * @param array  $source Array to read.
	 * @param string $key    Key.
	 * @return string
	 */
	private static function value( array $source, $key ) {
		return isset( $source[ $key ] ) && is_scalar( $source[ $key ] ) ? trim( (string) $source[ $key ] ) : '';
	}

	/**
	 * Whether two lists hold the same things, in any order.
	 *
	 * @param string[] $a One list.
	 * @param string[] $b Another.
	 * @return bool
	 */
	private static function same_set( array $a, array $b ) {
		$a = array_values( array_unique( array_filter( $a, 'strlen' ) ) );
		$b = array_values( array_unique( array_filter( $b, 'strlen' ) ) );

		sort( $a );
		sort( $b );

		return $a === $b;
	}

	/**
	 * An attribute id without Google's resource prefixes.
	 *
	 * @param string $name e.g. 'locations/1/attributes/url_facebook' or 'attributes/url_facebook'.
	 * @return string
	 */
	private static function attribute_id( $name ) {
		$name     = (string) $name;
		$position = strrpos( $name, 'attributes/' );

		return false === $position ? $name : substr( $name, $position + strlen( 'attributes/' ) );
	}

	/**
	 * A fingerprint of exactly what a step would send.
	 *
	 * The step request carries it back. If the profile or the listing has
	 * changed in between, the fingerprint no longer matches and the step is
	 * refused, so nothing is sent that the owner did not see in the plan.
	 *
	 * @param array $step The step.
	 * @return string
	 */
	public static function token( array $step ) {
		return substr( hash( 'sha256', (string) wp_json_encode( array( $step['id'], $step['mask'], $step['payload'] ) ) ), 0, 32 );
	}
}
