import { baseApi } from "./baseApi";

/**
 * GET/POST /audits.
 *
 * The GET reads the stored run and never measures — running the rule set on
 * a render would make every visit to the dashboard as slow as the slowest
 * rule. Running one is a POST, because it is work.
 */
export const auditsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAudit: builder.query({
      query: () => "/audits",
      transformResponse: (response) => ({
        audit: response?.data ?? null,
        issues: response?.meta?.issues ?? [],
        passes: response?.meta?.passes ?? [],
        history: response?.meta?.history ?? [],
        stale: Boolean(response?.meta?.stale),
      }),
      providesTags: ["Audit"],
    }),

    runAudit: builder.mutation({
      query: (locationId = 0) => ({
        url: "/audits",
        method: "POST",
        body: { location_id: locationId },
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Audit"],
    }),

    updateIssue: builder.mutation({
      query: ({ id, status }) => ({
        url: `/audits/issues/${id}`,
        method: "PATCH",
        body: { status },
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Audit"],
    }),

    fixIssue: builder.mutation({
      query: (id) => ({ url: `/audits/issues/${id}/fix`, method: "POST" }),
      transformResponse: (response) => ({
        audit: response?.data ?? null,
        fix: response?.meta?.fix ?? null,
      }),
      // A fix changes business data, so everything derived from it is stale.
      invalidatesTags: ["Audit", "Business", "Location", "Schema"],
    }),
  }),
});

export const {
  useGetAuditQuery,
  useRunAuditMutation,
  useUpdateIssueMutation,
  useFixIssueMutation,
} = auditsApi;
