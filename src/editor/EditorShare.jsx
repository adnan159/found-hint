import { useEffect } from "react";
import { __ } from "@wordpress/i18n";
import { toast } from "sonner";
import Composer from "@/pages/posts/components/Composer";
import ChooseListing from "./components/ChooseListing";
import EditorNotice from "./components/EditorNotice";
import useEditorShare from "./hooks/useEditorShare";

/**
 * The GBP Posting popup: the Posts screen's composer, opened on the blog
 * post being edited — or, until it can open, what stands in the way.
 *
 * @param {Object}   props
 * @param {number}   props.postId  The blog post being edited.
 * @param {Function} props.onClose Close the popup.
 */
export function EditorShare({ postId, onClose }) {
  const share = useEditorShare(postId);
  const imageLeftOff =
    share.step === "compose" && share.blog?.image_reachable === false;

  useEffect(() => {
    if (imageLeftOff) {
      toast.info(
        __(
          "Google cannot fetch the blog post's featured image from this site, so it was left off. Add a photo in the post if you want one.",
          "foundhint-local-seo",
        ),
      );
    }
  }, [imageLeftOff]);

  if (share.step === "choose") {
    return (
      <ChooseListing
        listings={share.listings}
        onChoose={share.choose}
        onClose={onClose}
      />
    );
  }

  if (share.step !== "compose") {
    return <EditorNotice step={share.step} onClose={onClose} />;
  }

  return (
    <Composer
      post={share.post}
      locationName={share.locationName}
      businessName={share.listing?.title ?? ""}
      website={share.state?.website ?? ""}
      uploadsReachable={share.state?.uploads_reachable ?? true}
      timezone={share.state?.timezone ?? ""}
      onClose={onClose}
    />
  );
}

export default EditorShare;
