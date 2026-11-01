import { cn } from "cn";

/**
 * The one definition of how a text field looks — input, textarea or the
 * select drawn beside one — on every FoundHint screen. Each screen's own
 * style file takes its fields from here rather than spelling the classes
 * out again, so a field changes everywhere at once.
 *
 * WordPress's admin stylesheet fights a field on several fronts, with
 * selectors a plain utility cannot outrank:
 *
 * - padding on url, tel, number, date and time inputs: the padding here is
 *   marked important;
 * - a 1px side margin on every input and select, which made a full-width
 *   field 2px wider than its column: `m-0`;
 * - border colour, radius and shadow: restated for our screen in
 *   `index.css`, which is also why a firmer edge is a class
 *   (`fhint-firm-edge`) rather than a utility.
 *
 * A read-only field turns grey and keeps the plain arrow cursor, so it
 * does not invite typing; it stays focusable, so the keyboard and screen
 * readers can still reach the value and copy it.
 *
 * Every field carries a visible keyboard focus ring.
 */

export const focusRing =
  "fhint:outline-none fhint:focus-visible:ring-2 fhint:focus-visible:ring-ring fhint:focus-visible:ring-offset-1";

const BASE =
  "fhint:m-0 fhint:min-w-0 fhint:border fhint:border-input fhint:bg-card fhint:text-foreground fhint:placeholder:text-muted-foreground fhint:read-only:cursor-default fhint:read-only:bg-muted fhint:read-only:text-muted-strong fhint:aria-invalid:border-destructive";

const SIZES = {
  // Hour pickers, filters: sized by their content, not their column.
  sm: "fhint:px-[7px]! fhint:py-[5px]! fhint:text-[12.5px]",
  // The default field.
  md: "fhint:w-full fhint:px-3! fhint:py-2.5! fhint:text-sm",
  // A dialog with one job, read at arm's length.
  lg: "fhint:w-full fhint:px-4! fhint:py-3! fhint:text-[15px]",
};

// The edge the Reviews and Posts dialogs draw: the theme's pale border all
// but disappears on a white dialog over a dark backdrop.
const FIRM = "fhint:border-[#b9b2af] fhint-firm-edge";

/**
 * The classes for a text field.
 *
 * @param {Object}  [options]
 * @param {string}  [options.size="md"] `sm`, `md` or `lg`.
 * @param {boolean} [options.firm=false] The firmer dialog edge.
 * @return {string} Class names.
 */
export function textInput({ size = "md", firm = false } = {}) {
  return cn(BASE, SIZES[size] ?? SIZES.md, firm && FIRM, focusRing);
}

/**
 * A box of chips with a text input after them — extra categories, places
 * served. The box draws the field's edge and focus ring; the input inside is
 * bare.
 *
 * The box turns grey like any other read-only field (`textInput`) while its
 * input is read-only or disabled: Google not connected, or the list full.
 *
 * The input's background is marked important: WordPress paints every text
 * input white, and a disabled one grey (`#f0f0f0`), which drew a second box
 * inside the first.
 */
export const chipBox = cn(
  "fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-1.5 fhint:border fhint:border-input fhint:bg-card fhint:px-2 fhint:py-1.5",
  // Grey while its input cannot be typed in, as a read-only field is.
  "fhint:has-[input:read-only]:bg-muted",
  "fhint:focus-within:ring-2 fhint:focus-within:ring-ring fhint:focus-within:ring-offset-1",
);

export const chipBoxInput =
  "fhint:m-0 fhint:min-w-0 fhint:flex-1 fhint:border-0! fhint:bg-transparent! fhint:px-1! fhint:py-1! fhint:text-sm fhint:text-foreground fhint:shadow-none! fhint:outline-none fhint:placeholder:text-muted-foreground fhint:disabled:cursor-not-allowed";
