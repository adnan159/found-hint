import { cn } from "cn";
import { focus } from "@/pages/profile/styles";

/**
 * The Posts dialogs' look — the Reviews dialogs' and the Business Profile's,
 * by construction: fields, buttons and the main action are imported, never
 * spelled out again here. Change the profile's look and this screen follows.
 */
export {
  dialogButton,
  dialogInput,
  primaryAction,
} from "@/pages/reviews/styles";

/**
 * One option in a row of choices — how to write, when to publish. The
 * profile's opening-hours choice: the chosen one takes the accent tint.
 */
export const choice = (on) =>
  cn(
    "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:justify-center fhint:gap-1.5 fhint:border fhint:px-3 fhint:py-1.5 fhint:text-sm fhint:disabled:cursor-not-allowed fhint:disabled:text-muted-foreground",
    on
      ? "fhint:border-primary fhint:bg-notice fhint:font-extrabold fhint:text-notice-foreground"
      : "fhint:border-border fhint:bg-card fhint:font-semibold fhint:text-foreground-soft",
    focus,
  );
