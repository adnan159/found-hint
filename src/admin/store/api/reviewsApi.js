import { baseApi, withQuery } from "./baseApi";

/**
 * GET/POST /reviews.
 *
 * The two GETs read stored rows and never contact Google, so opening the
 * screen costs a database query. The sync and the reply calls are the only
 * ones that reach Google, and only because somebody pressed a button.
 *
 * Query strings go through withQuery(), which picks ? or & from the REST
 * root — a site on plain permalinks has one in its URL already, and a second
 * turns every request into a 404.
 */
export const reviewsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // One page of a location's reviews, filtered. `rating` 0 is any;
    // `replied` '' | 'replied' | 'not_replied'; `status` 'all' | 'live' |
    // 'edited' | 'removed' ('' leaves removed reviews out); `perPage` 0
    // returns every match, which is what the CSV export asks for.
    getReviews: builder.query({
      query: ({
        locationName = "",
        unanswered = false,
        rating = 0,
        replied = "",
        status = "",
        search = "",
        perPage = 20,
        offset = 0,
      } = {}) =>
        withQuery("/reviews", {
          location_name: locationName,
          unanswered: unanswered ? 1 : 0,
          rating,
          replied,
          status,
          search,
          per_page: perPage,
          offset,
        }),
      transformResponse: (response) => ({
        items: response?.data ?? [],
        total: response?.meta?.total ?? 0,
      }),
      providesTags: ["Reviews"],
    }),

    getReviewState: builder.query({
      query: ({ locationName = "" } = {}) =>
        withQuery("/reviews/state", { location_name: locationName }),
      transformResponse: (response) => response?.data ?? null,
      providesTags: ["Reviews"],
    }),

    syncReviews: builder.mutation({
      query: ({ locationName = "" } = {}) => ({
        url: "/reviews/sync",
        method: "POST",
        body: { location_name: locationName },
      }),
      transformResponse: (response) => ({
        synced: response?.data ?? null,
        state: response?.meta?.state ?? null,
      }),
      invalidatesTags: ["Reviews"],
    }),

    // Both reply calls change the review on Google, publicly, then here.
    // The list and the figures are refetched, so "Waiting on a reply"
    // moves with the change.
    saveReviewReply: builder.mutation({
      query: ({ reviewId, comment }) => ({
        url: `/reviews/${encodeURIComponent(reviewId)}/reply`,
        method: "PUT",
        body: { comment },
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Reviews"],
    }),

    deleteReviewReply: builder.mutation({
      query: ({ reviewId }) => ({
        url: `/reviews/${encodeURIComponent(reviewId)}/reply`,
        method: "DELETE",
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Reviews"],
    }),
  }),
});

export const {
  useGetReviewsQuery,
  useLazyGetReviewsQuery,
  useGetReviewStateQuery,
  useSyncReviewsMutation,
  useSaveReviewReplyMutation,
  useDeleteReviewReplyMutation,
} = reviewsApi;
