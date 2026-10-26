<?php
/**
 * The audit engine.
 *
 * Run with plain PHP: `php tests/Smoke/audit.php`.
 *
 * Every rule is a pure function of the `Context` it is handed, so the whole
 * rule set, the scoring and the registry are exercised here without a
 * database. What is *stored* is covered by `tests/Integration/database.php`.
 *
 * The rules that matter most are the ones about not reporting: a skip is
 * removed from the denominator, and a category with nothing to judge has
 * its weight redistributed rather than counted as failure.
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\App\Audit\Category;
use FHINT\App\Audit\Context;
use FHINT\App\Audit\Registry;
use FHINT\App\Audit\Result;
use FHINT\App\Audit\Rule;
use FHINT\App\Audit\Runner;
use FHINT\App\Audit\Score;
use FHINT\App\Audit\Severity;

echo "Audit engine\n";

/**
 * A context describing a healthy site.
 *
 * @param array $overrides Values to replace.
 * @return Context
 */
function context( array $overrides = array() ) {
	$base = array(
		'business'  => array( 'id' => 1 ),
		'location'  => array( 'id' => 5, 'status' => 'active' ),
		'locations' => array( array( 'id' => 5, 'is_primary' => true ) ),
		'services'  => array( array( 'name' => 'Check-up' ) ),
		'nap'       => array(
			'business_name'   => 'Northside Dental Care',
			'name'            => 'Northside Dental Care',
			'business_type'   => 'Dentist',
			'description'     => 'A dental practice in Austin that has been open since 1998.',
			'phone'           => '+1 512 555 0134',
			'website'         => 'https://northsidedental.test',
			'logo_url'        => 'https://northsidedental.test/logo.png',
			'social_profiles' => array( 'facebook' => 'https://facebook.com/northside' ),
			'address'         => array(
				'line_1'   => '401 Congress Ave',
				'city'     => 'Austin',
				'country'  => 'US',
				'complete' => true,
			),
			'coordinates'     => array( 'has_both' => true ),
			'hours'           => hours_payload( true, array() ),
		),
		'schema'           => array( '@graph' => array( array( 'openingHoursSpecification' => array( array() ) ) ) ),
		'schema_published' => true,
		'schema_mode'      => 'auto',
		'schema_ownership' => array( 'detected' => array() ),
		'google'           => array( 'status' => 'connected' ),
		'google_location'  => array(
			'location_name' => 'locations/456',
			'title'         => 'Northside Dental Care',
			'phone'         => '+1 512 555 0134',
		),
	);

	// One level of merge for the record-shaped keys, so an override can set
	// a single field; a straight replace for everything else, because
	// `array_replace_recursive` cannot express "make this empty" — an empty
	// array merges to no change, which silently turns "no services" into
	// "the default services" and makes a rule look broken.
	$merge = array( 'nap', 'business', 'location', 'google', 'google_location' );

	foreach ( $overrides as $key => $value ) {
		$base[ $key ] = ( in_array( $key, $merge, true ) && is_array( $value ) )
			? array_replace( $base[ $key ], $value )
			: $value;
	}

	return Context::from_parts( $base );
}

/**
 * An hours payload.
 *
 * @param bool  $has_any    Whether any day is open.
 * @param array $unset_days Days with no answer.
 * @return array
 */
function hours_payload( $has_any, array $unset_days ) {
	$days = array();

	foreach ( array( 1, 2, 3, 4, 5, 6, 0 ) as $day ) {
		$days[] = array(
			'day_of_week' => $day,
			'day_name'    => 'Day ' . $day,
			'configured'  => ! in_array( $day, $unset_days, true ),
			'periods'     => array(),
		);
	}

	return array(
		'days'          => $days,
		'has_any_hours' => $has_any,
		'period_count'  => $has_any ? 7 : 0,
	);
}

/**
 * Run one rule by its id.
 *
 * @param string  $id      Rule id.
 * @param Context $context Context.
 * @return Result
 */
function run_rule( $id, Context $context ) {
	foreach ( Registry::rules() as $rule ) {
		if ( $rule->id() === $id ) {
			return $rule->evaluate( $context );
		}
	}

	return Result::skip();
}

/**
 * Assert a rule's outcome.
 *
 * @param string  $id       Rule id.
 * @param string  $expected Expected outcome.
 * @param Context $context  Context.
 * @param string  $label    What is being checked.
 * @return void
 */
