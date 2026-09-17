<?php
/**
 * The JSON-LD graph and who publishes it.
 *
 * Run with plain PHP: `php tests/Smoke/schema-graph.php`.
 *
 * `Graph::from_parts()` takes the NAP values and services as arguments, so
 * everything the front end publishes can be checked here without a
 * database. The rules that matter most are the ones about *not* publishing:
 * an unset day is not a closed day, and an incomplete record is not a
 * smaller answer than a complete one.
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\App\Location\Location;
use FHINT\App\Schema\Graph;
use FHINT\App\Schema\Ownership;

echo "Schema graph\n";

/**
 * A complete, publishable business.
 *
 * @param array $overrides Values to replace.
 * @return array
 */
function nap( array $overrides = array() ) {
	$base = array(
		'has_business'    => true,
		'has_location'    => true,
		'name'            => 'Northside Dental Care',
		'business_name'   => 'Northside Dental Care',
		'legal_name'      => 'Northside Dental Care LLC',
		'business_type'   => 'Dentist',
		'description'     => 'A dental practice in Austin.',
		'phone'           => '+1 512 555 0134',
		'email'           => 'hello@northsidedental.test',
		'website'         => 'https://northsidedental.test',
		'logo_url'        => 'https://northsidedental.test/logo.png',
		'price_range'     => '$$',
		'social_profiles' => array( 'facebook' => 'https://facebook.com/northside' ),
		'address'         => array(
			'line_1'    => '401 Congress Ave',
			'line_2'    => 'Suite 200',
			'city'      => 'Austin',
			'region'    => 'TX',
			'postal'    => '78701',
			'country'   => 'US',
			'formatted' => '401 Congress Ave, Austin, TX 78701, US',
			'complete'  => true,
		),
		'coordinates'     => array(
			'latitude'  => 30.2672,
			'longitude' => -97.7431,
			'has_both'  => true,
		),
		'timezone'        => 'America/Chicago',
		'status'          => Location::STATUS_ACTIVE,
		'hours'           => hours( array() ),
		'location_id'     => 1,
		'business_id'     => 1,
	);

	return array_merge( $base, $overrides );
}

/**
 * An hours payload in the shape OpeningHours::to_payload() produces.
 *
 * @param array $by_day Day number => list of periods, or 'unset' to omit.
 * @return array
 */
function hours( array $by_day ) {
	$days          = array();
	$has_any_hours = false;
	$count         = 0;

	foreach ( array( 1, 2, 3, 4, 5, 6, 0 ) as $day ) {
		$periods    = isset( $by_day[ $day ] ) ? $by_day[ $day ] : array();
		$configured = isset( $by_day[ $day ] );

		foreach ( $periods as $period ) {
			$count++;

			if ( empty( $period['is_closed'] ) ) {
				$has_any_hours = true;
			}
		}

		$days[] = array(
			'day_of_week' => $day,
			'day_name'    => 'Day ' . $day,
			'configured'  => $configured,
			'periods'     => $periods,
		);
	}

	return array(
		'days'          => $days,
		'has_any_hours' => $has_any_hours,
		'period_count'  => $count,
	);
}

/**
 * One opening period.
 *
 * @param string $open  Opening time.
 * @param string $close Closing time.
 * @param array  $flags Extra flags.
 * @return array
 */
function period( $open, $close, array $flags = array() ) {
	return array_merge(
		array(
			'period_index' => 0,
			'open_time'    => $open,
			'close_time'   => $close,
			'is_closed'    => false,
			'is_24h'       => false,
			'is_overnight' => false,
		),
		$flags
	);
}

/**
 * The LocalBusiness node out of a built document.
 *
 * @param array $document Built graph.
 * @return array
 */
function business_node( array $document ) {
	foreach ( $document['@graph'] as $node ) {
		if ( isset( $node['@type'] ) && 'OfferCatalog' !== $node['@type'] ) {
			return $node;
		}
	}

	return array();
}

// -- Shape -----------------------------------------------------------------

$document = Graph::from_parts( nap() );

