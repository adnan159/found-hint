<?php
/**
 * The GBP Posting button and popup in the block editor.
 *
 * @package FoundHint
 */

namespace FHINT\Admin;

use FHINT\App\Core\Capabilities;
use FHINT\Libs\Assets;

defined( 'ABSPATH' ) || exit;

/**
 * Loads the editor bundle (src/editor, built to assets/build/editor) while a
 * blog post is being edited, so a "GBP Posting" button in the editor's top
 * bar can open the Posts composer on it.
 *
 * Only for a `post` in the block editor, for someone who can manage
 * FoundHint, and while blog sharing is on (`BlogSharing::enabled()` —
 * FoundHint Premium). This is a separate, small bundle: the admin app's
 * bundle still loads on FoundHint's own page only, and the editor never
 * gets its page-wide CSS reset.
 */
class EditorAssets {

	/** Script handle. */
	const SCRIPT_HANDLE = 'fhint-editor';

	/** The bundle's entry, as the Vite manifest names it. */
	const ENTRY = 'src/editor/main.jsx';

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'enqueue_block_editor_assets', array( __CLASS__, 'enqueue' ) );
	}

	/**
	 * Whether this editor screen gets the button.
	 *
	 * @return bool
	 */
	public static function applies() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

		if ( ! $screen || 'post' !== $screen->post_type || ! $screen->is_block_editor() ) {
			return false;
		}

		return Capabilities::current_user_can_manage() && BlogSharing::enabled();
	}

	/**
	 * Enqueue the bundle and the app's bootstrap data.
	 *
	 * @return void
	 */
	public static function enqueue() {
		if ( ! self::applies() ) {
			return;
		}

		Assets\enqueue_asset(
			FHINT_ASSETS_PATH . 'build/editor',
			self::ENTRY,
			array(
				'dependencies' => array( 'wp-plugins', 'wp-editor', 'wp-element', 'wp-data' ),
				'handle'       => self::SCRIPT_HANDLE,
				'in-footer'    => true,
			)
		);

		// The same window.FHINT the admin app reads: the REST base, nonce and
		// Premium's features.
		wp_localize_script( self::SCRIPT_HANDLE, 'FHINT', Enqueue::bootstrap_data() );

		if ( function_exists( 'wp_set_script_translations' ) ) {
			wp_set_script_translations( self::SCRIPT_HANDLE, 'foundhint-local-seo', FHINT_PATH . 'languages' );
		}

		// "Choose photo" opens the Media Library. The block editor loads it
		// already; asked for here so the popup never depends on that.
		if ( function_exists( 'wp_enqueue_media' ) ) {
			wp_enqueue_media();
		}
	}
}
