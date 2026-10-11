<?php
/**
 * Publishing the profile to Google: gathering both sides and planning.
 *
 * @package FoundHint
 */

namespace FHINT\App\Google\Push;

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Core\Logger;
use FHINT\App\Google\Client;
use FHINT\App\Google\Connection;
use FHINT\App\Google\GoogleLocationRepository;
use FHINT\App\Location\LocationAttributeRepository;
use FHINT\App\Location\LocationCategories;
use FHINT\App\Location\SpecialHoursRepository;
use FHINT\App\Nap\Nap;
use FHINT\App\Profile\Profile;
use FHINT\App\Service\ServiceRepository;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Reads this site's profile and the listing Google holds, and plans a publish.
 *
 * A publish is one click and several requests: first a **plan**, which this
 * class makes, then one request per step. It is not a single streamed
 * request, because too many hosts and proxies hold a streamed response back
 * until it is finished — the progress would arrive all at once, at the end.
 *
 * **Planning changes nothing, here or on Google.** It makes two reads of the
 * listing — the location and its attribute values — and compares. The reads
 * are fresh on purpose: a plan made against a remembered copy would miss an
 * edit made in Google's own dashboard, and then offer to overwrite it without
 * saying so.
 */
class Publisher {

	const LOCATION_URL   = 'https://mybusinessbusinessinformation.googleapis.com/v1/%s';
	const ATTRIBUTES_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1/%s/attributes';

	/**
	 * Every field a plan compares, and the flags that say what may be edited.
	 */
	const READ_MASK = 'name,languageCode,title,phoneNumbers,categories,websiteUri,regularHours,specialHours,profile,serviceItems,metadata';

	/**
	 * Work out what a publish would send.
	 *
	 * @return array|WP_Error
	 */
	public static function plan() {
		$ready = self::ready();

		if ( is_wp_error( $ready ) ) {
			return $ready;
		}

		$google = Client::get( sprintf( self::LOCATION_URL, $ready['location_name'] ), array( 'readMask' => self::READ_MASK ) );

		if ( is_wp_error( $google ) ) {
			return $google;
		}

		$attributes = Client::get( sprintf( self::ATTRIBUTES_URL, $ready['location_name'] ) );

		if ( is_wp_error( $attributes ) ) {
			return $attributes;
		}

		$plan = Plan::make( self::local(), (array) $google, (array) $attributes );

		$plan['listing'] = array(
			'location' => $ready['location_name'],
			'title'    => isset( $google['title'] ) ? (string) $google['title'] : '',
			'maps_url' => isset( $google['metadata']['mapsUri'] ) ? (string) $google['metadata']['mapsUri'] : '',
			'read_at'  => gmdate( 'Y-m-d H:i:s' ),
		);

		Logger::info(
			'google',
			'google.publish_planned',
			sprintf(
				/* translators: 1: number of steps, 2: number of fields left alone. */
				__( 'Planned a publish: %1$d steps, %2$d fields left alone.', 'foundhint-local-seo' ),
				count( $plan['steps'] ),
				count( $plan['skipped'] )
			)
		);

		return $plan;
	}

