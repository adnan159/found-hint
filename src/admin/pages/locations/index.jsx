import { __, sprintf } from "@wordpress/i18n";
import { MapPinIcon, PlusIcon } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import NoticeBar from "@/components/NoticeBar";
import PageHeader from "@/components/PageHeader";
import RequestError from "@/components/RequestError";
import { useGetBusinessQuery } from "@/store/api/businessApi";
import { useGetLocationsQuery } from "@/store/api/locationsApi";

const STATUS_LABELS = {
  active: () => __("Active", "foundhint-local-seo"),
  inactive: () => __("Inactive", "foundhint-local-seo"),
  temporarily_closed: () => __("Temporarily closed", "foundhint-local-seo"),
  permanently_closed: () => __("Permanently closed", "foundhint-local-seo"),
};

export default function LocationsPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetLocationsQuery();
  const { data: businessData } = useGetBusinessQuery();

  const locations = data?.locations ?? [];
  const limits = data?.limits;
  const canAdd = limits ? limits.can_add : true;
  const hasBusiness = businessData?.exists;

  // A location belongs to a business, so the API refuses to create one
  // before the profile exists. Saying so here is better than letting the
  // form fail on submit.
  if (!isLoading && !hasBusiness) {
    return (
      <>
        <PageHeader title={__("Locations", "foundhint-local-seo")} />
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPinIcon />
            </EmptyMedia>
            <EmptyTitle>
              {__("Add your business first", "foundhint-local-seo")}
            </EmptyTitle>
            <EmptyDescription>
              {__(
                "A location belongs to a business, so start with your business details.",
                "foundhint-local-seo",
              )}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link to="/business" />}>
              {__("Go to Business", "foundhint-local-seo")}
            </Button>
          </EmptyContent>
        </Empty>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={__("Locations", "foundhint-local-seo")}
        description={__(
          "Where you trade from. Leave a contact field empty and the business value is used instead.",
          "foundhint-local-seo",
        )}
        actions={
          <Button onClick={() => navigate("/locations/new")} disabled={!canAdd}>
            <PlusIcon data-icon="inline-start" />
            {__("Add location", "foundhint-local-seo")}
          </Button>
        }
      />

      <RequestError
        error={error}
        title={__("Could not load locations", "foundhint-local-seo")}
      />

      {isLoading ? (
        <Card className="fhint:p-6">
          <div className="fhint:flex fhint:flex-col fhint:gap-3">
            {[0, 1].map((row) => (
              <Skeleton key={row} className="fhint:h-10 fhint:w-full" />
            ))}
          </div>
        </Card>
      ) : locations.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPinIcon />
            </EmptyMedia>
            <EmptyTitle>
              {__("No locations yet", "foundhint-local-seo")}
            </EmptyTitle>
            <EmptyDescription>
              {__(
                "Add the address customers visit. It is what puts you on the map.",
                "foundhint-local-seo",
              )}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => navigate("/locations/new")}>
              <PlusIcon data-icon="inline-start" />
              {__("Add your first location", "foundhint-local-seo")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Card className="fhint:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{__("Location", "foundhint-local-seo")}</TableHead>
                <TableHead>{__("Address", "foundhint-local-seo")}</TableHead>
                <TableHead>{__("Hours", "foundhint-local-seo")}</TableHead>
                <TableHead>{__("Status", "foundhint-local-seo")}</TableHead>
                <TableHead className="fhint:text-right">
                  {__("Actions", "foundhint-local-seo")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell>
                    <span className="fhint:font-bold">{location.name}</span>
                    {location.is_primary ? (
                      <span className="fhint:block fhint:text-xs fhint:text-muted-foreground">
                        {__("Primary", "foundhint-local-seo")}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="fhint:text-muted-foreground">
                    {location.formatted_address || "—"}
                  </TableCell>
                  <TableCell className="fhint:text-muted-foreground">
                    {location.opening_hours?.has_any_hours
                      ? sprintf(
                          /* translators: %d: number of opening periods in the week. */
                          __("%d periods", "foundhint-local-seo"),
                          location.opening_hours.period_count,
                        )
                      : __("Not set", "foundhint-local-seo")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        location.status === "active" ? "default" : "secondary"
                      }
                    >
                      {STATUS_LABELS[location.status]
                        ? STATUS_LABELS[location.status]()
                        : location.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="fhint:text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link to={`/locations/${location.id}`} />}
                    >
                      {__("Manage", "foundhint-local-seo")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {limits && !limits.unlimited && !canAdd ? (
        <NoticeBar>
          {sprintf(
            /* translators: %d: number of locations included in the plan. */
            __(
              "Your plan includes %d location. Multi-location management is a Pro feature.",
              "foundhint-local-seo",
            ),
            limits.limit,
          )}
        </NoticeBar>
      ) : null}
    </>
  );
}
