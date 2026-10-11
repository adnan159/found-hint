import { useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import NoticeBar from "@/components/NoticeBar";
import ServiceDialog from "./ServiceDialog";
import {
  errorText,
  help,
  linkButton,
  primaryButton,
  tag,
  tagTones,
} from "../styles";

const DEFAULT_CURRENCY = "USD";

const blank = (currency) => ({
  name: "",
  description: "",
  price: "",
  currency,
  status: "active",
  google_item_type: "",
  google_service_type_id: "",
});

function priceText(item) {
  if (item.price === "" || item.price === null || item.price === undefined) {
    return "";
  }

  const amount = Number(item.price);

  if (Number.isNaN(amount)) {
    return String(item.price);
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: item.currency || "USD",
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${item.currency} ${amount}`.trim();
  }
}

// The errors of one row, with its `items.N.` prefix taken off.
function rowErrors(errors, index) {
  const prefix = `items.${index}`;

  return Object.entries(errors ?? {})
    .filter(([key]) => key === prefix || key.startsWith(`${prefix}.`))
    .map(([, message]) => message);
}

/**
 * What the business offers.
 *
 * The design's "Import CSV" and "Write missing descriptions" are left out —
 * there is nothing behind either yet.
 */
export function ServicesSection({ model, onChange, errors, services }) {
  const [editing, setEditing] = useState(null);

  const limits = services?.limits ?? {};
  const limit = limits.unlimited ? 0 : (limits.limit ?? 0);
  // The limit counts what would be saved, so the Add button answers for the
  // list as it stands on screen and not as it was last stored.
  const full = limit > 0 && model.length >= limit;
  const currency =
    model.find((item) => item.currency)?.currency ?? DEFAULT_CURRENCY;

  const save = (value) => {
    onChange(
      editing.index === null
        ? [...model, value]
        : model.map((item, at) => (at === editing.index ? value : item)),
    );
    setEditing(null);
  };

  return (
    <>
      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3">
        <p
          className={cn(
            help,
            "fhint:m-0 fhint:min-w-0 fhint:flex-1 fhint:text-[13px]",
          )}
        >
          {__(
            "Services shown on your Google profile and in your website markup.",
            "foundhint-local-seo",
          )}
        </p>
        <button
          type="button"
          disabled={full}
          onClick={() => setEditing({ index: null, draft: blank(currency) })}
          className={primaryButton}
        >
          {__("+ Add service", "foundhint-local-seo")}
        </button>
      </div>

      {errors?.items ? (
        <span role="alert" className={errorText}>
          {errors.items}
        </span>
      ) : null}

      {model.length ? (
        <ul className="fhint:m-0 fhint:list-none fhint:border fhint:border-border fhint:p-0">
          {model.map((item, index) => {
            const problems = rowErrors(errors, index);
            const price = priceText(item);

            return (
              <li
                key={item.id ?? `new-${index}`}
                className="fhint:m-0 fhint:flex fhint:flex-wrap fhint:items-start fhint:gap-3 fhint:border-b fhint:border-b-[#eae7e7] fhint:px-3.5 fhint:py-3 fhint:last:border-b-0"
              >
                <div className="fhint:grid fhint:min-w-[200px] fhint:flex-1 fhint:gap-1">
                  <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
                    <strong className="fhint:text-[13.5px]">{item.name}</strong>
                    <span
                      className={cn(
                        tag,
                        item.status === "active" ? tagTones.ok : tagTones.quiet,
                      )}
                    >
                      {item.status === "active"
                        ? __("Offered", "foundhint-local-seo")
                        : __("Hidden", "foundhint-local-seo")}
                    </span>
                    {item.google_service_type_id ? (
                      <span className={cn(tag, tagTones.accent)}>
                        {__("Google service", "foundhint-local-seo")}
                      </span>
                    ) : null}
                    {!item.id ? (
                      <span className={cn(tag, tagTones.accent)}>
                        {__("New", "foundhint-local-seo")}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "fhint:text-[12.5px] fhint:leading-[1.45]",
                      item.description
                        ? "fhint:text-foreground-soft"
                        : "fhint:text-muted-foreground",
                    )}
                  >
                    {item.description ||
                      __("No description yet.", "foundhint-local-seo")}
                  </span>
                  {problems.map((message) => (
                    <span key={message} role="alert" className={errorText}>
                      {message}
                    </span>
                  ))}
                </div>
                {price ? (
                  <span className="fhint:text-[13px] fhint:font-bold">
                    {price}
                  </span>
                ) : null}
                <span className="fhint:flex fhint:gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing({ index, draft: item })}
                    aria-label={sprintf(
                      /* translators: %s: a service name. */
                      __("Edit %s", "foundhint-local-seo"),
                      item.name,
                    )}
                    className={linkButton}
                  >
                    {__("Edit", "foundhint-local-seo")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(model.filter((_, at) => at !== index))
                    }
                    aria-label={sprintf(
                      /* translators: %s: a service name. */
                      __("Remove %s", "foundhint-local-seo"),
                      item.name,
                    )}
                    className={cn(linkButton, "fhint:text-destructive")}
                  >
                    {__("Remove", "foundhint-local-seo")}
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="fhint:border fhint:border-dashed fhint:border-input fhint:px-5 fhint:py-7 fhint:text-center">
          <strong className="fhint:block fhint:text-sm">
            {__("No services added yet", "foundhint-local-seo")}
          </strong>
          <span className={help}>
            {__(
              "Press Add service to list what you offer. Use the words customers would search for.",
              "foundhint-local-seo",
            )}
          </span>
        </div>
      )}

      {full ? (
        <NoticeBar>
          {sprintf(
            /* translators: %d: number of services the plan includes. */
            __(
              "You have used all %d services on Free. Pro removes the limit.",
              "foundhint-local-seo",
            ),
            limit,
          )}
        </NoticeBar>
      ) : null}

      {editing ? (
        <ServiceDialog
          draft={editing.draft}
          isNew={editing.index === null}
          googleTypes={services?.google_types ?? []}
          // A ready-made service can be listed once; the ones other rows
          // already use are not offered again.
          taken={model
            .filter((_, at) => at !== editing.index)
            .map((item) => item.google_service_type_id)
            .filter(Boolean)}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      ) : null}
    </>
  );
}

export default ServicesSection;
