<?php
/**
 * Cleaning and checking a post as typed.
 *
 * @package FoundHint
 */

namespace FHINT\App\Post;

use FHINT\App\Core\ValidationResult;

defined( 'ABSPATH' ) || exit;

/**
 * Google's rules for a post, checked here so a refusal names the field.
 *
 * Google's own answer to a bad post is one "invalid argument" for the whole
 * thing; every limit below is checked first so the form can put the message
 * under the right input.
 *
 * A **draft** is checked loosely — only what could never be sent (an
 * unknown type, a field over its limit, a link that is not a link). A post
 * being **published** must also be complete.
 */
class PostValidator {

	const SUMMARY_MAX = 1500;
	const TITLE_MAX   = 58;
	const TERMS_MAX   = 5000;
	const COUPON_MAX  = 58;

	/**
	 * Where a post may say it came from, on a request. Pro widens this
	 * through `fhint_post_sources` when it adds its own ways to write one.
	 *
	 * @return string[]
	 */
	public static function sources() {
		/**
		 * Filters the post sources a request may set.
		 *
		 * @param string[] $sources Source keys.
		 */
		$sources = apply_filters( 'fhint_post_sources', array( 'manual', 'review' ) );

		return is_array( $sources ) ? array_values( array_map( 'strval', $sources ) ) : array( 'manual', 'review' );
	}

	/**
	 * The fields a request may set, cleaned.
	 *
	 * Absent fields are absent from the result, so an update changes only
	 * what was sent.
	 *
	 * @param array $input Raw request fields.
	 * @return array
	 */
	public static function sanitize( array $input ) {
		$clean = array();

		$text = array( 'title', 'coupon_code', 'source_ref' );
		$area = array( 'summary', 'terms' );
		$urls = array( 'cta_url', 'redeem_url', 'media_url' );
		$keys = array( 'topic_type', 'cta_type', 'source' );

		foreach ( $text as $field ) {
			if ( array_key_exists( $field, $input ) ) {
				$clean[ $field ] = sanitize_text_field( is_scalar( $input[ $field ] ) ? (string) $input[ $field ] : '' );
			}
		}

		foreach ( $area as $field ) {
			if ( array_key_exists( $field, $input ) ) {
				$clean[ $field ] = sanitize_textarea_field( is_scalar( $input[ $field ] ) ? (string) $input[ $field ] : '' );
			}
		}

		foreach ( $urls as $field ) {
			if ( array_key_exists( $field, $input ) ) {
				// Kept as typed when it is not a link, so validate() can say
				// so — esc_url_raw() would quietly turn "not a link" into one.
				$value           = is_scalar( $input[ $field ] ) ? trim( (string) $input[ $field ] ) : '';
				$clean[ $field ] = self::is_url( $value ) ? esc_url_raw( $value ) : sanitize_text_field( $value );
			}
		}

		foreach ( $keys as $field ) {
			if ( array_key_exists( $field, $input ) ) {
				$clean[ $field ] = sanitize_key( is_scalar( $input[ $field ] ) ? (string) $input[ $field ] : '' );
			}
		}

		foreach ( array( 'starts_at', 'ends_at' ) as $field ) {
			if ( array_key_exists( $field, $input ) ) {
				$clean[ $field ] = self::datetime( is_scalar( $input[ $field ] ) ? (string) $input[ $field ] : '' );
			}
		}

		if ( array_key_exists( 'attachment_id', $input ) ) {
			$clean['attachment_id'] = absint( $input['attachment_id'] );
		}

		return $clean;
	}

	/**
	 * Whether a post can be saved, or sent.
	 *
	 * @param array $post    Cleaned post: every field present.
	 * @param bool  $publish True when it is about to go to Google.
	 * @return ValidationResult
	 */
	public static function validate( array $post, $publish ) {
		$result = new ValidationResult();
		$topic  = (string) $post['topic_type'];

		if ( ! isset( PostMapper::TOPICS[ $topic ] ) ) {
			$result->add( 'topic_type', 'post.type.invalid' );

			return $result;
		}

		if ( ! in_array( (string) $post['source'], self::sources(), true ) ) {
			$result->add( 'source', 'post.source.invalid' );
		}

		$summary = (string) $post['summary'];

		if ( self::length( $summary ) > self::SUMMARY_MAX ) {
			$result->add( 'summary', 'post.summary.too_long' );
		} elseif ( $publish && '' === $summary && 'event' !== $topic ) {
			// An event can stand on its title and dates; an update or an
			// offer is nothing without words.
			$result->add( 'summary', 'post.summary.required' );
		}

		if ( 'update' !== $topic ) {
			self::check_title( $result, (string) $post['title'], $publish );
			self::check_dates( $result, $post, $publish );
		}

		if ( 'offer' !== $topic ) {
			self::check_button( $result, (string) $post['cta_type'], (string) $post['cta_url'], $publish );
		} else {
			if ( self::length( (string) $post['coupon_code'] ) > self::COUPON_MAX ) {
				$result->add( 'coupon_code', 'post.coupon_code.too_long' );
			}

			if ( '' !== (string) $post['redeem_url'] && ! self::is_url( (string) $post['redeem_url'] ) ) {
				$result->add( 'redeem_url', 'post.redeem_url.invalid' );
			}

			if ( self::length( (string) $post['terms'] ) > self::TERMS_MAX ) {
				$result->add( 'terms', 'post.terms.too_long' );
			}
		}

		if ( '' !== (string) $post['media_url'] && ! self::is_url( (string) $post['media_url'] ) ) {
			$result->add( 'media_url', 'post.media_url.invalid' );
		} elseif ( $publish && PostMedia::is_temporary( (string) $post['media_url'] ) ) {
			// Google refuses its own still-processing link with a bare
			// "Internal error"; say what is wrong instead.
			$result->add( 'media_url', 'post.media_url.processing' );
		}

		return $result;
	}

