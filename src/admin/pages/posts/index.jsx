import { useEffect, useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import {
  FileSpreadsheetIcon,
  HistoryIcon,
  PlusIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/PageHeader";
import RequestError from "@/components/RequestError";
import SectionCard from "@/components/SectionCard";
import { pillButton } from "@/components/location-bar/styles";
import { HeaderActions } from "@/context/HeaderActions";
import useSelectedLocation from "@/hooks/useSelectedLocation";
import { linkButton, primaryButton, quietButton } from "@/pages/profile/styles";
import Pagination from "@/pages/reviews/components/Pagination";
import SoonTag from "@/pages/reviews/components/SoonTag";
import {
  useGetPostStateQuery,
  useGetPostsQuery,
  useSyncPostsMutation,
} from "@/store/api/postsApi";
import Composer from "./components/Composer";
import PostFilters from "./components/PostFilters";
import PostRow from "./components/PostRow";
import { BlogCard, ReviewsCard } from "./components/TopCards";
import { blankPost, reviewPost, showingText } from "./lib/posts";

/**
 * Posts & Scheduling: the posts on the Google listing of the location in
 * the bar at the top, and writing new ones.
 *
 * Everything here reads stored rows. "Sync posts", publishing, editing a
 * live post and deleting one are the only things that contact Google.
 *
 * Writing with AI, scheduling, CSV scheduling and sharing the website blog
 * are FoundHint Pro: drawn so they can be found, marked Pro, and inert.
 */
const NO_FILTERS = {
  type: "",
  status: "",
  days: "0",
  source: "",
  sort: "new",
};

const proButton = cn(quietButton, "fhint:gap-2");

export default function Posts() {
  const { current, ready } = useSelectedLocation();
  const [filters, setFilters] = useState(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [composing, setComposing] = useState(null);

  // Which Google listing belongs to the location in the bar.
  const { data: allState } = useGetPostStateQuery({ locationName: "" });
  const listings = allState?.locations ?? [];
  const listing =
    current && listings.find((item) => item.location_id === current.id);
  const locationName = listing ? listing.location_name : "";

  const { data: state } = useGetPostStateQuery(
    { locationName },
    { skip: !locationName },
  );

  useEffect(() => {
    setPage(1);
  }, [locationName, filters, perPage]);

  const {
    currentData: listData,
    isFetching,
    error: listError,
  } = useGetPostsQuery(
    {
      locationName,
      type: filters.type,
      status: filters.status,
      source: filters.source,
      days: Number(filters.days),
      sort: filters.sort,
      perPage,
      offset: (page - 1) * perPage,
    },
    { skip: !locationName },
  );
  const [sync, { isLoading: syncing, error: syncError }] =
    useSyncPostsMutation();

  const items = listData?.items ?? [];
  const total = listData?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const from = total ? (page - 1) * perPage + 1 : 0;
  const to = Math.min(total, page * perPage);
  const filtered =
    filters.type || filters.status || filters.source || filters.days !== "0";

  useEffect(() => {
    if (page > pages) {
      setPage(pages);
    }
  }, [page, pages]);

  const onSync = async () => {
    try {
      const result = await sync({ locationName }).unwrap();
      const read = result?.posts ?? 0;

      toast.success(
        sprintf(
          /* translators: %d: number of posts read from Google. */
          _n(
            "Read %d post from Google.",
            "Read %d posts from Google.",
            read,
            "foundhint-local-seo",
          ),
          read,
        ),
      );
    } catch {
      // Shown by RequestError below.
    }
  };

  const noLocations = allState && !listings.length;
  const noListing = ready && allState && listings.length > 0 && !listing;

  return (
    <>
      {listing ? (
        <HeaderActions>
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            className={pillButton}
          >
            <RefreshCwIcon
              aria-hidden="true"
              className={cn("fhint:size-3.5", syncing && "fhint:animate-spin")}
            />
            {syncing
              ? __("Syncing…", "foundhint-local-seo")
              : __("Sync posts", "foundhint-local-seo")}
          </button>
        </HeaderActions>
      ) : null}

      <PageHeader
        title={__("Posts & Scheduling", "foundhint-local-seo")}
        hidden
      />

      <RequestError error={listError ?? syncError} />

      {noLocations || noListing ? (
        <SectionCard title={__("Posts", "foundhint-local-seo")}>
          <Empty>
            <EmptyTitle>
              {noLocations
                ? __("No Google locations yet", "foundhint-local-seo")
                : __(
                    "This location has no Google listing",
                    "foundhint-local-seo",
                  )}
            </EmptyTitle>
            <EmptyDescription>
              {noLocations
                ? __(
                    "Connect your Google account and read your profile first — posts go to the listings Google reports.",
                    "foundhint-local-seo",
                  )
                : __(
                    "Posts are published to a location's own Google listing. Link this location to one on the Google screen, or choose another location at the top of the page.",
                    "foundhint-local-seo",
                  )}
            </EmptyDescription>
          </Empty>
        </SectionCard>
      ) : null}

      {listing ? (
        <div className="fhint:grid fhint:gap-4">
          <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:justify-end fhint:gap-2">
            <button
              type="button"
              onClick={() =>
                setFilters({ ...NO_FILTERS, status: "live", sort: "new" })
              }
              className={quietButton}
            >
              <HistoryIcon aria-hidden="true" className="fhint:size-3.5" />
              {__("History", "foundhint-local-seo")}
            </button>
            <button
              type="button"
              disabled
              title={__(
                "Scheduling posts from a CSV file is part of FoundHint Pro.",
                "foundhint-local-seo",
              )}
              className={proButton}
            >
              <FileSpreadsheetIcon
                aria-hidden="true"
                className="fhint:size-3.5"
              />
              {__("Schedule with a CSV file", "foundhint-local-seo")}
              <SoonTag kind="pro" />
            </button>
            <button
              type="button"
              disabled
              title={__(
                "Writing with AI is part of FoundHint Pro.",
                "foundhint-local-seo",
              )}
              className={proButton}
            >
              <SparklesIcon aria-hidden="true" className="fhint:size-3.5" />
              {__("Write with AI", "foundhint-local-seo")}
              <SoonTag kind="pro" />
            </button>
            <button
              type="button"
              onClick={() => setComposing(blankPost())}
              className={primaryButton}
            >
              <PlusIcon aria-hidden="true" className="fhint:size-3.5" />
              {__("New post", "foundhint-local-seo")}
            </button>
          </div>

          <BlogCard blogPosts={state?.blog_posts ?? 0} />
          <ReviewsCard
            reviews={state?.reviews ?? []}
            onMakePost={(review) => setComposing(reviewPost(review))}
          />

          <section
            aria-label={__("Your posts", "foundhint-local-seo")}
            className="fhint:border fhint:border-border fhint:bg-card"
          >
            <PostFilters
              filters={filters}
              counts={listData?.counts}
              onChange={setFilters}
            />

            {isFetching && !listData ? (
              <div className="fhint:grid fhint:gap-3 fhint:p-4">
                <Skeleton className="fhint:h-16 fhint:w-full" />
                <Skeleton className="fhint:h-16 fhint:w-full" />
              </div>
            ) : null}

            {listData && !items.length ? (
              <Empty>
                <EmptyTitle>
                  {filtered
                    ? __("No posts match these filters", "foundhint-local-seo")
                    : __("No posts yet", "foundhint-local-seo")}
                </EmptyTitle>
                <EmptyDescription>
                  {filtered
                    ? __(
                        "Try a wider date range, or clear the filters to see everything.",
                        "foundhint-local-seo",
                      )
                    : __(
                        "Write your first post, or press Sync posts at the top to read the ones already on Google.",
                        "foundhint-local-seo",
                      )}
                </EmptyDescription>
                {filtered ? (
                  <button
                    type="button"
                    onClick={() => setFilters(NO_FILTERS)}
                    className={linkButton}
                  >
                    {__("Clear filters", "foundhint-local-seo")}
                  </button>
                ) : null}
              </Empty>
            ) : null}

            <div
              aria-busy={isFetching ? "true" : undefined}
              className={cn(isFetching && listData && "fhint:opacity-60")}
            >
              {items.map((post) => (
                <PostRow
                  key={post.id}
                  post={post}
                  onEdit={() => setComposing(post)}
                />
              ))}
            </div>
          </section>

          {total ? (
            <div className="fhint:grid fhint:gap-2">
              <span className="fhint:text-[12.5px] fhint:text-muted-strong">
                {showingText(from, to, total)}
              </span>
              <Pagination
                label={__("Post pages", "foundhint-local-seo")}
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
          ) : null}
        </div>
      ) : null}

      {composing ? (
        <Composer
          post={composing}
          locationName={locationName}
          businessName={listing?.title ?? ""}
          website={state?.website ?? ""}
          uploadsReachable={state?.uploads_reachable ?? true}
          onClose={() => setComposing(null)}
        />
      ) : null}
    </>
  );
}
