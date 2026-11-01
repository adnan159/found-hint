import { useId } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { toast } from "sonner";
import { cn } from "cn";
import { Switch } from "@/components/ui/switch";
import { errorMessage } from "@/lib/errors";
import {
  useGetSchemaOutputQuery,
  useGetSchemaPageMapQuery,
  useRunLiveCheckMutation,
  useSaveSchemaOutputMutation,
} from "@/store/api/schemaManagerApi";
import { relative } from "../../lib/schema";
import { BADGE, TONES } from "../../lib/locations";
import PanelHeading from "../shared/PanelHeading";
import { dialogButton, input, label, muted, panel } from "../styles";

const VERDICTS = {
  duplicate: [() => __("Duplicate found", "foundhint-local-seo"), "warn"],
  maybe: [() => __("Check it", "foundhint-local-seo"), "warn"],
  overlap: [() => __("Overlaps", "foundhint-local-seo"), "warn"],
  none: [() => __("No overlap", "foundhint-local-seo"), "ok"],
  ready: [() => __("Ready", "foundhint-local-seo"), "quiet"],
};

function pluginNote(plugin) {
  if (!plugin.active) {
    return __("Supported. Not installed.", "foundhint-local-seo");
  }

  switch (plugin.verdict) {
    case "duplicate":
      return __(
        "Active on this site. Also adds business schema.",
        "foundhint-local-seo",
      );
    case "maybe":
      return __(
        "Active. It may add business schema, depending on its settings.",
        "foundhint-local-seo",
      );
    case "overlap":
      return __(
        "Active. Adds its own website and page schema; choose who publishes those under Who publishes it.",
        "foundhint-local-seo",
      );
    default:
      return plugin.reason === "products_only"
        ? __(
            "Active. Adds product schema only, which doesn't overlap.",
            "foundhint-local-seo",
          )
        : __("Active. No overlap.", "foundhint-local-seo");
  }
}

/**
 * 06 Settings (design C): whether FoundHint adds schema to the site header
 * and where, a live check of the home page, what each page carries, and the
 * SEO plugins it works with.
 */
