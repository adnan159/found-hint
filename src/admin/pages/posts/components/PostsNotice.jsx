import { __ } from "@wordpress/i18n";
import { NewspaperIcon } from "lucide-react";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import Panel from "@/components/Panel";

/**
 * Why there are no posts to show: no Google locations at all, or none
 * linked to the location in the bar.
 *
 * @param {Object}  props
 * @param {boolean} props.noLocations True for no locations; false for an
 *                                    unlinked one.
 */
export function PostsNotice({ noLocations }) {
  return (
    <Panel icon={NewspaperIcon} title={__("Posts", "foundhint-local-seo")}>
      <Empty>
        <EmptyTitle>
          {noLocations
            ? __("No Google locations yet", "foundhint-local-seo")
            : __("This location has no Google listing", "foundhint-local-seo")}
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
    </Panel>
  );
}

export default PostsNotice;
