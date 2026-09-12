<?php
/**
 * Global hook wiring that doesn't belong to a specific class.
 *
 * @package FoundHint
 */

defined( 'ABSPATH' ) || exit;

/**
 * Nothing yet — this file exists so the structure and the include in
 * found-hint.php are in place before any global (non-class) hook needs one.
 * Prefer wiring hooks inside a service provider's boot() over adding here;
 * this file is only for truly plugin-wide wiring with no natural owner.
 */
