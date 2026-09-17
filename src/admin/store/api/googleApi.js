import { baseApi } from "./baseApi";

/**
 * The Google Business Profile connection.
 *
 * Nothing here ever receives a token or a client secret — the server
 * reports the connection's state and no more, so there is nothing sensitive
 * in the cache or in a response a browser could be asked to show.
 *
 * `connect` is not a connection: it returns a URL for the browser to be
 * sent to, because Google redirects a person, not an API client. The
 * connection is finished on the server when Google redirects back.
 */
export const googleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGoogle: builder.query({
      query: () => "/google",
      transformResponse: (response) => response?.data ?? null,
      providesTags: ["Google"],
    }),

    saveGoogleCredentials: builder.mutation({
      query: (body) => ({
        url: "/google/credentials",
        method: "POST",
        body,
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Google"],
    }),

    startGoogleConnect: builder.mutation({
      query: () => ({ url: "/google/connect", method: "POST" }),
      transformResponse: (response) => response?.data ?? null,
    }),

    // The stored copy of what Google last said, plus the mapping. Reading
    // it never calls Google.
    getGoogleProfiles: builder.query({
      query: () => "/google/profiles",
      transformResponse: (response) => response?.data ?? null,
      providesTags: ["GoogleProfiles"],
    }),

    syncGoogleProfiles: builder.mutation({
      query: () => ({ url: "/google/profiles", method: "POST" }),
      transformResponse: (response) => ({
        overview: response?.data ?? null,
        counts: response?.meta ?? null,
      }),
      invalidatesTags: ["GoogleProfiles"],
    }),

    mapGoogleLocation: builder.mutation({
      query: (body) => ({ url: "/google/mapping", method: "POST", body }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["GoogleProfiles"],
    }),

    unmapGoogleLocation: builder.mutation({
      query: (body) => ({ url: "/google/mapping", method: "DELETE", body }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["GoogleProfiles"],
    }),

    disconnectGoogle: builder.mutation({
      query: () => ({ url: "/google", method: "DELETE" }),
      // Whether Google confirmed the revocation travels in `meta`, not in
      // the state — the screen says something different when it did not.
      transformResponse: (response) => ({
        state: response?.data ?? null,
        revoked: response?.meta?.revoked !== false,
      }),
      // Disconnecting clears the stored profiles too.
      invalidatesTags: ["Google", "GoogleProfiles"],
    }),
  }),
});

export const {
  useGetGoogleQuery,
  useGetGoogleProfilesQuery,
  useSyncGoogleProfilesMutation,
  useMapGoogleLocationMutation,
  useUnmapGoogleLocationMutation,
  useSaveGoogleCredentialsMutation,
  useStartGoogleConnectMutation,
  useDisconnectGoogleMutation,
} = googleApi;
