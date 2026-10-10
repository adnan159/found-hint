<?php
/**
 * Google's business categories: searching them, and storing a choice.
 *
 * Run with plain PHP: `php tests/Smoke/google-categories.php`.
 *
 * A category is what decides which searches a business appears in, and what
 * Google is sent is an id, not the name a person picked. So the two things
 * worth proving are that the search puts the thing meant at the top, and
 * that whatever is stored is a real Google id with the right name beside it
 * — because a wrong id is not a typo, it is a different kind of business.
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\App\Business\Business;
use FHINT\App\Google\Categories;

echo "Google categories\n";

/**
 * The names a search returns, in order.
 *
 * @param string $search What was typed.
 * @param int    $limit  How many.
 * @return string[]
 */
function fhint_category_names( $search, $limit = 20 ) {
	return array_column( Categories::search( $search, $limit )['items'], 'name' );
}

/**
 * The validation codes for a business record, by field.
 *
 * @param array $changes Fields to set on an otherwise valid business.
 * @return array<string, string>
 */
function fhint_category_errors( array $changes ) {
	$record = array_merge( Business::blank(), array( 'name' => 'Northside Dental Care' ), Business::sanitize( $changes ) );

	return Business::validate( $record )->errors();
}

// ── the list itself ─────────────────────────────────────────────────────

$fhint_meta = Categories::meta();

check( $fhint_meta['count'] > 3000, 'the bundled list holds Google\'s categories' );
check( '' !== $fhint_meta['updated'], 'and records when it was last rebuilt' );

$fhint_dentist = Categories::find( 'gcid:dentist' );

check_same( 'Dentist', $fhint_dentist['name'], 'a category is found by its Google id' );
check_same( 'Health & Medical', $fhint_dentist['bucket'], 'and carries its industry group' );
check_same( 'Dentist', Categories::find( 'categories/gcid:dentist' )['name'], 'Google\'s full resource name is understood too' );
check_same( 'Dentist', Categories::find( ' GCID:Dentist ' )['name'], 'an id is matched whatever its case or padding' );
check_same( null, Categories::find( 'gcid:not_a_real_category' ), 'an id Google does not have is not found' );
check_same( null, Categories::find( '' ), 'an empty id is not found' );

check_same( 'gcid:dentist', Categories::find_by_name( 'dentist' )['id'], 'a category is found by its exact name, ignoring case' );
check_same( null, Categories::find_by_name( 'dent' ), 'but not by part of its name — a near miss would attach the wrong business type' );
check_same( 'gcid:doctor', Categories::find_by_name( 'Physician' )['id'], 'another wording Google uses for it finds it as well' );

check_same( 'categories/gcid:dentist', Categories::resource_name( 'gcid:dentist' ), 'the resource name is what Google\'s API is sent' );
check_same( '', Categories::resource_name( 'gcid:not_a_real_category' ), 'and there is none for an unknown id' );

// ── searching ───────────────────────────────────────────────────────────

$fhint_names = fhint_category_names( 'dentist' );

check_same( 'Dentist', $fhint_names[0], 'an exact match comes first' );
check( in_array( 'Cosmetic dentist', $fhint_names, true ), 'and names that merely contain the word follow' );

$fhint_names = fhint_category_names( 'dent', 50 );

check_same( 'Dentist', $fhint_names[0], 'among names starting with what was typed, the shortest leads' );
check(
	array_search( 'Dental clinic', $fhint_names, true ) < array_search( 'Cosmetic dentist', $fhint_names, true ),
	'a name that starts with it outranks one where it starts a later word'
);
check(
	array_search( 'Cosmetic dentist', $fhint_names, true ) < array_search( 'Student dormitory', $fhint_names, true ),
	'and a word that starts with it outranks one that only contains it'
);

check_same( fhint_category_names( 'pizza' ), fhint_category_names( '  PIZZA  ' ), 'case and stray spaces make no difference' );
check_same( array( 'Dental clinic' ), fhint_category_names( 'clinic dental' ), 'words are matched in any order' );
check_same( array(), fhint_category_names( 'zzzqqq' ), 'nonsense finds nothing' );
check_same( 0, Categories::search( 'zzzqqq' )['total'], 'and says so in the total' );

