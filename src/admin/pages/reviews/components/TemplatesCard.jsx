import { useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { MessageSquareTextIcon } from "lucide-react";
import { cn } from "cn";
import Panel from "@/components/Panel";
import RequestError from "@/components/RequestError";
import { help } from "@/pages/profile/styles";
import SoonTag from "./SoonTag";
import TemplateDialog from "./TemplateDialog";
import RatingTabs from "./templates/RatingTabs";
import TemplateItem from "./templates/TemplateItem";
import TemplateCount from "./templates/TemplateCount";
import CardActions from "./templates/CardActions";

/**
 * Reply templates, one set per star rating, in the sidebar.
 *
 * With FoundHint Premium (`editable`): the owner's own templates, written,
 * changed and removed here. Without it: the sample set, drawn as it will
 * work, with the editor as a preview that cannot save.
 *
 * @param {Object} props From `useTemplates()`.
 */
export function TemplatesCard({
  templates,
  editable,
  loading,
  error,
  save,
  remove,
  saving,
}) {
  // "all", or a star rating from 1 to 5.
  const [rating, setRating] = useState("all");
  const [editing, setEditing] = useState(null);
  const shown =
    rating === "all"
      ? templates
      : templates.filter((template) => template.rating === rating);
  // A new template starts at the chosen rating, or 5 stars under All.
  const newRating = rating === "all" ? 5 : rating;
  const countFor = (stars, kind) =>
    templates.filter(
      (template) => template.rating === stars && template.kind === kind,
    ).length;

  return (
    <Panel
      icon={MessageSquareTextIcon}
      title={__("Reply templates", "foundhint-local-seo")}
      after={editable ? null : <SoonTag kind="pro" />}
      description={__(
        "Ready-made replies for each star rating.",
        "foundhint-local-seo",
      )}
      bodyClassName="fhint:gap-3"
    >
      <CardActions onAdd={() => setEditing("new")} />
      <RequestError error={error} />
      <RatingTabs rating={rating} onChange={setRating} />

      <TemplateCount loading={loading} rating={rating} count={shown.length} />

      <ul
        role="tabpanel"
        className="fhint:m-0 fhint:grid fhint:list-none fhint:gap-2 fhint:p-0"
      >
        {shown.map((template) => (
          <TemplateItem
            key={template.id}
            template={template}
            onEdit={setEditing}
          />
        ))}
        {shown.length || loading ? null : (
          <li className={help}>
            {rating === "all"
              ? __("No templates yet.", "foundhint-local-seo")
              : sprintf(
                  /* translators: %d: a star rating from 1 to 5. */
                  __(
                    "No templates for %d-star reviews yet.",
                    "foundhint-local-seo",
                  ),
                  newRating,
                )}
          </li>
        )}
      </ul>

      <p className={cn(help, "fhint:m-0")}>
        {__(
          "Templates are shared by all your locations. Words in curly brackets are swapped for the reviewer's and the location's details when you reply.",
          "foundhint-local-seo",
        )}
      </p>

      {editing ? (
        <TemplateDialog
          template={editing === "new" ? null : editing}
          rating={newRating}
          countFor={countFor}
          editable={editable}
          saving={saving}
          onSave={save}
          onRemove={remove}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Panel>
  );
}

export default TemplatesCard;