check_same( 'https://schema.org', $document['@context'], 'the document declares the schema.org context' );
check( isset( $document['@graph'] ), 'and carries a @graph' );

$node = business_node( $document );

check_same( 'Dentist', $node['@type'], 'the configured business type becomes the node type' );
check_same( 'Northside Dental Care', $node['name'], 'the name comes from Nap' );
check_same( 'Northside Dental Care LLC', $node['legalName'], 'the legal name is published separately' );
check_same( '+1 512 555 0134', $node['telephone'], 'the phone is published as telephone' );
check_same( 'https://northsidedental.test', $node['url'], 'the website is published as url' );
check_same( '$$', $node['priceRange'], 'the price range is published' );
check( ! empty( $node['@id'] ), 'the node carries a stable @id' );
check(
	false !== strpos( $node['@id'], '#localbusiness' ),
	'and the @id is anchored, so other markup can point at this node'
);

// An unset business type falls back to the generic type rather than
// publishing an empty one.
$node = business_node( Graph::from_parts( nap( array( 'business_type' => '' ) ) ) );
check_same( 'LocalBusiness', $node['@type'], 'a missing type falls back to LocalBusiness' );

// -- Address ---------------------------------------------------------------

$node = business_node( Graph::from_parts( nap() ) );

check_same( 'PostalAddress', $node['address']['@type'], 'the address is a PostalAddress' );
check_same( '401 Congress Ave Suite 200', $node['address']['streetAddress'], 'both address lines are joined' );
check_same( 'Austin', $node['address']['addressLocality'], 'the city is the locality' );
check_same( 'TX', $node['address']['addressRegion'], 'the region is published' );
check_same( '78701', $node['address']['postalCode'], 'the postal code is published' );
check_same( 'US', $node['address']['addressCountry'], 'the country is published' );

check_same( 'GeoCoordinates', $node['geo']['@type'], 'coordinates are published as GeoCoordinates' );
check_same( 30.2672, $node['geo']['latitude'], 'latitude is a number, not a string' );

// -- Empty values are omitted, never published empty -----------------------
//
// `"telephone": ""` is not an absent claim, it is the claim that the
// business has no phone number.

$node = business_node(
	Graph::from_parts(
		nap(
			array(
				'phone'           => '',
				'email'           => '',
				'website'         => '',
				'legal_name'      => '',
				'description'     => '',
				'price_range'     => '',
				'logo_url'        => '',
				'social_profiles' => array(),
				'coordinates'     => array( 'latitude' => null, 'longitude' => null, 'has_both' => false ),
			)
		)
	)
);

foreach ( array( 'telephone', 'email', 'url', 'legalName', 'description', 'priceRange', 'logo', 'image', 'sameAs', 'geo' ) as $property ) {
	check( ! array_key_exists( $property, $node ), "an empty {$property} is omitted rather than published empty" );
}

// Whitespace counts as empty — a space in a phone field is not a number.
$node = business_node( Graph::from_parts( nap( array( 'phone' => '   ' ) ) ) );
check( ! array_key_exists( 'telephone', $node ), 'a whitespace-only value is treated as absent' );

// -- Opening hours ---------------------------------------------------------
//
// The three-state model is the whole point: unset, closed, open. Publishing
// a closed day for a day nobody filled in tells Google the business is shut
// then, which is a claim this plugin has no basis to make.

$node = business_node(
	Graph::from_parts(
		nap(
			array(
				'hours' => hours(
					array(
						1 => array( period( '09:00', '17:00' ) ),
						2 => array( period( '', '', array( 'is_closed' => true ) ) ),
						// Wednesday deliberately absent: never configured.
						4 => array( period( '09:00', '12:00' ), period( '13:00', '17:00' ) ),
						5 => array( period( '', '', array( 'is_24h' => true ) ) ),
					)
				),
			)
		)
	)
);

$specs = $node['openingHoursSpecification'];
$days  = array();

foreach ( $specs as $spec ) {
	$days[] = $spec['dayOfWeek'];
}

