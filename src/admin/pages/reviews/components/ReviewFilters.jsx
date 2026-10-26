import { useEffect, useId, useState } from "react";
import { __ } from "@wordpress/i18n";
import { SearchIcon } from "lucide-react";
import { cn } from "cn";
import { input, label } from "@/pages/profile/styles";

const field = "fhint:grid fhint:min-w-0 fhint:gap-1.5";

/**
 * Rating, reply status, review status and a search, side by side.
 *
 * The search waits until typing pauses before it asks the server, so a
 * word typed letter by letter is one request, not seven.
 *
 * @param {Object}   props
 * @param {Object}   props.filters  `{ rating, replied, status, search }`.
 * @param {Function} props.onChange Receives the changed filters.
 */
export function ReviewFilters({ filters, onChange }) {
  const id = useId();
  const [search, setSearch] = useState(filters.search);

  useEffect(() => setSearch(filters.search), [filters.search]);

  useEffect(() => {
    if (search === filters.search) {
      return undefined;
    }

    const wait = window.setTimeout(() => onChange({ ...filters, search }), 350);

    return () => window.clearTimeout(wait);
  }, [search]);

  const set = (key) => (event) =>
    onChange({ ...filters, [key]: event.target.value });

  return (
    <div
      role="search"
      aria-label={__("Filter reviews", "foundhint-local-seo")}
      className="fhint:grid fhint:grid-cols-1 fhint:gap-3 fhint:sm:grid-cols-2 fhint:xl:grid-cols-4"
    >
      <div className={field}>
        <label htmlFor={`${id}-rating`} className={label}>
          {__("Rating", "foundhint-local-seo")}
        </label>
        <select
          id={`${id}-rating`}
          value={filters.rating}
          onChange={set("rating")}
          className={input}
        >
          <option value="0">{__("All ratings", "foundhint-local-seo")}</option>
          <option value="5">{__("5 stars", "foundhint-local-seo")}</option>
          <option value="4">{__("4 stars", "foundhint-local-seo")}</option>
          <option value="3">{__("3 stars", "foundhint-local-seo")}</option>
          <option value="2">{__("2 stars", "foundhint-local-seo")}</option>
          <option value="1">{__("1 star", "foundhint-local-seo")}</option>
        </select>
      </div>
      <div className={field}>
        <label htmlFor={`${id}-replied`} className={label}>
          {__("Reply status", "foundhint-local-seo")}
        </label>
        <select
          id={`${id}-replied`}
          value={filters.replied}
          onChange={set("replied")}
          className={input}
        >
          <option value="">{__("All reviews", "foundhint-local-seo")}</option>
          <option value="replied">
            {__("Replied", "foundhint-local-seo")}
          </option>
          <option value="not_replied">
            {__("Not replied", "foundhint-local-seo")}
          </option>
        </select>
      </div>
      <div className={field}>
        <label htmlFor={`${id}-status`} className={label}>
          {__("Review status", "foundhint-local-seo")}
        </label>
        <select
          id={`${id}-status`}
          value={filters.status}
          onChange={set("status")}
          className={input}
        >
          <option value="all">{__("Any status", "foundhint-local-seo")}</option>
          <option value="live">{__("Live", "foundhint-local-seo")}</option>
          <option value="edited">{__("Edited", "foundhint-local-seo")}</option>
          <option value="removed">
            {__("Removed by reviewer", "foundhint-local-seo")}
          </option>
        </select>
      </div>
      <div className={field}>
        <label htmlFor={`${id}-search`} className={label}>
          {__("Search", "foundhint-local-seo")}
        </label>
        <span className="fhint:relative fhint:flex">
          <SearchIcon
            aria-hidden="true"
            className="fhint:pointer-events-none fhint:absolute fhint:top-1/2 fhint:left-3 fhint:size-3.5 fhint:-translate-y-1/2 fhint:text-muted-strong"
          />
          <input
            id={`${id}-search`}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={__("Name or words in a review", "foundhint-local-seo")}
            className={cn(input, "fhint:pl-8!")}
          />
        </span>
      </div>
    </div>
  );
}

export default ReviewFilters;
