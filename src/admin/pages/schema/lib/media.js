import { __ } from "@wordpress/i18n";

/**
 * Whether WordPress's Media Library picker is on the page
 * (`Admin\Enqueue` calls `wp_enqueue_media()` on our screen).
 *
 * @return {boolean} Available.
 */
export function hasMediaLibrary() {
  return typeof window !== "undefined" && Boolean(window.wp?.media);
}

/**
 * Open the Media Library to choose images.
 *
 * @param {Object}  options
 * @param {string}  options.title    Frame title.
 * @param {string}  options.button   Confirm button text.
 * @param {boolean} options.multiple Allow several.
 * @return {Promise<Object[]>} The chosen images, `{ id, url, width, height }`,
 *                             or `[]` when the frame is closed.
 */
export function chooseImages({ title, button, multiple = false }) {
  return new Promise((resolve) => {
    if (!hasMediaLibrary()) {
      resolve([]);
      return;
    }

    const frame = window.wp.media({
      title,
      button: { text: button ?? __("Use this image", "foundhint-local-seo") },
      library: { type: "image" },
      multiple: multiple ? "add" : false,
    });
    let chosen = false;

    frame.on("select", () => {
      chosen = true;
      resolve(
        frame
          .state()
          .get("selection")
          .toJSON()
          .map((item) => ({
            id: item.id,
            url: item.url,
            width: item.width,
            height: item.height,
          })),
      );
    });
    frame.on("close", () => {
      // "select" fires before "close"; a plain close chose nothing.
      window.setTimeout(() => !chosen && resolve([]), 0);
    });
    frame.open();
  });
}
