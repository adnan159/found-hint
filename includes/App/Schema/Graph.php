<?php
/**
 * The JSON-LD graph.
 *
 * @package FoundHint
 */

namespace FHINT\App\Schema;

use FHINT\App\Location\DayOfWeek;
use FHINT\App\Location\Location;
use FHINT\App\Nap\Nap;
use FHINT\App\Service\Service;
use FHINT\App\Service\ServiceRepository;

defined( 'ABSPATH' ) || exit;

/**
 * Builds the structured data describing the business.
 *
 * **Every value comes from `Nap`.** Nothing here reads a repository for a
 * name, phone or address, and nothing here holds its own copy — that is
 * what keeps the markup identical to what the rest of the plugin shows, and
 * stops this plugin from becoming the source of the inconsistency it exists
 * to find.
 *
 * The graph is an array until the last moment. Encoding once, at the edge,
 * means the audit and the admin preview read the same structure the front
 * end publishes rather than parsing a string back out.
 */
class Graph {

	/**
	 * Build the graph for a location.
	 *
	 * @param int $location_id Location to describe, 0 for the primary one.
	 * @return array
	 */
	public static function build( $location_id = 0 ) {
		return self::from_parts(
			Nap::resolve( $location_id ),
			ServiceRepository::all( array( 'status' => Service::STATUS_ACTIVE ) )
		);
	}

	/**
	 * Build the graph from values already in hand.
	 *
	 * Separate from `build()` so the whole of this class can be exercised
	 * without a database, and so the audit can ask what a *hypothetical*
	 * change would publish without writing it first.
	 *
	 * @param array $nap      Resolved NAP values.
	 * @param array $services Active services.
	 * @return array
	 */
	public static function from_parts( array $nap, array $services = array() ) {
		$graph   = array( self::business_node( $nap, $services ) );
		$catalog = self::offer_catalog( $nap, $services );

		if ( $catalog ) {
			$graph[] = $catalog;
		}

		$document = array(
			'@context' => 'https://schema.org',
			'@graph'   => $graph,
		);

		/**
		 * Filter the finished graph.
		 *
		 * The extension point Pro attaches to — adding a node here is how a
		 * feature contributes markup without this class learning about it.
		 *
		 * @param array $document The JSON-LD document.
		 * @param array $nap      The resolved NAP values it was built from.
		 */
		return function_exists( 'apply_filters' )
			? (array) apply_filters( 'fhint_schema_graph', $document, $nap )
			: $document;
	}

	/**
	 * Whether this location should be published at all.
	 *
	 * A LocalBusiness node with no name or no address is not a smaller
	 * answer than a complete one — it is a worse one, because it invites
	 * search engines to trust a record that says nothing. And a permanently
	 * closed place has no business being published as if it were open;
	 * schema.org has no way to say "this is gone", so the honest output is
	 * none.
	 *
	 * @param array $nap Resolved NAP values.
	 * @return bool
	 */
	public static function is_publishable( array $nap ) {
		if ( ! $nap['has_business'] || ! $nap['has_location'] ) {
			return false;
		}

		if ( '' === trim( (string) $nap['name'] ) ) {
			return false;
		}

		if ( empty( $nap['address']['complete'] ) ) {
			return false;
		}

		return Location::STATUS_PERMANENTLY_CLOSED !== $nap['status'];
	}

	/**
	 * What is stopping this location from being published.
	 *
	 * Machine codes, translated in the admin bundle — the same contract the
	 * rest of the plugin uses for validation.
	 *
	 * @param array $nap Resolved NAP values.
	 * @return string[]
	 */
	public static function blockers( array $nap ) {
		$blockers = array();

		if ( ! $nap['has_business'] ) {
			$blockers[] = 'schema.business.missing';
		}

		if ( ! $nap['has_location'] ) {
			$blockers[] = 'schema.location.missing';
		}

		if ( $nap['has_business'] && '' === trim( (string) $nap['name'] ) ) {
			$blockers[] = 'schema.name.missing';
		}

		if ( $nap['has_location'] && empty( $nap['address']['complete'] ) ) {
			$blockers[] = 'schema.address.incomplete';
		}

		if ( Location::STATUS_PERMANENTLY_CLOSED === $nap['status'] ) {
			$blockers[] = 'schema.location.permanently_closed';
		}

		return $blockers;
	}

