import { cn } from "cn";
import { input } from "@/pages/profile/styles";

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
  panel,
  panelChip,
  panelHeader,
  panelTitle,
  primaryAction,
} from "@/pages/schema/components/styles";

/**
 * A field in a Reviews dialog: the profile's field, with the brand accent
 * on focus (`fhint-focus-accent` in `index.css`) — the grey edge stays and
 * an orange outline sits just outside it.
 */
export const dialogInput = cn(input, "fhint-focus-accent");

/** A panel's body: the profile section's padding. */
export const panelBody = "fhint:grid fhint:gap-5 fhint:p-5";
