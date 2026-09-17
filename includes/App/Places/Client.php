<?php
/**
 * Calls to the Places API.
 *
 * @package FoundHint
 */

namespace FHINT\App\Places;

use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Two requests: find candidate places, and read one place.
 *
 * Places API (New), which takes a **field mask** naming every field the
 * answer may contain. That is a billing control for Google and a discipline
 * for us: the masks here are the shortest lists that satisfy each screen, so
 * the plugin never even receives fields it has no right to keep. Reviews and
 * photos are absent by design.
 *
 * The key travels in the `X-Goog-Api-Key` header rather than in the query
 * string, where it would be written into access logs, proxy logs and browser
 * history. Nothing here logs the key, the URL with it, or the response.
 */
class Client {

	const SEARCH_URL  = 'https://places.googleapis.com/v1/places:searchText';
	const DETAILS_URL = 'https://places.googleapis.com/v1/places/';

	/**
	 * Fields needed to choose between candidates.
	 *
	 * Enough to tell two branches of the same chain apart, and no more.
	 */
	const SEARCH_MASK = 'places.id,places.displayName,places.formattedAddress';

	/**
	 * Fields needed to compare a place against what this site holds.
	 *
	 * Everything here is displayed and discarded; only `id` and `location`
	 * may be stored, and `Retention` governs how long the second survives.
	 */
	const DETAILS_MASK = 'id,displayName,formattedAddress,addressComponents,nationalPhoneNumber,internationalPhoneNumber,websiteUri,googleMapsUri,regularOpeningHours,businessStatus,primaryTypeDisplayName,location';

	/**
	 * Search for places by free text.
	 *
	 * @param string $query    What the operator typed, e.g. a business name
	 *                         and town.
	 * @param int    $max      Maximum results, 1-20.
	 * @return array|WP_Error Decoded body.
	 */
	public static function search( $query, $max = 8 ) {
		$query = trim( (string) $query );

		if ( '' === $query ) {
			return new WP_Error(
				'fhint_places_query_required',
				__( 'Type the name of your business to search for it.', 'found-hint' ),
				array( 'status' => 400 )
			);
		}

		$max = max( 1, min( 20, (int) $max ) );

		return self::request(
			'POST',
			self::SEARCH_URL,
			self::SEARCH_MASK,
			array(
				'textQuery'     => $query,
				'maxResultCount' => $max,
			)
		);
	}

	/**
	 * Read one place.
	 *
	 * @param string $place_id Google's place id.
	 * @return array|WP_Error Decoded body.
	 */
	public static function details( $place_id ) {
		$place_id = trim( (string) $place_id );

		if ( '' === $place_id ) {
			return new WP_Error(
				'fhint_places_id_required',
				__( 'No place was chosen.', 'found-hint' ),
				array( 'status' => 400 )
			);
		}

		return self::request(
			'GET',
			self::DETAILS_URL . rawurlencode( $place_id ),
			self::DETAILS_MASK,
			null
		);
	}

	/**
	 * One request.
	 *
	 * @param string     $method HTTP method.
	 * @param string     $url    Absolute URL.
	 * @param string     $mask   Field mask.
	 * @param array|null $body   JSON body, or null for a GET.
	 * @return array|WP_Error
	 */
	private static function request( $method, $url, $mask, $body ) {
		$key = Credentials::api_key();

		if ( '' === $key ) {
			return new WP_Error(
				'fhint_places_not_configured',
				__( 'Add a Google Maps Platform API key before searching.', 'found-hint' ),
				array( 'status' => 409 )
			);
		}

		$args = array(
			'timeout' => 20,
			'headers' => array(
				'X-Goog-Api-Key'   => $key,
				'X-Goog-FieldMask' => $mask,
				'Accept'           => 'application/json',
			),
		);

		if ( null !== $body ) {
			$args['headers']['Content-Type'] = 'application/json';
			$args['body']                    = wp_json_encode( $body );
		}

		$response = 'GET' === $method ? wp_remote_get( $url, $args ) : wp_remote_post( $url, $args );

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'fhint_places_unreachable',
				__( 'Google could not be reached. Please try again.', 'found-hint' ),
				array( 'status' => 502 )
			);
		}

		$status  = (int) wp_remote_retrieve_response_code( $response );
		$decoded = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		$decoded = is_array( $decoded ) ? $decoded : array();

		if ( $status >= 200 && $status <= 299 ) {
			return $decoded;
		}

		return new WP_Error(
			'fhint_places_request_failed',
			self::describe( $status, $decoded ),
			array(
				'status'      => 502,
				'http_status' => $status,
				'reason'      => isset( $decoded['error']['status'] ) ? (string) $decoded['error']['status'] : '',
			)
		);
	}

	/**
	 * Turn Google's refusal into something an operator can act on.
	 *
	 * The two that actually happen on a new key are worth separating: a key
	 * whose project has no billing account, and a key restricted to the
	 * wrong API or referrer. Both arrive as 403 with different messages, and
	 * "permission denied" sends people to the wrong screen.
	 *
	 * @param int   $status  HTTP status.
	 * @param array $decoded Decoded body.
	 * @return string
	 */
	private static function describe( $status, array $decoded ) {
		$reason  = isset( $decoded['error']['status'] ) ? (string) $decoded['error']['status'] : '';
		$message = isset( $decoded['error']['message'] ) ? (string) $decoded['error']['message'] : '';

		if ( 400 === $status && false !== stripos( $message, 'api key' ) ) {
			return __( 'Google did not accept that API key. Check it was copied whole, from the project where the Places API is enabled.', 'found-hint' );
		}

		if ( 403 === $status || 'PERMISSION_DENIED' === $reason ) {
			if ( false !== stripos( $message, 'billing' ) ) {
				return __( 'The Google Cloud project behind this key has no billing account. Places needs one enabled, even though normal use stays inside the free monthly credit.', 'found-hint' );
			}

			if ( false !== stripos( $message, 'referer' ) || false !== stripos( $message, 'referrer' ) || false !== stripos( $message, 'restrict' ) ) {
				return __( 'This key is restricted in a way that blocks the request. A key used by a server needs an IP restriction, or none — a website restriction will always refuse it.', 'found-hint' );
			}

			return __( 'Google refused the request. Check that the Places API (New) is enabled for this key\'s project.', 'found-hint' );
		}

		if ( 429 === $status || 'RESOURCE_EXHAUSTED' === $reason ) {
			return __( 'This project has used its Places quota. Wait, or raise the limit in Google Cloud.', 'found-hint' );
		}

		if ( 404 === $status || 'NOT_FOUND' === $reason ) {
			return __( 'Google no longer knows this place. It may have been merged or removed — search for it again.', 'found-hint' );
		}

		if ( '' !== $message ) {
			return $message;
		}

		return __( 'Google refused the request.', 'found-hint' );
	}
}
