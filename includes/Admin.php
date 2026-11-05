<?php
/**
 * Admin module — dispatches all wp-admin sub-classes.
 *
 * @package FoundHint
 */

namespace FHINT;

use FHINT\Admin\BlogSharing;
use FHINT\Admin\EditorAssets;
use FHINT\Admin\Enqueue;
use FHINT\Admin\Menu;

defined( 'ABSPATH' ) || exit;

/**
 * Only loaded when is_admin() is true — see FHINT::dispatch_hooks().
 */
class Admin {

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		Menu::init();
		Enqueue::init();
		BlogSharing::init();
		EditorAssets::init();

		add_filter( 'plugin_action_links_' . FHINT_BASENAME, array( __CLASS__, 'plugin_action_links' ) );
	}

	/**
	 * Add a Settings link on the Plugins list page.
	 *
	 * @param array $links Existing action links.
	 * @return array
	 */
	public static function plugin_action_links( $links ) {
		$settings_link = sprintf(
			'<a href="%s">%s</a>',
			esc_url( admin_url( 'admin.php?page=' . Menu::SLUG . '#/settings' ) ),
			esc_html__( 'Settings', 'foundhint-local-seo' )
		);

		array_unshift( $links, $settings_link );

		// Without Premium installed: where to get it.
		if ( ! defined( 'FHINTPREMIUM_VERSION' ) ) {
			$links[] = sprintf(
				'<a href="%s" target="_blank" rel="noopener noreferrer" style="color:#D8521F;font-weight:700;">%s</a>',
				esc_url( (string) apply_filters( 'fhint_upgrade_url', 'https://foundhint.com/pricing/' ) ),
				esc_html__( 'Get Pro', 'foundhint-local-seo' )
			);
		}

		return $links;
	}
}
