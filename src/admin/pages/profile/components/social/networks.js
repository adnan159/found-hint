/**
 * The networks the server stores, in the design's order, with the brand
 * colour each tile is tinted in. Colour here is decoration only — the name
 * is always written out beside it.
 *
 * `google: false` marks a link Google has no place for. It is still worth
 * having: it goes into the site's own markup.
 */
export const NETWORKS = {
  facebook: {
    name: "Facebook",
    short: "FB",
    color: "#1877F2",
    placeholder: "https://facebook.com/your-page",
  },
  instagram: {
    name: "Instagram",
    short: "IG",
    color: "#C13584",
    placeholder: "https://instagram.com/your-account",
  },
  linkedin: {
    name: "LinkedIn",
    short: "IN",
    color: "#0A66C2",
    placeholder: "https://linkedin.com/company/your-company",
  },
  youtube: {
    name: "YouTube",
    short: "YT",
    color: "#C4302B",
    placeholder: "https://youtube.com/@your-channel",
  },
  tiktok: {
    name: "TikTok",
    short: "TT",
    color: "#201e1d",
    placeholder: "https://tiktok.com/@your-account",
  },
  x: {
    name: "X (Twitter)",
    short: "X",
    color: "#201e1d",
    placeholder: "https://x.com/your-account",
  },
  pinterest: {
    name: "Pinterest",
    short: "PI",
    color: "#BD081C",
    placeholder: "https://pinterest.com/your-account",
  },
  yelp: {
    name: "Yelp",
    short: "YE",
    color: "#D32323",
    placeholder: "https://www.yelp.com/biz/your-business",
    google: false,
  },
};

export const ORDER = Object.keys(NETWORKS);
