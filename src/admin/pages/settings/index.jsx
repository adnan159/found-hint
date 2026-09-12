import { useEffect, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/PageHeader";
import RequestError from "@/components/RequestError";
import SectionCard from "@/components/SectionCard";
import { fieldErrors } from "@/lib/errors";
import {
  useGetSettingsQuery,
  usePurgeLogsMutation,
  useUpdateSettingsMutation,
} from "@/store/api/settingsApi";

export default function SettingsPage() {
  const { data, isLoading } = useGetSettingsQuery();
  const [updateSettings, { isLoading: isSaving, error }] =
    useUpdateSettingsMutation();
  const [purgeLogs, { isLoading: isPurging }] = usePurgeLogsMutation();

  const [form, setForm] = useState({
    delete_data_on_uninstall: false,
    log_retention_days: 30,
  });
  const [dirty, setDirty] = useState(false);

  const settings = data?.settings;
  const system = data?.system ?? {};

  useEffect(() => {
    if (!settings || dirty) {
      return;
    }

    setForm({
      delete_data_on_uninstall: Boolean(settings.delete_data_on_uninstall),
      log_retention_days: settings.log_retention_days ?? 30,
    });
  }, [settings, dirty]);

  const errors = fieldErrors(error);

  const onSubmit = async (event) => {
    event.preventDefault();

    try {
      await updateSettings({
        delete_data_on_uninstall: form.delete_data_on_uninstall,
        log_retention_days: Number(form.log_retention_days),
      }).unwrap();
      setDirty(false);
      toast.success(__("Settings saved.", "found-hint"));
    } catch {
      // Shown inline.
    }
  };

  const onPurge = async (mode) => {
    try {
      const result = await purgeLogs(mode).unwrap();
      toast.success(
        sprintf(
          /* translators: %d: number of log entries removed. */
          __("Removed %d log entries.", "found-hint"),
          result.removed ?? 0,
        ),
      );
    } catch {
      toast.error(__("Could not clear the log.", "found-hint"));
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title={__("Settings", "found-hint")} />
        <Skeleton className="fhint:h-64 fhint:w-full" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={__("Settings", "found-hint")}
        description={__("How FoundHint behaves on this site.", "found-hint")}
      />

      <form
        onSubmit={onSubmit}
        className="fhint:flex fhint:flex-col fhint:gap-5"
      >
        <RequestError error={error} />

        <SectionCard
          title={__("Your data", "found-hint")}
          description={__(
            "Nothing is deleted when you remove the plugin unless you ask for it here.",
            "found-hint",
          )}
        >
          <Field orientation="horizontal">
            <Switch
              id="fhint-delete-data"
              checked={form.delete_data_on_uninstall}
              onCheckedChange={(checked) => {
                setDirty(true);
                setForm((current) => ({
                  ...current,
                  delete_data_on_uninstall: checked,
                }));
              }}
            />
            <div className="fhint:flex fhint:flex-col fhint:gap-1">
              <FieldLabel htmlFor="fhint-delete-data">
                {__(
                  "Delete everything when the plugin is removed",
                  "found-hint",
                )}
              </FieldLabel>
              <FieldDescription>
                {__(
                  "Off by default. Deleting the plugin to troubleshoot should not cost you your business details, locations and services.",
                  "found-hint",
                )}
              </FieldDescription>
            </div>
          </Field>
        </SectionCard>

        <SectionCard
          title={__("Activity log", "found-hint")}
          description={__(
            "FoundHint records what it does, so a problem can be traced later.",
            "found-hint",
          )}
        >
          <FieldGroup className="fhint:flex fhint:flex-col fhint:gap-4">
            <Field
              className="fhint:max-w-xs"
              data-invalid={errors.log_retention_days ? true : undefined}
            >
              <FieldLabel htmlFor="fhint-retention">
                {__("Keep entries for", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-retention"
                type="number"
                min={1}
                max={365}
                value={form.log_retention_days}
                onChange={(event) => {
                  setDirty(true);
                  setForm((current) => ({
                    ...current,
                    log_retention_days: event.target.value,
                  }));
                }}
                aria-invalid={errors.log_retention_days ? true : undefined}
              />
              {errors.log_retention_days ? (
                <FieldError>{errors.log_retention_days}</FieldError>
              ) : (
                <FieldDescription>
                  {__("Days, between 1 and 365.", "found-hint")}
                </FieldDescription>
              )}
            </Field>

            <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3">
              <span className="fhint:text-sm fhint:text-muted-foreground">
                {sprintf(
                  /* translators: %d: number of entries currently stored. */
                  __("%d entries stored.", "found-hint"),
                  system.log_entries ?? 0,
                )}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPurging}
                onClick={() => onPurge("expired")}
              >
                {__("Remove expired entries", "found-hint")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPurging}
                onClick={() => onPurge("all")}
              >
                {__("Clear the log", "found-hint")}
              </Button>
            </div>
          </FieldGroup>
        </SectionCard>

        <div className="fhint:flex fhint:items-center fhint:gap-3">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Spinner data-icon="inline-start" /> : null}
            {__("Save settings", "found-hint")}
          </Button>
          {dirty ? (
            <span className="fhint:text-sm fhint:text-muted-foreground">
              {__("You have unsaved changes.", "found-hint")}
            </span>
          ) : null}
        </div>
      </form>

      <SectionCard
        title={__("System", "found-hint")}
        description={__(
          "Read-only. Safe to copy into a support request.",
          "found-hint",
        )}
      >
        <dl className="fhint:grid fhint:grid-cols-1 fhint:gap-x-8 fhint:gap-y-2 fhint:text-sm fhint:sm:grid-cols-2">
          <SystemRow
            label={__("Plugin version", "found-hint")}
            value={system.plugin_version}
          />
          <SystemRow
            label={__("Database version", "found-hint")}
            value={system.db_version}
          />
          <SystemRow
            label={__("Tables", "found-hint")}
            value={
              system.db_needs_install
                ? sprintf(
                    /* translators: %s: comma-separated list of missing table names. */
                    __("Missing: %s", "found-hint"),
                    (system.tables_missing ?? []).join(", "),
                  )
                : sprintf(
                    /* translators: %d: number of database tables. */
                    __("%d present", "found-hint"),
                    system.tables_total ?? 0,
                  )
            }
          />
          <SystemRow
            label={__("PHP version", "found-hint")}
            value={system.php_version}
          />
          <SystemRow
            label={__("WordPress version", "found-hint")}
            value={system.wp_version}
          />
          <SystemRow
            label={__("Time zone", "found-hint")}
            value={system.timezone}
          />
        </dl>
      </SectionCard>
    </>
  );
}

function SystemRow({ label, value }) {
  return (
    <div className="fhint:flex fhint:justify-between fhint:gap-4 fhint:border-b fhint:border-b-border fhint:py-1.5">
      <dt className="fhint:text-muted-foreground">{label}</dt>
      <dd className="fhint:font-bold">{value || "—"}</dd>
    </div>
  );
}
