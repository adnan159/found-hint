import { baseApi, withQuery } from "./baseApi";

/**
 * GET /dashboard.
 *
 * Read-only, and never measures: it reports the stored audit. Tagged
 * "Audit" so running or fixing an audit refreshes the card in place.
 */
export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query({
      // One location's figures; 0 (the default) is the main location's.
      query: (locationId = 0) =>
        locationId
          ? withQuery("/dashboard", { location_id: locationId })
          : "/dashboard",
      transformResponse: (response) => response?.data ?? null,
      providesTags: ["Audit"],
    }),
  }),
});

export const { useGetDashboardQuery } = dashboardApi;
