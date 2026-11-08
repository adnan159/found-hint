<?php
/**
 * Schema formatting smoke test.
 *
 * dbDelta *parses* these CREATE TABLE strings, and its parser is unforgiving.
 * Get the formatting wrong and dbDelta re-issues the same ALTER on every
 * single request — a bug that is invisible in testing and expensive in
 * production. This checks the rules statically, without a database.
 *
 * It does NOT prove idempotency; only running dbDelta against real MySQL
 * twice can do that. See docs/PROGRESS.md.
 *
 * Usage: php tests/Smoke/schema-format.php
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\Database\Tables;

echo "Schema formatting\n";

/**
 * Capture the SQL each table class passes to dbDelta.
 *
 * @return array<string, string>
 */
function fhint_capture_sql() {
	$GLOBALS['__sql'] = array();

	$classes = array(
		Tables::BUSINESS       => 'CreateBusinessTable',
		Tables::LOCATIONS      => 'CreateLocationsTable',
		Tables::LOCATION_HOURS => 'CreateLocationHoursTable',
		Tables::SERVICES       => 'CreateServicesTable',
		Tables::AUDITS         => 'CreateAuditsTable',
		Tables::AUDIT_ISSUES   => 'CreateAuditIssuesTable',
		Tables::LOGS             => 'CreateLogsTable',
		Tables::GOOGLE_LOCATIONS => 'CreateGoogleLocationsTable',
		Tables::REVIEWS          => 'CreateReviewsTable',
		Tables::SPECIAL_HOURS       => 'CreateSpecialHoursTable',
		Tables::LOCATION_ATTRIBUTES => 'CreateLocationAttributesTable',
		Tables::MEDIA               => 'CreateMediaTable',
		Tables::DESCRIPTION_HISTORY => 'CreateDescriptionHistoryTable',
		Tables::GOOGLE_REFERENCE    => 'CreateGoogleReferenceTable',
		Tables::POSTS               => 'CreatePostsTable',
		Tables::SCHEMA_ENTITIES          => 'CreateSchemaEntitiesTable',
		Tables::SCHEMA_SERVICE_PROVIDERS => 'CreateSchemaServiceProvidersTable',
		Tables::SCHEMA_SERVICE_AREAS     => 'CreateSchemaServiceAreasTable',
	);

	foreach ( $classes as $key => $class ) {
		$fqcn = 'FHINT\\Database\\' . $class;
		$GLOBALS['__current_key'] = $key;
		$fqcn::up( 'wp_', 'DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci' );
	}

	return $GLOBALS['__sql'];
}

/**
 * Stand in for WordPress's dbDelta, recording what it was given.
 *
 * @param string $sql Table definition.
 * @return array
 */
function dbDelta( $sql ) { // phpcs:ignore WordPress.NamingConventions.ValidFunctionName.FunctionNameInvalid
	$GLOBALS['__sql'][ $GLOBALS['__current_key'] ] = $sql;
	return array();
}

$definitions = fhint_capture_sql();

check_same( 18, count( $definitions ), 'every table has a definition' );
check_same( Tables::keys(), array_keys( $definitions ), 'definitions cover exactly the declared tables' );

