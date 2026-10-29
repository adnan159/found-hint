import { useCallback, useEffect, useRef, useState } from "react";
import { useLocationSelection } from "@/context/SelectedLocation";

/**
 * Unsaved edits on the open tab, and the Save / Discard / Stay question
 * asked before anything would drop them: another tab, another location in
 * the bar, another service.
 *
 * The open tab reports its edits through `onDirtyChange` and hands over its
 * own `save()` and `discard()` on `saveRef`.
 *
 * @param {Object}   options
 * @param {Function} options.go     Open a tab by key.
 * @param {Function} options.choose Switch the location bar.
 */
export default function useUnsavedGuard({ go, choose }) {
  const [dirty, setDirty] = useState(false);
  // What waits on the answer: a tab key, `{ location }` or `{ run }`.
  const [pending, setPending] = useState(null);
  // Read inside callbacks that outlive a render.
  const dirtyRef = useRef(false);
  const saveRef = useRef(null);
  const { registerGuard } = useLocationSelection();

  const onDirtyChange = useCallback((next) => {
    dirtyRef.current = next;
    setDirty(next);
  }, []);

  // A switch in the bar with unsaved changes waits for the answer.
  useEffect(
    () =>
      registerGuard((id) => {
        if (!dirtyRef.current) {
          return true;
        }

        setPending({ location: id });

        return false;
      }),
    [registerGuard],
  );

  // Anything else that would drop unsaved work (another service, a new
  // one) waits the same way.
  const guard = (run) => {
    if (dirtyRef.current) {
      setPending({ run });
      return;
    }

    run();
  };

  const pickTab = (key) => {
    if (dirty) {
      setPending(key);
      return;
    }

    go(key);
  };

  // Saved or discarded: carry on with what was asked for.
  const resolve = () => {
    if (pending && typeof pending === "object") {
      dirtyRef.current = false;

      if (pending.run) {
        pending.run();
      } else {
        choose(pending.location);
      }
    } else if (pending) {
      go(pending);
    }

    setPending(null);
  };

  return {
    dirty,
    onDirtyChange,
    saveRef,
    guard,
    pickTab,
    asking: Boolean(pending),
    stay: () => setPending(null),
    discard: () => {
      saveRef.current?.discard();
      resolve();
    },
    save: async () => {
      await saveRef.current?.save();
      resolve();
    },
  };
}
