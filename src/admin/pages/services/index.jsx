import { useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  useDeleteServiceMutation,
  useGetServicesQuery,
  useReorderServicesMutation,
} from "@/store/api/servicesApi";
import ServiceDialog from "./components/ServiceDialog";

function formatPrice(service) {
  if (service.price === null || service.price === "") {
    return "—";
  }

  return service.currency
    ? `${service.currency} ${service.price}`
    : String(service.price);
}

export default function ServicesPage() {
  const { data, isLoading, error } = useGetServicesQuery();
  const [deleteService] = useDeleteServiceMutation();
  const [reorderServices, { isLoading: isReordering }] =
    useReorderServicesMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const services = data?.services ?? [];
  const limits = data?.limits;
  const canAdd = limits ? limits.can_add : true;

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (service) => {
    setEditing(service);
    setDialogOpen(true);
  };

  // Reordering sends the complete new order and the server resequences
  // every row, so moving one service can never leave two sharing a
  // position.
  const move = async (index, direction) => {
    const target = index + direction;

    if (target < 0 || target >= services.length) {
      return;
    }

    const ids = services.map((service) => service.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];

    try {
      await reorderServices(ids).unwrap();
    } catch {
      toast.error(__("Could not reorder the services.", "foundhint-local-seo"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    try {
      await deleteService(pendingDelete.id).unwrap();
      toast.success(__("Service deleted.", "foundhint-local-seo"));
    } catch {
      toast.error(__("Could not delete the service.", "foundhint-local-seo"));
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <PageHeader
        title={__("Services", "foundhint-local-seo")}
        description={__(
          "What you offer. The order here is the order they are published in.",
          "foundhint-local-seo",
        )}
        actions={
          <Button onClick={openAdd} disabled={!canAdd}>
            <PlusIcon data-icon="inline-start" />
            {__("Add service", "foundhint-local-seo")}
          </Button>
        }
      />

      <RequestError
        error={error}
        title={__("Could not load services", "foundhint-local-seo")}
      />

      {isLoading ? (
        <Card className="fhint:p-6">
          <div className="fhint:flex fhint:flex-col fhint:gap-3">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="fhint:h-10 fhint:w-full" />
            ))}
          </div>
        </Card>
      ) : services.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WrenchIcon />
            </EmptyMedia>
            <EmptyTitle>
              {__("No services yet", "foundhint-local-seo")}
            </EmptyTitle>
            <EmptyDescription>
              {__(
                "Add the things you actually sell. Search engines use them to tell what your business does.",
                "foundhint-local-seo",
              )}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openAdd}>
              <PlusIcon data-icon="inline-start" />
              {__("Add your first service", "foundhint-local-seo")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Card className="fhint:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{__("Service", "foundhint-local-seo")}</TableHead>
                <TableHead>{__("Price", "foundhint-local-seo")}</TableHead>
                <TableHead>{__("Status", "foundhint-local-seo")}</TableHead>
                <TableHead className="fhint:text-right">
                  {__("Actions", "foundhint-local-seo")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service, index) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <span className="fhint:font-bold">{service.name}</span>
                    <span className="fhint:block fhint:text-xs fhint:text-muted-foreground">
                      /{service.slug}
                    </span>
                  </TableCell>
                  <TableCell>{formatPrice(service)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        service.status === "active" ? "default" : "secondary"
                      }
                    >
                      {service.status === "active"
                        ? __("Active", "foundhint-local-seo")
                        : __("Inactive", "foundhint-local-seo")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="fhint:flex fhint:items-center fhint:justify-end fhint:gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === 0 || isReordering}
                        onClick={() => move(index, -1)}
                        aria-label={sprintf(
                          /* translators: %s: service name. */
                          __("Move %s up", "foundhint-local-seo"),
                          service.name,
                        )}
                      >
                        <ArrowUpIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === services.length - 1 || isReordering}
                        onClick={() => move(index, 1)}
                        aria-label={sprintf(
                          /* translators: %s: service name. */
                          __("Move %s down", "foundhint-local-seo"),
                          service.name,
                        )}
                      >
                        <ArrowDownIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(service)}
                        aria-label={sprintf(
                          /* translators: %s: service name. */
                          __("Edit %s", "foundhint-local-seo"),
                          service.name,
                        )}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPendingDelete(service)}
                        aria-label={sprintf(
                          /* translators: %s: service name. */
                          __("Delete %s", "foundhint-local-seo"),
                          service.name,
                        )}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
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
            /* translators: %d: number of services included in the plan. */
            __(
              "You are using all %d services included in your plan.",
              "foundhint-local-seo",
            ),
            limits.limit,
          )}
        </NoticeBar>
      ) : null}

      <ServiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        service={editing}
      />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {__("Delete this service?", "foundhint-local-seo")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? sprintf(
                    /* translators: %s: service name. */
                    __(
                      "%s will be removed from your structured data. This cannot be undone.",
                      "foundhint-local-seo",
                    ),
                    pendingDelete.name,
                  )
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {__("Keep it", "foundhint-local-seo")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {__("Delete service", "foundhint-local-seo")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
