<?php
/**
 * Everything a rule may read.
 *
 * @package FoundHint
 */

namespace FHINT\App\Audit;

use FHINT\App\Business\BusinessRepository;
use FHINT\App\Google\Connection;
use FHINT\App\Google\GoogleLocationRepository;
use FHINT\App\Location\LocationRepository;
use FHINT\App\Nap\Nap;
use FHINT\App\Schema\Graph;
use FHINT\App\Schema\Ownership;
use FHINT\App\Service\Service;
use FHINT\App\Service\ServiceRepository;

defined( 'ABSPATH' ) || exit;

/**
 * A snapshot of the site, gathered once and handed to every rule.
 *
 * **The reason this exists is the N+1 that would otherwise be inevitable.**
 * Thirty rules each asking for the business, the location and its hours is
 * thirty times the queries and, worse, thirty chances for two rules to read
 * slightly different states of the same data mid-run. Gathering once means
 * the whole rule set judges one consistent picture.
 *
 * It is a plain value object: `from_parts()` builds one from arrays, so the
 * entire rule set can be exercised without a database.
 */
class Context {

	/**
	 * Resolved NAP values.
	 *
	 * @var array
	 */
	public $nap = array();

	/**
	 * The business record, empty when there is none.
	 *
	 * @var array
	 */
	public $business = array();

	/**
	 * The location being audited, empty when there is none.
	 *
	 * @var array
	 */
	public $location = array();

	/**
	 * Every location on the site.
	 *
	 * @var array[]
	 */
	public $locations = array();

	/**
	 * Active services.
	 *
	 * @var array[]
	 */
	public $services = array();

	/**
	 * The JSON-LD document this site would publish.
	 *
	 * @var array
	 */
	public $schema = array();

	/**
	 * Whether this plugin is publishing that markup.
	 *
	 * @var bool
	 */
	public $schema_published = false;

	/**
	 * The schema publishing mode in force.
	 *
	 * @var string
	 */
	public $schema_mode = '';

	/**
	 * The full ownership picture from Ownership::status().
	 *
	 * @var array
	 */
	public $schema_ownership = array();

	/**
	 * Google connection state.
	 *
	 * @var array
	 */
	public $google = array();

	/**
	 * The Google profile mapped to the audited location, empty when none.
	 *
	 * @var array
	 */
	public $google_location = array();

	/**
	 * Build from the live site.
	 *
	 * @param int $location_id Location to audit, 0 for the primary one.
	 * @return self
	 */
	public static function build( $location_id = 0 ) {
		$context = new self();

		$business = BusinessRepository::get();
		$location = $location_id ? LocationRepository::find( $location_id ) : LocationRepository::primary();

		$context->nap       = Nap::resolve( $location_id );
		$context->business  = is_array( $business ) ? $business : array();
		$context->location  = is_array( $location ) ? $location : array();
		$context->locations = LocationRepository::all();
		$context->services  = ServiceRepository::all( array( 'status' => Service::STATUS_ACTIVE ) );

		$context->schema           = Graph::from_parts( $context->nap, $context->services );
		$context->schema_published = Ownership::should_publish() && Graph::is_publishable( $context->nap );
		$context->schema_mode      = Ownership::mode();
		$context->schema_ownership = Ownership::status();

		$context->google = Connection::state();

		if ( ! empty( $context->location['id'] ) ) {
			$mapped = GoogleLocationRepository::find_by_fhint_location( (int) $context->location['id'] );

			$context->google_location = is_array( $mapped ) ? $mapped : array();
		}

		return $context;
	}

	/**
	 * Build from values already in hand.
	 *
	 * How the rule set is tested: every rule is a pure function of this
	 * object, so a context assembled from arrays exercises them completely.
	 *
	 * @param array $parts Any subset of the public properties.
	 * @return self
	 */
	public static function from_parts( array $parts ) {
		$context = new self();

		foreach ( $parts as $key => $value ) {
			if ( property_exists( $context, $key ) ) {
				$context->$key = $value;
			}
		}

		return $context;
	}

	/**
	 * Whether there is enough here to audit at all.
	 *
	 * @return bool
	 */
	public function has_subject() {
		return ! empty( $this->business );
	}

	/**
	 * A NAP value, trimmed.
	 *
	 * @param string $key Key in the resolved NAP array.
	 * @return string
	 */
	public function nap_value( $key ) {
		return isset( $this->nap[ $key ] ) ? trim( (string) $this->nap[ $key ] ) : '';
	}

	/**
	 * The business id, 0 when there is none.
	 *
	 * @return int
	 */
	public function business_id() {
		return isset( $this->business['id'] ) ? (int) $this->business['id'] : 0;
	}

	/**
	 * The audited location's id, 0 when there is none.
	 *
	 * @return int
	 */
	public function location_id() {
		return isset( $this->location['id'] ) ? (int) $this->location['id'] : 0;
	}
}