check( ! in_array( 'Wednesday', $days, true ), 'an unset day is omitted entirely — unset is not closed' );
check( ! in_array( 'Saturday', $days, true ), 'as is every other day nobody configured' );
check( in_array( 'Monday', $days, true ), 'a day with hours is published' );
check( in_array( 'Tuesday', $days, true ), 'an explicitly closed day IS published — there the operator did say so' );

$monday = null;
$tuesday = null;
$thursday = array();
$friday = null;

foreach ( $specs as $spec ) {
	if ( 'Monday' === $spec['dayOfWeek'] ) {
		$monday = $spec;
	}
	if ( 'Tuesday' === $spec['dayOfWeek'] ) {
		$tuesday = $spec;
	}
	if ( 'Thursday' === $spec['dayOfWeek'] ) {
		$thursday[] = $spec;
	}
	if ( 'Friday' === $spec['dayOfWeek'] ) {
		$friday = $spec;
	}
}

check_same( 'OpeningHoursSpecification', $monday['@type'], 'each entry is an OpeningHoursSpecification' );
check_same( '09:00', $monday['opens'], 'opening time is published' );
check_same( '17:00', $monday['closes'], 'closing time is published' );

check_same( '00:00', $tuesday['opens'], 'a closed day opens at 00:00' );
check_same( '00:00', $tuesday['closes'], 'and closes at 00:00 — schema.org for "shut"' );

check_same( 2, count( $thursday ), 'a split shift is two specifications for the same day' );
check_same( '09:00', $thursday[0]['opens'], 'the morning shift is first' );
check_same( '13:00', $thursday[1]['opens'], 'and the afternoon shift second' );

check_same( '00:00', $friday['opens'], 'a 24-hour day opens at 00:00' );
check_same( '23:59', $friday['closes'], 'and closes at 23:59' );

// Day names are vocabulary identifiers, never translated.
check( in_array( 'Monday', $days, true ), 'day names are the schema.org English identifiers' );

// No hours configured at all means the property is absent, not empty.
$node = business_node( Graph::from_parts( nap( array( 'hours' => hours( array() ) ) ) ) );
check( ! array_key_exists( 'openingHoursSpecification', $node ), 'no configured hours publishes no specification' );

// -- Temporarily closed ----------------------------------------------------
//
// The stored hours describe normal weeks. Normal weeks are not what is
// happening, so publishing them would be actively misleading.

$node = business_node(
	Graph::from_parts(
		nap(
			array(
				'status' => Location::STATUS_TEMPORARILY_CLOSED,
				'hours'  => hours( array( 1 => array( period( '09:00', '17:00' ) ) ) ),
			)
		)
	)
);

check( ! array_key_exists( 'openingHoursSpecification', $node ), 'a temporarily closed location publishes no hours' );
check_same( 'Northside Dental Care', $node['name'], 'but is still published — it has not gone away' );

// -- Services --------------------------------------------------------------

$services = array(
	array(
		'name'        => 'Routine check-up',
		'description' => 'A regular examination.',
		'url'         => 'https://northsidedental.test/check-up',
		'image_url'   => '',
		'price'       => '80.00',
		'currency'    => 'USD',
	),
	array(
		'name'        => 'Teeth whitening',
		'description' => '',
		'url'         => '',
		'image_url'   => '',
		'price'       => null,
		'currency'    => '',
	),
);

$document = Graph::from_parts( nap(), $services );
$catalog  = null;

foreach ( $document['@graph'] as $candidate ) {
	if ( isset( $candidate['@type'] ) && 'OfferCatalog' === $candidate['@type'] ) {
		$catalog = $candidate;
	}
}

check( null !== $catalog, 'services are published as an OfferCatalog' );
check_same( 2, count( $catalog['itemListElement'] ), 'every active service becomes an offer' );
check_same( 'Offer', $catalog['itemListElement'][0]['@type'], 'each item is an Offer' );
check_same( 'Service', $catalog['itemListElement'][0]['itemOffered']['@type'], 'wrapping a Service' );
check_same( 'Routine check-up', $catalog['itemListElement'][0]['itemOffered']['name'], 'with its name' );
check_same( '80.00', $catalog['itemListElement'][0]['price'], 'a priced service publishes its price' );
check_same( 'USD', $catalog['itemListElement'][0]['priceCurrency'], 'with the currency' );
check(
	! array_key_exists( 'price', $catalog['itemListElement'][1] ),
	'a service with no price publishes no price, rather than zero'
);

