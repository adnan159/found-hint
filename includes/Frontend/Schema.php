<?php
/**
 * JSON-LD output on public pages.
 *
 * @package FoundHint
 */

namespace FHINT\Frontend;

use FHINT\App\Nap\Nap;
use FHINT\App\Schema\Graph;
use FHINT\App\Schema\Ownership;
use FHINT\App\Schema\SchemaCache;

defined( 'ABSPATH' ) || exit;

/**
 * Prints the local business markup in the document head.
 *
 * This is the one part of the plugin that runs on every public request, so
 * it does as little as possible: read a cached array, encode it, print it.
 * No audit, no external HTTP, no writes — building the graph is the cache's
 * job and it only happens after data has actually changed.
 */
class Schema {

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'wp_head', array( __CLASS__, 'render' ), 20 );

		// A settings change alters the output without touching business
		// data, so the stamp would not move on its own.
		add_action( 'fhint_settings_saved', array( SchemaCache::class, 'flush' ) );
	}

	/**
	 * Print the JSON-LD script tag.
	 *
	 * @return void
	 */
	public static function render() {
		if ( ! self::should_render() ) {
			return;
		}

		echo self::script_tag( SchemaCache::graph() ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	/**
	 * The script tag for a graph, or '' when there is nothing to print.
	 *
	 * Separate from `render()` so the encoding — the part with a real
	 * failure mode — can be checked without a database or a request.
	 *
	 * @param array $graph The JSON-LD document.
	 * @return string
	 */
	public static function script_tag( array $graph ) {
		if ( empty( $graph['@graph'] ) ) {
			return '';
		}

		// JSON_HEX_TAG encodes < and > as \u003C and \u003E. That is what
		// stops a stored value containing `</script>` from ending the
		// element early and turning structured data into markup. esc_html()
		// would defend the same thing and corrupt the JSON doing it.
		$json = wp_json_encode(
			$graph,
			JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG
		);

		if ( ! $json ) {
			return '';
		}

		return "\n" . '<script type="application/ld+json">' . $json . '</script>' . "\n";
	}

	/**
	 * Whether this request should carry the markup.
	 *
	 * @return bool
	 */
	private static function should_render() {
		if ( ! self::context_allows() ) {
			return false;
		}

		if ( ! Graph::is_publishable( Nap::resolve() ) ) {
			return false;
		}

		/**
		 * Filter whether the markup is printed on this request.
		 *
		 * The hook for suppressing it on particular pages — a landing page
		 * that publishes its own, for example.
		 *
		 * @param bool $render Whether to print.
		 */
		return (bool) apply_filters( 'fhint_schema_render', true );
	}

	/**
	 * Whether this kind of request may carry the markup at all.
	 *
	 * Split from the data check so it can be exercised on its own: these
	 * two guards fail for entirely different reasons, and a test that only
	 * ever sees an empty site cannot tell which one stopped the output.
	 *
	 * @return bool
	 */
	public static function context_allows() {
		// Feeds and embeds have a head but are not pages a search engine
		// reads markup from.
		if ( is_feed() || is_embed() ) {
			return false;
		}

		return Ownership::should_publish();
	}
}
