import { useId, useRef, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import { focus, help, label } from "@/pages/profile/styles";
import { dialogButton, dialogInput, primaryAction } from "../styles";
import { PLACEHOLDERS } from "../lib/replies";
import { TEMPLATE_LIMIT } from "../lib/templates";
import ReviewsDialog from "./ReviewsDialog";
import SoonTag from "./SoonTag";

// A placeholder to insert: a pill that takes the accent on hover.
const insertChip = cn(
  "fhint:group fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-1 fhint:rounded-full fhint:border fhint:border-input fhint:bg-card fhint:px-2.5 fhint:py-1 fhint:font-mono fhint:text-[11.5px] fhint:font-semibold fhint:text-foreground fhint:transition-colors",
  "fhint:hover:border-primary fhint:hover:bg-notice fhint:hover:text-notice-foreground",
  "fhint:active:scale-[0.97]",
  focus,
);

/**
 * Adding or editing a reply template.
 *
 * The form works — choose the rating, name it, write it, insert the
 * placeholders — but saving is FoundHint Pro, so the button says so instead
 * of pretending to store anything.
 */
export function TemplateDialog({ template, rating, count, onClose }) {
  const id = useId();
  const box = useRef(null);
  const [form, setForm] = useState({
    rating: template?.rating ?? rating ?? 5,
    kind: template?.kind ?? "comment",
    name: template?.name ?? "",
    text: template?.text ?? "",
  });

  const insert = (placeholder) => {
    const node = box.current;
    const start = node?.selectionStart ?? form.text.length;
    const end = node?.selectionEnd ?? form.text.length;
    const text = form.text.slice(0, start) + placeholder + form.text.slice(end);

    setForm({ ...form, text });
    window.requestAnimationFrame(() => {
      node?.focus();
      node?.setSelectionRange(
        start + placeholder.length,
        start + placeholder.length,
      );
    });
  };

  return (
    <ReviewsDialog
      title={
        template
          ? __("Edit template", "foundhint-local-seo")
          : __("New reply template", "foundhint-local-seo")
      }
      description={__(
        "Reply templates are part of FoundHint Pro.",
        "foundhint-local-seo",
      )}
      onClose={onClose}
      width="fhint:sm:max-w-[680px]"
      note={sprintf(
        /* translators: 1: templates used, 2: the most allowed, 3: a star rating. */
        __("%1$d of %2$d used for %3$d-star reviews", "foundhint-local-seo"),
        count,
        TEMPLATE_LIMIT,
        Number(form.rating),
      )}
      footer={
        <>
          <button type="button" onClick={onClose} className={dialogButton}>
            {__("Cancel", "foundhint-local-seo")}
          </button>
          <button
            type="button"
            disabled
            title={__(
              "Saving templates is part of FoundHint Pro.",
              "foundhint-local-seo",
            )}
            className={primaryAction}
          >
            {__("Save template", "foundhint-local-seo")}
          </button>
        </>
      }
    >
      <p className="fhint:m-0 fhint:flex fhint:items-center fhint:gap-2 fhint:text-[12.5px] fhint:text-muted-strong">
        <SoonTag kind="pro" />
        {__(
          "Saving your own templates comes with FoundHint Pro.",
          "foundhint-local-seo",
        )}
      </p>

      <div className="fhint:grid fhint:grid-cols-2 fhint:gap-3">
        <span className="fhint:grid fhint:gap-1.5">
          <label htmlFor={`${id}-rating`} className={label}>
            {__("Star rating", "foundhint-local-seo")}
          </label>
          <select
            id={`${id}-rating`}
            value={form.rating}
            onChange={(event) =>
              setForm({ ...form, rating: Number(event.target.value) })
            }
            className={dialogInput}
          >
            {[5, 4, 3, 2, 1].map((stars) => (
              <option key={stars} value={stars}>
                {sprintf(
                  /* translators: %d: a star rating from 1 to 5. */
                  __("%d stars", "foundhint-local-seo"),
                  stars,
                )}
              </option>
            ))}
          </select>
        </span>
        <span className="fhint:grid fhint:gap-1.5">
          <label htmlFor={`${id}-kind`} className={label}>
            {__("Used for", "foundhint-local-seo")}
          </label>
          <select
            id={`${id}-kind`}
            value={form.kind}
            onChange={(event) => setForm({ ...form, kind: event.target.value })}
            className={dialogInput}
          >
            <option value="comment">
              {__("Reviews with a comment", "foundhint-local-seo")}
            </option>
            <option value="stars">
              {__("Stars only", "foundhint-local-seo")}
            </option>
          </select>
        </span>
      </div>

      <span className="fhint:grid fhint:gap-1.5">
        <label htmlFor={`${id}-name`} className={label}>
          {__("Name", "foundhint-local-seo")} <span aria-hidden="true">*</span>
        </label>
        <input
          id={`${id}-name`}
          value={form.name}
          required
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder={__("e.g. Warm thank-you", "foundhint-local-seo")}
          className={dialogInput}
        />
      </span>

      <span className="fhint:grid fhint:gap-1.5">
        <label htmlFor={`${id}-text`} className={label}>
          {__("Reply", "foundhint-local-seo")} <span aria-hidden="true">*</span>
        </label>
        <textarea
          id={`${id}-text`}
          ref={box}
          rows={4}
          required
          value={form.text}
          onChange={(event) => setForm({ ...form, text: event.target.value })}
          className={cn(dialogInput, "fhint:resize-y")}
        />
      </span>

      <div
        role="group"
        aria-labelledby={`${id}-insert`}
        aria-describedby={`${id}-insert-help`}
        className="fhint:grid fhint:gap-2.5 fhint:bg-[#faf6f4] fhint:px-4 fhint:py-3.5"
      >
        <div className="fhint:flex fhint:flex-wrap fhint:items-baseline fhint:gap-x-2 fhint:gap-y-0.5">
          <span id={`${id}-insert`} className={label}>
            {__("Insert a detail", "foundhint-local-seo")}
          </span>
          <span id={`${id}-insert-help`} className={help}>
            {__(
              "Added where the cursor is, and swapped for the real details when you reply.",
              "foundhint-local-seo",
            )}
          </span>
        </div>
        <div className="fhint:flex fhint:flex-wrap fhint:gap-2">
          {PLACEHOLDERS.map((placeholder) => (
            <button
              key={placeholder}
              type="button"
              onClick={() => insert(placeholder)}
              className={insertChip}
            >
              <PlusIcon
                aria-hidden="true"
                className="fhint:size-3 fhint:text-muted-strong fhint:transition-colors fhint:group-hover:text-primary"
              />
              {placeholder}
            </button>
          ))}
        </div>
      </div>
    </ReviewsDialog>
  );
}

export default TemplateDialog;
