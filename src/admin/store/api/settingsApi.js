import { baseApi } from "./baseApi";

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
      query: (mode = "expired") => ({
        url: `/logs?mode=${mode}`,
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
