<?php
/**
 * Business entity.
 *
 * @package FoundHint
 */

namespace FHINT\App\Business;

use FHINT\App\Core\ValidationResult;
use FHINT\App\Google\Categories;
use FHINT\App\Core\Validator;

defined( 'ABSPATH' ) || exit;

/**
 * The business profile — the single source of truth for who this business is.
 *
 * Name, phone, email and website live here and nowhere else. A block, a
 * schema node and an audit rule all read this one record, which is what
 * guarantees the same phone number appears identically in all three. If a
 * feature starts wanting its own copy of a field on this entity, that
 * feature is wrong.
 */
class Business {

	/**
	 * The longest description Google accepts for a business.
	 *
	 * Enforced here, not only on the screen, because a longer one saves
	 * happily and is then refused at the push — by which time the owner has
	 * moved on and the profile is silently out of step with the listing.
	 */
	const DESCRIPTION_MAX = 750;

	/**
	 * Known schema.org business types. Filterable so a niche subtype can be
	 * added without a core release.
	 *
	 * @return string[]
	 */
	public static function types() {
		$types = array(
			'LocalBusiness',
			'Store',
			'Restaurant',
			'CafeOrCoffeeShop',
			'Bakery',
			'BarOrPub',
			'Hotel',
			'Dentist',
			'Physician',
			'MedicalClinic',
			'Hospital',
			'Pharmacy',
			'HealthAndBeautyBusiness',
			'HairSalon',
			'BeautySalon',
			'DaySpa',
			'HomeAndConstructionBusiness',
			'Electrician',
			'Plumber',
			'RoofingContractor',
			'HVACBusiness',
			'GeneralContractor',
			'MovingCompany',
			'HousePainter',
			'Locksmith',
			'AutomotiveBusiness',
			'AutoRepair',
			'AutoDealer',
			'GasStation',
			'ProfessionalService',
			'Attorney',
			'LegalService',
			'AccountingService',
			'InsuranceAgency',
			'RealEstateAgent',
			'FinancialService',
			'EntertainmentBusiness',
			'ExerciseGym',
			'SportsClub',
			'ChildCare',
			'School',
			'EducationalOrganization',
			'TravelAgency',
			'Veterinarian',
			'PetStore',
			'Florist',
			'ClothingStore',
			'GroceryStore',
			'HardwareStore',
			'FurnitureStore',
			'ElectronicsStore',
			'JewelryStore',
			'ShoeStore',
			'BookStore',
			'SportingGoodsStore',
			'Organization',
		);

		/**
		 * Filters the schema.org business types offered.
		 *
		 * @param string[] $types Type names.
		 */
		$filtered = apply_filters( 'fhint_business_types', $types );

		return is_array( $filtered ) && $filtered ? array_values( array_unique( array_map( 'strval', $filtered ) ) ) : $types;
	}

	/**
	 * Social networks recognised for the sameAs output.
	 *
	 * @return string[]
	 */
	public static function social_networks() {
		return array( 'facebook', 'instagram', 'x', 'linkedin', 'youtube', 'tiktok', 'pinterest', 'yelp' );
	}

	/**
	 * Fields a client may write.
	 *
	 * @return string[]
	 */
	public static function writable_fields() {
		return array(
			'name',
			'legal_name',
			'business_type',
			'primary_category',
			'primary_category_id',
			'secondary_categories',
			'description',
			'logo_attachment_id',
			'logo_url',
			'phone',
			'email',
			'website',
			'price_range',
			'founding_date',
			'social_profiles',
		);
	}

	/**
	 * An empty profile, with every key present so callers never guess.
	 *
	 * @return array
	 */
	public static function blank() {
		return array(
			'id'                   => 0,
			'name'                 => '',
			'legal_name'           => '',
			'business_type'        => '',
			'primary_category'     => '',
			'primary_category_id'  => '',
			'secondary_categories' => array(),
			'description'          => '',
			'logo_attachment_id'   => 0,
			'logo_url'             => '',
			'phone'                => '',
			'email'                => '',
			'website'              => '',
			'price_range'          => '',
			'founding_date'        => '',
			'social_profiles'      => array(),
			'created_at'           => '',
			'updated_at'           => '',
		);
	}

