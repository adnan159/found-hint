import { __ } from "@wordpress/i18n";
import { CalendarCheckIcon, MessageSquareTextIcon } from "lucide-react";
import PhoneNumberInput from "@/components/PhoneNumberInput";
import { linkState } from "../../model";
import { input } from "../../styles";
import LinkCard from "./LinkCard";

/** Where a WhatsApp link may point, as the server checks it. */
const WHATSAPP_HOSTS = [
  "wa.me",
  "whatsapp.com",
  "api.whatsapp.com",
  "www.whatsapp.com",
];

/**
 * A WhatsApp link's state: a working address that goes to WhatsApp.
 *
 * @param {string} value Link.
 * @return {"empty"|"ok"|"bad"}
 */
function whatsappState(value) {
  const state = linkState(value);

  if (state !== "ok") {
    return state;
  }

  try {
    return WHATSAPP_HOSTS.includes(new URL(value.trim()).hostname.toLowerCase())
      ? "ok"
      : "bad";
  } catch {
    return "bad";
  }
}

/**
 * A texting number's state: international — a +, then 8 to 15 digits.
 *
 * @param {string} value Stored number.
 * @return {"empty"|"ok"|"bad"}
 */
function numberState(value) {
  const number = String(value ?? "").trim();

  if (!number) {
    return "empty";
  }

  return /^\+\d{8,15}$/.test(number) ? "ok" : "bad";
}

/**
 * Said under a card Google does not offer this listing. The value is kept
 * here; it is only never sent.
 */
function notOffered(offered) {
  return offered === false
    ? __(
        "Google does not offer this for your listing's category, so it is kept here but not sent to Google.",
        "foundhint-local-seo",
      )
    : "";
}

/**
 * The appointment link, texting number and WhatsApp link, as cards like
 * the social links' — Google's Book and Chat buttons. Rendered straight
 * into the caller's grid, so they line up with the cards around them.
 *
 * @param {Object}   props
 * @param {Object}   props.model    `{ appointment, text_messaging, whatsapp }`.
 * @param {Function} props.onChange Receives the whole booking model.
 * @param {Object}   props.errors   Field errors, keyed `booking_links.<field>`.
 * @param {Object}   props.offered  Field => offered by Google; null unknown.
 * @param {string}   props.country  The location's country, for the code.
 */
export function BookingCards({ model, onChange, errors, offered, country }) {
  const set = (key) => (value) => onChange({ ...model, [key]: value });

  return (
    <>
      <LinkCard
        key="appointment"
        network="appointment"
        meta={{
          name: __("Book an appointment link", "foundhint-local-seo"),
          color: "#1A73E8",
          placeholder: "https://",
        }}
        icon={CalendarCheckIcon}
        value={model.appointment}
        onChange={set("appointment")}
        error={errors?.["booking_links.appointment"]}
        note={notOffered(offered?.appointment)}
      />
      <LinkCard
        key="text_messaging"
        network="text_messaging"
        meta={{
          name: __("Texting number", "foundhint-local-seo"),
          color: "#34A853",
        }}
        icon={MessageSquareTextIcon}
        value={model.text_messaging}
        onChange={set("text_messaging")}
        error={errors?.["booking_links.text_messaging"]}
        stateOf={numberState}
        badMessage={__(
          "Choose the country code and enter the mobile number.",
          "foundhint-local-seo",
        )}
        note={
          notOffered(offered?.text_messaging) ||
          __(
            "Without the country code. A number written in full, starting with + or 00, is taken as it is.",
            "foundhint-local-seo",
          )
        }
      >
        {({ id, invalid, describedBy }) => (
          <PhoneNumberInput
            id={id}
            invalid={invalid}
            describedBy={describedBy}
            value={model.text_messaging}
            onChange={set("text_messaging")}
            fallbackCountry={country}
            inputClass={input}
            placeholder={__("Mobile number", "foundhint-local-seo")}
          />
        )}
      </LinkCard>
      <LinkCard
        key="whatsapp"
        network="whatsapp"
        meta={{
          name: __("WhatsApp", "foundhint-local-seo"),
          color: "#25D366",
          placeholder: "https://wa.me/8801712345678",
        }}
        value={model.whatsapp}
        onChange={set("whatsapp")}
        error={errors?.["booking_links.whatsapp"]}
        stateOf={whatsappState}
        badMessage={__(
          "Enter your WhatsApp link, such as https://wa.me/8801712345678",
          "foundhint-local-seo",
        )}
        note={notOffered(offered?.whatsapp)}
      />
    </>
  );
}

export default BookingCards;
