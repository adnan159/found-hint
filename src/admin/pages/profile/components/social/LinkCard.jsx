import { useId } from "react";
import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { linkState } from "../../model";
import { errorText, input, label, tag, tagTones } from "../../styles";
import { NETWORKS } from "./networks";

// Where a link stands, in words as well as colour.
const STATES = {
  ok: { tone: tagTones.ok, label: () => __("Working", "foundhint-local-seo") },
  bad: {
    tone: tagTones.bad,
    label: () => __("Check link", "foundhint-local-seo"),
  },
  empty: {
    tone: tagTones.quiet,
    label: () => __("Not added", "foundhint-local-seo"),
  },
};
/**
 * One network's link: its tile, its name, whether the link works, and the
 * address itself.
 */
export function LinkCard({ network, value, onChange, error }) {
  const id = useId();
  const meta = NETWORKS[network] ?? {
    name: network,
    short: network.slice(0, 2).toUpperCase(),
    color: "#605d5d",
    placeholder: "https://",
  };
  const state = error ? "bad" : linkState(value);
  const message =
    error ??
    (state === "bad"
      ? __(
          "This needs to be a full web address starting with https://",
          "foundhint-local-seo",
        )
      : "");

  return (
    <div className="fhint:flex fhint:items-start fhint:gap-3 fhint:border fhint:border-[#e6e3e3] fhint:bg-card fhint:p-3.5">
      <span
        aria-hidden="true"
        style={{ color: meta.color, backgroundColor: `${meta.color}1F` }}
        className={cn(
          "fhint:grid fhint:size-[42px] fhint:flex-none fhint:place-items-center fhint:text-[11.5px] fhint:font-extrabold",
          state !== "ok" && "fhint:opacity-60",
        )}
      >
        {meta.short}
      </span>
      <div className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:gap-1.5">
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
          <label htmlFor={id} className={label}>
            {meta.name}
          </label>
          <span className={cn(tag, STATES[state].tone, "fhint:ml-auto")}>
            {STATES[state].label()}
          </span>
        </div>
        <input
          id={id}
          type="url"
          inputMode="url"
          value={value}
          placeholder={meta.placeholder}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={state === "bad" ? true : undefined}
          aria-describedby={message ? `${id}-help` : undefined}
          className={input}
        />
        {message ? (
          <span
            id={`${id}-help`}
            role={error ? "alert" : undefined}
            className={errorText}
          >
            {message}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default LinkCard;
