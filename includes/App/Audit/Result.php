<?php
/**
 * The outcome of one rule.
 *
 * @package FoundHint
 */

namespace FHINT\App\Audit;

defined( 'ABSPATH' ) || exit;

/**
 * What a rule found, or didn't.
 *
 * Three outcomes, not two. **`skip()` is the important one**: it means the
 * rule had nothing to judge — no Google connection, so nothing to compare
 * against; no services, so no service rule to apply. A skipped rule is
 * removed from the denominator entirely, because counting it as a failure
 * would penalise a site for a feature it has not opted into, and counting
 * it as a pass would inflate a score nobody earned.
 *
 * A rule carries display text rather than a code, because the issue rows
 * store resolved text: an audit records what the operator was told at the
 * time, and re-rendering a historic finding against copy that has since
 * changed would misrepresent it.
 */
class Result {

	const PASS = 'pass';
	const FAIL = 'fail';
	const SKIP = 'skip';

	/**
	 * Outcome: one of the class constants.
	 *
	 * @var string
	 */
	public $outcome;

	/**
	 * What is wrong, as display text.
	 *
	 * @var string
	 */
	public $message = '';

	/**
	 * What to do about it, as display text.
	 *
	 * @var string
	 */
	public $recommendation = '';

	/**
	 * Detail the UI may render — found and expected values.
	 *
	 * @var array
	 */
	public $context = array();

	/**
	 * Entity the finding is about: business, location or service.
	 *
	 * @var string
	 */
	public $entity_type = '';

	/**
	 * Id of that entity, 0 when site-wide.
	 *
	 * @var int
	 */
	public $entity_id = 0;

	/**
	 * Handler that can fix this without guessing, '' when none can.
	 *
	 * @var string
	 */
	public $fix_handler = '';

	/**
	 * Construct.
	 *
	 * @param string $outcome One of the class constants.
	 */
	private function __construct( $outcome ) {
		$this->outcome = $outcome;
	}

	/**
	 * The rule is satisfied.
	 *
	 * @return self
	 */
	public static function pass() {
		return new self( self::PASS );
	}

	/**
	 * The rule found something.
	 *
	 * @param string $message        What is wrong.
	 * @param string $recommendation What to do about it.
	 * @param array  $context        Detail for the UI.
	 * @return self
	 */
	public static function fail( $message, $recommendation = '', array $context = array() ) {
		$result                 = new self( self::FAIL );
		$result->message        = (string) $message;
		$result->recommendation = (string) $recommendation;
		$result->context        = $context;

		return $result;
	}

	/**
	 * The rule had nothing to judge.
	 *
	 * @return self
	 */
	public static function skip() {
		return new self( self::SKIP );
	}

	/**
	 * Attach the entity this is about.
	 *
	 * @param string $type Entity type.
	 * @param int    $id   Entity id.
	 * @return self
	 */
	public function about( $type, $id = 0 ) {
		$this->entity_type = (string) $type;
		$this->entity_id   = (int) $id;

		return $this;
	}

	/**
	 * Name the handler that can fix this.
	 *
	 * @param string $handler Fix handler id.
	 * @return self
	 */
	public function fixable_by( $handler ) {
		$this->fix_handler = (string) $handler;

		return $this;
	}

	/**
	 * Whether this counted towards the score.
	 *
	 * @return bool
	 */
	public function counts() {
		return self::SKIP !== $this->outcome;
	}

	/**
	 * Whether this passed.
	 *
	 * @return bool
	 */
	public function passed() {
		return self::PASS === $this->outcome;
	}
}
