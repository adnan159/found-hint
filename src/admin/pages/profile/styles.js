/**
 * Class strings shared by the profile's sections.
 *
 * Measured from the design: 13px bold labels, 12.5px help text, square
 * corners throughout. Kept here so seven sections read as one screen.
 *
 * The fields themselves come from `lib/fieldStyles` — the one definition of
 * a text field for every screen.
 *
 * Every interactive class carries a visible focus state — the design shows
 * none because it was never tabbed through.
 */

import { focusRing, textInput } from "@/lib/fieldStyles";

const FOCUS = focusRing;

export const label = "fhint:text-[13px] fhint:font-bold";

export const help =
  "fhint:text-[12.5px] fhint:leading-normal fhint:text-muted-strong";

export const errorText =
  "fhint:text-[12.5px] fhint:font-semibold fhint:text-destructive";

export const input = textInput();

export const smallInput = textInput({ size: "sm" });

// The bordered white button used for secondary actions inside a section.
export const quietButton = `fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-1.5 fhint:border fhint:border-input fhint:bg-card fhint:px-[11px] fhint:py-[7px] fhint:text-[12.5px] fhint:font-extrabold fhint:text-foreground fhint:no-underline fhint:disabled:cursor-not-allowed fhint:disabled:text-muted-foreground ${FOCUS}`;

export const primaryButton = `fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-1.5 fhint:border-0 fhint:bg-primary fhint:px-[13px] fhint:py-2 fhint:text-[12.5px] fhint:font-extrabold fhint:text-primary-foreground fhint:disabled:cursor-not-allowed fhint:disabled:bg-border fhint:disabled:text-muted-foreground ${FOCUS}`;

export const linkButton = `fhint:cursor-pointer fhint:border-0 fhint:bg-transparent fhint:p-0 fhint:text-[12.5px] fhint:font-extrabold fhint:text-foreground fhint:underline ${FOCUS}`;

// The small uppercase tag beside a title or a name.
export const tag =
  "fhint:px-1.5 fhint:py-0.5 fhint:text-[10px] fhint:font-extrabold fhint:tracking-[0.07em] fhint:uppercase";

export const tagTones = {
  ok: "fhint:bg-success-tint fhint:text-success",
  bad: "fhint:bg-destructive-tint fhint:text-destructive",
  quiet: "fhint:bg-background fhint:text-muted-strong",
  accent: "fhint:bg-notice fhint:text-notice-foreground",
};

// The pill beside a section title: "6 DAYS OPEN", "3 OF 5 USED".
export const chip =
  "fhint:px-[7px] fhint:py-[3px] fhint:text-[11.5px] fhint:font-extrabold fhint:tracking-[0.06em] fhint:uppercase";

export const focus = FOCUS;

/*
 * The same buttons, for a link. WordPress colours every admin link blue on
 * hover, press and focus with `a:hover` / `a:focus`, which outrank a plain
 * colour utility; the link's own colour is marked important to keep it.
 */
export const quietLink = `${quietButton} fhint:text-foreground!`;

export const primaryLink = `${primaryButton} fhint:text-primary-foreground! fhint:no-underline`;
