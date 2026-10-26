import { baseApi } from "./baseApi";

/**
 * GET/PUT /onboarding.
 *
 * The mutation moves a position only. Everything the wizard collects is
 * saved through the ordinary resource endpoints, so the tags for those are
 * invalidated here too: completing a step changes what the next one shows.
 */
export const onboardingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOnboarding: builder.query({
      query: () => "/onboarding",
      transformResponse: (response) => response?.data ?? null,
      providesTags: ["Onboarding"],
    }),

    moveOnboarding: builder.mutation({
      query: ({ action, step }) => ({
        url: "/onboarding",
        method: "PUT",
        body: step ? { action, step } : { action },
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: ["Onboarding"],
    }),
  }),
});

export const { useGetOnboardingQuery, useMoveOnboardingMutation } =
  onboardingApi;