	/**
	 * Run one step of a publish: the only thing here that writes to Google.
	 *
	 * The step is **planned again before it is sent**, from a fresh read of
	 * the one thing it touches, and the fingerprint the caller brings must
	 * match that fresh plan. If the profile was edited in another tab, or the
	 * listing in Google's dashboard, since the owner looked at the plan, the
	 * fingerprints differ and nothing is sent — what reaches Google is always
	 * exactly what somebody saw and agreed to.
	 *
	 * With `$validate_only`, Google checks the request and changes nothing.
	 * Only the location step can be checked that way; Google offers no dry
	 * run for attributes.
	 *
	 * @param string $id            Step id: 'location' or 'attributes'.
	 * @param string $token         The fingerprint from the plan.
	 * @param bool   $validate_only Ask Google to check without changing.
	 * @return array|WP_Error
	 */
	public static function step( $id, $token, $validate_only = false ) {
		$id = (string) $id;

		if ( ! in_array( $id, array( Plan::STEP_LOCATION, Plan::STEP_ATTRIBUTES ), true ) ) {
			return new WP_Error(
				'fhint_unknown_step',
				__( 'That is not a step of a publish.', 'foundhint-local-seo' ),
				array( 'status' => 400 )
			);
		}

		if ( Plan::STEP_ATTRIBUTES === $id && $validate_only ) {
			return new WP_Error(
				'fhint_validate_only_unsupported',
				__( 'Google cannot check links and attributes without saving them.', 'foundhint-local-seo' ),
				array( 'status' => 400 )
			);
		}

		$ready = self::ready();

		if ( is_wp_error( $ready ) ) {
			return $ready;
		}

		$location_url   = sprintf( self::LOCATION_URL, $ready['location_name'] );
		$attributes_url = sprintf( self::ATTRIBUTES_URL, $ready['location_name'] );

		// Only the half this step touches is read again.
		if ( Plan::STEP_LOCATION === $id ) {
			$google = Client::get( $location_url, array( 'readMask' => self::READ_MASK ) );

			if ( is_wp_error( $google ) ) {
				return $google;
			}

			$plan = Plan::make( self::local(), (array) $google, array() );
		} else {
			$attributes = Client::get( $attributes_url );

			if ( is_wp_error( $attributes ) ) {
				return $attributes;
			}

			$plan = Plan::make( self::local(), array(), (array) $attributes );
		}

		$step = null;

		foreach ( $plan['steps'] as $candidate ) {
			if ( $id === $candidate['id'] ) {
				$step = $candidate;
			}
		}

		if ( null === $step ) {
			return new WP_Error(
				'fhint_publish_nothing_to_send',
				__( 'There is nothing left to send for this step. Google already has it.', 'foundhint-local-seo' ),
				array( 'status' => 409 )
			);
		}

		if ( ! hash_equals( (string) $step['token'], (string) $token ) ) {
			return new WP_Error(
				'fhint_publish_stale',
				__( 'Your profile or your Google listing has changed since this was prepared. Review the changes again before publishing.', 'foundhint-local-seo' ),
				array( 'status' => 409 )
			);
		}

		if ( Plan::STEP_LOCATION === $id ) {
			$query = array( 'updateMask' => implode( ',', $step['mask'] ) );

			if ( $validate_only ) {
				$query['validateOnly'] = 'true';
			}

			$sent = Client::patch( $location_url, $query, $step['payload'] );
		} else {
			$sent = Client::patch(
				$attributes_url,
				array( 'attributeMask' => implode( ',', $step['mask'] ) ),
				array(
					'name'       => $ready['location_name'] . '/attributes',
					'attributes' => $step['payload']['attributes'],
				)
			);
		}

		$fields = array_column( $step['fields'], 'field' );

		if ( is_wp_error( $sent ) ) {
			// Field names only: what was being sent is the owner's data, and
			// the log is for events.
			Logger::error(
				'google',
				'google.publish_refused',
				$sent->get_error_message(),
				array(
					'metadata' => array(
						'step'   => $id,
						'fields' => $fields,
					),
				)
			);

			return self::refusal( $sent, $id );
		}

		$pushed_at = null;

		if ( ! $validate_only ) {
			GoogleLocationRepository::mark_pushed( $ready['location_name'] );

			$pushed_at = gmdate( 'Y-m-d H:i:s' );

			if ( Plan::STEP_ATTRIBUTES === $id ) {
				$answers = array();

				foreach ( $step['mask'] as $name ) {
					$answers[] = substr( (string) $name, strlen( 'attributes/' ) );
				}

				$location = Profile::location();

				if ( $location ) {
					LocationAttributeRepository::mark_synced( (int) $location['id'], $answers );
				}
			}

			Logger::info(
				'google',
				'google.published',
				__( 'Published changes to the Google Business Profile.', 'foundhint-local-seo' ),
				array(
					'metadata' => array(
						'step'   => $id,
						'fields' => $fields,
					),
				)
			);
		}

		return array(
			'step'          => $id,
			'ok'            => true,
			'validate_only' => (bool) $validate_only,
			'fields'        => $fields,
			'pushed_at'     => $pushed_at,
		);
	}

	/**
	 * Turn Google's refusal of a write into one a form can show.
	 *
	 * Google's message for a rejected value is "Request contains an invalid
	 * argument", which helps nobody. What it *also* sends is a reason and the
	 * field at fault — `PROFILE_DESCRIPTION_CONTAINS_URL` on
	 * `profile.description`. Those become this plugin's usual validation
	 * shape, `fields` keyed by field with a code each, so the message lands
	 * on the input that caused it exactly as a local validation error would.
	 *
	 * Anything that is not a rejected value — no permission, over quota,
	 * Google unreachable — is passed through as it is: there is no field to
	 * blame for those.
	 *
	 * @param WP_Error $sent The error the client returned.
	 * @param string   $step The step that was being run.
	 * @return WP_Error
	 */
	public static function refusal( WP_Error $sent, $step ) {
		$data    = $sent->get_error_data();
		$data    = is_array( $data ) ? $data : array();
		$details = isset( $data['google_details'] ) && is_array( $data['google_details'] ) ? $data['google_details'] : array();

		if ( 400 !== (int) ( isset( $data['http_status'] ) ? $data['http_status'] : 0 ) || ! $details ) {
			return $sent;
		}

		$fields = array();

		foreach ( $details as $detail ) {
			if ( ! is_array( $detail ) ) {
				continue;
			}

			if ( isset( $detail['reason'] ) ) {
				$mask  = isset( $detail['metadata']['field_mask'] ) ? (string) $detail['metadata']['field_mask'] : '';
				$field = self::field_for( $mask );

				$fields[ $field ][] = 'google.' . strtolower( (string) $detail['reason'] );
			}

			foreach ( isset( $detail['fieldViolations'] ) && is_array( $detail['fieldViolations'] ) ? $detail['fieldViolations'] : array() as $violation ) {
				$field = self::field_for( isset( $violation['field'] ) ? (string) $violation['field'] : '' );

				$fields[ $field ][] = 'google.invalid_value';
			}
		}

		if ( ! $fields ) {
			return $sent;
		}

		foreach ( $fields as $field => $codes ) {
			$fields[ $field ] = array_values( array_unique( $codes ) );
		}

		return new WP_Error(
			'fhint_google_rejected',
			__( 'Google did not accept some of these values. Nothing was changed on your listing.', 'foundhint-local-seo' ),
			array(
				'status' => 400,
				'step'   => (string) $step,
				'fields' => $fields,
			)
		);
	}

