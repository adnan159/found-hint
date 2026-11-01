import { useEffect, useMemo, useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { MessageSquareIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import RequestError from "@/components/RequestError";
import ProFeature from "@/components/ProFeature";
import useSelectedLocation from "@/hooks/useSelectedLocation";
import { errorMessage } from "@/lib/errors";
import {
  useGetReviewStateQuery,
  useGetReviewsQuery,
  useLazyGetReviewsQuery,
  useSyncReviewsMutation,
} from "@/store/api/reviewsApi";
import Pagination from "./components/Pagination";
import Panel from "./components/Panel";
import ProTemplatesCard from "./components/ProTemplatesCard";
import ReplyDialog from "./components/ReplyDialog";
import ReviewCard from "./components/ReviewCard";
import ReviewFilters from "./components/ReviewFilters";
import ReviewsHeader from "./components/ReviewsHeader";
import ReviewToolbar, { showingText } from "./components/ReviewToolbar";
import TemplatesCard from "./components/TemplatesCard";
import { formatDate } from "./lib/replies";
import { sampleTemplates } from "./lib/templates";

/**
 * Google reviews for the location chosen in the bar at the top.
 *
 * Everything here reads stored rows. "Sync reviews" in the title, and
 * posting, editing or deleting a reply, are the only things that contact
 * Google — asking costs a request against a quota every site shares.
 *
 * Reviews are shown here, in the admin, and are not published on the site:
 * review content belongs to its author and to Google.
 */
const NO_FILTERS = { rating: "0", replied: "", status: "all", search: "" };

/** One CSV cell, quoted, with a leading formula character neutralised. */
function cell(value) {
  let text = String(value ?? "");

  // A cell starting with = + - or @ is run as a formula by spreadsheets;
  // a review is someone else's words and must never run as one.
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(reviews) {
  const header = [
    __("Reviewer", "foundhint-local-seo"),
    __("Rating", "foundhint-local-seo"),
    __("Date", "foundhint-local-seo"),
    __("Review", "foundhint-local-seo"),
    __("Review status", "foundhint-local-seo"),
    __("Your reply", "foundhint-local-seo"),
    __("Replied on", "foundhint-local-seo"),
  ];
  const rows = reviews.map((review) => [
    review.is_anonymous
      ? __("Anonymous", "foundhint-local-seo")
      : review.reviewer_name,
    review.star_rating,
    formatDate(review.reviewed_at),
    review.comment,
    review.status,
    review.reply_comment,
    formatDate(review.replied_at),
  ]);

  // The byte-order mark makes Excel read the file as UTF-8, so names in
  // Bengali or with accents arrive intact.
  return `\uFEFF${[header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}`;
}

function download(name, text) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");

  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Reviews() {
  const { current, ready } = useSelectedLocation();
  const [filters, setFilters] = useState(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [replying, setReplying] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Which Google listing belongs to the location in the bar.
  const { data: listingsState } = useGetReviewStateQuery({ locationName: "" });
  const listings = listingsState?.locations ?? [];
  const listing =
    current && listings.find((item) => item.location_id === current.id);
  const locationName = listing ? listing.location_name : "";

  // A new location or new filters start again at page 1.
  useEffect(() => {
    setPage(1);
  }, [locationName, filters, perPage]);

  const query = {
    locationName,
    rating: Number(filters.rating),
    replied: filters.replied,
    status: filters.status,
    search: filters.search,
  };

  const {
    currentData: listData,
    isFetching,
    error: listError,
  } = useGetReviewsQuery(
    { ...query, perPage, offset: (page - 1) * perPage },
    { skip: !locationName },
  );
  const [fetchAll] = useLazyGetReviewsQuery();
  const [sync, { isLoading: syncing, error: syncError }] =
    useSyncReviewsMutation();

  const items = listData?.items ?? [];
  const total = listData?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const from = total ? (page - 1) * perPage + 1 : 0;
  const to = Math.min(total, page * perPage);
  const filtered =
    filters.rating !== "0" ||
    filters.replied ||
    filters.status !== "all" ||
    filters.search;
  const templates = useMemo(() => sampleTemplates(), []);
  const replyContext = {
    locationName: listing?.title ?? current?.name ?? "",
    locationCity: current?.city ?? "",
  };

  // A page past the end — after the last review on it was filtered away.
  useEffect(() => {
    if (page > pages) {
      setPage(pages);
    }
  }, [page, pages]);

  const onSync = async () => {
    try {
      const result = await sync({ locationName }).unwrap();
      const read = result?.synced?.reviews ?? 0;

      toast.success(
        sprintf(
          /* translators: %d: number of reviews read from Google. */
          _n(
            "Read %d review from Google.",
            "Read %d reviews from Google.",
            read,
            "foundhint-local-seo",
          ),
          read,
        ),
      );
    } catch {
      // Shown by RequestError below; a toast would say it twice.
    }
  };

  const onExport = async () => {
    setExporting(true);

    try {
      const all = await fetchAll({ ...query, perPage: 0, offset: 0 }).unwrap();
      download(
        `reviews-${new Date().toISOString().slice(0, 10)}.csv`,
        toCsv(all.items),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const noLocations = listingsState && !listings.length;
  const noListing = ready && listingsState && listings.length > 0 && !listing;

  return (
    <>
      <ReviewsHeader
        ready={ready}
        onSync={listing ? onSync : undefined}
        syncing={syncing}
      />

      <RequestError error={listError ?? syncError} />

      {noLocations ? (
        <Panel
          icon={MessageSquareIcon}
          title={__("Reviews", "foundhint-local-seo")}
        >
          <Empty>
            <EmptyTitle>
              {__("No Google locations yet", "foundhint-local-seo")}
            </EmptyTitle>
            <EmptyDescription>
              {__(
                "Connect your Google account and read your profile first — reviews are read for the locations Google reports.",
                "foundhint-local-seo",
              )}
            </EmptyDescription>
          </Empty>
        </Panel>
      ) : null}

      {noListing ? (
        <Panel
          icon={MessageSquareIcon}
          title={__("Reviews", "foundhint-local-seo")}
        >
          <Empty>
            <EmptyTitle>
              {__("This location has no Google listing", "foundhint-local-seo")}
            </EmptyTitle>
            <EmptyDescription>
              {__(
                "Reviews are read from a location's own Google listing. Link this location to one on the Google screen, or choose another location at the top of the page.",
                "foundhint-local-seo",
              )}
            </EmptyDescription>
          </Empty>
        </Panel>
      ) : null}

      {listing ? (
        <>
          <div className="fhint:grid fhint:items-start fhint:gap-5 fhint:lg:grid-cols-[minmax(0,1fr)_300px] fhint:2xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="fhint:grid fhint:min-w-0 fhint:gap-5">
              <ReviewToolbar
                from={from}
                to={to}
                total={total}
                filtered={Boolean(filtered)}
                onExport={onExport}
                exporting={exporting}
              >
                <div className="fhint:border-b fhint:border-b-border fhint:p-5">
                  <ReviewFilters filters={filters} onChange={setFilters} />
                </div>

                {isFetching && !listData ? (
                  <div className="fhint:grid fhint:gap-4 fhint:p-5">
                    <Skeleton className="fhint:h-28 fhint:w-full" />
                    <Skeleton className="fhint:h-28 fhint:w-full" />
                  </div>
                ) : null}

                {listData && !items.length ? (
                  <Empty>
                    <EmptyTitle>
                      {filtered
                        ? __(
                            "No reviews match these filters",
                            "foundhint-local-seo",
                          )
                        : __("No reviews stored yet", "foundhint-local-seo")}
                    </EmptyTitle>
                    <EmptyDescription>
                      {filtered
                        ? __(
                            "Try a different rating, status or search.",
                            "foundhint-local-seo",
                          )
                        : __(
                            "Press Sync reviews at the top to read the reviews on your Google profile.",
                            "foundhint-local-seo",
                          )}
                    </EmptyDescription>
                  </Empty>
                ) : null}

                {items.length ? (
                  <ul
                    aria-busy={isFetching ? "true" : undefined}
                    className={cn(
                      "fhint:m-0 fhint:list-none fhint:divide-y fhint:divide-border fhint:p-0",
                      isFetching && listData && "fhint:opacity-60",
                    )}
                  >
                    {items.map((review) => (
                      <li key={review.review_id} className="fhint:m-0">
                        <ReviewCard
                          review={review}
                          onReply={() => setReplying(review)}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}

                {total ? (
                  <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-x-4 fhint:gap-y-2 fhint:border-t fhint:border-t-border fhint:px-[22px] fhint:py-3.5">
                    <span className="fhint:text-[12.5px] fhint:font-semibold fhint:text-muted-strong">
                      {showingText({ from, to, total })}
                    </span>
                    <div className="fhint:min-w-0 fhint:flex-1">
                      <Pagination
                        page={page}
                        pages={pages}
                        perPage={perPage}
                        onPage={(next) => {
                          setPage(next);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        onPerPage={setPerPage}
                      />
                    </div>
                  </div>
                ) : null}
              </ReviewToolbar>
            </div>

            <aside
              aria-label={__("Review tools", "foundhint-local-seo")}
              className="fhint:grid fhint:gap-5"
            >
              <ProFeature
                feature="reviews.templates"
                fallback={<TemplatesCard />}
              >
                <ProTemplatesCard />
              </ProFeature>
            </aside>
          </div>
        </>
      ) : null}

      {replying ? (
        <ReplyDialog
          review={replying}
          context={replyContext}
          templates={templates}
          onClose={() => setReplying(null)}
        />
      ) : null}
    </>
  );
}
