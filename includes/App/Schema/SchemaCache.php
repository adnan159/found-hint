<?php
/**
 * Cached schema output.
 *
 * @package FoundHint
 */

namespace FHINT\App\Schema;

defined( 'ABSPATH' ) || exit;

/**
 * Keeps the built graph so a front-end request does not rebuild it.
 *
 * Building the graph costs several queries — business, location, hours,
 * services — on every page view of a site that may be mostly cached
 * anyway. None of that changes between writes.
 *
 * **Invalidation is by stamp, not by purge.** The stored entry carries the
 * `fhint_data_changed_at` value it was built from, and a mismatch rebuilds
 * it. Every write already stamps that option, so there is no list of places
 * that must remember to clear a cache — the one that forgets is the one
 * that serves a stale phone number for a week.
 */
class SchemaCache {

	const OPTION = 'fhint_schema_cache';

	/**
	 * The graph for a location, built or from cache.
	 *
	 * @param int $location_id Location, 0 for the primary one.
	 * @return array
	 */
	public static function graph( $location_id = 0 ) {
		$key    = self::key( $location_id );
		$stamp  = self::stamp();
		$cached = get_option( self::OPTION, array() );
		$cached = is_array( $cached ) ? $cached : array();

		if ( isset( $cached[ $key ]['stamp'] ) && (int) $cached[ $key ]['stamp'] === $stamp
			&& isset( $cached[ $key ]['graph'] ) && is_array( $cached[ $key ]['graph'] ) ) {
			return $cached[ $key ]['graph'];
		}

		$graph = Graph::build( $location_id );

		// Only the entries still matching the current stamp are kept, so the
		// option cannot grow without bound as data changes over time.
		$fresh = array();

		foreach ( $cached as $existing_key => $entry ) {
			if ( isset( $entry['stamp'] ) && (int) $entry['stamp'] === $stamp ) {
				$fresh[ $existing_key ] = $entry;
			}
		}

		$fresh[ $key ] = array(
			'stamp' => $stamp,
			'graph' => $graph,
		);

		// Not autoloaded: this is read on demand, and it is large enough that
		// loading it into every request would be a cost paid on pages that
		// never look at it.
		update_option( self::OPTION, $fresh, false );

		return $graph;
	}

	/**
	 * Drop everything cached.
	 *
	 * Not needed for ordinary writes — the stamp handles those — but a
	 * setting change alters output without touching business data.
	 *
	 * @return void
	 */
	public static function flush() {
		delete_option( self::OPTION );
	}

	/**
	 * The current data stamp.
	 *
	 * @return int
	 */
	private static function stamp() {
		return (int) get_option( 'fhint_data_changed_at', 0 );
	}

	/**
	 * Cache key for a location.
	 *
	 * @param int $location_id Location id.
	 * @return string
	 */
	private static function key( $location_id ) {
		return 'location_' . (int) $location_id;
	}
}