	/**
	 * Sanitise an incoming payload down to writable fields.
	 *
	 * Only keys actually present are returned, which is what makes a partial
	 * update partial: an absent key means "leave it alone", not "clear it".
	 *
	 * @param array $input Raw request data.
	 * @return array
	 */
	public static function sanitize( array $input ) {
		$clean = array();

		foreach ( self::writable_fields() as $field ) {
			if ( ! array_key_exists( $field, $input ) ) {
				continue;
			}

			$value = $input[ $field ];

			switch ( $field ) {
				case 'secondary_categories':
					$clean[ $field ] = self::sanitize_categories( $value );
					break;

				case 'social_profiles':
					$clean[ $field ] = self::sanitize_social( $value );
					break;

				case 'description':
					$clean[ $field ] = sanitize_textarea_field( (string) $value );
					break;

				case 'logo_attachment_id':
					$clean[ $field ] = max( 0, (int) $value );
					break;

				case 'logo_url':
				case 'website':
					$clean[ $field ] = esc_url_raw( trim( (string) $value ) );
					break;

				case 'email':
					$clean[ $field ] = sanitize_email( trim( (string) $value ) );
					break;

				default:
					$clean[ $field ] = sanitize_text_field( (string) $value );
					break;
			}
		}

		return self::reconcile_primary_category( $clean );
	}

	/**
	 * Keep the primary category's name and its Google id telling one story.
	 *
	 * Two clients write this pair. The category chooser sends an id, and the
	 * name is then taken **from Google's list**, never from the request, so
	 * what is stored always matches what will be submitted. The plain text
	 * field sends only a name; that is tied back to an id when the wording is
	 * one Google uses, and otherwise the id is cleared — a category typed
	 * freehand is still worth keeping, but it must not carry the id of
	 * whatever was chosen before it.
	 *
	 * @param array $clean Sanitised changes.
	 * @return array
	 */
	private static function reconcile_primary_category( array $clean ) {
		$has_id   = array_key_exists( 'primary_category_id', $clean );
		$has_name = array_key_exists( 'primary_category', $clean );

		if ( $has_id && '' !== $clean['primary_category_id'] ) {
			$category = Categories::resolve( $clean['primary_category_id'] );

			$clean['primary_category_id'] = $category['id'];

			if ( Categories::exists( $category['id'] ) ) {
				$clean['primary_category'] = $category['name'];
			}

			return $clean;
		}

		if ( $has_name && ! $has_id ) {
			$category = Categories::resolve( $clean['primary_category'] );

			$clean['primary_category_id'] = $category['id'];

			if ( '' !== $category['id'] ) {
				$clean['primary_category'] = $category['name'];
			}
		}

		return $clean;
	}

	/**
	 * Additional categories, each as the `{ id, name }` pair Google's list holds.
	 *
	 * Accepts ids, names, or `{ id, name }` objects, in a list or a
	 * comma-separated string, and stores every one the same way. Anything
	 * that is not on the list is kept with an empty id rather than dropped,
	 * so validation can refuse the write and say why — silently discarding
	 * it would look like a save that worked.
	 *
	 * @param mixed $value Raw value.
	 * @return array[] Each `{ id, name }`, without repeats.
	 */
	private static function sanitize_categories( $value ) {
		if ( is_string( $value ) ) {
			$value = '' === trim( $value ) ? array() : explode( ',', $value );
		}

		if ( ! is_array( $value ) ) {
			return array();
		}

		// One `{ id, name }` object rather than a list of them.
		if ( isset( $value['id'] ) || isset( $value['name'] ) ) {
			$value = array( $value );
		}

		$clean = array();
		$seen  = array();

		foreach ( $value as $item ) {
			if ( is_array( $item ) ) {
				$item = array(
					'id'   => sanitize_text_field( isset( $item['id'] ) ? (string) $item['id'] : '' ),
					'name' => sanitize_text_field( isset( $item['name'] ) ? (string) $item['name'] : '' ),
				);
			} else {
				$item = sanitize_text_field( (string) $item );
			}

			$category = Categories::resolve( $item );

			if ( '' === $category['id'] && '' === $category['name'] ) {
				continue;
			}

			$key = '' !== $category['id'] ? $category['id'] : 'name:' . strtolower( $category['name'] );

			if ( isset( $seen[ $key ] ) ) {
				continue;
			}

			$seen[ $key ] = true;
			$clean[]      = $category;
		}

		return $clean;
	}