export function OutputSettings() {
  const ids = useId();
  const { data: output } = useGetSchemaOutputQuery();
  const { data: map } = useGetSchemaPageMapQuery();
  const [save, saveState] = useSaveSchemaOutputMutation();
  const [check, checkState] = useRunLiveCheckMutation();

  if (!output) {
    return null;
  }

  const on = output.enabled;
  const result = output.check;
  const conflicts = (output.plugins ?? []).filter((plugin) =>
    ["duplicate", "maybe"].includes(plugin.verdict),
  );

  const update = async (changes, message) => {
    try {
      await save(changes).unwrap();
      toast.success(message);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const runCheck = async () => {
    try {
      const outcome = await check().unwrap();

      toast[outcome.ok ? "success" : "error"](
        !outcome.reachable
          ? __("Couldn't reach your site to check it.", "foundhint-local-seo")
          : outcome.ok
            ? __("Found on your site just now.", "foundhint-local-seo")
            : __(
                "Your site doesn't match yet. See below.",
                "foundhint-local-seo",
              ),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="fhint:grid fhint:min-w-0 fhint:gap-4">
      <section className={cn(panel, "fhint:min-w-0")}>
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-b fhint:border-b-border fhint:px-5 fhint:py-4">
          <span className="fhint:grid fhint:min-w-0 fhint:flex-[1_1_300px] fhint:gap-0.5">
            <h2
              id={`${ids}-header`}
              className="fhint:m-0 fhint:text-[16px] fhint:font-bold"
            >
              {__("Add to my site header", "foundhint-local-seo")}
            </h2>
            <span className={muted}>
              {__(
                "FoundHint prints every schema you set up into the pages you picked. Nothing to copy or paste.",
                "foundhint-local-seo",
              )}
            </span>
          </span>
          <span className={cn(BADGE, on ? TONES.ok : TONES.quiet)}>
            {on
              ? __("On", "foundhint-local-seo")
              : __("Off", "foundhint-local-seo")}
          </span>
          <Switch
            checked={on}
            disabled={saveState.isLoading}
            onCheckedChange={(next) =>
              update(
                { enabled: next },
                next
                  ? __(
                      "Schema is added to your site again.",
                      "foundhint-local-seo",
                    )
                  : __(
                      "Automatic output is off. Nothing is added to your site.",
                      "foundhint-local-seo",
                    ),
              )
            }
            aria-labelledby={`${ids}-header`}
          />
        </div>

        {on ? (
          <div className="fhint:grid fhint:gap-4 fhint:px-5 fhint:py-4 fhint:md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="fhint:grid fhint:content-start fhint:gap-3">
              <div className="fhint:grid fhint:gap-1.5">
                <label htmlFor={`${ids}-hook`} className={label}>
                  {__("Where in the page", "foundhint-local-seo")}
                </label>
                <select
                  id={`${ids}-hook`}
                  value={output.placement}
                  disabled={saveState.isLoading}
                  onChange={(event) =>
                    update(
                      { placement: event.target.value },
                      __("Saved.", "foundhint-local-seo"),
                    )
                  }
                  aria-describedby={`${ids}-hook-hint`}
                  className={cn(input("open"), "fhint:pr-8!")}
                >
                  <option value="head">
                    {__("Inside <head> (recommended)", "foundhint-local-seo")}
                  </option>
                  <option value="footer">
                    {__("Just before </body>", "foundhint-local-seo")}
                  </option>
                </select>
                <span id={`${ids}-hook-hint`} className={muted}>
                  {__(
                    "Search engines read both. Use the second only if your theme strips extra code from the head.",
                    "foundhint-local-seo",
                  )}
                </span>
              </div>

              <div
                aria-live="polite"
                className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2 fhint:border fhint:border-border fhint:bg-background fhint:px-3 fhint:py-2.5"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "fhint:size-2 fhint:rounded-full",
                    !result
                      ? "fhint:bg-muted-foreground"
                      : result.ok
                        ? "fhint:bg-success"
                        : "fhint:bg-warning-foreground",
                  )}
                />
                <span className="fhint:min-w-0 fhint:flex-1 fhint:text-[13px]">
                  {!result
                    ? __("Not checked yet.", "foundhint-local-seo")
                    : !result.reachable
                      ? __(
                          "Couldn't reach your site from the server to check it.",
                          "foundhint-local-seo",
                        )
                      : result.ok
                        ? sprintf(
                            /* translators: %s: e.g. "5 minutes ago". */
                            __(
                              "Live on your site. Last checked %s.",
                              "foundhint-local-seo",
                            ),
                            relative(result.checked_at),
                          )
                        : sprintf(
                            /* translators: %s: e.g. "5 minutes ago". */
                            __("Checked %s.", "foundhint-local-seo"),
                            relative(result.checked_at),
                          )}
                </span>
                <button
                  type="button"
                  onClick={runCheck}
                  disabled={checkState.isLoading}
                  className={dialogButton}
                >
                  {checkState.isLoading
                    ? __("Checking…", "foundhint-local-seo")
                    : __("Check my site", "foundhint-local-seo")}
                </button>
              </div>
              {result?.reachable && result.missing?.length ? (
                <span className="fhint:text-[12.5px] fhint:font-bold fhint:text-warning-foreground">
                  {sprintf(
                    /* translators: %s: schema types. */
                    __(
                      "Not on your home page yet: %s. A page cache may be serving an old copy — clear it and check again.",
                      "foundhint-local-seo",
                    ),
                    result.missing.join(", "),
                  )}
                </span>
              ) : null}
              {result?.reachable && result.duplicates?.length ? (
                <span className="fhint:text-[12.5px] fhint:font-bold fhint:text-warning-foreground">
                  {sprintf(
                    /* translators: %s: schema types. */
                    __(
                      "Another plugin also prints %s on your home page.",
                      "foundhint-local-seo",
                    ),
                    result.duplicates.join(", "),
                  )}
                </span>
              ) : null}
            </div>

            <div className="fhint:grid fhint:content-start fhint:gap-1.5">
              <span className={label}>
                {__("What gets added", "foundhint-local-seo")}
              </span>
              <pre className="fhint:m-0 fhint:overflow-x-auto fhint:bg-[#1d1b1a] fhint:px-4 fhint:py-3 fhint:font-mono fhint:text-[12px] fhint:leading-relaxed fhint:text-[#cfcaca]">
                {[
                  output.placement === "footer" ? "<body>" : "<head>",
                  `  ${__("…your theme's tags…", "foundhint-local-seo")}`,
                  '  <script type="application/ld+json" id="fhint-schema">',
                  `    ${__("{ one @graph: business, locations, services, website }", "foundhint-local-seo")}`,
                  "  </script>",
                  output.placement === "footer" ? "</body>" : "</head>",
                ].join("\n")}
              </pre>
            </div>
          </div>
        ) : (
          <p className={cn(muted, "fhint:m-0 fhint:px-5 fhint:py-4")}>
            {__(
              "Automatic output is off. Copy each schema from its section and paste it into your pages, or switch this on and FoundHint handles it.",
              "foundhint-local-seo",
            )}
          </p>
        )}
      </section>

      <section className={cn(panel, "fhint:min-w-0")}>
        <PanelHeading
          title={__("What goes where", "foundhint-local-seo")}
          description={__(
            "Every schema on each page, from the pages you picked in each section.",
            "foundhint-local-seo",
          )}
        />
        {map ? (
          <>
            <ul className="fhint:m-0 fhint:list-none fhint:p-0">
              {map.pages.map((page) => (
                <li
                  key={page.id}
                  className="fhint:flex fhint:flex-wrap fhint:items-start fhint:gap-3 fhint:border-b fhint:border-b-border fhint:px-5 fhint:py-3"
                >
                  <span className="fhint:grid fhint:w-[200px] fhint:gap-0.5">
                    <strong className="fhint:text-[13.5px]">
                      {page.title}
                    </strong>
                    <code className="fhint:text-[11.5px] fhint:text-muted-strong">
                      {page.path}
                    </code>
                  </span>
                  <span className="fhint:flex fhint:min-w-0 fhint:flex-1 fhint:flex-wrap fhint:gap-1.5">
                    {page.types.length ? (
                      page.types.map((type) => (
                        <code
                          key={type}
                          className="fhint:bg-muted fhint:px-2 fhint:py-0.5 fhint:text-[12px]"
                        >
                          {type}
                        </code>
                      ))
                    ) : (
                      <span className={muted}>
                        {__("No schema", "foundhint-local-seo")}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {map.others?.count ? (
              <p className={cn(muted, "fhint:m-0 fhint:px-5 fhint:py-3")}>
                {sprintf(
                  /* translators: 1: number of pages, 2: schema types. */
                  _n(
                    "Your other %1$d page gets: %2$s.",
                    "Your other %1$d pages get: %2$s.",
                    map.others.count,
                    "foundhint-local-seo",
                  ),
                  map.others.count,
                  map.others.types.length
                    ? map.others.types.join(", ")
                    : __("no schema", "foundhint-local-seo"),
                )}
              </p>
            ) : null}
          </>
        ) : null}
      </section>

      <section className={cn(panel, "fhint:min-w-0")}>
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-b fhint:border-b-border fhint:px-5 fhint:py-4">
          <span className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:gap-0.5">
            <h2 className="fhint:m-0 fhint:text-[16px] fhint:font-bold">
              {__("Works with your SEO plugin", "foundhint-local-seo")}
            </h2>
            <span className={muted}>
              {__(
                "FoundHint checks for these so your site never shows two copies of the same schema.",
                "foundhint-local-seo",
              )}
            </span>
          </span>
          <span className={cn(BADGE, conflicts.length ? TONES.warn : TONES.ok)}>
            {conflicts.length
              ? sprintf(
                  /* translators: %d: plugins to sort out. */
                  __("%d to sort out", "foundhint-local-seo"),
                  conflicts.length,
                )
              : __("No duplicates", "foundhint-local-seo")}
          </span>
        </div>
        <ul className="fhint:m-0 fhint:list-none fhint:p-0">
          {(output.plugins ?? []).map((plugin) => {
            const [text, tone] = VERDICTS[plugin.verdict] ?? VERDICTS.none;

            return (
              <li
                key={plugin.id}
                className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-b fhint:border-b-border fhint:px-5 fhint:py-3 fhint:last:border-b-0"
              >
                <span className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:gap-0.5">
                  <strong className="fhint:text-[13.5px]">{plugin.name}</strong>
                  <span className={muted}>{pluginNote(plugin)}</span>
                </span>
                <span className={cn(BADGE, TONES[tone])}>{text()}</span>
              </li>
            );
          })}
        </ul>
        {conflicts.some((plugin) => plugin.id === "yoast") ? (
          <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-t fhint:border-t-border fhint:bg-warning-tint fhint:px-5 fhint:py-3 fhint:text-[13px]">
            <span className="fhint:min-w-0 fhint:flex-[1_1_320px]">
              <strong>
                {__(
                  "Yoast SEO also adds business schema.",
                  "foundhint-local-seo",
                )}
              </strong>{" "}
              {__(
                "In WordPress, open Yoast SEO → Settings → Site representation and switch off Local business details. Your other Yoast settings stay as they are.",
                "foundhint-local-seo",
              )}
            </span>
            <button
              type="button"
              onClick={runCheck}
              disabled={checkState.isLoading}
              className={dialogButton}
            >
              {checkState.isLoading
                ? __("Checking…", "foundhint-local-seo")
                : __(
                    "I've switched it off, check again",
                    "foundhint-local-seo",
                  )}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default OutputSettings;
