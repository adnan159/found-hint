import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { chip, primaryButton, quietButton, tagTones } from "../styles";

/**
 * The card inside one tab of the profile.
 *
 * A heading with the section's count beside it, the fields, and — for a
 * section that is saved — a footer with its own Save button. The footer says
 * where the section stands in words as well as colour: changed, saving,
 * saved, or refused.
 *
 * A section with no `onSave` (photos, which are stored as they are added)
 * has no footer at all.
 */
const SAVE_STATES = {
  dirty: {
    tone: "fhint:text-foreground",
    label: () => __("Unsaved changes.", "foundhint-local-seo"),
  },
  saving: {
    tone: "fhint:text-muted-strong",
    label: () => __("Saving…", "foundhint-local-seo"),
  },
  saved: {
    tone: "fhint:text-success",
    label: () => __("Saved.", "foundhint-local-seo"),
  },
  error: {
    tone: "fhint:text-destructive",
    label: () =>
      __("Not saved. Check the highlighted fields.", "foundhint-local-seo"),
  },
};

export function Section({
  id,
  icon: Icon,
  title,
  badge,
  badgeTone = "accent",
  state,
  saveLabel,
  onSave,
  onDiscard,
  disabled,
  children,
}) {
  const status = state ? SAVE_STATES[state] : null;
  const isSaving = state === "saving";
  const hasUnsavedChanges = state === "dirty" || state === "error";

  return (
    <section
      id={`profile-${id}`}
      aria-labelledby={`profile-${id}-title`}
      className="fhint:border fhint:border-border fhint:bg-card"
    >
      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-b-2 fhint:border-b-border fhint:px-[22px] fhint:py-[18px] fhint:text-foreground">
        <span
          aria-hidden="true"
          className="fhint:grid fhint:size-[22px] fhint:flex-none fhint:place-items-center fhint:text-muted-strong"
        >
          <Icon className="fhint:size-4" />
        </span>
        <h2
          id={`profile-${id}-title`}
          className="fhint:m-0 fhint:text-base fhint:font-bold fhint:tracking-[-0.01em]"
        >
          {title}
        </h2>
        {badge ? (
          <span className={cn(chip, tagTones[badgeTone])}>{badge}</span>
        ) : null}
      </div>
      <div className="fhint:grid fhint:gap-5 fhint:p-5">{children}</div>
      {onSave ? (
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-t fhint:border-border fhint:px-[22px] fhint:py-3.5">
          <span
            aria-live="polite"
            className={cn(
              "fhint:min-w-0 fhint:flex-1 fhint:text-[13px] fhint:font-bold",
              status?.tone,
            )}
          >
            {status ? status.label() : ""}
          </span>
          {hasUnsavedChanges ? (
            <button
              type="button"
              onClick={onDiscard}
              disabled={disabled}
              className={cn(
                quietButton,
                "fhint:px-4 fhint:py-[9px] fhint:text-[13px]",
              )}
            >
              {__("Discard", "foundhint-local-seo")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            disabled={disabled || isSaving || !hasUnsavedChanges}
            className={cn(
              primaryButton,
              "fhint:px-4 fhint:py-[9px] fhint:text-[13px]",
            )}
          >
            {saveLabel}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default Section;
