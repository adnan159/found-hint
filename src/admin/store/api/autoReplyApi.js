import { proRestUrl, proUrl } from "@/lib/pro";
import { baseApi } from "./baseApi";

/**
 * Auto-reply, served by FoundHint Premium under
 * `fhint-premium/v1/reviews/auto-reply` (an absolute URL, so it shares this
 * app's store and nonce). Only called when `hasPro("reviews.auto_reply")`.
 *
 * The state is `{ on, scope, daily_limit, older_today, rules, picks, sent,
 * unanswered, replied_ids }` (`daily_limit` 0 = no limit);
 * a rule is `template` or `off` for each rating (1–5) and kind (`comment`,
 * `stars`), and `picks` holds the template id each `template` rule sends
 * (0 = none chosen).
 */
export const autoReplyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAutoReply: builder.query({
      // With a listing: its settings; without: each listing in brief.
      query: ({ locationName = "" } = {}) =>
        proUrl("/reviews/auto-reply", { location_name: locationName }),
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
