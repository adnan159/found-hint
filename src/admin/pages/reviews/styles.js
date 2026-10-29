import { cn } from "cn";
import { textInput } from "@/lib/fieldStyles";
import { quietButton } from "@/pages/profile/styles";

/**
 * Borders for buttons inside the Reviews dialogs; fields take the same
 * firm edge from `lib/fieldStyles`.
 *
 * The theme's own border colour is a very pale grey; on a white dialog over
 * a dark backdrop it nearly disappears, and buttons stop reading as buttons.
 * The design draws these edges firmly, so they are set here — for the
 * dialogs only, leaving every other screen as it is. A disabled button
 * keeps a lighter edge, so it still reads as not available.
 */
const EDGE = "fhint:border-[#b9b2af]";

// Swapped, not added: with both border colours on an element, whichever the
// stylesheet happens to list later wins, and the theme's pale one is later.
const firm = (classes) => classes.replace("fhint:border-input", EDGE);

export const dialogButton = cn(
  firm(quietButton),
  "fhint:hover:bg-muted fhint:disabled:border-[#e2dcda] fhint:disabled:hover:bg-card",
);

export const dialogInput = textInput({ firm: true });

export const dialogSmallInput = textInput({ size: "sm", firm: true });
