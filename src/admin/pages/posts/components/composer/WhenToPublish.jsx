import { __ } from "@wordpress/i18n";
import { CalendarClockIcon, FileIcon, ZapIcon } from "lucide-react";
import { help, label } from "@/pages/profile/styles";
import SoonTag from "@/pages/reviews/components/SoonTag";
import { choice } from "../../styles";
import ScheduleField from "./ScheduleField";

function note(when, canSchedule) {
  if (when === "draft") {
    return __(
      "Saved here only. Nothing goes to Google until you finish it.",
      "foundhint-local-seo",
    );
  }

  if (when === "schedule") {
    return canSchedule
      ? __(
          "Sent at this time. You can change or cancel it until then.",
          "foundhint-local-seo",
        )
      : __(
          "This post waits for FoundHint Premium to send it. Choose Now to publish it yourself, or Draft to take it off the schedule.",
          "foundhint-local-seo",
        );
  }

  return __(
    "Goes live when you press Publish. Google can take a few minutes to show it.",
    "foundhint-local-seo",
  );
}

/**
 * Now, Schedule or Draft. Schedule is FoundHint Premium: without it the
 * choice is drawn with its PRO tag and disabled — unless this post is
 * already scheduled, which it then shows (its time read-only) so it is
 * clear why the post is waiting.
 */
export function WhenToPublish({
  id,
  when,
  onChange,
  canSchedule,
  scheduleAt,
  onScheduleAt,
  timezone,
  error,
}) {
  const options = [
    ["now", ZapIcon, __("Now", "foundhint-local-seo")],
    ["schedule", CalendarClockIcon, __("Schedule", "foundhint-local-seo")],
    ["draft", FileIcon, __("Draft", "foundhint-local-seo")],
  ];

  return (
    <div className="fhint:grid fhint:gap-2">
      <span className={label}>
        {__("When to publish", "foundhint-local-seo")}
      </span>
      <div
        role="radiogroup"
        aria-label={__("When to publish", "foundhint-local-seo")}
        className="fhint:flex fhint:flex-wrap fhint:gap-2"
      >
        {options.map(([value, Icon, text]) => {
          const on = when === value;
          const premium = value === "schedule" && !canSchedule;

          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={premium && !on}
              title={
                premium
                  ? __(
                      "Scheduling posts is part of FoundHint Premium.",
                      "foundhint-local-seo",
                    )
                  : undefined
              }
              onClick={() => onChange(value)}
              className={choice(on)}
            >
              <Icon aria-hidden="true" className="fhint:size-3.5" />
              {text}
              {premium ? <SoonTag kind="pro" /> : null}
            </button>
          );
        })}
      </div>
      {when === "schedule" ? (
        <ScheduleField
          id={id}
          value={scheduleAt}
          onChange={onScheduleAt}
          timezone={timezone}
          error={error}
          locked={!canSchedule}
        />
      ) : null}
      <span className={help} aria-live="polite">
        {note(when, canSchedule)}
      </span>
    </div>
  );
}

export default WhenToPublish;
