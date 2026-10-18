/**
 * Country calling codes, by ISO 3166-1 alpha-2 code.
 *
 * Only the codes are kept here; country names come from the browser
 * (`Intl.DisplayNames`), so they appear in the admin's own language and this
 * list carries no strings to translate. Codes shared by several countries
 * (+1, +7, +44, +47, +61, +262, +590, +599) are listed once per country, so
 * a person picks their own country rather than a number.
 */
export const CALLING_CODES = {
  AF: "93",
  AL: "355",
  DZ: "213",
  AS: "1",
  AD: "376",
  AO: "244",
  AI: "1",
  AG: "1",
  AR: "54",
  AM: "374",
  AW: "297",
  AU: "61",
  AT: "43",
  AZ: "994",
  BS: "1",
  BH: "973",
  BD: "880",
  BB: "1",
  BY: "375",
  BE: "32",
  BZ: "501",
  BJ: "229",
  BM: "1",
  BT: "975",
  BO: "591",
  BA: "387",
  BW: "267",
  BR: "55",
  VG: "1",
  BN: "673",
  BG: "359",
  BF: "226",
  BI: "257",
  KH: "855",
  CM: "237",
  CA: "1",
  CV: "238",
  KY: "1",
  CF: "236",
  TD: "235",
  CL: "56",
  CN: "86",
  CO: "57",
  KM: "269",
  CG: "242",
  CD: "243",
  CK: "682",
  CR: "506",
  CI: "225",
  HR: "385",
  CU: "53",
  CW: "599",
  CY: "357",
  CZ: "420",
  DK: "45",
  DJ: "253",
  DM: "1",
  DO: "1",
  EC: "593",
  EG: "20",
  SV: "503",
  GQ: "240",
  ER: "291",
  EE: "372",
  SZ: "268",
  ET: "251",
  FK: "500",
  FO: "298",
  FJ: "679",
  FI: "358",
  FR: "33",
  GF: "594",
  PF: "689",
  GA: "241",
  GM: "220",
  GE: "995",
  DE: "49",
  GH: "233",
  GI: "350",
  GR: "30",
  GL: "299",
  GD: "1",
  GP: "590",
  GU: "1",
  GT: "502",
  GG: "44",
  GN: "224",
  GW: "245",
  GY: "592",
  HT: "509",
  HN: "504",
  HK: "852",
  HU: "36",
  IS: "354",
  IN: "91",
  ID: "62",
  IR: "98",
  IQ: "964",
  IE: "353",
  IM: "44",
  IL: "972",
  IT: "39",
  JM: "1",
  JP: "81",
  JE: "44",
  JO: "962",
  KZ: "7",
  KE: "254",
  KI: "686",
  XK: "383",
  KW: "965",
  KG: "996",
  LA: "856",
  LV: "371",
  LB: "961",
  LS: "266",
  LR: "231",
  LY: "218",
  LI: "423",
  LT: "370",
  LU: "352",
  MO: "853",
  MG: "261",
  MW: "265",
  MY: "60",
  MV: "960",
  ML: "223",
  MT: "356",
  MH: "692",
  MQ: "596",
  MR: "222",
  MU: "230",
  YT: "262",
  MX: "52",
  FM: "691",
  MD: "373",
  MC: "377",
  MN: "976",
  ME: "382",
  MS: "1",
  MA: "212",
  MZ: "258",
  MM: "95",
  NA: "264",
  NR: "674",
  NP: "977",
  NL: "31",
  NC: "687",
  NZ: "64",
  NI: "505",
  NE: "227",
  NG: "234",
  KP: "850",
  MK: "389",
  MP: "1",
  NO: "47",
  OM: "968",
  PK: "92",
  PW: "680",
  PS: "970",
  PA: "507",
  PG: "675",
  PY: "595",
  PE: "51",
  PH: "63",
  PL: "48",
  PT: "351",
  PR: "1",
  QA: "974",
  RE: "262",
  RO: "40",
  RU: "7",
  RW: "250",
  BL: "590",
  KN: "1",
  LC: "1",
  MF: "590",
  PM: "508",
  VC: "1",
  WS: "685",
  SM: "378",
  ST: "239",
  SA: "966",
  SN: "221",
  RS: "381",
  SC: "248",
  SL: "232",
  SG: "65",
  SX: "1",
  SK: "421",
  SI: "386",
  SB: "677",
  SO: "252",
  ZA: "27",
  KR: "82",
  SS: "211",
  ES: "34",
  LK: "94",
  SD: "249",
  SR: "597",
  SJ: "47",
  SE: "46",
  CH: "41",
  SY: "963",
  TW: "886",
  TJ: "992",
  TZ: "255",
  TH: "66",
  TL: "670",
  TG: "228",
  TK: "690",
  TO: "676",
  TT: "1",
  TN: "216",
  TR: "90",
  TM: "993",
  TC: "1",
  TV: "688",
  UG: "256",
  UA: "380",
  AE: "971",
  GB: "44",
  US: "1",
  UY: "598",
  VI: "1",
  UZ: "998",
  VU: "678",
  VA: "39",
  VE: "58",
  VN: "84",
  WF: "681",
  EH: "212",
  YE: "967",
  ZM: "260",
  ZW: "263",
};

