<?php
/**
 * Google's LocalPost to a stored post, and back.
 *
 * @package FoundHint
 */

namespace FHINT\App\Post;

defined( 'ABSPATH' ) || exit;

/**
 * The one place Google's post shape is spelled out.
 *
 * Posts still live on the legacy v4 API (`localPosts`), like reviews.
 * Google's names are mapped to short ones here — `STANDARD` is an "update",
 * `LEARN_MORE` is `learn_more` — so the rest of the plugin, and the admin
 * app, never see Google's spelling.
 */
class PostMapper {

	/** Our post type => Google's topicType. */
	const TOPICS = array(
		'update' => 'STANDARD',
		'event'  => 'EVENT',
		'offer'  => 'OFFER',
	);

	/** Our button => Google's actionType. */
	const ACTIONS = array(
		'learn_more' => 'LEARN_MORE',
		'order'      => 'ORDER',
		'book'       => 'BOOK',
		'sign_up'    => 'SIGN_UP',
		'shop'       => 'SHOP',
		'call'       => 'CALL',
	);

	/** Google's state => our status. */
	const STATES = array(
		'LIVE'       => 'live',
		'PROCESSING' => 'processing',
		'REJECTED'   => 'rejected',
	);

	/**
	 * A post as Google sent it, as a row.
	 *
	 * @param array  $post          One LocalPost.
	 * @param string $location_name Google location resource name.
	 * @param string $account_name  Google account resource name.
	 * @return array|null Null when Google sent no name — nothing to key it on.
	 */
	public static function from_google( array $post, $location_name, $account_name ) {
		$name = isset( $post['name'] ) ? (string) $post['name'] : '';

		if ( ! self::is_post_name( $name ) ) {
			return null;
		}

		$topic   = array_search( isset( $post['topicType'] ) ? (string) $post['topicType'] : '', self::TOPICS, true );
		$state   = isset( $post['state'] ) ? (string) $post['state'] : '';
		$cta     = isset( $post['callToAction'] ) && is_array( $post['callToAction'] ) ? $post['callToAction'] : array();
		$action  = array_search( isset( $cta['actionType'] ) ? (string) $cta['actionType'] : '', self::ACTIONS, true );
		$event   = isset( $post['event'] ) && is_array( $post['event'] ) ? $post['event'] : array();
		$offer   = isset( $post['offer'] ) && is_array( $post['offer'] ) ? $post['offer'] : array();
		$plan    = isset( $event['schedule'] ) && is_array( $event['schedule'] ) ? $event['schedule'] : array();
		$media   = isset( $post['media'][0] ) && is_array( $post['media'][0] ) ? $post['media'][0] : array();
		$photo   = ! empty( $media['googleUrl'] ) ? (string) $media['googleUrl'] : ( ! empty( $media['sourceUrl'] ) ? (string) $media['sourceUrl'] : '' );
		$topic   = false === $topic ? 'update' : $topic; // ALERT and anything newer read as an update.
		$created = self::utc( isset( $post['createTime'] ) ? (string) $post['createTime'] : '' );

		return array(
			'location_name' => (string) $location_name,
			'account_name'  => (string) $account_name,
			'google_name'   => $name,
			'topic_type'    => $topic,
			'status'        => isset( self::STATES[ $state ] ) ? self::STATES[ $state ] : 'live',
			'title'         => isset( $event['title'] ) ? (string) $event['title'] : '',
			'summary'       => isset( $post['summary'] ) ? (string) $post['summary'] : '',
			'cta_type'      => false === $action ? '' : $action,
			'cta_url'       => isset( $cta['url'] ) ? self::link( (string) $cta['url'] ) : '',
			'starts_at'     => self::from_schedule( $plan, 'start' ),
			'ends_at'       => self::from_schedule( $plan, 'end' ),
			'coupon_code'   => isset( $offer['couponCode'] ) ? (string) $offer['couponCode'] : '',
			'redeem_url'    => isset( $offer['redeemOnlineUrl'] ) ? self::link( (string) $offer['redeemOnlineUrl'] ) : '',
			'terms'         => isset( $offer['termsConditions'] ) ? (string) $offer['termsConditions'] : '',
			'media_url'     => self::link( $photo ),
			'search_url'    => isset( $post['searchUrl'] ) ? self::link( (string) $post['searchUrl'] ) : '',
			'error'         => '',
			'payload'       => $post,
			'published_at'  => $created ? $created : null,
		);
	}

