import { useEffect, useState } from "react";
import useSelectedLocation from "@/hooks/useSelectedLocation";
import {
  useGetReviewStateQuery,
  useGetReviewsQuery,
} from "@/store/api/reviewsApi";

export const NO_FILTERS = {
  rating: "0",
  replied: "",
  status: "all",
  search: "",
};

/**
 * The reviews for the location chosen in the bar at the top: which Google
 * listing that is, the filters, the page, and the page of stored reviews.
 *
 * Reads stored rows only — nothing here contacts Google.
 */
export function useReviewList() {
  const { current, ready } = useSelectedLocation();
  const [filters, setFilters] = useState(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Which Google listing belongs to the location in the bar.
  const { data: listingsState } = useGetReviewStateQuery({ locationName: "" });
  const listings = listingsState?.locations ?? [];
  const listing =
    current && listings.find((item) => item.location_id === current.id);
  const locationName = listing ? listing.location_name : "";

  // A new location or new filters start again at page 1.
  useEffect(() => {
    setPage(1);
  }, [locationName, filters, perPage]);

  // The filters as the API takes them, without paging: the export asks for
  // every match with the same query.
  const query = {
    locationName,
    rating: Number(filters.rating),
    replied: filters.replied,
    status: filters.status,
    search: filters.search,
  };

  const {
    currentData: listData,
    isFetching,
    error: listError,
  } = useGetReviewsQuery(
    { ...query, perPage, offset: (page - 1) * perPage },
    { skip: !locationName },
  );

  const total = listData?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));

  // A page past the end — after the last review on it was filtered away.
  useEffect(() => {
    if (page > pages) {
      setPage(pages);
    }
  }, [page, pages]);

  return {
    current,
    listing,
    listings,
    locationName,
    query,
    filters,
    setFilters,
    filtered: Boolean(
      filters.rating !== "0" ||
      filters.replied ||
      filters.status !== "all" ||
      filters.search,
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
    loaded: Boolean(listData),
    isFetching,
    listError,
    noLocations: Boolean(listingsState) && !listings.length,
    noListing:
      ready && Boolean(listingsState) && listings.length > 0 && !listing,
    ready,
  };
}

export default useReviewList;
