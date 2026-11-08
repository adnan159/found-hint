import { __ } from "@wordpress/i18n";

/**
 * Whether a Media Library window is open, for a dialog underneath it: that
 * dialog must not close on the library's clicks or its Esc, nor pull focus
 * back from it. Changes are announced with the `fhint:media` window event.
 */
let openFrames = 0;

export function isMediaOpen() {
  return openFrames > 0;
}

function announce(change) {
  openFrames = Math.max(0, openFrames + change);
  window.dispatchEvent(new CustomEvent("fhint:media"));
}

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
 * @param {string[]} options.types   Only these MIME types (default: any image).
 * @return {Promise<Object[]>} The chosen images, `{ id, url, width, height }`,
 *                             or `[]` when the frame is closed.
 */
export function chooseImages({ title, button, multiple = false, types }) {
  return new Promise((resolve) => {
    if (!hasMediaLibrary()) {
      resolve([]);
      return;
    }

    const frame = window.wp.media({
      title,
      button: { text: button ?? __("Use this image", "foundhint-local-seo") },
      library: { type: types?.length ? types : "image" },
      multiple: multiple ? "add" : false,
    });
    let chosen = false;

    frame.on("open", () => announce(1));
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
      // Later than the Esc that closed it, which the dialog below also hears.
      window.setTimeout(() => announce(-1), 150);
    });
    frame.open();
  });
}
