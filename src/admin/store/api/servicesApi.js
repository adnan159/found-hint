import { baseApi } from "./baseApi";

/**
 * CRUD for services, plus bulk reordering.
 *
 * Reordering posts the complete new order and the server resequences every
 * row in one write, so ordering is never computed client-side.
 */
export const servicesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getServices: builder.query({
      query: () => "/services",
      transformResponse: (response) => ({
        services: response?.data ?? [],
        total: response?.meta?.total ?? 0,
        limits: response?.meta?.limits ?? null,
      }),
      providesTags: ["Service"],
    }),

    createService: builder.mutation({
      query: (body) => ({ url: "/services", method: "POST", body }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Service"],
    }),

    updateService: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/services/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Service"],
    }),

    deleteService: builder.mutation({
      query: (id) => ({ url: `/services/${id}`, method: "DELETE" }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Service"],
    }),

    reorderServices: builder.mutation({
      query: (ids) => ({
        url: "/services/reorder",
        method: "POST",
        body: { ids },
      }),
      transformResponse: (response) => response?.data ?? [],
      invalidatesTags: ["Service"],
    }),
  }),
});

export const {
  useGetServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useReorderServicesMutation,
} = servicesApi;
