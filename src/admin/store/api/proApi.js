import { proRestUrl } from "@/lib/pro";
import { baseApi } from "./baseApi";

/**
 * Endpoints served by the FoundHint Pro add-on, under its own REST
 * namespace (`fhint-pro/v1`). The URL is absolute — RTK Query uses an
 * absolute URL as it is — so these share this app's store and nonce.
 * Only ever called inside a <ProFeature>, so the routes exist.
 */
export const proApi = baseApi
  .enhanceEndpoints({ addTagTypes: ["ProStatus"] })
  .injectEndpoints({
    endpoints: (build) => ({
      getProStatus: build.query({
        query: () => `${proRestUrl()}/status`,
        transformResponse: (response) => response.data,
        providesTags: ["ProStatus"],
      }),
    }),
  });

export const { useGetProStatusQuery } = proApi;
