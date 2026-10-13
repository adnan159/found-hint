import { errorMessage, fieldErrors } from "@/lib/errors";
import { useSaveProfileSectionMutation } from "@/store/api/profileApi";
import { useEffect, useMemo, useState } from "react";
import { EDITABLE, fieldsFor, modelsFor, same } from "../model";

const omitKey = (id) => (current) => {
  const next = { ...current };

  delete next[id];

  return next;
};

/**
 * The profile's unsaved edits, and saving them.
 *
 * What the screen edits is `drafts`: only the sections that have been
 * touched. Everything else is read straight from the server's copy, so a
 * save elsewhere (or a refresh from Google) shows up without being asked.
 *
 * Every section is saved by its own request, so a refusal in one never costs
 * the changes made in another.
 *
 * @param {Object} sections   The server's copy of every section.
 * @param {number} locationId The location the edits belong to.
 */
export function useProfileDrafts(sections, locationId) {
  const [requestSave] = useSaveProfileSectionMutation();
  const [drafts, setDrafts] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [errors, setErrors] = useState({});

  const savedModels = useMemo(() => modelsFor(sections ?? {}), [sections]);

  const getModel = (id) => drafts[id] ?? savedModels[id];
  const dirtySections = EDITABLE.filter(
    (id) => id in drafts && !same(drafts[id], savedModels[id]),
  );
  const isDirty = dirtySections.length > 0;
  const isSaving = Object.values(saveStatus).includes("saving");

  // Leaving with unsaved edits is the one way to lose work here.
  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);

    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const getChangeHandler = (id) => (next) => {
    setDrafts((current) => ({ ...current, [id]: next }));
    setSaveStatus((current) => ({ ...current, [id]: undefined }));
  };

  // Where a section stands: "dirty", "saving", "saved", "error", or nothing.
  const getSectionState = (id) => {
    if (saveStatus[id] === "saving" || saveStatus[id] === "error") {
      return saveStatus[id];
    }

    if (dirtySections.includes(id)) {
      return "dirty";
    }

    return saveStatus[id];
  };

  const discardSection = (id) => {
    setDrafts(omitKey(id));
    setErrors(omitKey(id));
    setSaveStatus(omitKey(id));
  };

  const discardAllSections = () => {
    setDrafts({});
    setErrors({});
    setSaveStatus({});
  };

  // One section, one request: only the tab whose button was pressed is sent.
  const saveSection = async (id) => {
    setSaveStatus((current) => ({ ...current, [id]: "saving" }));

    try {
      await requestSave({
        section: id,
        fields: fieldsFor(id, drafts[id], savedModels[id]),
        locationId,
      }).unwrap();

      setDrafts(omitKey(id));
      setErrors(omitKey(id));
      setSaveStatus((current) => ({ ...current, [id]: "saved" }));
    } catch (failure) {
      setErrors((current) => ({
        ...current,
        [id]: {
          fields: fieldErrors(failure),
          message: errorMessage(failure),
        },
      }));
      setSaveStatus((current) => ({ ...current, [id]: "error" }));
    }
  };

  return {
    getModel,
    errors,
    isDirty,
    isSaving,
    getChangeHandler,
    getSectionState,
    saveSection,
    discardSection,
    discardAllSections,
  };
}

export default useProfileDrafts;
