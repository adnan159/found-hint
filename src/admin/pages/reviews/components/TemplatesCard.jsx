import { useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { PlusIcon, UploadIcon } from "lucide-react";
import { cn } from "cn";
import { focus, help, linkButton, tag, tagTones } from "@/pages/profile/styles";
import { sampleTemplates } from "../lib/templates";
import SoonTag from "./SoonTag";
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
  const [rating, setRating] = useState(5);
  const [editing, setEditing] = useState(null);
  const shown = templates.filter((template) => template.rating === rating);
  const countFor = (stars) =>
    templates.filter((template) => template.rating === stars).length;

  return (
    <section
      aria-labelledby="fhint-reply-templates"
      className="fhint:grid fhint:gap-3 fhint:border fhint:border-border fhint:bg-card fhint:p-4"
    >
      <div className="fhint:grid fhint:gap-0.5">
        <span className="fhint:flex fhint:items-center fhint:gap-2">
          <h2
            id="fhint-reply-templates"
            className="fhint:m-0 fhint:text-[14px] fhint:font-extrabold"
          >
            {__("Reply templates", "foundhint-local-seo")}
          </h2>
          <SoonTag kind="pro" />
        </span>
        <span className={help}>
          {__(
            "Ready-made replies for each star rating.",
            "foundhint-local-seo",
          )}
        </span>
      </div>

      <div
        role="tablist"
        aria-label={__("Star rating", "foundhint-local-seo")}
        className="fhint:flex fhint:flex-wrap fhint:gap-1.5"
      >
        {[1, 2, 3, 4, 5].map((stars) => (
          <button
            key={stars}
            type="button"
            role="tab"
            aria-selected={rating === stars}
            onClick={() => setRating(stars)}
            className={cn(
              "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-1.5 fhint:border fhint:px-2 fhint:py-1 fhint:text-[12.5px] fhint:font-extrabold",
              rating === stars
                ? "fhint:border-primary fhint:bg-notice fhint:text-notice-foreground"
                : "fhint:border-border fhint:bg-card fhint:text-foreground",
              focus,
            )}
          >
            <span aria-hidden="true" className="fhint:text-[#C27A1B]">
              ★
            </span>
            {stars}
            <span
              className={cn(
                tag,
                rating === stars
                  ? "fhint:bg-primary fhint:text-primary-foreground"
                  : tagTones.quiet,
              )}
            >
              {countFor(stars)}
            </span>
          </button>
        ))}
      </div>

      <ul
        role="tabpanel"
        className="fhint:m-0 fhint:grid fhint:list-none fhint:gap-2 fhint:p-0"
      >
        {shown.map((template) => (
          <li
            key={template.id}
            className="fhint:grid fhint:gap-1 fhint:border fhint:border-border fhint:px-3 fhint:py-2.5"
          >
            <span className="fhint:flex fhint:items-center fhint:gap-2">
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
              rating,
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
          rating={rating}
          count={countFor(editing === "new" ? rating : editing.rating)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </section>
  );
}

export default TemplatesCard;
