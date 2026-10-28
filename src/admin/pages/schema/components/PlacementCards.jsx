import { useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { useGetSchemaPagesQuery } from "@/store/api/schemaManagerApi";
import { card, chip, input, muted } from "./styles";

/**
 * "Add … schema to": Every page / Home page only / Pages I choose, with
 * the page chips for the last.
 */
export function PlacementCards({
  title,
  name,
  value,
  postIds,
  locked,
  homeWarning = true,
  onChange,
  onPages,
}) {
  const [search, setSearch] = useState("");
  const { data } = useGetSchemaPagesQuery(
    { search, include: postIds },
    { skip: locked || value !== "chosen" },
  );
  const total = data?.total ?? 0;
  const pages = data?.pages ?? [];
  const homeChosen = pages.some(
    (page) => page.front && postIds.includes(page.id),
  );

  const options = [
    [
      "every_page",
      __("Every page", "foundhint-local-seo"),
      total
        ? sprintf(
            /* translators: %d: number of published pages and posts. */
            __("Site-wide, all %d pages.", "foundhint-local-seo"),
            total,
          )
        : __("Site-wide, on every page.", "foundhint-local-seo"),
    ],
    [
      "home_only",
      __("Home page only", "foundhint-local-seo"),
      __("Only your home page carries it.", "foundhint-local-seo"),
    ],
    [
      "chosen",
      __("Pages I choose", "foundhint-local-seo"),
      __("Pick the pages below.", "foundhint-local-seo"),
    ],
  ];

  return (
    <fieldset className="fhint:m-0 fhint:grid fhint:gap-3 fhint:border-0 fhint:border-t-2 fhint:border-t-[#201e1d] fhint:px-5 fhint:py-[18px]">
      <legend className="fhint:float-left fhint:mb-1 fhint:w-full fhint:p-0 fhint:text-[15px] fhint:font-bold">
        {title}
      </legend>
      <div className="fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))] fhint:gap-2">
        {options.map(([key, text, body]) => (
          <label
            key={key}
            className={cn(
              card(value === key),
              locked && "fhint:cursor-default",
            )}
          >
            <input
              type="radio"
              name={name}
              checked={value === key}
              disabled={locked}
              onChange={() => onChange(key)}
              className="fhint:mt-[3px] fhint:accent-[#FF6B35]"
            />
            <span>
              <strong className="fhint:block fhint:text-[13.5px]">
                {text}
              </strong>
              <span className={muted}>{body}</span>
            </span>
          </label>
        ))}
      </div>

      {value === "chosen" && !locked ? (
        <div className="fhint:grid fhint:gap-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={__("Search your pages", "foundhint-local-seo")}
            aria-label={__("Search your pages", "foundhint-local-seo")}
            className={cn(input("open"), "fhint:max-w-[320px]")}
          />
          <div
            className="fhint:flex fhint:flex-wrap fhint:gap-1.5"
            role="group"
            aria-label={__("Pages", "foundhint-local-seo")}
          >
            {pages.map((page) => {
              const on = postIds.includes(page.id);

              return (
                <button
                  key={page.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    onPages(
                      on
                        ? postIds.filter((id) => id !== page.id)
                        : [...postIds, page.id],
                    )
                  }
                  className={chip(on)}
                >
                  {page.front ? __("Home", "foundhint-local-seo") : page.title}
                </button>
              );
            })}
            {!pages.length ? (
              <span className={muted}>
                {__("No published pages match.", "foundhint-local-seo")}
              </span>
            ) : null}
          </div>
          {homeWarning && !homeChosen ? (
            <span className="fhint:text-[12.5px] fhint:font-semibold fhint:text-[#8a5a00]">
              {__(
                "Your home page needs the business so the website can name its publisher. FoundHint will still add it there.",
                "foundhint-local-seo",
              )}
            </span>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}

export default PlacementCards;
