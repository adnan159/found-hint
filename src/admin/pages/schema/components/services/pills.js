/**
 * The Services tab's tags, as the design draws them: small, bold, fully
 * rounded, in mixed case. Words carry the meaning; colour only repeats it.
 */

/** A field's tag: Required, From Google, Optional (11px). */
export const FIELD_PILL =
  "fhint:inline-flex fhint:items-center fhint:rounded-full fhint:px-2 fhint:py-0.5 fhint:text-[11px] fhint:leading-[1.35] fhint:font-bold fhint:whitespace-nowrap";

/** A list row's tag: From Google, "2 to check" (10.5px). */
export const ROW_PILL =
  "fhint:inline-flex fhint:items-center fhint:rounded-full fhint:px-[7px] fhint:py-px fhint:text-[10.5px] fhint:leading-[1.4] fhint:font-bold fhint:whitespace-nowrap";

export const PILL_TONES = {
  required: "fhint:bg-[#201e1d] fhint:text-white",
  google: "fhint:bg-[#E7EFF6] fhint:text-[#2A5D8F]",
  optional: "fhint:bg-[#f3f2f2] fhint:text-[#625e5e]",
  warn: "fhint:bg-[#FBF0DE] fhint:text-[#8a5a00]",
};
