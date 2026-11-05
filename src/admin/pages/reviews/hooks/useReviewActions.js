import { useState } from "react";
import { _n, sprintf } from "@wordpress/i18n";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import {
  useLazyGetReviewsQuery,
  useSyncReviewsMutation,
} from "@/store/api/reviewsApi";
import { downloadCsv, toCsv } from "../lib/csv";

/**
 * What the Reviews screen can do with its list: read the latest reviews
 * from Google, and export every review that matches the filters.
 *
 * Sync is the one action here that contacts Google — it costs a request
 * against a quota every site shares.
 *
 * @param {Object} options
 * @param {string} options.locationName The Google listing to sync.
 * @param {Object} options.query        The filters, as the API takes them.
 */
export function useReviewActions({ locationName, query }) {
  const [exporting, setExporting] = useState(false);
  const [fetchAll] = useLazyGetReviewsQuery();
  const [sync, { isLoading: syncing, error: syncError }] =
    useSyncReviewsMutation();

  const onSync = async () => {
    try {
      const result = await sync({ locationName }).unwrap();
      const read = result?.synced?.reviews ?? 0;

      toast.success(
        sprintf(
          /* translators: %d: number of reviews read from Google. */
          _n(
            "Read %d review from Google.",
            "Read %d reviews from Google.",
            read,
            "foundhint-local-seo",
          ),
          read,
        ),
      );
    } catch {
      // Shown by RequestError on the page; a toast would say it twice.
    }
  };

  const onExport = async () => {
    setExporting(true);

    try {
      const all = await fetchAll({ ...query, perPage: 0, offset: 0 }).unwrap();

      downloadCsv(
        `reviews-${new Date().toISOString().slice(0, 10)}.csv`,
        toCsv(all.items),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  return { onSync, syncing, syncError, onExport, exporting };
}

export default useReviewActions;
