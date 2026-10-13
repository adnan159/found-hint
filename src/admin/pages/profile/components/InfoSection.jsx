import { __ } from "@wordpress/i18n";
import DescriptionField from "./info/DescriptionField";
import ExtraCategoriesField from "./info/ExtraCategoriesField";
import GoogleCid from "./info/GoogleCid";
import MainCategoryField from "./info/MainCategoryField";
import TextField from "./TextField";

/**
 * Name, categories, description, website, phone, and Google's id for the
 * listing.
 *
 * Two of the design's controls are absent on purpose, because nothing stands
 * behind them yet: the "write it for me" button and the "suggested for your
 * business" strip. A button that does nothing is worse than a missing one.
 */
export function InfoSection({ model, onChange, errors, info, google, limits }) {
  const set = (key) => (value) => onChange({ ...model, [key]: value });

  return (
    <>
      <div className="fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] fhint:gap-[18px]">
        <TextField
          label={__("Business name", "foundhint-local-seo")}
          value={model.name}
          onChange={set("name")}
          error={errors?.name}
          hint={__(
            "Exactly as it appears on your sign. Adding extra words like “best dentist” can get your listing suspended.",
            "foundhint-local-seo",
          )}
        />

        <MainCategoryField model={model} onChange={onChange} errors={errors} />
      </div>

      <ExtraCategoriesField
        model={model}
        onChange={onChange}
        errors={errors}
        max={limits?.additional_categories ?? 9}
      />

      <DescriptionField
        value={model.description}
        onChange={set("description")}
        error={errors?.description}
        history={info?.history ?? []}
      />

      <div className="fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] fhint:gap-[18px]">
        <TextField
          label={__("Website", "foundhint-local-seo")}
          type="url"
          inputMode="url"
          value={model.website}
          onChange={set("website")}
          error={errors?.website}
        />
        <TextField
          label={__("Phone number", "foundhint-local-seo")}
          type="tel"
          inputMode="tel"
          value={model.phone}
          onChange={set("phone")}
          error={errors?.phone}
        />
      </div>

      <GoogleCid cid={info?.cid ?? ""} mapped={Boolean(google?.mapped)} />
    </>
  );
}

export default InfoSection;
