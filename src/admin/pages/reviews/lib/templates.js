import { __ } from "@wordpress/i18n";

// How many templates a star rating may hold for each kind of review.
export const TEMPLATE_LIMIT = 20;

/**
 * The sample templates the Reply templates card shows until owners can
 * write their own (FoundHint Pro). `kind` is 'comment' for reviews with
 * words, 'stars' for a rating left without any.
 *
 * @return {Array<{id: string, rating: number, kind: string, name: string, text: string}>}
 */
export function sampleTemplates() {
  return [
    {
      id: "warm-5",
      rating: 5,
      kind: "comment",
      name: __("Warm thank-you", "foundhint-local-seo"),
      text: __(
        "Hi {{reviewer_name}}, thank you for such a lovely review! Our whole team at {{location_name}} was happy to read it. See you at your next visit.",
        "foundhint-local-seo",
      ),
    },
    {
      id: "short-5",
      rating: 5,
      kind: "stars",
      name: __("Short and sweet", "foundhint-local-seo"),
      text: __(
        "Thanks so much for the 5 stars, {{reviewer_name}}! It means a lot to our team in {{location_city}}.",
        "foundhint-local-seo",
      ),
    },
    {
      id: "thanks-4",
      rating: 4,
      kind: "comment",
      name: __("Glad you came", "foundhint-local-seo"),
      text: __(
        "Thank you, {{reviewer_name}}! We're glad you enjoyed your visit, and we'll keep working to make the next one even better.",
        "foundhint-local-seo",
      ),
    },
    {
      id: "listen-3",
      rating: 3,
      kind: "comment",
      name: __("We're listening", "foundhint-local-seo"),
      text: __(
        "Thanks for your honest feedback, {{reviewer_name}}. We'd love to hear how we could have made your visit better.",
        "foundhint-local-seo",
      ),
    },
    {
      id: "sorry-2",
      rating: 2,
      kind: "comment",
      name: __("Let's put it right", "foundhint-local-seo"),
      text: __(
        "{{reviewer_name}}, we're sorry your visit fell short. Please contact us at {{location_name}} so we can put it right.",
        "foundhint-local-seo",
      ),
    },
    {
      id: "sorry-1",
      rating: 1,
      kind: "comment",
      name: __("Sincere apology", "foundhint-local-seo"),
      text: __(
        "{{reviewer_name}}, we're truly sorry to read this. Please get in touch with us at {{location_name}} so we can make it right.",
        "foundhint-local-seo",
      ),
    },
  ];
}
