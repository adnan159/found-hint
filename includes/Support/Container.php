<?php
/**
 * Minimal service container.
 *
 * @package FoundHint
 */

namespace FHINT\Support;

defined( 'ABSPATH' ) || exit;

/**
 * Lazy service locator.
 *
 * Deliberately small: it resolves what the plugin explicitly registers and
 * performs no reflection-based autowiring, so resolution stays predictable
 * and cheap on every request.
 */
final class Container {

	/**
	 * Factories keyed by service id.
	 *
	 * @var array<string, callable>
	 */
	private $factories = array();

	/**
	 * Ids that should resolve to a single shared instance.
	 *
	 * @var array<string, bool>
	 */
	private $shared = array();

	/**
	 * Already-resolved shared instances.
	 *
	 * @var array<string, mixed>
	 */
	private $resolved = array();

	/**
	 * Ids currently being resolved, used to detect circular dependencies.
	 *
	 * @var array<string, bool>
	 */
	private $resolving = array();

	/**
	 * Register a shared service.
	 *
	 * @param string   $id      Service id, conventionally the class name.
	 * @param callable $factory Receives the container, returns the service.
	 * @return void
	 */
	public function singleton( $id, callable $factory ) {
		$this->factories[ $id ] = $factory;
		$this->shared[ $id ]    = true;
		unset( $this->resolved[ $id ] );
	}

	/**
	 * Register a factory that returns a fresh instance each time.
	 *
	 * @param string   $id      Service id.
	 * @param callable $factory Receives the container, returns the service.
	 * @return void
	 */
	public function bind( $id, callable $factory ) {
		$this->factories[ $id ] = $factory;
		$this->shared[ $id ]    = false;
		unset( $this->resolved[ $id ] );
	}

	/**
	 * Store an already-built object as a shared service.
	 *
	 * @param string $id     Service id.
	 * @param mixed  $object The service.
	 * @return void
	 */
	public function instance( $id, $object ) {
		$this->resolved[ $id ] = $object;
		$this->shared[ $id ]   = true;
	}

	/**
	 * Whether an id can be resolved.
	 *
	 * @param string $id Service id.
	 * @return bool
	 */
	public function has( $id ) {
		return isset( $this->resolved[ $id ] ) || isset( $this->factories[ $id ] );
	}

	/**
	 * Resolve a service.
	 *
	 * @param string $id Service id.
	 * @return mixed The service, or null when the id is unknown.
	 */
	public function get( $id ) {
		if ( isset( $this->resolved[ $id ] ) ) {
			return $this->resolved[ $id ];
		}

		if ( ! isset( $this->factories[ $id ] ) ) {
			return null;
		}

		if ( isset( $this->resolving[ $id ] ) ) {
			// A circular dependency would otherwise recurse until PHP dies.
			return null;
		}

		$this->resolving[ $id ] = true;

		$service = call_user_func( $this->factories[ $id ], $this );

		unset( $this->resolving[ $id ] );

		if ( ! empty( $this->shared[ $id ] ) ) {
			$this->resolved[ $id ] = $service;
		}

		return $service;
	}

	/**
	 * Get every registered service id.
	 *
	 * @return string[]
	 */
	public function ids() {
		return array_values( array_unique( array_merge( array_keys( $this->factories ), array_keys( $this->resolved ) ) ) );
	}
}
