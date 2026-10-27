<?php
/**
 * What the Posts screen reads and does.
 *
 * @package FoundHint
 */

namespace FHINT\App\Post;

use FHINT\App\Core\ValidationResult;
use FHINT\App\Google\GoogleLocationRepository;
use FHINT\App\Review\ReviewRepository;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Writing, editing and deleting posts, and the reads behind the screen.
 *
 * The REST controller hands every request here; the rules — what may be
 * edited when, what publishing a draft means — live in this class.
 */
class Posts {

	/** The fields only an event or offer has. */
	const DATED = array( 'title', 'starts_at', 'ends_at' );

	/** The fields only an offer has. */
	const OFFER = array( 'coupon_code', 'redeem_url', 'terms' );

	/**
	 * Write a new post — saved as a draft, or sent to Google straight away.
	 *
	 * @param string $location_name Google location resource name.
	 * @param array  $input         Raw fields.
	 * @param bool   $publish       Send it now.
	 * @return array|ValidationResult|WP_Error The post.
	 */
	public static function create( $location_name, array $input, $publish ) {
		$listing = GoogleLocationRepository::find_by_location_name( (string) $location_name );

		if ( ! $listing ) {
			return self::no_listing();
		}

		$post = self::shape(
			array_merge(
				PostRepository::COLUMNS,
				array(
					'topic_type' => 'update',
					'source'     => 'manual',
				),
				PostValidator::sanitize( $input )
			)
		);

		$validation = PostValidator::validate( $post, $publish );

		if ( ! $validation->is_valid() ) {
			return $validation;
		}

		$post['location_name'] = $listing['location_name'];
		$post['account_name']  = $listing['account_name'];
		$post['status']        = 'draft';

		$stored = PostRepository::create( $post );

		if ( ! $stored ) {
			return self::save_failed();
		}

		return $publish ? self::result( PostPublisher::send_new( $stored ) ) : self::present( $stored );
	}

	/**
	 * Change a post.
	 *
	 * A draft or failed post is saved here, and sent when `$publish` is set.
	 * A post that is on Google can only be changed by sending the change —
	 * a copy here that differs from Google would be a lie about the listing
	 * — and Google does not allow its type to change.
	 *
	 * @param int   $id      Row id.
	 * @param array $input   Raw fields.
	 * @param bool  $publish Send it.
	 * @return array|ValidationResult|WP_Error The post.
	 */
	public static function update( $id, array $input, $publish ) {
		$existing = PostRepository::find( $id );

		if ( ! $existing ) {
			return self::not_found();
		}

		$clean = PostValidator::sanitize( $input );

		// Where a post came from is fixed when it is written.
		unset( $clean['source'], $clean['source_ref'] );

		$merged = self::shape( array_merge( $existing, $clean ) );

		if ( self::on_google( $existing ) ) {
			if ( $merged['topic_type'] !== $existing['topic_type'] ) {
				$locked = new ValidationResult();
				$locked->add( 'topic_type', 'post.type.locked' );

				return $locked;
			}

			if ( ! $publish ) {
				return new WP_Error(
					'fhint_post_live',
					__( 'This post is on Google. Changes to it are published straight away.', 'foundhint-local-seo' ),
					array( 'status' => 409 )
				);
			}

			$validation = PostValidator::validate( $merged, true );

			if ( ! $validation->is_valid() ) {
				return $validation;
			}

			return self::result( PostPublisher::send_edit( $existing, self::changes( $merged ) ) );
		}

		$validation = PostValidator::validate( $merged, $publish );

		if ( ! $validation->is_valid() ) {
			return $validation;
		}

		$stored = PostRepository::update( $existing['id'], self::changes( $merged ) );

		if ( ! $stored ) {
			return self::save_failed();
		}

		return $publish ? self::result( PostPublisher::send_new( $stored ) ) : self::present( $stored );
	}

