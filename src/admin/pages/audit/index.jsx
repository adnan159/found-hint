import { useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { CheckIcon, RefreshCwIcon, WrenchIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import NoticeBar from "@/components/NoticeBar";
import PageHeader from "@/components/PageHeader";
import RequestError from "@/components/RequestError";
import SectionCard from "@/components/SectionCard";
import {
  useFixIssueMutation,
  useGetAuditQuery,
  useRunAuditMutation,
  useUpdateIssueMutation,
} from "@/store/api/auditsApi";

/**
 * The audit.
 *
 * Everything here is read from the stored run. The score is never
 * recomputed to render this screen — if it has fallen behind the data, it
 * is shown **with a warning** rather than hidden or silently refreshed,
 * because a number that quietly changes while you look at it is worse than
 * one labelled out of date.
 */
const BAND_LABELS = {
  needs_work: () => __("Needs work", "found-hint"),
  fair: () => __("Fair", "found-hint"),
  good: () => __("Good", "found-hint"),
  excellent: () => __("Excellent", "found-hint"),
};

const CATEGORY_LABELS = {
  business: () => __("Business", "found-hint"),
  location: () => __("Location", "found-hint"),
  hours: () => __("Hours", "found-hint"),
  schema: () => __("Schema", "found-hint"),
  website: () => __("Website", "found-hint"),
  technical: () => __("Technical", "found-hint"),
};

const SEVERITY_LABELS = {
  critical: () => __("Critical", "found-hint"),
  high: () => __("High", "found-hint"),
  medium: () => __("Medium", "found-hint"),
  low: () => __("Low", "found-hint"),
};

function formatWhen(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(`${value.replace(" ", "T")}Z`);

  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function Findings({ issues, onFix, onIgnore, busyId }) {
  if (issues.length === 0) {
    return (
      <Empty>
        <EmptyTitle>{__("Nothing to fix", "found-hint")}</EmptyTitle>
        <EmptyDescription>
          {__("Every check passed on the last run.", "found-hint")}
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <ul className="fhint:flex fhint:flex-col fhint:gap-2.5">
      {issues.map((issue) => (
        <li
          key={issue.id}
          className="fhint:flex fhint:flex-wrap fhint:items-start fhint:gap-4 fhint:border fhint:border-border fhint:px-4 fhint:py-3.5"
        >
          <div className="fhint:min-w-0 fhint:flex-1">
            <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
              <Badge
                variant={issue.severity === "low" ? "outline" : "secondary"}
              >
                {SEVERITY_LABELS[issue.severity]
                  ? SEVERITY_LABELS[issue.severity]()
                  : issue.severity}
              </Badge>
              <span className="fhint:text-[13px] fhint:font-bold">
                {issue.message}
              </span>
            </div>
            {issue.recommendation ? (
              <p className="fhint:mt-1 fhint:max-w-[76ch] fhint:text-[12.5px] fhint:text-muted-strong">
                {issue.recommendation}
              </p>
            ) : null}
            {issue.context?.found && issue.context?.expected ? (
              <p className="fhint:mt-1 fhint:text-[12.5px] fhint:text-muted-strong">
                {sprintf(
                  /* translators: 1: value here, 2: value on Google. */
                  __("Here: %1$s · Google: %2$s", "found-hint"),
                  issue.context.found,
                  issue.context.expected,
                )}
              </p>
            ) : null}
          </div>

          <div className="fhint:flex fhint:shrink-0 fhint:items-center fhint:gap-2">
            {issue.fixable ? (
              <Button
                type="button"
                onClick={() => onFix(issue.id)}
                disabled={busyId === issue.id}
              >
                {busyId === issue.id ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <WrenchIcon data-icon="inline-start" />
                )}
                {__("Fix this", "found-hint")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => onIgnore(issue.id)}
              disabled={busyId === issue.id}
            >
              {__("Ignore", "found-hint")}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AuditPage() {
  const { data, isLoading, error } = useGetAuditQuery();
  const [runAudit, { isLoading: isRunning, error: runError }] =
    useRunAuditMutation();
  const [fixIssue] = useFixIssueMutation();
  const [updateIssue] = useUpdateIssueMutation();

  // Which row is working, rather than whether *a* row is: the mutation's own
  // isLoading cannot say which of twenty buttons was pressed.
  const [busyId, setBusyId] = useState(null);

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title={__("SEO audit", "found-hint")} />
        <Skeleton className="fhint:h-[60vh] fhint:w-full" />
      </>
    );
  }

  const { audit, issues, stale } = data;
  const open = issues.filter((issue) => issue.status === "open");

  const onRun = async () => {
    try {
      await runAudit(0).unwrap();
      toast.success(__("Audit finished.", "found-hint"));
    } catch {
      // Shown inline.
    }
  };

  const onFix = async (id) => {
    setBusyId(id);

    try {
      const result = await fixIssue(id).unwrap();

      toast.success(
        result?.fix?.changed
          ? __("Fixed, and the score has been recalculated.", "found-hint")
          : __("There was nothing left to change.", "found-hint"),
      );
    } catch {
      toast.error(__("That could not be fixed automatically.", "found-hint"));
    } finally {
      setBusyId(null);
    }
  };

  const onIgnore = async (id) => {
    setBusyId(id);

    try {
      await updateIssue({ id, status: "ignored" }).unwrap();
      toast.success(__("Ignored.", "found-hint"));
    } catch {
      toast.error(__("Could not update that.", "found-hint"));
    } finally {
      setBusyId(null);
    }
  };

  const runButton = (
    <Button type="button" onClick={onRun} disabled={isRunning}>
      {isRunning ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <RefreshCwIcon data-icon="inline-start" />
      )}
      {__("Run audit", "found-hint")}
    </Button>
  );

  if (!audit) {
    return (
      <>
        <PageHeader title={__("SEO audit", "found-hint")} actions={runButton} />
        <RequestError error={error ?? runError} />
        <Empty>
          <EmptyTitle>{__("No audit yet", "found-hint")}</EmptyTitle>
          <EmptyDescription>
            {__(
              "Run one to see how complete and consistent your local SEO is.",
              "found-hint",
            )}
          </EmptyDescription>
        </Empty>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={__("SEO audit", "found-hint")}
        description={sprintf(
          /* translators: %s: date and time of the last audit. */
          __("Last run %s.", "found-hint"),
          formatWhen(audit.completed_at),
        )}
        actions={runButton}
      />

      <RequestError error={error ?? runError} />

      {stale ? (
        <NoticeBar action={runButton}>
          {__(
            "Your details have changed since this audit ran, so the score below is out of date.",
            "found-hint",
          )}
        </NoticeBar>
      ) : null}

      <SectionCard
        id="audit-score"
        title={__("Score", "found-hint")}
        description={sprintf(
          /* translators: 1: rules run, 2: rules passed. */
          __("%1$d checks ran, %2$d passed.", "found-hint"),
          audit.rules_run,
          audit.issues_passed,
        )}
      >
        <div className="fhint:flex fhint:flex-wrap fhint:items-end fhint:gap-4">
          <span className="fhint:font-heading fhint:text-[56px] fhint:leading-none fhint:font-extrabold">
            {audit.score}
          </span>
          <Badge variant="secondary">
            {BAND_LABELS[audit.score_band]
              ? BAND_LABELS[audit.score_band]()
              : audit.score_band}
          </Badge>
        </div>

        <div className="fhint:mt-5 fhint:flex fhint:flex-col fhint:gap-3">
          {Object.entries(audit.category_scores ?? {}).map(([name, cat]) => (
            <div key={name} className="fhint:flex fhint:flex-col fhint:gap-1">
              <div className="fhint:flex fhint:items-baseline fhint:justify-between fhint:text-[12.5px]">
                <span className="fhint:font-bold">
                  {CATEGORY_LABELS[name] ? CATEGORY_LABELS[name]() : name}
                </span>
                <span className="fhint:text-muted-strong">
                  {sprintf(
                    /* translators: 1: points earned, 2: points available. */
                    __("%1$s of %2$s", "found-hint"),
                    Math.round(cat.earned * 10) / 10,
                    Math.round(cat.effective_weight * 10) / 10,
                  )}
                </span>
              </div>
              <Progress value={cat.percent} />
            </div>
          ))}
        </div>

        {/* The breakdown adds up to the score on purpose: a number you
            cannot take apart is a number you cannot act on. */}
      </SectionCard>

      <SectionCard
        id="audit-findings"
        title={__("What to fix", "found-hint")}
        description={
          open.length > 0
            ? sprintf(
                /* translators: %d: number of findings. */
                _n(
                  "%d thing to look at, most urgent first.",
                  "%d things to look at, most urgent first.",
                  open.length,
                  "found-hint",
                ),
                open.length,
              )
            : __("Nothing outstanding.", "found-hint")
        }
      >
        <Findings
          issues={open}
          onFix={onFix}
          onIgnore={onIgnore}
          busyId={busyId}
        />
      </SectionCard>

      {data.passes?.length ? (
        <SectionCard
          id="audit-passed"
          title={__("What is already right", "found-hint")}
          description={__(
            "Recorded so the score has a denominator you can see.",
            "found-hint",
          )}
        >
          <ul className="fhint:flex fhint:flex-col fhint:gap-1.5 fhint:text-[13px]">
            {data.passes.map((pass) => (
              <li
                key={pass.id}
                className="fhint:flex fhint:items-center fhint:gap-2 fhint:text-muted-strong"
              >
                <CheckIcon
                  aria-hidden="true"
                  className="fhint:size-3.5 fhint:shrink-0 fhint:text-success"
                />
                {pass.rule_id}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </>
  );
}
