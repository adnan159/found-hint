import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { MAX_DESCRIPTION } from "../../../lib/service";
import { caption, label, muted } from "../../styles";
import { FIELD_PILL, PILL_TONES } from "../pills";
import { EditorSection } from "./EditorSection";
import { FieldError } from "./FieldError";

/**
 * 01 Service: name, category, description, status and image.
 *
 * @param {Object}  props
 * @param {Object}  props.form       `{ values, set, locked, errors, field,
 *                                   control }` from the editor.
 * @param {boolean} props.fromGoogle The name came from the profile.
 * @param {Object}  props.options    The editor's options (categories,
 *                                   whether the page has a featured image,
 *                                   the list's Google photos).
 * @param {Object}  props.nameRef    Focused for a new service.
 */
export function BasicsSection({ form, fromGoogle, options, nameRef }) {
  const { values, set, locked, errors, field, control } = form;
  const categories = options.categories ?? [];
  // Design: the profile's Google photos are offered by name. A saved photo
  // no longer on the profile stays listed, so the choice still shows.
  const photos = [...(options.photos ?? [])];

  if (
    values.image.mode === "google" &&
    values.image.url &&
    !photos.some((photo) => photo.url === values.image.url)
  ) {
    photos.push({
      url: values.image.url,
      label: __("Google photo (saved)", "foundhint-local-seo"),
    });
  }

  const imageValue =
    values.image.mode === "google"
      ? `google:${values.image.url}`
      : values.image.mode;
  const pickImage = (choice) => {
    if (choice.startsWith("google:")) {
      set({ image: { mode: "google", url: choice.slice(7) } });
    } else if (choice === "url") {
      set({
        image: {
          mode: "url",
          url: values.image.mode === "url" ? values.image.url : "",
        },
      });
    } else {
      set({ image: { mode: choice, url: "" } });
    }
  };

  return (
    <EditorSection
      number="01"
      title={__("Service", "foundhint-local-seo")}
      hint={__(
        "What you offer, in the words customers use. The description should match what the service page says.",
        "foundhint-local-seo",
      )}
    >
      <div className="fhint:grid fhint:grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] fhint:gap-4">
        <div className="fhint:grid fhint:content-start fhint:gap-1.5">
          <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-1.5">
            <label htmlFor={field("name")} className={label}>
              {__("Service name", "foundhint-local-seo")}
            </label>
            <span className={cn(FIELD_PILL, PILL_TONES.required)}>
              {__("Required", "foundhint-local-seo")}
            </span>
            {fromGoogle ? (
              <span className={cn(FIELD_PILL, PILL_TONES.google)}>
                {__("From Google", "foundhint-local-seo")}
              </span>
            ) : null}
          </span>
          <input
            ref={nameRef}
            id={field("name")}
            value={values.name}
            disabled={locked}
            onChange={(event) => set({ name: event.target.value })}
            placeholder={__("e.g. Teeth whitening", "foundhint-local-seo")}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? field("name-error") : undefined}
            className={control("name")}
          />
          <FieldError id={field("name-error")} messages={errors.name} />
        </div>

        <div className="fhint:grid fhint:content-start fhint:gap-1.5">
          <label htmlFor={field("type")} className={label}>
            {__("Service category", "foundhint-local-seo")}
          </label>
          <input
            id={field("type")}
            list={field("types")}
            value={values.service_type}
            disabled={locked}
            onChange={(event) => set({ service_type: event.target.value })}
            placeholder={
              categories.length
                ? __("Pick or type a category", "foundhint-local-seo")
                : __("e.g. Orthodontics", "foundhint-local-seo")
            }
            aria-describedby={field("type-hint")}
            className={control("service_type")}
          />
          <datalist id={field("types")}>
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <code id={field("type-hint")} className={caption}>
            serviceType
          </code>
          <FieldError messages={errors.service_type} />
        </div>

        <div className="fhint:col-span-full fhint:grid fhint:gap-1.5">
          <span className="fhint:flex fhint:items-center fhint:justify-between fhint:gap-2">
            <label htmlFor={field("description")} className={label}>
              {__("Short description", "foundhint-local-seo")}
            </label>
            <span
              className={cn(
                muted,
                values.description.length > MAX_DESCRIPTION &&
                  "fhint:font-bold fhint:text-destructive",
              )}
            >
              {`${values.description.length}/${MAX_DESCRIPTION}`}
            </span>
          </span>
          <textarea
            id={field("description")}
            rows={2}
            value={values.description}
            disabled={locked}
            onChange={(event) => set({ description: event.target.value })}
            placeholder={__(
              "One or two sentences on what's included.",
              "foundhint-local-seo",
            )}
            className={control("description")}
          />
          <FieldError messages={errors.description} />
        </div>

        <div className="fhint:grid fhint:content-start fhint:gap-1.5">
          <label htmlFor={field("status")} className={label}>
            {__("Status", "foundhint-local-seo")}
          </label>
          <select
            id={field("status")}
            value={values.status}
            disabled={locked}
            onChange={(event) => set({ status: event.target.value })}
            className={cn(control("status"), "fhint:pr-8!")}
          >
            <option value="active">
              {__("Active, publish it", "foundhint-local-seo")}
            </option>
            <option value="inactive">
              {__("Inactive, keep it off my site", "foundhint-local-seo")}
            </option>
          </select>
        </div>

        <div className="fhint:grid fhint:content-start fhint:gap-1.5">
          <span className="fhint:flex fhint:items-center fhint:gap-1.5">
            <label htmlFor={field("image")} className={label}>
              {__("Image", "foundhint-local-seo")}
            </label>
            <span className={cn(FIELD_PILL, PILL_TONES.optional)}>
              {__("Optional", "foundhint-local-seo")}
            </span>
          </span>
          <select
            id={field("image")}
            value={imageValue}
            disabled={locked}
            onChange={(event) => pickImage(event.target.value)}
            className={cn(control("image"), "fhint:pr-8!")}
          >
            <option value="none">
              {__("No image", "foundhint-local-seo")}
            </option>
            {values.page.mode === "wp" ? (
              <option value="featured">
                {__(
                  "Featured image of the service page",
                  "foundhint-local-seo",
                )}
              </option>
            ) : null}
            {photos.map((photo) => (
              <option key={photo.url} value={`google:${photo.url}`}>
                {photo.label}
              </option>
            ))}
            <option value="url">
              {__("Enter an image URL", "foundhint-local-seo")}
            </option>
          </select>
          {values.image.mode === "google" ? (
            <span className={cn(muted, "fhint:m-0")}>
              {__(
                "Copied to your Media Library when you save, so your site serves it.",
                "foundhint-local-seo",
              )}
            </span>
          ) : null}
          {values.image.mode === "featured" && !options.featured ? (
            <span className="fhint:text-[12.5px] fhint:text-warning-foreground">
              {__(
                "The service page has no featured image yet, so none is printed.",
                "foundhint-local-seo",
              )}
            </span>
          ) : null}
          <FieldError messages={errors.image} />
        </div>

        {values.image.mode === "url" ? (
          <div className="fhint:grid fhint:content-start fhint:gap-1.5">
            <label htmlFor={field("image-url")} className={label}>
              {__("Image URL", "foundhint-local-seo")}
            </label>
            <input
              id={field("image-url")}
              type="url"
              value={values.image.url}
              disabled={locked}
              onChange={(event) =>
                set({ image: { mode: "url", url: event.target.value } })
              }
              placeholder="https://"
              className={control("image")}
            />
          </div>
        ) : null}
      </div>
    </EditorSection>
  );
}

export default BasicsSection;
