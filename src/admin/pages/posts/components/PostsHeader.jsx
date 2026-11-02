import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { FileSpreadsheetIcon, HistoryIcon, PlusIcon } from "lucide-react";
import ScreenTitleBar, { SyncButton } from "@/components/ScreenTitleBar";
import { pillButton } from "@/components/location-bar/styles";
import SoonTag from "@/pages/reviews/components/SoonTag";

// The main action, as the Business Profile's "Send to Google": a filled pill.
const primaryPill = cn(
  pillButton,
  "fhint:border-primary fhint:bg-primary fhint:text-primary-foreground fhint:hover:bg-primary/90 fhint:disabled:border-border fhint:disabled:bg-border",
);

/**
 * The Posts & Scheduling title row: the shared screen title bar, with the
 * screen's actions on the right — History, CSV scheduling (FoundHint Pro:
 * drawn so it can be found, marked Pro, and inert), Sync posts and New post.
 *
 * The actions need a Google listing for the location; until one is chosen
 * (`hasListing` false) the row shows the title alone.
 *
 * @param {Object}   props
 * @param {boolean}  props.ready      Whether the business bar has loaded.
 * @param {boolean}  props.hasListing Whether the location has a Google listing.
 * @param {Function} props.onSync     Read posts from Google.
 * @param {boolean}  props.syncing
 * @param {Function} props.onHistory  Show the posts already live.
 * @param {Function} props.onNewPost  Open the composer on a blank post.
 */
export function PostsHeader({
  ready,
  hasListing,
  onSync,
  syncing,
  onHistory,
  onNewPost,
}) {
  return (
    <ScreenTitleBar
      title={__("Posts & Scheduling", "foundhint-local-seo")}
      hint={__(
        "The posts on this location's Google listing, and new ones to publish. Only syncing, publishing, editing a live post and deleting one contact Google.",
        "foundhint-local-seo",
      )}
      ready={ready}
      actions={
        hasListing ? (
          <>
            <button type="button" onClick={onHistory} className={pillButton}>
              <HistoryIcon aria-hidden="true" className="fhint:size-3.5" />
              {__("History", "foundhint-local-seo")}
            </button>
            <button
              type="button"
              disabled
              title={__(
                "Scheduling posts from a CSV file is part of FoundHint Premium.",
                "foundhint-local-seo",
              )}
              className={pillButton}
            >
              <FileSpreadsheetIcon
                aria-hidden="true"
                className="fhint:size-3.5"
              />
              {__("Schedule with a CSV file", "foundhint-local-seo")}
              <SoonTag kind="pro" />
            </button>
            <SyncButton
              onClick={onSync}
              syncing={syncing}
              label={__("Sync posts", "foundhint-local-seo")}
              busyLabel={__("Syncing…", "foundhint-local-seo")}
              title={__(
                "Reads the latest posts from Google. Nothing on Google is changed.",
                "foundhint-local-seo",
              )}
            />
            <button type="button" onClick={onNewPost} className={primaryPill}>
              <PlusIcon aria-hidden="true" className="fhint:size-3.5" />
              {__("New post", "foundhint-local-seo")}
            </button>
          </>
        ) : null
      }
    />
  );
}

export default PostsHeader;
