import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const { rest_url, rest_nonce } = window.FHINT ?? {};

/**
 * Add query parameters to a REST path, whichever way the site serves REST.
 *
 * WordPress serves REST two ways, and a plugin meets both: pretty permalinks
 * give `…/wp-json/fhint/v1`, and plain ones give
 * `…/index.php?rest_route=/fhint/v1`. RTK Query's own `params` option cannot
 * help here — it appends to the path *before* the base URL is joined on, so
 * on a plain-permalink site the result carries two `?` and WordPress answers
 * 404. Choosing the separator from the base URL is what makes one path work
 * on both.
 *
 * @param {string} path   Path under the namespace, e.g. "/schema".
 * @param {Object} params Query parameters.
 * @return {string} The path with its parameters attached.
 */
export function withQuery(path, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined),
  ).toString();

  if (!query) {
    return path;
  }

  return `${path}${String(rest_url ?? "").includes("?") ? "&" : "?"}${query}`;
}

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
  tagTypes: [
    "Business",
    "Location",
    "Service",
    "Onboarding",
    "Settings",
    "Google",
    "GoogleProfiles",
    "Schema",
    "Audit",
    "Reviews",
  ],
  endpoints: () => ({}),
});
