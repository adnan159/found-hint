import { proRestUrl } from "@/lib/pro";
import { baseApi } from "./baseApi";

/**
 * "Share your blog on Google", served by FoundHint Premium (feature
 * `posts.blog`) under `fhint-premium/v1/posts/blog*` — absolute URLs, so
 * they share this app's store and nonce. Only called when
 * `hasPro("posts.blog")`.
 */
export const postBlogApi = baseApi
  .enhanceEndpoints({ addTagTypes: ["BlogSharing"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      // Whether the "GBP Posting" link shows under blog posts.
      getBlogSharing: builder.query({
        query: () => `${proRestUrl()}/posts/blog-sharing`,
        transformResponse: (response) => Boolean(response?.data?.enabled),
        providesTags: ["BlogSharing"],
      }),

      setBlogSharing: builder.mutation({
        query: ({ enabled }) => ({
          url: `${proRestUrl()}/posts/blog-sharing`,
          method: "PUT",
          body: { enabled },
        }),
        transformResponse: (response) => Boolean(response?.data?.enabled),
        invalidatesTags: ["BlogSharing"],
      }),

      // One published blog post, as the start of a Google post:
      // `{ id, title, url, summary, image_url, attachment_id, image_reachable }`.
      getBlogPost: builder.query({
        query: (id) => `${proRestUrl()}/posts/blog/${Number(id)}`,
        transformResponse: (response) => response?.data ?? null,
      }),
    }),
  });

export const {
  useGetBlogSharingQuery,
  useSetBlogSharingMutation,
  useGetBlogPostQuery,
} = postBlogApi;
