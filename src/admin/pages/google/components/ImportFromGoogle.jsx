import { useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import RequestError from "@/components/RequestError";
import SectionCard from "@/components/SectionCard";
import {
  useImportFromGoogleMutation,
  usePreviewGoogleImportMutation,
} from "@/store/api/googleApi";

/**
 * Bringing the connected Google profile into FoundHint.
 *
 * **Nothing is written until it is chosen.** Reading Google and importing are
 * two separate presses, with everything shown side by side in between,
 * because an import that silently replaced a phone number somebody had
 * corrected here would be worse than no import at all.
 *
 * What is ticked follows one rule, stated on screen: fields FoundHint has
 * nothing for are ticked, fields that already hold something are left for
 * the operator. FoundHint cannot know which of two different values is the
 * out-of-date one.
 */
function fieldLabel(key) {
  switch (key) {
    case "name":
      return __("Business name", "found-hint");
    case "address":
      return __("Address", "found-hint");
    case "phone":
      return __("Phone", "found-hint");
    case "website":
      return __("Website", "found-hint");
    case "description":
      return __("Description", "found-hint");
    case "hours":
      return __("Opening hours", "found-hint");
    default:
      return key;
  }
}

function Value({ children }) {
  return children ? (
    <span className="fhint:break-words">{children}</span>
  ) : (
    <span className="fhint:text-muted-strong">—</span>
  );
}

export function ImportFromGoogle({ isConnected }) {
  const [
    preview,
    { data: previewData, isLoading: isReading, error: readError },
  ] = usePreviewGoogleImportMutation();
  const [runImport, { isLoading: isImporting, error: importError }] =
    useImportFromGoogleMutation();
  const [chosen, setChosen] = useState({});

  const onRead = async () => {
    try {
      const result = await preview().unwrap();

      // Start from what the server suggests, which the operator can change
      // before anything is written.
      setChosen(
        Object.fromEntries(
          (result?.fields ?? []).map((field) => [field.key, field.suggested]),
        ),
      );
    } catch {
      // Shown inline.
    }
  };

  const fields = previewData?.fields ?? [];
  const selected = fields.filter(
    (field) => field.available && chosen[field.key],
  );

  const onImport = async () => {
    try {
      const result = await runImport({
        fields: selected.map((field) => field.key),
      }).unwrap();

      const count = result?.applied?.length ?? 0;

      toast.success(
        sprintf(
          /* translators: %d: how many fields were brought across. */
          _n(
            "Imported %d field from Google.",
            "Imported %d fields from Google.",
            count,
            "found-hint",
          ),
          count,
        ),
      );

      await onRead();
    } catch {
      // Shown inline.
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <SectionCard
      id="google-import"
      title={__("Import from Google", "found-hint")}
      description={__(
        "Fill in your FoundHint details from the Google profile you have mapped to this location.",
        "found-hint",
      )}
    >
      <RequestError error={readError ?? importError} />

      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
        <Button type="button" onClick={onRead} disabled={isReading}>
          {isReading ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <DownloadIcon data-icon="inline-start" />
          )}
          {previewData
            ? __("Read Google again", "found-hint")
            : __("Read my Google profile", "found-hint")}
        </Button>
        {!previewData ? (
          <span className="fhint:text-[13px] fhint:text-muted-strong">
            {__("Nothing is saved until you choose.", "found-hint")}
          </span>
        ) : null}
      </div>

      {previewData ? (
        <div className="fhint:mt-5 fhint:flex fhint:flex-col fhint:gap-4">
          <p className="fhint:m-0 fhint:text-[13px] fhint:text-muted-strong">
            {__(
              "Fields you have not filled in are ticked. Fields you already hold are left for you to decide, because FoundHint cannot know which value is the newer one.",
              "found-hint",
            )}
          </p>

          <div className="fhint:overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="fhint:w-[72px]">
                    {__("Import", "found-hint")}
                  </TableHead>
                  <TableHead>{__("Detail", "found-hint")}</TableHead>
                  <TableHead>{__("In FoundHint", "found-hint")}</TableHead>
                  <TableHead>{__("On Google", "found-hint")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field) => {
                  const inputId = `fhint-import-${field.key}`;

                  return (
                    <TableRow key={field.key}>
                      <TableCell>
                        <input
                          id={inputId}
                          type="checkbox"
                          className="fhint:size-4 fhint:cursor-pointer fhint:accent-primary fhint:disabled:cursor-not-allowed"
                          checked={Boolean(chosen[field.key])}
                          disabled={!field.available}
                          onChange={(event) =>
                            setChosen((current) => ({
                              ...current,
                              [field.key]: event.target.checked,
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell className="fhint:font-bold">
                        <label
                          htmlFor={inputId}
                          className="fhint:cursor-pointer"
                        >
                          {fieldLabel(field.key)}
                        </label>
                        {field.differs ? (
                          <span className="fhint:mt-0.5 fhint:block fhint:text-[12px] fhint:font-bold fhint:text-notice-foreground">
                            {__("Different here", "found-hint")}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="fhint:whitespace-normal">
                        <Value>{field.ours}</Value>
                      </TableCell>
                      <TableCell className="fhint:whitespace-normal">
                        {field.available ? (
                          <Value>{field.theirs}</Value>
                        ) : (
                          <span className="fhint:text-muted-strong">
                            {__("Google has nothing here", "found-hint")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3">
            <Button
              type="button"
              onClick={onImport}
              disabled={isImporting || selected.length === 0}
            >
              {isImporting ? <Spinner data-icon="inline-start" /> : null}
              {selected.length === 0
                ? __("Choose what to import", "found-hint")
                : sprintf(
                    /* translators: %d: how many fields are ticked. */
                    _n(
                      "Import %d field",
                      "Import %d fields",
                      selected.length,
                      "found-hint",
                    ),
                    selected.length,
                  )}
            </Button>
            <span className="fhint:text-[13px] fhint:text-muted-strong">
              {__(
                "Imported values are saved as your own details and can be edited afterwards.",
                "found-hint",
              )}
            </span>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}

export default ImportFromGoogle;