	/**
	 * A stored post as the LocalPost Google takes.
	 *
	 * @param array  $post     Stored post.
	 * @param string $language Language code, e.g. 'en'.
	 * @return array
	 */
	public static function to_google( array $post, $language = 'en' ) {
		$topic = isset( self::TOPICS[ $post['topic_type'] ] ) ? $post['topic_type'] : 'update';
		$body  = array(
			'languageCode' => (string) $language,
			'topicType'    => self::TOPICS[ $topic ],
			'summary'      => (string) $post['summary'],
		);

		// An offer's button is Google's own "View offer"; a CTA is refused.
		if ( 'offer' !== $topic && isset( self::ACTIONS[ $post['cta_type'] ] ) ) {
			$body['callToAction'] = array( 'actionType' => self::ACTIONS[ $post['cta_type'] ] );

			if ( 'call' !== $post['cta_type'] && '' !== (string) $post['cta_url'] ) {
				$body['callToAction']['url'] = (string) $post['cta_url'];
			}
		}

		if ( 'update' !== $topic ) {
			$schedule = array_merge(
				self::to_schedule( (string) $post['starts_at'], 'start', 'event' === $topic ),
				self::to_schedule( (string) $post['ends_at'], 'end', 'event' === $topic )
			);

			// An offer is an event underneath: Google keeps its title and
			// dates on `event`, and the deal itself on `offer`.
			$body['event'] = array(
				'title'    => (string) $post['title'],
				'schedule' => $schedule,
			);
		}

		if ( 'offer' === $topic ) {
			$offer = array_filter(
				array(
					'couponCode'      => (string) $post['coupon_code'],
					'redeemOnlineUrl' => (string) $post['redeem_url'],
					'termsConditions' => (string) $post['terms'],
				),
				'strlen'
			);

			if ( $offer ) {
				$body['offer'] = $offer;
			}
		}

		if ( '' !== (string) $post['media_url'] ) {
			$body['media'] = array(
				array(
					'mediaFormat' => 'PHOTO',
					'sourceUrl'   => (string) $post['media_url'],
				),
			);
		}

		return $body;
	}

	/**
	 * The fields a PATCH of this post replaces.
	 *
	 * Google changes only what the mask names; a field in the body but not
	 * the mask is ignored. `media` is named only when the photo changed:
	 * Google may hold several photos or videos on a post written on Google,
	 * of which this site keeps one link, and sending that one back would
	 * replace the rest.
	 *
	 * @param string $topic_type    update | event | offer.
	 * @param bool   $media_changed Whether the photo was changed or removed.
	 * @return string
	 */
	public static function update_mask( $topic_type, $media_changed = false ) {
		$fields = array( 'summary' );

		if ( $media_changed ) {
			$fields[] = 'media';
		}

		if ( 'offer' !== $topic_type ) {
			$fields[] = 'callToAction';
		}

		if ( 'update' !== $topic_type ) {
			$fields[] = 'event';
		}

		if ( 'offer' === $topic_type ) {
			$fields[] = 'offer';
		}

		return implode( ',', $fields );
	}

	/**
	 * Whether a string is a post resource name Google would give: three
	 * pairs of segment/id. It is checked because it ends up in a URL.
	 *
	 * @param string $name Candidate.
	 * @return bool
	 */
	public static function is_post_name( $name ) {
		return (bool) preg_match( '#^accounts/[A-Za-z0-9_-]+/locations/[A-Za-z0-9_-]+/localPosts/[A-Za-z0-9_-]+$#', (string) $name );
	}

	/**
	 * Google's Date + TimeOfDay as 'Y-m-d H:i:s', or null.
	 *
	 * @param array  $schedule Google's schedule.
	 * @param string $side     start | end.
	 * @return string|null
	 */
	private static function from_schedule( array $schedule, $side ) {
		$date = isset( $schedule[ $side . 'Date' ] ) && is_array( $schedule[ $side . 'Date' ] ) ? $schedule[ $side . 'Date' ] : array();
		$time = isset( $schedule[ $side . 'Time' ] ) && is_array( $schedule[ $side . 'Time' ] ) ? $schedule[ $side . 'Time' ] : array();

		if ( empty( $date['year'] ) || empty( $date['month'] ) || empty( $date['day'] ) ) {
			return null;
		}

		if ( ! checkdate( (int) $date['month'], (int) $date['day'], (int) $date['year'] ) ) {
			return null;
		}

		return sprintf(
			'%04d-%02d-%02d %02d:%02d:00',
			(int) $date['year'],
			(int) $date['month'],
			(int) $date['day'],
			isset( $time['hours'] ) ? min( 23, max( 0, (int) $time['hours'] ) ) : 0,
			isset( $time['minutes'] ) ? min( 59, max( 0, (int) $time['minutes'] ) ) : 0
		);
	}

	/**
	 * 'Y-m-d H:i:s' as Google's `{side}Date` (and `{side}Time`).
	 *
	 * @param string $value     Stored datetime.
	 * @param string $side      start | end.
	 * @param bool   $with_time Whether to send the time of day (events do;
	 *                          an offer runs whole days).
	 * @return array
	 */
	private static function to_schedule( $value, $side, $with_time ) {
		if ( ! preg_match( '/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?/', (string) $value, $m ) ) {
			return array();
		}

		$out = array(
			$side . 'Date' => array(
				'year'  => (int) $m[1],
				'month' => (int) $m[2],
				'day'   => (int) $m[3],
			),
		);

		if ( $with_time ) {
			$out[ $side . 'Time' ] = array(
				'hours'   => isset( $m[4] ) ? (int) $m[4] : 0,
				'minutes' => isset( $m[5] ) ? (int) $m[5] : 0,
				'seconds' => 0,
				'nanos'   => 0,
			);
		}

		return $out;
	}

	/**
	 * Google's RFC 3339 time as a UTC 'Y-m-d H:i:s', or ''.
	 *
	 * @param string $value Time as Google wrote it.
	 * @return string
	 */
	private static function utc( $value ) {
		$time = '' !== $value ? strtotime( $value ) : false;

		return false === $time ? '' : gmdate( 'Y-m-d H:i:s', $time );
	}

	/**
	 * A link Google sent, kept only when it is http(s).
	 *
	 * @param string $url Candidate.
	 * @return string
	 */
	private static function link( $url ) {
		return PostValidator::is_url( $url ) ? esc_url_raw( $url ) : '';
	}
}
