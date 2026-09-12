<?php
/**
 * Plugin core.
 *
 * @package FoundHint
 */

namespace FHINT;

use FHINT\Contracts\ServiceProviderInterface;
use FHINT\Infrastructure\WordPress\Capabilities;
use FHINT\Presentation\Admin\AdminServiceProvider;
use FHINT\Support\Container;
use FHINT\Support\Extensions;

defined( 'ABSPATH' ) || exit;

/**
 * Owns the container, the extension registries, and the boot sequence.
 *
 * Boot order is deliberate (mirrors local-seo/docs/ARCHITECTURE.md):
 * all register() before any boot() so providers never depend on each
 * other's load order; extensions fire between register() and boot() so
 * add-ons contribute to registries after core has filled them and before
 * anything reads them.
 *
 * default_providers() currently lists only AdminServiceProvider — this is
 * a scaffold. As Domain/Application/Infrastructure/Presentation classes are
 * built out (following local-seo's layering — see CLAUDE.md), add their
 * service providers here in the same register-then-boot shape.
 */
final class Plugin {

	/**
	 * Singleton instance.
	 *
	 * @var Plugin|null
	 */
	private static $instance = null;

	/**
	 * Service container.
	 *
	 * @var Container
	 */
	private $container;

	/**
	 * Extension registries.
	 *
	 * @var Extensions
	 */
	private $extensions;

	/**
	 * Instantiated providers.
	 *
	 * @var ServiceProviderInterface[]
	 */
	private $providers = array();

	/**
	 * Whether boot() has already run.
	 *
	 * @var bool
	 */
	private $booted = false;

	/**
	 * Build the container. Use instance().
	 */
	private function __construct() {
		$this->container  = new Container();
		$this->extensions = new Extensions();

		$this->container->instance( Container::class, $this->container );
		$this->container->instance( Extensions::class, $this->extensions );
		$this->container->instance( self::class, $this );
	}

	/**
	 * Shared instance.
	 *
	 * @return Plugin
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Boot the plugin.
	 *
	 * @return void
	 */
	public function boot() {
		if ( $this->booted ) {
			return;
		}

		$this->booted = true;

		$this->load_textdomain();

		( new Capabilities() )->register();

		$this->load_providers();
		$this->register_providers();

		// Add-ons contribute to the registries after core has filled them,
		// and before anything reads them.
		$this->extensions->register_extensions();

		$this->boot_providers();

		/**
		 * Fires once the plugin has fully booted.
		 *
		 * @param Plugin $plugin Plugin instance.
		 */
		do_action( 'fhint_loaded', $this );
	}

	/**
	 * Instantiate the configured providers.
	 *
	 * @return void
	 */
	private function load_providers() {
		/**
		 * Filters the service provider class names the plugin boots.
		 *
		 * @param string[] $providers Provider class names.
		 * @param Plugin   $plugin    Plugin instance.
		 */
		$classes = apply_filters( 'fhint_service_providers', $this->default_providers(), $this );

		foreach ( (array) $classes as $class_name ) {
			if ( ! is_string( $class_name ) || ! class_exists( $class_name ) ) {
				continue;
			}

			$provider = new $class_name();

			if ( ! $provider instanceof ServiceProviderInterface ) {
				continue;
			}

			$this->providers[ $class_name ] = $provider;
		}
	}

	/**
	 * Providers shipped with the plugin.
	 *
	 * Scaffold only — add DatabaseServiceProvider, ApplicationServiceProvider,
	 * SchemaServiceProvider, AuditServiceProvider, RestServiceProvider,
	 * FrontendServiceProvider etc. here as those layers are built out.
	 *
	 * @return string[]
	 */
	private function default_providers() {
		return array(
			AdminServiceProvider::class,
		);
	}

	/**
	 * Let every provider bind its services.
	 *
	 * @return void
	 */
	private function register_providers() {
		foreach ( $this->providers as $provider ) {
			$provider->register( $this->container );
		}
	}

	/**
	 * Let every provider attach its hooks.
	 *
	 * @return void
	 */
	private function boot_providers() {
		foreach ( $this->providers as $provider ) {
			$provider->boot( $this->container );
		}
	}

	/**
	 * Load translations.
	 *
	 * @return void
	 */
	private function load_textdomain() {
		load_plugin_textdomain( 'found-hint', false, dirname( FHINT_BASENAME ) . '/languages' );
	}

	/**
	 * The service container.
	 *
	 * @return Container
	 */
	public function container() {
		return $this->container;
	}

	/**
	 * The extension registries.
	 *
	 * @return Extensions
	 */
	public function extensions() {
		return $this->extensions;
	}

	/**
	 * Resolve a service.
	 *
	 * @param string $id Service id.
	 * @return mixed
	 */
	public function get( $id ) {
		return $this->container->get( $id );
	}

	/**
	 * Booted provider class names.
	 *
	 * @return string[]
	 */
	public function provider_names() {
		return array_keys( $this->providers );
	}

	/**
	 * Whether boot() has run.
	 *
	 * @return bool
	 */
	public function is_booted() {
		return $this->booted;
	}

	/**
	 * Plugin version.
	 *
	 * @return string
	 */
	public function version() {
		return FHINT_VERSION;
	}
}
