<?php
/**
 * Extension registries.
 *
 * @package FoundHint
 */

namespace FHINT\Support;

defined( 'ABSPATH' ) || exit;

/**
 * Holds the named registries that add-ons contribute to.
 *
 * Core features read from these registries rather than from hard-coded lists,
 * which is what lets a separate plugin add schema nodes, audit rules, fixes,
 * blocks, map providers or admin pages without core changing. Carried over
 * from local-seo's registry set; extend the list in names() as new domain
 * areas (e.g. Google Business Profile sync, ranking grid) get their own
 * extension points.
 */
final class Extensions {

	/**
	 * Registry name for JSON-LD node providers.
	 */
	const SCHEMA_PROVIDERS = 'schema_providers';

	/**
	 * Registry name for audit rules.
	 */
	const AUDIT_RULES = 'audit_rules';

	/**
	 * Registry name for audit fix handlers.
	 */
	const FIX_HANDLERS = 'fix_handlers';

	/**
	 * Registry name for editor blocks.
	 */
	const BLOCKS = 'blocks';

	/**
	 * Registry name for map providers.
	 */
	const MAP_PROVIDERS = 'map_providers';

	/**
	 * Registry name for admin pages.
	 */
	const ADMIN_PAGES = 'admin_pages';

	/**
	 * Registry name for REST route controllers.
	 */
	const REST_ROUTES = 'rest_routes';

	/**
	 * Registries keyed by name.
	 *
	 * @var array<string, Registry>
	 */
	private $registries = array();

	/**
	 * Whether the registration hook has already fired.
	 *
	 * @var bool
	 */
	private $registered = false;

	/**
	 * Create the core registries.
	 */
	public function __construct() {
		foreach ( self::names() as $name ) {
			$this->registries[ $name ] = new Registry( $name );
		}
	}

	/**
	 * Core registry names.
	 *
	 * @return string[]
	 */
	public static function names() {
		return array(
			self::SCHEMA_PROVIDERS,
			self::AUDIT_RULES,
			self::FIX_HANDLERS,
			self::BLOCKS,
			self::MAP_PROVIDERS,
			self::ADMIN_PAGES,
			self::REST_ROUTES,
		);
	}

	/**
	 * Get a registry, creating it on demand.
	 *
	 * Creating unknown registries on demand means an add-on can introduce a
	 * new extension point without core releasing a new constant first.
	 *
	 * @param string $name Registry name.
	 * @return Registry
	 */
	public function registry( $name ) {
		$name = (string) $name;

		if ( ! isset( $this->registries[ $name ] ) ) {
			$this->registries[ $name ] = new Registry( $name );
		}

		return $this->registries[ $name ];
	}

	/**
	 * Shorthand for registry( $name )->add().
	 *
	 * @param string $name     Registry name.
	 * @param string $id       Item id.
	 * @param mixed  $item     Item or factory.
	 * @param int    $priority Lower runs earlier.
	 * @return bool
	 */
	public function add( $name, $id, $item, $priority = 10 ) {
		return $this->registry( $name )->add( $id, $item, $priority );
	}

	/**
	 * Shorthand for registry( $name )->all().
	 *
	 * @param string $name Registry name.
	 * @return array<string, mixed>
	 */
	public function all( $name ) {
		return $this->registry( $name )->all();
	}

	/**
	 * Registry names currently present.
	 *
	 * @return string[]
	 */
	public function registry_names() {
		return array_keys( $this->registries );
	}

	/**
	 * Fire the registration hook exactly once.
	 *
	 * @return void
	 */
	public function register_extensions() {
		if ( $this->registered ) {
			return;
		}

		$this->registered = true;

		/**
		 * Fires so add-ons can contribute schema providers, audit rules,
		 * fix handlers, blocks, map providers, admin pages and REST controllers.
		 *
		 * @param Extensions $extensions Extension registries.
		 */
		do_action( 'fhint_register_extensions', $this );
	}

	/**
	 * Whether the registration hook has fired.
	 *
	 * @return bool
	 */
	public function is_registered() {
		return $this->registered;
	}
}
