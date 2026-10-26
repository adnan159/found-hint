<?php
/**
 * Who publishes the local business markup.
 *
 * @package FoundHint
 */

namespace FHINT\App\Schema;

use FHINT\App\Core\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Decides whether this plugin writes the LocalBusiness node on a page.
 *
 * **Two LocalBusiness nodes on one page is a real problem**, not a tidiness
 * one: search engines pick one and the other's claims are either ignored or
 * merged unpredictably, so a site with two can end up publishing a phone
 * number nobody chose. Most sites already run an SEO plugin, and some of
 * those publish this markup themselves.
 *
 * The awkward part is that *an SEO plugin being active* does not mean it
 * publishes LocalBusiness. Yoast only does with its Local SEO add-on. Rank
 * Math only when it has been configured as a local business. So deferring
 * to any SEO plugin would leave a great many sites silently publishing
 * nothing at all, which is the worse failure — it is invisible.
 *
 * So `auto` stands aside only for a plugin that is **known** to be
 * publishing it, and otherwise publishes and says what else it found. The
 * operator can then choose, and `detected()` gives the screen what it needs
 * to explain the choice.
 */
class Ownership {

	/** FoundHint decides, based on what else is installed. */
	const MODE_AUTO = 'auto';

	/** FoundHint always publishes. */
	const MODE_PLUGIN = 'plugin';

	/** The SEO plugin owns it; FoundHint never publishes. */
	const MODE_SEO_PLUGIN = 'seo_plugin';

	/** Nobody publishes it from here. */
	const MODE_DISABLED = 'disabled';

	/**
	 * Every valid mode.
	 *
	 * @return string[]
	 */
	public static function modes() {
		return array( self::MODE_AUTO, self::MODE_PLUGIN, self::MODE_SEO_PLUGIN, self::MODE_DISABLED );
	}

	/**
	 * The configured mode.
	 *
	 * @return string
	 */
	public static function mode() {
		$mode = (string) Settings::get( 'schema.mode', self::MODE_AUTO );

		return in_array( $mode, self::modes(), true ) ? $mode : self::MODE_AUTO;
	}

	/**
	 * Whether this plugin should publish the markup.
	 *
	 * @return bool
	 */
	public static function should_publish() {
		$mode = self::mode();

		if ( self::MODE_DISABLED === $mode || self::MODE_SEO_PLUGIN === $mode ) {
			return false;
		}

		if ( self::MODE_PLUGIN === $mode ) {
			return true;
		}

		return ! self::someone_else_publishes();
	}

	/**
	 * Whether a detected plugin is known to publish LocalBusiness markup.
	 *
	 * @return bool
	 */
	public static function someone_else_publishes() {
		foreach ( self::detected() as $plugin ) {
			if ( true === $plugin['emits_local_business'] ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * SEO plugins found on this site.
	 *
	 * `emits_local_business` is deliberately three-valued: `true` when this
	 * plugin is certain the other one publishes LocalBusiness, `false` when
	 * it is certain it does not, and `null` when it cannot tell. A `null`
	 * never changes behaviour on its own — it is shown to the operator, who
	 * can look at their own site and decide.
	 *
	 * @return array[]
	 */
	public static function detected() {
		$found = array();

		if ( defined( 'WPSEO_VERSION' ) ) {
			// Yoast publishes LocalBusiness only with its Local SEO add-on.
			$has_local = defined( 'WPSEO_LOCAL_VERSION' );

			$found[] = self::plugin(
				'yoast',
				'Yoast SEO',
				$has_local ? true : false,
				$has_local ? 'yoast_local' : 'yoast_core'
			);
		}

		if ( defined( 'RANK_MATH_VERSION' ) ) {
			// Rank Math publishes it when the site is set up as a local
			// business, which lives in its own options rather than anywhere
			// this plugin can read reliably.
			$found[] = self::plugin( 'rank_math', 'Rank Math', null, 'rank_math' );
		}

		if ( defined( 'AIOSEO_VERSION' ) ) {
			$found[] = self::plugin( 'aioseo', 'All in One SEO', null, 'aioseo' );
		}

		if ( defined( 'SEOPRESS_VERSION' ) ) {
			$found[] = self::plugin( 'seopress', 'SEOPress', null, 'seopress' );
		}

		if ( defined( 'SLIM_SEO_VER' ) ) {
			$found[] = self::plugin( 'slim_seo', 'Slim SEO', null, 'slim_seo' );
		}

		if ( defined( 'THE_SEO_FRAMEWORK_VERSION' ) ) {
			$found[] = self::plugin( 'seo_framework', 'The SEO Framework', false, 'seo_framework' );
		}

		/**
		 * Filter the detected SEO plugins.
		 *
		 * How a site with an unusual setup, or an extension, corrects what
		 * this class could not work out for itself.
		 *
		 * @param array $found Detected plugins.
		 */
		return function_exists( 'apply_filters' )
			? (array) apply_filters( 'fhint_schema_detected_plugins', $found )
			: $found;
	}

	/**
	 * The full ownership picture, for the admin screen and the audit.
	 *
	 * @return array
	 */
	public static function status() {
		$detected = self::detected();
		$mode     = self::mode();

		return array(
			'mode'                  => $mode,
			'modes'                 => self::modes(),
			'should_publish'        => self::should_publish(),
			'detected'              => $detected,
			'conflict_certain'      => self::someone_else_publishes(),
			// Something is installed that *might* also publish. Not a reason
			// to stand aside on its own, but the operator should know.
			'conflict_possible'     => self::possible_conflict(),
			'deferring_to_plugin'   => self::MODE_AUTO === $mode && self::someone_else_publishes(),
		);
	}

	/**
	 * Whether something installed might also be publishing LocalBusiness.
	 *
	 * @return bool
	 */
	public static function possible_conflict() {
		foreach ( self::detected() as $plugin ) {
			if ( null === $plugin['emits_local_business'] ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Shape one detected plugin.
	 *
	 * @param string    $id                   Machine id.
	 * @param string    $name                 Display name.
	 * @param bool|null $emits_local_business Whether it publishes LocalBusiness.
	 * @param string    $reason               Machine code explaining the verdict.
	 * @return array
	 */
	private static function plugin( $id, $name, $emits_local_business, $reason ) {
		return array(
			'id'                   => $id,
			'name'                 => $name,
			'emits_local_business' => $emits_local_business,
			'reason'               => $reason,
		);
	}
}
