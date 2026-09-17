import { useEffect, useRef, useState } from "react";
import { __ } from "@wordpress/i18n";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import RequestError from "@/components/RequestError";
import logoUrl from "@/assets/foundhint-icon.png";
import { useGetGoogleQuery } from "@/store/api/googleApi";
import useGoogleConnect from "@/hooks/useGoogleConnect";
import {
  useGetOnboardingQuery,
  useMoveOnboardingMutation,
} from "@/store/api/onboardingApi";

/**
 * The first-run introduction, on the dashboard.
 *
 * Copy and measurements are the prototype's welcome and decision screens:
 * a 56px mark, an 11px/800 eyebrow tracked at .16em, a 44px heading with
 * -0.03em tracking over 15ch, and two option cards under a 4px top rule —
 * orange for the Google route, near-black for the other.
 *
 * **On a fresh site this is the whole dashboard**, not a banner above it:
 * there is no score to read and nothing to summarise, so a screen of empty
 * cards would only bury the one thing worth doing. Skipping dismisses it
 * through the onboarding position store — which already exists for exactly
 * this and survives a reload — and the ordinary dashboard appears.
 *
 * Because it is the page, its heading is the page's `h1` and takes focus
 * when the step changes, the same contract `PageHeader` keeps elsewhere:
 * in a hash-routed app the browser moves focus for nobody.
 */
const PROMISE = [
  {
    step: () => __("BUILD", "found-hint"),
    title: () => __("Your details, once", "found-hint"),
    body: () =>
      __("Name, address, hours and services live in one place.", "found-hint"),
  },
  {
    step: () => __("CONNECT", "found-hint"),
    title: () => __("Link Google", "found-hint"),
    body: () =>
      __("See exactly how Google shows your business today.", "found-hint"),
  },
  {
    step: () => __("OPTIMIZE", "found-hint"),
    title: () => __("Fix what matters", "found-hint"),
    body: () =>
      __("A short list of problems, most important first.", "found-hint"),
  },
  {
    step: () => __("TRACK", "found-hint"),
    title: () => __("Watch it improve", "found-hint"),
    body: () =>
      __("See where you appear when people search nearby.", "found-hint"),
  },
];

/** Where Google sends someone to create a profile. */
const GOOGLE_CREATE_URL = "https://business.google.com/create";

function Welcome({ onStart, onSkip, isSkipping, headingRef }) {
  return (
    <>
      <div className="fhint:border fhint:border-border fhint:bg-card">
        <div className="fhint:border-b-2 fhint:border-b-divider fhint:px-11 fhint:pt-11 fhint:pb-9">
          <img
            src={logoUrl}
            alt=""
            aria-hidden="true"
            width={56}
            height={56}
            className="fhint:mb-5 fhint:size-14"
          />
          <div className="fhint:mb-2.5 fhint:text-[11px] fhint:font-extrabold fhint:tracking-[0.16em] fhint:text-muted-foreground fhint:uppercase">
            {__("Welcome to FoundHint", "found-hint")}
          </div>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="fhint:m-0 fhint:mb-3.5 fhint:max-w-[15ch] fhint:font-heading fhint:text-[44px] fhint:leading-[1.02] fhint:font-extrabold fhint:tracking-[-0.03em] fhint:outline-none"
          >
            {__("Make sure customers find you", "found-hint")}
          </h1>
          <p className="fhint:mb-6 fhint:max-w-[58ch] fhint:text-[16.5px] fhint:leading-[1.5] fhint:text-foreground-soft">
            {__(
              "Set up your business details, connect your Google Business Profile, fix what is holding you back, and see where you show up when people search nearby — all from one place.",
              "found-hint",
            )}
          </p>
          <div className="fhint:flex fhint:flex-wrap fhint:gap-2.5">
            <Button
              type="button"
              onClick={onStart}
              className="fhint:h-auto fhint:px-[22px] fhint:py-[13px] fhint:text-[15px] fhint:font-extrabold"
            >
              {__("Get started", "found-hint")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onSkip}
              disabled={isSkipping}
              className="fhint:h-auto fhint:border-foreground fhint:px-[22px] fhint:py-[13px] fhint:text-[15px] fhint:font-extrabold"
            >
              {isSkipping ? <Spinner data-icon="inline-start" /> : null}
              {__("Skip to dashboard", "found-hint")}
            </Button>
          </div>
        </div>

        {/* One-pixel gaps in a grid the colour of the border, which is how
            the prototype draws these four panels. */}
        <div className="fhint:grid fhint:gap-px fhint:bg-border fhint:[grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          {PROMISE.map((item) => (
            <div key={item.step()} className="fhint:bg-card fhint:p-5">
              <div className="fhint:mb-2 fhint:text-[11px] fhint:font-extrabold fhint:tracking-[0.14em] fhint:text-primary">
                {item.step()}
              </div>
              <div className="fhint:mb-1 fhint:text-[14.5px] fhint:font-extrabold">
                {item.title()}
              </div>
              <div className="fhint:text-[13px] fhint:leading-[1.45] fhint:text-muted-strong">
                {item.body()}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="fhint:mt-3.5 fhint:text-[12.5px] fhint:text-muted-foreground">
        {__(
          "Takes about 5 minutes. You can change anything later.",
          "found-hint",
        )}
      </p>
    </>
  );
}

