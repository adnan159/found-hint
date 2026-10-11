import { useEffect, useId, useRef, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { useNavigate } from "react-router";
import { cn } from "cn";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import logoUrl from "@/assets/foundhint-icon.png";
import useGoogleConnect from "@/hooks/useGoogleConnect";
import { errorMessage } from "@/lib/errors";
import {
  useGetGoogleImportStepsQuery,
  useRunGoogleImportStepMutation,
  useSyncGoogleProfilesMutation,
} from "@/store/api/googleApi";
import { useMoveOnboardingMutation } from "@/store/api/onboardingApi";

/**
 * The guided import: where a first Google sign-in lands.
 *
 * Somebody who has just pressed "Continue with Google" did it to get their
 * details across, so this is the next thing they see — not a menu to go and
 * find it under. It reads which listings the account manages, asks which one
 * when there is more than one, and then imports in six steps, **one request
 * each**, ticking them off as they land.
 *
 * Nothing is imported until "Import from Google" is pressed, and "I'll do
 * this later" leaves without importing anything. Either way the next stop is
 * the Business Profile.
 */
const STEP_LABELS = {
  identity: () => __("Business name and description", "foundhint-local-seo"),
  category: () => __("Category", "foundhint-local-seo"),
  address: () => __("Address and map pin", "foundhint-local-seo"),
  contact: () => __("Phone and website", "foundhint-local-seo"),
  hours: () => __("Opening hours", "foundhint-local-seo"),
  services: () => __("Services", "foundhint-local-seo"),
};

// The order to fall back on if the list cannot be read; the server's own
// list is used when it can.
const DEFAULT_STEPS = Object.keys(STEP_LABELS).map((id) => ({ id }));

const STATUS = {
  waiting: () => __("Waiting", "foundhint-local-seo"),
  running: () => __("Importing…", "foundhint-local-seo"),
  imported: () => __("Imported", "foundhint-local-seo"),
  unchanged: () => __("Already up to date", "foundhint-local-seo"),
  empty: () => __("Nothing on Google", "foundhint-local-seo"),
  failed: () => __("Not imported", "foundhint-local-seo"),
};

const pill =
  "fhint:inline-flex fhint:h-12 fhint:cursor-pointer fhint:items-center fhint:gap-2 fhint:rounded-full fhint:border-0 fhint:bg-primary fhint:px-6 fhint:text-[15px] fhint:font-extrabold fhint:text-primary-foreground fhint:hover:bg-primary/90 fhint:focus-visible:ring-2 fhint:focus-visible:ring-ring fhint:focus-visible:ring-offset-2 fhint:focus-visible:outline-none fhint:disabled:cursor-not-allowed fhint:disabled:bg-border fhint:disabled:text-muted-foreground";

/**
 * The box at the start of a row. A tick, a dash, a cross or nothing — the
 * word at the end of the row says the same thing, so the box is decoration
 * and the status is never carried by its colour alone.
 */
function Box({ state }) {
  if (state === "running") {
    return (
      <span className="fhint:grid fhint:size-5 fhint:flex-none fhint:place-items-center">
        <Spinner className="fhint:size-4" />
      </span>
    );
  }

  const done = state === "imported" || state === "unchanged";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "fhint:grid fhint:size-5 fhint:flex-none fhint:place-items-center fhint:border fhint:text-[13px] fhint:leading-none fhint:font-extrabold",
        done &&
          "fhint:border-success fhint:bg-success fhint:text-success-foreground",
        state === "failed" &&
          "fhint:border-destructive fhint:bg-destructive fhint:text-primary-foreground",
        state === "empty" &&
          "fhint:border-input fhint:bg-muted fhint:text-muted-strong",
        state === "waiting" && "fhint:border-input fhint:bg-card",
      )}
    >
      {done ? "✓" : state === "failed" ? "×" : state === "empty" ? "–" : ""}
    </span>
  );
}