function check_rule( $id, $expected, Context $context, $label ) {
	check_same( $expected, run_rule( $id, $context )->outcome, $label );
}

// -- The registry ----------------------------------------------------------

$rules = Registry::rules();

check( count( $rules ) >= 20, 'the core rule set is registered' );

$ids = array();

foreach ( $rules as $rule ) {
	check( $rule instanceof Rule, $rule->id() . ': is a Rule' );
	check( Category::is_valid( $rule->category() ), $rule->id() . ': declares a known category' );
	check( Severity::is_valid( $rule->severity() ), $rule->id() . ': declares a known severity' );
	check( $rule->weight() >= 1, $rule->id() . ': has a usable weight' );

	$ids[] = $rule->id();
}

check_same( count( $ids ), count( array_unique( $ids ) ), 'every rule id is unique' );

// -- A rule set is only extendable if a bad extension cannot break a run ---

$GLOBALS['__filters'] = array();

add_filter(
	'fhint_audit_rules',
	static function ( $classes ) {
		$classes[] = 'ThisClassDoesNotExist';
		$classes[] = 'stdClass';
		$classes[] = \FHINT\App\Audit\Rules\BusinessName::class; // A duplicate id.

		return $classes;
	}
);

$extended = Registry::rules();

check_same( count( $rules ), count( $extended ), 'a missing class, a non-rule and a duplicate id are all dropped' );

$GLOBALS['__filters'] = array();

// -- A healthy site passes everything --------------------------------------

$healthy = Runner::evaluate( context() );
$failed  = array();

foreach ( $healthy as $entry ) {
	if ( $entry['result']->counts() && ! $entry['result']->passed() ) {
		$failed[] = $entry['rule']->id();
	}
}

check_same( array(), $failed, 'a complete, connected, consistent site has no findings' );

$summary = Runner::summarise( $healthy );

check_same( 100, $summary['score'], 'and scores 100' );
check_same( Score::BAND_EXCELLENT, $summary['band'], 'landing in the excellent band' );
check_same( 0, $summary['issues_total'], 'with nothing to report' );
check( $summary['issues_passed'] > 0, 'and the passes are counted, so the denominator is known' );

// -- Individual rules ------------------------------------------------------

check_rule( 'business.name', Result::FAIL, context( array( 'nap' => array( 'business_name' => '' ) ) ), 'a missing name fails' );
check_rule( 'business.phone', Result::FAIL, context( array( 'nap' => array( 'phone' => '' ) ) ), 'a missing phone fails' );
check_rule( 'business.type', Result::FAIL, context( array( 'nap' => array( 'business_type' => 'LocalBusiness' ) ) ), 'a generic business type fails' );
check_rule( 'business.type', Result::PASS, context( array( 'nap' => array( 'business_type' => 'Dentist' ) ) ), 'a specific type passes' );
check_rule( 'business.description', Result::FAIL, context( array( 'nap' => array( 'description' => 'Short.' ) ) ), 'a very short description fails' );
check_rule( 'business.logo', Result::FAIL, context( array( 'nap' => array( 'logo_url' => '' ) ) ), 'a missing logo fails' );
check_rule( 'business.services', Result::FAIL, context( array( 'services' => array() ) ), 'no services fails' );

$no_address = context();
$no_address->nap['address']['complete'] = false;
$no_address->nap['address']['line_1']   = '';

check_rule( 'location.address', Result::FAIL, $no_address, 'an incomplete address fails' );

$result = run_rule( 'location.address', $no_address );
check( in_array( 'line_1', $result->context['missing'], true ), 'and names which parts are missing' );

check_rule( 'location.coordinates', Result::FAIL, context( array( 'nap' => array( 'coordinates' => array( 'has_both' => false ) ) ) ), 'missing coordinates fails' );
check_rule( 'location.status', Result::FAIL, context( array( 'location' => array( 'status' => 'temporarily_closed' ) ) ), 'a closed location fails' );

// -- Exactly one primary ---------------------------------------------------

$none = context( array( 'locations' => array( array( 'id' => 5, 'is_primary' => false ) ) ) );

check_rule( 'location.primary', Result::FAIL, $none, 'no primary location fails' );
check_same( 'location.set_primary', run_rule( 'location.primary', $none )->fix_handler, 'and offers a fix' );

