import { __ } from "@wordpress/i18n";

export const RATINGS = [5, 4, 3, 2, 1];
export const KINDS = [
  ["comment", () => __("With a comment", "foundhint-local-seo")],
  ["stars", () => __("Stars only", "foundhint-local-seo")],
];

/**
 * What a cell can be set to. AI reply is listed but not offered yet.
 *
 * @return {{value: string, label: string, soon?: boolean}[]}
 */
export function sourceItems() {
  return [
    { value: "template", label: __("My templates", "foundhint-local-seo") },
    { value: "ai", label: __("AI reply", "foundhint-local-seo"), soon: true },
    { value: "off", label: __("Don't reply", "foundhint-local-seo") },
  ];
}

/**
 * The draft with one cell changed. Choosing My templates where there is
 * exactly one template picks it; otherwise the owner chooses.
 *
 * @param {Object}   draft     `{ rules, picks, … }`.
 * @param {number}   rating    1–5.
 * @param {string}   kind      comment | stars.
 * @param {Object}   change    `{ source }` and/or `{ pick }`.
 * @param {Object[]} templates That rating and kind's templates.
 * @return {Object}
 */
export function changeCell(draft, rating, kind, change, templates) {
  const source = change.source ?? draft.rules[rating][kind];
  let pick = change.pick ?? draft.picks?.[rating]?.[kind] ?? 0;

  if (change.source === "template" && !pick && templates.length === 1) {
    pick = templates[0].id;
  }

  return {
    ...draft,
    rules: {
      ...draft.rules,
      [rating]: { ...draft.rules[rating], [kind]: source },
    },
    picks: {
      ...draft.picks,
      [rating]: { ...draft.picks?.[rating], [kind]: pick },
    },
  };
}

/**
 * Whether a My templates cell still needs its template chosen (none, or
 * one that is no longer there).
 *
 * @param {Object}   draft     The draft.
 * @param {number}   rating    1–5.
 * @param {string}   kind      comment | stars.
 * @param {Object[]} templates That rating and kind's templates.
 * @return {boolean}
 */
export function needsPick(draft, rating, kind, templates) {
  const pick = draft.picks?.[rating]?.[kind] ?? 0;

  return (
    draft.rules[rating][kind] === "template" &&
    !templates.some((template) => template.id === pick)
  );
}