	/**
	 * Values that are absent but would improve the markup.
	 *
	 * Distinct from a blocker: these do not stop publication, and saying so
	 * is the difference between a checklist and a warning.
	 *
	 * @param array $nap Resolved NAP values.
	 * @return string[]
	 */
	public static function recommendations( array $nap ) {
		$missing = array();

		if ( '' === trim( (string) $nap['phone'] ) ) {
			$missing[] = 'schema.phone.missing';
		}

		if ( '' === trim( (string) $nap['website'] ) ) {
			$missing[] = 'schema.website.missing';
		}

		if ( '' === trim( (string) $nap['logo_url'] ) ) {
			$missing[] = 'schema.logo.missing';
		}

		if ( '' === trim( (string) $nap['description'] ) ) {
			$missing[] = 'schema.description.missing';
		}

		if ( empty( $nap['coordinates']['has_both'] ) ) {
			$missing[] = 'schema.geo.missing';
		}

		if ( empty( $nap['hours']['has_any_hours'] ) ) {
			$missing[] = 'schema.hours.missing';
		}

		return $missing;
	}

	/**
	 * The LocalBusiness node.
	 *
	 * @param array $nap      Resolved NAP values.
	 * @param array $services Active services.
	 * @return array
	 */
	private static function business_node( array $nap, array $services ) {
		$node = array(
			'@type' => self::type( $nap ),
			'@id'   => self::business_id(),
			'name'  => (string) $nap['name'],
		);

		$node = self::add( $node, 'legalName', $nap['legal_name'] );
		$node = self::add( $node, 'description', $nap['description'] );
		$node = self::add( $node, 'telephone', $nap['phone'] );
		$node = self::add( $node, 'email', $nap['email'] );
		$node = self::add( $node, 'url', $nap['website'] );
		$node = self::add( $node, 'priceRange', $nap['price_range'] );

		if ( '' !== trim( (string) $nap['logo_url'] ) ) {
			$node['logo']  = (string) $nap['logo_url'];
			$node['image'] = (string) $nap['logo_url'];
		}

		$address = self::address_node( $nap['address'] );

		if ( $address ) {
			$node['address'] = $address;
		}

		if ( ! empty( $nap['coordinates']['has_both'] ) ) {
			$node['geo'] = array(
				'@type'     => 'GeoCoordinates',
				'latitude'  => $nap['coordinates']['latitude'],
				'longitude' => $nap['coordinates']['longitude'],
			);
		}

		$hours = self::opening_hours( $nap );

		if ( $hours ) {
			$node['openingHoursSpecification'] = $hours;
		}

		$same_as = self::same_as( $nap['social_profiles'] );

		if ( $same_as ) {
			$node['sameAs'] = $same_as;
		}

		if ( self::offer_catalog( $nap, $services ) ) {
			$node['hasOfferCatalog'] = array( '@id' => self::catalog_id() );
		}

		return $node;
	}

	/**
	 * The schema.org type to publish.
	 *
	 * @param array $nap Resolved NAP values.
	 * @return string
	 */
	private static function type( array $nap ) {
		$type = trim( (string) $nap['business_type'] );

		return '' === $type ? 'LocalBusiness' : $type;
	}

	/**
	 * The PostalAddress node.
	 *
	 * @param array $address Address parts from Nap.
	 * @return array
	 */
	private static function address_node( array $address ) {
		$node = array( '@type' => 'PostalAddress' );

		$street = trim( $address['line_1'] . ( '' !== $address['line_2'] ? ' ' . $address['line_2'] : '' ) );

		$node = self::add( $node, 'streetAddress', $street );
		$node = self::add( $node, 'addressLocality', $address['city'] );
		$node = self::add( $node, 'addressRegion', $address['region'] );
		$node = self::add( $node, 'postalCode', $address['postal'] );
		$node = self::add( $node, 'addressCountry', $address['country'] );

		return count( $node ) > 1 ? $node : array();
	}

	/**
	 * Opening hours, as schema.org specifications.
	 *
	 * **A day nobody configured is omitted entirely.** Unset is not closed:
	 * publishing `00:00–00:00` for a day the operator never filled in tells
	 * Google the business is shut then, and that is a claim this plugin has
	 * no basis to make. A day explicitly marked closed *is* published that
	 * way, because there the operator did say so.
	 *
	 * A temporarily closed location publishes no hours at all — its stored
	 * hours describe normal weeks, and normal weeks are not what is
	 * happening.
	 *
	 * @param array $nap Resolved NAP values.
	 * @return array[]
	 */
	private static function opening_hours( array $nap ) {
		if ( Location::STATUS_TEMPORARILY_CLOSED === $nap['status'] ) {
			return array();
		}

		if ( empty( $nap['hours']['days'] ) ) {
			return array();
		}

		$specs = array();

		foreach ( $nap['hours']['days'] as $day ) {
			if ( empty( $day['configured'] ) || empty( $day['periods'] ) ) {
				continue;
			}

			$name = self::day_name( (int) $day['day_of_week'] );

			foreach ( $day['periods'] as $period ) {
				if ( ! empty( $period['is_closed'] ) ) {
					// schema.org's way of saying "shut on this day".
					$specs[] = array(
						'@type'     => 'OpeningHoursSpecification',
						'dayOfWeek' => $name,
						'opens'     => '00:00',
						'closes'    => '00:00',
					);
					continue;
				}

				if ( ! empty( $period['is_24h'] ) ) {
					$specs[] = array(
						'@type'     => 'OpeningHoursSpecification',
						'dayOfWeek' => $name,
						'opens'     => '00:00',
						'closes'    => '23:59',
					);
					continue;
				}

				if ( '' === $period['open_time'] || '' === $period['close_time'] ) {
					continue;
				}

				// A split shift is two specifications for the same day, which
				// is how schema.org expresses a lunch break.
				$specs[] = array(
					'@type'     => 'OpeningHoursSpecification',
					'dayOfWeek' => $name,
					'opens'     => (string) $period['open_time'],
					'closes'    => (string) $period['close_time'],
				);
			}
		}

		return $specs;
	}

