import { baseApi, withQuery } from "./baseApi";

/**
 * GET/POST/PUT/DELETE /posts.
 *
 * The GETs read stored rows and never contact Google. Sync reads from
 * Google; create (with `publish`), update of a live post, publish and
 * delete write to the public listing.
 */
export const postsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // One page of a location's posts, with `total` and the type `counts`.
    getPosts: builder.query({
      query: ({
        locationName = "",
        type = "",
        status = "",
        source = "",
        days = 0,
        sort = "new",
        perPage = 10,
        offset = 0,
      } = {}) =>
        withQuery("/posts", {
          location_name: locationName,
          type,
          status,
          source,
          days,
          sort,
          per_page: perPage,
          offset,
        }),
      transformResponse: (response) => ({
        items: response?.data ?? [],
        total: response?.meta?.total ?? 0,
        counts: response?.meta?.counts ?? {
          all: 0,
          update: 0,
          event: 0,
          offer: 0,
        },
      }),
      providesTags: ["Posts"],
    }),

    getPostState: builder.query({
      query: ({ locationName = "" } = {}) =>
        withQuery("/posts/state", { location_name: locationName }),
      transformResponse: (response) => response?.data ?? null,
      providesTags: ["Posts"],
    }),

    // Photos already on Google: the listing's gallery and customers'.
    getPostPhotos: builder.query({
      query: ({ locationName = "" } = {}) =>
        withQuery("/posts/photos", { location_name: locationName }),
      transformResponse: (response) =>
        response?.data ?? { gallery: [], customer: [] },
    }),

    uploadPostPhoto: builder.mutation({
      // On a site Google cannot reach, the server puts the photo on this
      // listing's Google gallery and answers with Google's link to it.
      query: ({ file, locationName }) => {
        const body = new FormData();

        body.append("file", file);
        body.append("location_name", locationName);

        return { url: "/posts/media", method: "POST", body };
      },
      transformResponse: (response) => response?.data ?? null,
    }),

    syncPosts: builder.mutation({
      query: ({ locationName }) => ({
        url: "/posts/sync",
        method: "POST",
        body: { location_name: locationName },
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Posts"],
    }),

    // A failed send still stores the post (status "failed"), so the list
    // is refetched whether or not this succeeds.
    createPost: builder.mutation({
      query: ({ locationName, publish, ...fields }) => ({
        url: "/posts",
        method: "POST",
        body: { ...fields, location_name: locationName, publish },
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Posts"],
    }),

    updatePost: builder.mutation({
      query: ({ id, publish, ...fields }) => ({
        url: `/posts/${Number(id)}`,
        method: "PUT",
        body: { ...fields, publish },
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Posts"],
    }),

    publishPost: builder.mutation({
      query: ({ id }) => ({
        url: `/posts/${Number(id)}/publish`,
        method: "POST",
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Posts"],
    }),

    deletePost: builder.mutation({
      query: ({ id }) => ({
        url: `/posts/${Number(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Posts"],
    }),
  }),
});

export const {
  useGetPostsQuery,
  useGetPostStateQuery,
  useGetPostPhotosQuery,
  useUploadPostPhotoMutation,
  useSyncPostsMutation,
  useCreatePostMutation,
  useUpdatePostMutation,
  usePublishPostMutation,
  useDeletePostMutation,
} = postsApi;
