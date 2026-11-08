import { proRestUrl } from "@/lib/pro";
import { baseApi } from "./baseApi";

/**
 * Scheduling a post, served by FoundHint Premium under
 * `fhint-premium/v1/posts/{id}/schedule` (an absolute URL, so it shares this
 * app's store and nonce). Only called when `hasPro("posts.schedule")`.
 *
 * `scheduled_at` is wall time in the site's time zone, as a datetime-local
 * input gives it ("2026-11-06T09:00"). Premium checks it, stores it as UTC
 * and sets the post's status to `scheduled`; cancelling is the free
 * `/posts/{id}/unschedule`.
 */
export const postScheduleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    schedulePost: builder.mutation({
      query: ({ id, scheduledAt }) => ({
        url: `${proRestUrl()}/posts/${Number(id)}/schedule`,
        method: "POST",
        body: { scheduled_at: scheduledAt },
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Posts"],
    }),
  }),
});

export const { useSchedulePostMutation } = postScheduleApi;
