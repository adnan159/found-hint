import * as React from "react";
import { cn } from "cn";

function Table({ className, ...props }) {
  return (
    <div
      data-slot="table-container"
      className="fhint:relative fhint:w-full fhint:overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn(
          "fhint:w-full fhint:caption-bottom fhint:text-sm",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }) {
  return (
    <thead
      data-slot="table-header"
      className={cn("fhint:[&_tr]:border-b", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("fhint:[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "fhint:border-t fhint:bg-muted/50 fhint:font-medium fhint:[&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "fhint:border-b fhint:transition-colors fhint:hover:bg-muted/50 fhint:has-aria-expanded:bg-muted/50 fhint:data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "fhint:h-10 fhint:px-2 fhint:text-left fhint:align-middle fhint:font-medium fhint:whitespace-nowrap fhint:text-foreground fhint:[&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "fhint:p-2 fhint:align-middle fhint:whitespace-nowrap fhint:[&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }) {
  return (
    <caption
      data-slot="table-caption"
      className={cn(
        "fhint:mt-4 fhint:text-sm fhint:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
