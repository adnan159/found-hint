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

      // Services, per list: 0 is the business's own, else a branch's.
      getServiceSchemas: builder.query({
        query: (list = 0) => url("/schema/services", { list }),
        transformResponse: (response) => response?.data ?? null,
        providesTags: ["SchemaManager"],
      }),

      getServiceSchema: builder.query({
        query: (id) => url(`/schema/services/${Number(id)}`),
        transformResponse: (response) => response?.data ?? null,
        providesTags: ["SchemaManager"],
      }),

      // The editor for a service not yet added; nothing is stored.
      getBlankServiceSchema: builder.query({
        query: (list = 0) => url("/schema/services/blank", { list }),
        transformResponse: (response) => response?.data ?? null,
      }),

      createServiceSchema: builder.mutation({
        query: ({ list = 0, ...body }) => ({
          url: url("/schema/services", { list }),
          method: "POST",
          body,
        }),
        transformResponse: (response) => response?.data ?? null,
        invalidatesTags: ["SchemaManager", "Service", "Schema"],
      }),

      saveServiceSchema: builder.mutation({
        query: ({ id, ...body }) => ({
          url: url(`/schema/services/${Number(id)}`),
          method: "PUT",
          body,
        }),
        transformResponse: (response) => response?.data ?? null,
        invalidatesTags: ["SchemaManager", "Service", "Schema"],
      }),

      // The list's switch: saves at once.
      setServiceStatus: builder.mutation({
        query: ({ id, status }) => ({
          url: url(`/schema/services/${Number(id)}`),
          method: "PATCH",
          body: { status },
        }),
        transformResponse: (response) => response?.data ?? null,
        invalidatesTags: ["SchemaManager", "Service", "Schema"],
      }),

      deleteServiceSchema: builder.mutation({
        query: (id) => ({
          url: url(`/schema/services/${Number(id)}`),
          method: "DELETE",
        }),
        transformResponse: (response) => response?.data ?? null,
        invalidatesTags: ["SchemaManager", "Service", "Schema"],
      }),

      reorderServiceSchemas: builder.mutation({
        query: ({ list = 0, ids }) => ({
          url: url("/schema/services/order"),
          method: "PUT",
          body: { list, ids },
        }),
        transformResponse: (response) => response?.data ?? null,
        // The new order is shown at once; this keeps every list in step.
        async onQueryStarted({ list = 0, ids }, { dispatch, queryFulfilled }) {
          const patch = dispatch(
            schemaManagerApi.util.updateQueryData(
              "getServiceSchemas",
              list,
              (draft) => {
                if (!draft?.services) {
                  return;
                }

                draft.services.sort(
                  (a, b) => ids.indexOf(a.id) - ids.indexOf(b.id),
                );
              },
            ),
          );

          try {
            await queryFulfilled;
          } catch {
            patch.undo();
          }
        },
        invalidatesTags: ["Service", "Schema"],
      }),

      // The markup for an entity, unsaved changes included. A mutation, not
      // a query: every keystroke is a new draft, and none is worth caching.
      previewSchema: builder.mutation({
        query: ({ entity, id = 0, list = 0, draft }) => ({
          url: url("/schema/preview"),
          method: "POST",
          body: { entity, id, list, draft },
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
  useGetServiceSchemasQuery,
  useGetServiceSchemaQuery,
  useGetBlankServiceSchemaQuery,
  useCreateServiceSchemaMutation,
  useSaveServiceSchemaMutation,
  useSetServiceStatusMutation,
  useDeleteServiceSchemaMutation,
  useReorderServiceSchemasMutation,
  usePreviewSchemaMutation,
} = schemaManagerApi;
