import { useEffect, useRef, useState } from "react";
import {
  usePlanPublishMutation,
  useRunPublishStepMutation,
} from "@/store/api/profileApi";

/**
 * Checking what would be sent to Google, and then sending it.
 *
 * Mounting only *checks*: it asks what would be sent and sends nothing.
 * `send` is a second, explicit act, and each step reports as its own request
 * comes back — so a refusal on the second step is known against that step,
 * with the first already known to have landed.
 *
 * @param {number}   locationId The location being sent.
 * @param {Function} onSent     Called whenever something may have reached
 *                              Google, so the profile can be read again.
 */
export function usePublish(locationId, onSent) {
  const [plan, planState] = usePlanPublishMutation();
  const [runStep] = useRunPublishStepMutation();
  // step id -> "sending" | "done" | "failed"
  const [progress, setProgress] = useState({});
  const [failure, setFailure] = useState(null);
  const [running, setRunning] = useState(false);
  const asked = useRef(false);

  useEffect(() => {
    // Once per opening: a plan costs two reads of Google's quota.
    if (!asked.current) {
      asked.current = true;
      plan({ locationId });
    }
  }, [plan, locationId]);

  const steps = planState.data?.plan?.steps ?? [];
  const skipped = planState.data?.plan?.skipped ?? [];
  const listing = planState.data?.listing;
  const finished =
    steps.length > 0 && steps.every((step) => progress[step.id] === "done");

  const send = async () => {
    setRunning(true);
    setFailure(null);

    // In order and one at a time: Google refuses edits fired together.
    for (const step of steps) {
      if (progress[step.id] === "done") {
        continue;
      }

      setProgress((current) => ({ ...current, [step.id]: "sending" }));

      try {
        await runStep({
          step: step.id,
          token: step.token,
          locationId,
        }).unwrap();
        setProgress((current) => ({ ...current, [step.id]: "done" }));
      } catch (error) {
        setProgress((current) => ({ ...current, [step.id]: "failed" }));
        setFailure({ step: step.id, error });
        setRunning(false);
        onSent();

        return;
      }
    }

    setRunning(false);
    onSent();
  };

  const checkAgain = () => {
    setProgress({});
    setFailure(null);
    plan({ locationId });
  };

  const stale = failure?.error?.data?.code === "fhint_publish_stale";

  return {
    planState,
    steps,
    skipped,
    listing,
    progress,
    failure,
    running,
    finished,
    stale,
    send,
    checkAgain,
  };
}

export default usePublish;
