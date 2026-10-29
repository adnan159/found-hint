import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { useState } from "react";
import Section from "./Section";

// How a tab says its section needs attention while another tab is open: a
// dot, with the words behind it for a screen reader.
const TAB_STATUS_MARKS = {
  dirty: {
    tone: "fhint:bg-primary",
    label: () => __("Unsaved changes", "foundhint-local-seo"),
  },
  saving: {
    tone: "fhint:bg-primary",
    label: () => __("Saving…", "foundhint-local-seo"),
  },
  error: {
    tone: "fhint:bg-destructive",
    label: () => __("Not saved", "foundhint-local-seo"),
  },
};

/**
 * The tab row and the card under it.
 *
 * Every panel is kept mounted, so a tab's own working state — photos waiting
 * to upload, an open dialog — is still there on the way back.
 *
 * @param {Object}   props
 * @param {Object[]} props.tabs      The tabs, from `buildProfileTabs()`.
 * @param {Function} props.getSectionState   Where a section stands, by id.
 * @param {Function} props.onSave    Save one section, by id.
 * @param {Function} props.onDiscard Drop one section's edits, by id.
 * @param {boolean}  props.disabled  Whether a save is under way.
 * @param {boolean}  props.locked    No Google account: every field is
 *                                   read-only. The tabs still switch.
 */
export function ProfileTabs({
  tabs,
  getSectionState,
  onSave,
  onDiscard,
  disabled,
  locked = false,
  initialTab,
}) {
  // A link can name the tab to open on (`#/business?tab=hours`); anything
  // that is not a tab opens the first one.
  const [activeTab, setActiveTab] = useState(
    tabs.some((tab) => tab.id === initialTab) ? initialTab : tabs[0].id,
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="fhint:gap-4"
    >
      <TabsList
        variant="line"
        aria-label={__("Profile sections", "foundhint-local-seo")}
        className="fhint:h-auto! fhint:w-full fhint:flex-nowrap fhint:justify-start fhint:gap-1 fhint:overflow-x-auto fhint:overflow-y-hidden fhint:p-0 fhint:shadow-[inset_0_-2px_0_var(--border)]"
      >
        {tabs.map(({ id, icon: Icon, label }) => {
          const mark = TAB_STATUS_MARKS[getSectionState(id)];

          return (
            <TabsTrigger
              key={id}
              value={id}
              className="fhint:flex-none fhint:cursor-pointer fhint:rounded-none fhint:px-2.5 fhint:py-2 fhint:text-[13px] fhint:font-bold fhint:data-active:bg-primary! fhint:data-active:text-primary-foreground! fhint:after:hidden!"
            >
              <Icon aria-hidden="true" />
              {label}
              {mark ? (
                <span
                  className={cn(
                    "fhint:size-2 fhint:flex-none fhint:rounded-full",
                    // An orange dot would vanish on the orange active tab.
                    id === activeTab && mark.tone === "fhint:bg-primary"
                      ? "fhint:bg-primary-foreground"
                      : mark.tone,
                  )}
                >
                  <span className="fhint:sr-only">{mark.label()}</span>
                </span>
              ) : null}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {tabs.map(({ id, icon, label, content, saveLabel, ...extra }) => (
        <TabsContent key={id} value={id} keepMounted>
          {/* A disabled fieldset disables every control inside it — inputs,
              selects, switches and save buttons — in one place, with the
              browser keeping them out of reach of keyboard and mouse. */}
          <fieldset
            disabled={locked}
            className="fhint:m-0 fhint:min-w-0 fhint:border-0 fhint:p-0 fhint:disabled:opacity-70"
          >
            <Section
              id={id}
              icon={icon}
              title={label}
              state={getSectionState(id)}
              saveLabel={saveLabel}
              onSave={saveLabel ? () => onSave(id) : undefined}
              onDiscard={() => onDiscard(id)}
              disabled={disabled}
              {...extra}
            >
              {content}
            </Section>
          </fieldset>
        </TabsContent>
      ))}
    </Tabs>
  );
}

export default ProfileTabs;
