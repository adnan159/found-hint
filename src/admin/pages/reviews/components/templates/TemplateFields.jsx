import { useId, useRef } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { errorText, label } from "@/pages/profile/styles";
import { dialogInput } from "../../styles";
import InsertDetail from "./InsertDetail";

/**
 * The template editor's fields: rating, kind, name, reply, and the details
 * to insert where the cursor is. Each field shows the server's message for
 * it, when there is one.
 *
 * @param {Object}   props
 * @param {Object}   props.form     `{ rating, kind, name, text }`.
 * @param {Function} props.setForm  Receives the new form.
 * @param {Object}   props.errors   Messages by field.
 */
export function TemplateFields({ form, setForm, errors = {} }) {
  const id = useId();
  const box = useRef(null);
  const set = (changes) => setForm({ ...form, ...changes });
  const describe = (key) => (errors[key] ? `${id}-${key}-error` : undefined);
  const message = (key) =>
    errors[key] ? (
      <span id={`${id}-${key}-error`} role="alert" className={errorText}>
        {errors[key]}
      </span>
    ) : null;

  const insert = (placeholder) => {
    const node = box.current;
    const start = node?.selectionStart ?? form.text.length;
    const end = node?.selectionEnd ?? form.text.length;

    set({
      text: form.text.slice(0, start) + placeholder + form.text.slice(end),
    });
    window.requestAnimationFrame(() => {
      node?.focus();
      node?.setSelectionRange(
        start + placeholder.length,
        start + placeholder.length,
      );
    });
  };

  return (
    <>
      <div className="fhint:grid fhint:grid-cols-2 fhint:gap-3">
        <span className="fhint:grid fhint:gap-1.5">
          <label htmlFor={`${id}-rating`} className={label}>
            {__("Star rating", "foundhint-local-seo")}
          </label>
          <select
            id={`${id}-rating`}
            value={form.rating}
            aria-describedby={describe("rating")}
            onChange={(event) => set({ rating: Number(event.target.value) })}
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
          {message("rating")}
        </span>
        <span className="fhint:grid fhint:gap-1.5">
          <label htmlFor={`${id}-kind`} className={label}>
            {__("Used for", "foundhint-local-seo")}
          </label>
          <select
            id={`${id}-kind`}
            value={form.kind}
            aria-describedby={describe("kind")}
            onChange={(event) => set({ kind: event.target.value })}
            className={dialogInput}
          >
            <option value="comment">
              {__("Reviews with a comment", "foundhint-local-seo")}
            </option>
            <option value="stars">
              {__("Stars only", "foundhint-local-seo")}
            </option>
          </select>
          {message("kind")}
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
          maxLength={100}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describe("name")}
          onChange={(event) => set({ name: event.target.value })}
          placeholder={__("e.g. Warm thank-you", "foundhint-local-seo")}
          className={dialogInput}
        />
        {message("name")}
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
          maxLength={4096}
          aria-invalid={Boolean(errors.text)}
          aria-describedby={describe("text")}
          value={form.text}
          onChange={(event) => set({ text: event.target.value })}
          className={cn(dialogInput, "fhint:resize-y")}
        />
        {message("text")}
      </span>

      <InsertDetail onInsert={insert} />
    </>
  );
}

export default TemplateFields;
