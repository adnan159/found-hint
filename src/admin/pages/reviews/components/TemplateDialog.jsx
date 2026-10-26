import { useId, useRef, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { label, primaryButton } from "@/pages/profile/styles";
import { dialogButton, dialogInput, dialogSmallInput } from "../styles";
import { PLACEHOLDERS } from "../lib/replies";
import { TEMPLATE_LIMIT } from "../lib/templates";
import ReviewsDialog from "./ReviewsDialog";
import SoonTag from "./SoonTag";

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
            className={primaryButton}
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

      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-1.5">
        <span className={cn(label, "fhint:mr-1")}>
          {__("Insert", "foundhint-local-seo")}
        </span>
        {PLACEHOLDERS.map((placeholder) => (
          <button
            key={placeholder}
            type="button"
            onClick={() => insert(placeholder)}
            className={cn(
              dialogSmallInput,
              "fhint:cursor-pointer fhint:font-mono fhint:text-[11.5px] fhint:font-bold fhint:hover:bg-muted",
            )}
          >
            {placeholder}
          </button>
        ))}
      </div>
    </ReviewsDialog>
  );
}

export default TemplateDialog;
