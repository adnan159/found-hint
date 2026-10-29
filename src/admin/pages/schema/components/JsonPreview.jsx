import { useMemo } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { CopyIcon, ExternalLinkIcon, FlaskConicalIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { focus } from "@/pages/profile/styles";
import { countProperties, isPublicSite } from "../lib/schema";

/**
 * The JSON-LD the site prints for this entity — built by the server, the
 * same builder the front end uses, never assembled here. Drawn as text
 * (tokens in spans), never as HTML.
 */
const TOKEN =
  /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],])/g;

function tokens(line) {
  const out = [];
  let last = 0;

  line.replace(
    TOKEN,
    (match, string, colon, literal, number, punct, offset) => {
      if (offset > last) {
        out.push(["plain", line.slice(last, offset)]);
      }

      if (string) {
        out.push([colon ? "key" : "string", string]);

        if (colon) {
          out.push(["punct", colon]);
        }
      } else if (literal) {
        out.push(["literal", literal]);
      } else if (number) {
        out.push(["number", number]);
      } else {
        out.push(["punct", punct]);
      }

      last = offset + match.length;

      return match;
    },
  );

  if (last < line.length) {
    out.push(["plain", line.slice(last)]);
  }

  return out;
}

const COLOUR = {
  key: "fhint:text-[#FF9D6E]",
  string: "fhint:text-[#9FD8A6]",
  number: "fhint:text-[#8CC4FF]",
  literal: "fhint:text-[#E6B0FF]",
  punct: "fhint:text-[#9b9797]",
  plain: "fhint:text-[#e6e3e3]",
};

const action = cn(
  "fhint:inline-flex fhint:items-center fhint:gap-2 fhint:px-3.5 fhint:py-2.5 fhint:text-[13.5px] fhint:font-bold fhint:no-underline",
  focus,
);

export function JsonPreview({
  document,
  rootType,
  live,
  loading,
  testUrl,
  dirty,
}) {
  const json = document ? JSON.stringify(document, null, 2) : "";
  const lines = useMemo(() => (json ? json.split("\n") : []), [json]);
  const props = document ? countProperties(document) : 0;
  const publicSite = isPublicSite();
  const url = testUrl || window.location.origin + "/";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `<script type="application/ld+json">\n${json}\n</script>`,
      );
      toast.success(__("Schema copied.", "foundhint-local-seo"));
    } catch {
      toast.error(
        __("Could not copy. Select the text instead.", "foundhint-local-seo"),
      );
    }
  };

  return (
    <aside
      aria-label={__("JSON-LD preview", "foundhint-local-seo")}
      className="fhint:sticky fhint:top-4 fhint:min-w-0 fhint:flex-[1_1_380px] fhint:border fhint:border-[#1d1b1a] fhint:bg-[#1d1b1a] fhint:text-white"
    >
      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2.5 fhint:border-b fhint:border-b-[#34302f] fhint:px-[18px] fhint:py-[13px]">
        <span
          aria-hidden="true"
          className={cn(
            "fhint:size-2 fhint:rounded-full",
            live ? "fhint:bg-[#3BC27A]" : "fhint:bg-[#9b9797]",
          )}
        />
        <strong className="fhint:text-[14px]">
          {__("JSON-LD preview", "foundhint-local-seo")}
        </strong>
        {rootType ? (
          <code className="fhint:bg-[#3a2a20] fhint:px-[7px] fhint:py-0.5 fhint:font-mono fhint:text-[11.5px] fhint:text-[#FF9D6E]">
            {`@type: ${rootType}`}
          </code>
        ) : null}
        <span className="fhint:ml-auto fhint:text-[12px] fhint:text-[#9b9797]">
          <strong className="fhint:text-white">{props}</strong>{" "}
          {__("properties", "foundhint-local-seo")}
        </span>
      </div>

      <div
        className="fhint:max-h-[620px] fhint:overflow-auto fhint:py-3"
        aria-busy={loading ? "true" : undefined}
      >
        {lines.length ? (
          <pre className="fhint:m-0 fhint:min-w-max fhint:bg-transparent fhint:font-mono fhint:text-[12px] fhint:leading-[1.75]">
            <code>
              <span className="fhint:block fhint:px-[18px] fhint:text-[#9b9797]">
                {'<script type="application/ld+json">'}
              </span>
              {lines.map((line, index) => (
                <span
                  key={index}
                  className="fhint:block fhint:px-[18px] fhint:whitespace-pre"
                >
                  {"  "}
                  {tokens(line).map(([kind, text], at) => (
                    <span key={at} className={COLOUR[kind]}>
                      {text}
                    </span>
                  ))}
                </span>
              ))}
              <span className="fhint:block fhint:px-[18px] fhint:text-[#9b9797]">
                {"</script>"}
              </span>
            </code>
          </pre>
        ) : (
          <p className="fhint:m-0 fhint:px-[18px] fhint:text-[13px] fhint:text-[#9b9797]">
            {loading
              ? __("Building the preview…", "foundhint-local-seo")
              : __("Nothing is printed for this yet.", "foundhint-local-seo")}
          </p>
        )}
      </div>

      <div className="fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] fhint:gap-2.5 fhint:border-t fhint:border-t-[#e6e3e3] fhint:bg-card fhint:px-[18px] fhint:py-3.5">
        <button
          type="button"
          onClick={copy}
          disabled={!json}
          className={cn(
            action,
            "fhint:cursor-pointer fhint:border-0 fhint:bg-[#FF6B35] fhint:text-white fhint:disabled:opacity-50",
          )}
        >
          <CopyIcon aria-hidden="true" className="fhint:size-4" />
          {__("Copy schema", "foundhint-local-seo")}
        </button>
        <a
          href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(action, "fhint:bg-[#201e1d] fhint:text-white!")}
        >
          <FlaskConicalIcon aria-hidden="true" className="fhint:size-4" />
          {__("Test with Google", "foundhint-local-seo")}
          <span className="fhint:sr-only">
            {__("(opens in a new tab)", "foundhint-local-seo")}
          </span>
        </a>
        <a
          href={`https://validator.schema.org/#url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            action,
            "fhint:col-span-full fhint:justify-center fhint:border fhint:border-[#d7d3d3] fhint:bg-card fhint:py-2 fhint:text-[12.5px] fhint:text-[#201e1d]!",
          )}
        >
          <ExternalLinkIcon aria-hidden="true" className="fhint:size-3.5" />
          {__("Check with Schema.org", "foundhint-local-seo")}
          <span className="fhint:sr-only">
            {__("(opens in a new tab)", "foundhint-local-seo")}
          </span>
        </a>
        {!publicSite || dirty ? (
          <p className="fhint:col-span-full fhint:m-0 fhint:text-[12px] fhint:leading-relaxed fhint:text-[#625e5e]">
            {dirty
              ? __("Save first to test the live page.", "foundhint-local-seo")
              : sprintf(
                  /* translators: %s: the site's address. */
                  __(
                    "Google can't reach %s. Copy the schema and paste it into the test's Code tab instead.",
                    "foundhint-local-seo",
                  ),
                  window.location.host,
                )}
          </p>
        ) : null}
      </div>
    </aside>
  );
}

export default JsonPreview;
