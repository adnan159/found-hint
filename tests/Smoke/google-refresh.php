<?php
/**
 * What is read from a Google listing for the profile screen.
 *
 * Run: php tests/Smoke/google-refresh.php
 *
 * The translations between Google's shapes and this plugin's: categories,
 * the listing's Maps id, the attribute menu and its answers, photos, and the
 * limits a photo must meet before it is kept. All of it is pure, so it is
 * proved here without a database or a network.
 *
 * @package FoundHint
 */

require __DIR__ . '/bootstrap.php';

use FHINT\App\Google\AttributeCatalog;
use FHINT\App\Google\ImportMapper;
use FHINT\App\Google\Profiles;
use FHINT\App\Media\MediaSync;
use FHINT\App\Media\MediaUpload;

echo "Google refresh\n";

// -- Categories -------------------------------------------------------------

$fhint_categories = ImportMapper::categories(
	array(
		'categories' => array(
			'primaryCategory'      => array(
				'name'        => 'categories/gcid:pet_store',
				'displayName' => 'Pet store',
			),
			'additionalCategories' => array(
				array(
					'name'        => 'categories/gcid:pet_groomer',
					'displayName' => 'Pet groomer',
				),
				// Google can repeat the main category among the extras.
				array(
					'name'        => 'categories/gcid:pet_store',
					'displayName' => 'Pet store',
				),
				array( 'displayName' => 'No id at all' ),
			),
		),
	)
);

check_same(
	array(
		'id'   => 'gcid:pet_store',
		'name' => 'Pet store',
	),
	$fhint_categories['primary'],
	'the main category is read as the id this plugin stores, with Google\'s name'
);
check_same(
	array(
		array(
			'id'   => 'gcid:pet_groomer',
			'name' => 'Pet groomer',
		),
	),
	$fhint_categories['additional'],
	'extra categories follow, without the main one repeated or an entry that has no id'
);
check( null === ImportMapper::categories( array() )['primary'], 'a listing with no category has no main category' );
check_same( $fhint_categories, ImportMapper::from_google( array( 'categories' => array( 'primaryCategory' => array( 'name' => 'categories/gcid:pet_store', 'displayName' => 'Pet store' ), 'additionalCategories' => array( array( 'name' => 'categories/gcid:pet_groomer', 'displayName' => 'Pet groomer' ) ) ) ) )['categories'], 'and an import carries them' );

// -- Ready-made services ------------------------------------------------------

$fhint_types = ImportMapper::service_type_list(
	array(
		'categories' => array(
			'primaryCategory'      => array( 'displayName' => 'Pet store' ),
			'additionalCategories' => array(
				array(
					'displayName'  => 'Pet groomer',
					'serviceTypes' => array(
						array(
							'serviceTypeId' => 'job_type_id:cat_bathing',
							'displayName'   => 'Cat bathing',
						),
						array( 'displayName' => 'No id' ),
					),
				),
				array(
					'displayName'  => 'Pet sitter',
					'serviceTypes' => array(
						array(
							'serviceTypeId' => 'job_type_id:cat_bathing',
							'displayName'   => 'Cat bathing',
						),
						array( 'serviceTypeId' => 'job_type_id:cat_boarding' ),
					),
				),
			),
		),
	)
);

check_same(
	array(
		array(
			'id'       => 'job_type_id:cat_bathing',
			'label'    => 'Cat bathing',
			'category' => 'Pet groomer',
		),
		array(
			'id'       => 'job_type_id:cat_boarding',
			'label'    => 'job_type_id:cat_boarding',
			'category' => 'Pet sitter',
		),
	),
	$fhint_types,
	'the services Google offers are gathered from every category, once each, and one with no id is left out'
);
check_same( array(), ImportMapper::service_type_list( array() ), 'a listing whose categories have none offers none' );

// -- The Maps id --------------------------------------------------------------