	/**
	 * Send a draft, or try a failed post again.
	 *
	 * @param int $id Row id.
	 * @return array|ValidationResult|WP_Error The post.
	 */
	public static function publish( $id ) {
		$post = PostRepository::find( $id );

		if ( ! $post ) {
			return self::not_found();
		}

		if ( self::on_google( $post ) ) {
			return new WP_Error(
				'fhint_post_already_live',
				__( 'This post is already on Google.', 'foundhint-local-seo' ),
				array( 'status' => 409 )
			);
		}

		$validation = PostValidator::validate( $post, true );

		if ( ! $validation->is_valid() ) {
			return $validation;
		}

		return self::result( PostPublisher::send_new( $post ) );
	}

	/**
	 * Delete a post — from Google first when it is there.
	 *
	 * @param int $id Row id.
	 * @return true|WP_Error
	 */
	public static function delete( $id ) {
		$post = PostRepository::find( $id );

		if ( ! $post ) {
			return self::not_found();
		}

		return PostPublisher::delete( $post );
	}

	/**
	 * One page of posts, with the total and the counts for the type tabs.
	 *
	 * @param array $args Filters, sort and paging (see PostRepository).
	 * @return array{items: array[], total: int, counts: array}
	 */
	public static function listing( array $args ) {
		$filters = $args;

		unset( $filters['per_page'], $filters['offset'], $filters['sort'] );

		$titles = self::titles();

		return array(
			'items'  => array_map(
				function ( $post ) use ( $titles ) {
					return Posts::present( $post, $titles );
				},
				PostRepository::all( $args )
			),
			'total'  => PostRepository::count( $filters ),
			'counts' => PostRepository::counts_by_type( $filters ),
		);
	}

	/**
	 * What the screen needs besides the list.
	 *
	 * @param string $location_name Google location resource name, or ''.
	 * @return array
	 */
	public static function state( $location_name = '' ) {
		$listing   = '' !== (string) $location_name ? GoogleLocationRepository::find_by_location_name( (string) $location_name ) : null;
		$locations = array();

		foreach ( GoogleLocationRepository::all() as $location ) {
			$locations[] = array(
				'location_name' => $location['location_name'],
				'title'         => $location['title'],
				'location_id'   => (int) $location['fhint_location_id'],
			);
		}

		$counts = function_exists( 'wp_count_posts' ) ? wp_count_posts( 'post' ) : null;

		return array(
			'locations'  => $locations,
			'synced_at'  => PostRepository::last_synced_at( (string) $location_name ),
			'website'    => $listing && PostValidator::is_url( $listing['website'] ) ? $listing['website'] : home_url( '/' ),
			'reviews'    => $listing ? self::shareable_reviews( $listing['location_name'] ) : array(),
			'blog_posts' => $counts && isset( $counts->publish ) ? (int) $counts->publish : 0,
			// Whether Google can fetch a photo stored on this site. When it
			// cannot, an uploaded post photo goes on the listing's gallery.
			'uploads_reachable' => PostMedia::is_reachable( self::uploads_url() ),
		);
	}

	/**
	 * One post, shaped for the screen.
	 *
	 * @param array      $post   Stored post.
	 * @param array|null $titles Location titles by resource name; looked up when null.
	 * @return array
	 */
	public static function present( array $post, $titles = null ) {
		$titles = null === $titles ? self::titles() : $titles;

		$post['location_title'] = isset( $titles[ $post['location_name'] ] ) ? $titles[ $post['location_name'] ] : '';
		$post['on_google']      = self::on_google( $post );
		$post['media_reachable'] = '' === $post['media_url'] || PostMedia::is_reachable( $post['media_url'] );

		return $post;
	}

	/**
	 * Where uploads are served from.
	 *
	 * @return string
	 */
	private static function uploads_url() {
		$dirs = function_exists( 'wp_get_upload_dir' ) ? wp_get_upload_dir() : array();

		return isset( $dirs['baseurl'] ) ? (string) $dirs['baseurl'] : home_url( '/' );
	}