	/**
	 * Normalise a social profiles payload to network => URL.
	 *
	 * @param mixed $value Raw value.
	 * @return array<string, string>
	 */
	private static function sanitize_social( $value ) {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$clean = array();

		foreach ( $value as $network => $url ) {
			$network = sanitize_key( (string) $network );
			$url     = esc_url_raw( trim( (string) $url ) );

			if ( '' !== $network && '' !== $url ) {
				$clean[ $network ] = $url;
			}
		}

		return $clean;
	}

	/**
	 * What is wrong with a list of additional categories, if anything.
	 *
	 * One code at most, the most fundamental first: too many, then one Google
	 * does not have, then one repeating the primary category.
	 *
	 * Plain strings are skipped by the "unknown" check. They are names stored
	 * before ids existed; refusing every later save because of them would
	 * lock an existing business out of its own profile.
	 *
	 * @param array  $categories Stored or incoming additional categories.
	 * @param string $primary_id The primary category's Google id, or ''.
	 * @return string Error code, or '' when the list is acceptable.
	 */
	private static function additional_categories_error( array $categories, $primary_id ) {
		if ( count( $categories ) > Categories::MAX_ADDITIONAL ) {
			return 'business.categories.too_many';
		}

		foreach ( $categories as $category ) {
			if ( ! is_array( $category ) ) {
				continue;
			}

			$id = isset( $category['id'] ) ? (string) $category['id'] : '';

			if ( '' === $id || ! Categories::exists( $id ) ) {
				return 'business.categories.unknown';
			}
		}

		foreach ( $categories as $category ) {
			if ( is_array( $category ) && '' !== $primary_id && isset( $category['id'] ) && (string) $category['id'] === $primary_id ) {
				return 'business.categories.includes_primary';
			}
		}

		return '';
	}

	/**
	 * Whether a piece of text contains a web address.
	 *
	 * Three forms count: a scheme (`https://…`), a `www.` prefix, and a bare
	 * domain on a well-known ending (`example.com`). The list of endings is
	 * short on purpose and leaves out two-letter country codes: a missing
	 * space after a full stop — "open late.in an emergency" — would otherwise
	 * read as a domain, and telling an owner their description has a link in
	 * it when it does not is worse than missing an unusual one, which Google
	 * will still catch.
	 *
	 * @param string $text Text to check.
	 * @return bool
	 */
	public static function has_link( $text ) {
		$text = (string) $text;

		if ( '' === trim( $text ) ) {
			return false;
		}

		if ( preg_match( '#(?:https?://|\bwww\.)\S#i', $text ) ) {
			return true;
		}

		return (bool) preg_match(
			'#\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.(?:com|net|org|info|biz|io|app|dev|shop|store|online|site|xyz)\b#i',
			$text
		);
	}

