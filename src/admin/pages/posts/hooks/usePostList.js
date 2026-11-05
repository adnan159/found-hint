import { useEffect, useState } from "react";
import { _n, sprintf } from "@wordpress/i18n";
import { toast } from "sonner";
import useSelectedLocation from "@/hooks/useSelectedLocation";
import {
  useGetPostStateQuery,
  useGetPostsQuery,
  useSyncPostsMutation,
} from "@/store/api/postsApi";

export const NO_FILTERS = {
  type: "",
  status: "",
  days: "0",
  source: "",
  sort: "new",
};

/**
 * The posts for the location chosen in the bar at the top: which Google
 * listing that is, its state (blog posts, recent 5-star reviews), the
 * filters, the page of stored posts, and reading posts from Google.
 *
 * Only `onSync` contacts Google; everything else reads stored rows.
 */
export function usePostList() {
  const { current, ready } = useSelectedLocation();
  const [filters, setFilters] = useState(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Which Google listing belongs to the location in the bar.
  const { data: allState } = useGetPostStateQuery({ locationName: "" });
  const listings = allState?.locations ?? [];
  const listing =
    current && listings.find((item) => item.location_id === current.id);
  const locationName = listing ? listing.location_name : "";

  const { data: state } = useGetPostStateQuery(
    { locationName },
    { skip: !locationName },
  );

  // A new location or new filters start again at page 1.
  useEffect(() => {
    setPage(1);
  }, [locationName, filters, perPage]);

  const {
    currentData: listData,
    isFetching,
    error: listError,
  } = useGetPostsQuery(
    {
      locationName,
      type: filters.type,
      status: filters.status,
      source: filters.source,
      days: Number(filters.days),
      sort: filters.sort,
      perPage,
      offset: (page - 1) * perPage,
    },
    { skip: !locationName },
  );
  const [sync, { isLoading: syncing, error: syncError }] =
    useSyncPostsMutation();

  const total = listData?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));

  // A page past the end — after the last post on it was filtered away.
  useEffect(() => {
    if (page > pages) {
      setPage(pages);
    }
  }, [page, pages]);

  const onSync = async () => {
    try {
      const result = await sync({ locationName }).unwrap();
      const read = result?.posts ?? 0;

      toast.success(
        sprintf(
          /* translators: %d: number of posts read from Google. */
          _n(
            "Read %d post from Google.",
            "Read %d posts from Google.",
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

  return {
    ready,
    listing,
    locationName,
    state,
    filters,
    setFilters,
    filtered: Boolean(
      filters.type || filters.status || filters.source || filters.days !== "0",
    ),
    page,
    setPage,
    perPage,
    setPerPage,
    pages,
    total,
    from: total ? (page - 1) * perPage + 1 : 0,
    to: Math.min(total, page * perPage),
    items: listData?.items ?? [],
    counts: listData?.counts,
    loaded: Boolean(listData),
    isFetching,
    error: listError ?? syncError,
    onSync,
    syncing,
    noLocations: Boolean(allState) && !listings.length,
    noListing: ready && Boolean(allState) && listings.length > 0 && !listing,
  };
}

export default usePostList;
