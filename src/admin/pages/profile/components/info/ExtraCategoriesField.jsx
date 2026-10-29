import { useId, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import Hint from "@/components/Hint";
import { cn } from "cn";
import { chipBox, chipBoxInput } from "@/lib/fieldStyles";
import { errorText, focus, label } from "../../styles";
import CategorySearch from "../CategorySearch";

/**
 * The other things the business does: chosen categories as removable chips,
 * with a search box at the end of the row to add another, up to `max`.
 */
export function ExtraCategoriesField({ model, onChange, errors, max }) {
  const extraLabelId = useId();
  const [extraDraft, setExtraDraft] = useState("");

  const maxExtra = max;
  const extra = model.secondary_categories;
  const extraFull = extra.length >= maxExtra;

  return (
    <div className="fhint:grid fhint:gap-2">
      <div className="fhint:flex fhint:items-baseline fhint:gap-2.5">
        <div className="fhint:flex fhint:items-center fhint:gap-1.5">
          <span id={extraLabelId} className={label}>
            {__("Extra categories", "foundhint-local-seo")}
          </span>
          <Hint
            about={__("Extra categories", "foundhint-local-seo")}
            text={__(
              "Add other things you genuinely do. Only pick categories that are true, because unrelated ones can hurt you.",
              "foundhint-local-seo",
            )}
          />
        </div>
        <span className="fhint:ml-auto fhint:text-[12.5px] fhint:font-bold fhint:text-muted-strong">
          {sprintf(
            /* translators: 1: how many extra categories are chosen, 2: how many Google allows. */
            __("%1$d of %2$d used", "foundhint-local-seo"),
            extra.length,
            maxExtra,
          )}
        </span>
      </div>
      <div
        className={cn(
          chipBox,
          errors?.secondary_categories && "fhint:border-destructive",
        )}
      >
        {extra.map((category) => (
          <span
            key={category.id}
            className="fhint:inline-flex fhint:items-center fhint:gap-[7px] fhint:rounded-full fhint:border fhint:border-border fhint:bg-background fhint:py-[5px] fhint:pr-2 fhint:pl-3 fhint:text-[13px] fhint:font-semibold"
          >
            {category.name}
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...model,
                  secondary_categories: extra.filter(
                    (item) => item.id !== category.id,
                  ),
                })
              }
              aria-label={sprintf(
                /* translators: %s: a category name. */
                __("Remove %s", "foundhint-local-seo"),
                category.name,
              )}
              className={cn(
                "fhint:cursor-pointer fhint:border-0 fhint:bg-transparent fhint:px-0.5 fhint:text-[15px] fhint:leading-none fhint:text-muted-strong",
                focus,
              )}
            >
              ×
            </button>
          </span>
        ))}
        <CategorySearch
          labelledBy={extraLabelId}
          value={extraDraft}
          disabled={extraFull}
          exclude={[model.primary_category_id, ...extra.map((item) => item.id)]}
          placeholder={
            extraFull
              ? sprintf(
                  /* translators: %d: how many extra categories Google allows. */
                  __("You have used all %d", "foundhint-local-seo"),
                  maxExtra,
                )
              : __("Type a category and choose it", "foundhint-local-seo")
          }
          inputClassName={cn(chipBoxInput, "fhint:w-full fhint:text-[13px]")}
          onType={setExtraDraft}
          onChoose={(category) => {
            onChange({
              ...model,
              secondary_categories: [...extra, category],
            });
            setExtraDraft("");
          }}
        />
      </div>
      {errors?.secondary_categories ? (
        <span role="alert" className={errorText}>
          {errors.secondary_categories}
        </span>
      ) : null}
    </div>
  );
}

export default ExtraCategoriesField;
