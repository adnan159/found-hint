import { useEffect, useState } from "react";
import { __ } from "@wordpress/i18n";
import { ChevronDownIcon } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { cn } from "cn";

/**
 * Primary navigation.
 *
 * Every value here was measured from the prototype's own rendered styles
 * rather than judged by eye: a white 236px panel closed by a 2px
 * `rgb(32 30 29 / 40%)` rule, rows uppercase 12.5px/800 separated by
 * `#eae7e7` hairlines, and an active row set slightly larger (13.5px) in
 * `#fff1eb` on `#8a3b12` behind a 3px `#ff6b35` bar. The active row also
 * indents 6px further than an inactive one, which is what makes the bar
 * read as pushing the label aside rather than sitting on top of it.
 *
 * **Only navigation that goes somewhere is listed.** The prototype also
 * shows Schema, Landing Pages, SEO Audit, Google Business Profile, Ranking
 * Grid, Performance and Recommendations; those have no engine behind them,
 * and a row opening an empty screen reads as a broken feature rather than
 * an absent one. The same test applies to the sub-items: the prototype's
 * expandable groups are mostly decorative there, so a group survives here
 * only where its children are real destinations — the sections of the
 * Business and Settings screens, which carry matching ids.
 */
const NAV_ITEMS = [
  { to: "/", label: () => __("Dashboard", "found-hint"), end: true },
  { to: "/setup", label: () => __("Setup", "found-hint") },
  {
    to: "/business",
    label: () => __("Business", "found-hint"),
    children: [
      {
        id: "business-details",
        label: () => __("Business details", "found-hint"),
      },
      { id: "business-contact", label: () => __("Contact", "found-hint") },
      {
        id: "business-presentation",
        label: () => __("Presentation", "found-hint"),
      },
      {
        id: "business-social",
        label: () => __("Social profiles", "found-hint"),
      },
    ],
  },
  { to: "/locations", label: () => __("Locations", "found-hint") },
  { to: "/services", label: () => __("Services", "found-hint") },
  {
    to: "/settings",
    label: () => __("Settings", "found-hint"),
    children: [
      { id: "settings-data", label: () => __("Your data", "found-hint") },
      { id: "settings-log", label: () => __("Activity log", "found-hint") },
      { id: "settings-system", label: () => __("System", "found-hint") },
    ],
  },
];

const ROW_BASE =
  "fhint:block fhint:w-full fhint:border-b fhint:border-b-sidebar-border fhint:border-l-3 fhint:text-left fhint:font-extrabold fhint:tracking-[0.02em] fhint:uppercase fhint:no-underline";

const rowClasses = (isActive) =>
  cn(
    ROW_BASE,
    isActive
      ? "fhint:border-l-sidebar-primary fhint:bg-sidebar-accent fhint:py-[13px] fhint:pr-3.5 fhint:pl-[17px] fhint:text-[13.5px] fhint:text-sidebar-accent-foreground"
      : "fhint:border-l-transparent fhint:py-[11px] fhint:pr-3.5 fhint:pl-3.5 fhint:text-[12.5px] fhint:text-sidebar-foreground fhint:hover:bg-muted",
  );

/**
 * Scroll a section into view and put focus on its heading.
 *
 * Returns false when the section is not on the page yet, which is how the
 * caller knows to keep waiting.
 *
 * @param {string} id Section element id.
 * @return {boolean} Whether the section was found.
 */
function revealSection(id) {
  const el = document.getElementById(id);

  if (!el) {
    return false;
  }

  el.scrollIntoView({ behavior: "smooth", block: "start" });

  const heading = el.querySelector("[data-slot='card-title']") ?? el;

  heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });

  return true;
}

/**
 * A top-level row whose children are sections of the screen it opens.
 *
 * The group expands on its own when its screen is the current one, so the
 * sections of the page you are looking at are always listed without a
 * second click, and collapses again when you leave.
 */
