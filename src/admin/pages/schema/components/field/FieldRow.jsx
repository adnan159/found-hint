import { useId } from "react";
import { cn } from "cn";
import { WIDE_FIELDS, fieldStatus } from "../../lib/field";
import FieldControl from "./FieldControl";
import FieldHeader from "./FieldHeader";
import FieldNotes from "./FieldNotes";

/**
 * One field: label, badges (requirement, From Google / Edited here), the
 * Edit ↔ Use Google's value action, the input, and the caption naming its
 * Business Profile source and the Schema.org property it becomes — so an
 * error in Google's test maps to exactly one field (doc §11.1, 13.16).
 *
 * A value from Google is read-only until Edit; an edited one shows
 * "Edited here" and can go back to Google's.
 *
 * The parts live in `components/field/`; the rules in `lib/field`.
 */
export function FieldRow({
  field,
  value,
  editing,
  locked,
  missing,
  visitMode,
  error,
  photos,
  scope = "business",
  fullRow = false,
  onEdit,
  onReset,
  onChange,
}) {
  const id = useId();
  const status = fieldStatus(field, { editing, locked, missing, error });
  const describedBy = `${id}-caption${error ? ` ${id}-error` : ""}`;

  return (
    <div
      className={cn(
        "fhint:grid fhint:min-w-0 fhint:content-start fhint:gap-1.5",
        // A long field, or a group laid out one per row, takes the row.
        (fullRow || WIDE_FIELDS.includes(field.key)) && "fhint:col-span-full",
      )}
    >
      <FieldHeader
        id={id}
        field={field}
        scope={scope}
        status={status}
        visitMode={visitMode}
        onEdit={onEdit}
        onReset={onReset}
      />
      <FieldControl
        id={id}
        field={field}
        value={value}
        status={status}
        describedBy={describedBy}
        photos={photos}
        onChange={onChange}
      />
      <FieldNotes
        id={id}
        field={field}
        value={value}
        error={error}
        missing={missing}
      />
    </div>
  );
}

export default FieldRow;
