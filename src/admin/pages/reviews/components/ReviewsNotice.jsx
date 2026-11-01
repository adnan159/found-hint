import { __ } from "@wordpress/i18n";
import { MessageSquareIcon } from "lucide-react";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import Panel from "./Panel";

/**
 * Why there are no reviews to show, in a Reviews panel: no Google
 * locations at all, or none linked to the location in the bar.
 *
 * @param {Object} props
 * @param {string} props.title       What is missing.
 * @param {string} props.description What to do about it.
 */
export function ReviewsNotice({ title, description }) {
  return (
    <Panel
      icon={MessageSquareIcon}
      title={__("Reviews", "foundhint-local-seo")}
    >
      <Empty>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </Empty>
    </Panel>
  );
}

export default ReviewsNotice;
