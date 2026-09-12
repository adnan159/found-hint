<?php
/**
 * Business entity.
 *
 * @package FoundHint
 */

namespace FHINT\App\Business;

use FHINT\App\Core\ValidationResult;
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

		return $clean;
	}

	/**
	 * Normalise a categories payload to a list of strings.
	 *
	 * @param mixed $value Raw value.
	 * @return string[]
	 */
	private static function sanitize_categories( $value ) {
		if ( is_string( $value ) ) {
			$value = '' === trim( $value ) ? array() : explode( ',', $value );
		}

		if ( ! is_array( $value ) ) {
			return array();
		}

		$clean = array();

		foreach ( $value as $item ) {
			$item = sanitize_text_field( (string) $item );

			if ( '' !== $item ) {
				$clean[] = $item;
			}
		}

		return array_values( array_unique( $clean ) );
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
