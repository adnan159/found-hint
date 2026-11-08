<?php
/**
 * The "GBP Posting" link under each blog post.
 *
 * @package FoundHint
 */

namespace FHINT\Admin;

use FHINT\App\Core\Capabilities;

defined( 'ABSPATH' ) || exit;

/**
 * "Share your blog on Google" (FoundHint Premium, feature `posts.blog`).
 *
 * With sharing switched on, each published blog post in Posts → All Posts
 * gets a "GBP Posting" link after View. It opens the FoundHint Posts screen
 * with a new post written from that blog post, to check and publish like
 * any other.
 *
 * Premium decides whether sharing is on, through `fhint_blog_sharing_enabled`
 * (its licence and the switch on the Posts screen); without Premium no link
 * is added.
 */
class BlogSharing {

	/** The Posts screen query that opens the composer on a blog post. */
	const QUERY = 'share';

	/**
	 * Hook into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		add_filter( 'post_row_actions', array( __CLASS__, 'row_actions' ), 10, 2 );
	}

	/**
	 * Whether the link is shown at all.
	 *
	 * @return bool
	 */
	public static function enabled() {
		/**
		 * Filters whether blog posts get the "GBP Posting" link. FoundHint
		 * Premium answers it.
		 *
		 * @param bool $enabled Off without Premium.
		 */
		return (bool) apply_filters( 'fhint_blog_sharing_enabled', false );
	}

	/**
	 * Where the link goes for one blog post.
	 *
	 * @param int $post_id Blog post id.
	 * @return string
	 */
	public static function url( $post_id ) {
		return admin_url( 'admin.php?page=' . Menu::SLUG . '#/posts?' . self::QUERY . '=' . absint( $post_id ) );
	}

	/**
	 * Add "GBP Posting" after View.
	 *
	 * @param array    $actions Row actions, keyed.
	 * @param \WP_Post $post    The row's post.
	 * @return array
	 */
	public static function row_actions( $actions, $post ) {
		if ( ! is_array( $actions ) || ! $post instanceof \WP_Post ) {
			return $actions;
		}

		// A published blog post only: Google links to it, so it must be public.
		if ( 'post' !== $post->post_type || 'publish' !== $post->post_status ) {
			return $actions;
		}

		if ( ! Capabilities::current_user_can_manage() || ! self::enabled() ) {
			return $actions;
		}

		$link = sprintf(
			'<a href="%s" aria-label="%s">%s</a>',
			esc_url( self::url( $post->ID ) ),
			/* translators: %s: the blog post's title. */
			esc_attr( sprintf( __( 'Share “%s” as a Google Business Profile post', 'foundhint-local-seo' ), wp_strip_all_tags( get_the_title( $post ) ) ) ),
			esc_html__( 'GBP Posting', 'foundhint-local-seo' )
		);

		$out = array();

		foreach ( $actions as $key => $action ) {
			$out[ $key ] = $action;

			if ( 'view' === $key ) {
				$out['fhint_gbp_posting'] = $link;
			}
		}

		// No View link (some screens drop it): add it at the end.
		if ( ! isset( $out['fhint_gbp_posting'] ) ) {
			$out['fhint_gbp_posting'] = $link;
		}

		return $out;
	}
}
