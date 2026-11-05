import { cn } from "cn";
import { focus, input } from "@/pages/profile/styles";

/**
 * The Reviews screen's look — the Business Profile's and the Schema
 * Manager's, by construction.
 *
 * Panels, their heading rows, fields and dialog buttons are imported from
 * the Schema Manager's styles (which take them from the profile), never
 * spelled out again here. Change the profile's look and this screen follows.
 */
export {
  dialogButton,
  panelTitle,
  primaryAction,
} from "@/pages/schema/components/styles";

/**
 * A field in a Reviews dialog: the profile's field, with the brand accent
 * on focus (`fhint-focus-accent` in `index.css`) — the grey edge stays and
 * an orange outline sits just outside it.
 */
export const dialogInput = cn(input, "fhint-focus-accent");

/**
 * A small square icon button: Edit and Delete beside a review's reply and
 * beside a post. The icon is the label's picture; each button carries its
 * words for screen readers.
 */
export const iconButton = cn(
  "fhint:grid fhint:size-7 fhint:cursor-pointer fhint:place-items-center fhint:border fhint:border-border fhint:bg-card fhint:text-muted-strong fhint:hover:text-foreground fhint:disabled:cursor-not-allowed",
  focus,
);