$two = Context::from_parts(
	array_merge(
		(array) context(),
		array(
			'locations' => array(
				array( 'id' => 5, 'is_primary' => true ),
				array( 'id' => 6, 'is_primary' => true ),
			),
		)
	)
);

check_rule( 'location.primary', Result::FAIL, $two, 'two primary locations also fails' );
check_same( 2, run_rule( 'location.primary', $two )->context['primaries'], 'reporting how many there are' );

// -- Hours, and the three-state model --------------------------------------

check_rule( 'hours.set', Result::FAIL, context( array( 'nap' => array( 'hours' => hours_payload( false, array() ) ) ) ), 'no hours at all fails' );

// A day with no answer is a finding — but only once the week has been
// started. Reporting both "no hours" and "some days missing" for an empty
// week would be two findings for one gap.
$empty_week = context( array( 'nap' => array( 'hours' => hours_payload( false, array( 1, 2, 3 ) ) ) ) );

check_rule( 'hours.complete', Result::SKIP, $empty_week, 'the completeness rule stands down when no hours are set at all' );

$partial = context( array( 'nap' => array( 'hours' => hours_payload( true, array( 3, 6 ) ) ) ) );

check_rule( 'hours.complete', Result::FAIL, $partial, 'days with no answer are reported once the week is started' );
check_same( 2, count( run_rule( 'hours.complete', $partial )->context['days'] ), 'naming each unanswered day' );

check_rule( 'hours.complete', Result::PASS, context(), 'a fully answered week passes' );

// -- Schema ----------------------------------------------------------------

check_rule( 'schema.published', Result::FAIL, context( array( 'schema_published' => false ) ), 'not publishing fails' );

// Choosing not to publish is a decision, not a failure.
check_rule(
	'schema.published',
	Result::SKIP,
	context( array( 'schema_published' => false, 'schema_mode' => 'disabled' ) ),
	'publishing switched off deliberately is skipped, not failed'
);
check_rule(
	'schema.published',
	Result::SKIP,
	context( array( 'schema_published' => false, 'schema_mode' => 'seo_plugin' ) ),
	'and so is handing the job to an SEO plugin'
);

check_rule(
	'schema.hours',
	Result::FAIL,
	context( array( 'schema' => array( '@graph' => array( array() ) ) ) ),
	'markup without opening hours fails'
);
check_rule(
	'schema.hours',
	Result::SKIP,
	context( array( 'schema_published' => false ) ),
	'and is skipped when nothing is published at all'
);

// -- Conflicting markup ----------------------------------------------------

$conflict = context(
	array(
		'schema_ownership' => array(
			'detected' => array(
				array( 'name' => 'Yoast SEO', 'emits_local_business' => true ),
			),
		),
	)
);

check_rule( 'schema.conflict', Result::FAIL, $conflict, 'a plugin known to publish the same markup is reported' );

$unknown = context(
	array(
		'schema_ownership' => array(
			'detected' => array(
				array( 'name' => 'Rank Math', 'emits_local_business' => null ),
			),
		),
	)
);

check_rule( 'schema.conflict', Result::FAIL, $unknown, 'so is one that might be — it cannot be ruled out' );

$harmless = context(
	array(
		'schema_ownership' => array(
			'detected' => array(
				array( 'name' => 'The SEO Framework', 'emits_local_business' => false ),
			),
		),
	)
);

check_rule( 'schema.conflict', Result::PASS, $harmless, 'a plugin known not to publish it is no conflict' );

// -- Website ---------------------------------------------------------------

check_rule( 'website.address', Result::FAIL, context( array( 'nap' => array( 'website' => '' ) ) ), 'no website fails' );
check_rule( 'website.secure', Result::FAIL, context( array( 'nap' => array( 'website' => 'http://example.test' ) ) ), 'a plain http address fails' );
check_same(
	'business.force_https',
	run_rule( 'website.secure', context( array( 'nap' => array( 'website' => 'http://example.test' ) ) ) )->fix_handler,
	'and offers the fix that corrects only the scheme'
);
check_rule( 'website.secure', Result::SKIP, context( array( 'nap' => array( 'website' => '' ) ) ), 'with no website there is nothing to judge as insecure' );
check_rule( 'website.social', Result::FAIL, context( array( 'nap' => array( 'social_profiles' => array() ) ) ), 'no social profiles fails' );

