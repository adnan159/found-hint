<?php
/**
 * Admin service provider.
 *
 * @package FoundHint
 */

namespace FHINT\Presentation\Admin;

use FHINT\Support\Container;
use FHINT\Support\ServiceProvider;

defined( 'ABSPATH' ) || exit;

/**
 * Wires the admin presentation layer.
 */
final class AdminServiceProvider extends ServiceProvider {

	/**
	 * Bind admin services.
	 *
	 * @param Container $container Plugin container.
	 * @return void
	 */
	public function register( Container $container ) {
		$container->singleton(
			Menu::class,
			static function () {
				return new Menu();
			}
		);

		$container->singleton(
			Enqueue::class,
			static function ( Container $c ) {
				return new Enqueue( $c->get( Menu::class ) );
			}
		);
	}

	/**
	 * Attach admin hooks.
	 *
	 * Nothing here runs on front-end requests, which keeps admin code and
	 * assets off public pages entirely.
	 *
	 * @param Container $container Plugin container.
	 * @return void
	 */
	public function boot( Container $container ) {
		if ( ! is_admin() ) {
			return;
		}

		$container->get( Menu::class )->register();
		$container->get( Enqueue::class )->register();
	}
}