check_same( '9451307654072888532', Profiles::cid( array( 'metadata' => array( 'mapsUri' => 'https://maps.google.com/maps?cid=9451307654072888532' ) ) ), 'the Maps id is read out of the listing\'s Maps link' );
check_same( '', Profiles::cid( array( 'metadata' => array( 'mapsUri' => 'https://maps.google.com/maps?q=shop' ) ) ), 'a link without one gives none' );
check_same( '', Profiles::cid( array() ), 'and so does a listing with no link' );

// -- The attribute menu -------------------------------------------------------

$fhint_bool = AttributeCatalog::from_google(
	array(
		'parent'           => 'attributes/has_delivery',
		'valueType'        => 'BOOL',
		'displayName'      => 'Delivery',
		'groupDisplayName' => 'Service options',
		'valueMetadata'    => array(
			array(
				'value'       => true,
				'displayName' => 'Delivery',
			),
			array(
				'value'       => false,
				'displayName' => 'No delivery',
			),
		),
	)
);

check_same( 'has_delivery', $fhint_bool['id'], 'an attribute is known by its id, without Google\'s prefix' );
check_same( array( 'Delivery', 'Service options', 'bool' ), array( $fhint_bool['label'], $fhint_bool['group'], $fhint_bool['type'] ), 'with its label, its group and its kind' );
check_same( array( true, false ), array_column( $fhint_bool['options'], 'value' ), 'and the answers Google accepts for it, as booleans' );

$fhint_enum = AttributeCatalog::from_google(
	array(
		'parent'        => 'attributes/wi_fi',
		'valueType'     => 'ENUM',
		'displayName'   => 'Wi-Fi',
		'valueMetadata' => array(
			array(
				'value'       => 'free_wi_fi',
				'displayName' => 'Free',
			),
		),
	)
);

check_same( array( 'enum', 'free_wi_fi' ), array( $fhint_enum['type'], $fhint_enum['options'][0]['value'] ), 'a choice attribute keeps its options as words' );
check( null === AttributeCatalog::from_google( array( 'parent' => 'attributes/old_one', 'valueType' => 'BOOL', 'deprecated' => true ) ), 'an attribute Google has retired is not offered' );
check( null === AttributeCatalog::from_google( array( 'parent' => 'attributes/odd', 'valueType' => 'MATRIX' ) ), 'nor one of a kind this plugin cannot store' );
check( null === AttributeCatalog::from_google( array( 'valueType' => 'BOOL' ) ), 'nor one with no id' );

// -- The answers a listing holds ---------------------------------------------

$fhint_answers = AttributeCatalog::values_from_google(
	array(
		'attributes' => array(
			array(
				'name'      => 'locations/1/attributes/has_delivery',
				'valueType' => 'BOOL',
				'values'    => array( true ),
			),
			array(
				'name'      => 'attributes/has_hearing_loop',
				'valueType' => 'BOOL',
				'values'    => array( false ),
			),
			array(
				'name'      => 'attributes/wi_fi',
				'valueType' => 'ENUM',
				'values'    => array( 'free_wi_fi' ),
			),
			array(
				'name'              => 'attributes/pay_credit_card_types_accepted',
				'valueType'         => 'REPEATED_ENUM',
				'repeatedEnumValue' => array( 'setValues' => array( 'visa', 'mastercard' ) ),
			),
			array(
				'name'      => 'attributes/url_facebook',
				'valueType' => 'URL',
				'uriValues' => array( array( 'uri' => 'https://facebook.com/shop' ) ),
			),
		),
	)
);

check_same(
	array(
		'type'  => 'bool',
		'value' => true,
	),
	$fhint_answers['has_delivery'],
	'a yes is stored as a yes, whichever way Google spells the attribute\'s name'
);
check( false === $fhint_answers['has_hearing_loop']['value'], 'a no is stored as a no, not dropped as though unanswered' );
check_same( 'free_wi_fi', $fhint_answers['wi_fi']['value'], 'a choice is stored as its option' );
check_same( array( 'visa', 'mastercard' ), $fhint_answers['pay_credit_card_types_accepted']['value'], 'a multiple choice as every option set' );
check( ! isset( $fhint_answers['url_facebook'] ), 'and a link is left to the Social section' );
check_same( array(), AttributeCatalog::values_from_google( array() ), 'a listing with no answers has none' );