export default function SetupGooglePage() {
  const navigate = useNavigate();
  const groupId = useId();
  const headingRef = useRef(null);

  const { connect, isConnecting, connected, isLoading, error } =
    useGoogleConnect();
  const { data: stepList } = useGetGoogleImportStepsQuery();
  const [syncProfiles, syncState] = useSyncGoogleProfilesMutation();
  const [runStep] = useRunGoogleImportStepMutation();
  const [move] = useMoveOnboardingMutation();

  const steps = stepList?.length ? stepList : DEFAULT_STEPS;

  const [chosen, setChosen] = useState("");
  // step id -> waiting | running | imported | unchanged | empty | failed
  const [progress, setProgress] = useState({});
  // idle | running | stopped | finished
  const [phase, setPhase] = useState("idle");
  const [failure, setFailure] = useState("");
  const [locationId, setLocationId] = useState(0);
  const asked = useRef(false);

  // Reading which listings the account manages is the one thing done
  // without being asked: the person connected seconds ago, and there is
  // nothing to show them until it is known.
  useEffect(() => {
    if (connected && !asked.current) {
      asked.current = true;
      syncProfiles();
    }
  }, [connected, syncProfiles]);

  const listings = syncState.data?.overview?.google_locations ?? [];
  const selected =
    chosen || (listings.length === 1 ? listings[0].location_name : "");

  // The heading names what is happening; move focus to it when that changes
  // so the change is announced.
  // Focus without the browser's own scroll, then go to the top: left to
  // itself the browser parks the heading underneath the sticky bar.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [phase]);

  const leave = async (action, to) => {
    try {
      await move({ action }).unwrap();
    } catch {
      // Leaving matters more than recording that the wizard was left.
    }

    // The next screen starts at its top, not wherever this one was left.
    window.scrollTo({ top: 0 });
    navigate(to);
  };

  const run = async () => {
    setPhase("running");
    setFailure("");

    // In order and one at a time: the first step is the one that reads
    // Google, and the rest build on what it found.
    for (const step of steps) {
      const state = progress[step.id];

      if (state && state !== "failed" && state !== "waiting") {
        continue;
      }

      setProgress((current) => ({ ...current, [step.id]: "running" }));

      try {
        const result = await runStep({
          step: step.id,
          locationName: selected,
        }).unwrap();

        setProgress((current) => ({
          ...current,
          [step.id]: result?.status ?? "imported",
        }));

        if (result?.location_id) {
          setLocationId(result.location_id);
        }
      } catch (problem) {
        setProgress((current) => ({ ...current, [step.id]: "failed" }));
        setFailure(errorMessage(problem));
        setPhase("stopped");

        return;
      }
    }

    setPhase("finished");
  };

  const settled = steps.filter((step) =>
    ["imported", "unchanged", "empty"].includes(progress[step.id]),
  ).length;
  const started = phase !== "idle";

  const title =
    phase === "finished"
      ? __("Import finished", "foundhint-local-seo")
      : started
        ? __("Importing your details", "foundhint-local-seo")
        : __("Bring your details in from Google", "foundhint-local-seo");

  const frame = (children) => (
    <div className="fhint:-m-6 fhint:flex fhint:min-h-[calc(100vh-32px)] fhint:flex-col fhint:bg-background">
      <div className="fhint:sticky fhint:top-8 fhint:z-2 fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-b-2 fhint:border-b-divider fhint:bg-card fhint:px-6 fhint:py-3">
        <img
          src={logoUrl}
          alt=""
          aria-hidden="true"
          width={24}
          height={24}
          className="fhint:size-6 fhint:shrink-0"
        />
        <strong className="fhint:text-[14px] fhint:font-extrabold fhint:tracking-tight fhint:uppercase">
          {__("FoundHint", "foundhint-local-seo")}
        </strong>
        <span className="fhint:text-[11px] fhint:font-bold fhint:tracking-[0.12em] fhint:text-muted-foreground fhint:uppercase">
          {__("Setup", "foundhint-local-seo")}
        </span>
        <span className="fhint:ml-auto fhint:text-[12.5px] fhint:text-muted-strong">
          {__("Connecting Google", "foundhint-local-seo")}
        </span>
        <button
          type="button"
          onClick={() => leave("dismiss", "/business")}
          disabled={phase === "running"}
          className="fhint:cursor-pointer fhint:border-0 fhint:bg-transparent fhint:p-0 fhint:text-[12.5px] fhint:font-bold fhint:underline fhint:disabled:cursor-not-allowed fhint:disabled:text-muted-foreground"
        >
          {__("I'll do this later", "foundhint-local-seo")}
        </button>
      </div>

      <div className="fhint:mx-auto fhint:w-full fhint:max-w-[960px] fhint:px-6 fhint:pt-10 fhint:pb-16">
        <div className="fhint:max-w-[640px]">{children}</div>
      </div>
    </div>
  );

  const heading = (text, intro) => (
    <>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="fhint:m-0 fhint:mb-2 fhint:font-heading fhint:text-[30px] fhint:leading-[1.1] fhint:font-extrabold fhint:tracking-[-0.02em] fhint:outline-none"
      >
        {text}
      </h1>
      <p className="fhint:m-0 fhint:mb-6 fhint:text-[15px] fhint:leading-normal fhint:text-muted-strong">
        {intro}
      </p>
    </>
  );

  if (isLoading) {
    return frame(<Skeleton className="fhint:h-[320px] fhint:w-full" />);
  }

  if (!connected) {
    return frame(
      <>
        {heading(
          __("Connect Google first", "foundhint-local-seo"),
          __(
            "Sign in with the Google account that manages your Business Profile and your details can be brought across.",
            "foundhint-local-seo",
          ),
        )}
        {error ? (
          <p
            role="alert"
            className="fhint:mb-4 fhint:text-[13.5px] fhint:font-semibold fhint:text-destructive"
          >
            {errorMessage(error)}
          </p>
        ) : null}
        <GoogleSignInButton
          onClick={connect}
          disabled={isConnecting}
          isBusy={isConnecting}
        />
      </>,
    );
  }

  const intro = __(
    "We are copying your details from Google into FoundHint. Nothing on Google changes.",
    "foundhint-local-seo",
  );

  // Still finding out which listings there are, or could not.
  if (!started && (syncState.isLoading || syncState.isUninitialized)) {
    return frame(
      <>
        {heading(title, intro)}
        <p
          aria-live="polite"
          className="fhint:m-0 fhint:flex fhint:items-center fhint:gap-2 fhint:text-[14px]"
        >
          <Spinner />
          {__("Reading your Google Business Profiles…", "foundhint-local-seo")}
        </p>
      </>,
    );
  }

  if (!started && (syncState.isError || !listings.length)) {
    return frame(
      <>
        {heading(title, intro)}
        <p
          role="alert"
          className="fhint:m-0 fhint:mb-5 fhint:text-[14px] fhint:font-semibold fhint:text-destructive"
        >
          {syncState.isError
            ? errorMessage(syncState.error)
            : __(
                "Google returned no Business Profiles for this account. Check you signed in with the account that manages your listing.",
                "foundhint-local-seo",
              )}
        </p>
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-4">
          <button type="button" onClick={() => syncProfiles()} className={pill}>
            {__("Try again", "foundhint-local-seo")}
          </button>
          <button
            type="button"
            onClick={() => leave("dismiss", "/business")}
            className="fhint:cursor-pointer fhint:border-0 fhint:bg-transparent fhint:p-0 fhint:text-[13.5px] fhint:font-bold fhint:underline"
          >
            {__("Enter my details myself", "foundhint-local-seo")}
          </button>
        </div>
      </>,
    );
  }

  return frame(
    <>
      {heading(title, intro)}

      {!started && listings.length > 1 ? (
        <fieldset className="fhint:m-0 fhint:mb-6 fhint:grid fhint:gap-2 fhint:border-0 fhint:p-0">
          <legend className="fhint:mb-2 fhint:p-0 fhint:text-[14px] fhint:font-extrabold">
            {__(
              "Which Business Profile is this website for?",
              "foundhint-local-seo",
            )}
          </legend>
          {listings.map((listing) => (
            <label
              key={listing.location_name}
              className={cn(
                "fhint:flex fhint:cursor-pointer fhint:items-start fhint:gap-3 fhint:border fhint:bg-card fhint:px-4 fhint:py-3",
                selected === listing.location_name
                  ? "fhint:border-primary"
                  : "fhint:border-border",
              )}
            >
              <input
                type="radio"
                name={groupId}
                value={listing.location_name}
                checked={selected === listing.location_name}
                onChange={() => setChosen(listing.location_name)}
                className="fhint:mt-1 fhint:accent-primary"
              />
              <span className="fhint:grid fhint:gap-0.5">
                <span className="fhint:text-[14.5px] fhint:font-extrabold">
                  {listing.title}
                </span>
                {listing.address ? (
                  <span className="fhint:text-[13px] fhint:text-muted-strong">
                    {listing.address}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {!started && listings.length === 1 ? (
        <p className="fhint:m-0 fhint:mb-6 fhint:border fhint:border-border fhint:bg-card fhint:px-4 fhint:py-3 fhint:text-[14px]">
          <strong className="fhint:block fhint:font-extrabold">
            {listings[0].title}
          </strong>
          <span className="fhint:text-[13px] fhint:text-muted-strong">
            {listings[0].address}
          </span>
        </p>
      ) : null}

      <div className="fhint:mb-6 fhint:border fhint:border-border fhint:bg-card fhint:px-6 fhint:py-6">
        <div
          role="progressbar"
          aria-label={__("Import progress", "foundhint-local-seo")}
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={settled}
          aria-valuetext={sprintf(
            /* translators: 1: steps finished, 2: steps in all. */
            __("%1$d of %2$d steps done", "foundhint-local-seo"),
            settled,
            steps.length,
          )}
          className="fhint:mb-4 fhint:h-1.5 fhint:w-full fhint:bg-[#eae7e7]"
        >
          <div
            className="fhint:h-full fhint:bg-primary fhint:transition-[width] fhint:duration-300"
            style={{ width: `${(settled / steps.length) * 100}%` }}
          />
        </div>
        <ul className="fhint:m-0 fhint:grid fhint:list-none fhint:gap-3.5 fhint:p-0">
          {steps.map((step) => {
            const state = progress[step.id] ?? "waiting";

            return (
              <li
                key={step.id}
                className="fhint:m-0 fhint:flex fhint:items-center fhint:gap-3"
              >
                <Box state={state} />
                <span className="fhint:min-w-0 fhint:flex-1 fhint:text-[15px] fhint:font-extrabold">
                  {STEP_LABELS[step.id]?.() ?? step.id}
                </span>
                <span
                  className={cn(
                    "fhint:text-[13.5px]",
                    state === "failed"
                      ? "fhint:font-bold fhint:text-destructive"
                      : "fhint:text-muted-strong",
                  )}
                >
                  {started ? STATUS[state]?.() : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div aria-live="polite">
        {failure ? (
          <p
            role="alert"
            className="fhint:m-0 fhint:mb-4 fhint:text-[14px] fhint:font-semibold fhint:text-destructive"
          >
            {failure}
          </p>
        ) : null}
      </div>

      {phase === "finished" ? (
        <button
          type="button"
          onClick={() =>
            leave(
              "finish",
              locationId ? `/business?location=${locationId}` : "/business",
            )
          }
          className={pill}
        >
          {__("Review imported details", "foundhint-local-seo")}
        </button>
      ) : (
        <button
          type="button"
          onClick={run}
          disabled={phase === "running" || !selected}
          className={pill}
        >
          {phase === "running"
            ? __("Importing…", "foundhint-local-seo")
            : phase === "stopped"
              ? __("Try again", "foundhint-local-seo")
              : __("Import from Google", "foundhint-local-seo")}
        </button>
      )}
    </>,
  );
}
