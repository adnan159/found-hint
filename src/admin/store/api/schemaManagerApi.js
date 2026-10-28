import { proRestUrl } from "@/lib/pro";
import { baseApi } from "./baseApi";

/**
 * The Schema Manager's routes, served by FoundHint Pro under
 * `fhint-premium/v1/schema/*` (absolute URLs, so they share this app's store
 * and nonce). Only called inside a <ProFeature feature="schema.…">.
 */
const url = (path, params) => {
  const base = `${proRestUrl()}${path}`;
  const query = new URLSearchParams(params ?? {}).toString();

  if (!query) {
    return base;
  }

  return `${base}${base.includes("?") ? "&" : "?"}${query}`;
};

export const schemaManagerApi = baseApi
  .enhanceEndpoints({ addTagTypes: ["SchemaManager"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      getSchemaState: builder.query({
        query: () => url("/schema/state"),
        transformResponse: (response) => response?.data ?? null,
        providesTags: ["SchemaManager"],
      }),

      getSchemaTypes: builder.query({
        query: () => url("/schema/types"),
        transformResponse: (response) => response?.data ?? [],
      }),

      getSchemaPages: builder.query({
        query: ({ search = "", include = [] } = {}) =>
          url("/schema/pages", {
            search,
            ...Object.fromEntries(
              include.map((id, i) => [`include[${i}]`, id]),
            ),
          }),
        transformResponse: (response) => ({
          pages: response?.data ?? [],
          total: response?.meta?.total ?? 0,
        }),
      }),

      getBusinessSchema: builder.query({
        query: () => url("/schema/business"),
        transformResponse: (response) => response?.data ?? null,
        providesTags: ["SchemaManager"],
      }),

      saveBusinessSchema: builder.mutation({
        query: (body) => ({
          url: url("/schema/business"),
          method: "PUT",
          body,
        }),
        transformResponse: (response) => response?.data ?? null,
        invalidatesTags: ["SchemaManager"],
      }),

      getLocationSchemas: builder.query({
        query: () => url("/schema/locations"),
        transformResponse: (response) => response?.data ?? [],
        providesTags: ["SchemaManager"],
      }),

      getLocationSchema: builder.query({
        query: (id) => url(`/schema/locations/${Number(id)}`),
        transformResponse: (response) => response?.data ?? null,
        providesTags: ["SchemaManager"],
      }),

      saveLocationSchema: builder.mutation({
        query: ({ id, ...body }) => ({
          url: url(`/schema/locations/${Number(id)}`),
          method: "PUT",
          body,
        }),
        transformResponse: (response) => response?.data ?? null,
        invalidatesTags: ["SchemaManager"],
      }),

      // The markup for an entity, unsaved changes included. A mutation, not
      // a query: every keystroke is a new draft, and none is worth caching.
      previewSchema: builder.mutation({
        query: ({ entity, id = 0, draft }) => ({
          url: url("/schema/preview"),
          method: "POST",
          body: { entity, id, draft },
        }),
        transformResponse: (response) => response?.data ?? null,
      }),
    }),
  });

export const {
  useGetSchemaStateQuery,
  useGetSchemaTypesQuery,
  useGetSchemaPagesQuery,
  useGetBusinessSchemaQuery,
  useSaveBusinessSchemaMutation,
  useGetLocationSchemasQuery,
  useGetLocationSchemaQuery,
  useSaveLocationSchemaMutation,
  usePreviewSchemaMutation,
} = schemaManagerApi;
