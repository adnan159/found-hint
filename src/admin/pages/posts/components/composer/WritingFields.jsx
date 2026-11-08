import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { dialogInput } from "../../styles";
import { SUMMARY_MAX, TITLE_MAX } from "../../lib/posts";
import Field, { invalidProps } from "./Field";

function placeholders(type) {
  return {
    title:
      type === "event"
        ? __("e.g. Free kids check-up day", "foundhint-local-seo")
        : __("e.g. 20% off teeth whitening", "foundhint-local-seo"),
    summary: {
      update: __(
        "What is new? Write it the way you would tell a customer at the front desk.",
        "foundhint-local-seo",
      ),
      event: __(
        "What is happening, who it is for, and anything people should bring.",
        "foundhint-local-seo",
      ),
      offer: __(
        "What the deal is, who can get it, and how.",
        "foundhint-local-seo",
      ),
    }[type],
  };
}

/** The title (events and offers only) and the description. */
export function WritingFields({ id, form, set, errors }) {
  const type = form.topic_type;
  const dated = type !== "update";
  const hint = placeholders(type);

  return (
    <>
      {dated ? (
        <Field
          id={`${id}-title`}
          title={
            type === "event"
              ? __("Event title", "foundhint-local-seo")
              : __("Offer title", "foundhint-local-seo")
          }
          required
          count={form.title.length}
          max={TITLE_MAX}
          error={errors.title}
        >
          <input
            id={`${id}-title`}
            value={form.title}
            onChange={(event) => set({ title: event.target.value })}
            {...invalidProps(id, "title", errors)}
            placeholder={hint.title}
            className={dialogInput}
          />
        </Field>
      ) : null}

      <Field
        id={`${id}-summary`}
        title={__("Description", "foundhint-local-seo")}
        required={type !== "event"}
        count={form.summary.length}
        max={SUMMARY_MAX}
        error={errors.summary}
        hint={
          dated
            ? __(
                "Say what it is, who it is for, and what to do next.",
                "foundhint-local-seo",
              )
            : __(
                "Aim for 150 to 300 characters. Lead with the most useful detail.",
                "foundhint-local-seo",
              )
        }
      >
        <textarea
          id={`${id}-summary`}
          rows={6}
          value={form.summary}
          onChange={(event) => set({ summary: event.target.value })}
          {...invalidProps(id, "summary", errors)}
          placeholder={hint.summary}
          className={cn(dialogInput, "fhint:resize-y")}
        />
      </Field>
    </>
  );
}

export default WritingFields;