$node = business_node( $document );
check_same( $catalog['@id'], $node['hasOfferCatalog']['@id'], 'the business points at the catalog by @id' );

// No services means no catalog node at all.
$document = Graph::from_parts( nap() );
check_same( 1, count( $document['@graph'] ), 'with no services the graph is just the business' );
check( ! array_key_exists( 'hasOfferCatalog', business_node( $document ) ), 'and nothing points at a catalog' );

// -- Publishability --------------------------------------------------------

check( Graph::is_publishable( nap() ), 'a complete record is publishable' );
check_same( array(), Graph::blockers( nap() ), 'and has no blockers' );

$cases = array(
	array( array( 'has_business' => false ), 'schema.business.missing', 'no business' ),
	array( array( 'has_location' => false ), 'schema.location.missing', 'no location' ),
	array( array( 'name' => '' ), 'schema.name.missing', 'no name' ),
	array( array( 'status' => Location::STATUS_PERMANENTLY_CLOSED ), 'schema.location.permanently_closed', 'permanently closed' ),
);

foreach ( $cases as $case ) {
	list( $overrides, $code, $label ) = $case;

	check( ! Graph::is_publishable( nap( $overrides ) ), "{$label}: not publishable" );
	check( in_array( $code, Graph::blockers( nap( $overrides ) ), true ), "{$label}: reports {$code}" );
}

$incomplete = nap();
$incomplete['address']['complete'] = false;

check( ! Graph::is_publishable( $incomplete ), 'an incomplete address is not publishable' );
check( in_array( 'schema.address.incomplete', Graph::blockers( $incomplete ), true ), 'and says so' );

// Recommendations are not blockers — the difference between a warning and
// a refusal.
$thin = nap(
	array(
		'phone'       => '',
		'website'     => '',
		'logo_url'    => '',
		'description' => '',
		'coordinates' => array( 'latitude' => null, 'longitude' => null, 'has_both' => false ),
		'hours'       => hours( array() ),
	)
);

check( Graph::is_publishable( $thin ), 'a thin but complete record still publishes' );
check_same( array(), Graph::blockers( $thin ), 'with no blockers' );
check_same( 6, count( Graph::recommendations( $thin ) ), 'but every absent improvement is listed' );
check( in_array( 'schema.hours.missing', Graph::recommendations( $thin ), true ), 'including missing hours' );
// A genuinely full record — the default fixture has no hours configured,
// so hours have to be supplied for there to be nothing left to recommend.
$full = nap( array( 'hours' => hours( array( 1 => array( period( '09:00', '17:00' ) ) ) ) ) );

check_same( array(), Graph::recommendations( $full ), 'a full record has nothing to recommend' );

// -- Ownership -------------------------------------------------------------

$GLOBALS['__options'] = array();

check_same( Ownership::MODE_AUTO, Ownership::mode(), 'auto is the default mode' );
check( Ownership::should_publish(), 'with nothing else installed, auto publishes' );

$GLOBALS['__options']['fhint_settings'] = array( 'schema' => array( 'mode' => Ownership::MODE_DISABLED ) );
check( ! Ownership::should_publish(), 'disabled never publishes' );

$GLOBALS['__options']['fhint_settings'] = array( 'schema' => array( 'mode' => Ownership::MODE_SEO_PLUGIN ) );
check( ! Ownership::should_publish(), 'seo_plugin hands ownership over' );

$GLOBALS['__options']['fhint_settings'] = array( 'schema' => array( 'mode' => Ownership::MODE_PLUGIN ) );
check( Ownership::should_publish(), 'plugin always publishes' );

// An unknown stored value falls back rather than disabling output on a
// typo.
$GLOBALS['__options']['fhint_settings'] = array( 'schema' => array( 'mode' => 'nonsense' ) );
check_same( Ownership::MODE_AUTO, Ownership::mode(), 'an unrecognised mode falls back to auto' );