	/**
	 * schema.org's name for a day.
	 *
	 * Never translated: these are identifiers in a vocabulary, not text for
	 * a reader, and a localised "Montag" here is markup a consumer cannot
	 * parse.
	 *
	 * @param int $day Day of week, 0 (Sunday) to 6.
	 * @return string
	 */
	private static function day_name( $day ) {
		$names = array(
			DayOfWeek::SUNDAY    => 'Sunday',
			DayOfWeek::MONDAY    => 'Monday',
			DayOfWeek::TUESDAY   => 'Tuesday',
			DayOfWeek::WEDNESDAY => 'Wednesday',
			DayOfWeek::THURSDAY  => 'Thursday',
			DayOfWeek::FRIDAY    => 'Friday',
			DayOfWeek::SATURDAY  => 'Saturday',
		);

		return isset( $names[ $day ] ) ? $names[ $day ] : '';
	}

	/**
	 * Social profile URLs, as sameAs.
	 *
	 * @param array $profiles Social profiles keyed by network.
	 * @return string[]
	 */
	private static function same_as( array $profiles ) {
		$urls = array();

		foreach ( $profiles as $url ) {
			$url = trim( (string) $url );

			if ( '' !== $url ) {
				$urls[] = $url;
			}
		}

		return array_values( array_unique( $urls ) );
	}

	/**
	 * The services this business offers, as an OfferCatalog.
	 *
	 * @param array $nap      Resolved NAP values.
	 * @param array $services Active services.
	 * @return array
	 */
	private static function offer_catalog( array $nap, array $services ) {
		if ( ! $services ) {
			return array();
		}

		$items = array();

		foreach ( $services as $service ) {
			$offer = array(
				'@type'       => 'Offer',
				'itemOffered' => self::service_node( $service ),
			);

			if ( null !== $service['price'] && '' !== $service['price'] ) {
				$offer['price'] = (string) $service['price'];

				if ( '' !== trim( (string) $service['currency'] ) ) {
					$offer['priceCurrency'] = (string) $service['currency'];
				}
			}

			$items[] = $offer;
		}

		return array(
			'@type'           => 'OfferCatalog',
			'@id'             => self::catalog_id(),
			'name'            => (string) $nap['name'],
			'itemListElement' => $items,
		);
	}

	/**
	 * One service, as a Service node.
	 *
	 * @param array $service Service record.
	 * @return array
	 */
	private static function service_node( array $service ) {
		$node = array(
			'@type' => 'Service',
			'name'  => (string) $service['name'],
		);

		$node = self::add( $node, 'description', $service['description'] );
		$node = self::add( $node, 'url', $service['url'] );
		$node = self::add( $node, 'image', $service['image_url'] );

		return $node;
	}

	/**
	 * Stable identifier for the business node.
	 *
	 * An `@id` is what lets other markup on the page point at this node
	 * rather than describing a second, competing business.
	 *
	 * @return string
	 */
	public static function business_id() {
		return self::home() . '#localbusiness';
	}

	/**
	 * Stable identifier for the offer catalog.
	 *
	 * @return string
	 */
	public static function catalog_id() {
		return self::home() . '#services';
	}

	/**
	 * The site's home URL, with a trailing slash.
	 *
	 * @return string
	 */
	private static function home() {
		if ( ! function_exists( 'home_url' ) ) {
			return '/';
		}

		return trailingslashit( home_url( '/' ) );
	}

	/**
	 * Add a property, but only when it has a value.
	 *
	 * Empty properties are worse than absent ones: `"telephone": ""` is a
	 * claim that the business has no phone number.
	 *
	 * @param array  $node  Node being built.
	 * @param string $key   Property name.
	 * @param mixed  $value Value.
	 * @return array
	 */
	private static function add( array $node, $key, $value ) {
		$value = is_string( $value ) ? trim( $value ) : $value;

		if ( '' === $value || null === $value ) {
			return $node;
		}

		$node[ $key ] = $value;

		return $node;
	}
}
