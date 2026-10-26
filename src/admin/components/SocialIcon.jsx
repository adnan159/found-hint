import { useId } from "react";
import { cn } from "cn";
import {
  siFacebook,
  siInstagram,
  siPinterest,
  siTiktok,
  siWhatsapp,
  siX,
  siYelp,
  siYoutube,
} from "simple-icons";

// Brand marks from Simple Icons (CC0). Named imports only, so the bundle
// carries these eight paths and not the whole set.
const ICONS = {
  facebook: siFacebook,
  instagram: siInstagram,
  pinterest: siPinterest,
  tiktok: siTiktok,
  whatsapp: siWhatsapp,
  x: siX,
  yelp: siYelp,
  youtube: siYoutube,
};

/**
 * A social network's logo, in `currentColor`.
 *
 * Decorative: the network's name is always written beside it, so it is
 * hidden from assistive technology. LinkedIn is not in Simple Icons — it
 * was removed at LinkedIn's request — so its square is drawn here. Any other
 * network without a mark falls back to `short`.
 */
export function SocialIcon({ network, short, className, style, size = 20 }) {
  const icon = ICONS[network];
  // Each instance needs its own mask id; two icons on a page would
  // otherwise share one.
  const maskId = `fhint-si-${useId().replace(/[^\w-]/g, "")}`;
  const letters = short ?? String(network).slice(0, 2).toUpperCase();

  // Letters are drawn in the same 24×24 box as the marks, so every icon
  // takes the same space and sits on the same centre line.
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      style={style}
      className={cn("fhint:block fhint:flex-none", className)}
    >
      {icon ? (
        <path d={icon.path} />
      ) : network === "linkedin" ? (
        // LinkedIn's own shape: a solid rounded square with "in" cut out,
        // so it carries the same weight as the solid marks around it.
        <>
          <mask id={maskId}>
            <rect width="24" height="24" fill="#fff" />
            <text
              x="12.5"
              y="13"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="15"
              fontWeight="800"
              fill="#000"
            >
              in
            </text>
          </mask>
          <rect
            x="1.5"
            y="1.5"
            width="21"
            height="21"
            rx="3.5"
            mask={`url(#${maskId})`}
          />
        </>
      ) : (
        <text
          x="12"
          y="12"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={letters.length > 1 ? 17 : 20}
          fontWeight="800"
          letterSpacing="-0.5"
        >
          {letters}
        </text>
      )}
    </svg>
  );
}

export default SocialIcon;
