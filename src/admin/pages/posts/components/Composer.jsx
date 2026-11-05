import { useId } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import useMediaOpen from "@/hooks/useMediaOpen";
import useComposer from "../hooks/useComposer";
import PhotoField from "./PhotoField";
import ButtonFields from "./composer/ButtonFields";
import ComposerFooter from "./composer/ComposerFooter";
import ComposerHeader from "./composer/ComposerHeader";
import DateFields from "./composer/DateFields";
import OfferFields from "./composer/OfferFields";
import PreviewPane from "./composer/PreviewPane";
import TypePicker from "./composer/TypePicker";
import WhenToPublish from "./composer/WhenToPublish";
import WritingFields from "./composer/WritingFields";

/**
 * Writing or editing one post: the type, the words, the button, the photo
 * and when it goes out, beside a live preview of how Google shows it.
 * A post already on Google can only be changed by publishing the change,
 * and keeps its type — Google does not allow either otherwise. State and
 * saving live in `useComposer`; this lays the dialog out.
 * @param {Object}   props
 * @param {Object}   props.post             The post being edited, or a starting point for a new one.
 * @param {string}   props.locationName     Google location resource name.
 * @param {string}   props.businessName     The listing's name, for the preview.
 * @param {string}   props.website          The listing's website, for the link fields' globe button.
 * @param {boolean}  props.uploadsReachable Whether Google can fetch this site's uploads.
 * @param {string}   props.timezone         The site's time zone, for the schedule picker.
 * @param {Function} props.onClose          Close.
 */
export function Composer({
  post,
  locationName,
  businessName,
  website,
  uploadsReachable,
  timezone,
  onClose,
}) {
  const id = useId();
  const c = useComposer({ post, locationName, onClose });
  // The Media Library opens above: its clicks and Esc must not close this.
  const mediaOpen = useMediaOpen();
  const { form, set, errors } = c;
  const type = form.topic_type;
  const fields = { id, form, set, errors, website };

  const switchType = (next) => {
    if (next !== type) {
      set({
        topic_type: next,
        cta_type:
          next === "offer"
            ? ""
            : form.cta_type || (next === "event" ? "book" : "learn_more"),
      });
    }
  };

  return (
    <Dialog
      open
      modal={!mediaOpen}
      onOpenChange={(open) => (open || mediaOpen ? null : onClose())}
    >
      <DialogContent
        showCloseButton={false}
        className="fhint:flex fhint:max-h-[calc(100vh-8rem)] fhint:w-[calc(100vw-2rem)] fhint:flex-col fhint:gap-0 fhint:rounded-none fhint:border fhint:border-[#b9b2af] fhint:p-0 fhint:shadow-2xl fhint:ring-0 fhint:sm:max-w-[1200px]"
      >
        <ComposerHeader
          isNew={c.isNew}
          onGoogle={c.onGoogle}
          scheduled={post?.status === "scheduled"}
          businessName={businessName}
        />
        <TypePicker type={type} locked={c.onGoogle} onChange={switchType} />

        <div className="modern-scroll fhint:grid fhint:min-h-0 fhint:flex-1 fhint:overflow-y-auto fhint:md:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] fhint:md:grid-rows-[minmax(0,1fr)] fhint:md:overflow-hidden">
          <form
            id={`${id}-form`}
            onSubmit={c.submit}
            noValidate
            className="modern-scroll fhint:grid fhint:auto-rows-max fhint:content-start fhint:gap-4 fhint:px-5 fhint:py-4 fhint:md:min-h-0 fhint:md:overflow-y-auto"
          >
            <WritingFields {...fields} />
            {type !== "update" ? <DateFields {...fields} /> : null}
            {type === "offer" ? (
              <OfferFields {...fields} />
            ) : (
              <ButtonFields {...fields} />
            )}

            <PhotoField
              value={form.media_url}
              reachable={c.reachable}
              mediaCount={post?.media_count ?? 0}
              locationName={locationName}
              uploadsReachable={uploadsReachable}
              error={errors.media_url}
              onChange={c.onPhoto}
            />

            {c.onGoogle ? null : (
              <WhenToPublish
                id={id}
                when={c.when}
                onChange={c.setWhen}
                canSchedule={c.canSchedule}
                scheduleAt={c.scheduleAt}
                onScheduleAt={c.setScheduleAt}
                timezone={timezone}
                error={errors.scheduled_at}
              />
            )}

            {c.requestError || c.keptAs ? (
              <p
                role="alert"
                className="fhint:m-0 fhint:border fhint:border-destructive/40 fhint:bg-destructive-tint fhint:px-3 fhint:py-2.5 fhint:text-sm fhint:text-destructive"
              >
                {[c.keptAs, c.requestError].filter(Boolean).join(" ")}
              </p>
            ) : null}
          </form>

          <PreviewPane form={form} businessName={businessName} />
        </div>

        <ComposerFooter
          formId={`${id}-form`}
          when={c.when}
          onGoogle={c.onGoogle}
          saving={c.saving}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

export default Composer;
