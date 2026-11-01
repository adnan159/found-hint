import { useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import {
  MessageSquareTextIcon,
  PlusIcon,
  StarIcon,
  UploadIcon,
} from "lucide-react";
import { cn } from "cn";
import { focus, help, linkButton, tag, tagTones } from "@/pages/profile/styles";
import { sampleTemplates } from "../lib/templates";
import SoonTag from "./SoonTag";
import Panel from "@/components/Panel";
import TemplateDialog from "./TemplateDialog";

/**
 * Reply templates, one set per star rating, in the sidebar.
 *
 * Drawn as it will work — star tabs with counts, each template with its
 * kind and an Edit link, "Add a template" and "Import from CSV" — with
 * sample templates in it. Writing your own is FoundHint Pro, which the card
 * says at the top; the editor opens as a preview.
 */
export function TemplatesCard() {
  const templates = sampleTemplates();
  // "all", or a star rating from 1 to 5.
  const [rating, setRating] = useState("all");
  const [editing, setEditing] = useState(null);
  const shown =
    rating === "all"
      ? templates
      : templates.filter((template) => template.rating === rating);
  // A new template starts at the chosen rating, or 5 stars under All.
  const newRating = rating === "all" ? 5 : rating;
  const countFor = (stars) =>
    templates.filter((template) => template.rating === stars).length;

  return (
    <Panel
      icon={MessageSquareTextIcon}
      title={__("Reply templates", "foundhint-local-seo")}
      after={<SoonTag kind="pro" />}
      description={__(
        "Ready-made replies for each star rating.",
        "foundhint-local-seo",
      )}
      bodyClassName="fhint:gap-3"
    >
      <div
        role="tablist"
        aria-label={__("Star rating", "foundhint-local-seo")}
        // One row at any width: equal columns over a hairline, the chosen
        // one underlined in the accent.
        className="fhint:grid fhint:grid-cols-6 fhint:border-b fhint:border-b-border"
      >
        {["all", 1, 2, 3, 4, 5].map((stars) => (
          <button
            key={stars}
            type="button"
            role="tab"
            aria-selected={rating === stars}
            aria-label={
              stars === "all"
                ? __("All ratings", "foundhint-local-seo")
                : sprintf(
                    /* translators: %d: a star rating from 1 to 5. */
                    __("%d stars", "foundhint-local-seo"),
                    stars,
                  )
            }
            onClick={() => setRating(stars)}
            className={cn(
              "fhint:-mb-px fhint:inline-flex fhint:min-w-0 fhint:cursor-pointer fhint:items-center fhint:justify-center fhint:gap-1 fhint:border-0 fhint:border-b-2 fhint:leading-none fhint:bg-transparent fhint:px-1 fhint:pt-1 fhint:pb-2 fhint:text-[12.5px] fhint:font-extrabold fhint:whitespace-nowrap fhint:transition-colors",
              rating === stars
                ? "fhint:border-b-primary fhint:text-foreground"
                : "fhint:border-b-transparent fhint:text-muted-strong fhint:hover:border-b-border fhint:hover:text-foreground",
              focus,
            )}
          >
            {stars === "all" ? (
              __("All", "foundhint-local-seo")
            ) : (
              <>
                {stars}
                <StarIcon
                  aria-hidden="true"
                  className="fhint:-mt-0.5 fhint:size-3 fhint:flex-none fhint:fill-[#C27A1B] fhint:text-[#C27A1B]"
                />
              </>
            )}
          </button>
        ))}
      </div>

      <p aria-live="polite" className={cn(help, "fhint:m-0")}>
        {rating === "all"
          ? sprintf(
              /* translators: %d: number of reply templates. */
              _n(
                "All ratings have %d template.",
                "All ratings have %d templates.",
                shown.length,
                "foundhint-local-seo",
              ),
              shown.length,
            )
          : sprintf(
              /* translators: 1: a star rating from 1 to 5, 2: number of reply templates. */
              _n(
                "%1$d-star reviews have %2$d template.",
                "%1$d-star reviews have %2$d templates.",
                shown.length,
                "foundhint-local-seo",
              ),
              rating,
              shown.length,
            )}
      </p>

      <ul
        role="tabpanel"
        className="fhint:m-0 fhint:grid fhint:list-none fhint:gap-2 fhint:p-0"
      >
        {shown.map((template) => (
          <li
            key={template.id}
            className="fhint:grid fhint:gap-1 fhint:border fhint:border-border fhint:px-3 fhint:py-2.5"
          >
            <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
              <strong className="fhint:text-[13px]">{template.name}</strong>
              <span
                className={cn(
                  tag,
                  tagTones.quiet,
                  "fhint:border fhint:border-border",
                )}
              >
                {template.kind === "comment"
                  ? __("With comment", "foundhint-local-seo")
                  : __("Stars only", "foundhint-local-seo")}
              </span>
              <button
                type="button"
                onClick={() => setEditing(template)}
                className={cn(linkButton, "fhint:ml-auto")}
              >
                {__("Edit", "foundhint-local-seo")}
                <span className="fhint:sr-only"> {template.name}</span>
              </button>
            </span>
            {/* Which rating it answers: that many stars, and the number in
                words for screen readers. */}
            {template.rating ? (
              <span className="fhint:-mt-1 fhint:mb-2 fhint:inline-flex fhint:items-center fhint:gap-0.5">
                {Array.from({ length: template.rating }, (_, index) => (
                  <StarIcon
                    key={index}
                    aria-hidden="true"
                    className="fhint:size-3 fhint:flex-none fhint:fill-[#C27A1B] fhint:text-[#C27A1B]"
                  />
                ))}
                <span className="fhint:sr-only">
                  {sprintf(
                    /* translators: %d: a star rating from 1 to 5. */
                    _n(
                      "For %d-star reviews",
                      "For %d-star reviews",
                      template.rating,
                      "foundhint-local-seo",
                    ),
                    template.rating,
                  )}
                </span>
              </span>
            ) : null}
            <span className="fhint:line-clamp-3 fhint:text-[12.5px] fhint:leading-snug fhint:text-muted-strong">
              {template.text}
            </span>
          </li>
        ))}
        {shown.length ? null : (
          <li className={help}>
            {sprintf(
              /* translators: %d: a star rating from 1 to 5. */
              __(
                "No templates for %d-star reviews yet.",
                "foundhint-local-seo",
              ),
              newRating,
            )}
          </li>
        )}
      </ul>

      <button
        type="button"
        onClick={() => setEditing("new")}
        className={cn(
          "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-2 fhint:border fhint:border-dashed fhint:border-input fhint:bg-card fhint:px-3 fhint:py-2 fhint:text-[12.5px] fhint:font-extrabold fhint:hover:bg-muted",
          focus,
        )}
      >
        <PlusIcon aria-hidden="true" className="fhint:size-3.5" />
        {__("Add a template", "foundhint-local-seo")}
      </button>
      <button
        type="button"
        disabled
        title={__(
          "Importing templates is part of FoundHint Pro.",
          "foundhint-local-seo",
        )}
        className="fhint:inline-flex fhint:cursor-not-allowed fhint:items-center fhint:gap-2 fhint:border fhint:border-dashed fhint:border-input fhint:bg-card fhint:px-3 fhint:py-2 fhint:text-[12.5px] fhint:font-extrabold fhint:text-muted-foreground"
      >
        <UploadIcon aria-hidden="true" className="fhint:size-3.5" />
        {__("Import from CSV", "foundhint-local-seo")}
      </button>

      <p className={cn(help, "fhint:m-0")}>
        {__(
          "Templates belong to this location. Words in curly brackets are swapped for real details when you reply.",
          "foundhint-local-seo",
        )}
      </p>

      {editing ? (
        <TemplateDialog
          template={editing === "new" ? null : editing}
          rating={newRating}
          count={countFor(editing === "new" ? newRating : editing.rating)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Panel>
  );
}

export default TemplatesCard;
