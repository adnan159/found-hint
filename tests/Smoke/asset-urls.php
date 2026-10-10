<?php
/**
 * Turning an asset directory into a URL.
 *
 * Run with plain PHP: `php tests/Smoke/asset-urls.php`.
 *
 * The admin screen is one JavaScript bundle. If its URL comes out wrong the
 * screen is blank — not degraded, blank — so this is worth proving against
 * the installs that break naive path rewriting rather than only against the
 * developer's own.
 *
 * The WordPress.org review team found the original: it built the URL by hand
 * and matched a fixed content-directory name with a regular expression, which
 * fails on every site that renamed that directory. These cases are that
 * report, turned into checks.
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

echo "Asset URLs\n";

// The library anchors on its own location through plugin_dir_url(), so the
// stub is what a given install would hand back for libs/assets.php.
$GLOBALS['__plugin_dir_url'] = '';

if ( ! function_exists( 'plugin_dir_url' ) ) {
	/**
	 * Stub: the URL of the directory holding the given plugin file.
	 *
	 * @param string $file Plugin file.
	 * @return string
	 */
	function plugin_dir_url( $file ) { // phpcs:ignore Universal.Files.SeparateFunctionsFromOO.Mixed
		unset( $file );

		return $GLOBALS['__plugin_dir_url'];
	}
}

if ( ! function_exists( 'wp_normalize_path' ) ) {
	/**
	 * Stub: WordPress's own path normaliser, slashes forward and collapsed.
	 *
	 * @param string $path Path to normalise.
	 * @return string
	 */
	function wp_normalize_path( $path ) { // phpcs:ignore Universal.Files.SeparateFunctionsFromOO.Mixed
		$path = str_replace( '\\', '/', (string) $path );

		return preg_replace( '|(?<=.)/+|', '/', $path );
	}
}

// The bootstrap may already have loaded the library; these functions are
// procedural, so a second include is a fatal rather than a no-op.
if ( ! function_exists( 'FHINT\\Libs\\Assets\\prepare_asset_url' ) ) {
	require dirname( __DIR__, 2 ) . '/libs/assets.php';
}

$fhint_plugin_path = wp_normalize_path( dirname( __DIR__, 2 ) );

/**
 * Resolve a directory as a given install would.
 *
 * @param string $libs_url What plugin_dir_url() returns for libs/assets.php.
 * @param string $dir      The asset directory on disk.
 * @return string
 */
function fhint_asset_url( $libs_url, $dir ) {
	$GLOBALS['__plugin_dir_url'] = $libs_url;

	return FHINT\Libs\Assets\prepare_asset_url( $dir );
}

// ── the ordinary install ────────────────────────────────────────────────

check_same(
	'https://example.com/wp-content/plugins/found-hint/assets/build/admin',
	fhint_asset_url(
		'https://example.com/wp-content/plugins/found-hint/libs/',
		$fhint_plugin_path . '/assets/build/admin'
	),
	'a standard install resolves the build directory'
);

// ── the installs the review team was protecting ─────────────────────────

// A renamed content directory. The regular expression this replaced looked
// for one literal directory name and silently produced a wrong URL here.
check_same(
	'https://example.com/content/plugins/found-hint/assets/build/admin',
	fhint_asset_url(
		'https://example.com/content/plugins/found-hint/libs/',
		$fhint_plugin_path . '/assets/build/admin'
	),
	'a renamed content directory resolves correctly'
);

// A content directory on its own host, which WordPress supports and which
// has no conventional path segment at all.
check_same(
	'https://static.example.com/plugins/found-hint/assets/build/admin',
	fhint_asset_url(
		'https://static.example.com/plugins/found-hint/libs/',
		$fhint_plugin_path . '/assets/build/admin'
	),
	'a content directory on another host resolves correctly'
);

// WordPress in a subdirectory, with the content directory beside it.
check_same(
	'https://example.com/app/plugins/found-hint/assets/build/admin',
	fhint_asset_url(
		'https://example.com/app/plugins/found-hint/libs/',
		$fhint_plugin_path . '/assets/build/admin'
	),
	'a Bedrock-style layout resolves correctly'
);

// A trailing slash on either side must not double up or disappear.
check_same(
	'https://example.com/wp-content/plugins/found-hint/assets/build/admin',
	fhint_asset_url(
		'https://example.com/wp-content/plugins/found-hint/libs',
		$fhint_plugin_path . '/assets/build/admin/'
	),
	'a missing or extra trailing slash makes no difference'
);

// Windows separators: the URL must not carry a backslash into an href.
check_same(
	'https://example.com/wp-content/plugins/found-hint/assets/build/admin',
	fhint_asset_url(
		'https://example.com/wp-content/plugins/found-hint/libs/',
		str_replace( '/', '\\', $fhint_plugin_path . '/assets/build/admin' )
	),
	'Windows separators normalise to a usable URL'
);

// The plugin root itself, with nothing appended.
check_same(
	'https://example.com/wp-content/plugins/found-hint',
	fhint_asset_url(
		'https://example.com/wp-content/plugins/found-hint/libs/',
		$fhint_plugin_path
	),
	'the plugin root resolves to the plugin URL'
);

// ── no silent guessing ──────────────────────────────────────────────────

// Outside the plugin there is no honest answer, and inventing one is how the
// old implementation went wrong. With WP_DEBUG off it returns nothing rather
// than a URL that resolves to a 404.
check_same(
	'',
	fhint_asset_url( 'https://example.com/wp-content/plugins/found-hint/libs/', '/var/www/elsewhere/build' ),
	'a directory outside the plugin resolves to nothing rather than a guess'
);

finish( 'Asset URLs' );
