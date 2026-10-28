import { cn } from "cn";
import { focus } from "@/pages/profile/styles";

/**
 * The Schema Manager's look, taken from the design's own values
 * (docs/schema/schema-design.html): white panels on #e6e3e3 hairlines,
 * #f0eeee inner rules, 13px bold labels, pill badges, orange for the
 * chosen card and the primary action.
 */
export const panel = "fhint:border fhint:border-[#e6e3e3] fhint:bg-card";
export const rule = "fhint:border-b fhint:border-b-[#f0eeee]";
export const sectionPad = "fhint:px-5 fhint:py-4";
export const label = "fhint:text-[13px] fhint:font-bold";
export const groupHead =
  "fhint:text-[11.5px] fhint:font-bold fhint:tracking-[0.06em] fhint:text-[#625e5e] fhint:uppercase";
export const muted = "fhint:text-[12.5px] fhint:text-[#625e5e]";
export const caption = "fhint:font-mono fhint:text-[11px] fhint:text-[#9b9797]";

export const pill =
  "fhint:inline-flex fhint:items-center fhint:rounded-full fhint:px-2 fhint:py-0.5 fhint:text-[11px] fhint:font-bold fhint:whitespace-nowrap";

/** The badges a field can carry (design's REQ table). */
export const BADGES = {
  required: "fhint:bg-[#FBE9E6] fhint:text-[#C02718]",
  storefront: "fhint:bg-[#FBF0DE] fhint:text-[#8a5a00]",
  recommended: "fhint:bg-[#E8F3ED] fhint:text-[#157F4B]",
  optional: "fhint:bg-[#f3f2f2] fhint:text-[#625e5e]",
  fh: "fhint:bg-[#201e1d] fhint:text-white",
  google: "fhint:bg-[#E7EFF6] fhint:text-[#2A5D8F]",
  edited: "fhint:bg-[#FBF0DE] fhint:text-[#8a5a00]",
  scope: "fhint:bg-[#f3f2f2] fhint:text-[#444141]",
};

export const input = (state) =>
  cn(
    "fhint:box-border fhint:w-full fhint:border fhint:px-2.5! fhint:py-[9px]! fhint:text-[13.5px] fhint:leading-snug",
    state === "missing"
      ? "fhint:border-[#C02718]"
      : state === "locked"
        ? "fhint:border-[#e6e3e3] fhint:bg-[#faf9f9] fhint:text-[#444141]"
        : "fhint:border-[#bab6b6] fhint:bg-card fhint:text-[#201e1d]",
    "fhint-firm-edge",
    focus,
  );

/** A radio card — chosen: orange edge on a warm tint. */
export const card = (on) =>
  cn(
    "fhint:flex fhint:cursor-pointer fhint:items-start fhint:gap-2.5 fhint:border fhint:px-[13px] fhint:py-[11px]",
    on
      ? "fhint:border-[#FF6B35] fhint:bg-[#FFF8F4]"
      : "fhint:border-[#e6e3e3] fhint:bg-card",
  );

/** A toggle chip — chosen: dark. */
export const chip = (on) =>
  cn(
    "fhint:cursor-pointer fhint:border fhint:px-3 fhint:py-1.5 fhint:text-[12.5px] fhint:font-bold",
    on
      ? "fhint:border-[#201e1d] fhint:bg-[#201e1d] fhint:text-white"
      : "fhint:border-[#d7d3d3] fhint:bg-card fhint:text-[#201e1d]",
    focus,
  );

export const linkAction = cn(
  "fhint:cursor-pointer fhint:border-0 fhint:bg-transparent fhint:p-0 fhint:text-[12px] fhint:font-bold fhint:text-[#D8521F] fhint:hover:underline",
  focus,
);

export const primary = (enabled) =>
  cn(
    "fhint:inline-flex fhint:items-center fhint:gap-2 fhint:border-0 fhint:px-4 fhint:py-[9px] fhint:text-[13px] fhint:font-bold",
    enabled
      ? "fhint:cursor-pointer fhint:bg-[#FF6B35] fhint:text-white"
      : "fhint:cursor-default fhint:bg-[#e6e3e3] fhint:text-[#9b9797]",
    focus,
  );
