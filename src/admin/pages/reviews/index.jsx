import { useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { MessageSquareIcon, RefreshCwIcon, StarIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/PageHeader";
import RequestError from "@/components/RequestError";
import SectionCard from "@/components/SectionCard";
import {
  useGetReviewStateQuery,
  useGetReviewsQuery,
  useSyncReviewsMutation,
} from "@/store/api/reviewsApi";

/**
 * Google reviews.
 *
 * Everything on this screen is read from stored rows. Pressing *Read from
 * Google* is the only thing that contacts Google, because asking costs a
 * request against a quota every site using this plugin shares.
 *
 * Reviews are shown here, in the admin, and are deliberately not published
 * to the front end: review content belongs to its author and to Google, and
 * republishing it as the site's own structured data is not something this
 * plugin will do on an owner's behalf.
 */
const PER_PAGE = 20;

function formatWhen(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(`${value.replace(" ", "T")}Z`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * A rating, as stars and as words.
 *
 * The number is spelled out next to the stars on purpose: a row of icons is
 * a colour-and-shape signal, and the rating must survive somebody who cannot
 * tell those apart.
 */
function Rating({ value }) {
  if (!value) {
    return (
      <span className="fhint:text-[13px] fhint:text-muted-foreground">
        {__("No rating", "foundhint-local-seo")}
      </span>
    );
  }

  return (
    <span className="fhint:flex fhint:items-center fhint:gap-1.5">
      <span
        aria-hidden="true"
        className="fhint:flex fhint:items-center fhint:gap-0.5"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={
              star <= value
                ? "fhint:size-3.5 fhint:fill-current"
                : "fhint:size-3.5 fhint:text-muted-foreground"
            }
          />
        ))}
      </span>
      <span className="fhint:text-[13px] fhint:font-bold">
        {sprintf(
          /* translators: %d: a star rating from 1 to 5. */
          _n("%d star", "%d stars", value, "foundhint-local-seo"),
          value,
        )}
      </span>
    </span>
  );
}

function ReviewRow({ review }) {
  return (
    <li className="fhint:border-b fhint:border-border fhint:py-4 last:fhint:border-b-0">
      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-x-3 fhint:gap-y-1.5">
        <Rating value={review.star_rating} />
        <span className="fhint:text-[13px] fhint:font-bold">
          {review.is_anonymous || !review.reviewer_name
            ? __("Anonymous", "foundhint-local-seo")
            : review.reviewer_name}
        </span>
        {review.reviewed_at ? (
          <span className="fhint:text-[13px] fhint:text-muted-foreground">
            {formatWhen(review.reviewed_at)}
          </span>
        ) : null}
        {review.location_title ? (
          <span className="fhint:text-[13px] fhint:text-muted-foreground">
            {review.location_title}
          </span>
        ) : null}
        {review.needs_reply ? (
          <Badge variant="secondary">
            {__("Needs a reply", "foundhint-local-seo")}
          </Badge>
        ) : null}
      </div>

      {review.comment ? (
        <p className="fhint:mt-2 fhint:text-sm">{review.comment}</p>
      ) : (
        <p className="fhint:mt-2 fhint:text-sm fhint:text-muted-foreground">
          {__("A rating with no comment.", "foundhint-local-seo")}
        </p>
      )}

      {review.reply_comment ? (
        <div className="fhint:mt-3 fhint:border-l-2 fhint:border-border fhint:pl-3">
          <p className="fhint:text-[13px] fhint:font-bold">
            {__("Your reply", "foundhint-local-seo")}
            {review.replied_at ? ` · ${formatWhen(review.replied_at)}` : ""}
          </p>
          <p className="fhint:mt-1 fhint:text-sm">{review.reply_comment}</p>
        </div>
      ) : null}
    </li>
  );
}

export default function Reviews() {
  const [locationName, setLocationName] = useState("");
  const [unanswered, setUnanswered] = useState(false);
  const [perPage, setPerPage] = useState(PER_PAGE);

  const {
    data: state,
    isLoading: stateLoading,
    error: stateError,
  } = useGetReviewStateQuery({ locationName });

  const {
    data: listing,
    isFetching: listLoading,
    error: listError,
  } = useGetReviewsQuery({ locationName, unanswered, perPage });

  const [sync, { isLoading: syncing, error: syncError }] =
    useSyncReviewsMutation();

  const locations = state?.locations ?? [];
  const items = listing?.items ?? [];
  const total = listing?.total ?? 0;

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
      // The error is rendered by RequestError below; the toast would only
      // repeat it, and a screen reader would hear the same thing twice.
    }
  };

  return (
    <>
      <PageHeader
        title={__("Reviews", "foundhint-local-seo")}
        description={__(
          "What people are saying on your Google Business Profile, and which reviews are still waiting on you.",
          "foundhint-local-seo",
        )}
        actions={
          <Button
            type="button"
            onClick={onSync}
            disabled={syncing || !locations.length}
          >
            {syncing ? (
              <>
                <Spinner data-icon="inline-start" />
                {__("Reading…", "foundhint-local-seo")}
              </>
            ) : (
              <>
                <RefreshCwIcon data-icon="inline-start" />
                {__("Read from Google", "foundhint-local-seo")}
              </>
            )}
          </Button>
        }
      />

      <RequestError error={stateError ?? listError ?? syncError} />

      {!stateLoading && !locations.length ? (
        <SectionCard title={__("Reviews", "foundhint-local-seo")}>
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
        </SectionCard>
      ) : null}

      {locations.length ? (
        <SectionCard
          id="reviews-summary"
          title={__("At a glance", "foundhint-local-seo")}
          description={
            state?.synced_at
              ? sprintf(
                  /* translators: %s: a date, e.g. "4 Oct 2026". */
                  __("Last read from Google on %s.", "foundhint-local-seo"),
                  formatWhen(state.synced_at),
                )
              : __("Not read from Google yet.", "foundhint-local-seo")
          }
        >
          {stateLoading ? (
            <Skeleton className="fhint:h-20 fhint:w-full" />
          ) : (
            <div className="fhint:flex fhint:flex-wrap fhint:gap-8">
              <div>
                <p className="fhint:text-2xl fhint:font-bold">
                  {state?.average || "—"}
                </p>
                <p className="fhint:text-[13px] fhint:text-muted-foreground">
                  {__("Average rating", "foundhint-local-seo")}
                </p>
              </div>
              <div>
                <p className="fhint:text-2xl fhint:font-bold">
                  {state?.count ?? 0}
                </p>
                <p className="fhint:text-[13px] fhint:text-muted-foreground">
                  {__("Reviews", "foundhint-local-seo")}
                </p>
              </div>
              <div>
                <p className="fhint:text-2xl fhint:font-bold">
                  {state?.unanswered ?? 0}
                </p>
                <p className="fhint:text-[13px] fhint:text-muted-foreground">
                  {__("Waiting on a reply", "foundhint-local-seo")}
                </p>
              </div>
            </div>
          )}
        </SectionCard>
      ) : null}

      {locations.length ? (
        <SectionCard
          id="reviews-list"
          title={__("Every review", "foundhint-local-seo")}
          action={
            <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-4">
              {locations.length > 1 ? (
                <Select
                  value={locationName || "all"}
                  onValueChange={(value) =>
                    setLocationName(value === "all" ? "" : value)
                  }
                >
                  <SelectTrigger className="fhint:min-w-[220px]">
                    <SelectValue>
                      {(value) =>
                        value === "all"
                          ? __("All locations", "foundhint-local-seo")
                          : (locations.find(
                              (item) => item.location_name === value,
                            )?.title ??
                            __("All locations", "foundhint-local-seo"))
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {__("All locations", "foundhint-local-seo")}
                    </SelectItem>
                    {locations.map((item) => (
                      <SelectItem
                        key={item.location_name}
                        value={item.location_name}
                      >
                        {item.title || item.location_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}

              <div className="fhint:flex fhint:items-center fhint:gap-2">
                <Switch
                  id="reviews-unanswered"
                  checked={unanswered}
                  onCheckedChange={(value) => setUnanswered(Boolean(value))}
                />
                <Label htmlFor="reviews-unanswered">
                  {__("Only those needing a reply", "foundhint-local-seo")}
                </Label>
              </div>
            </div>
          }
        >
          {listLoading && !items.length ? (
            <Skeleton className="fhint:h-32 fhint:w-full" />
          ) : null}

          {!listLoading && !items.length ? (
            <Empty>
              <EmptyTitle>
                {unanswered
                  ? __("Nothing waiting on you", "foundhint-local-seo")
                  : __("No reviews stored yet", "foundhint-local-seo")}
              </EmptyTitle>
              <EmptyDescription>
                {unanswered
                  ? __(
                      "Every review you have has an answer.",
                      "foundhint-local-seo",
                    )
                  : __(
                      "Press Read from Google to fetch the reviews on your profile.",
                      "foundhint-local-seo",
                    )}
              </EmptyDescription>
            </Empty>
          ) : null}

          {items.length ? (
            <>
              <ul className="fhint:mt-1">
                {items.map((review) => (
                  <ReviewRow key={review.review_id} review={review} />
                ))}
              </ul>

              <p
                aria-live="polite"
                className="fhint:mt-4 fhint:text-[13px] fhint:text-muted-foreground"
              >
                {sprintf(
                  /* translators: 1: how many reviews are shown, 2: how many there are. */
                  __("Showing %1$d of %2$d.", "foundhint-local-seo"),
                  items.length,
                  total,
                )}
              </p>

              {items.length < total ? (
                <Button
                  type="button"
                  variant="outline"
                  className="fhint:mt-3"
                  onClick={() => setPerPage(perPage + PER_PAGE)}
                  disabled={listLoading}
                >
                  <MessageSquareIcon data-icon="inline-start" />
                  {__("Show more", "foundhint-local-seo")}
                </Button>
              ) : null}
            </>
          ) : null}
        </SectionCard>
      ) : null}
    </>
  );
}
