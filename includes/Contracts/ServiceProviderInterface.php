<?php
/**
 * Service provider contract.
 *
 * @package FoundHint
 */

namespace FHINT\Contracts;

use FHINT\Support\Container;

defined( 'ABSPATH' ) || exit;

/**
 * A service provider wires one slice of the plugin into the container.
 */
interface ServiceProviderInterface {

	/**
	 * Bind services into the container.
	 *
	 * Called for every provider before any provider is booted, so providers
	 * may depend on each other's bindings without caring about order.
	 *
	 * @param Container $container Plugin container.
	 * @return void
	 */
	public function register( Container $container );

	/**
	 * Attach hooks and do work that needs other services to exist.
	 *
	 * @param Container $container Plugin container.
	 * @return void
	 */
	public function boot( Container $container );
}