// -- Photos -------------------------------------------------------------------

$fhint_photo = MediaSync::from_google(
	array(
		'name'                => 'accounts/1/locations/2/media/AF1Qip',
		'mediaFormat'         => 'PHOTO',
		'locationAssociation' => array( 'category' => 'COVER' ),
		'googleUrl'           => 'https://lh3.googleusercontent.com/abc',
		'createTime'          => '2026-03-09T12:49:30Z',
		'dimensions'          => array(
			'widthPixels'  => 3024,
			'heightPixels' => 4032,
		),
	)
);

check_same( 'accounts/1/locations/2/media/AF1Qip', $fhint_photo['google_name'], 'a photo is known by Google\'s name for it' );
check_same( array( 'cover', 3024, 4032 ), array( $fhint_photo['role'], $fhint_photo['width'], $fhint_photo['height'] ), 'with what it is for and its size' );
check_same( '2026-03-09 12:49:30', $fhint_photo['uploaded_at'], 'and when it was added, in UTC' );
check( null === MediaSync::from_google( array( 'name' => 'accounts/1/locations/2/media/vid', 'mediaFormat' => 'VIDEO', 'googleUrl' => 'https://lh3.googleusercontent.com/v' ) ), 'a video is not a photo' );
check( null === MediaSync::from_google( array( 'name' => 'accounts/1/locations/2/media/x', 'mediaFormat' => 'PHOTO' ) ), 'and a photo with nowhere to be shown from is skipped' );
check_same( array( 'logo', 'logo', 'cover', 'gallery', 'gallery' ), array_map( array( MediaSync::class, 'role' ), array( 'PROFILE', 'LOGO', 'COVER', 'ADDITIONAL', 'INTERIOR' ) ), 'Google\'s categories fold into logo, cover and gallery' );
check_same( array( 'PROFILE', 'COVER', 'ADDITIONAL' ), array_map( array( MediaSync::class, 'category' ), array( 'logo', 'cover', 'gallery' ) ), 'and a photo sent from here is filed under the matching one' );

// -- What Google will take ----------------------------------------------------

$fhint_file = array(
	'mime_type' => 'image/jpeg',
	'file_size' => 200000,
	'width'     => 1200,
	'height'    => 900,
);

check( MediaUpload::validate( $fhint_file )->is_valid(), 'an ordinary JPEG is accepted' );
check( MediaUpload::validate( array_merge( $fhint_file, array( 'mime_type' => 'image/png' ) ) )->is_valid(), 'and so is a PNG' );
check_same( array( 'media.type.unsupported' ), MediaUpload::validate( array_merge( $fhint_file, array( 'mime_type' => 'image/gif' ) ) )->errors()['file'], 'any other kind of file is refused' );
check_same( array( 'media.size.too_large' ), MediaUpload::validate( array_merge( $fhint_file, array( 'file_size' => MediaUpload::MAX_BYTES + 1 ) ) )->errors()['file'], 'a file over 5 MB is refused' );
check( MediaUpload::validate( array_merge( $fhint_file, array( 'file_size' => MediaUpload::MAX_BYTES ) ) )->is_valid(), 'one of exactly 5 MB is not' );
check_same( array( 'media.size.too_small' ), MediaUpload::validate( array_merge( $fhint_file, array( 'file_size' => 500 ) ) )->errors()['file'], 'a file too small to be a real photo is refused' );
check_same( array( 'media.dimensions.too_small' ), MediaUpload::validate( array_merge( $fhint_file, array( 'height' => 249 ) ) )->errors()['file'], 'and one under 250 pixels on a side' );
check_same( array( 'media.dimensions.too_small' ), MediaUpload::validate( array_merge( $fhint_file, array( 'width' => 249 ) ) )->errors()['file'], 'whichever side that is' );

finish( 'Google refresh' );
