import { useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { TriangleAlertIcon } from "lucide-react";
import { cn } from "cn";
import { focus } from "@/pages/profile/styles";
import { cronJob, howLong } from "@/lib/cron";
import CronGuide from "./CronGuide";

const MESSAGES = {
  /* translators: %s: how long, e.g. "3 hours". */
  auto_reply: () =>
    __("Auto-reply has not checked for reviews in %s.", "foundhint-local-seo"),
  /* translators: %s: how long, e.g. "3 hours". */
  posts: () =>
    __(
      "Scheduled posts have not been checked in %s, so they may go out late.",
      "foundhint-local-seo",
    ),
};

/**
 * A warning when a Premium background job is overdue while it has work —
 * WordPress runs them only when the site gets visits, and some hosts block
 * them. Says how long, and opens a guide to setting up a cron job.
 * Nothing at all while the job runs on time.
 *
 * @param {Object} props
 * @param {string} props.job auto_reply | posts.
 */
export function CronWarning({ job }) {
  const [open, setOpen] = useState(false);
  const state = cronJob(job);

  if (!state.late) {
    return null;
  }

  return (
    <div
      role="status"
      className="fhint:flex fhint:flex-wrap fhint:items-start fhint:gap-3 fhint:border fhint:border-[#E8A317] fhint:bg-[#fff8e6] fhint:px-4 fhint:py-3 fhint:text-sm fhint:text-[#6b4700]"
    >
      <TriangleAlertIcon
        aria-hidden="true"
        className="fhint:mt-0.5 fhint:size-4 fhint:flex-none"
      />
      <span className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:basis-60 fhint:gap-0.5">
        <strong>
          {state.since
            ? sprintf(MESSAGES[job](), howLong(state.since))
            : __(
                "Background tasks are not running on this site.",
                "foundhint-local-seo",
              )}
        </strong>
        <span>
          {__(
            "WordPress runs scheduled tasks only when someone visits your site, and some hosts block them. A cron job makes them run on time.",
            "foundhint-local-seo",
          )}
        </span>
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fhint:cursor-pointer fhint:border fhint:border-[#E8A317] fhint:bg-card fhint:px-3 fhint:py-1.5 fhint:text-sm fhint:font-bold fhint:text-[#6b4700] fhint:hover:bg-[#fff1cc]",
          focus,
        )}
      >
        {__("How to fix", "foundhint-local-seo")}
      </button>
      {open ? <CronGuide state={state} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

export default CronWarning;
