# Security review

What was examined, what was found, and what was decided. Dated 3 October 2026,
against FoundHint 0.1.0 and FoundHint Connect 0.1.0.

Every claim here was checked by running something, not by reading the code and
believing it. Where a finding was accepted rather than fixed, the reason is
written down.

## What an attacker would be after

Google access and refresh tokens. A refresh token is a live grant to somebody's
Business Profile: it can read their listing, and — once write features exist —
change what the public sees about their business. It outlives the database it
sits in, travelling into every backup and staging copy.

Second to that: the admin screens, which hold the business's own data, and the
front-end schema output, which is the only part of this plugin a visitor sees.

## Findings

### Fixed in this review

**The connect handshake secret was stored in clear text.** For ten minutes
during a sign-in, `fhint_connect_handshake` held the secret that proves this
site may collect its tokens. A database dump taken in that window carried it.
It is now encrypted with the same key as the tokens. *Severity: low — an
attacker also needs the handoff code, which only ever travels through the
owner's browser.* Covered by `tests/Smoke/google.php`, and both halves
(storing, and presenting the real secret when collecting) are mutation-tested.

**A host without libsodium stored tokens unencrypted, silently.** Encryption
degrades to plain storage rather than refusing to connect, which is the right
call — but it was invisible. It now records a warning in the log the first
time it happens.

### Accepted, with reasons

**`/v1/refresh` on the connect service is unauthenticated.** Anyone holding a
stolen refresh token can mint access tokens through the service without the
client secret. Requiring more would mean issuing every site a long-lived
credential and storing it, which is a larger target than the problem it
solves; a refresh token *is* the credential in OAuth's public-client model.
Rate limiting per caller is the mitigation, and the token is encrypted at
rest on the site it belongs to.

**A broker lends its name.** Anyone can register a session for a site they
control and send somebody a sign-in link; the victim would see Google's
consent screen for FoundHint and, if they approve, their tokens reach the
attacker's site. This is true of every OAuth broker — the protection is that
Google names the application on its own consent screen. A confirmation page
naming the requesting site before the redirect would reduce it further, at
the cost of a step on every legitimate sign-in. Not taken for 0.1.0.

**Encryption is bound to `wp-config.php`.** The key derives from the site's
salts, so anything that can read the tokens through the plugin can read them
the same way. This defends against a leaked database, not a compromised
server, and the class says so rather than implying more.

## What was checked and found sound

**Authorisation.** Probed live: eleven sensitive routes (business, Google,
import, settings, schema, audits, logs) answered 4xx for both a logged-out
request and a logged-in subscriber. Every route carries a real capability
check — `tests/Smoke/rest-routes.php` fails the build if one is missing or
uses `__return_true`, and asserts every argument has validation and
sanitisation.

**Cross-site requests.** REST under cookie authentication is covered by
WordPress's own nonce check. The OAuth callback on `admin-post.php` checks the
capability *and* claims a single-use `state` bound to the user who began the
handshake, so a replayed or borrowed redirect finds nothing.

**SQL.** Every query goes through `$wpdb->prepare()` or takes its table name
from the `Tables` registry, never from input. The three queries that build a
fragment at runtime were traced: `WHERE`/`LIMIT` clauses are literal strings
with values bound separately; `IN (…)` lists are `%d` placeholders counted
from an array already cast with `intval`. No path from request data to SQL
text.

**Output.** The front end emits one thing: JSON-LD, encoded with
`JSON_HEX_TAG`, so a `</script>` in a business name cannot break out. The
admin page prints a single empty `div`; everything else is React, which
escapes by construction — and there is no `dangerouslySetInnerHTML` anywhere
in the app.

**Secrets in logs.** The logger redacts keys matching token, secret, password
and similar, on word boundaries. No call site passes a token or a code to it;
the Google module logs events, never values.

**Request data.** Superglobals are read in exactly one place — the OAuth
callback — and each value is unslashed and sanitised before use.

**Server-side requests.** Outbound calls go to constant hosts
(`googleapis.com`, the configured connect service). Where a Google resource
name goes into a path, it comes from a row this site stored from Google, and a
name supplied over REST is looked up in that table first, so an unknown value
is refused rather than fetched.

**Dangerous functions.** No `eval`, `create_function`, `extract`,
`unserialize`, or shell execution. One `file_get_contents` reads a fixed
plugin asset to build the menu icon.

**Uninstall.** Guarded by `WP_UNINSTALL_PLUGIN`. Google credentials and tokens
are removed whatever the operator chose about their own data, because a
leftover refresh token is a live grant.

**Standards.** PHP_CodeSniffer with WordPress-Extra and PHPCompatibilityWP
passes across both plugins with zero violations.

## FoundHint Connect

The service's endpoints are public by design — the sites calling them are
other people's WordPress installs, and there is no user of that site to
authenticate. What protects them is tested in `tests/` with seven deliberate
defects, each caught:

- a return address is fixed before anyone signs in, must be the calling site's
  own callback on the same origin, and is the only place the service will
  redirect — so it cannot be turned into an open redirect;
- tokens never travel in a URL: the browser carries a one-time handoff code
  and the site collects the tokens server to server;
- `state`, the handoff code and the session are each single use;
- collecting requires a secret the service only ever saw hashed, compared with
  `hash_equals`;
- `http` return addresses are refused unless the site is on the same machine;
- every caller is rate limited, because all sites share one Google quota;
- tokens, codes and secrets are never logged.
