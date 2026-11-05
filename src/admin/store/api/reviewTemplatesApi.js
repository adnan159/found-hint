import { proRestUrl } from "@/lib/pro";
import { baseApi } from "./baseApi";

/**
 * The owner's review reply templates, served by FoundHint Premium under
 * `fhint-premium/v1/reviews/templates` (an absolute URL, so it shares this
 * app's store and nonce). Only called when `hasPro("reviews.templates")`.
 *
 * A template is `{ id, rating, kind, name, text }`; one set is shared by
 * every location.
 */
export const reviewTemplatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReviewTemplates: builder.query({
      query: () => `${proRestUrl()}/reviews/templates`,
      transformResponse: (response) => response?.data ?? [],
      providesTags: ["ReviewTemplates"],
    }),
    saveReviewTemplate: builder.mutation({
      query: ({ id, ...template }) => ({
        url: id
          ? `${proRestUrl()}/reviews/templates/${Number(id)}`
          : `${proRestUrl()}/reviews/templates`,
        method: id ? "PUT" : "POST",
        body: template,
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["ReviewTemplates"],
    }),
    deleteReviewTemplate: builder.mutation({
      query: (id) => ({
        url: `${proRestUrl()}/reviews/templates/${Number(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ReviewTemplates"],
    }),
  }),
});

export const {
  useGetReviewTemplatesQuery,
  useSaveReviewTemplateMutation,
  useDeleteReviewTemplateMutation,
} = reviewTemplatesApi;
