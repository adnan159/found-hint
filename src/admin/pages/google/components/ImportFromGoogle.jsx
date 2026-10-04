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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RequestError from "@/components/RequestError";
import SectionCard from "@/components/SectionCard";
import {
  useGetGoogleProfilesQuery,
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
      return __("Business name", "foundhint-local-seo");
    case "address":
      return __("Address", "foundhint-local-seo");
    case "phone":
      return __("Phone", "foundhint-local-seo");
    case "website":
      return __("Website", "foundhint-local-seo");
    case "description":
      return __("Description", "foundhint-local-seo");
    case "hours":
      return __("Opening hours", "foundhint-local-seo");
    case "business_type":
      return __("Business type", "foundhint-local-seo");
    case "social":
      return __("Social profiles", "foundhint-local-seo");
    case "services":
      return __("Services", "foundhint-local-seo");
    case "coordinates":
      return __("Map position", "foundhint-local-seo");
    default:
      return key;
  }
}

/**
 * What a tick changes: this location, or the business every location shares.
 *
 * Worth saying on a site with branches — importing a second shop's name
 * would otherwise rename the whole business without warning.
 */
function scopeLabel(scope) {
  switch (scope) {
    case "business":
      return __("Shared by all locations", "foundhint-local-seo");
    case "services":
      return __("Added to your services", "foundhint-local-seo");
    default:
      return __("This location", "foundhint-local-seo");
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
  const { data: overview } = useGetGoogleProfilesQuery();
  const [chosen, setChosen] = useState({});
  const [profile, setProfile] = useState("");

  const profiles = overview?.google_locations ?? [];
  // Always offered once there is more than one profile, mapped or not: each
  // profile is its own location, so "import" has to say which one. Only a
  // single-profile site needs no question.
  const needsChoice = profiles.length > 1;

  const onRead = async () => {
    try {
      const result = await preview(
        profile ? { location_name: profile } : {},
      ).unwrap();

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
        ...(profile ? { location_name: profile } : {}),
      }).unwrap();

      const count = result?.applied?.length ?? 0;

      toast.success(
        sprintf(
          /* translators: %d: how many fields were brought across. */
          _n(
            "Imported %d field from Google.",
            "Imported %d fields from Google.",
            count,
            "foundhint-local-seo",
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
      title={__("Import from Google", "foundhint-local-seo")}
      description={__(
        "Fill in your FoundHint details from the Google profile you have mapped to this location.",
        "foundhint-local-seo",
      )}
    >
      <RequestError error={readError ?? importError} />

      {needsChoice ? (
        <div className="fhint:mb-4 fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2.5">
          <span className="fhint:text-[13px] fhint:font-bold">
            {__("Which profile are you importing?", "foundhint-local-seo")}
          </span>
          <Select value={profile} onValueChange={setProfile}>
            <SelectTrigger className="fhint:min-w-[260px]">
              <SelectValue
                placeholder={__(
                  "Choose a Google profile",
                  "foundhint-local-seo",
                )}
              >
                {(value) =>
                  profiles.find((item) => item.location_name === value)
                    ?.title ??
                  __("Choose a Google profile", "foundhint-local-seo")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {profiles.map((item) => (
                <SelectItem key={item.location_name} value={item.location_name}>
                  {item.title || item.location_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
        <Button
          type="button"
          onClick={onRead}
          disabled={isReading || (needsChoice && !profile)}
        >
          {isReading ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <DownloadIcon data-icon="inline-start" />
          )}
          {previewData
            ? __("Read Google again", "foundhint-local-seo")
            : __("Read my Google profile", "foundhint-local-seo")}
        </Button>
        {!previewData ? (
          <span className="fhint:text-[13px] fhint:text-muted-strong">
            {__("Nothing is saved until you choose.", "foundhint-local-seo")}
          </span>
        ) : null}
      </div>

      {previewData ? (
        <div className="fhint:mt-5 fhint:flex fhint:flex-col fhint:gap-4">
          {previewData.creates_business ? (
            <p className="fhint:m-0 fhint:bg-notice fhint:px-3.5 fhint:py-2.5 fhint:text-[13px] fhint:text-notice-foreground">
              {__(
                "This site has no business details yet, so importing will create them from this profile.",
                "foundhint-local-seo",
              )}
            </p>
          ) : null}

          {previewData.creates_location ? (
            <p className="fhint:m-0 fhint:bg-notice fhint:px-3.5 fhint:py-2.5 fhint:text-[13px] fhint:text-notice-foreground">
              {__(
                "Importing will create a location from this profile's address and link the two, so a later import updates it rather than adding another.",
                "foundhint-local-seo",
              )}
            </p>
          ) : null}

          <p className="fhint:m-0 fhint:text-[13px] fhint:text-muted-strong">
            {__(
              "Fields you have not filled in are ticked. Fields you already hold are left for you to decide, because FoundHint cannot know which value is the newer one.",
              "foundhint-local-seo",
            )}
          </p>

          <div className="fhint:overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="fhint:w-[72px]">
                    {__("Import", "foundhint-local-seo")}
                  </TableHead>
                  <TableHead>{__("Detail", "foundhint-local-seo")}</TableHead>
                  <TableHead>
                    {__("In FoundHint", "foundhint-local-seo")}
                  </TableHead>
                  <TableHead>
                    {__("On Google", "foundhint-local-seo")}
                  </TableHead>
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
                        <span className="fhint:mt-0.5 fhint:block fhint:text-[11.5px] fhint:font-normal fhint:text-muted-strong">
                          {scopeLabel(field.scope)}
                        </span>
                        {field.differs ? (
                          <span className="fhint:mt-0.5 fhint:block fhint:text-[12px] fhint:font-bold fhint:text-notice-foreground">
                            {__("Different here", "foundhint-local-seo")}
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
                            {__(
                              "Google has nothing here",
                              "foundhint-local-seo",
                            )}
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
                ? __("Choose what to import", "foundhint-local-seo")
                : sprintf(
                    /* translators: %d: how many fields are ticked. */
                    _n(
                      "Import %d field",
                      "Import %d fields",
                      selected.length,
                      "foundhint-local-seo",
                    ),
                    selected.length,
                  )}
            </Button>
            <span className="fhint:text-[13px] fhint:text-muted-strong">
              {__(
                "Imported values are saved as your own details and can be edited afterwards.",
                "foundhint-local-seo",
              )}
            </span>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}

export default ImportFromGoogle;