// -- Auto defers only to a plugin known to publish LocalBusiness -----------
//
// Deferring to any SEO plugin would leave many sites silently publishing
// nothing, which is the worse failure because it is invisible.

$GLOBALS['__options'] = array();
$GLOBALS['__filters'] = array();

add_filter(
	'fhint_schema_detected_plugins',
	static function () {
		return array(
			array( 'id' => 'other', 'name' => 'Some SEO Plugin', 'emits_local_business' => null, 'reason' => 'unknown' ),
		);
	}
);

check( Ownership::should_publish(), 'auto still publishes when it cannot tell whether another plugin does' );
check( Ownership::possible_conflict(), 'but reports a possible conflict' );
check( ! Ownership::someone_else_publishes(), 'and does not claim someone else is publishing' );

$GLOBALS['__filters'] = array();

add_filter(
	'fhint_schema_detected_plugins',
	static function () {
		return array(
			array( 'id' => 'other', 'name' => 'Some SEO Plugin', 'emits_local_business' => true, 'reason' => 'known' ),
		);
	}
);

check( ! Ownership::should_publish(), 'auto stands aside for a plugin known to publish LocalBusiness' );
check( Ownership::someone_else_publishes(), 'and says so' );

$status = Ownership::status();
check( $status['deferring_to_plugin'], 'the status explains that it is deferring' );

// Explicitly choosing to publish overrides the detection.
$GLOBALS['__options']['fhint_settings'] = array( 'schema' => array( 'mode' => Ownership::MODE_PLUGIN ) );
check( Ownership::should_publish(), 'an explicit choice to publish beats detection' );

// -- The graph is filterable -----------------------------------------------

$GLOBALS['__filters'] = array();

add_filter(
	'fhint_schema_graph',
	static function ( $document ) {
		$document['@graph'][] = array( '@type' => 'WebSite' );
		return $document;
	}
);

$document = Graph::from_parts( nap() );

check_same( 2, count( $document['@graph'] ), 'an extension can contribute a node' );

$GLOBALS['__filters'] = array();

// -- What actually reaches the page ---------------------------------------
//
// The output path runs on every public request, so it gets checked rather
// than assumed. The cache is primed directly, which is also what keeps this
// suite free of a database.

$GLOBALS['__options'] = array();
$GLOBALS['__filters'] = array();
$GLOBALS['__is_feed']  = false;
$GLOBALS['__is_embed'] = false;

/**
 * Capture what Frontend\Schema prints.
 *
 * @return string
 */
function render_head() {
	ob_start();
	\FHINT\Frontend\Schema::render();

	return (string) ob_get_clean();
}

/**
 * Put a graph straight into the cache, bypassing the repositories.
 *
 * @param array $graph Document to serve.
 * @return void
 */
function prime_cache( array $graph ) {
	$GLOBALS['__options']['fhint_data_changed_at'] = 1000;
	$GLOBALS['__options'][ \FHINT\App\Schema\SchemaCache::OPTION ] = array(
		'location_0' => array(
			'stamp' => 1000,
			'graph' => $graph,
		),
	);
}

prime_cache( Graph::from_parts( nap() ) );

// The guard holds: this harness has no business record, so nothing is
// publishable and nothing is printed, whatever the cache holds.
check_same( '', render_head(), 'nothing is printed when there is no publishable record' );

// The tag itself, checked directly — the positive path through render()
// needs a database, this does not.
$tag = \FHINT\Frontend\Schema::script_tag( Graph::from_parts( nap() ) );

check( false !== strpos( $tag, '<script type="application/ld+json">' ), 'the tag declares the ld+json type' );
check( false !== strpos( $tag, '</script>' ), 'and is closed' );
check( false !== strpos( $tag, 'Northside Dental Care' ), 'and carries the business name' );

$payload = trim( str_replace( array( '<script type="application/ld+json">', '</script>' ), '', $tag ) );

check( null !== json_decode( $payload, true ), 'what is printed between the tags is valid JSON' );

