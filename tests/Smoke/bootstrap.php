<?php
/**
 * Minimal WordPress stubs so domain logic can be exercised without WordPress.
 *
 * @package FoundHint
 */

define( 'ABSPATH', '/tmp/fhint-tests/' );
define( 'FHINT_VERSION', '0.1.0' );
define( 'FHINT_DB_VERSION', '0.1.0' );
define( 'FHINT_SETTINGS_NAME', 'fhint_settings' );

$GLOBALS['__options'] = array();
$GLOBALS['__filters'] = array();

// -- Options ---------------------------------------------------------------

function get_option( $key, $default = false ) {
	return array_key_exists( $key, $GLOBALS['__options'] ) ? $GLOBALS['__options'][ $key ] : $default;
}
function update_option( $key, $value, $autoload = null ) {
	$GLOBALS['__options'][ $key ] = $value;
	return true;
}
function add_option( $key, $value ) {
	$GLOBALS['__options'][ $key ] = $value;
	return true;
}
function delete_option( $key ) {
	unset( $GLOBALS['__options'][ $key ] );
	return true;
}

// -- Hooks -----------------------------------------------------------------

function add_filter( $hook, $cb, $priority = 10, $args = 1 ) {
	$GLOBALS['__filters'][ $hook ][] = $cb;
	return true;
}
function apply_filters( $hook, $value, ...$rest ) {
	if ( empty( $GLOBALS['__filters'][ $hook ] ) ) {
		return $value;
	}
	foreach ( $GLOBALS['__filters'][ $hook ] as $cb ) {
		$value = call_user_func_array( $cb, array_merge( array( $value ), $rest ) );
	}
	return $value;
}
$GLOBALS['__rest_init'] = array();

function add_action( $hook, $cb, $priority = 10, $args = 1 ) {
	if ( 'rest_api_init' === $hook ) {
		$GLOBALS['__rest_init'][] = $cb;
	}
	return true;
}
function do_action( $hook, ...$rest ) {}

// -- REST stubs ------------------------------------------------------------

if ( ! class_exists( 'WP_REST_Server' ) ) {
	class WP_REST_Server {
		const READABLE  = 'GET';
		const CREATABLE = 'POST';
		const EDITABLE  = 'POST, PUT, PATCH';
		const DELETABLE = 'DELETE';
	}
}

if ( ! class_exists( 'WP_REST_Controller' ) ) {
	class WP_REST_Controller {
		protected $namespace = '';
		protected $rest_base = '';
	}
}

if ( ! class_exists( 'WP_Error' ) ) {
	class WP_Error {
		public $code;
		public $message;
		public $data;

		public function __construct( $code = '', $message = '', $data = '' ) {
			$this->code    = $code;
			$this->message = $message;
			$this->data    = $data;
		}

		public function get_error_code() {
			return $this->code;
		}
	}
}

function rest_ensure_response( $data ) {
	return $data;
}
function is_user_logged_in() {
	return true;
}
function current_user_can( $cap ) {
	return true;
}

// -- Sanitisation ----------------------------------------------------------

function sanitize_text_field( $value ) {
	return trim( preg_replace( '/[\r\n\t]+/', ' ', wp_strip_all_tags( (string) $value ) ) );
}
function sanitize_textarea_field( $value ) {
	return trim( wp_strip_all_tags( (string) $value ) );
}
function wp_strip_all_tags( $value ) {
	return strip_tags( (string) $value );
}
function sanitize_email( $value ) {
	return (string) filter_var( trim( (string) $value ), FILTER_SANITIZE_EMAIL );
}
function esc_url_raw( $value ) {
	return trim( (string) $value );
}
function sanitize_key( $value ) {
	return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $value ) );
}
function sanitize_title( $value ) {
	$value = strtolower( trim( (string) $value ) );
	$value = preg_replace( '/[^a-z0-9\s\-]/', '', $value );
	$value = preg_replace( '/[\s\-]+/', '-', $value );
	return trim( $value, '-' );
}
function is_email( $value ) {
	return (bool) filter_var( (string) $value, FILTER_VALIDATE_EMAIL );
}
function wp_parse_url( $url, $component = -1 ) {
	return parse_url( $url, $component );
}
function wp_json_encode( $data, $flags = 0 ) {
	return json_encode( $data, $flags );
}
function current_time( $type, $gmt = 0 ) {
	return gmdate( 'Y-m-d H:i:s' );
}
function __( $text, $domain = null ) {
	return $text;
}
function wp_rand( $min = 0, $max = 0 ) {
	return random_int( $min ? $min : 0, $max ? $max : PHP_INT_MAX );
}
function get_current_user_id() {
	return 1;
}

require dirname( __DIR__, 2 ) . '/vendor/autoload.php';

// -- Tiny assertion harness ------------------------------------------------

$GLOBALS['__passed'] = 0;
$GLOBALS['__failed'] = 0;

/**
 * Assert a condition.
 *
 * @param bool   $condition Result under test.
 * @param string $label     What was being checked.
 * @return void
 */
function check( $condition, $label ) {
	if ( $condition ) {
		$GLOBALS['__passed']++;
		return;
	}

	$GLOBALS['__failed']++;
	echo "  FAIL  {$label}\n";
}

/**
 * Assert two values match.
 *
 * @param mixed  $expected Expected value.
 * @param mixed  $actual   Actual value.
 * @param string $label    What was being checked.
 * @return void
 */
function check_same( $expected, $actual, $label ) {
	if ( $expected === $actual ) {
		$GLOBALS['__passed']++;
		return;
	}

	$GLOBALS['__failed']++;
	echo "  FAIL  {$label}\n";
	echo '          expected: ' . var_export( $expected, true ) . "\n";
	echo '          actual:   ' . var_export( $actual, true ) . "\n";
}

/**
 * Print the run summary and exit with a meaningful status.
 *
 * @param string $suite Suite name.
 * @return void
 */
function finish( $suite ) {
	$passed = $GLOBALS['__passed'];
	$failed = $GLOBALS['__failed'];

	echo "\n{$suite}: {$passed} passed, {$failed} failed\n";

	exit( $failed > 0 ? 1 : 0 );
}
