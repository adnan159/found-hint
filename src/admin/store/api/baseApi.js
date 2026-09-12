import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const { rest_url, rest_nonce } = window.FHINT ?? {};

/**
 * Shared RTK Query base. Resource-specific endpoints are injected via
 * baseApi.injectEndpoints() from one file per REST resource under
 * store/api/*Api.js (e.g. businessApi.js, locationsApi.js) — see
 * includes/API/ for the PHP side of each resource, once it
 * exists.
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: rest_url,
    prepareHeaders: (headers) => {
      if (rest_nonce) {
        headers.set("X-WP-Nonce", rest_nonce);
      }
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["Business", "Location", "Service", "Onboarding", "Settings"],
  endpoints: () => ({}),
});