foreach ( $definitions as $key => $sql ) {
	$lines = explode( "\n", $sql );

	check( false !== strpos( $sql, "CREATE TABLE wp_fhint_{$key} (" ), "{$key}: declares the prefixed table name" );

	// Two spaces after PRIMARY KEY. The single-space form is the classic
	// dbDelta gotcha: it parses as a column, so dbDelta tries to add a
	// PRIMARY KEY column on every request.
	check( (bool) preg_match( '/PRIMARY KEY {2}\(/', $sql ), "{$key}: PRIMARY KEY uses two spaces" );
	check( ! preg_match( '/PRIMARY KEY {1}\(/', $sql ), "{$key}: PRIMARY KEY never uses one space" );

	// Every key must be explicitly named, or dbDelta cannot match it against
	// what MySQL reports back and re-creates it every time.
	foreach ( $lines as $line ) {
		$trimmed = trim( $line );

		if ( 0 === strpos( $trimmed, 'KEY ' ) || 0 === strpos( $trimmed, 'UNIQUE KEY ' ) ) {
			$after = preg_replace( '/^(UNIQUE )?KEY\s+/', '', $trimmed );
			check(
				(bool) preg_match( '/^[a-z_][a-z0-9_]*\s*\(/', $after ),
				"{$key}: key is explicitly named — {$trimmed}"
			);
		}
	}

	// One field per line: dbDelta splits the body on newlines, so two
	// definitions sharing a line means the second is never seen.
	$body = substr( $sql, (int) strpos( $sql, '(' ) + 1 );
	$body = substr( $body, 0, (int) strrpos( $body, ')' ) );

	foreach ( explode( "\n", $body ) as $line ) {
		$trimmed = trim( $line );

		if ( '' === $trimmed ) {
			continue;
		}

		check(
			substr_count( $trimmed, ',' ) <= 1 || (bool) preg_match( '/\((?:[^)]*,)[^)]*\)/', $trimmed ),
			"{$key}: one definition per line — {$trimmed}"
		);
	}

	// Every index fits 767 bytes: the limit on older InnoDB setups (no
	// large prefix, or COMPACT rows), where a longer key fails CREATE TABLE
	// and the plugin activates without the table. Text is utf8mb4, four
	// bytes a character, unless the column says CHARACTER SET ascii.
	$fhint_bytes = array();

	foreach ( explode( "\n", $body ) as $line ) {
		if ( preg_match( '/^\s*([a-z_]+) (\w+)(?:\((\d+)(?:,\d+)?\))?(.*)$/', $line, $col ) && ! in_array( strtoupper( $col[1] ), array( 'PRIMARY', 'KEY', 'UNIQUE' ), true ) ) {
			$sizes = array( 'bigint' => 8, 'int' => 4, 'smallint' => 2, 'tinyint' => 1, 'datetime' => 8, 'date' => 3, 'time' => 3, 'decimal' => 9 );
			$type  = strtolower( $col[2] );

			if ( in_array( $type, array( 'varchar', 'char' ), true ) ) {
				$fhint_bytes[ $col[1] ] = (int) $col[3] * ( false !== stripos( $col[4], 'CHARACTER SET ascii' ) ? 1 : 4 );
			} else {
				$fhint_bytes[ $col[1] ] = isset( $sizes[ $type ] ) ? $sizes[ $type ] : PHP_INT_MAX;
			}
		}
	}

	foreach ( $lines as $line ) {
		if ( ! preg_match( '/^\s*(?:UNIQUE )?KEY (\w+) \((.*)\)/', $line, $index ) ) {
			continue;
		}

		$total = 0;

		foreach ( explode( ',', $index[2] ) as $part ) {
			preg_match( '/^\s*(\w+)(?:\((\d+)\))?/', $part, $p );
			$total += isset( $p[2] ) ? (int) $p[2] * 4 : ( isset( $fhint_bytes[ $p[1] ] ) ? $fhint_bytes[ $p[1] ] : PHP_INT_MAX );
		}

		check( $total <= 767, "{$key}: index {$index[1]} fits 767 bytes ({$total})" );
	}

	check( (bool) preg_match( '/\)\s*DEFAULT CHARACTER SET/', $sql ), "{$key}: applies the charset collation" );
	check( false === strpos( $sql, 'FOREIGN KEY' ), "{$key}: declares no foreign key" );

	// Timestamps are written by the repositories as UTC. A SQL default would
	// make dbDelta unstable and would record local time.
	check( false === stripos( $sql, 'ON UPDATE CURRENT_TIMESTAMP' ), "{$key}: no ON UPDATE CURRENT_TIMESTAMP" );
	check( false === stripos( $sql, 'DEFAULT CURRENT_TIMESTAMP' ), "{$key}: no CURRENT_TIMESTAMP default" );
}

// Tables must be reachable only through the registry, never spelled out.
$src   = dirname( __DIR__, 2 ) . '/includes';
$files = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $src ) );
$leaks = array();

foreach ( $files as $file ) {
	if ( 'php' !== $file->getExtension() ) {
		continue;
	}

	$path = $file->getPathname();

	if ( false !== strpos( $path, '/Database/' ) ) {
		continue;
	}

	$contents = file_get_contents( $path );

	if ( preg_match( '/[\'"]\{?\$wpdb->prefix\}?fhint_/', $contents ) ) {
		$leaks[] = str_replace( $src, '', $path );
	}
}

check_same( array(), $leaks, 'no table name is hardcoded outside Database/' );

// -- Uninstall must know every table ---------------------------------------

// uninstall.php runs without the autoloader, so it spells its table names
// out. That literal list is the one place a new table gets forgotten — and
// a forgotten name means the table survives an uninstall the operator
// asked for. `reviews` was already missing when this check was written.
$fhint_uninstall = file_get_contents( __DIR__ . '/../../uninstall.php' );

preg_match( '/\$fhint_tables = array\((.*?)\);/s', $fhint_uninstall, $fhint_match );

$fhint_listed = array();

if ( isset( $fhint_match[1] ) ) {
	preg_match_all( "/'([a-z_]+)'/", $fhint_match[1], $fhint_names );
	$fhint_listed = $fhint_names[1];
}

sort( $fhint_listed );

$fhint_declared = Tables::keys();
sort( $fhint_declared );

check_same( $fhint_declared, $fhint_listed, 'uninstall.php drops every table the registry declares' );

finish( 'Schema formatting' );