function OptionCard({ accent, label, title, body, points, action }) {
  return (
    <div
      className={`fhint:flex fhint:flex-col fhint:border fhint:border-border fhint:border-t-4 fhint:bg-card fhint:p-[26px] ${accent}`}
    >
      <div className="fhint:mb-2.5 fhint:text-[11px] fhint:font-extrabold fhint:tracking-[0.14em] fhint:text-muted-foreground fhint:uppercase">
        {label}
      </div>
      <h3 className="fhint:m-0 fhint:mb-2.5 fhint:font-heading fhint:text-[21px] fhint:font-extrabold">
        {title}
      </h3>
      <p className="fhint:mb-4.5 fhint:text-[14px] fhint:leading-[1.5] fhint:text-muted-strong">
        {body}
      </p>
      <ul className="fhint:mb-5.5 fhint:grid fhint:list-none fhint:gap-[7px] fhint:p-0 fhint:text-[13.5px] fhint:text-foreground-soft">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <div className="fhint:mt-auto">{action}</div>
    </div>
  );
}

function Decision({ onConnect, isConnecting, headingRef }) {
  return (
    <div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="fhint:m-0 fhint:mb-2 fhint:font-heading fhint:text-[30px] fhint:font-extrabold fhint:tracking-[-0.02em] fhint:outline-none"
      >
        {__("Do you already have a Google Business Profile?", "found-hint")}
      </h1>
      <p className="fhint:mb-6 fhint:max-w-[62ch] fhint:text-[15px] fhint:text-muted-strong">
        {__(
          "A Google Business Profile is the business listing that shows up on Google Search and Google Maps — with your hours, phone number and reviews. If you are not sure, choose No and we will help you prepare one.",
          "found-hint",
        )}
      </p>

      <div className="fhint:grid fhint:gap-[18px] fhint:[grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        <OptionCard
          accent="fhint:border-t-primary"
          label={__("Option A", "found-hint")}
          title={__("Yes, I have a Google Business Profile", "found-hint")}
          body={__(
            "Connect it and we will bring your business name, address, hours and services into FoundHint so you do not have to type them twice.",
            "found-hint",
          )}
          points={[
            __("Import your existing details", "found-hint"),
            __("Compare Google with your website", "found-hint"),
            __("Keep both in step from here on", "found-hint"),
          ]}
          action={
            <GoogleSignInButton
              onClick={onConnect}
              disabled={isConnecting}
              isBusy={isConnecting}
            />
          }
        />

        <OptionCard
          accent="fhint:border-t-foreground"
          label={__("Option B", "found-hint")}
          title={__("No, I don't have one", "found-hint")}
          body={__(
            "Fill in your business details here first. We will get everything ready so you can create your Google Business Profile afterwards without repeating yourself.",
            "found-hint",
          )}
          points={[
            __("Creating one on Google is free", "found-hint"),
            __("Your details power your website too", "found-hint"),
            __("Connect Google whenever you are ready", "found-hint"),
          ]}
          action={
            <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3">
              {/* Google's own page, in a new tab: this leaves FoundHint, and
                  losing the admin screen mid-setup would be worse than a
                  second tab. */}
              <Button
                variant="outline"
                className="fhint:h-auto fhint:border-foreground fhint:px-[18px] fhint:py-3 fhint:text-[14.5px] fhint:font-extrabold"
                render={
                  <a
                    href={GOOGLE_CREATE_URL}
                    target="_blank"
                    rel="noreferrer noopener"
                  />
                }
              >
                {__("Create one on Google", "found-hint")}
              </Button>
              <Link
                to="/business"
                className="fhint:text-[13px] fhint:font-extrabold fhint:text-link-accent fhint:no-underline fhint:hover:underline"
              >
                {__("Fill in my business details", "found-hint")}
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );
}

/**
 * Whether the dashboard should be this introduction instead.
 *
 * Exported so the dashboard can decide *before* rendering: it needs to know
 * whether to build a screen of cards at all, and a component that hid
 * itself would leave the empty dashboard behind it.
 *
 * @param {Object} business The business record, or null.
 * @return {{show: boolean, isLoading: boolean}} What to render.
 */
export function useGetStartedState(business) {
  const { data: onboarding, isLoading: loadingOnboarding } =
    useGetOnboardingQuery();
  const { data: google, isLoading: loadingGoogle } = useGetGoogleQuery();

  const connected =
    google?.status === "connected" || google?.status === "needs_reconnect";

  return {
    isLoading: loadingOnboarding || loadingGoogle,
    // A fresh site: nothing entered, no Google, and not already dismissed.
    show: Boolean(onboarding?.is_open) && !connected && !business?.name,
  };
}

export function GetStarted() {
  const [move, { isLoading: isSkipping }] = useMoveOnboardingMutation();
  const { connect, isConnecting, error } = useGoogleConnect();

  const [step, setStep] = useState("welcome");
  const headingRef = useRef(null);

  // Focus follows the step, because this is the page: without it a keyboard
  // or screen-reader user presses "Get started" and is left where they were,
  // with the question they are being asked somewhere above them.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  return (
    <section aria-label={__("Getting started", "found-hint")}>
      <RequestError
        error={error}
        title={__("Could not start the Google sign-in", "found-hint")}
      />

      {step === "welcome" ? (
        <Welcome
          onStart={() => setStep("decision")}
          onSkip={() => move({ action: "dismiss" })}
          isSkipping={isSkipping}
          headingRef={headingRef}
        />
      ) : (
        <Decision
          onConnect={connect}
          isConnecting={isConnecting}
          headingRef={headingRef}
        />
      )}
    </section>
  );
}

export default GetStarted;
