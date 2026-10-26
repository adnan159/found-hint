import { baseApi, withQuery } from "./baseApi";

/**
 * The Business Profile screen.
 *
 * One GET paints the whole screen; a save names one section and answers with
 * that section as it now reads, which is written straight back into the
 * cached profile so the screen never refetches after its own save.
 *
 * The profile is tagged with the entities it is made of, so a change made on
 * the Locations or Services screens is picked up here too.
 *
 * Every endpoint takes a `locationId`. 0 means "the primary location" and is
 * simply not sent, so a single-location site makes the same requests it
 * always did; any other id is that location's profile, cached on its own.
 */
const at = (url, locationId) =>
  locationId ? withQuery(url, { location_id: locationId }) : url;

const withLocation = (body, locationId) =>
  locationId ? { ...body, location_id: locationId } : body;

const whole = (response) => ({
  sections: response?.data ?? {},
  meta: response?.meta ?? {},
});

async function replaceProfile(
  { locationId = 0 } = {},
  { dispatch, queryFulfilled },
) {
  try {
    const { data } = await queryFulfilled;

    dispatch(
      profileApi.util.updateQueryData("getProfile", locationId, () => data),
    );
  } catch {
    // The caller shows the error; the cached profile stays as it was.
  }
}

export const profileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query({
      query: (locationId = 0) => at("/profile", locationId),
      transformResponse: (response) => ({
        sections: response?.data ?? {},
        meta: response?.meta ?? {},
      }),
      providesTags: ["Profile", "Business", "Location", "Service"],
    }),

    saveProfileSection: builder.mutation({
      query: ({ section, fields, locationId = 0 }) => ({
        url: "/profile",
        method: "PATCH",
        body: withLocation({ section, fields }, locationId),
      }),
      transformResponse: (response) => ({
        data: response?.data ?? {},
        meta: response?.meta ?? {},
      }),
      async onQueryStarted(
        { section, locationId = 0 },
        { dispatch, queryFulfilled },
      ) {
        try {
          const { data: saved } = await queryFulfilled;

          dispatch(
            profileApi.util.updateQueryData(
              "getProfile",
              locationId,
              (draft) => {
                draft.sections[section] = saved.data;
                draft.meta = { ...draft.meta, ...saved.meta };
              },
            ),
          );
        } catch {
          // The caller shows the error; the cached profile stays as it was.
        }
      },
      // Not "Profile": the cache was just updated by hand, and a refetch
      // would repaint the screen under the person still editing it.
      // Only a save that happened makes other screens stale; a refused one
      // changed nothing and should not cost a re-read.
      invalidatesTags: (result, error) =>
        error
          ? []
          : ["Business", "Location", "Service", "Schema", "Audit", "Dashboard"],
    }),

    // The four below answer with the whole profile, so each writes its
    // answer over the cached one and the screen repaints from that.
    // Give a Google listing with no location here a location of its own,
    // so the switcher can open it. Answers `{ location_id, created }`.
    openGoogleListing: builder.mutation({
      query: ({ locationName }) => ({
        url: "/profile/listing",
        method: "POST",
        body: { location_name: locationName },
      }),
      transformResponse: (response) => response?.data ?? null,
      // A new location changes every location's list of locations.
      invalidatesTags: (result, error) =>
        error || !result?.created ? [] : ["Location"],
    }),

    refreshFromGoogle: builder.mutation({
      query: ({ locationId = 0 } = {}) => ({
        url: "/profile/google/refresh",
        method: "POST",
        body: withLocation({}, locationId),
      }),
      transformResponse: whole,
      onQueryStarted: replaceProfile,
    }),

    addPhoto: builder.mutation({
      query: ({ file, role = "gallery", locationId = 0 }) => {
        const body = new FormData();

        body.append("file", file);
        body.append("role", role);

        if (locationId) {
          body.append("location_id", String(locationId));
        }

        return { url: "/profile/media", method: "POST", body };
      },
      transformResponse: whole,
      onQueryStarted: replaceProfile,
    }),

    removePhoto: builder.mutation({
      query: ({ id, locationId = 0 }) => ({
        url: at(`/profile/media/${id}`, locationId),
        method: "DELETE",
      }),
      transformResponse: whole,
      onQueryStarted: replaceProfile,
    }),

    publishPhoto: builder.mutation({
      query: ({ id, locationId = 0 }) => ({
        url: `/profile/media/${id}/publish`,
        method: "POST",
        body: withLocation({}, locationId),
      }),
      transformResponse: whole,
      onQueryStarted: replaceProfile,
    }),

    searchGoogleCategories: builder.query({
      query: (search = "") =>
        withQuery("/google/categories", { search, per_page: 8 }),
      transformResponse: (response) => response?.data ?? [],
    }),

    planPublish: builder.mutation({
      query: ({ locationId = 0 } = {}) => ({
        url: "/profile/publish/plan",
        method: "POST",
        body: withLocation({}, locationId),
      }),
      transformResponse: (response) => ({
        plan: response?.data ?? null,
        listing: response?.meta?.listing ?? null,
      }),
    }),

    runPublishStep: builder.mutation({
      query: ({ step, token, locationId = 0 }) => ({
        url: "/profile/publish/step",
        method: "POST",
        body: withLocation({ step, token }, locationId),
      }),
      transformResponse: (response) => response?.data ?? null,
    }),
  }),
});

export const {
  useOpenGoogleListingMutation,
  useGetProfileQuery,
  useSaveProfileSectionMutation,
  useLazySearchGoogleCategoriesQuery,
  usePlanPublishMutation,
  useRunPublishStepMutation,
  useRefreshFromGoogleMutation,
  useAddPhotoMutation,
  useRemovePhotoMutation,
  usePublishPhotoMutation,
} = profileApi;