	/**
	 * Google's name for a field, as the field id the plan uses.
	 *
	 * Google reports the field in snake case and sometimes with a path under
	 * it (`regular_hours.periods[0].open_time.hours`); only the part that
	 * says which card it belongs to matters here.
	 *
	 * @param string $mask Google's field path.
	 * @return string A plan field id, or 'step' when it belongs to none.
	 */
	public static function field_for( $mask ) {
		$raw = strtolower( trim( (string) $mask ) );

		// An attribute keeps its underscores: they are part of its id.
		$position = strpos( $raw, 'attributes/' );

		if ( false !== $position ) {
			$id      = substr( $raw, $position + strlen( 'attributes/' ) );
			$network = array_search( $id, GoogleFormat::SOCIAL_ATTRIBUTES, true );

			return false !== $network ? 'social.' . $network : 'attribute.' . $id;
		}

		$mask = str_replace( '_', '', $raw );

		$map = array(
			'profile.description' => 'description',
			'title'               => 'name',
			'websiteuri'          => 'website',
			'phonenumbers'        => 'phone',
			'categories'          => 'categories',
			'regularhours'        => 'hours',
			'specialhours'        => 'special_hours',
			'serviceitems'        => 'services',
		);

		foreach ( $map as $prefix => $field ) {
			if ( 0 === strpos( $mask, $prefix ) ) {
				return $field;
			}
		}

		return 'step';
	}

	/**
	 * This site's profile, flattened into what a plan compares.
	 *
	 * Phone and website come through `Nap`, so a location's own number wins
	 * over the business's — the same resolution the website's markup uses.
	 *
	 * @return array
	 */
	public static function local() {
		$business = BusinessRepository::get();
		$business = $business ? $business : array();
		// The location the request chose, so a second branch is compared with
		// its own hours and attributes and not with the primary one's.
		$selected = Profile::location();
		$nap      = Nap::resolve( $selected ? (int) $selected['id'] : 0 );
		$location = (int) $nap['location_id'];
		// A listing is sent the categories of its own location.
		$categories = LocationCategories::resolve( $selected, $business );

		return array(
			'name'                 => isset( $business['name'] ) ? (string) $business['name'] : '',
			'description'          => isset( $business['description'] ) ? (string) $business['description'] : '',
			'website'              => (string) $nap['website'],
			'phone'                => (string) $nap['phone'],
			'primary_category'     => $categories['primary_category'],
			'primary_category_id'  => $categories['primary_category_id'],
			'secondary_categories' => $categories['secondary_categories'],
			'days'                 => isset( $nap['hours']['days'] ) && is_array( $nap['hours']['days'] ) ? $nap['hours']['days'] : array(),
			'special_rows'         => SpecialHoursRepository::for_location( $location ),
			'services'             => ServiceRepository::all(),
			'social_profiles'      => isset( $business['social_profiles'] ) && is_array( $business['social_profiles'] ) ? $business['social_profiles'] : array(),
			'attributes'           => $location ? LocationAttributeRepository::for_location( $location ) : array(),
		);
	}

	/**
	 * Whether a publish can be attempted at all, and to which listing.
	 *
	 * @return array|WP_Error `{ location_name, account_name }`.
	 */
	public static function ready() {
		if ( Connection::STATUS_CONNECTED !== Connection::status() ) {
			return new WP_Error(
				'fhint_google_not_connected',
				__( 'Connect your Google account before publishing.', 'foundhint-local-seo' ),
				array( 'status' => 409 )
			);
		}

		if ( ! BusinessRepository::exists() ) {
			return Profile::business_required();
		}

		$link = Profile::google_location();

		if ( ! $link ) {
			return new WP_Error(
				'fhint_google_not_mapped',
				__( 'Choose which Google Business Profile this location is before publishing.', 'foundhint-local-seo' ),
				array( 'status' => 409 )
			);
		}

		return array(
			'location_name' => (string) $link['location_name'],
			'account_name'  => (string) $link['account_name'],
		);
	}
}
