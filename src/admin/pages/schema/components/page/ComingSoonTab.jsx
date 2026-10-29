import { cn } from "cn";
import SoonTag from "@/pages/reviews/components/SoonTag";
import { muted, panel } from "../styles";

/**
 * A tab whose step has not shipped yet (docs/SCHEMA-PLAN.md).
 */
export function ComingSoonTab({ title, body }) {
  return (
    <section
      className={cn(
        panel,
        "fhint:grid fhint:justify-items-start fhint:gap-2 fhint:px-5 fhint:py-6",
      )}
    >
      <h2 className="fhint:m-0 fhint:flex fhint:items-center fhint:gap-2 fhint:text-[16px] fhint:font-bold">
        {title}
        <SoonTag />
      </h2>
      <p
        className={cn(
          muted,
          "fhint:m-0 fhint:max-w-[60ch] fhint:leading-relaxed",
        )}
      >
        {body}
      </p>
    </section>
  );
}

export default ComingSoonTab;
