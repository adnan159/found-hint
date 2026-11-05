import { __ } from "@wordpress/i18n";
import { EyeIcon, LightbulbIcon } from "lucide-react";
import { cn } from "cn";
import { label } from "@/pages/profile/styles";
import PostPreview from "../PostPreview";

/** The live preview of how Google shows the post, and a tip. */
export function PreviewPane({ form, businessName }) {
  return (
    <aside
      aria-label={__("Preview", "foundhint-local-seo")}
      className="modern-scroll fhint:grid fhint:auto-rows-max fhint:content-start fhint:gap-3 fhint:md:min-h-0 fhint:md:overflow-y-auto fhint:border-t fhint:border-t-border fhint:bg-[#faf6f4] fhint:px-5 fhint:py-4 fhint:md:border-t-0 fhint:md:border-l fhint:md:border-l-border"
    >
      <span className={cn(label, "fhint:flex fhint:items-center fhint:gap-2")}>
        <EyeIcon
          aria-hidden="true"
          className="fhint:size-4 fhint:text-muted-strong"
        />
        {__("Live preview on Google", "foundhint-local-seo")}
      </span>
      <PostPreview post={form} businessName={businessName} />
      <p className="fhint:m-0 fhint:flex fhint:gap-2 fhint:border fhint:border-success/25 fhint:bg-success-tint fhint:px-3 fhint:py-2.5 fhint:text-sm">
        <LightbulbIcon
          aria-hidden="true"
          className="fhint:mt-0.5 fhint:size-3.5 fhint:flex-none"
        />
        <span>
          <strong>{__("Tip:", "foundhint-local-seo")}</strong>{" "}
          {__(
            "posts with a photo usually get more clicks than posts without one.",
            "foundhint-local-seo",
          )}
        </span>
      </p>
    </aside>
  );
}

export default PreviewPane;