	/**
	 * The latest 5-star reviews with words, to turn into posts.
	 *
	 * @param string $location_name Google location resource name.
	 * @return array[]
	 */
	private static function shareable_reviews( $location_name ) {
		$out = array();

		foreach ( ReviewRepository::all( array( 'location_name' => $location_name, 'rating' => 5 ) ) as $review ) {
			if ( '' === trim( (string) $review['comment'] ) ) {
				continue;
			}

			$out[] = array(
				'review_id'     => $review['review_id'],
				'comment'       => $review['comment'],
				'reviewer_name' => $review['is_anonymous'] ? '' : $review['reviewer_name'],
				'reviewed_at'   => $review['reviewed_at'],
			);

			if ( count( $out ) >= 2 ) {
				break;
			}
		}

		return $out;
	}

	/**
	 * Drop what a post's type does not have, so an update never carries an
	 * event's dates and an event never an offer's coupon.
	 *
	 * @param array $post Post.
	 * @return array
	 */
	public static function shape( array $post ) {
		if ( 'update' === $post['topic_type'] ) {
			foreach ( array_merge( self::DATED, self::OFFER ) as $field ) {
				$post[ $field ] = PostRepository::COLUMNS[ $field ];
			}
		}

		if ( 'event' === $post['topic_type'] ) {
			foreach ( self::OFFER as $field ) {
				$post[ $field ] = PostRepository::COLUMNS[ $field ];
			}
		}

		if ( 'offer' === $post['topic_type'] ) {
			$post['cta_type'] = '';
			$post['cta_url']  = '';
		}

		if ( 'call' === $post['cta_type'] || '' === $post['cta_type'] ) {
			$post['cta_url'] = '';
		}

		foreach ( array( 'starts_at', 'ends_at' ) as $field ) {
			$post[ $field ] = null === $post[ $field ] ? '' : (string) $post[ $field ];
		}

		return $post;
	}

	/**
	 * The fields a request can change, from a merged post.
	 *
	 * @param array $post Post.
	 * @return array
	 */
	private static function changes( array $post ) {
		return array_intersect_key(
			$post,
			array_flip( array( 'topic_type', 'title', 'summary', 'cta_type', 'cta_url', 'starts_at', 'ends_at', 'coupon_code', 'redeem_url', 'terms', 'media_url', 'attachment_id' ) )
		);
	}

	/**
	 * Whether a post is on Google.
	 *
	 * @param array $post Stored post.
	 * @return bool
	 */
	private static function on_google( array $post ) {
		return '' !== (string) $post['google_name'] && in_array( $post['status'], PostRepository::ON_GOOGLE, true );
	}

	/**
	 * A publisher's answer, presented when it is a post.
	 *
	 * @param array|WP_Error $result Publisher result.
	 * @return array|WP_Error
	 */
	private static function result( $result ) {
		return is_wp_error( $result ) ? $result : self::present( $result );
	}

	/**
	 * Location titles by resource name, in one query.
	 *
	 * @return array<string, string>
	 */
	private static function titles() {
		$titles = array();

		foreach ( GoogleLocationRepository::all() as $location ) {
			$titles[ $location['location_name'] ] = $location['title'];
		}

		return $titles;
	}

	/**
	 * Not found.
	 *
	 * @return WP_Error
	 */
	private static function not_found() {
		return new WP_Error( 'fhint_post_not_found', __( 'That post no longer exists.', 'foundhint-local-seo' ), array( 'status' => 404 ) );
	}

	/**
	 * No such listing.
	 *
	 * @return WP_Error
	 */
	private static function no_listing() {
		return new WP_Error(
			'fhint_no_google_location',
			__( 'That location has no Google listing. Read your Google profile first.', 'foundhint-local-seo' ),
			array( 'status' => 404 )
		);
	}

	/**
	 * Could not write.
	 *
	 * @return WP_Error
	 */
	private static function save_failed() {
		return new WP_Error( 'fhint_save_failed', __( 'The post could not be saved.', 'foundhint-local-seo' ), array( 'status' => 500 ) );
	}
}