/**
 * Where a code is shared, the country a stored number is read as when the
 * location's own country is not one of them.
 */
const PREFERRED = {
  1: "US",
  7: "RU",
  39: "IT",
  44: "GB",
  47: "NO",
  61: "AU",
  212: "MA",
  262: "RE",
  590: "GP",
  599: "CW",
};

/**
 * Countries whose numbers keep their leading 0 after the calling code —
 * Italy and the two states on its numbering plan. Everywhere else the 0
 * is a national trunk prefix and is dropped: 01712… in Bangladesh is
 * +880 1712….
 */
const KEEPS_LEADING_ZERO = ["39"];

/**
 * Every country, named in the given language, sorted by name.
 *
 * @param {string} locale BCP 47 locale, e.g. "en-US".
 * @return {Array<{code: string, dial: string, name: string}>}
 */
export function countryOptions(locale) {
  let names = null;

  try {
    names = new Intl.DisplayNames([locale || "en"], { type: "region" });
  } catch {
    // Old browsers: the code stands in for the name.
  }

  return Object.entries(CALLING_CODES)
    .map(([code, dial]) => ({
      code,
      dial,
      name: names?.of(code) ?? code,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale || "en"));
}

/**
 * A stored number split into a country and the rest.
 *
 * `+8801712345678` → `{ country: "BD", number: "1712345678" }`. A number
 * with no `+` — one Google holds without a country code — is kept whole
 * under the fallback country.
 *
 * @param {string} value    Stored number.
 * @param {string} fallback ISO code to use when the number names none.
 * @return {{country: string, number: string}}
 */
export function splitNumber(value, fallback) {
  const text = String(value ?? "").trim();
  const country = CALLING_CODES[fallback] ? fallback : "US";

  if (!text.startsWith("+")) {
    return { country, number: text.replace(/\D+/g, "") };
  }

  const digits = text.slice(1).replace(/\D+/g, "");

  // Longest code first: +1 must not swallow +1268, nor +7 swallow +77….
  for (let length = 3; length >= 1; length--) {
    const dial = digits.slice(0, length);
    const matches = Object.keys(CALLING_CODES).filter(
      (code) => CALLING_CODES[code] === dial,
    );

    if (matches.length) {
      return {
        country: matches.includes(country)
          ? country
          : (PREFERRED[dial] ?? matches[0]),
        number: digits.slice(length),
      };
    }
  }

  return { country, number: digits };
}

/**
 * A country and a number as one international number.
 *
 * @param {string} country ISO code.
 * @param {string} number  The number as typed: national, or in full with
 *                         a leading + or 00.
 * @return {string} e.g. "+8801712345678", or "" with no number.
 */
export function joinNumber(country, number) {
  const dial = CALLING_CODES[country] ?? "";
  const typed = String(number ?? "").trim();
  let digits = typed.replace(/\D+/g, "");

  if (!digits) {
    return "";
  }

  // Written in full — "+880 1712…" or "00880 1712…" — the number names its
  // own country, and the one picked beside it is not added again. Guessing
  // from the digits alone would be wrong: Kazakh numbers start with 7, the
  // same digit as Kazakhstan's code.
  if (typed.startsWith("+")) {
    return `+${digits}`;
  }

  if (typed.startsWith("00")) {
    return `+${digits.slice(2)}`;
  }

  if (!KEEPS_LEADING_ZERO.includes(dial)) {
    digits = digits.replace(/^0+/, "");
  }

  return `+${dial}${digits}`;
}
