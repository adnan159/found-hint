import { useMemo } from "react";
import { __ } from "@wordpress/i18n";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import { hasPro } from "@/lib/pro";
import {
  useGetAutoReplyQuery,
  useSaveAutoReplyMutation,
} from "@/store/api/autoReplyApi";

/**
 * Auto-reply for the Reviews screen: its settings and counts, the switch
 * (which saves at once), a full save for the setup dialog, and which reviews
 * it answered. Without FoundHint Premium (`available` false) nothing is read.
 *
 * @return {Object}
 */
export function useAutoReply() {
  const available = hasPro("reviews.auto_reply");
  const { data, error } = useGetAutoReplyQuery(undefined, {
    skip: !available,
  });
  const [save, saveState] = useSaveAutoReplyMutation();
  const replied = useMemo(() => new Set(data?.replied_ids ?? []), [data]);

  const toggle = async (on) => {
    try {
      await save({ on }).unwrap();
      toast.success(
        on
          ? __(
              "Auto-reply is on. New reviews are checked every 10 minutes.",
              "foundhint-local-seo",
            )
          : __(
              "Auto-reply is paused. Nothing more is sent automatically.",
              "foundhint-local-seo",
            ),
      );
    } catch (caught) {
      toast.error(errorMessage(caught));
    }
  };

  return {
    available,
    state: data ?? null,
    error,
    toggle,
    // Resolves with the saved state, or throws the server's error.
    save: (changes) => save(changes).unwrap(),
    saving: saveState.isLoading,
    replied,
  };
}

export default useAutoReply;
