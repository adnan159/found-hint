import { baseApi, withQuery } from "./baseApi";

/**
 * GET/POST /reviews.
 *
 * The two GETs read stored rows and never contact Google, so opening the
 * screen costs a database query. Only the sync is a POST, because asking
 * Google for fresh reviews is work and has a cost somebody has to choose to
 * pay.
 *
 * Query strings go through withQuery(), which picks ? or & from the REST
 * root — a site on plain permalinks has one in its URL already, and a second
 * turns every request into a 404.
 */
export const reviewsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReviews: builder.query({
      query: ({
        locationName = "",
        unanswered = false,
        perPage = 20,
        offset = 0,
      } = {}) =>
        withQuery("/reviews", {
          location_name: locationName,
          unanswered: unanswered ? 1 : 0,
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
  }),
});

export const {
  useGetReviewsQuery,
  useGetReviewStateQuery,
  useSyncReviewsMutation,
} = reviewsApi;
