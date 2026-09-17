<?php
/**
 * Audit REST controller.
 *
 * @package FoundHint
 */

namespace FHINT\API;

use FHINT\App\Audit\AuditRepository;
use FHINT\App\Audit\Fixes\FixRunner;
use FHINT\App\Audit\Runner;
use FHINT\App\Audit\Score;
use WP_Error;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * Reading audit results, running one, and applying a fix.
 *
 * **`GET /audits` never measures.** It reads the stored run, and says
 * whether that run is older than the data it describes. Running an audit is
 * a POST, because it is work: rules execute and rows are written. A GET
 * that quietly re-measured would put the whole rule set on every render of
 * the dashboard.
 */
class Audits extends AbstractController {

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
			'/audits',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'run' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'location_id' => array(
								'type'    => 'integer',
								'minimum' => 0,
								'default' => 0,
							),
						)
					),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/audits/issues/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'POST, PUT, PATCH',
					'callback'            => array( $this, 'update_issue' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'id'     => array(
								'type'     => 'integer',
								'required' => true,
							),
							'status' => array(
								'type'     => 'string',
								'required' => true,
								'enum'     => array( 'open', 'resolved', 'ignored' ),
							),
						)
					),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/audits/issues/(?P<id>\d+)/fix',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'fix_issue' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->args(
						array(
							'id' => array(
								'type'     => 'integer',
								'required' => true,
							),
						)
					),
				),
			)
		);
	}

	/**
	 * The latest stored run, its findings, and the history.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_item( $request ) {
		$latest = AuditRepository::latest();

		return $this->envelope(
			$latest,
			array(
				'issues'  => $latest ? AuditRepository::issues( $latest['id'] ) : array(),
				'passes'  => $latest ? AuditRepository::issues( $latest['id'], 'pass' ) : array(),
				'history' => AuditRepository::history( 10 ),
				// Reported, never acted on here. A stale score is shown with
				// a warning rather than hidden or silently refreshed.
				'stale'   => Runner::is_stale( $latest ),
				'bands'   => Score::bands(),
			)
		);
	}

	/**
	 * Run an audit now.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public function run( $request ) {
		$audit = Runner::run( (int) $request->get_param( 'location_id' ), Runner::TRIGGER_MANUAL );

		if ( is_wp_error( $audit ) ) {
			return $audit;
		}

		return $this->envelope(
			$audit,
			array(
				'issues' => AuditRepository::issues( $audit['id'] ),
				'passes' => AuditRepository::issues( $audit['id'], 'pass' ),
				'stale'  => false,
			),
			201
		);
	}

	/**
	 * Resolve or ignore a finding.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public function update_issue( $request ) {
		$issue = AuditRepository::find_issue( (int) $request['id'] );

		if ( ! $issue ) {
			return $this->not_found( 'audit_issue' );
		}

		AuditRepository::set_issue_status( $issue['id'], (string) $request->get_param( 'status' ) );

		return $this->envelope( AuditRepository::find_issue( $issue['id'] ) );
	}

	/**
	 * Apply the automatic fix for a finding.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public function fix_issue( $request ) {
		$issue = AuditRepository::find_issue( (int) $request['id'] );

		if ( ! $issue ) {
			return $this->not_found( 'audit_issue' );
		}

		if ( empty( $issue['fix_handler'] ) ) {
			return new WP_Error(
				'fhint_fix_unavailable',
				__( 'This one has to be done by hand.', 'found-hint' ),
				array( 'status' => 400 )
			);
		}

		$result = FixRunner::apply( $issue['fix_handler'], $issue );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		AuditRepository::set_issue_status( $issue['id'], 'resolved' );

		// Re-run so the score reflects the fix immediately. The operator
		// pressed a button; showing them a stale number afterwards would
		// make the fix look like it did nothing.
		//
		// Against the same location the original run covered, so fixing a
		// finding does not quietly switch which location is being audited.
		$previous = AuditRepository::find( $issue['audit_id'] );
		$audit    = Runner::run(
			$previous ? (int) $previous['location_id'] : 0,
			Runner::TRIGGER_FIX
		);

		return $this->envelope(
			is_wp_error( $audit ) ? null : $audit,
			array(
				'fix'    => $result,
				'issues' => is_wp_error( $audit ) ? array() : AuditRepository::issues( $audit['id'] ),
			)
		);
	}
}
