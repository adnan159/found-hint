<?php
/**
 * Prioritised registry of extension items.
 *
 * @package FoundHint
 */

namespace FHINT\Support;

defined( 'ABSPATH' ) || exit;

/**
 * An ordered, keyed collection that add-ons can contribute to.
 *
 * Items may be objects or factories. Factories are resolved on first read, so
 * registering an extension never costs more than storing a closure.
 */
class Registry {

	/**
	 * Registry name, used in error messages and hooks.
	 *
	 * @var string
	 */
	private $name;

	/**
	 * Registered entries keyed by id.
	 *
	 * @var array<string, array{item: mixed, priority: int, order: int}>
	 */
	private $entries = array();

	/**
	 * Insertion counter, keeps equal priorities in registration order.
	 *
	 * @var int
	 */
	private $counter = 0;

	/**
	 * Constructor.
	 *
	 * @param string $name Registry name.
	 */
	public function __construct( $name ) {
		$this->name = (string) $name;
	}

	/**
	 * Registry name.
	 *
	 * @return string
	 */
	public function name() {
		return $this->name;
	}

	/**
	 * Add an item.
	 *
	 * @param string $id       Unique id within this registry.
	 * @param mixed  $item     The item, or a callable returning it.
	 * @param int    $priority Lower runs earlier. Default 10.
	 * @return bool True when added, false when the id was already taken.
	 */
	public function add( $id, $item, $priority = 10 ) {
		$id = (string) $id;

		if ( '' === $id || isset( $this->entries[ $id ] ) ) {
			return false;
		}

		$this->entries[ $id ] = array(
			'item'     => $item,
			'priority' => (int) $priority,
			'order'    => $this->counter++,
		);

		return true;
	}

	/**
	 * Replace an item, adding it when absent.
	 *
	 * @param string $id       Item id.
	 * @param mixed  $item     The item, or a callable returning it.
	 * @param int    $priority Lower runs earlier.
	 * @return void
	 */
	public function set( $id, $item, $priority = 10 ) {
		unset( $this->entries[ (string) $id ] );

		$this->add( $id, $item, $priority );
	}

	/**
	 * Remove an item.
	 *
	 * @param string $id Item id.
	 * @return bool True when something was removed.
	 */
	public function remove( $id ) {
		$id = (string) $id;

		if ( ! isset( $this->entries[ $id ] ) ) {
			return false;
		}

		unset( $this->entries[ $id ] );

		return true;
	}

	/**
	 * Whether an id is registered.
	 *
	 * @param string $id Item id.
	 * @return bool
	 */
	public function has( $id ) {
		return isset( $this->entries[ (string) $id ] );
	}

	/**
	 * Get one item, resolving it if it was registered as a factory.
	 *
	 * @param string $id Item id.
	 * @return mixed The item, or null when unknown.
	 */
	public function get( $id ) {
		$id = (string) $id;

		if ( ! isset( $this->entries[ $id ] ) ) {
			return null;
		}

		return $this->resolve( $id );
	}

	/**
	 * Get every item, ordered by priority then registration order.
	 *
	 * @return array<string, mixed> Items keyed by id.
	 */
	public function all() {
		$entries = $this->entries;

		uasort(
			$entries,
			static function ( $a, $b ) {
				if ( $a['priority'] === $b['priority'] ) {
					return $a['order'] <=> $b['order'];
				}

				return $a['priority'] <=> $b['priority'];
			}
		);

		$items = array();
		foreach ( array_keys( $entries ) as $id ) {
			$items[ $id ] = $this->resolve( $id );
		}

		return $items;
	}

	/**
	 * Registered ids in priority order.
	 *
	 * @return string[]
	 */
	public function ids() {
		return array_keys( $this->all() );
	}

	/**
	 * How many items are registered.
	 *
	 * @return int
	 */
	public function count() {
		return count( $this->entries );
	}

	/**
	 * Resolve a factory entry to its item, caching the result.
	 *
	 * @param string $id Item id.
	 * @return mixed
	 */
	private function resolve( $id ) {
		$item = $this->entries[ $id ]['item'];

		if ( $item instanceof \Closure || ( is_object( $item ) && method_exists( $item, '__invoke' ) ) ) {
			$item                         = $item();
			$this->entries[ $id ]['item'] = $item;
		}

		return $item;
	}
}
