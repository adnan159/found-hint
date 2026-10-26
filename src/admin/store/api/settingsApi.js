import { baseApi, withQuery } from "./baseApi";

/**
 * GET/PUT /settings and DELETE /logs.
 *
 * `meta.system` is read-only environment information shown on the settings
 * screen; it carries nothing sensitive because it is meant to be pasted
 * into a support thread.
 */
export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query({
      query: () => "/settings",
      transformResponse: (response) => ({
        settings: response?.data ?? {},
        system: response?.meta?.system ?? {},
        limits: response?.meta?.limits ?? {},
      }),
      providesTags: ["Settings"],
    }),

    updateSettings: builder.mutation({
      query: (body) => ({ url: "/settings", method: "PUT", body }),
      transformResponse: (response) => response?.data ?? {},
      // The schema mode lives in settings, so a save can change what the
      // site publishes without touching any business data.
      invalidatesTags: ["Settings", "Schema"],
    }),

    purgeLogs: builder.mutation({
      // Through withQuery() for the same reason as the schema read: a site
      // with plain permalinks serves REST from `index.php?rest_route=…`, and
      // a second "?" makes WordPress answer 404.
      query: (mode = "expired") => ({
        url: withQuery("/logs", { mode }),
        method: "DELETE",
      }),
      transformResponse: (response) => response?.data ?? {},
      invalidatesTags: ["Settings"],
    }),
  }),
});

export const {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  usePurgeLogsMutation,
} = settingsApi;
