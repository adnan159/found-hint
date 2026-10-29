import { useEffect, useRef, useState } from "react";
import { usePreviewSchemaMutation } from "@/store/api/schemaManagerApi";

const DELAY = 400;

/**
 * The JSON-LD preview, built by the server: from the saved settings, or from
 * the unsaved draft while there is one. Rebuilt 400 ms after the last change,
 * and again whenever the saved state comes back.
 *
 * A draft the server refuses keeps the last good preview on screen.
 *
 * @param {Object}  options
 * @param {string}  options.entity `business`, `location` or `service`.
 * @param {number}  [options.id]   The location or service.
 * @param {number}  [options.list] The service list (location) in view.
 * @param {Object}  options.draft  Unsaved changes.
 * @param {boolean} options.dirty  Whether there are any.
 * @param {Object}  options.state  The saved state; a new one rebuilds.
 * @param {boolean} options.skip   Build nothing (locked, nothing chosen).
 * @return {{document: ?Object, result: ?Object, loading: boolean,
 *           clear: Function}} `result` is the whole response (a
 *           service's resolved page and warnings ride along).
 */
export default function useSchemaPreview({
  entity,
  id,
  list,
  draft,
  dirty,
  state,
  skip,
}) {
  const [preview, { isLoading }] = usePreviewSchemaMutation();
  const [built, setBuilt] = useState(null);
  const timer = useRef(0);

  useEffect(() => {
    if (skip) {
      return undefined;
    }

    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try {
        setBuilt(
          await preview({
            entity,
            ...(id === undefined ? {} : { id }),
            ...(list === undefined ? {} : { list }),
            draft: dirty ? draft : {},
          }).unwrap(),
        );
      } catch {
        // Keep the last good preview.
      }
    }, DELAY);

    return () => window.clearTimeout(timer.current);
  }, [entity, id, list, draft, dirty, state, skip, preview]);

  return {
    document: built?.document ?? null,
    result: built,
    loading: isLoading,
    clear: () => setBuilt(null),
  };
}