	/**
	 * An http(s) link with a host. Nothing else is ever sent as one.
	 *
	 * @param string $url Candidate.
	 * @return bool
	 */
	public static function is_url( $url ) {
		$url = (string) $url;

		if ( '' === $url || false === filter_var( $url, FILTER_VALIDATE_URL ) ) {
			return false;
		}

		$scheme = strtolower( (string) wp_parse_url( $url, PHP_URL_SCHEME ) );

		return in_array( $scheme, array( 'http', 'https' ), true ) && '' !== (string) wp_parse_url( $url, PHP_URL_HOST );
	}

	/**
	 * A date or date-time as typed — '2026-10-05', '2026-10-05T14:30' or
	 * '2026-10-05 14:30:00' — as 'Y-m-d H:i:s'. Not a real date: 'invalid'.
	 * Empty: ''.
	 *
	 * @param string $value As typed.
	 * @return string
	 */
	public static function datetime( $value ) {
		$value = trim( (string) $value );

		if ( '' === $value ) {
			return '';
		}

		if ( ! preg_match( '/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2})?)?$/', $value, $m ) ) {
			return 'invalid';
		}

		if ( ! checkdate( (int) $m[2], (int) $m[3], (int) $m[1] ) ) {
			return 'invalid';
		}

		$hours   = isset( $m[4] ) ? (int) $m[4] : 0;
		$minutes = isset( $m[5] ) ? (int) $m[5] : 0;

		if ( $hours > 23 || $minutes > 59 ) {
			return 'invalid';
		}

		return sprintf( '%s-%s-%s %02d:%02d:00', $m[1], $m[2], $m[3], $hours, $minutes );
	}

	/**
	 * Title rules for an event or offer.
	 *
	 * @param ValidationResult $result  Collects errors.
	 * @param string           $title   Title.
	 * @param bool             $publish Publishing.
	 * @return void
	 */
	private static function check_title( ValidationResult $result, $title, $publish ) {
		if ( self::length( $title ) > self::TITLE_MAX ) {
			$result->add( 'title', 'post.title.too_long' );
		} elseif ( $publish && '' === $title ) {
			$result->add( 'title', 'post.title.required' );
		}
	}

	/**
	 * Start and end for an event or offer.
	 *
	 * @param ValidationResult $result  Collects errors.
	 * @param array            $post    Post.
	 * @param bool             $publish Publishing.
	 * @return void
	 */
	private static function check_dates( ValidationResult $result, array $post, $publish ) {
		$starts = (string) $post['starts_at'];
		$ends   = (string) $post['ends_at'];

		foreach ( array( 'starts_at' => $starts, 'ends_at' => $ends ) as $field => $value ) {
			if ( 'invalid' === $value ) {
				$result->add( $field, 'post.' . $field . '.invalid' );
			} elseif ( $publish && '' === $value ) {
				$result->add( $field, 'post.' . $field . '.required' );
			}
		}

		if ( '' !== $starts && '' !== $ends && 'invalid' !== $starts && 'invalid' !== $ends ) {
			// An offer runs whole days, so one that starts and ends on the
			// same day is fine; an event must end after it starts.
			$too_early = 'offer' === $post['topic_type'] ? substr( $ends, 0, 10 ) < substr( $starts, 0, 10 ) : $ends <= $starts;

			if ( $too_early ) {
				$result->add( 'ends_at', 'post.ends_at.before_start' );
			}
		}
	}

	/**
	 * Button rules for an update or event.
	 *
	 * @param ValidationResult $result  Collects errors.
	 * @param string           $type    Button key, '' for none.
	 * @param string           $url     Link.
	 * @param bool             $publish Publishing.
	 * @return void
	 */
	private static function check_button( ValidationResult $result, $type, $url, $publish ) {
		if ( '' === $type ) {
			return;
		}

		if ( ! isset( PostMapper::ACTIONS[ $type ] ) ) {
			$result->add( 'cta_type', 'post.cta_type.invalid' );

			return;
		}

		// "Call now" dials the listing's own number: there is no link.
		if ( 'call' === $type ) {
			return;
		}

		if ( '' === $url ) {
			if ( $publish ) {
				$result->add( 'cta_url', 'post.cta_url.required' );
			}
		} elseif ( ! self::is_url( $url ) ) {
			$result->add( 'cta_url', 'post.cta_url.invalid' );
		}
	}

	/**
	 * Characters, not bytes: Google counts what a reader sees.
	 *
	 * @param string $text Text.
	 * @return int
	 */
	private static function length( $text ) {
		return function_exists( 'mb_strlen' ) ? mb_strlen( (string) $text, 'UTF-8' ) : strlen( (string) $text );
	}
}