function NavGroup({ item }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = pathname === item.to;
  const [open, setOpen] = useState(isActive);
  const [pending, setPending] = useState(null);

  useEffect(() => {
    setOpen(isActive);
  }, [isActive]);

  const panelId = `fhint-nav-${item.to.replace(/\W+/g, "")}`;

  // Jumping to a section is a navigation, so it moves focus there as well
  // as scrolling — otherwise a keyboard user is left where they started
  // and only sighted users actually arrive.
  //
  // A jump from another screen cannot act immediately: the destination has
  // to mount and load its data before the section exists, and how long that
  // takes is the network's business, not something to guess at with a
  // timeout. So the request is parked and an effect watches for the element
  // to appear. Waiting also settles a second race — the destination's
  // PageHeader moves focus to the page title on mount, and the section has
  // to win that, because the section is what was asked for.
  const goToSection = (id) => {
    if (isActive) {
      revealSection(id);
      return;
    }

    setPending(id);
    navigate(item.to);
  };

  useEffect(() => {
    if (!pending || !isActive) {
      return undefined;
    }

    let attempt = 0;

    // Always reveal from a task rather than straight from this effect. The
    // sidebar sits above the screen in the tree, so its effects run first,
    // and revealing inline would be immediately undone by the destination's
    // own PageHeader, which moves focus to the page title when it mounts.
    // A task runs after every effect in that commit, so the section wins —
    // and it should, because the section is what was asked for.
    const settle = () => {
      window.clearTimeout(attempt);
      attempt = window.setTimeout(() => {
        if (revealSection(pending)) {
          setPending(null);
        }
      }, 0);
    };

    settle();

    // Watch for the section being added rather than re-checking on a timer.
    // An observer fires on the DOM change itself, so it is neither slower
    // than it needs to be nor dependent on frames being painted —
    // `requestAnimationFrame` is throttled to a stop in a background tab,
    // which would leave a jump hanging until the tab was looked at again.
    const observer = new MutationObserver(settle);

    observer.observe(document.body, { childList: true, subtree: true });

    // If the screen has not produced the section in two seconds it is not
    // going to — a failed load, most likely — and quietly giving up beats
    // scrolling somewhere arbitrary later on.
    const deadline = window.setTimeout(() => setPending(null), 2000);

    return () => {
      observer.disconnect();
      window.clearTimeout(attempt);
      window.clearTimeout(deadline);
    };
  }, [pending, isActive]);

  return (
    <li>
      <div className={cn(rowClasses(isActive), "fhint:p-0")}>
        <div className="fhint:flex fhint:items-center">
          <NavLink
            to={item.to}
            className={cn(
              "fhint:flex-1 fhint:text-inherit fhint:no-underline",
              isActive
                ? "fhint:py-[13px] fhint:pl-[17px]"
                : "fhint:py-[11px] fhint:pl-3.5",
            )}
          >
            {item.label()}
          </NavLink>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
            className="fhint:flex fhint:shrink-0 fhint:cursor-pointer fhint:items-center fhint:self-stretch fhint:px-3.5 fhint:text-sidebar-chevron"
          >
            {/* Label the control, not just the icon: "Business" alone does
                not say what the button does. */}
            <span className="fhint:sr-only">
              {open
                ? __("Collapse section list", "found-hint")
                : __("Expand section list", "found-hint")}
            </span>
            <ChevronDownIcon
              aria-hidden="true"
              className={cn(
                "fhint:size-[13px] fhint:transition-transform fhint:duration-150",
                open ? "" : "fhint:-rotate-90",
              )}
              strokeWidth={2.4}
            />
          </button>
        </div>
      </div>

      <ul
        id={panelId}
        hidden={!open}
        className="fhint:flex fhint:flex-col fhint:border-b fhint:border-b-sidebar-border fhint:py-1"
      >
        {item.children.map((child) => (
          <li key={child.id}>
            <button
              type="button"
              onClick={() => goToSection(child.id)}
              className="fhint:block fhint:w-full fhint:cursor-pointer fhint:border-l-3 fhint:border-l-transparent fhint:py-[7px] fhint:pr-3.5 fhint:pl-[17px] fhint:text-left fhint:text-[13px] fhint:font-medium fhint:text-sidebar-sub-foreground fhint:hover:bg-muted"
            >
              {child.label()}
            </button>
          </li>
        ))}
      </ul>
    </li>
  );
}

export function Sidebar({ counts }) {
  return (
    <nav
      aria-label={__("FoundHint", "found-hint")}
      className="fhint:flex fhint:w-[236px] fhint:shrink-0 fhint:flex-col fhint:self-stretch fhint:border-r-2 fhint:border-r-divider fhint:bg-sidebar fhint:text-sidebar-foreground"
    >
      <div className="fhint:flex fhint:items-center fhint:gap-2.5 fhint:border-b-2 fhint:border-b-divider fhint:px-3.5 fhint:pt-4 fhint:pb-3.5">
        <span
          aria-hidden="true"
          className="fhint:flex fhint:size-[30px] fhint:shrink-0 fhint:items-center fhint:justify-center fhint:bg-primary fhint:text-[15px] fhint:font-extrabold fhint:text-primary-foreground"
        >
          F
        </span>
        <span className="fhint:flex fhint:flex-col fhint:leading-[1.05]">
          <strong className="fhint:font-heading fhint:text-[15px] fhint:font-extrabold fhint:tracking-[-0.02em] fhint:uppercase">
            {__("FoundHint", "found-hint")}
          </strong>
          <span className="fhint:text-[10.5px] fhint:font-semibold fhint:tracking-[0.12em] fhint:text-muted-foreground fhint:uppercase">
            {__("Local SEO", "found-hint")}
          </span>
        </span>
      </div>

      <ul className="fhint:flex fhint:flex-1 fhint:flex-col fhint:overflow-auto fhint:pb-5">
        {NAV_ITEMS.map((item) =>
          item.children ? (
            <NavGroup key={item.to} item={item} />
          ) : (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => rowClasses(isActive)}
              >
                {item.label()}
              </NavLink>
            </li>
          ),
        )}
      </ul>

      {/* The plan strip is permanent, not an upsell that appears when you
          are near a limit — knowing what the plan covers is part of
          reading the screen. The prototype closes it with a "See what Pro
          unlocks" button; there is nothing for it to open yet, so the
          figures ship without it. */}
      <div className="fhint:border-t-2 fhint:border-t-divider fhint:px-3.5 fhint:py-3">
        <div className="fhint:text-[11px] fhint:font-bold fhint:tracking-[0.1em] fhint:text-muted-foreground fhint:uppercase">
          {__("FoundHint Free", "found-hint")}
        </div>
        <div className="fhint:mt-1 fhint:text-[12px] fhint:text-muted-strong">
          {counts}
        </div>
      </div>
    </nav>
  );
}

export default Sidebar;
