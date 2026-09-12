import { __ } from "@wordpress/i18n";
import { useNavigate } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetOnboardingQuery,
  useMoveOnboardingMutation,
} from "@/store/api/onboardingApi";
import BusinessStep from "./components/BusinessStep";
import DoneStep from "./components/DoneStep";
import HoursStep from "./components/HoursStep";
import LocationStep from "./components/LocationStep";
import ServicesStep from "./components/ServicesStep";
import WelcomeStep from "./components/WelcomeStep";
import WizardShell from "./components/WizardShell";

/**
 * Guided setup.
 *
 * The position lives on the server (GET/PUT /onboarding) so it follows the
 * operator between browsers and users, and every value the steps collect
 * goes through the ordinary resource endpoints. Nothing here writes
 * content, which is what makes "start over" safe.
 */
const STEP_COPY = {
  welcome: {
    title: () => __("Make sure customers find you", "found-hint"),
    intro: () => "",
  },
  business: {
    title: () => __("Tell us about your business", "found-hint"),
    intro: () =>
      __(
        "This is what search engines read and what customers see. You only enter it once — everything else in FoundHint reads from here.",
        "found-hint",
      ),
  },
  location: {
    title: () => __("Where do customers find you?", "found-hint"),
    intro: () =>
      __(
        "The address people visit. It is what puts you on the map.",
        "found-hint",
      ),
  },
  hours: {
    title: () => __("When are you open?", "found-hint"),
    intro: () =>
      __(
        "Leave a day as Not set if you would rather not say — that is different from being closed, and it publishes nothing.",
        "found-hint",
      ),
  },
  services: {
    title: () => __("What do you offer?", "found-hint"),
    intro: () =>
      __(
        "A short list is enough to start. You can add prices and details later.",
        "found-hint",
      ),
  },
  done: {
    title: () => __("You are set up", "found-hint"),
    intro: () =>
      __("Here is what your site now knows about your business.", "found-hint"),
  },
};

const STEP_LABELS = {
  welcome: () => __("Welcome", "found-hint"),
  business: () => __("Business", "found-hint"),
  location: () => __("Address", "found-hint"),
  hours: () => __("Hours", "found-hint"),
  services: () => __("Services", "found-hint"),
  done: () => __("Finish", "found-hint"),
};

export default function SetupPage() {
  const navigate = useNavigate();
  const { data: state, isLoading } = useGetOnboardingQuery();
  const [move] = useMoveOnboardingMutation();

  if (isLoading || !state) {
    return <Skeleton className="fhint:h-[70vh] fhint:w-full" />;
  }

  const current = state.current;
  const steps = state.steps.map((step) => ({
    ...step,
    label: STEP_LABELS[step.id] ? STEP_LABELS[step.id]() : step.id,
  }));

  const go = (step) => move({ action: "go", step });
  const complete = (step) => move({ action: "complete", step });
  const skip = (step) => move({ action: "skip", step });

  const leave = async (action) => {
    await move({ action });
    navigate("/");
  };

  const back = () => {
    if (state.previous_step) {
      go(state.previous_step);
    }
  };

  const stepIndex = steps.findIndex((step) => step.id === current);

  return (
    <WizardShell
      stepId={current}
      stepNumber={stepIndex + 1}
      totalSteps={steps.length}
      steps={steps}
      title={STEP_COPY[current]?.title() ?? ""}
      intro={STEP_COPY[current]?.intro() ?? ""}
      onDismiss={() => leave("dismiss")}
    >
      {current === "welcome" ? (
        <WelcomeStep
          onStart={() => complete("welcome")}
          onSkipToDashboard={() => leave("dismiss")}
        />
      ) : null}

      {current === "business" ? (
        <BusinessStep
          onDone={() => complete("business")}
          onBack={back}
          onSkip={() => skip("business")}
        />
      ) : null}

      {current === "location" ? (
        <LocationStep
          onDone={() => complete("location")}
          onBack={back}
          onSkip={() => skip("location")}
        />
      ) : null}

      {current === "hours" ? (
        <HoursStep
          onDone={() => complete("hours")}
          onBack={back}
          onSkip={() => skip("hours")}
        />
      ) : null}

      {current === "services" ? (
        <ServicesStep
          onDone={() => complete("services")}
          onBack={back}
          onSkip={() => skip("services")}
        />
      ) : null}

      {current === "done" ? (
        <DoneStep
          steps={steps}
          onFinish={() => leave("finish")}
          onBack={back}
        />
      ) : null}
    </WizardShell>
  );
}
