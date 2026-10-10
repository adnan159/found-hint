<?php
/**
 * Profile section: services.
 *
 * @package FoundHint
 */

namespace FHINT\App\Profile\Sections;

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Core\Limits;
use FHINT\App\Core\ValidationResult;
use FHINT\App\Profile\Profile;
use FHINT\App\Service\Service;
use FHINT\App\Service\ServiceRepository;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * What the business offers, as one ordered list.
 *
 * The card edits services in place and saves them together, so a save
 * carries **the whole list in the order it should appear**: an entry with an
 * `id` is updated, one without is created, and a stored service that is not
 * in the list is removed. That is the same contract Google's own service list
 * has — it too is replaced whole — so what is saved here is what a push sends.
 *
 * Every entry is validated before any is written. A list that is half
 * applied would be worse than one that is refused.
 */
class Services {

	/**
	 * The fields an entry may write. `sort_order` is absent on purpose: the
	 * order is the order of the list.
	 */
	const FIELDS = array(
		'name',
		'slug',
		'description',
		'price',
		'currency',
		'url',
		'status',
		'google_item_type',
		'google_service_type_id',
	);

	/**
	 * The section as stored.
	 *
	 * @return array
	 */
	public static function read() {
		$items = ServiceRepository::all();

		return array(
			'items'        => $items,
			'limits'       => Limits::report( Limits::SERVICES, count( $items ) ),
			// The services Google already knows for this category. Empty until
			// that list has been fetched from Google.
			'google_types' => array(),
		);
	}

	/**
	 * Save the section.
	 *
	 * @param array $fields Fields as sent.
	 * @return true|ValidationResult|WP_Error
	 */
	public static function save( array $fields ) {
		if ( ! array_key_exists( 'items', $fields ) ) {
			return true;
		}

		$validation = new ValidationResult();

		if ( ! is_array( $fields['items'] ) ) {
			$validation->add( 'items', 'services.items.invalid' );

			return $validation;
		}

		if ( ! BusinessRepository::exists() ) {
			return Profile::business_required();
		}

		$existing = array();

		foreach ( ServiceRepository::all() as $service ) {
			$existing[ (int) $service['id'] ] = $service;
		}

		$plan = array();
		$seen = array();

		foreach ( array_values( $fields['items'] ) as $index => $item ) {
			$field = 'items.' . $index;

			if ( ! is_array( $item ) ) {
				$validation->add( $field, 'service.invalid' );
				continue;
			}

			$id      = isset( $item['id'] ) ? (int) $item['id'] : 0;
			$changes = Service::sanitize( array_intersect_key( $item, array_flip( self::FIELDS ) ) );

			if ( $id ) {
				if ( ! isset( $existing[ $id ] ) ) {
					$validation->add( $field . '.id', 'service.not_found' );
					continue;
				}

				if ( isset( $seen[ $id ] ) ) {
					$validation->add( $field . '.id', 'service.duplicate' );
					continue;
				}

				$seen[ $id ] = true;
				$merged      = array_merge( $existing[ $id ], $changes );
			} else {
				// A service named but not slugged takes its slug from the
				// name; the repository then makes it unique.
				if ( empty( $changes['slug'] ) && ! empty( $changes['name'] ) ) {
					$changes['slug'] = sanitize_title( $changes['name'] );
				}

				$merged = array_merge( Service::blank(), $changes );
			}

			$validation->merge( Service::validate( $merged ), $field );

			$plan[] = array(
				'id'      => $id,
				'changes' => $changes,
			);
		}

		if ( ! $validation->is_valid() ) {
			return $validation;
		}

		// The plan limit is only a question when the list grows: a business
		// already over a lowered limit must still be able to edit and remove.
		if ( count( $plan ) > count( $existing ) && ! Limits::can_add( Limits::SERVICES, count( $plan ) - 1 ) ) {
			$limit = Limits::get( Limits::SERVICES );

			return new WP_Error(
				'fhint_service_limit_reached',
				sprintf(
					/* translators: %d: the maximum number allowed on this plan. */
					__( 'This plan allows up to %d of these.', 'foundhint-local-seo' ),
					(int) $limit
				),
				array(
					'status' => 403,
					'limit'  => (int) $limit,
				)
			);
		}

		$order = array();

		foreach ( $plan as $entry ) {
			$saved = $entry['id']
				? ServiceRepository::update( $entry['id'], $entry['changes'] )
				: ServiceRepository::create( $entry['changes'] );

			if ( ! $saved ) {
				return Profile::save_failed();
			}

			$order[] = (int) $saved['id'];
		}

		foreach ( array_keys( $existing ) as $id ) {
			if ( ! in_array( $id, $order, true ) ) {
				ServiceRepository::delete( $id );
			}
		}

		if ( $order ) {
			ServiceRepository::reorder( $order );
		}

		return true;
	}
}
