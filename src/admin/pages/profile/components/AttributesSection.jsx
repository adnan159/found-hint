import { __ } from "@wordpress/i18n";
import { Link } from "react-router";
import { cn } from "cn";
import { focus, help, primaryButton, primaryLink } from "../styles";

const pill = (on) =>
  cn(
    "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-2 fhint:rounded-full fhint:border fhint:px-3 fhint:py-[7px] fhint:text-[13px]",
    on
      ? "fhint:border-primary fhint:bg-notice fhint:font-bold fhint:text-notice-foreground"
      : "fhint:border-border fhint:bg-card fhint:font-medium fhint:text-foreground-soft",
    focus,
  );

function Box({ on }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "fhint:grid fhint:size-[15px] fhint:flex-none fhint:place-items-center fhint:rounded-[3px] fhint:border fhint:text-[10px] fhint:font-extrabold fhint:text-primary-foreground",
        on
          ? "fhint:border-primary fhint:bg-primary"
          : "fhint:border-[#9b9797] fhint:bg-card",
      )}
    >
      {on ? "✓" : ""}
    </span>
  );
}

/**
 * Facts about the business that customers filter by on Google.
 *
 * **The list is Google's, and it is this listing's.** A pet shop is offered
 * "In-store pickup"; a dentist is offered "Accepting new patients"; neither
 * is offered the other's. So the boxes are drawn from what Google said this
 * listing can have, and nothing is offered that Google would then refuse.
 *
 * Three kinds are drawn. A yes/no is a tick box. Unticking one answers "no"
 * where Google has a "no" for it, and withdraws the answer where it does not
 * ("identifies as women-owned" has no opposite). A choice — Wi-Fi: free or
 * paid — is a row of options where one is picked; a multiple choice lets
 * several be.
 */
export function AttributesSection({
  model,
  onChange,
  attributes,
  google,
  onRefresh,
  isRefreshing,
}) {
  const definitions = attributes?.definitions ?? [];

  const groups = new Map();

  for (const item of definitions) {
    groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  }

  const set = (id, value) => {
    const next = { ...model };

    if (value === undefined) {
      delete next[id];
    } else {
      next[id] = value;
    }

    onChange(next);
  };

  const tick = (item) => {
    const on = model[item.id] === true;

    return (
      <button
        key={item.id}
        type="button"
        role="checkbox"
        aria-checked={on}
        onClick={() =>
          set(item.id, on ? (item.allows_false ? false : undefined) : true)
        }
        className={pill(on)}
      >
        <Box on={on} />
        {item.label}
      </button>
    );
  };

  const choice = (item) => {
    const many = item.type === "repeated_enum";
    const current = model[item.id];
    const chosen = many
      ? Array.isArray(current)
        ? current
        : []
      : typeof current === "string"
        ? [current]
        : [];

    return (
      <div
        key={item.id}
        role="group"
        aria-label={item.label}
        className="fhint:flex fhint:w-full fhint:flex-wrap fhint:items-center fhint:gap-2"
      >
        <span className="fhint:text-[13px] fhint:font-bold">{item.label}</span>
        {(item.options ?? []).map((option) => {
          const on = chosen.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              role={many ? "checkbox" : "radio"}
              aria-checked={on}
              onClick={() => {
                if (many) {
                  const next = on
                    ? chosen.filter((value) => value !== option.value)
                    : [...chosen, option.value];

                  set(item.id, next.length ? next : undefined);
                } else {
                  // Picking the chosen option again clears the choice.
                  set(item.id, on ? undefined : option.value);
                }
              }}
              className={pill(on)}
            >
              <Box on={on} />
              {option.label || option.value}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <p className={cn(help, "fhint:m-0 fhint:max-w-[70ch] fhint:text-[13px]")}>
        {__(
          "Tick everything that is true about your business. Customers filter by these on Google, for example “wheelchair accessible” or “accepts credit cards”.",
          "foundhint-local-seo",
        )}
      </p>

      {[...groups.entries()].map(([name, items]) => {
        const ticks = items.filter((item) => item.type === "bool");
        const choices = items.filter((item) => item.type !== "bool");

        return (
          <div key={name} className="fhint:grid fhint:gap-2.5">
            {name ? (
              <h3 className="fhint:m-0 fhint:text-[11.5px] fhint:font-extrabold fhint:tracking-[0.08em] fhint:text-muted-strong fhint:uppercase">
                {name}
              </h3>
            ) : null}
            {ticks.length ? (
              <div className="fhint:flex fhint:flex-wrap fhint:gap-2">
                {ticks.map(tick)}
              </div>
            ) : null}
            {choices.map(choice)}
          </div>
        );
      })}

      {!definitions.length ? (
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border fhint:border-dashed fhint:border-input fhint:bg-muted fhint:px-[15px] fhint:py-[13px]">
          <div className="fhint:min-w-0 fhint:flex-1">
            <strong className="fhint:block fhint:text-[13px]">
              {google?.mapped
                ? __(
                    "Your attributes have not been read from Google yet",
                    "foundhint-local-seo",
                  )
                : __(
                    "Attributes come from your Google listing",
                    "foundhint-local-seo",
                  )}
            </strong>
            <span className={help}>
              {__(
                "Google decides which attributes a business can have, from its category and country, so the list is read from your own listing.",
                "foundhint-local-seo",
              )}
            </span>
          </div>
          {google?.mapped ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className={primaryButton}
            >
              {isRefreshing
                ? __("Reading Google…", "foundhint-local-seo")
                : __("Read from Google", "foundhint-local-seo")}
            </button>
          ) : (
            <Link to="/google" className={primaryLink}>
              {__("Connect Google", "foundhint-local-seo")}
            </Link>
          )}
        </div>
      ) : null}
    </>
  );
}

export default AttributesSection;