// Found only through another wording: listed, after every match on the name,
// and saying which wording matched so the screen can explain itself.
$fhint_physician = Categories::search( 'physician', 50 )['items'];
$fhint_doctor    = null;

foreach ( $fhint_physician as $fhint_position => $fhint_item ) {
	if ( 'gcid:doctor' === $fhint_item['id'] ) {
		$fhint_doctor = $fhint_item + array( 'position' => $fhint_position );
	}
}

check( null !== $fhint_doctor, 'a category is found through another name Google uses for it' );
check_same( 'Physician', $fhint_doctor['matched'], 'and the result says which wording matched' );
check_same( count( $fhint_physician ) - 1, $fhint_doctor['position'], 'ranked after every match on a category\'s own name' );
check( ! isset( $fhint_physician[0]['matched'] ), 'while a match on the name itself carries no such note' );

// Pasting an id means that id.
check_same( array( 'Dentist' ), fhint_category_names( 'gcid:dentist' ), 'searching for an id returns exactly that category' );

// Two different Google categories can share a name; both must be offered,
// told apart by id.
$fhint_pools = array();

foreach ( Categories::search( 'swimming pool' )['items'] as $fhint_item ) {
	if ( 'Swimming pool' === $fhint_item['name'] ) {
		$fhint_pools[] = $fhint_item['id'];
	}
}

check_same( 2, count( array_unique( $fhint_pools ) ), 'two categories sharing a name are both returned, with different ids' );

// ── paging ──────────────────────────────────────────────────────────────

$fhint_all = Categories::search( '', 3 );

check_same( $fhint_meta['count'], $fhint_all['total'], 'an empty search counts the whole list' );
check_same( 3, count( $fhint_all['items'] ), 'and returns only what was asked for' );

$fhint_sorted = array_column( $fhint_all['items'], 'name' );
$fhint_copy   = $fhint_sorted;
natcasesort( $fhint_copy );

check_same( array_values( $fhint_copy ), $fhint_sorted, 'in alphabetical order' );

check_same( Categories::MAX_RESULTS, count( Categories::search( 'a', 5000 )['items'] ), 'a search never returns more than the cap' );
check_same( 1, count( Categories::search( 'a', 0 )['items'] ), 'and never fewer than one when something matches' );

$fhint_first  = array_column( Categories::search( 'service', 5, 0 )['items'], 'id' );
$fhint_second = array_column( Categories::search( 'service', 5, 5 )['items'], 'id' );

check_same( array(), array_values( array_intersect( $fhint_first, $fhint_second ) ), 'the next page repeats nothing from the first' );
check_same( Categories::search( 'service', 5, 0 )['total'], Categories::search( 'service', 5, 5 )['total'], 'and the total ignores paging' );

// ── turning a choice into what is stored ────────────────────────────────

check_same( array( 'id' => 'gcid:dentist', 'name' => 'Dentist' ), Categories::resolve( 'gcid:dentist' ), 'an id resolves to the stored pair' );
check_same( array( 'id' => 'gcid:dentist', 'name' => 'Dentist' ), Categories::resolve( 'dentist' ), 'so does an exact name' );
check_same(
	array( 'id' => 'gcid:dentist', 'name' => 'Dentist' ),
	Categories::resolve( array( 'id' => 'gcid:dentist', 'name' => 'Best dentist in town' ) ),
	'the name comes from Google\'s list, never from the request'
);
check_same( array( 'id' => '', 'name' => 'Made up' ), Categories::resolve( 'Made up' ), 'a name Google does not have keeps no id' );
check_same( 'gcid:not_real', Categories::resolve( array( 'id' => 'gcid:not_real' ) )['id'], 'an unknown id is kept as sent, so the error can name it' );

// ── the primary category on a business ──────────────────────────────────

$fhint_clean = Business::sanitize(
	array(
		'primary_category_id' => 'gcid:dentist',
		'primary_category'    => 'Best dentist in town',
	)
);

check_same( 'gcid:dentist', $fhint_clean['primary_category_id'], 'choosing a category stores Google\'s id' );
check_same( 'Dentist', $fhint_clean['primary_category'], 'and Google\'s name for it, whatever the request claimed' );

// The existing text field sends a name and nothing else.
$fhint_clean = Business::sanitize( array( 'primary_category' => 'dentist' ) );

