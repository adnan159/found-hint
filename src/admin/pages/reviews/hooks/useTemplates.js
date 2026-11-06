import { hasPro } from "@/lib/pro";
import {
  useDeleteReviewTemplateMutation,
  useGetReviewTemplatesQuery,
  useSaveReviewTemplateMutation,
} from "@/store/api/reviewTemplatesApi";

/**
 * One Google listing's reply templates, for the card and the reply dialog.
 *
 * With FoundHint Premium serving `reviews.templates`: the owner's own for
 * that listing, editable — each listing has its own. With no listing,
 * none. Without Premium: none — there are no sample templates.
 *
 * @param {string} locationName The Google listing, '' for none.
 * @return {{templates: Object[], editable: boolean, loading: boolean, error: *, save: Function, remove: Function,
 *           saving: boolean}}
 */
export function useTemplates(locationName = "") {
  const editable = hasPro("reviews.templates");
  const { data, isLoading, error } = useGetReviewTemplatesQuery(
    { locationName },
    { skip: !editable || !locationName },
  );
  const [saveTemplate, saveState] = useSaveReviewTemplateMutation();
  const [deleteTemplate, deleteState] = useDeleteReviewTemplateMutation();

  return {
    templates: editable && locationName ? (data ?? []) : [],
    editable,
    loading: editable && Boolean(locationName) && isLoading,
    error,
    // Both resolve with the result and throw the server's error, so the
    // dialog can put each field's message under its input. A new template
    // belongs to this listing; an existing one stays with its own.
    save: (template) =>
      saveTemplate(
        template.id ? template : { ...template, location_name: locationName },
      ).unwrap(),
    remove: (id) => deleteTemplate(id).unwrap(),
    saving: saveState.isLoading || deleteState.isLoading,
  };
}

export default useTemplates;
