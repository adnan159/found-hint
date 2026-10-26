#!/usr/bin/env node
/**
 * Build includes/App/Google/data/google-categories.json.
 *
 * Google does not publish its Business Profile category list as a file, and
 * the official endpoint needs a connected, approved account. So the list the
 * search box reads ships with the plugin, and this script is how it is
 * refreshed: on a developer's machine, at build time. **The plugin itself
 * never fetches it** — a category search must work on a site with no Google
 * connection and no outbound request.
 *
 * Source: https://github.com/lobstrio/google-business-categories
 *
 * Usage:
 *   npm run categories:update                 fetch the upstream file
 *   npm run categories:update -- path/to.json use a local copy instead
 *
 * The output is deliberately compact — positional rows rather than objects —
 * because it is read on every search: [ id, name, bucket index, in_us, variants ].
 */
const fs = require("fs");
const path = require("path");

const SOURCE =
  "https://raw.githubusercontent.com/lobstrio/google-business-categories/main/data/google-business-categories.full.json";
const REPOSITORY = "https://github.com/lobstrio/google-business-categories";
const OUTPUT = path.join(
  process.cwd(),
  "includes",
  "App",
  "Google",
  "data",
  "google-categories.json",
);

// What Google's ids look like. Anything else is not something a push could
// send, so it is refused here rather than discovered at Google.
const GCID = /^gcid:[a-z0-9_]+$/;

async function read(local) {
  if (local) {
    return JSON.parse(fs.readFileSync(local, "utf8"));
  }

  const response = await fetch(SOURCE);

  if (!response.ok) {
    throw new Error(`Could not fetch the category list: HTTP ${response.status}`);
  }

  return response.json();
}

function clean(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const records = await read(process.argv[2]);

  if (!Array.isArray(records)) {
    throw new Error("The category list is not an array.");
  }

  const seen = new Set();
  // Sorted up front so a bucket's index does not depend on which category
  // happens to be listed first upstream.
  const buckets = [...new Set(records.map((record) => clean(record.bucket)))].sort();
  const rows = [];

  for (const record of records) {
    const id = clean(record.gcid);
    const name = clean(record.name);

    if (!GCID.test(id) || !name) {
      throw new Error(`Unusable entry: ${JSON.stringify(record).slice(0, 120)}`);
    }

    if (seen.has(id)) {
      throw new Error(`Duplicate id: ${id}`);
    }

    seen.add(id);

    const bucketIndex = buckets.indexOf(clean(record.bucket));

    // A variant identical to the name adds nothing to a search.
    const variants = [
      ...new Set((record.name_variants ?? []).map(clean).filter(Boolean)),
    ].filter((variant) => variant.toLowerCase() !== name.toLowerCase());

    const row = [id, name, bucketIndex, record.in_us === false ? 0 : 1];

    if (variants.length) {
      row.push(variants);
    }

    rows.push(row);
  }

  // A list that has shrunk this far is a broken download, not a real change:
  // Google retires a few dozen categories a year, not thousands.
  if (rows.length < 3000) {
    throw new Error(`Only ${rows.length} categories — refusing to write.`);
  }

  // Stable order, so a refresh produces a readable diff and an empty search
  // lists alphabetically.
  rows.sort(
    (a, b) =>
      a[1].localeCompare(b[1], "en", { sensitivity: "base" }) ||
      a[0].localeCompare(b[0]),
  );

  const data = {
    source: REPOSITORY,
    updated: new Date().toISOString().slice(0, 10),
    count: rows.length,
    buckets,
    categories: rows,
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(data)}\n`);

  const size = (fs.statSync(OUTPUT).size / 1024).toFixed(0);

  console.log(
    `categories: ${rows.length}  buckets: ${buckets.length}  with variants: ${rows.filter((row) => row[4]).length}  file: ${size} KB`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
