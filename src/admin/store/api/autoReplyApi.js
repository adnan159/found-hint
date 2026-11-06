import { proRestUrl } from "@/lib/pro";
import { baseApi } from "./baseApi";

/**
 * Auto-reply, served by FoundHint Premium under
 * `fhint-premium/v1/reviews/auto-reply` (an absolute URL, so it shares this
 * app's store and nonce). Only called when `hasPro("reviews.auto_reply")`.
 *
 * The state is `{ on, scope, rules, picks, sent, unanswered, replied_ids }`;
 * a rule is `template` or `off` for each rating (1–5) and kind (`comment`,
 * `stars`), and `picks` holds the template id each `template` rule sends
 * (0 = none chosen).
 */
export const autoReplyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAutoReply: builder.query({
      query: () => `${proRestUrl()}/reviews/auto-reply`,
      transformResponse: (response) => response?.data ?? null,
      providesTags: ["AutoReply"],
    }),
    saveAutoReply: builder.mutation({
      query: (changes) => ({
        url: `${proRestUrl()}/reviews/auto-reply`,
        method: "PUT",
        body: changes,
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["AutoReply"],
    }),
  }),
});

export const { useGetAutoReplyQuery, useSaveAutoReplyMutation } = autoReplyApi;
