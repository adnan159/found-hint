import { __, sprintf } from "@wordpress/i18n";
import { Link } from "react-router";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import RequestError from "@/components/RequestError";
import { useRunAuditMutation } from "@/store/api/auditsApi";

/**
 * The Local SEO health score.
 *
 * Built to the prototype's measured values: a white card on a #d7d3d3
 * hairline with 22px padding, a 68px/800 score, and a four-segment band bar
 * that fills up to the band reached.
 *
 * Two things the prototype does not show, and this card must:
 *
 * **It never claims more history than exists.** The prototype always reads
 * "in the last 30 days"; when the oldest run is more recent than that, this
 * says "since" the date it actually compared against.
 *
 * **An out-of-date score is shown with a warning**, never hidden and never
 * re-measured behind the operator's back. The route this reads has no write
 * method; running an audit is an explicit button.
 */
const BANDS = [
  {
    id: "needs_work",
    label: () => __("Needs work", "found-hint"),
    fill: "fhint:bg-band-needs-work",
  },
  {
    id: "fair",
    label: () => __("Fair", "found-hint"),
    fill: "fhint:bg-band-fair",
  },
  {
    id: "good",
    label: () => __("Good", "found-hint"),
    fill: "fhint:bg-band-good",
  },
  {
    id: "excellent",
    label: () => __("Excellent", "found-hint"),
    fill: "fhint:bg-band-excellent",
  },
];

/**
 * "12 minutes ago", in the site's language.
 *
 * @param {string} value UTC MySQL datetime.
 * @param {number} now   Current time in milliseconds.
 * @return {string} Relative time, or "" when unreadable.
 */
export function relativeTime(value, now = Date.now()) {
  if (!value) {
    return "";
  }

  const then = new Date(`${value.replace(" ", "T")}Z`).getTime();

  if (Number.isNaN(then)) {
    return "";
  }

  const seconds = Math.round((then - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat(
    document.documentElement.lang || undefined,
    { numeric: "auto" },
  );

  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }

  return formatter.format(0, "second");
}

/**
 * The sentence under the band name.
 *
 * @param {Object} trend Trend from the API.
 * @return {{text: string, tone: string}} Copy and its tone.
 */
export function trendCopy(trend) {
  if (!trend || trend.delta === null || trend.delta === undefined) {
    return {
      text: __("Your first check — no trend yet.", "found-hint"),
      tone: "muted",
    };
  }

  const date = trend.baseline_completed_at
    ? new Date(
        `${trend.baseline_completed_at.replace(" ", "T")}Z`,
      ).toLocaleDateString(document.documentElement.lang || undefined, {
        month: "short",
        day: "numeric",
      })
    : "";

  if (trend.delta === 0) {
    return {
      text: trend.covers_full_window
        ? sprintf(
            /* translators: %d: number of days. */
            __("No change in the last %d days", "found-hint"),
            trend.window_days,
          )
        : sprintf(
            /* translators: %s: a date, e.g. "Sep 9". */
            __("No change since %s", "found-hint"),
            date,
          ),
      tone: "muted",
    };
  }

  // A real minus sign, and the direction in the words themselves: the
  // colour is a second signal, never the only one.
  const signed =
    trend.delta > 0 ? `+${trend.delta}` : `−${Math.abs(trend.delta)}`;

  return {
    text: trend.covers_full_window
      ? sprintf(
          /* translators: 1: signed change, e.g. "+6", 2: number of days. */
          __("%1$s in the last %2$d days", "found-hint"),
          signed,
          trend.window_days,
        )
      : sprintf(
          /* translators: 1: signed change, e.g. "+6", 2: a date, e.g. "Sep 9". */
          __("%1$s since %2$s", "found-hint"),
          signed,
          date,
        ),
    tone: trend.delta > 0 ? "up" : "down",
  };
}

function BandBar({ band }) {
  const reached = BANDS.findIndex((item) => item.id === band);

  return (
    <>
      <div
        aria-hidden="true"
        className="fhint:mt-3 fhint:mb-1.5 fhint:flex fhint:h-2 fhint:gap-0.5"
      >
        {BANDS.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "fhint:flex-1",
              reached >= 0 && index <= reached
                ? item.fill
                : "fhint:bg-band-empty",
            )}
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="fhint:flex fhint:justify-between fhint:text-[10.5px] fhint:font-semibold fhint:text-muted-foreground"
      >
        {BANDS.map((item) => (
          <span key={item.id}>{item.label()}</span>
        ))}
      </div>
    </>
  );
}

