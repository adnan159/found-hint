import { __ } from "@wordpress/i18n";
import { Button } from "@/components/ui/button";

/**
 * The welcome screen.
 *
 * Copy and layout follow the prototype, minus its Google Business Profile
 * pillar — there is no Google integration behind that yet, and promising
 * it here would be the first thing setup got wrong.
 */
const PILLARS = [
  {
    eyebrow: __("Build", "found-hint"),
    title: __("Your details, once", "found-hint"),
    body: __(
      "Name, address, hours and services live in one place.",
      "found-hint",
    ),
  },
  {
    eyebrow: __("Publish", "found-hint"),
    title: __("Say it consistently", "found-hint"),
    body: __(
      "The same details everywhere they appear, so nothing contradicts itself.",
      "found-hint",
    ),
  },
  {
    eyebrow: __("Keep", "found-hint"),
    title: __("Change it in one place", "found-hint"),
    body: __(
      "Move premises or change your hours and you edit it once.",
      "found-hint",
    ),
  },
];

export function WelcomeStep({ onStart, onSkipToDashboard }) {
  return (
    <div className="fhint:flex fhint:flex-col fhint:gap-7">
      <div className="fhint:flex fhint:flex-col fhint:gap-5">
        <p className="fhint:max-w-[58ch] fhint:text-[16.5px] fhint:leading-relaxed fhint:text-[#444141]">
          {__(
            "Set up your business details so customers and search engines find the same answers wherever they look — your address, your opening hours and what you offer.",
            "found-hint",
          )}
        </p>

        <div className="fhint:flex fhint:flex-wrap fhint:gap-2.5">
          <Button size="lg" onClick={onStart}>
            {__("Get started", "found-hint")}
          </Button>
          <Button size="lg" variant="outline" onClick={onSkipToDashboard}>
            {__("Skip to dashboard", "found-hint")}
          </Button>
        </div>
      </div>

      <div className="fhint:grid fhint:gap-px fhint:bg-border fhint:sm:grid-cols-3">
        {PILLARS.map((pillar) => (
          <div key={pillar.eyebrow} className="fhint:bg-card fhint:p-5">
            <div className="fhint:mb-2 fhint:text-[11px] fhint:font-extrabold fhint:tracking-[0.14em] fhint:text-primary fhint:uppercase">
              {pillar.eyebrow}
            </div>
            <div className="fhint:mb-1 fhint:text-[14.5px] fhint:font-extrabold">
              {pillar.title}
            </div>
            <div className="fhint:text-[13px] fhint:leading-relaxed fhint:text-muted-strong">
              {pillar.body}
            </div>
          </div>
        ))}
      </div>

      <p className="fhint:text-[12.5px] fhint:text-muted-foreground">
        {__(
          "Takes about five minutes. You can change anything later.",
          "found-hint",
        )}
      </p>
    </div>
  );
}

export default WelcomeStep;
