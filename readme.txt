=== FoundHint — Local SEO & Schema for Google Business Profile ===
Contributors: foundhint
Tags: local seo, schema, google business profile, structured data, local business
Requires at least: 6.4
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Your business details in one place: local SEO schema, an audit that tells you what to fix, and a one-click Google Business Profile connection.

== Description ==

FoundHint keeps the facts about your business — name, address, phone, opening hours and services — in **one place**, then uses them everywhere they matter: structured data for search engines, an audit that tells you what is holding you back, and a link to your Google Business Profile so you can see how Google shows you today.

No duplicate typing. Change your phone number once, and the schema, the audit and your Google comparison all follow.

= What it does =

* **One business record.** Name, address, phone, website, opening hours and services, stored once. Opening hours understand that "not set" is not the same as "closed".
* **Schema that search engines read.** Valid JSON-LD for your business, its location and its services, published automatically — and it stands aside politely if another plugin is already publishing it.
* **A local SEO audit.** Plain findings, most urgent first, each with what to do about it. No vanity score without an explanation.
* **Google Business Profile, in one click.** Press *Continue with Google*, choose your account, and FoundHint reads your profile. **No Google Cloud project, no client ID and no API key** — you never see a developer console.
* **Import what Google already knows.** Your name, address, phone, website, opening hours, categories, services, social links and map position come across after you review them. Nothing is written until you tick it, and anything you have already filled in is left alone.
* **More than one location.** A business with branches keeps a location per Google profile, each with its own address and hours.

= Who it is for =

Small businesses with a shop, a clinic, a studio or a van — and the agencies looking after them. If your customers find you by searching nearby, this is for you.

== External services ==

This plugin connects to two external services. Neither is contacted until you choose to connect Google.

**1. Google Business Profile APIs** (Google LLC)

When you connect your Google account, your site talks directly to Google to read the business profiles your account manages: account and location lists, business details, opening hours, categories, services, attributes (which carry your social links) and map coordinates.

* What is sent: your Google access token, and the identifier of the profile being read.
* When: when you press *Continue with Google*, *Read from Google*, or *Import*. Never on a visitor-facing page.
* Terms of service: https://policies.google.com/terms
* Privacy policy: https://policies.google.com/privacy

**2. FoundHint Connect** (the sign-in service at https://foundhint.com)

Google requires an OAuth client, and an OAuth client requires one fixed web address registered in advance plus a secret that cannot ship inside a downloaded plugin. FoundHint runs that one address so you do not need a Google Cloud project of your own.

* What is sent: your site's address, the address Google should return your browser to, and — when an access token expires — your refresh token, so a new access token can be issued. Tokens pass through and are not stored by the service.
* What is **not** sent: your business data. Once your site has a token it talks to Google directly, and nothing about your business reaches foundhint.com.
* When: when you start a Google sign-in, and when an access token needs renewing (about hourly while you use the Google screens).
* Terms of service: https://foundhint.com/terms-and-conditions/
* Privacy policy: https://foundhint.com/privacy-policy/

If you would rather not use that service, open **Google → Advanced: use your own Google client** and enter a client ID and secret from your own Google Cloud project. The plugin then talks only to Google.

== Bundled resources ==

The compiled admin application in `assets/build/` is built from the uncompressed
JavaScript in `src/admin/`, which ships with the plugin. To reproduce it:

`npm install --legacy-peer-deps && npm run build`

It bundles one third-party resource, which is GPL-compatible:

* **Archivo Variable** (webfont) — Omnibus-Type, SIL Open Font License 1.1. Source and licence: https://github.com/Omnibus-Type/Archivo

No script or stylesheet is loaded from a remote host; everything is served from
the plugin folder.

== Installation ==

1. Install and activate the plugin.
2. Open **FoundHint** in the admin menu and fill in your business details — or skip ahead and import them.
3. Go to **Google**, press **Continue with Google**, and approve access.
4. Press **Read my Google profile**, tick what you want, and import.

== Frequently Asked Questions ==

= Do I need a Google Cloud project, API key or client secret? =

No. That is the point of the sign-in service described under External services. Press *Continue with Google* and you are done. If you prefer your own Google project, the Advanced section on the Google screen accepts one.

= Does my business data go through your servers? =

No. The sign-in passes through FoundHint Connect; your business data never does. Once your site holds a token, it reads Google directly.

= Where are my Google tokens stored? =

In your own site's database, encrypted with a key derived from your WordPress salts. They are never written to logs or shown on screen. Disconnecting removes them and asks Google to revoke them.

= Will this fight with my SEO plugin over schema? =

No. FoundHint detects when another plugin already publishes business schema and stands aside, because two descriptions of one business on a page is worse than one. You can override that choice on the Schema screen.

= Can I have more than one location? =

Yes. Each Google profile keeps its own location, with its own address, phone and opening hours.

= What happens to my data if I delete the plugin? =

Nothing is removed unless you ask for it. Turn on *Delete data on uninstall* in Settings first if you want a clean removal. Google credentials are always removed, because a leftover token is a live grant to your account.

== Screenshots ==

1. The dashboard: your score, what to fix, and your Google connection at a glance.
2. Business details — entered once, used everywhere.
3. Connecting Google Business Profile with a single button.
4. Importing from Google: every field side by side, nothing saved until you choose.
5. The audit: plain findings, most urgent first.
6. The schema FoundHint publishes, exactly as search engines see it.

== Changelog ==

= 0.1.0 =
* First release: business profile, locations, opening hours, services, JSON-LD schema, local SEO audit, dashboard score, Google Business Profile connection and import.

== Upgrade Notice ==

= 0.1.0 =
First release.
