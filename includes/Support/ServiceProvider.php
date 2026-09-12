<?php
/**
 * Base service provider.
 *
 * @package FoundHint
 */

namespace FHINT\Support;

use FHINT\Contracts\ServiceProviderInterface;

defined( 'ABSPATH' ) || exit;

/**
 * Convenience base class so providers only implement what they need.
 */
abstract class ServiceProvider implements ServiceProviderInterface {

	/**
	 * Bind services into the container.
	 *
	 * @param Container $container Plugin container.
	 * @return void
	 */
	public function register( Container $container ) {}

	/**
	 * Attach hooks.
	 *
	 * @param Container $container Plugin container.
	 * @return void
	 */
	public function boot( Container $container ) {}
}
