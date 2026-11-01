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

      // The Business schema's two tabs: `localbusiness` (the place, the
      // default) and `organization` (the brand).
      getBusinessSchema: builder.query({
        query: (kind = "localbusiness") => url("/schema/business", { kind }),
        transformResponse: (response) => response?.data ?? null,
        providesTags: ["SchemaManager"],
      }),

      saveBusinessSchema: builder.mutation({
        query: ({ kind = "localbusiness", ...body }) => ({
          url: url("/schema/business", { kind }),
          method: "PUT",
          body,
        }),
        transformResponse: (response) => response?.data ?? null,
        invalidatesTags: ["SchemaManager"],
      }),

      // Which business is the main one: a location (it becomes the primary
      // location everywhere), a head office typed here, or ask again.
      setMainBusiness: builder.mutation({
        query: (body) => ({
          url: url("/schema/main"),
          method: "PUT",
          body,
        }),
        transformResponse: (response) => response?.data ?? null,
        invalidatesTags: ["SchemaManager", "Location", "Schema", "Service"],
      }),

      // 05 Website structure: the website, each page, About and Contact
      // pages, breadcrumbs.
      getWebsiteSchema: builder.query({
        query: () => url("/schema/website"),
        transformResponse: (response) => response?.data ?? null,
        providesTags: ["SchemaManager"],
      }),

      saveWebsiteSchema: builder.mutation({
        query: (body) => ({ url: url("/schema/website"), method: "PUT", body }),
        transformResponse: (response) => response?.data ?? null,
        invalidatesTags: ["SchemaManager"],
      }),

      // 06 Settings: header output, where it goes, SEO plugins.
      getSchemaOutput: builder.query({
        query: () => url("/schema/settings"),
        transformResponse: (response) => response?.data ?? null,
        providesTags: ["SchemaManager"],
      }),

      saveSchemaOutput: builder.mutation({
        query: (body) => ({
          url: url("/schema/settings"),
          method: "PUT",
          body,
        }),
        transformResponse: (response) => response?.data ?? null,
        invalidatesTags: ["SchemaManager"],
      }),

      getSchemaPageMap: builder.query({
        query: () => url("/schema/page-map"),
        transformResponse: (response) => response?.data ?? null,
        providesTags: ["SchemaManager"],
      }),

      runLiveCheck: builder.mutation({
        query: () => ({ url: url("/schema/live-check"), method: "POST" }),
        transformResponse: (response) => response?.data ?? null,
        invalidatesTags: ["SchemaManager"],
      }),

      // A tab's switch: on prints its schema, off keeps the details only.
      setSchemaTab: builder.mutation({
        query: ({ key, enabled }) => ({
          url: url("/schema/tabs"),
          method: "PUT",
          body: { key, enabled },
        }),
        transformResponse: (response) => response?.data ?? null,
        invalidatesTags: ["SchemaManager"],
      }),

      getLocationSchemas: builder.query({
        query: () => url("/schema/locations"),
        transformResponse: (response) => response?.data ?? [],
        providesTags: ["SchemaManager"],
      }),

      // The Locations list: every Google profile with its role, page,
      // status and issues, the profiles found, and what setup offers.
      getLocationRoster: builder.query({
        query: () => url("/schema/locations/roster"),
        transformResponse: (response) => response?.data ?? null,
        providesTags: ["SchemaManager"],
      }),

      setupLocations: builder.mutation({
        query: (body) => ({
          url: url("/schema/locations/setup"),
          method: "POST",
          body,
        }),
        transformResponse: (response) => response?.data ?? null,
        invalidatesTags: ["SchemaManager", "Location", "Schema", "Service"],
      }),

      // `generate` their branch schema, or `dismiss` ("Not now").
      foundLocations: builder.mutation({
        query: (action) => ({
          url: url("/schema/locations/found"),
          method: "POST",
          body: { action },
        }),
        transformResponse: (response) => ({
          roster: response?.data ?? null,
          generated: response?.meta?.generated ?? 0,
        }),
        invalidatesTags: ["SchemaManager"],
      }),

      setLocationRole: builder.mutation({
        query: ({ id, role }) => ({
          url: url(`/schema/locations/${Number(id)}/role`),
          method: "PUT",
          body: { role },
        }),
        transformResponse: (response) => response?.data ?? null,
        invalidatesTags: ["SchemaManager"],
      }),

      setLocationPage: builder.mutation({
        query: ({ id, postId }) => ({
          url: url(`/schema/locations/${Number(id)}/page`),
          method: "PUT",
          body: { post_id: postId },
        }),
        transformResponse: (response) => response?.data ?? null,
        invalidatesTags: ["SchemaManager", "Location"],
      }),

      // A separate business's own schema, for its own website.
      getSeparateSchema: builder.query({
        query: (id) => url(`/schema/locations/${Number(id)}/separate`),
        transformResponse: (response) => response?.data?.document ?? null,
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

      // Copy one of the listing's Google photos into the Media Library, so
      // schema serves it from this site.
      importSchemaPhoto: builder.mutation({
        query: (photoUrl) => ({
          url: url("/schema/media/import"),
          method: "POST",
          body: { url: photoUrl },
        }),
        transformResponse: (response) => response?.data ?? null,
        invalidatesTags: ["SchemaManager"],
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
  useSetSchemaTabMutation,
  useSetMainBusinessMutation,
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
  useImportSchemaPhotoMutation,
  useGetLocationRosterQuery,
  useSetupLocationsMutation,
  useFoundLocationsMutation,
  useSetLocationRoleMutation,
  useSetLocationPageMutation,
  useGetSeparateSchemaQuery,
  useGetWebsiteSchemaQuery,
  useSaveWebsiteSchemaMutation,
  useGetSchemaOutputQuery,
  useSaveSchemaOutputMutation,
  useGetSchemaPageMapQuery,
  useRunLiveCheckMutation,
  usePreviewSchemaMutation,
} = schemaManagerApi;
