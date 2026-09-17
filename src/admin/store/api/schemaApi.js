import { baseApi } from "./baseApi";

/**
 * GET /schema.
 *
 * Read-only, because there is nothing here to write: the markup is derived
 * from the business, its location, hours and services, and the way to
 * change it is to change those. Who publishes it is a setting, saved
 * through /settings like every other one — which is why saving settings
 * invalidates this tag too.
 */
export const schemaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSchema: builder.query({
      query: (locationId = 0) => `/schema?location_id=${locationId}`,
      transformResponse: (response) => ({
        graph: response?.data ?? null,
        ownership: response?.meta?.ownership ?? null,
        isPublishable: response?.meta?.is_publishable ?? false,
        blockers: response?.meta?.blockers ?? [],
        recommendations: response?.meta?.recommendations ?? [],
      }),
      providesTags: ["Schema"],
    }),
  }),
});

export const { useGetSchemaQuery } = schemaApi;
