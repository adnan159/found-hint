import { __, sprintf } from "@wordpress/i18n";
import { Switch } from "@/components/ui/switch";
import { muted } from "../styles";

/**
 * Whether this branch's schema prints, and why it would not: closed for
 * good, switched off, or missing what Google needs.
 */
export function BranchPrintSwitch({
  status,
  closed,
  missing,
  locked,
  onChange,
}) {
  const off = status === "inactive";

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-b fhint:border-b-border fhint:px-5 fhint:py-3">
      <label className="fhint:flex fhint:items-center fhint:gap-2.5 fhint:text-[13px] fhint:font-bold">
        <Switch
          checked={!off}
          disabled={locked || closed}
          onCheckedChange={(on) => onChange(on ? "active" : "inactive")}
        />
        {__("Print this branch's schema", "foundhint-local-seo")}
      </label>
      <span className={muted}>
        {closed
          ? __(
              "This location is marked permanently closed on your profile, so nothing is printed for it.",
              "foundhint-local-seo",
            )
          : off
            ? __(
                "Off: its details are kept, and nothing is printed.",
                "foundhint-local-seo",
              )
            : missing.length
              ? sprintf(
                  /* translators: %s: missing fields. */
                  __(
                    "Can't publish yet. Google needs: %s.",
                    "foundhint-local-seo",
                  ),
                  missing.join(", "),
                )
              : __(
                  "Has the details Google needs for this branch.",
                  "foundhint-local-seo",
                )}
      </span>
    </div>
  );
}

export default BranchPrintSwitch;
