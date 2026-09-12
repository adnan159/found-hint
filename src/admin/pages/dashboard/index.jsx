import { __, sprintf } from "@wordpress/i18n";
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  CheckIcon,
  MapPinIcon,
  WrenchIcon,
} from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/PageHeader";
import SectionCard from "@/components/SectionCard";
import { useGetBusinessQuery } from "@/store/api/businessApi";
import { useGetLocationsQuery } from "@/store/api/locationsApi";
import { useGetServicesQuery } from "@/store/api/servicesApi";

/**
 * The dashboard.
 *
 * The prototype also shows a Local SEO health score, Google Business
 * Profile status, a ranking grid and a performance panel. None of those
 * have an engine behind them yet, and a card showing an invented number is
 * worse than no card: it would be indistinguishable from a real reading and
 * nobody would know not to trust it. What is here is computed from data the
 * site actually holds.
 */
export default function DashboardPage() {
  const { data: businessData, isLoading: loadingBusiness } =
    useGetBusinessQuery();
  const { data: locationsData, isLoading: loadingLocations } =
    useGetLocationsQuery();
  const { data: servicesData, isLoading: loadingServices } =
    useGetServicesQuery();

  const isLoading = loadingBusiness || loadingLocations || loadingServices;

  const business = businessData?.business;
  const locations = locationsData?.locations ?? [];
  const services = servicesData?.services ?? [];
  const primary = locations.find((item) => item.is_primary) ?? locations[0];

  const steps = [
    {
      id: "business",
      label: __("Add your business name", "found-hint"),
      done: Boolean(business?.name),
      to: "/business",
    },
    {
      id: "contact",
      label: __("Add a phone number or email", "found-hint"),
      done: Boolean(business?.phone || business?.email),
      to: "/business",
    },
    {
      id: "website",
      label: __("Add your website", "found-hint"),
      done: Boolean(business?.website),
      to: "/business",
    },
    {
      id: "location",
      label: __("Add your address", "found-hint"),
      done: Boolean(primary?.address_line_1 && primary?.city),
      to: "/locations",
    },
    {
      id: "hours",
      label: __("Set your opening hours", "found-hint"),
      done: Boolean(primary?.opening_hours?.has_any_hours),
      to: primary ? `/locations/${primary.id}` : "/locations",
    },
    {
      id: "services",
      label: __("List what you offer", "found-hint"),
      done: services.length > 0,
      to: "/services",
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);

  if (isLoading) {
    return (
      <>
        <PageHeader title={__("Dashboard", "found-hint")} />
        <div className="fhint:grid fhint:gap-4 fhint:md:grid-cols-3">
          {[0, 1, 2].map((card) => (
            <Skeleton key={card} className="fhint:h-36 fhint:w-full" />
          ))}
        </div>
        <Skeleton className="fhint:h-64 fhint:w-full" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={__("Dashboard", "found-hint")}
        description={__(
          "What you have told FoundHint about your business so far.",
          "found-hint",
        )}
      />

      {/* The setup checklist leads the screen: on a new site it is the only
          thing worth doing, and it stays useful afterwards as a summary.
          Styling follows the prototype — a large percentage, a square
          8px bar, and rows that are never struck through when done. */}
      <SectionCard
        title={__("Setup progress", "found-hint")}
        action={
          <span className="fhint:text-[13px] fhint:text-muted-strong">
            {sprintf(
              /* translators: 1: number of completed steps, 2: total steps. */
              __("%1$d of %2$d steps done", "found-hint"),
              doneCount,
              steps.length,
            )}
          </span>
        }
      >
        <div className="fhint:flex fhint:flex-col fhint:gap-4">
          <div className="fhint:flex fhint:items-baseline fhint:gap-3">
            <span className="fhint:font-heading fhint:text-[40px] fhint:leading-none fhint:font-extrabold">
              {sprintf(
                /* translators: %d: percentage of setup completed. */
                __("%d%%", "found-hint"),
                percent,
              )}
            </span>
          </div>

          <Progress
            value={percent}
            aria-label={__("Setup progress", "found-hint")}
          />

          <ul className="fhint:flex fhint:flex-col">
            {steps.map((step) => (
              <li
                key={step.id}
                className="fhint:flex fhint:items-center fhint:gap-3 fhint:border-b fhint:border-b-border fhint:py-2.5 fhint:last:border-b-0"
              >
                <span
                  aria-hidden="true"
                  className={
                    step.done
                      ? "fhint:flex fhint:size-[17px] fhint:shrink-0 fhint:items-center fhint:justify-center fhint:bg-success fhint:text-success-foreground"
                      : "fhint:flex fhint:size-[17px] fhint:shrink-0 fhint:items-center fhint:justify-center fhint:bg-muted fhint:ring-1 fhint:ring-border"
                  }
                >
                  {step.done ? <CheckIcon className="fhint:size-3" /> : null}
                </span>

                <span
                  className={
                    step.done
                      ? "fhint:text-[13px] fhint:font-medium fhint:text-muted-strong"
                      : "fhint:text-[13px] fhint:font-bold"
                  }
                >
                  {step.label}
                  <span className="fhint:sr-only">
                    {step.done
                      ? __(" — done", "found-hint")
                      : __(" — still to do", "found-hint")}
                  </span>
                </span>

                {!step.done ? (
                  <Link
                    to={step.to}
                    className="fhint:ml-auto fhint:text-[12px] fhint:font-extrabold fhint:text-link-accent fhint:no-underline fhint:hover:underline"
                  >
                    {__("Do this", "found-hint")}
                    <ArrowRightIcon
                      aria-hidden="true"
                      className="fhint:ml-1 fhint:inline fhint:size-3"
                    />
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </SectionCard>

      <div className="fhint:grid fhint:gap-4 fhint:md:grid-cols-3">
        <StatCard
          icon={BriefcaseBusinessIcon}
          label={__("Business", "found-hint")}
          value={
            business?.completeness != null
              ? sprintf(
                  /* translators: %d: percentage of the profile that is filled in. */
                  __("%d%% complete", "found-hint"),
                  business.completeness,
                )
              : __("Not started", "found-hint")
          }
          to="/business"
        />
        <StatCard
          icon={MapPinIcon}
          label={__("Locations", "found-hint")}
          value={sprintf(
            /* translators: %d: number of locations. */
            __("%d added", "found-hint"),
            locationsData?.total ?? 0,
          )}
          to="/locations"
        />
        <StatCard
          icon={WrenchIcon}
          label={__("Services", "found-hint")}
          value={sprintf(
            /* translators: %d: number of services. */
            __("%d added", "found-hint"),
            servicesData?.total ?? 0,
          )}
          to="/services"
        />
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value, to }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="fhint:flex fhint:items-center fhint:gap-2 fhint:text-[11px] fhint:font-extrabold fhint:tracking-[0.08em] fhint:uppercase">
          <Icon aria-hidden="true" className="fhint:size-3.5" />
          {label}
        </CardDescription>
        <CardTitle className="fhint:font-heading fhint:text-[19px] fhint:font-extrabold fhint:text-balance">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" render={<Link to={to} />}>
          {__("Manage", "found-hint")}
        </Button>
      </CardContent>
    </Card>
  );
}
