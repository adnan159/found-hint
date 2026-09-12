import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * A titled section of a form.
 *
 * The heavy rule under the header (2px at 40% of the text colour) is the
 * prototype's most recognisable detail — it is what makes a section read as
 * a section rather than a box. Kept here so every screen gets it without
 * repeating the classes.
 */
export function SectionCard({ title, description, action, children }) {
  return (
    <Card>
      <CardHeader className="fhint:border-b-2 fhint:border-b-divider">
        {/* Uppercase, 13px/800 with wide tracking — measured from the
            prototype, where every card is titled this way. */}
        <CardTitle className="fhint:font-heading fhint:text-[13px] fhint:font-extrabold fhint:tracking-[0.1em] fhint:uppercase">
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default SectionCard;
