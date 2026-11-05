import { useMemo, useState } from "react";
import { __ } from "@wordpress/i18n";
import RequestError from "@/components/RequestError";
import ListFooter from "@/components/ListFooter";
import ProFeature from "@/components/ProFeature";
import ProTemplatesCard from "./components/ProTemplatesCard";
import ReplyDialog from "./components/ReplyDialog";
import ReviewFilters from "./components/ReviewFilters";
import ReviewList from "./components/ReviewList";
import ReviewsHeader from "./components/ReviewsHeader";
import ReviewsNotice from "./components/ReviewsNotice";
import ReviewToolbar, { showingText } from "./components/ReviewToolbar";
import TemplatesCard from "./components/TemplatesCard";
import useReviewActions from "./hooks/useReviewActions";
import useReviewList from "./hooks/useReviewList";
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
 *
 * The list and its paging live in `useReviewList`, sync and export in
 * `useReviewActions`; this component only lays the screen out.
 */
export default function Reviews() {
  const list = useReviewList();
  const actions = useReviewActions({
    locationName: list.locationName,
    query: list.query,
  });
  const [replying, setReplying] = useState(null);
  const templates = useMemo(() => sampleTemplates(), []);

  const replyContext = {
    locationName: list.listing?.title ?? list.current?.name ?? "",
    locationCity: list.current?.city ?? "",
  };

  return (
    <>
      <ReviewsHeader
        ready={list.ready}
        onSync={list.listing ? actions.onSync : undefined}
        syncing={actions.syncing}
      />

      <RequestError error={list.listError ?? actions.syncError} />

      {list.noLocations ? (
        <ReviewsNotice
          title={__("No Google locations yet", "foundhint-local-seo")}
          description={__(
            "Connect your Google account and read your profile first — reviews are read for the locations Google reports.",
            "foundhint-local-seo",
          )}
        />
      ) : null}

      {list.noListing ? (
        <ReviewsNotice
          title={__(
            "This location has no Google listing",
            "foundhint-local-seo",
          )}
          description={__(
            "Reviews are read from a location's own Google listing. Link this location to one on the Google screen, or choose another location at the top of the page.",
            "foundhint-local-seo",
          )}
        />
      ) : null}

      {list.listing ? (
        <div className="fhint:grid fhint:items-start fhint:gap-5 fhint:lg:grid-cols-[minmax(0,1fr)_320px] fhint:xl:grid-cols-[minmax(0,1fr)_350px]">
          <div className="fhint:grid fhint:min-w-0 fhint:gap-5">
            <ReviewToolbar
              from={list.from}
              to={list.to}
              total={list.total}
              filtered={list.filtered}
              onExport={actions.onExport}
              exporting={actions.exporting}
            >
              <div className="fhint:border-b fhint:border-b-border fhint:p-5">
                <ReviewFilters
                  filters={list.filters}
                  onChange={list.setFilters}
                />
              </div>

              <ReviewList
                items={list.items}
                loaded={list.loaded}
                isFetching={list.isFetching}
                filtered={list.filtered}
                onReply={setReplying}
              />

              {list.total ? (
                <ListFooter
                  summary={showingText(list)}
                  page={list.page}
                  pages={list.pages}
                  perPage={list.perPage}
                  onPage={list.setPage}
                  onPerPage={list.setPerPage}
                />
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
