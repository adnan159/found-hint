import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder shaped like the form it replaces, so the layout does
 * not jump when the data arrives.
 */
export function BusinessSkeleton() {
  return (
    <div className="fhint:flex fhint:flex-col fhint:gap-5">
      <div className="fhint:flex fhint:flex-col fhint:gap-2">
        <Skeleton className="fhint:h-7 fhint:w-40" />
        <Skeleton className="fhint:h-4 fhint:w-[36rem] fhint:max-w-full" />
      </div>
      {[0, 1].map((section) => (
        <div
          key={section}
          className="fhint:flex fhint:flex-col fhint:gap-4 fhint:bg-card fhint:p-6 fhint:ring-1 fhint:ring-border"
        >
          <Skeleton className="fhint:h-5 fhint:w-44" />
          <div className="fhint:grid fhint:grid-cols-1 fhint:gap-4 fhint:md:grid-cols-2">
            {[0, 1, 2, 3].map((field) => (
              <Skeleton key={field} className="fhint:h-16 fhint:w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default BusinessSkeleton;