	/**
	 * Check a complete record against the business rules.
	 *
	 * @param array $data Full record, as it would be stored.
	 * @return ValidationResult
	 */
	public static function validate( array $data ) {
		$result = new ValidationResult();

		$name = isset( $data['name'] ) ? trim( (string) $data['name'] ) : '';

		if ( '' === $name ) {
			$result->add( 'name', 'business.name.required' );
		} elseif ( mb_strlen( $name ) > 255 ) {
			$result->add( 'name', 'business.name.too_long' );
		}

		if ( isset( $data['legal_name'] ) && mb_strlen( (string) $data['legal_name'] ) > 255 ) {
			$result->add( 'legal_name', 'business.legal_name.too_long' );
		}

		if ( ! empty( $data['business_type'] ) && ! in_array( (string) $data['business_type'], self::types(), true ) ) {
			$result->add( 'business_type', 'business.type.invalid' );
		}

		if ( isset( $data['primary_category'] ) && mb_strlen( (string) $data['primary_category'] ) > 150 ) {
			$result->add( 'primary_category', 'business.category.too_long' );
		}

		$description = isset( $data['description'] ) ? (string) $data['description'] : '';

		if ( mb_strlen( $description ) > self::DESCRIPTION_MAX ) {
			$result->add( 'description', 'business.description.too_long' );
		}

		// Google rejects a description that contains a web address.
		if ( self::has_link( $description ) ) {
			$result->add( 'description', 'business.description.has_link' );
		}

		// A category id is what gets sent to Google, so one that is not on
		// Google's list is refused here rather than at the push.
		$primary_id = isset( $data['primary_category_id'] ) ? (string) $data['primary_category_id'] : '';

		if ( '' !== $primary_id && ! Categories::exists( $primary_id ) ) {
			$result->add( 'primary_category_id', 'business.category_id.unknown' );
		}

		$extra_code = self::additional_categories_error(
			isset( $data['secondary_categories'] ) && is_array( $data['secondary_categories'] ) ? $data['secondary_categories'] : array(),
			$primary_id
		);

		if ( '' !== $extra_code ) {
			$result->add( 'secondary_categories', $extra_code );
		}

		if ( ! empty( $data['email'] ) && ! Validator::is_email( (string) $data['email'] ) ) {
			$result->add( 'email', 'business.email.invalid' );
		}

		if ( ! empty( $data['phone'] ) && ! Validator::is_phone( (string) $data['phone'] ) ) {
			$result->add( 'phone', 'business.phone.invalid' );
		}

		if ( ! empty( $data['website'] ) && ! Validator::is_url( (string) $data['website'] ) ) {
			$result->add( 'website', 'business.website.invalid' );
		}

		if ( ! empty( $data['logo_url'] ) && ! Validator::is_url( (string) $data['logo_url'] ) ) {
			$result->add( 'logo_url', 'business.logo_url.invalid' );
		}

		if ( isset( $data['price_range'] ) && mb_strlen( (string) $data['price_range'] ) > 20 ) {
			$result->add( 'price_range', 'business.price_range.too_long' );
		}

		if ( ! empty( $data['founding_date'] ) && ! Validator::is_date( (string) $data['founding_date'] ) ) {
			$result->add( 'founding_date', 'business.founding_date.invalid' );
		}

		if ( ! empty( $data['social_profiles'] ) && is_array( $data['social_profiles'] ) ) {
			foreach ( $data['social_profiles'] as $network => $url ) {
				if ( ! Validator::is_url( (string) $url ) ) {
					$result->add( 'social_profiles.' . $network, 'social.url.invalid' );
				}
			}
		}

		return $result;
	}

	/**
	 * How complete the profile is, as a percentage.
	 *
	 * Used by the dashboard tile and by the onboarding checklist. Weighted
	 * towards the fields that actually affect local search rather than
	 * treating every field as equally important.
	 *
	 * @param array $data Full record.
	 * @return int 0–100.
	 */
	public static function completeness( array $data ) {
		$weights = array(
			'name'             => 25,
			'business_type'    => 10,
			'primary_category' => 10,
			'description'      => 10,
			'phone'            => 15,
			'email'            => 5,
			'website'          => 15,
			'logo_url'         => 5,
			'social_profiles'  => 5,
		);

		$earned = 0;

		foreach ( $weights as $field => $weight ) {
			$value = isset( $data[ $field ] ) ? $data[ $field ] : '';

			if ( is_array( $value ) ? ! empty( $value ) : '' !== trim( (string) $value ) ) {
				$earned += $weight;
			}
		}

		return (int) min( 100, $earned );
	}
}
