import { ChevronDownIcon } from "lucide-react";
import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { chip, focus, tagTones } from "../styles";

/**
 * One collapsible card of the profile.
 *
 * The header is a real button with `aria-expanded`, so the whole row opens
 * and closes the section from the keyboard, and the heavy rule under it
 * appears only while the section is open — the design's way of saying "this
 * is the part you are in".
 *
 * `state` is how a section reports on the page-level save without a Save
 * button of its own: changed, saved, or refused. It is always words as well
 * as colour.
 */
const STATES = {
  dirty: {
    tone: tagTones.accent,
    label: () => __("Unsaved changes", "foundhint-local-seo"),
  },
  saving: {
    tone: tagTones.quiet,
    label: () => __("Saving…", "foundhint-local-seo"),
  },
  saved: {
    tone: tagTones.ok,
    label: () => __("Saved", "foundhint-local-seo"),
  },
  error: {
    tone: tagTones.bad,
    label: () => __("Not saved", "foundhint-local-seo"),
  },
};

export function Section({
  id,
  icon: Icon,
  title,
  badge,
  badgeTone = "accent",
  state,
  open,
  onToggle,
  children,
}) {
  const status = state ? STATES[state] : null;

  return (
    <section
      id={`profile-${id}`}
      className="fhint:scroll-mt-6 fhint:border fhint:border-border fhint:bg-card"
    >
      <h2 className="fhint:m-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`profile-${id}-body`}
          className={cn(
            "fhint:flex fhint:w-full fhint:cursor-pointer fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-0 fhint:bg-transparent fhint:px-[22px] fhint:py-[18px] fhint:text-left fhint:text-foreground",
            open && "fhint:border-b-2 fhint:border-b-divider",
            focus,
          )}
        >
          <span
            aria-hidden="true"
            className="fhint:grid fhint:size-[22px] fhint:flex-none fhint:place-items-center fhint:text-muted-strong"
          >
            <Icon className="fhint:size-4" />
          </span>
          <span className="fhint:text-base fhint:font-bold fhint:tracking-[-0.01em]">
            {title}
          </span>
          {badge ? (
            <span className={cn(chip, tagTones[badgeTone])}>{badge}</span>
          ) : null}
          {status ? (
            <span role="status" className={cn(chip, status.tone)}>
              {status.label()}
            </span>
          ) : null}
          <ChevronDownIcon
            aria-hidden="true"
            className={cn(
              "fhint:ml-auto fhint:size-4 fhint:flex-none fhint:text-muted-foreground fhint:transition-transform",
              !open && "fhint:-rotate-90",
            )}
          />
        </button>
      </h2>
      {open ? (
        <div
          id={`profile-${id}-body`}
          className="fhint:grid fhint:gap-5 fhint:p-5"
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}

export default Section;