export function ScoreCard({ summary }) {
  const [runAudit, { isLoading: isRunning, error: runError }] =
    useRunAuditMutation();

  const hasAudit = Boolean(summary?.has_audit);
  const bandLabel = BANDS.find((item) => item.id === summary?.band)?.label();
  const trend = trendCopy(summary?.trend);

  const runButton = (label) => (
    <Button
      type="button"
      onClick={() => runAudit(0)}
      disabled={isRunning}
      className="fhint:mt-3.5 fhint:h-auto fhint:px-4 fhint:py-2.5 fhint:text-[13.5px] fhint:font-extrabold"
    >
      {isRunning ? <Spinner data-icon="inline-start" /> : null}
      {label}
    </Button>
  );

  return (
    <section
      aria-labelledby="fhint-score-title"
      className="fhint:flex fhint:flex-col fhint:border fhint:border-border fhint:bg-card fhint:p-[22px]"
    >
      <div className="fhint:flex fhint:items-baseline fhint:gap-2.5">
        <h2
          id="fhint-score-title"
          className="fhint:m-0 fhint:font-heading fhint:text-[13px] fhint:font-extrabold fhint:tracking-[0.1em] fhint:uppercase"
        >
          {__("Local SEO health score", "found-hint")}
        </h2>
        {hasAudit ? (
          <span className="fhint:ml-auto fhint:text-[11.5px] fhint:text-muted-foreground">
            {sprintf(
              /* translators: %s: relative time, e.g. "12 minutes ago". */
              __("Checked %s", "found-hint"),
              relativeTime(summary.completed_at),
            )}
          </span>
        ) : null}
      </div>

      {/* Titled for what was attempted: nothing was being saved, and the
          default "That did not save" would describe the wrong failure. */}
      <RequestError
        error={runError}
        title={__("The check did not run", "found-hint")}
      />

      {hasAudit ? (
        <>
          <div className="fhint:mt-3.5 fhint:mb-1.5 fhint:flex fhint:items-end fhint:gap-3.5">
            <div className="fhint:font-heading fhint:text-[68px] fhint:leading-[0.9] fhint:font-extrabold fhint:tracking-[-0.04em]">
              {summary.score}
              <span className="fhint:sr-only">
                {__(" out of 100", "found-hint")}
              </span>
            </div>
            <div className="fhint:pb-1.5">
              <div className="fhint:text-[18px] fhint:font-extrabold">
                {bandLabel ?? summary.band}
              </div>
              <div
                className={cn(
                  "fhint:text-[12.5px] fhint:font-bold",
                  trend.tone === "up" && "fhint:text-success",
                  trend.tone === "down" && "fhint:text-band-needs-work",
                  trend.tone === "muted" && "fhint:text-muted-foreground",
                )}
              >
                {trend.text}
              </div>
            </div>
          </div>

          <BandBar band={summary.band} />

          {summary.stale ? (
            <div
              role="status"
              className="fhint:mt-3.5 fhint:border fhint:border-notice-border fhint:bg-notice fhint:px-3 fhint:py-2 fhint:text-[12.5px] fhint:text-notice-foreground"
            >
              {__(
                "Your details have changed since this check, so this score may be out of date.",
                "found-hint",
              )}
            </div>
          ) : null}

          <p className="fhint:mt-3.5 fhint:mb-0 fhint:text-[12.5px] fhint:leading-[1.45] fhint:text-muted-strong">
            {__(
              "This is FoundHint's own read on how complete and consistent your local details are. It is not a Google ranking.",
              "found-hint",
            )}
          </p>

          <div className="fhint:mt-auto fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2.5">
            <Button
              render={<Link to="/audit" />}
              className="fhint:mt-3.5 fhint:h-auto fhint:px-4 fhint:py-2.5 fhint:text-[13.5px] fhint:font-extrabold"
            >
              {summary.open_findings > 0
                ? sprintf(
                    /* translators: %d: number of open findings. */
                    __("See what to fix (%d)", "found-hint"),
                    summary.open_findings,
                  )
                : __("View the audit", "found-hint")}
            </Button>
            {summary.stale ? runButton(__("Check again", "found-hint")) : null}
          </div>
        </>
      ) : (
        <>
          <div className="fhint:mt-3.5 fhint:font-heading fhint:text-[18px] fhint:font-extrabold">
            {__("No score yet", "found-hint")}
          </div>
          <BandBar band={null} />
          <p className="fhint:mt-3.5 fhint:mb-0 fhint:text-[12.5px] fhint:leading-[1.45] fhint:text-muted-strong">
            {__(
              "Run a check to see how complete and consistent your local details are. It takes a moment and changes nothing.",
              "found-hint",
            )}
          </p>
          <div className="fhint:mt-auto">
            {runButton(__("Run your first check", "found-hint"))}
          </div>
        </>
      )}
    </section>
  );
}

export default ScoreCard;
