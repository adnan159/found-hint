import { cn } from "cn";
import {
  chip as headerChip,
  primaryButton,
  quietButton,
  tagTones,
} from "@/pages/profile/styles";

/**
 * Shared panel and button styles — the Business Profile's, by construction.
 *
 * Built from the profile's own class strings, imported rather than copied;
 * every colour is a theme token. Change the profile's look and every screen
 * using these follows.
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

/** The bordered secondary button: Stay, Discard, Keep it. The profile's. */
export const dialogButton = cn(
  quietButton,
  "fhint:px-4 fhint:py-[9px] fhint:text-sm",
);

/** The filled main action: Save, Add a service. The profile's. */
export const primaryAction = cn(
  primaryButton,
  "fhint:px-4 fhint:py-[9px] fhint:text-sm",
);
