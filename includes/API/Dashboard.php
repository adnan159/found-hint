<?php
/**
 * Dashboard REST controller.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Audit\AuditRepository;
use FHINT\App\Audit\Runner;
use FHINT\App\Audit\Trend;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * The figures the dashboard shows.
 *
 * **It reads stored figures and never measures.** There is no write method,
 * on purpose: the dashboard is the screen people open most, and anything
 * that ran the audit from here would put the whole rule set on its render.
 * Running an audit belongs to `POST /audits`.
 *
 * It returns ids, statuses and counts. Labels — band names, "12 minutes
 * ago", "in the last 30 days" — live in the admin bundle, where they can be
 * translated, so the same response serves any language.
 */
class Dashboard extends AbstractController {

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
			'/dashboard',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
			)
		);
	}

	/**
	 * The dashboard's figures.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_item( $request ) {
		return $this->envelope(
			array(
				'score' => self::score_summary( time() ),
			)
		);
	}

	/**
	 * The health score card's figures, from the latest stored run.
	 *
	 * @param int $now Current Unix time.
	 * @return array
	 */
	public static function score_summary( $now ) {
		$latest = AuditRepository::latest();

		if ( ! $latest ) {
			return array(
				'has_audit' => false,
			);
		}

		$open = AuditRepository::open_counts( $latest['id'] );

		return array(
			'has_audit'        => true,
			'audit_id'         => $latest['id'],
			'score'            => $latest['score'],
			'band'             => $latest['score_band'],
			'completed_at'     => $latest['completed_at'],
			'rules_run'        => $latest['rules_run'],
			'rules_passed'     => $latest['issues_passed'],
			// Shown with a warning when true — never hidden, never silently
			// re-measured.
			'stale'            => Runner::is_stale( $latest ),
			'open_findings'    => $open['total'],
			'open_by_severity' => $open['by_severity'],
			'trend'            => Trend::calculate(
				AuditRepository::completed_runs( $latest['location_id'] ),
				$now
			),
		);
	}
}
