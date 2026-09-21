import { baseApi } from "./baseApi";

/**
 * Finding the business on Google through the Places API.
 *
 * No sign-in: this reads what the public sees on Google Maps, with the
 * site's own API key. The key is never in any response here — `getPlaces`
 * carries only whether one is stored and an unusable fragment of it.
 *
 * **Search and the live read are mutations, not queries.** Both call Google
 * and cost quota, so neither may run just because a component mounted or a
 * tag was invalidated. The live read's result is held by the component that
 * asked for it and never cached: Google's terms allow keeping a place id and
 * coordinates, not a name, address, phone or hours, and an RTK Query cache
 * entry is a copy by another name.
 */
export const placesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlaces: builder.query({
      query: () => "/places",
      transformResponse: (response) => response?.data ?? null,
      providesTags: ["Places"],
    }),

    savePlacesKey: builder.mutation({
      query: (body) => ({ url: "/places/key", method: "POST", body }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Places"],
    }),

    deletePlacesKey: builder.mutation({
      query: () => ({ url: "/places/key", method: "DELETE" }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Places"],
    }),

    searchPlaces: builder.mutation({
      query: (body) => ({ url: "/places/search", method: "POST", body }),
      transformResponse: (response) => response?.data ?? null,
    }),

    linkPlace: builder.mutation({
      query: (body) => ({ url: "/places/link", method: "POST", body }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Places"],
    }),

    unlinkPlace: builder.mutation({
      query: () => ({ url: "/places/link", method: "DELETE" }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Places"],
    }),

    readPlaceLive: builder.mutation({
      query: () => ({ url: "/places/live", method: "POST" }),
      transformResponse: (response) => response?.data ?? null,
      // Coordinates were refreshed server-side, so the link's expiry moved.
      invalidatesTags: ["Places"],
    }),
  }),
});

export const {
  useGetPlacesQuery,
  useSavePlacesKeyMutation,
  useDeletePlacesKeyMutation,
  useSearchPlacesMutation,
  useLinkPlaceMutation,
  useUnlinkPlaceMutation,
  useReadPlaceLiveMutation,
} = placesApi;
