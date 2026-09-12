<?php
/**
 * Settings REST controller.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Core\Limits;
use FHINT\App\Core\Logger;
use FHINT\App\Core\Settings as SettingsStore;
use FHINT\Database\Tables;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * GET|PUT /settings — plugin preferences, plus read-only system status.
 * DELETE /logs       — purge log entries.
 */
class Settings extends AbstractController {

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		$self = new self();

		add_action( 'rest_api_init', array( $self, 'register_routes' ) );
	}

	/**
	 * Register the routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/settings',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
				array(
					'methods'             => 'POST, PUT, PATCH',
					'callback'            => array( $this, 'update_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'delete_data_on_uninstall' => array( 'type' => 'boolean' ),
							'log_retention_days'       => array(
								'type' => 'integer',
								'minimum' => 1,
								'maximum' => 365,
							),
							'schema_mode'              => array(
								'type' => 'string',
								'enum' => array( 'auto', 'plugin', 'seo_plugin', 'disabled' ),
							),
						)
					),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/logs',
			array(
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_logs' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'mode' => array(
								'type'    => 'string',
								'enum'    => array( 'expired', 'all' ),
								'default' => 'expired',
							),
						)
					),
				),
			)
		);
	}

	/**
	 * Return the settings plus system status.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_item( $request ) {
		return $this->envelope(
			$this->flatten(),
			array(
				'system' => $this->system(),
				'limits' => $this->limit_ranges(),
			)
		);
	}

	/**
	 * Save a partial settings payload.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function update_item( $request ) {
		$json = $request->get_json_params();
		$body = is_array( $json ) && $json ? $json : (array) $request->get_params();

		$settings = SettingsStore::all();

		if ( array_key_exists( 'delete_data_on_uninstall', $body ) ) {
			$settings['general']['delete_data_on_uninstall'] = (bool) $body['delete_data_on_uninstall'];
		}

		if ( array_key_exists( 'log_retention_days', $body ) ) {
			$settings['logs']['retention_days'] = min( 365, max( 1, (int) $body['log_retention_days'] ) );
		}

		if ( array_key_exists( 'schema_mode', $body ) ) {
			$settings['schema']['mode'] = (string) $body['schema_mode'];
		}

		SettingsStore::save( $settings );

		Logger::info( 'settings', 'settings.updated', 'Settings updated.', array( 'metadata' => array( 'fields' => array_keys( $body ) ) ) );

		return $this->envelope(
			$this->flatten(),
			array(
				'system' => $this->system(),
				'limits' => $this->limit_ranges(),
			)
		);
	}

	/**
	 * Purge log entries.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function delete_logs( $request ) {
		$mode      = (string) $request->get_param( 'mode' );
		$retention = (int) SettingsStore::get( 'logs.retention_days', 30 );

		if ( 'all' === $mode ) {
			$removed = Logger::purge_all();

			// Record the clearance itself, so the log never silently loses
			// the fact that it was emptied.
			Logger::info( 'settings', 'logs.cleared', 'All log entries were cleared.', array( 'metadata' => array( 'removed' => $removed ) ) );
		} else {
			$removed = Logger::purge_expired( $retention );
		}

		return $this->envelope(
			array(
				'removed'        => $removed,
				'retention_days' => $retention,
				'log_entries'    => Logger::count(),
			)
		);
	}

	/**
	 * Settings in the flat shape a client works with.
	 *
	 * @return array
	 */
	private function flatten() {
		return array(
			'delete_data_on_uninstall' => (bool) SettingsStore::get( 'general.delete_data_on_uninstall', false ),
			'log_retention_days'       => (int) SettingsStore::get( 'logs.retention_days', 30 ),
			'schema_mode'              => (string) SettingsStore::get( 'schema.mode', 'auto' ),
		);
	}

	/**
	 * Read-only environment information.
	 *
	 * Deliberately carries nothing sensitive: this is shown in the admin and
	 * is likely to be pasted into a support thread.
	 *
	 * @return array
	 */
	private function system() {
		global $wpdb;

		$missing = Tables::missing();

		return array(
			'plugin_version'   => FHINT_VERSION,
			'db_version'       => FHINT_DB_VERSION,
			'tables_total'     => count( Tables::keys() ),
			'tables_missing'   => $missing,
			'db_needs_install' => ! empty( $missing ),
			'log_entries'      => Logger::count(),
			'php_version'      => PHP_VERSION,
			'wp_version'       => get_bloginfo( 'version' ),
			'db_charset'       => $wpdb->charset,
			'timezone'         => wp_timezone_string(),
		);
	}

	/**
	 * Ranges a client needs in order to render its own controls.
	 *
	 * @return array
	 */
	private function limit_ranges() {
		return array(
			'log_retention_days' => array(
				'min' => 1,
				'max' => 365,
				'default' => 30,
			),
			'locations'          => Limits::report( Limits::LOCATIONS, \FHINT\App\Location\LocationRepository::count() ),
			'services'           => Limits::report( Limits::SERVICES, \FHINT\App\Service\ServiceRepository::count() ),
		);
	}
}
