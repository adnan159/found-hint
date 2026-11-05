import { useState } from "react";
import { __ } from "@wordpress/i18n";
import { toast } from "sonner";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { hasPro } from "@/lib/pro";
import { useSchedulePostMutation } from "@/store/api/postScheduleApi";
import {
  useCreatePostMutation,
  useUnschedulePostMutation,
  useUpdatePostMutation,
} from "@/store/api/postsApi";
import {
  defaultScheduleAt,
  fieldsOf,
  formFromPost,
  initialWhen,
  savedMessage,
} from "../lib/composer";

/**
 * The composer's state and its save.
 *
 * A save is one or two requests. The post is always saved first (created or
 * updated, and sent when publishing). Then:
 * - Schedule: FoundHint Premium puts it on the schedule. Premium checks the
 *   time; if it refuses, the post stays saved as a draft and the error
 *   shows at the picker.
 * - Draft, for a post that was scheduled: it is taken off the schedule.
 *
 * Without Premium a post already scheduled can still be edited (it stays
 * queued) or turned back into a draft, but not given a new time.
 */
export default function useComposer({ post, locationName, onClose }) {
  const [savedId, setSavedId] = useState(post?.id ?? 0);
  const [form, setForm] = useState(() => formFromPost(post));
  const [when, setWhen] = useState(() => initialWhen(post));
  const [scheduleAt, setScheduleAt] = useState(
    () => post?.scheduled_local || defaultScheduleAt(),
  );
  const [reachable, setReachable] = useState(post?.media_reachable ?? true);
  const [create, createState] = useCreatePostMutation();
  const [update, updateState] = useUpdatePostMutation();
  const [schedule, scheduleState] = useSchedulePostMutation();
  const [unschedule, unscheduleState] = useUnschedulePostMutation();

  const requests = [createState, updateState, scheduleState, unscheduleState];
  const canSchedule = hasPro("posts.schedule");
  const wasScheduled = post?.status === "scheduled";
  const onGoogle = Boolean(post?.on_google);
  const isNew = !savedId;
  const saving = requests.some((request) => request.isLoading);
  const error = requests.find((request) => request.error)?.error;
  const errors = fieldErrors(error);
  const generalError =
    error && !Object.keys(errors).length ? errorMessage(error) : "";
  // A new post saved but then refused — by Google, or by the schedule.
  const keptAs = scheduleState.error
    ? wasScheduled
      ? __(
          "Your changes are saved, and it still goes out at its earlier time.",
          "foundhint-local-seo",
        )
      : __(
          "It is saved as a draft and is not scheduled yet.",
          "foundhint-local-seo",
        )
    : generalError && savedId && !post?.id
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
      const id = await save(onGoogle || when === "now");

      if (!onGoogle && when === "schedule" && canSchedule) {
        await schedule({ id, scheduledAt: scheduleAt }).unwrap();
      }

      if (!onGoogle && when === "draft" && wasScheduled) {
        await unschedule({ id }).unwrap();
      }

      toast.success(savedMessage({ onGoogle, when, scheduleAt, canSchedule }));
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
    scheduleAt,
    setScheduleAt: (next) => {
      reset();
      setScheduleAt(next);
    },
    canSchedule,
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
