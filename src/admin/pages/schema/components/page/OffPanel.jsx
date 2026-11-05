import { useEffect, useRef } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { Building2Icon, PowerIcon } from "lucide-react";
import { cn } from "cn";
import {
  BADGES,
  linkAction,
  muted,
  panel,
  pill,
  primaryAction,
} from "../styles";

/** Each switched tab, in the words of its off state. */
const COPY = {
  organization: {
    title: () => __("Organization schema is off", "foundhint-local-seo"),
    body: () =>
      __(
        "Turn it on to describe your brand: its name, logo, contact details and profiles.",
        "foundhint-local-seo",
      ),
    action: () => __("Turn on organization schema", "foundhint-local-seo"),
  },
  localbusiness: {
    title: () => __("Main business schema is off", "foundhint-local-seo"),
    body: () =>
      __(
        "Turn it on to choose your main business and publish its address, opening hours and category.",
        "foundhint-local-seo",
      ),
    action: () => __("Turn on localbusiness schema", "foundhint-local-seo"),
  },
  locations: {
    title: () => __("Location schema is off", "foundhint-local-seo"),
    body: () =>
      __(
        "Turn it on to publish each branch: its own address, phone, hours and page.",
        "foundhint-local-seo",
      ),
    action: () => __("Turn on location schema", "foundhint-local-seo"),
  },
  services: {
    title: () => __("Service schema is off", "foundhint-local-seo"),
    body: () =>
      __(
        "Turn it on to publish what you offer, who provides it, where, and at what price.",
        "foundhint-local-seo",
      ),
    action: () => __("Turn on service schema", "foundhint-local-seo"),
  },
  website: {
    title: () => __("Website structure is off", "foundhint-local-seo"),
    body: () =>
      __(
        "Turn it on to publish your website's name and how its pages fit together.",
        "foundhint-local-seo",
      ),
    action: () => __("Turn on website structure", "foundhint-local-seo"),
  },
};

/**
 * 02 off because location setup answered "No, head office only": the main
 * business is described by 01 Organization, not a LocalBusiness (design:
 * "Your main business is a head office.").
 */
const HEAD_OFFICE = {
  title: () =>
    __("Your main business is a head office.", "foundhint-local-seo"),
  body: () =>
    __(
      "It's described in 01 Organization, and your branches link to it as their parent. Change this in location setup.",
      "foundhint-local-seo",
    ),
  action: () => __("Turn on localbusiness schema", "foundhint-local-seo"),
};

/**
 * What a switched-off tab shows instead of its form: that it is off, what
 * turning it on does, and the button to do it. The saved details are kept
 * and come back as they were.
 *
 * @param {Object}   props
 * @param {string}   props.tab      The tab.
 * @param {boolean}  props.locked   No Premium: the button is not offered.
 * @param {boolean}  props.busy     The switch is being saved.
 * @param {Function} props.onTurnOn Switch the tab on.
 * @param {boolean}  props.headOffice 02: customers don't visit the main
 *                                    business (location setup).
 * @param {Function} props.onOpenTab  Open another tab by key.
 */
export function OffPanel({
  tab,
  locked,
  busy,
  onTurnOn,
  headOffice = false,
  onOpenTab,
}) {
  const office = tab === "localbusiness" && headOffice;
  const copy = office ? HEAD_OFFICE : COPY[tab];
  const Icon = office ? Building2Icon : PowerIcon;
  const heading = useRef(null);

  // Announced, and the place keyboard focus lands, when a tab goes off.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [tab]);

  if (!copy) {
    return null;
  }

  return (
    <section
      aria-labelledby={`fhint-off-${tab}`}
      className={cn(
        panel,
        "fhint:flex fhint:flex-wrap fhint:items-start fhint:gap-4 fhint:px-6 fhint:py-6",
      )}
    >
      <span
        aria-hidden="true"
        className="fhint:flex fhint:size-11 fhint:shrink-0 fhint:items-center fhint:justify-center fhint:bg-muted fhint:text-muted-strong"
      >
        <Icon className="fhint:size-5" />
      </span>

      <div className="fhint:grid fhint:min-w-0 fhint:flex-[1_1_320px] fhint:gap-1.5">
        <h2
          id={`fhint-off-${tab}`}
          ref={heading}
          tabIndex={-1}
          className="fhint:m-0 fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2 fhint:text-[18px] fhint:font-bold fhint:outline-none"
        >
          {copy.title()}
          <span className={cn(pill, BADGES.optional)}>
            {__("Off", "foundhint-local-seo")}
          </span>
        </h2>
        <p className="fhint:m-0 fhint:text-sm fhint:leading-relaxed">
          {copy.body()}
        </p>
        <p className={cn(muted, "fhint:m-0")}>
          {__(
            "Nothing from this section is added to your site while it's off.",
            "foundhint-local-seo",
          )}
        </p>
        {office && onOpenTab ? (
          <span className="fhint:mt-1 fhint:flex fhint:flex-wrap fhint:gap-4">
            <button
              type="button"
              onClick={() => onOpenTab("organization")}
              className={linkAction}
            >
              {__("Open 01 Organization", "foundhint-local-seo")}
            </button>
            <button
              type="button"
              onClick={() => onOpenTab("locations")}
              className={linkAction}
            >
              {__("Change in location setup", "foundhint-local-seo")}
            </button>
          </span>
        ) : null}
      </div>

      {locked ? null : (
        <button
          type="button"
          onClick={onTurnOn}
          disabled={busy}
          className={cn(
            primaryAction,
            "fhint:inline-flex fhint:items-center fhint:gap-2",
          )}
        >
          <PowerIcon aria-hidden="true" className="fhint:size-4" />
          {busy
            ? sprintf(
                /* translators: %s: e.g. "Turn on service schema". */
                __("%s…", "foundhint-local-seo"),
                copy.action(),
              )
            : copy.action()}
        </button>
      )}
    </section>
  );
}

export default OffPanel;
