import { useMemo } from "react";
import { hasPro } from "@/lib/pro";
import {
  useDeleteReviewTemplateMutation,
  useGetReviewTemplatesQuery,
  useSaveReviewTemplateMutation,
} from "@/store/api/reviewTemplatesApi";
import { sampleTemplates } from "../lib/templates";

/**
 * The reply templates for the card and the reply dialog.
 *
 * With FoundHint Premium serving `reviews.templates`: the owner's own,
 * editable. Without it: the sample set, as a read-only preview.
 *
 * @return {{templates: Object[], editable: boolean, loading: boolean,
 *           error: *, save: Function, remove: Function, saving: boolean}}
 */
export function useTemplates() {
  const editable = hasPro("reviews.templates");
  const samples = useMemo(() => sampleTemplates(), []);
  const { data, isLoading, error } = useGetReviewTemplatesQuery(undefined, {
    skip: !editable,
  });
  const [saveTemplate, saveState] = useSaveReviewTemplateMutation();
  const [deleteTemplate, deleteState] = useDeleteReviewTemplateMutation();

  return {
    templates: editable ? (data ?? []) : samples,
    editable,
    loading: editable && isLoading,
    error,
    // Both resolve with the result and throw the server's error, so the
    // dialog can put each field's message under its input.
    save: (template) => saveTemplate(template).unwrap(),
    remove: (id) => deleteTemplate(id).unwrap(),
    saving: saveState.isLoading || deleteState.isLoading,
  };
}

export default useTemplates;
