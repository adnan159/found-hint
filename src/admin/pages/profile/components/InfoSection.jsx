import { __ } from "@wordpress/i18n";
import DescriptionField from "./info/DescriptionField";
import ExtraCategoriesField from "./info/ExtraCategoriesField";
import AdditionalPhonesField from "./info/AdditionalPhonesField";
import PhoneField from "./info/PhoneField";
import GoogleCid from "./info/GoogleCid";
import MainCategoryField from "./info/MainCategoryField";
import TextField from "./TextField";

/**
 * The latest month an opening date may be: a year from now, as Google
 * allows. The server checks the same rule; this only stops the picker
 * offering months it would refuse.
 */
function latestOpeningMonth() {
  const date = new Date();

  date.setUTCMonth(date.getUTCMonth() + 12);

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Name, categories, description, opening date, website, phone, and Google's id for the
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
          label={__("Opening date", "foundhint-local-seo")}
          hint={__(
            "The month this location opened. Google shows it on your profile as “Opened March 2014”. It can be up to a year ahead if you have not opened yet.",
            "foundhint-local-seo",
          )}
          type="month"
          // A browser without a month picker shows a text box; the format
          // then has to be said, and the server checks it either way.
          placeholder="YYYY-MM"
          pattern="[0-9]{4}-[0-9]{2}"
          max={latestOpeningMonth()}
          value={model.opening_date}
          onChange={set("opening_date")}
          error={errors?.opening_date}
        />
        {/* Keeps the date to half the row, as in the design. */}
        <div aria-hidden="true" />
      </div>

      <div className="fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] fhint:gap-[18px]">
        <TextField
          label={__("Website", "foundhint-local-seo")}
          type="url"
          inputMode="url"
          value={model.website}
          onChange={set("website")}
          error={errors?.website}
        />
        <PhoneField
          value={model.phone}
          onChange={set("phone")}
          error={errors?.phone}
          country={info?.country ?? ""}
        />
      </div>

      <AdditionalPhonesField
        value={model.additional_phones}
        onChange={set("additional_phones")}
        errors={errors}
        country={info?.country ?? ""}
      />

      <GoogleCid cid={info?.cid ?? ""} mapped={Boolean(google?.mapped)} />
    </>
  );
}

export default InfoSection;
