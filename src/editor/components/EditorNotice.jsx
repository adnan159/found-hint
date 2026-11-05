import { __ } from "@wordpress/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { dialogButton, primaryAction } from "@/pages/posts/styles";
import { upgradeUrl } from "@/lib/pro";

/** What each step that is not the composer says. */
function copy(step) {
  return {
    loading: [__("Getting your post ready…", "foundhint-local-seo"), ""],
    premium: [
      __(
        "Sharing your blog is part of FoundHint Premium",
        "foundhint-local-seo",
      ),
      __(
        "With Premium, any published blog post can become a post on your Google Business Profile in one click.",
        "foundhint-local-seo",
      ),
    ],
    unpublished: [
      __("Publish this post first", "foundhint-local-seo"),
      __(
        "Google links to the article, so it has to be published on your site. Publish it (or save your changes), then try again.",
        "foundhint-local-seo",
      ),
    ],
    no_listing: [
      __("No Google Business Profile yet", "foundhint-local-seo"),
      __(
        "Connect your Google Business Profile in FoundHint, then share your post from here.",
        "foundhint-local-seo",
      ),
    ],
  }[step];
}

/**
 * The popup for every step before the composer: loading, Premium, an
 * unpublished post, or no Google listing.
 */
export function EditorNotice({ step, onClose }) {
  const [title, body] = copy(step);

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="fhint:grid fhint:max-w-md fhint:gap-3 fhint:rounded-none fhint:p-6">
        <DialogTitle className="fhint:m-0 fhint:flex fhint:items-center fhint:gap-2 fhint:text-lg fhint:font-extrabold">
          {step === "loading" ? <Spinner /> : null}
          {title}
        </DialogTitle>
        <DialogDescription className="fhint:m-0 fhint:text-sm">
          {body}
        </DialogDescription>
        {step === "loading" ? null : (
          <div className="fhint:flex fhint:justify-end fhint:gap-2">
            <button type="button" onClick={onClose} className={dialogButton}>
              {__("Close", "foundhint-local-seo")}
            </button>
            {step === "premium" ? (
              <a
                href={upgradeUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className={primaryAction}
              >
                {__("Get Premium", "foundhint-local-seo")}
              </a>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default EditorNotice;
