import { useId, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import {
  CalendarClockIcon,
  FileIcon,
  GlobeIcon,
  LightbulbIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
  XIcon,
  ZapIcon,
  EyeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { errorMessage, fieldErrors } from "@/lib/errors";
import {
  errorText,
  focus,
  help,
  label,
  primaryButton,
} from "@/pages/profile/styles";
import SoonTag from "@/pages/reviews/components/SoonTag";
import { dialogButton, dialogInput } from "@/pages/reviews/styles";
import {
  useCreatePostMutation,
  useUpdatePostMutation,
} from "@/store/api/postsApi";
import PhotoField from "./PhotoField";
import PostPreview from "./PostPreview";
import TypeIcon from "./TypeIcon";
import {
  SUMMARY_MAX,
  TITLE_MAX,
  TYPES,
  blankPost,
  buttonOptions,
  toInput,
  typeHint,
  typeLabel,
} from "../lib/posts";

const segment = (on) =>
  cn(
    "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-1.5 fhint:border-0 fhint:px-3 fhint:py-1.5 fhint:text-[12.5px] fhint:font-extrabold fhint:disabled:cursor-not-allowed",
    on
      ? "fhint:bg-card fhint:text-foreground fhint:shadow-sm"
      : "fhint:bg-transparent fhint:text-muted-strong fhint:disabled:text-muted-foreground",
    focus,
  );

/** One labelled input with its counter and error. */
function Field({ id, title, required, count, max, error, hint, children }) {
  return (
    <div className="fhint:grid fhint:gap-1.5">
      <span className="fhint:flex fhint:items-baseline fhint:gap-2">
        <label htmlFor={id} className={label}>
          {title}
          {required ? (
            <span aria-hidden="true" className="fhint:text-destructive">
              {" *"}
            </span>
          ) : null}
        </label>
        {max ? (
          <span
            className={cn(
              "fhint:ml-auto fhint:text-[12px] fhint:font-semibold",
              count > max
                ? "fhint:text-destructive"
                : "fhint:text-muted-strong",
            )}
          >
            {`${count.toLocaleString()} / ${max.toLocaleString()}`}
          </span>
        ) : null}
      </span>
      {children}
      {hint && !error ? <span className={help}>{hint}</span> : null}
      {error ? (
        <span id={`${id}-error`} role="alert" className={errorText}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Writing or editing one post: the type, the words, the button, the photo
 * and when it goes out, beside a live preview of how Google shows it.
 *
 * A post already on Google can only be changed by publishing the change,
 * and keeps its type — Google does not allow either otherwise.
 *
 * @param {Object}   props
 * @param {Object}   props.post         The post being edited, or a starting point for a new one.
 * @param {string}   props.locationName Google location resource name.
 * @param {string}   props.businessName The listing's name, for the preview.
 * @param {string}   props.website      The listing's website, for "Use my website address".
 * @param {Function} props.onClose      Close.
 */
export function Composer({
  post,
  locationName,
  businessName,
  website,
  uploadsReachable,
  onClose,
}) {
  const id = useId();
  const [savedId, setSavedId] = useState(post?.id ?? 0);
  const [form, setForm] = useState(() => ({
    ...blankPost(post?.topic_type ?? "update"),
    ...(post ?? {}),
    starts_at: post?.starts_at ?? "",
    ends_at: post?.ends_at ?? "",
  }));
  const [when, setWhen] = useState(post?.status === "draft" ? "draft" : "now");
  const [reachable, setReachable] = useState(post?.media_reachable ?? true);
  const [create, createState] = useCreatePostMutation();
  const [update, updateState] = useUpdatePostMutation();

  const onGoogle = Boolean(post?.on_google);
  const isNew = !savedId;
  const saving = createState.isLoading || updateState.isLoading;
  const error = createState.error ?? updateState.error;
  const errors = fieldErrors(error);
  const requestError =
    error && !Object.keys(errors).length ? errorMessage(error) : "";
  const type = form.topic_type;
  const isEvent = type === "event";
  const dated = type !== "update";

  const set = (changes) => {
    createState.reset();
    updateState.reset();
    setForm((current) => ({ ...current, ...changes }));
  };

  const switchType = (next) => {
    if (next === type) {
      return;
    }

    set({
      topic_type: next,
      cta_type:
        next === "offer"
          ? ""
          : form.cta_type || (next === "event" ? "book" : "learn_more"),
    });
  };

  const submit = async (event) => {
    event?.preventDefault();

    const publish = onGoogle || when === "now";
    const fields = {
      topic_type: form.topic_type,
      title: form.title,
      summary: form.summary,
      cta_type: form.cta_type,
      cta_url: form.cta_url,
      starts_at: form.starts_at,
      ends_at: form.ends_at,
      coupon_code: form.coupon_code,
      redeem_url: form.redeem_url,
      terms: form.terms,
      media_url: form.media_url,
      attachment_id: form.attachment_id || 0,
    };

    try {
      if (isNew) {
        await create({
          ...fields,
          source: form.source,
          source_ref: form.source_ref,
          locationName,
          publish,
        }).unwrap();
      } else {
        await update({ id: savedId, ...fields, publish }).unwrap();
      }

      toast.success(
        onGoogle
          ? __("Your post was updated on Google.", "foundhint-local-seo")
          : publish
            ? __("Your post was published on Google.", "foundhint-local-seo")
            : __("Draft saved.", "foundhint-local-seo"),
      );
      onClose();
    } catch (failure) {
      // A new post Google refused is still saved, as failed: carry on
      // editing that one, so pressing Publish again does not make a copy.
      const stored = failure?.data?.data?.post_id;

      if (isNew && stored) {
        setSavedId(stored);
      }
    }
  };

  const primaryLabel = saving
    ? __("Sending…", "foundhint-local-seo")
    : onGoogle
      ? __("Update on Google", "foundhint-local-seo")
      : when === "draft"
        ? __("Save draft", "foundhint-local-seo")
        : __("Publish to Google", "foundhint-local-seo");

  const describedBy = (field) =>
    errors[field] ? `${id}-${field}-error` : undefined;

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent
        showCloseButton={false}
        className="fhint:flex fhint:max-h-[calc(100vh-3rem)] fhint:w-[calc(100vw-2rem)] fhint:flex-col fhint:gap-0 fhint:rounded-none fhint:border fhint:border-[#b9b2af] fhint:p-0 fhint:shadow-2xl fhint:ring-0 fhint:sm:max-w-[960px]"
      >
        <div className="fhint:flex fhint:flex-none fhint:items-center fhint:gap-3 fhint:border-b fhint:border-b-border fhint:px-5 fhint:py-3.5">
          <span
            aria-hidden="true"
            className="fhint:grid fhint:size-8 fhint:place-items-center fhint:border fhint:border-border fhint:bg-muted"
          >
            {isNew ? (
              <PlusIcon className="fhint:size-4" />
            ) : (
              <PencilIcon className="fhint:size-4" />
            )}
          </span>
          <div className="fhint:grid fhint:min-w-0 fhint:flex-1">
            <DialogTitle className="fhint:m-0 fhint:text-[17px] fhint:leading-tight fhint:font-extrabold">
              {isNew
                ? __("New post", "foundhint-local-seo")
                : onGoogle
                  ? __("Edit post", "foundhint-local-seo")
                  : __("Finish post", "foundhint-local-seo")}
            </DialogTitle>
            {businessName ? (
              <span className="fhint:truncate fhint:text-[12.5px] fhint:text-muted-strong">
                {sprintf(
                  /* translators: %s: the Google listing's name. */
                  __("For %s", "foundhint-local-seo"),
                  businessName,
                )}
              </span>
            ) : null}
          </div>
          <DialogDescription className="fhint:sr-only">
            {__(
              "Write a post for your Google Business Profile. A preview of how Google shows it is beside the form.",
              "foundhint-local-seo",
            )}
          </DialogDescription>
          <DialogClose
            className={cn(
              "fhint:grid fhint:size-8 fhint:flex-none fhint:cursor-pointer fhint:place-items-center fhint:border fhint:border-[#b9b2af] fhint:bg-card fhint:text-foreground fhint:hover:bg-muted",
              focus,
            )}
          >
            <XIcon aria-hidden="true" className="fhint:size-4" />
            <span className="fhint:sr-only">
              {__("Close", "foundhint-local-seo")}
            </span>
          </DialogClose>
        </div>

        <div
          role="radiogroup"
          aria-label={__("Post type", "foundhint-local-seo")}
          className="fhint:grid fhint:flex-none fhint:grid-cols-3 fhint:border-b fhint:border-b-border"
        >
          {TYPES.map((option) => {
            const on = option === type;

            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={onGoogle && !on}
                onClick={() => switchType(option)}
                className={cn(
                  "fhint:flex fhint:min-w-0 fhint:cursor-pointer fhint:items-center fhint:gap-2.5 fhint:border-0 fhint:border-b-2 fhint:px-4 fhint:py-2.5 fhint:text-left fhint:disabled:cursor-not-allowed fhint:disabled:opacity-50 fhint:[&+&]:border-l fhint:[&+&]:border-l-border",
                  on
                    ? "fhint:border-b-primary fhint:bg-card"
                    : "fhint:border-b-transparent fhint:bg-muted/50 fhint:hover:bg-muted",
                  focus,
                )}
              >
                <TypeIcon
                  type={option}
                  className="fhint:size-7"
                  iconClassName="fhint:size-3.5"
                />
                <span className="fhint:grid fhint:min-w-0">
                  <strong className="fhint:text-[13px]">
                    {typeLabel(option)}
                  </strong>
                  <span className="fhint:truncate fhint:text-[11.5px] fhint:text-muted-strong">
                    {typeHint(option)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="fhint:grid fhint:min-h-0 fhint:flex-1 fhint:overflow-y-auto fhint:md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <form
            id={`${id}-form`}
            onSubmit={submit}
            noValidate
            className="fhint:grid fhint:content-start fhint:gap-4 fhint:px-5 fhint:py-4"
          >
            <div
              role="group"
              aria-label={__("How to write", "foundhint-local-seo")}
              className="fhint:grid fhint:grid-cols-2 fhint:border fhint:border-[#b9b2af]"
            >
              <button
                type="button"
                disabled
                title={__(
                  "Writing with AI is part of FoundHint Pro.",
                  "foundhint-local-seo",
                )}
                className="fhint:inline-flex fhint:cursor-not-allowed fhint:items-center fhint:justify-center fhint:gap-2 fhint:border-0 fhint:bg-card fhint:px-3 fhint:py-2 fhint:text-[12.5px] fhint:font-extrabold fhint:text-muted-foreground"
              >
                <SparklesIcon aria-hidden="true" className="fhint:size-3.5" />
                {__("Write with AI", "foundhint-local-seo")}
                <SoonTag kind="pro" />
              </button>
              <span className="fhint:inline-flex fhint:items-center fhint:justify-center fhint:gap-2 fhint:bg-foreground fhint:px-3 fhint:py-2 fhint:text-[12.5px] fhint:font-extrabold fhint:text-background">
                <PencilIcon aria-hidden="true" className="fhint:size-3.5" />
                {__("Write it myself", "foundhint-local-seo")}
              </span>
            </div>

            {dated ? (
              <Field
                id={`${id}-title`}
                title={
                  isEvent
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
                  aria-invalid={errors.title ? true : undefined}
                  aria-describedby={describedBy("title")}
                  placeholder={
                    isEvent
                      ? __("e.g. Free kids check-up day", "foundhint-local-seo")
                      : __(
                          "e.g. 20% off teeth whitening",
                          "foundhint-local-seo",
                        )
                  }
                  className={dialogInput}
                />
              </Field>
            ) : null}

            <Field
              id={`${id}-summary`}
              title={__("Description", "foundhint-local-seo")}
              required={!isEvent}
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
                rows={5}
                value={form.summary}
                onChange={(event) => set({ summary: event.target.value })}
                aria-invalid={errors.summary ? true : undefined}
                aria-describedby={describedBy("summary")}
                placeholder={
                  {
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
                  }[type]
                }
                className={cn(dialogInput, "fhint:resize-y")}
              />
            </Field>

            {dated ? (
              <div className="fhint:grid fhint:gap-3 fhint:sm:grid-cols-2">
                <Field
                  id={`${id}-starts_at`}
                  title={__("Starts", "foundhint-local-seo")}
                  required
                  error={errors.starts_at}
                >
                  <input
                    id={`${id}-starts_at`}
                    type={isEvent ? "datetime-local" : "date"}
                    value={toInput(form.starts_at, isEvent)}
                    onChange={(event) => set({ starts_at: event.target.value })}
                    aria-invalid={errors.starts_at ? true : undefined}
                    aria-describedby={describedBy("starts_at")}
                    className={dialogInput}
                  />
                </Field>
                <Field
                  id={`${id}-ends_at`}
                  title={__("Ends", "foundhint-local-seo")}
                  required
                  error={errors.ends_at}
                >
                  <input
                    id={`${id}-ends_at`}
                    type={isEvent ? "datetime-local" : "date"}
                    value={toInput(form.ends_at, isEvent)}
                    onChange={(event) => set({ ends_at: event.target.value })}
                    aria-invalid={errors.ends_at ? true : undefined}
                    aria-describedby={describedBy("ends_at")}
                    className={dialogInput}
                  />
                </Field>
              </div>
            ) : null}

            {type === "offer" ? (
              <>
                <div className="fhint:grid fhint:gap-3 fhint:sm:grid-cols-2">
                  <Field
                    id={`${id}-coupon_code`}
                    title={__("Coupon code (optional)", "foundhint-local-seo")}
                    error={errors.coupon_code}
                  >
                    <input
                      id={`${id}-coupon_code`}
                      value={form.coupon_code}
                      onChange={(event) =>
                        set({ coupon_code: event.target.value })
                      }
                      aria-invalid={errors.coupon_code ? true : undefined}
                      placeholder={__("e.g. SMILE20", "foundhint-local-seo")}
                      className={dialogInput}
                    />
                  </Field>
                  <Field
                    id={`${id}-redeem_url`}
                    title={__(
                      "Link to redeem (optional)",
                      "foundhint-local-seo",
                    )}
                    error={errors.redeem_url}
                  >
                    <input
                      id={`${id}-redeem_url`}
                      type="url"
                      value={form.redeem_url}
                      onChange={(event) =>
                        set({ redeem_url: event.target.value })
                      }
                      aria-invalid={errors.redeem_url ? true : undefined}
                      aria-describedby={describedBy("redeem_url")}
                      placeholder="https://"
                      className={dialogInput}
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() => set({ redeem_url: website })}
                  disabled={!website}
                  className={cn(dialogButton, "fhint:justify-self-start")}
                >
                  <GlobeIcon aria-hidden="true" className="fhint:size-3.5" />
                  {__("Use my website address", "foundhint-local-seo")}
                </button>
                <Field
                  id={`${id}-terms`}
                  title={__(
                    "Terms and conditions (optional)",
                    "foundhint-local-seo",
                  )}
                  error={errors.terms}
                >
                  <textarea
                    id={`${id}-terms`}
                    rows={2}
                    value={form.terms}
                    onChange={(event) => set({ terms: event.target.value })}
                    aria-invalid={errors.terms ? true : undefined}
                    placeholder={__(
                      "e.g. New patients only. One per person.",
                      "foundhint-local-seo",
                    )}
                    className={cn(dialogInput, "fhint:resize-y")}
                  />
                </Field>
              </>
            ) : (
              <>
                <div className="fhint:grid fhint:gap-3 fhint:sm:grid-cols-2">
                  <Field
                    id={`${id}-cta_type`}
                    title={__("Button", "foundhint-local-seo")}
                    error={errors.cta_type}
                  >
                    <select
                      id={`${id}-cta_type`}
                      value={form.cta_type}
                      onChange={(event) =>
                        set({ cta_type: event.target.value })
                      }
                      className={cn(dialogInput, "fhint:pr-8!")}
                    >
                      {buttonOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {form.cta_type && form.cta_type !== "call" ? (
                    <Field
                      id={`${id}-cta_url`}
                      title={__("Button link", "foundhint-local-seo")}
                      required
                      error={errors.cta_url}
                    >
                      <input
                        id={`${id}-cta_url`}
                        type="url"
                        value={form.cta_url}
                        onChange={(event) =>
                          set({ cta_url: event.target.value })
                        }
                        aria-invalid={errors.cta_url ? true : undefined}
                        aria-describedby={describedBy("cta_url")}
                        placeholder="https://"
                        className={dialogInput}
                      />
                    </Field>
                  ) : null}
                </div>
                {form.cta_type === "call" ? (
                  <span className={help}>
                    {__(
                      "The button calls the phone number on your Google profile.",
                      "foundhint-local-seo",
                    )}
                  </span>
                ) : form.cta_type ? (
                  <button
                    type="button"
                    onClick={() => set({ cta_url: website })}
                    disabled={!website}
                    className={cn(dialogButton, "fhint:justify-self-start")}
                  >
                    <GlobeIcon aria-hidden="true" className="fhint:size-3.5" />
                    {__("Use my website address", "foundhint-local-seo")}
                  </button>
                ) : null}
              </>
            )}

            <PhotoField
              value={form.media_url}
              reachable={reachable}
              mediaCount={post?.media_count ?? 0}
              locationName={locationName}
              uploadsReachable={uploadsReachable}
              error={errors.media_url}
              onChange={({
                media_url,
                attachment_id,
                reachable: ok,
                viaGallery,
              }) => {
                setReachable(ok);
                set({ media_url, attachment_id });

                if (viaGallery) {
                  toast.success(
                    __(
                      "The photo was added to your Google profile's Photos, and this post uses it from there.",
                      "foundhint-local-seo",
                    ),
                  );
                }
              }}
            />

            {onGoogle ? null : (
              <div className="fhint:grid fhint:gap-2">
                <span className={label}>
                  {__("When to publish", "foundhint-local-seo")}
                </span>
                <div
                  role="radiogroup"
                  aria-label={__("When to publish", "foundhint-local-seo")}
                  className="fhint:inline-flex fhint:justify-self-start fhint:gap-1 fhint:bg-muted fhint:p-1"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={when === "now"}
                    onClick={() => setWhen("now")}
                    className={segment(when === "now")}
                  >
                    <ZapIcon aria-hidden="true" className="fhint:size-3.5" />
                    {__("Now", "foundhint-local-seo")}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked="false"
                    disabled
                    title={__(
                      "Scheduling posts is part of FoundHint Pro.",
                      "foundhint-local-seo",
                    )}
                    className={segment(false)}
                  >
                    <CalendarClockIcon
                      aria-hidden="true"
                      className="fhint:size-3.5"
                    />
                    {__("Schedule", "foundhint-local-seo")}
                    <SoonTag kind="pro" />
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={when === "draft"}
                    onClick={() => setWhen("draft")}
                    className={segment(when === "draft")}
                  >
                    <FileIcon aria-hidden="true" className="fhint:size-3.5" />
                    {__("Draft", "foundhint-local-seo")}
                  </button>
                </div>
                <span className={help}>
                  {when === "draft"
                    ? __(
                        "Saved here only. Nothing goes to Google until you finish it.",
                        "foundhint-local-seo",
                      )
                    : __(
                        "Goes live when you press Publish. Google can take a few minutes to show it.",
                        "foundhint-local-seo",
                      )}
                </span>
              </div>
            )}

            {requestError ? (
              <p
                role="alert"
                className="fhint:m-0 fhint:border fhint:border-destructive/40 fhint:bg-[#FBE9E6] fhint:px-3 fhint:py-2.5 fhint:text-[13px] fhint:text-destructive"
              >
                {savedId && isNew === false && !post?.id
                  ? __(
                      "Google did not take the post. It is saved here, so you can fix it and try again.",
                      "foundhint-local-seo",
                    ) + " "
                  : ""}
                {requestError}
              </p>
            ) : null}
          </form>

          <aside
            aria-label={__("Preview", "foundhint-local-seo")}
            className="fhint:grid fhint:content-start fhint:gap-3 fhint:border-t fhint:border-t-border fhint:bg-[#faf6f4] fhint:px-5 fhint:py-4 fhint:md:border-t-0 fhint:md:border-l fhint:md:border-l-border"
          >
            <span className="fhint:flex fhint:items-center fhint:gap-2 fhint:text-[11.5px] fhint:font-extrabold fhint:tracking-[0.08em] fhint:text-muted-strong fhint:uppercase">
              <EyeIcon aria-hidden="true" className="fhint:size-3.5" />
              {__("Live preview on Google", "foundhint-local-seo")}
            </span>
            <PostPreview post={form} businessName={businessName} />
            <p className="fhint:m-0 fhint:flex fhint:gap-2 fhint:border fhint:border-[#cfe3d6] fhint:bg-[#eef6f1] fhint:px-3 fhint:py-2.5 fhint:text-[12.5px]">
              <LightbulbIcon
                aria-hidden="true"
                className="fhint:mt-0.5 fhint:size-3.5 fhint:flex-none"
              />
              <span>
                <strong>{__("Tip:", "foundhint-local-seo")}</strong>{" "}
                {__(
                  "posts with a photo usually get more clicks than posts without one.",
                  "foundhint-local-seo",
                )}
              </span>
            </p>
          </aside>
        </div>

        <div className="fhint:flex fhint:flex-none fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-t fhint:border-t-border fhint:px-5 fhint:py-3.5">
          <span className="fhint:min-w-0 fhint:flex-1 fhint:text-[12.5px] fhint:text-muted-strong">
            {onGoogle || when === "now"
              ? __(
                  "Publishing posts this on your Google profile.",
                  "foundhint-local-seo",
                )
              : __("Drafts are kept on this site only.", "foundhint-local-seo")}
          </span>
          <div className="fhint:flex fhint:gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={dialogButton}
            >
              {__("Cancel", "foundhint-local-seo")}
            </button>
            <button
              type="submit"
              form={`${id}-form`}
              disabled={saving}
              className={primaryButton}
            >
              <SendIcon aria-hidden="true" className="fhint:size-3.5" />
              {primaryLabel}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default Composer;
