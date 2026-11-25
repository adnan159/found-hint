import { useState } from "react";
import { __ } from "@wordpress/i18n";
import { toast } from "sonner";
import { errorMessage, fieldErrors } from "@/lib/errors";
import {
  useCreatePostMutation,
  useUpdatePostMutation,
} from "@/store/api/postsApi";
import {
  fieldsOf,
  formFromPost,
  initialWhen,
  savedMessage,
} from "../lib/composer";

/**
 * The composer's state and its save.
 *
 * One request: the post is created or updated, and sent to Google when
 * publishing. A draft stays on this site only.
 */
export default function useComposer({ post, locationName, onClose }) {
  const [savedId, setSavedId] = useState(post?.id ?? 0);
  const [form, setForm] = useState(() => formFromPost(post));
  const [when, setWhen] = useState(() => initialWhen(post));
  const [reachable, setReachable] = useState(post?.media_reachable ?? true);
  const [create, createState] = useCreatePostMutation();
  const [update, updateState] = useUpdatePostMutation();

  const requests = [createState, updateState];
  const onGoogle = Boolean(post?.on_google);
  const isNew = !savedId;
  const saving = requests.some((request) => request.isLoading);
  const error = requests.find((request) => request.error)?.error;
  const errors = fieldErrors(error);
  const generalError =
    error && !Object.keys(errors).length ? errorMessage(error) : "";
  // A new post saved but then refused by Google.
  const keptAs =
    generalError && savedId && !post?.id
      ? __(
          "Google did not take the post. It is saved here, so you can fix it and try again.",
          "foundhint-local-seo",
        )
      : "";

  const reset = () => requests.forEach((request) => request.reset());

  const set = (changes) => {
    reset();
    setForm((current) => ({ ...current, ...changes }));
  };

  const save = async (publish) => {
    if (!isNew) {
      await update({ id: savedId, ...fieldsOf(form), publish }).unwrap();

      return savedId;
    }

    const stored = await create({
      ...fieldsOf(form),
      source: form.source,
      source_ref: form.source_ref,
      locationName,
      publish,
    }).unwrap();

    setSavedId(stored?.id ?? 0);

    return stored?.id;
  };

  const submit = async (event) => {
    event?.preventDefault();

    try {
      await save(onGoogle || when === "now");

      toast.success(savedMessage({ onGoogle, when }));
      onClose();
    } catch (failure) {
      // A new post Google refused is still saved, as failed: carry on
      // editing that one, so pressing Publish again does not make a copy.
      const stored = failure?.data?.data?.post_id;

      if (isNew && stored) {
        setSavedId(stored);
      }
    }
  };

  // A photo chosen in the photo field.
  const onPhoto = ({ media_url, attachment_id, reachable, viaGallery }) => {
    setReachable(reachable);
    set({ media_url, attachment_id });

    if (viaGallery) {
      toast.success(
        __(
          "The photo was added to your Google profile's Photos, and this post uses it from there.",
          "foundhint-local-seo",
        ),
      );
    }
  };

  return {
    onPhoto,
    form,
    set,
    when,
    setWhen: (next) => {
      reset();
      setWhen(next);
    },
    reachable,
    setReachable,
    onGoogle,
    isNew,
    saving,
    errors,
    requestError: generalError,
    keptAs,
    submit,
  };
}
