import { baseApi } from "./baseApi";

/**
 * GET /dashboard.
 *
 * Read-only, and never measures: it reports the stored audit. Tagged
 * "Audit" so running or fixing an audit refreshes the card in place.
 */
export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query({
      query: () => "/dashboard",
      transformResponse: (response) => response?.data ?? null,
      providesTags: ["Audit"],
    }),
  }),
});

export const { useGetDashboardQuery } = dashboardApi;
