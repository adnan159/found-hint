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
 */
export function ProfileTabs({
  tabs,
  getSectionState,
  onSave,
  onDiscard,
  disabled,
}) {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="fhint:gap-4"
    >
      <TabsList
        variant="line"
        aria-label={__("Profile sections", "foundhint-local-seo")}
        className="fhint:h-auto! fhint:w-full fhint:flex-nowrap fhint:justify-start fhint:gap-1 fhint:overflow-x-auto fhint:overflow-y-hidden fhint:p-0 fhint:pb-[5px] fhint:shadow-[inset_0_-2px_0_var(--border)]"
      >
        {tabs.map(({ id, icon: Icon, label }) => {
          const mark = TAB_STATUS_MARKS[getSectionState(id)];

          return (
            <TabsTrigger
              key={id}
              value={id}
              className="fhint:flex-none fhint:cursor-pointer fhint:rounded-none fhint:px-2.5 fhint:py-2 fhint:text-[13px] fhint:font-bold"
            >
              <Icon aria-hidden="true" />
              {label}
              {mark ? (
                <span
                  className={cn(
                    "fhint:size-2 fhint:flex-none fhint:rounded-full",
                    mark.tone,
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
        </TabsContent>
      ))}
    </Tabs>
  );
}

export default ProfileTabs;
