import { useId } from "react";
import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import SocialIcon from "../../../../components/SocialIcon";
import { linkState } from "../../model";
import { errorText, help, input, label, tag, tagTones } from "../../styles";
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
 * One link: its icon, its name, whether it works, and the value itself.
 *
 * A social network's card needs only `network`. The booking cards pass the
 * rest: their own `meta` and `icon`, a `stateOf` rule (a WhatsApp link must
 * go to WhatsApp, a texting number must be international), the message for
 * a bad value, a `note`, and — for the texting number — `children`, a
 * control of their own in place of the address box.
 *
 * @param {Object}   props
 * @param {Function} [props.children] `({ id, invalid, describedBy }) => node`.
 */
export function LinkCard({
  network,
  value,
  onChange,
  error,
  meta: metaProp,
  icon: Icon,
  stateOf = linkState,
  badMessage,
  note,
  children,
}) {
  const id = useId();
  const meta = metaProp ??
    NETWORKS[network] ?? {
      name: network,
      short: network.slice(0, 2).toUpperCase(),
      color: "var(--muted-strong)",
      placeholder: "https://",
    };
  const state = error ? "bad" : stateOf(value);
  const message =
    error ??
    (state === "bad"
      ? (badMessage ??
        __(
          "This needs to be a full web address starting with https://",
          "foundhint-local-seo",
        ))
      : "");
  const iconProps = {
    size: 16,
    style: { color: meta.color },
    className: cn(state !== "ok" && "fhint:opacity-60"),
  };
  const describedBy =
    [message ? `${id}-help` : "", note ? `${id}-note` : ""]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="fhint:border fhint:border-border fhint:bg-card fhint:p-3.5">
      <div className="fhint:grid fhint:min-w-0 fhint:gap-1.5">
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
          <label
            htmlFor={id}
            className={cn(label, "fhint:flex fhint:items-center fhint:gap-2")}
          >
            {Icon ? (
              <Icon aria-hidden="true" {...iconProps} />
            ) : (
              <SocialIcon network={network} short={meta.short} {...iconProps} />
            )}
            {meta.name}
          </label>
          <span className={cn(tag, STATES[state].tone, "fhint:ml-auto")}>
            {STATES[state].label()}
          </span>
        </div>
        {children ? (
          children({ id, invalid: state === "bad", describedBy })
        ) : (
          <input
            id={id}
            type="url"
            inputMode="url"
            value={value}
            placeholder={meta.placeholder}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={state === "bad" ? true : undefined}
            aria-describedby={describedBy}
            className={input}
          />
        )}
        {note ? (
          <span id={`${id}-note`} className={help}>
            {note}
          </span>
        ) : null}
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
