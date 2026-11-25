import { __ } from "@wordpress/i18n";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/PageHeader";
import RequestError from "@/components/RequestError";
import useSelectedLocation from "@/hooks/useSelectedLocation";
import { useGetSchemaQuery } from "@/store/api/schemaApi";
import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} from "@/store/api/settingsApi";
import PreviewCard from "./components/PreviewCard";
import PublisherCard from "./components/PublisherCard";
import RecommendationsCard from "./components/RecommendationsCard";
import StatusBanner from "./components/StatusBanner";

/**
 * Schema — what this site publishes about the business, and who publishes it.
 *
 * The preview is the graph the front end prints, read from the same cache —
 * not a second rendering that could quietly disagree with what search
 * engines actually see.
 */
export default function SchemaPage() {
  // The preview is per location: the one chosen here or elsewhere, else
  // the main location. Every location is published; this shows one.
  const { locationId, ready } = useSelectedLocation();
  const {
    currentData: schema,
    isFetching,
    error,
  } = useGetSchemaQuery(locationId, { skip: !ready });
  const isLoading = !ready || (isFetching && !schema);
  const { data: settingsData } = useGetSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSettingsMutation();

  if (isLoading || !schema) {
    return (
      <>
        <PageHeader title={__("Schema", "foundhint-local-seo")} />
        <Skeleton className="fhint:h-[60vh] fhint:w-full" />
      </>
    );
  }

  const ownership = schema.ownership ?? {};
  const mode = settingsData?.settings?.schema_mode ?? ownership.mode ?? "auto";

  const onModeChange = async (next) => {
    if (!next || next === mode) {
      return;
    }

    try {
      await updateSettings({ schema_mode: next }).unwrap();
      toast.success(__("Saved.", "foundhint-local-seo"));
    } catch {
      // Shown inline.
    }
  };

  const json = schema.graph ? JSON.stringify(schema.graph, null, 2) : "";

  return (
    <>
      <PageHeader
        title={__("Schema", "foundhint-local-seo")}
        description={__(
          "The structured data that tells search engines what your business is, where it is, and when it is open. Every location is published; this is the one chosen at the top of the page.",
          "foundhint-local-seo",
        )}
      />

      <RequestError error={error} />

      <StatusBanner schema={schema} />

      <PublisherCard
        ownership={ownership}
        mode={mode}
        onModeChange={onModeChange}
        isSaving={isSaving}
      />

      <RecommendationsCard schema={schema} />

      <PreviewCard json={json} />
    </>
  );
}
