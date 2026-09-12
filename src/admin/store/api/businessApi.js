import { baseApi } from "./baseApi";

/**
 * GET/PUT /business.
 *
 * The envelope is unwrapped here so components see the record itself, but
 * `meta` is kept for the list endpoints that need `total` and `limits` —
 * see locationsApi.
 */
export const businessApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBusiness: builder.query({
      query: () => "/business",
      // data is null on a site with no profile yet, which is a normal state
      // rather than an error, so it is passed through as-is.
      transformResponse: (response) => ({
        business: response?.data ?? null,
        exists: Boolean(response?.meta?.exists),
        limits: response?.meta?.limits ?? {},
      }),
      providesTags: ["Business"],
    }),

    updateBusiness: builder.mutation({
      query: (body) => ({
        url: "/business",
        method: "PUT",
        body,
      }),
      transformResponse: (response) => response?.data ?? null,
      // A business edit changes what the dashboard and the location
      // fallbacks show, so those are invalidated too.
      invalidatesTags: ["Business", "Location"],
    }),
  }),
});

export const { useGetBusinessQuery, useUpdateBusinessMutation } = businessApi;