// An empty graph prints nothing rather than an empty script element.
check_same( '', \FHINT\Frontend\Schema::script_tag( array() ), 'an empty graph prints no tag at all' );
check_same( '', \FHINT\Frontend\Schema::script_tag( array( '@graph' => array() ) ), 'and neither does an empty @graph' );

// -- Escaping --------------------------------------------------------------
//
// A stored value containing `</script>` would end the element early and
// turn structured data into markup. JSON_HEX_TAG is what stops that, and it
// is worth checking rather than trusting.

$hostile = Graph::from_parts( nap( array( 'name' => 'Evil </script><img src=x onerror=alert(1)>' ) ) );
$tag     = \FHINT\Frontend\Schema::script_tag( $hostile );

// One closing tag in the output: the real one, at the end.
check_same( 1, substr_count( $tag, '</script>' ), 'a hostile name cannot close the script element early' );
check( false === strpos( $tag, '<img' ), 'nor smuggle a tag of any kind into the page' );
check( false !== strpos( $tag, '\\u003C' ), 'because < is encoded as \\u003C' );

// Escaped, not discarded — the value still decodes back intact.
$payload = trim( str_replace( array( '<script type="application/ld+json">', '</script>' ), '', $tag ) );
$decoded = json_decode( $payload, true );

check_same(
	'Evil </script><img src=x onerror=alert(1)>',
	$decoded['@graph'][0]['name'],
	'and the original value decodes back intact'
);

// -- The guards on the output path ----------------------------------------
//
// These fail for different reasons, so they are checked separately. A test
// that only ever sees an empty site cannot tell which guard stopped the
// output — and a guard nothing distinguishes is a guard that can be deleted
// without any test noticing.

$GLOBALS['__options']  = array();
$GLOBALS['__filters']  = array();
$GLOBALS['__is_feed']  = false;
$GLOBALS['__is_embed'] = false;

check( \FHINT\Frontend\Schema::context_allows(), 'an ordinary page may carry the markup' );

$GLOBALS['__is_feed'] = true;
check( ! \FHINT\Frontend\Schema::context_allows(), 'a feed never does' );
$GLOBALS['__is_feed'] = false;

$GLOBALS['__is_embed'] = true;
check( ! \FHINT\Frontend\Schema::context_allows(), 'nor an embed' );
$GLOBALS['__is_embed'] = false;

$GLOBALS['__options']['fhint_settings'] = array( 'schema' => array( 'mode' => Ownership::MODE_DISABLED ) );
check( ! \FHINT\Frontend\Schema::context_allows(), 'nor a page when publishing is switched off' );

$GLOBALS['__options']['fhint_settings'] = array( 'schema' => array( 'mode' => Ownership::MODE_SEO_PLUGIN ) );
check( ! \FHINT\Frontend\Schema::context_allows(), 'nor when the SEO plugin owns the markup' );

$GLOBALS['__options']['fhint_settings'] = array( 'schema' => array( 'mode' => Ownership::MODE_PLUGIN ) );
check( \FHINT\Frontend\Schema::context_allows(), 'and it does again when told to publish' );

$GLOBALS['__options'] = array();

// -- The cache is keyed on the data stamp ----------------------------------

$GLOBALS['__options'] = array();
$GLOBALS['__options']['fhint_data_changed_at'] = 500;
$GLOBALS['__options'][ \FHINT\App\Schema\SchemaCache::OPTION ] = array(
	'location_0' => array(
		'stamp' => 500,
		'graph' => array( '@context' => 'https://schema.org', '@graph' => array( array( '@type' => 'Cached' ) ) ),
	),
);

$graph = \FHINT\App\Schema\SchemaCache::graph( 0 );

check_same( 'Cached', $graph['@graph'][0]['@type'], 'a matching stamp is served from cache' );

// Moving the stamp is what every write already does, so nothing has to
// remember to clear a cache.
$GLOBALS['__options']['fhint_data_changed_at'] = 501;

$graph = \FHINT\App\Schema\SchemaCache::graph( 0 );

check( ! isset( $graph['@graph'][0]['@type'] ) || 'Cached' !== $graph['@graph'][0]['@type'], 'a moved stamp rebuilds rather than serving the old graph' );

finish( 'Schema graph' );
