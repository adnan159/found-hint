import { __, sprintf } from "@wordpress/i18n";
import { CalendarXIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import { iconButton } from "@/pages/reviews/styles";
import {
  usePublishPostMutation,
  useUnschedulePostMutation,
} from "@/store/api/postsApi";

/**
 * A scheduled post's own actions, before Change and Delete: send it now,
 * or take it off the schedule (it becomes a draft). Both are free — a post
 * queued while Premium was active can always be sent or taken back.
 *
 * @param {Object} props
 * @param {Object} props.post
 * @param {string} props.name What to call the post to a screen reader.
 */
export function ScheduledActions({ post, name }) {
  const [publish, publishing] = usePublishPostMutation();
  const [unschedule, cancelling] = useUnschedulePostMutation();
  const busy = publishing.isLoading || cancelling.isLoading;

  const run = async (request, done) => {
    try {
      await request({ id: post.id }).unwrap();
      toast.success(done);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const actions = [
    {
      key: "publish",
      Icon: SendIcon,
      title: __("Publish now", "foundhint-local-seo"),
      /* translators: %s: the post's title or opening words. */
      label: __("Publish %s now", "foundhint-local-seo"),
      onClick: () =>
        run(
          publish,
          __("Your post was published on Google.", "foundhint-local-seo"),
        ),
    },
    {
      key: "cancel",
      Icon: CalendarXIcon,
      title: __("Cancel schedule", "foundhint-local-seo"),
      /* translators: %s: the post's title or opening words. */
      label: __("Cancel the schedule for %s", "foundhint-local-seo"),
      onClick: () =>
        run(
          unschedule,
          __(
            "Taken off the schedule. It is a draft now.",
            "foundhint-local-seo",
          ),
        ),
    },
  ];

  return actions.map(({ key, Icon, title, label, onClick }) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      disabled={busy}
      title={title}
      className={iconButton}
    >
      <Icon aria-hidden="true" className="fhint:size-3.5" />
      <span className="fhint:sr-only">{sprintf(label, name)}</span>
    </button>
  ));
}

export default ScheduledActions;
