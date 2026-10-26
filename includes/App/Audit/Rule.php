<?php
/**
 * The rule contract.
 *
 * @package FoundHint
 */

namespace FHINT\App\Audit;

defined( 'ABSPATH' ) || exit;

/**
 * One check the audit performs.
 *
 * A rule is a pure function of the `Context` it is handed. **It reads
 * nothing for itself** — no repositories, no options, no HTTP — which is
 * what makes the whole rule set testable without a database, keeps a run
 * to a fixed number of queries however many rules exist, and stops a rule
 * from quietly becoming a second source of truth for a phone number.
 *
 * Pro adds rules by appending to `fhint_audit_rules`; nothing in Free needs
 * to change to accommodate one.
 */
abstract class Rule {

	/**
	 * Stable identifier, e.g. 'business.phone'.
	 *
	 * Survives copy changes, and is what a fix handler is matched against,
	 * so renaming one is a migration rather than a rename.
	 *
	 * @return string
	 */
	abstract public function id();

	/**
	 * Which part of the score this contributes to.
	 *
	 * @return string
	 */
	abstract public function category();

	/**
	 * How urgent a finding from this rule is.
	 *
	 * @return string
	 */
	abstract public function severity();

	/**
	 * Judge the site.
	 *
	 * @param Context $context Everything the rule may read.
	 * @return Result
	 */
	abstract public function evaluate( Context $context );

	/**
	 * How much this rule is worth within its category.
	 *
	 * Separate from severity: a missing logo is low severity but still
	 * costs something, and a rule that is urgent is not automatically the
	 * one that should move the score most.
	 *
	 * @return int
	 */
	public function weight() {
		return 1;
	}
}
