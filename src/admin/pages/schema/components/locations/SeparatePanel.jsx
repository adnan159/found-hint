import { useEffect, useRef } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { ChevronLeftIcon, CopyIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { useGetSeparateSchemaQuery } from "@/store/api/schemaManagerApi";
import { BADGE, TONES } from "../../lib/locations";
import JsonPreview from "../shared/JsonPreview";
import { focusRing as focus } from "@/lib/fieldStyles";
import { groupHead, panel, panelTitle } from "../styles";

const TITLE_ID = "fhint-schema-separate-title";

/**
 * A separate business (design B): its Google profile links to a website of
 * its own, so its schema belongs on that site — FoundHint publishes nothing
 * for it here. Opened from the Locations list like a branch: its details and
 * actions on the left, its schema in the preview beside them.
 *
 * @param {Object}   props
 * @param {Object}   props.row             Its row in the Locations list.
 * @param {Function} props.onBack          Back to all locations.
 * @param {Function} props.onTreatAsBranch Make it a branch.
 */
export function SeparatePanel({ row, onBack, onTreatAsBranch }) {
  const { data: document, isLoading } = useGetSeparateSchemaQuery(row.id);
  const here = window.location.hostname;
  const heading = useRef(null);

  // A new view: take the reader (and focus) to its heading.
  useEffect(() => {
    heading.current?.focus();
    heading.current?.scrollIntoView?.({ block: "nearest" });
  }, [row.id]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `<script type="application/ld+json">\n${JSON.stringify(document, null, 2)}\n</script>`,
      );
      toast.success(__("Schema copied.", "foundhint-local-seo"));
    } catch {
      toast.error(
        __("Could not copy. Select the text instead.", "foundhint-local-seo"),
      );
    }
  };

  const steps = [
    __("Copy its schema with the button below.", "foundhint-local-seo"),
    sprintf(
      /* translators: %s: a website domain. */
      __(
        "Paste it into the <head> of %s, or install FoundHint on that site.",
        "foundhint-local-seo",
      ),
      row.domain,
    ),
    __(
      "Test that page with Google's Rich Results Test.",
      "foundhint-local-seo",
    ),
  ];

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-start fhint:gap-4">
      <section
        aria-labelledby={TITLE_ID}
        className={cn(panel, "fhint:min-w-0 fhint:flex-[1_1_580px]")}
      >
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2.5 fhint:border-b fhint:border-b-[#f0eeee] fhint:bg-[#faf9f9] fhint:px-5 fhint:py-2.5">
          <button
            type="button"
            onClick={onBack}
            className={cn(
              "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-1.5 fhint:border-0 fhint:bg-transparent fhint:p-0 fhint:text-[13px] fhint:font-bold fhint:text-[#201e1d]",
              focus,
            )}
          >
            <ChevronLeftIcon aria-hidden="true" className="fhint:size-4" />
            {__("All locations", "foundhint-local-seo")}
          </button>
          <span aria-hidden="true" className="fhint:text-[#bab6b6]">
            /
          </span>
          <span className="fhint:text-[13px] fhint:text-[#625e5e]">
            {row.name}
          </span>
          <span className="fhint:ml-auto fhint:flex fhint:items-center fhint:gap-1.5">
            <span className={cn(BADGE, TONES.separate)}>
              {__("Separate", "foundhint-local-seo")}
            </span>
            <span className={cn(BADGE, TONES.quiet)}>
              {__("Not on this site", "foundhint-local-seo")}
            </span>
          </span>
        </div>

        <div className="fhint:grid fhint:gap-1 fhint:border-b fhint:border-b-[#e6e3e3] fhint:px-5 fhint:py-4">
          <h2
            id={TITLE_ID}
            ref={heading}
            tabIndex={-1}
            className={cn(panelTitle, "fhint:outline-none")}
          >
            {row.name}
          </h2>
          {row.address ? (
            <span className="fhint:text-[13px] fhint:text-[#625e5e]">
              {row.address}
            </span>
          ) : null}
        </div>

        <div className="fhint:grid fhint:gap-4 fhint:px-5 fhint:py-[18px]">
          <div
            role="note"
            className="fhint:flex fhint:items-start fhint:gap-3 fhint:border fhint:border-[#F1D7A8] fhint:bg-[#FFF8EC] fhint:px-4 fhint:py-3.5"
          >
            <TriangleAlertIcon
              aria-hidden="true"
              className="fhint:mt-0.5 fhint:size-[18px] fhint:shrink-0 fhint:text-[#C27A00]"
            />
            <span className="fhint:grid fhint:min-w-0 fhint:gap-1 fhint:text-[13.5px] fhint:leading-normal">
              <strong>
                {sprintf(
                  /* translators: %s: a website domain. */
                  __(
                    "This profile's website is %s. Its schema should be published on that site.",
                    "foundhint-local-seo",
                  ),
                  row.domain,
                )}
              </strong>
              <span className="fhint:text-[#444141]">
                {sprintf(
                  /* translators: 1: this site, 2: the profile, 3: its domain. */
                  __(
                    "FoundHint only adds schema to %1$s, so nothing for %2$s is published here. Copy its schema to %3$s, or install FoundHint on that site.",
                    "foundhint-local-seo",
                  ),
                  here,
                  row.name,
                  row.domain,
                )}
              </span>
            </span>
          </div>

          <div className="fhint:grid fhint:gap-2">
            <h3 className={cn(groupHead, "fhint:m-0")}>
              {__("Publish it on its own website", "foundhint-local-seo")}
            </h3>
            <ol className="fhint:m-0 fhint:grid fhint:list-none fhint:gap-2 fhint:p-0">
              {steps.map((text, index) => (
                <li
                  key={index}
                  className="fhint:flex fhint:items-start fhint:gap-2.5 fhint:text-[13.5px] fhint:leading-normal"
                >
                  <span
                    aria-hidden="true"
                    className="fhint:grid fhint:size-[22px] fhint:shrink-0 fhint:place-items-center fhint:rounded-full fhint:bg-[#f3f2f2] fhint:text-[12px] fhint:font-bold"
                  >
                    {index + 1}
                  </span>
                  {text}
                </li>
              ))}
            </ol>
          </div>

          <div className="fhint:flex fhint:flex-wrap fhint:gap-2.5">
            <button
              type="button"
              onClick={copy}
              disabled={!document}
              className={cn(
                "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-[7px] fhint:border-0 fhint:bg-[#FF6B35] fhint:px-[15px] fhint:py-[9px] fhint:text-[13px] fhint:font-bold fhint:text-white fhint:hover:bg-[#E85A25] fhint:disabled:opacity-50",
                focus,
              )}
            >
              <CopyIcon aria-hidden="true" className="fhint:size-3.5" />
              {__("Copy schema", "foundhint-local-seo")}
            </button>
            <button
              type="button"
              onClick={onTreatAsBranch}
              className={cn(
                "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-[7px] fhint:border fhint:border-[#d7d3d3] fhint:bg-white fhint:px-[15px] fhint:py-[9px] fhint:text-[13px] fhint:font-bold fhint:text-[#201e1d] fhint:hover:bg-[#f8f4f4]",
                focus,
              )}
            >
              <TriangleAlertIcon
                aria-hidden="true"
                className="fhint:size-3.5 fhint:text-[#C27A00]"
              />
              {__("Treat as a branch anyway", "foundhint-local-seo")}
            </button>
          </div>
        </div>
      </section>

      <JsonPreview
        document={document}
        rootType={document?.["@type"] ?? ""}
        live={false}
        loading={isLoading}
        dirty={false}
        outputsOn={{
          text: sprintf(
            /* translators: %s: a website domain. */
            __("not this site. Copy it to %s.", "foundhint-local-seo"),
            row.domain,
          ),
          ok: false,
        }}
      />
    </div>
  );
}

export default SeparatePanel;
