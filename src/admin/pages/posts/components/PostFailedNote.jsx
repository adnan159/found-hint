import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { RotateCwIcon } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import { dialogButton } from "@/pages/schema/components/styles";
import { usePublishPostMutation } from "@/store/api/postsApi";

/**
 * Why a post is not on Google, in words, with Retry for one Google did not
 * take. A rejected post — refused after Google checked it — cannot be
 * retried as it is, so it has no button.
 *
 * @param {Object} props
 * @param {Object} props.post A failed or rejected post.
 */
export function PostFailedNote({ post }) {
  const [retry, { isLoading: retrying }] = usePublishPostMutation();

  const onRetry = async () => {
    try {
      await retry({ id: post.id }).unwrap();
      toast.success(
        __("Your post was published on Google.", "foundhint-local-seo"),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div
      role="alert"
      className="fhint:mt-1 fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:bg-destructive-tint fhint:px-3.5 fhint:py-2.5 fhint:text-sm fhint:text-destructive"
    >
      <span className="fhint:min-w-0 fhint:flex-1">
        {post.status === "rejected"
          ? __(
              "Google rejected this post after checking it.",
              "foundhint-local-seo",
            )
          : __(
              "Google did not take this post. It is saved here, so you can try again.",
              "foundhint-local-seo",
            )}
        {post.error ? ` ${post.error}` : ""}
      </span>
      {post.status === "failed" ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className={cn(dialogButton, "fhint:bg-card")}
        >
          <RotateCwIcon
            aria-hidden="true"
            className={cn("fhint:size-3.5", retrying && "fhint:animate-spin")}
          />
          {retrying
            ? __("Trying…", "foundhint-local-seo")
            : __("Retry", "foundhint-local-seo")}
        </button>
      ) : null}
    </div>
  );
}

export default PostFailedNote;