// -- Google ----------------------------------------------------------------

check_rule( 'technical.google_connected', Result::FAIL, context( array( 'google' => array( 'status' => 'disconnected' ) ) ), 'no Google connection is reported' );
check_rule( 'technical.google_connected', Result::FAIL, context( array( 'google' => array( 'status' => 'needs_reconnect' ) ) ), 'a partial connection is reported' );

check_rule(
	'technical.google_mapped',
	Result::SKIP,
	context( array( 'google' => array( 'status' => 'disconnected' ), 'google_location' => array() ) ),
	'mapping is not judged while nothing is connected'
);

$connected_unmapped = context( array( 'google_location' => array() ) );
$connected_unmapped->google_location = array();

check_rule( 'technical.google_mapped', Result::FAIL, $connected_unmapped, 'a connected but unmapped location is reported' );

// -- NAP consistency, the check the mapping exists for ---------------------

check_rule( 'technical.google_name', Result::PASS, context(), 'matching names pass' );

check_rule(
	'technical.google_name',
	Result::PASS,
	context( array( 'google_location' => array( 'title' => 'northside dental care.' ) ) ),
	'and punctuation and case differences are not a conflict'
);

check_rule(
	'technical.google_name',
	Result::FAIL,
	context( array( 'google_location' => array( 'title' => 'Southside Dental' ) ) ),
	'a genuinely different name is a conflict'
);

$mismatch = run_rule( 'technical.google_name', context( array( 'google_location' => array( 'title' => 'Southside Dental' ) ) ) );

check_same( 'Northside Dental Care', $mismatch->context['found'], 'reporting what we hold' );
check_same( 'Southside Dental', $mismatch->context['expected'], 'and what Google holds' );

check_rule(
	'technical.google_phone',
	Result::PASS,
	context( array( 'google_location' => array( 'phone' => '(512) 555-0134' ) ) ),
	'the same number formatted differently is not a conflict'
);

check_rule(
	'technical.google_phone',
	Result::FAIL,
	context( array( 'google_location' => array( 'phone' => '+1 512 555 9999' ) ) ),
	'a different number is'
);

$unmapped = context();
$unmapped->google_location = array();

check_rule( 'technical.google_name', Result::SKIP, $unmapped, 'nothing to compare against means no verdict' );
check_rule( 'technical.google_phone', Result::SKIP, $unmapped, 'for the phone too' );

// -- Scoring ---------------------------------------------------------------

/**
 * A stub rule, so scoring can be tested independently of the rule set.
 */
class StubRule extends Rule {

	/**
	 * Rule id.
	 *
	 * @var string
	 */
	private $stub_id;

	/**
	 * Category.
	 *
	 * @var string
	 */
	private $stub_category;

	/**
	 * Weight.
	 *
	 * @var int
	 */
	private $stub_weight;

	/**
	 * Construct.
	 *
	 * @param string $id       Rule id.
	 * @param string $category Category.
	 * @param int    $weight   Weight.
	 */
	public function __construct( $id, $category, $weight = 1 ) {
		$this->stub_id       = $id;
		$this->stub_category = $category;
		$this->stub_weight   = $weight;
	}

	/**
	 * Id.
	 *
	 * @return string
	 */
	public function id() {
		return $this->stub_id;
	}

	/**
	 * Category.
	 *
	 * @return string
	 */
	public function category() {
		return $this->stub_category;
	}

	/**
	 * Severity.
	 *
	 * @return string
	 */
	public function severity() {
		return Severity::MEDIUM;
	}

	/**
	 * Weight.
	 *
	 * @return int
	 */
	public function weight() {
		return $this->stub_weight;
	}

	/**
	 * Never called.
	 *
	 * @param Context $context Context.
	 * @return Result
	 */
	public function evaluate( Context $context ) {
		return Result::pass();
	}
}

/**
 * Build a scoring entry.
 *
 * @param string $category Category.
 * @param string $outcome  pass | fail | skip.
 * @param int    $weight   Weight.
 * @return array
 */
function entry( $category, $outcome, $weight = 1 ) {
	$result = Result::PASS === $outcome
		? Result::pass()
		: ( Result::SKIP === $outcome ? Result::skip() : Result::fail( 'x' ) );

	return array(
		'rule'   => new StubRule( $category . '.' . $outcome . '.' . $weight . '.' . wp_rand( 1, PHP_INT_MAX ), $category, $weight ),
		'result' => $result,
	);
}

