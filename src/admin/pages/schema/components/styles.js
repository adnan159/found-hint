import { cn } from "cn";
import { textInput } from "@/lib/fieldStyles";
import {
  chip as headerChip,
  errorText,
  focus,
  help,
  label as fieldLabel,
  primaryButton,
  quietButton,
  tag,
  tagTones,
} from "@/pages/profile/styles";

/**
 * The Schema Manager's look — the Business Profile's, by construction.
 *
 * Labels, help text, errors, tags and buttons are the profile's own class
 * strings, imported rather than copied; every colour is a theme token
 * (`border`, `muted-strong`, `primary`, `notice`…), never a hex. Change the
 * profile's look and this screen follows.
 *
 * The one deliberate exception is the JSON preview's dark code panel.
 */

/** A white card with a hairline edge: the profile's section card. */
export const panel = "fhint:border fhint:border-border fhint:bg-card";

/** A panel's heading row, closed by the profile's heavier 2px rule. */
export const panelHeader =
  "fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-b-2 fhint:border-b-border fhint:px-[22px] fhint:py-[18px] fhint:text-foreground";

/** A panel's title: the profile section's. */
export const panelTitle =
  "fhint:m-0 fhint:text-base fhint:font-bold fhint:tracking-[-0.01em]";

/** The count or state beside a panel title: "6 of 9 fields from Google". */
export const panelChip = cn(headerChip, tagTones.accent);

export const label = fieldLabel;

/** A group's small uppercase title, over a hairline: "ADDRESS". */
export const groupHead =
  "fhint:text-[11.5px] fhint:font-extrabold fhint:tracking-[0.08em] fhint:text-muted-strong fhint:uppercase";

/** Secondary text: descriptions, counts, notes. The profile's help text. */
export const muted = help;

// WordPress gives every admin `<code>` a 1px side margin, which left the
// caption box narrower than the input above it.
export const caption =
  "fhint:m-0 fhint:font-mono fhint:text-[11px] fhint:text-muted-foreground";

/** An amber note: something will not print as the owner may expect. */
export const warningNote =
  "fhint:mx-5 fhint:mt-0 fhint:mb-3 fhint:text-[12.5px] fhint:font-semibold fhint:text-warning-foreground";

/** A field's error, or the note that it is required and empty. */
export const fieldError = errorText;

/** A field's badge: the profile's small uppercase tag. */
export const pill = cn(
  tag,
  "fhint:inline-flex fhint:items-center fhint:whitespace-nowrap",
);

/** The badges a field can carry (design's REQ table), in the profile's tones. */
export const BADGES = {
  required: tagTones.bad,
  storefront: tagTones.accent,
  recommended: tagTones.ok,
  optional: tagTones.quiet,
  fh: "fhint:bg-foreground fhint:text-background",
  // Google's own blue: the one place a value's source is Google.
  google: "fhint:bg-info-tint fhint:text-info",
  edited: tagTones.accent,
  scope: tagTones.quiet,
};

/**
 * A field, from `lib/fieldStyles` like every other screen's.
 * `missing` turns the border red — the app's invalid rule — while the field
 * has no `aria-invalid` of its own (a select, a picker).
 */
export const input = (state) =>
  cn(
    textInput(),
    state === "locked" && "fhint:bg-muted fhint:text-muted-strong",
    state === "missing" && "fhint:border-destructive",
  );

/** A radio card — chosen: an accent edge on the notice tint. */
export const card = (on) =>
  cn(
    "fhint:flex fhint:cursor-pointer fhint:items-start fhint:gap-2.5 fhint:border fhint:px-[13px] fhint:py-[11px]",
    on
      ? "fhint:border-primary fhint:bg-notice"
      : "fhint:border-border fhint:bg-card",
  );

/** A toggle chip — chosen: dark. */
export const chip = (on) =>
  cn(
    "fhint:cursor-pointer fhint:border fhint:px-3 fhint:py-1.5 fhint:text-[12.5px] fhint:font-bold fhint:disabled:cursor-default fhint:disabled:opacity-60",
    on
      ? "fhint:border-foreground fhint:bg-foreground fhint:text-background"
      : "fhint:border-input fhint:bg-card fhint:text-foreground",
    focus,
  );

/** The bordered secondary button: Stay, Discard, Keep it. The profile's. */
export const dialogButton = cn(
  quietButton,
  "fhint:px-4 fhint:py-[9px] fhint:text-[13px]",
);

/** The filled main action: Save, Add a service. The profile's. */
export const primaryAction = cn(
  primaryButton,
  "fhint:px-4 fhint:py-[9px] fhint:text-[13px]",
);

/** A text-only action beside a field: Edit, Use Google's value. */
export const linkAction = cn(
  "fhint:cursor-pointer fhint:border-0 fhint:bg-transparent fhint:p-0 fhint:text-[12.5px] fhint:font-bold fhint:text-link-accent fhint:hover:underline",
  focus,
);
