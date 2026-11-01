import { useState } from "react";

const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

/**
 * Unsaved changes to a tab whose fields come from Google and can be
 * overridden for the website.
 *
 * `draft.overrides` holds the website's own values; `draft.reset` the keys
 * whose saved override is to be dropped in favour of Google's value again.
 * Anything else the tab keeps (type, placement…) sits beside them and is
 * merged in with `set()`.
 *
 * `editing` lists the Google fields opened for editing that have no
 * override yet, so a field stays open while it is still empty.
 *
 * @param {Object}   options
 * @param {Object}   options.empty    The clean draft.
 * @param {Object[]} options.fields   The tab's saved fields.
 * @param {Function} [options.onChange] Called before every change (clear a
 *                                    stale save error).
 */
export default function useOverrideDraft({ empty, fields, onChange }) {
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState([]);

  const set = (changes) => {
    onChange?.();
    setDraft((current) => ({ ...current, ...changes }));
  };

  // The value on screen: the draft's own, Google's after a reset, or the
  // saved one.
  const value = (field) => {
    if (has(draft.overrides, field.key)) {
      return draft.overrides[field.key];
    }

    return draft.reset.includes(field.key) ? field.google_value : field.value;
  };

  // A field reset to Google reads as Google's until saved.
  const source = (field) =>
    draft.reset.includes(field.key) ? { ...field, source: "google" } : field;

  const isEditing = (key) => editing.includes(key) || has(draft.overrides, key);

  const edit = (key) => setEditing((current) => [...current, key]);

  const override = (key, next) =>
    set({
      overrides: { ...draft.overrides, [key]: next },
      reset: draft.reset.filter((item) => item !== key),
    });

  // Back to Google's value: drop the draft's own and, when the saved value
  // is an override, ask for that to go too.
  const reset = (key) => {
    const rest = { ...draft.overrides };

    delete rest[key];
    setEditing((current) => current.filter((item) => item !== key));

    const others = draft.reset.filter((item) => item !== key);

    set({
      overrides: rest,
      reset:
        fields.find((field) => field.key === key)?.source === "override"
          ? [...others, key]
          : others,
    });
  };

  const clear = () => {
    setDraft(empty);
    setEditing([]);
  };

  return { draft, set, value, source, isEditing, edit, override, reset, clear };
}