$all_pass = Score::calculate(
	array(
		entry( Category::BUSINESS, Result::PASS ),
		entry( Category::LOCATION, Result::PASS ),
	)
);

check_same( 100, $all_pass['score'], 'everything passing scores 100' );

$all_fail = Score::calculate(
	array(
		entry( Category::BUSINESS, Result::FAIL ),
		entry( Category::LOCATION, Result::FAIL ),
	)
);

check_same( 0, $all_fail['score'], 'everything failing scores 0' );

// Weight is respected within a category: a weight-3 failure costs more than
// a weight-1 one.
$heavy_fail = Score::calculate(
	array(
		entry( Category::BUSINESS, Result::FAIL, 3 ),
		entry( Category::BUSINESS, Result::PASS, 1 ),
	)
);

$light_fail = Score::calculate(
	array(
		entry( Category::BUSINESS, Result::PASS, 3 ),
		entry( Category::BUSINESS, Result::FAIL, 1 ),
	)
);

check( $heavy_fail['score'] < $light_fail['score'], 'failing a heavier rule costs more' );

// -- The property that makes a score explainable ---------------------------

$mixed = Score::calculate(
	array(
		entry( Category::BUSINESS, Result::PASS ),
		entry( Category::BUSINESS, Result::FAIL ),
		entry( Category::LOCATION, Result::PASS ),
		entry( Category::HOURS, Result::FAIL ),
	)
);

$earned = 0.0;

foreach ( $mixed['categories'] as $data ) {
	$earned += $data['earned'];
}

check( abs( $earned - $mixed['score'] ) < 1, 'the per-category earned values sum to the total score' );

// -- Skips are removed from the denominator --------------------------------
//
// The rule that makes the whole design honest: a check that had nothing to
// judge must not count as a pass (inflating a score nobody earned) or as a
// failure (penalising a feature nobody opted into).

$with_skip = Score::calculate(
	array(
		entry( Category::BUSINESS, Result::PASS ),
		entry( Category::BUSINESS, Result::SKIP ),
	)
);

check_same( 100, $with_skip['score'], 'a skipped check does not drag the score down' );
check_same( 1, $with_skip['categories'][ Category::BUSINESS ]['checks'], 'and is not counted as a check' );

$skip_only = Score::calculate( array( entry( Category::SCHEMA, Result::SKIP ) ) );

check_same( 0, $skip_only['score'], 'a run where everything skipped has no score' );
check( false === $skip_only['scored'], 'and says so, rather than claiming a zero was earned' );

// -- A category with nothing to judge is redistributed, not failed ---------

$without_schema = Score::calculate(
	array(
		entry( Category::BUSINESS, Result::PASS ),
		entry( Category::SCHEMA, Result::SKIP ),
	)
);

check_same( 100, $without_schema['score'], 'a site not publishing schema can still score 100' );
check( ! isset( $without_schema['categories'][ Category::SCHEMA ] ), 'and the empty category is absent from the breakdown' );

// -- Bands -----------------------------------------------------------------

check_same( Score::BAND_NEEDS_WORK, Score::band( 0 ), '0 is needs work' );
check_same( Score::BAND_NEEDS_WORK, Score::band( 49 ), '49 is needs work' );
check_same( Score::BAND_FAIR, Score::band( 50 ), '50 is fair' );
check_same( Score::BAND_GOOD, Score::band( 70 ), '70 is good' );
check_same( Score::BAND_EXCELLENT, Score::band( 90 ), '90 is excellent' );
check_same( Score::BAND_EXCELLENT, Score::band( 100 ), 'and so is 100' );

// -- Counting --------------------------------------------------------------

$counted = Runner::summarise(
	array(
		entry( Category::BUSINESS, Result::PASS ),
		entry( Category::BUSINESS, Result::FAIL ),
		entry( Category::LOCATION, Result::FAIL ),
		entry( Category::HOURS, Result::SKIP ),
	)
);

check_same( 3, $counted['rules_run'], 'a skipped rule is not counted as run' );
check_same( 2, $counted['issues_total'], 'findings are counted' );
check_same( 1, $counted['issues_passed'], 'and so are passes' );
check_same( 2, $counted['issues_medium'], 'severity is tallied from the rule, not the result' );

finish( 'Audit engine' );
