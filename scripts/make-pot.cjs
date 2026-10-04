/* eslint-disable */
/**
 * Build languages/foundhint-local-seo.pot from the PHP and JavaScript sources.
 *
 * WordPress.org generates translations from the plugin's own strings, but a
 * .pot is what lets anybody translate before that — and it is the only way
 * to notice a string written with the wrong text domain, which would stay
 * English forever without ever failing.
 */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const domain = "foundhint-local-seo";
const roots = ["includes", "src", "found-hint.php", "uninstall.php"];

const files = [];

function walk(target) {
  const stat = fs.statSync(target);

  if (stat.isFile()) {
    if (/\.(php|jsx?|tsx?)$/.test(target)) files.push(target);
    return;
  }

  for (const entry of fs.readdirSync(target)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    walk(path.join(target, entry));
  }
}

for (const r of roots) {
  const full = path.join(root, r);
  if (fs.existsSync(full)) walk(full);
}

// __( 'text', 'domain' ) / _e / esc_html__ / esc_attr__ / _x / _n, in PHP and JS.
const single =
  /\b(?:__|_e|esc_html__|esc_html_e|esc_attr__|esc_attr_e)\(\s*(['"])((?:\\.|(?!\1)[^\\])*)\1\s*,\s*(['"])([^'"]+)\3/g;
const context =
  /\b_x\(\s*(['"])((?:\\.|(?!\1)[^\\])*)\1\s*,\s*(['"])((?:\\.|(?!\3)[^\\])*)\3\s*,\s*(['"])([^'"]+)\5/g;
const plural =
  /\b_n\(\s*(['"])((?:\\.|(?!\1)[^\\])*)\1\s*,\s*(['"])((?:\\.|(?!\3)[^\\])*)\3\s*,[^,]+,\s*(['"])([^'"]+)\5/g;

const entries = new Map();
const wrongDomain = [];

function add(key, entry, file, line) {
  const existing = entries.get(key);
  if (existing) {
    existing.refs.push(`${file}:${line}`);
    return;
  }
  entries.set(key, { ...entry, refs: [`${file}:${line}`] });
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);

  for (const m of source.matchAll(single)) {
    if (m[4] !== domain) { wrongDomain.push(`${rel}:${lineOf(source, m.index)} → "${m[4]}"`); continue; }
    add(m[2], { msgid: m[2] }, rel, lineOf(source, m.index));
  }
  for (const m of source.matchAll(context)) {
    if (m[6] !== domain) { wrongDomain.push(`${rel}:${lineOf(source, m.index)} → "${m[6]}"`); continue; }
    add(`${m[4]}\u0004${m[2]}`, { msgid: m[2], msgctxt: m[4] }, rel, lineOf(source, m.index));
  }
  for (const m of source.matchAll(plural)) {
    if (m[6] !== domain) { wrongDomain.push(`${rel}:${lineOf(source, m.index)} → "${m[6]}"`); continue; }
    add(m[2], { msgid: m[2], msgid_plural: m[4] }, rel, lineOf(source, m.index));
  }
}

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

let pot = `# Copyright (C) ${new Date().getFullYear()} FoundHint
# This file is distributed under the GPL-2.0-or-later license.
msgid ""
msgstr ""
"Project-Id-Version: FoundHint\\n"
"Report-Msgid-Bugs-To: https://foundhint.com/\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"X-Domain: ${domain}\\n"
`;

for (const entry of entries.values()) {
  pot += `\n#: ${entry.refs.slice(0, 6).join(" ")}\n`;
  if (entry.msgctxt) pot += `msgctxt "${esc(entry.msgctxt)}"\n`;
  pot += `msgid "${esc(entry.msgid)}"\n`;
  if (entry.msgid_plural) {
    pot += `msgid_plural "${esc(entry.msgid_plural)}"\n`;
    pot += `msgstr[0] ""\nmsgstr[1] ""\n`;
  } else {
    pot += `msgstr ""\n`;
  }
}

fs.mkdirSync(path.join(root, "languages"), { recursive: true });
fs.writeFileSync(path.join(root, "languages", `${domain}.pot`), pot);

console.log(`strings: ${entries.size}`);
if (wrongDomain.length) {
  console.log(`\nStrings using another text domain (${wrongDomain.length}):`);
  for (const w of wrongDomain.slice(0, 20)) console.log(`  ${w}`);
  process.exitCode = 1;
}
