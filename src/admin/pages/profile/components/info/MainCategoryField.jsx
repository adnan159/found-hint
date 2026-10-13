import { useId } from "react";
import { __ } from "@wordpress/i18n";
import Hint from "@/components/Hint";
import { cn } from "cn";
import { errorText, help, input, label } from "../../styles";
import CategorySearch from "../CategorySearch";

/**
 * The one category the business is best known for.
 *
 * Typing is a name with no id yet; choosing from the list is both. A name
 * with no id is kept, but cannot be sent to Google, and the field says so.
 */
export function MainCategoryField({ model, onChange, errors }) {
  const mainLabelId = useId();
  const extra = model.secondary_categories;

  return (
    <div className="fhint:grid fhint:content-start fhint:gap-1.5">
      <div className="fhint:flex fhint:items-center fhint:gap-1.5">
        <span id={mainLabelId} className={label}>
          {__("Main category", "foundhint-local-seo")}
        </span>
        <Hint
          about={__("Main category", "foundhint-local-seo")}
          text={__(
            "The single thing you are best known for. It affects which searches you show up in more than anything else here.",
            "foundhint-local-seo",
          )}
        />
      </div>
      <CategorySearch
        labelledBy={mainLabelId}
        value={model.primary_category}
        invalid={Boolean(errors?.primary_category_id)}
        exclude={extra.map((item) => item.id)}
        placeholder={__("Search Google's categories", "foundhint-local-seo")}
        inputClassName={cn(input, "fhint:font-bold")}
        // Typing is a name with no id yet; choosing from the list is both.
        onType={(text) =>
          onChange({
            ...model,
            primary_category: text,
            primary_category_id: "",
          })
        }
        onChoose={(category) =>
          onChange({
            ...model,
            primary_category: category.name,
            primary_category_id: category.id,
          })
        }
      />
      {errors?.primary_category_id || errors?.primary_category ? (
        <span role="alert" className={errorText}>
          {errors.primary_category_id ?? errors.primary_category}
        </span>
      ) : null}
      {model.primary_category && !model.primary_category_id ? (
        <span className={cn(help, "fhint:text-notice-foreground")}>
          {__(
            "Choose one from the list. A category typed by hand is kept here but cannot be sent to Google.",
            "foundhint-local-seo",
          )}
        </span>
      ) : null}
    </div>
  );
}

export default MainCategoryField;
