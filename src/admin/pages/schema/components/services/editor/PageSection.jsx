import { useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { useGetSchemaPagesQuery } from "@/store/api/schemaManagerApi";
import { warningText } from "../../../lib/service";
import { chip, input, muted } from "../../styles";
import { EditorSection } from "./EditorSection";
import { FieldError } from "./FieldError";

const SOURCES = () => [
  ["wp", __("WordPress page", "foundhint-local-seo")],
  ["url", __("Enter a URL", "foundhint-local-seo")],
];

/**
 * 04 Service page: a WordPress page (searched) or a URL. Shows the address
 * it resolves to, and anything to check about it.
 *
 * @param {Object}   props
 * @param {Object}   props.form      From the editor.
 * @param {string}   props.resolved  The page's address, as last built.
 * @param {string}   props.pageTitle Its title.
 * @param {Object}   props.usedBy    Services already on each page, by id.
 * @param {Object[]} props.warnings  Warnings about the page.
 */
export function PageSection({ form, resolved, pageTitle, usedBy, warnings }) {
  const { values, set, locked, errors, control } = form;
  const page = values.page;
  const [search, setSearch] = useState("");

  const { data } = useGetSchemaPagesQuery(
    { search, include: page.post_id ? [page.post_id] : [] },
    { skip: locked || page.mode !== "wp" },
  );
  const pages = data?.pages ?? [];

  const pickSource = (key) =>
    set({
      page: {
        mode: key,
        post_id: key === "wp" ? page.post_id : 0,
        // Switching to a URL starts from the page already in use.
        url: key === "url" ? page.url || resolved : "",
      },
      // A featured image belongs to a WordPress page.
      ...(key === "url" && values.image.mode === "featured"
        ? { image: { mode: "none", url: "" } }
        : {}),
    });

  const optionText = (item) => {
    const name = item.front ? __("Home", "foundhint-local-seo") : item.title;

    return usedBy[item.id]?.length
      ? sprintf(
          /* translators: 1: page title, 2: services that use it. */
          __("%1$s — Used by %2$s", "foundhint-local-seo"),
          name,
          usedBy[item.id].join(", "),
        )
      : name;
  };

  return (
    <EditorSection
      number="04"
      title={__("Service page", "foundhint-local-seo")}
      hint={__(
        "The page about this service. The schema is printed there, and its address becomes the service's identity.",
        "foundhint-local-seo",
      )}
    >
      <div
        className="fhint:flex fhint:gap-0"
        role="group"
        aria-label={__("Service page source", "foundhint-local-seo")}
      >
        {SOURCES().map(([key, text]) => (
          <button
            key={key}
            type="button"
            aria-pressed={page.mode === key}
            disabled={locked}
            onClick={() => pickSource(key)}
            className={chip(page.mode === key)}
          >
            {text}
          </button>
        ))}
      </div>

      {page.mode !== "wp" ? (
        <input
          type="url"
          value={page.url}
          disabled={locked}
          onChange={(event) =>
            set({ page: { mode: "url", post_id: 0, url: event.target.value } })
          }
          placeholder={`${window.location.origin}/services/…`}
          aria-label={__("Service page URL", "foundhint-local-seo")}
          aria-invalid={Boolean(errors.page)}
          className={control("page")}
        />
      ) : locked ? (
        <span className={muted}>{pageTitle || resolved}</span>
      ) : (
        <div className="fhint:flex fhint:flex-wrap fhint:gap-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={__("Search your pages", "foundhint-local-seo")}
            aria-label={__("Search your pages", "foundhint-local-seo")}
            className={cn(input("open"), "fhint:max-w-[220px]")}
          />
          <select
            value={page.post_id || ""}
            onChange={(event) =>
              set({
                page: {
                  mode: "wp",
                  post_id: Number(event.target.value) || 0,
                  url: "",
                },
              })
            }
            aria-label={__("WordPress page", "foundhint-local-seo")}
            aria-invalid={Boolean(errors.page)}
            className={cn(
              control("page"),
              "fhint:min-w-[220px] fhint:flex-1 fhint:pr-8!",
            )}
          >
            <option value="">
              {__("Choose a page", "foundhint-local-seo")}
            </option>
            {pages.map((item) => (
              <option key={item.id} value={item.id}>
                {optionText(item)}
              </option>
            ))}
          </select>
        </div>
      )}
      <FieldError messages={errors.page} />

      {resolved ? (
        <span className={muted}>
          {__("Primary landing page:", "foundhint-local-seo")}{" "}
          <code className="fhint:font-mono fhint:text-[12.5px] fhint:break-all">
            {resolved}
          </code>
        </span>
      ) : null}

      {warnings.length ? (
        <ul
          aria-live="polite"
          className="fhint:m-0 fhint:grid fhint:list-none fhint:gap-1.5 fhint:p-0"
        >
          {warnings.map((warning) => (
            <li
              key={warning.code}
              className="fhint:border-l-[3px] fhint:border-l-warning-border fhint:bg-warning fhint:px-3 fhint:py-2 fhint:text-[12.5px] fhint:text-warning-foreground"
            >
              <span className="fhint:sr-only">
                {__("Check:", "foundhint-local-seo")}{" "}
              </span>
              {warningText(warning)}
            </li>
          ))}
        </ul>
      ) : null}
    </EditorSection>
  );
}

export default PageSection;