check_same( 'gcid:dentist', $fhint_clean['primary_category_id'], 'a typed name Google uses is tied to its id' );
check_same( 'Dentist', $fhint_clean['primary_category'], 'and stored the way Google writes it' );

$fhint_clean = Business::sanitize( array( 'primary_category' => 'Tooth wizard' ) );

check_same( 'Tooth wizard', $fhint_clean['primary_category'], 'a freehand category is still kept' );
check_same( '', $fhint_clean['primary_category_id'], 'but carries no id — and so cannot keep the last one chosen' );

check( ! array_key_exists( 'primary_category_id', Business::sanitize( array( 'phone' => '+1 512 555 0134' ) ) ), 'a save that does not mention the category leaves it alone' );

check_same( array(), fhint_category_errors( array( 'primary_category_id' => 'gcid:dentist' ) ), 'a real category id is accepted' );
check_same(
	array( 'business.category_id.unknown' ),
	fhint_category_errors( array( 'primary_category_id' => 'gcid:not_real' ) )['primary_category_id'],
	'an id Google does not have is refused'
);
check_same( array(), fhint_category_errors( array( 'primary_category' => 'Tooth wizard' ) ), 'a freehand category with no id is not an error' );

// ── additional categories ───────────────────────────────────────────────

$fhint_extra = Business::sanitize(
	array(
		'secondary_categories' => array(
			'gcid:dental_clinic',
			'Cosmetic dentist',
			array( 'id' => 'gcid:orthodontist', 'name' => 'anything' ),
			'gcid:dental_clinic',
		),
	)
)['secondary_categories'];

check_same(
	array(
		array( 'id' => 'gcid:dental_clinic', 'name' => 'Dental clinic' ),
		array( 'id' => 'gcid:cosmetic_dentist', 'name' => 'Cosmetic dentist' ),
		array( 'id' => 'gcid:orthodontist', 'name' => 'Orthodontist' ),
	),
	$fhint_extra,
	'ids, names and objects are all stored as the same { id, name } pair, without repeats'
);

check_same(
	array( array( 'id' => 'gcid:dental_clinic', 'name' => 'Dental clinic' ) ),
	Business::sanitize( array( 'secondary_categories' => 'gcid:dental_clinic' ) )['secondary_categories'],
	'a single id as a string is a list of one'
);
check_same( array(), Business::sanitize( array( 'secondary_categories' => '' ) )['secondary_categories'], 'an empty value clears the list' );

check_same( array(), fhint_category_errors( array( 'secondary_categories' => array( 'gcid:dental_clinic', 'gcid:orthodontist' ) ) ), 'real additional categories are accepted' );

check_same(
	array( 'business.categories.unknown' ),
	fhint_category_errors( array( 'secondary_categories' => array( 'gcid:dental_clinic', 'Tooth wizard' ) ) )['secondary_categories'],
	'an additional category Google does not have is refused, not silently dropped'
);

$fhint_ten = array_slice( array_column( Categories::search( 'service', 50 )['items'], 'id' ), 0, Categories::MAX_ADDITIONAL + 1 );

check_same( Categories::MAX_ADDITIONAL + 1, count( $fhint_ten ), 'ten real categories are available for the test' );
check_same(
	array( 'business.categories.too_many' ),
	fhint_category_errors( array( 'secondary_categories' => $fhint_ten ) )['secondary_categories'],
	'one more than Google allows is refused'
);
check_same(
	array(),
	fhint_category_errors( array( 'secondary_categories' => array_slice( $fhint_ten, 0, Categories::MAX_ADDITIONAL ) ) ),
	'exactly as many as Google allows is accepted'
);

check_same(
	array( 'business.categories.includes_primary' ),
	fhint_category_errors(
		array(
			'primary_category_id'  => 'gcid:dentist',
			'secondary_categories' => array( 'gcid:dental_clinic', 'gcid:dentist' ),
		)
	)['secondary_categories'],
	'the primary category cannot also be an additional one'
);

// Names stored before ids existed must not lock a business out of saving.
$fhint_legacy = array_merge(
	Business::blank(),
	array(
		'name'                 => 'Northside Dental Care',
		'secondary_categories' => array( 'Some old free text', 'Another' ),
	)
);

check_same( array(), Business::validate( $fhint_legacy )->errors(), 'plain names stored by an older version do not block later saves' );

finish( 'Google categories' );
