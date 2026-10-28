<?php
/**
 * JSON-LD output on public pages.
 *
 * @package FoundHint
 */

namespace FHINT\Frontend;

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
 *
 * The graph holds one business per location that can be published; when
 * none can, `script_tag()` prints nothing.
 */
class Schema {

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'wp_head', array( __CLASS__, 'render_head' ), 20 );
		add_action( 'wp_footer', array( __CLASS__, 'render_footer' ), 20 );

		// A settings change alters the output without touching business
		// data, so the stamp would not move on its own.
		add_action( 'fhint_settings_saved', array( SchemaCache::class, 'flush' ) );
	}

	/**
	 * Print in <head>, unless the markup is placed before </body>.
	 *
	 * @return void
	 */
	public static function render_head() {
		if ( 'footer' !== self::placement() ) {
			self::render();
		}
	}

	/**
	 * Print just before </body>, when the markup is placed there.
	 *
	 * @return void
	 */
	public static function render_footer() {
		if ( 'footer' === self::placement() ) {
			self::render();
		}
	}

	/**
	 * Where the markup goes: head or footer.
	 *
	 * @return string
	 */
	public static function placement() {
		/**
		 * Filters where the JSON-LD is printed: 'head' (wp_head) or 'footer'
		 * (wp_footer). FoundHint Pro's Settings tab sets it; the free markup
		 * always goes in the head.
		 *
		 * @param string $placement head | footer.
		 */
		$placement = function_exists( 'apply_filters' ) ? apply_filters( 'fhint_schema_placement', 'head' ) : 'head';

		return 'footer' === $placement ? 'footer' : 'head';
	}

	/**
	 * Print the JSON-LD script tag.
	 *
	 * @return void
	 */
	public static function render() {
		echo self::markup(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built by script_tag(), which encodes for a script element.
	}

	/**
	 * The script tag this request prints, or ''.
	 *
	 * @return string
	 */
	public static function markup() {
		// Feeds and embeds carry no markup, whoever builds it.
		if ( is_feed() || is_embed() ) {
			return '';
		}

		/**
		 * Filters the whole document printed on this request.
		 *
		 * Return an array — a JSON-LD document — to print it instead of the
		 * free LocalBusiness markup; null keeps the free markup. This is how
		 * FoundHint Pro's Schema Manager takes over the output: its graph is
		 * built per page, with its own placement and ownership rules, so
		 * the free plugin's ownership check does not apply to it.
		 *
		 * @param array|null $document Null, or the document to print.
		 * @param array      $context  { post_id, url, is_front_page }.
		 */
		$document = function_exists( 'apply_filters' ) ? apply_filters( 'fhint_schema_document', null, self::context() ) : null;

		if ( is_array( $document ) ) {
			return self::script_tag( $document );
		}

		if ( ! self::should_render() ) {
			return '';
		}

		// Every location that can be published, each as its own business.
		return self::script_tag( SchemaCache::site() );
	}

	/**
	 * What this request is, for whoever builds its document.
	 *
	 * @return array{post_id:int, url:string, is_front_page:bool}
	 */
	public static function context() {
		$singular = function_exists( 'is_singular' ) && is_singular();

		return array(
			'post_id'       => $singular && function_exists( 'get_queried_object_id' ) ? (int) get_queried_object_id() : 0,
			'url'           => $singular && function_exists( 'wp_get_canonical_url' ) ? (string) wp_get_canonical_url() : '',
			'is_front_page' => function_exists( 'is_front_page' ) && is_front_page(),
		);
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

		return "\n" . '<script type="application/ld+json" id="fhint-schema">' . $json . '</script>' . "\n";
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
