import { baseApi } from "./baseApi";

/**
 * CRUD for locations. Opening hours travel inside the location payload —
 * there is no separate hours endpoint, because hours are meaningless
 * without their location and a second route would let a client save half a
 * change.
 */
export const locationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLocations: builder.query({
      query: () => "/locations",
      transformResponse: (response) => ({
        locations: response?.data ?? [],
        total: response?.meta?.total ?? 0,
        limits: response?.meta?.limits ?? null,
      }),
      providesTags: ["Location"],
    }),

    getLocation: builder.query({
      query: (id) => `/locations/${id}`,
      transformResponse: (response) => response?.data ?? null,
      providesTags: (result, error, id) => [{ type: "Location", id }],
    }),

    createLocation: builder.mutation({
      query: (body) => ({ url: "/locations", method: "POST", body }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Location"],
    }),

    updateLocation: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/locations/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: (result, error, { id }) => [
        "Location",
        { type: "Location", id },
      ],
    }),

    deleteLocation: builder.mutation({
      query: (id) => ({ url: `/locations/${id}`, method: "DELETE" }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Location"],
    }),
  }),
});

export const {
  useGetLocationsQuery,
  useGetLocationQuery,
  useCreateLocationMutation,
  useUpdateLocationMutation,
  useDeleteLocationMutation,
} = locationsApi;
