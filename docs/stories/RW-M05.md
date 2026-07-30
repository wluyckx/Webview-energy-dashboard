# RW-M05 — Hardening rider: delete the dead bridge and require same-origin

**Lane**: M (maintenance, this repo) · **Complexity**: M · **TDD**: mandatory
**Model lane**: Opus · **Branch**: `story/RW-M05-hardening-rider`
**Opened**: 2026-07-30
**Closes**: risk R3 (prefix-only validation), risk R6 (bridge re-verification) — both by removal
**Authorises**: ADR-012 maintenance item 4. This is the one story permitted to
touch auth code; escalation trigger 4 exempts it by name and nothing else.

---

## Story Contract (PM hat)

**GOAL**: no code path by which a token can enter the client, and no base URL
accepted that is not same-origin — so the session cookie cannot be sent to a
host an attacker chose.

**THE TWO DEFECTS**

1. The artifact carries a dead WebView token bridge — `window.addEventListener('message', handleMessage)`
   in `src/app.js` feeding `Config.updateTokens`, plus a URL-token fallback and
   `history.replaceState` scrubbing in `src/config.js`. It served a Flutter host
   that does not exist in the production path. HC-002 as rewritten forbids
   token-handling code outright: there is nothing to handle.
2. `validateUrl` checked only `value.startsWith('https://')` while
   `authenticatedFetch` sent `credentials: 'include'` to that host. So
   `https://attacker.example.com` passed validation and received the session
   cookie.

**ACCEPTANCE CRITERIA**: AC1–AC8 verbatim from `docs/REWORK_BACKLOG.md`.

**IN SCOPE**: `src/config.js`, `src/api-client.js`, `src/app.js`, and the Spec
Author's test files.

**OUT OF SCOPE**: `index.html` — its CSP must stay byte-identical;
`connect-src` is the backstop, explicitly **not** the defence (AC8). Caddy's
configuration, docker-compose, the deployment path. Any other `src/` file.

**BINDING CONSTRAINTS**: HC-002 (no tokens in the client, in any form),
HC-003 (never a blank screen), ADR-009 as amended (dual modes reduced to one),
ADR-012 (the `src/` freeze outside the four items), the public-remote secrets
rule.

### Scope amendment, 2026-07-30 — PM defect corrected before the Spec Author ran

The story as drafted listed only `config.js` and `api-client.js`. That was wrong:
`config.js` exposes `updateTokens`, but the bridge's actual entry point is
`window.addEventListener('message', handleMessage)` at `src/app.js:342` with the
token extraction at `src/app.js:305-312`. Deleting only the `config.js` half
would have left a live listener calling a removed function. `src/app.js` and
`tests/app.test.js` were added to scope.

Same class of defect as RW-M01's five-versus-eight format files: **the story was
written from the architecture rather than from the code.** Two for two now — the
PM hat should read the implementation before fixing scope, not after. Logged as a
recurring PM defect, not a one-off.

---

## Spec Author deliverable (Sonnet 5) — APPROVED

**TEST SPEC**: AC1 → bridge-deleted assertions in both `config.test.js` and
`app.test.js`; AC2 → three tests that no token reaches config and
`history.replaceState` is never called; AC3 → seven same-origin tests covering
accept, cross-origin https, protocol-relative, `javascript:`, and two
prefix-bypass variants, plus `sungrow_base`; AC4 → rejection yields no stored
config and a defined error panel, never a blank screen; AC5 → six tests that no
call path can produce an `Authorization` header.

**REMOVALS** (the Spec Author owns the test files; removing obsolete tests is
part of the spec): `config.test.js` — the URL-validation, token-validation,
token-scrubbing and `updateTokens` describes (9 tests); `api-client.test.js` —
the Bearer-header describe (5 tests); `app.test.js` — the entire `handleMessage`
describe from STORY-014 (19 tests). Each documented in-file with a
`REMOVED (RW-M05 ACx)` comment at the deletion point.

**RED EVIDENCE**: 23 failed / 233 passed / 256 total.

**PM verification of the spec before approval** — approval is gatekeeping, not
rubber-stamping, so the claims were reproduced rather than taken on trust:
`git status --porcelain src/` empty (the Spec Author wrote no production code);
23 failures reproduced independently; **zero** `Cannot find module` /
`ReferenceError` / `SyntaxError` occurrences, so every failure is a real
assertion mismatch rather than a broken import.

**Two disclosures the Spec Author volunteered, both accepted:**
1. Two of its AC4 app-level tests **pass today** — they exercise `app.js`'s
   pre-existing degradation path and are regression cover, not RED evidence. The
   real RED evidence for AC4 is the two `config.test.js` tests. Accepted as a
   conscious trade-off; it flagged this itself rather than letting the count
   imply more than it proved.
2. AC3's protocol-relative, `javascript:` and plain-http prefix cases already
   pass, because today's validator is *cruder* than a same-origin check and
   rejects them incidentally. It therefore added `AC3(e-2)` — an `https://`
   prefix-bypass host — which **is** genuinely red, and which is the case that
   proves the old check is blind to host entirely.

**NEEDS-SPEC** (correctly refused rather than faked): AC5's grep, AC6's secrets
sweep and AC8's CSP byte-identity are not expressible as Jest tests. Assigned to
the Verifier as manual checks. The Spec Author also warned that grep cannot
distinguish comments from logic, so stale comments claiming the client handles
tokens must be fixed too — a comment like that is what gets re-implemented later
by someone trusting it.

---

## Implementation Report (Builder, Opus 5)

**STATUS**: DONE

**CHANGES**
| File | Purpose |
|---|---|
| `src/config.js` | Deleted `updateTokens`, `TOKEN_PARAMS`, `scrubTokensFromUrl` and its `replaceState`, and the token extract/validate/attach steps; replaced prefix validation with a parsed same-origin check; clears `currentConfig` on every rejection path |
| `src/api-client.js` | `authenticatedFetch(url)` always `{ credentials: 'include' }`; Bearer branch and the `token` parameter deleted; five call sites updated |
| `src/app.js` | Deleted `handleMessage`, the `message` listener, the `allowedOrigins` allowlist, and `handleMessage` from the public API |

No `tests/` file appears in the Builder's diff.

**TDD EVIDENCE**: 8 suites, **256 passed, 0 failed**.

**GATES**: `npm run lint` zero errors and zero warnings · `npm run format` clean
· `npm run build` 132,613 bytes (129.5 KB, down from 130.7 KB) with 9 scripts
inlined · coverage `config.js` 93.3% stmts / 91.2% branch and `api-client.js`
96.8% / 92.1%, both over the 80% target.

**GREP RESULT**: 15 surviving hits of `token|bearer|authorization` in `src/`, all
comment or CHANGELOG prose, **zero executable** — including four that now
document the *absence* of client-side tokens, and `p1-card.js`'s "design token"
which is unrelated. Historical CHANGELOG entries were preserved verbatim (they
record what happened); new dated entries were added.

**DEVIATIONS**
1. `validateUrl` resolves against `window.location.href`, so a **relative**
   same-origin path (`/api/energy`) is accepted alongside absolute same-origin
   URLs. Not required by any test; it makes the proxy path expressible in its
   natural form. Accepted by the Governor — it cannot widen the origin check,
   since a relative URL resolves to the page origin by construction.
2. Noted that `coverage/` is absent from `.gitignore` (it is only in
   `.prettierignore`). Pre-existing hygiene gap, out of this story's scope —
   routed to the backlog parking lot rather than fixed here.

**SELF-REVIEW**: the Builder judged its weakest point to be operational rather
than logical — rejecting cross-origin base URLs means that if the production
launch URL passes absolute third-party API hosts, the dashboard would render the
config-error panel instead of data after deploy.

---

## Governor check on the Builder's operational flag — resolved, favourably

The flag was checkable, so it was checked rather than carried forward as a
caveat. `/home/wlc3xkl/Personal-Assistant-App/src/pages/EnergyDashboard.tsx`
builds the embed URL as:

```ts
const origin = window.location.origin;
p1_base:      `${origin}/api/energy`
sungrow_base: `${origin}/api/solar`
```

The iframe is served from `/embed/energy/` on that **same** origin, so
`window.location.origin` inside the iframe equals the value used to build the
parameters. Production therefore passes **same-origin absolute URLs**, which the
new check accepts.

Conclusion: **no production behaviour change.** The only URLs this now rejects
are cross-origin ones — which is precisely the vulnerability (R3), and which
production has never used. This also confirms ADR-009's amendment: mode B
(same-origin proxy with Caddy token injection) is the only mode production has
ever exercised, so deleting mode A removes dead code rather than a feature.

---

## Verification Report (Verifier, fresh Sonnet 5)

**GATES**: lint zero errors and zero warnings · format clean · **256 passed /
256 total** · build 132,613 bytes (129.5 KB) with 9 scripts inlined · coverage
`config.js` 93.33% stmts / 91.17% branch / 100% funcs, `api-client.js` 96.77% /
92.1% / 94.73% — both far over the 80% target. All-files coverage 51.63%, which
matches the pre-existing red baseline CLAUDE.md already discloses; `app.js` at
60.9% is held down by untouched polling code, not by this story's lines.

**TDD AUDIT**: `index.html` diff **empty** — CSP byte-identical (AC8). No Spec
Author test file was modified by the Builder. Two mutation tests, both killed:

1. Reverting `validateUrl` to the original `value.startsWith('https://')` fails
   **12 of 21** tests, including `AC4 › getConfig() never exposes a rejected
   cross-origin base URL` — which shows the mutant storing
   `{p1_base: "https://attacker.example.com/api"}` as live config. That is the
   original vulnerability, reproduced and caught.
2. Reverting to the *plausible-but-wrong* fix `value.startsWith(pageOrigin)`
   fails **exactly one** test: `AC3(e) › rejects a host that merely PREFIXES the
   real origin`. A single precise kill by the test written for that bypass class,
   with nothing else covering it incidentally. This is the clearest possible
   evidence that AC3(e) was worth specifying: the almost-right fix is the one a
   hurried implementation would have shipped.

**SIGN CONVENTION**: not applicable — confirmed by empty diff on
`power-flow.js`, `energy-balance.js`, `charts.js`, `p1-card.js`, `kpi-strip.js`.

**SECURITY**: 24 attack classes tried against the real module. **No accepted
input was ever cross-origin**, and every accepted case was independently
confirmed to resolve to the page's real origin. Rejected: cross-origin https,
protocol-relative, `javascript:`/`data:`/`blob:`/`file:`, both origin-prefix
bypass directions, userinfo `@evil.com`, fragment-userinfo, both backslash
tricks, embedded NUL, trailing-dot host, scheme-mismatched port, Cyrillic
homoglyph, single- and double-encoded `%2e` hosts, a 5,000-char string, and
whitespace/control-char padding prefixed to cross-origin absolute URLs in every
combination tried. Accepted and correct: same-origin absolute, relative
references, case variants, explicit default port, and `http://evil.com@localhost`
— whose host genuinely *is* localhost, and which browsers refuse to `fetch()`
anyway for carrying credentials.

Grep: `replaceState` has **zero** hits anywhere in `src/`. Every `token` /
`bearer` / `authorization` hit is comment or CHANGELOG prose, several of them now
documenting the *absence* of client tokens. The single executable `credential`
hit is `credentials: 'include'` — the intended cookie path.

**ADVERSARIAL**: probed the ordering gap the Governor flagged as plausible —
a valid parse followed by a rejected one — and `getConfig()` correctly returns
null, because both early-return branches clear `currentConfig` unconditionally.
`parseConfig` throws for none of `null`, `undefined`, `''`, `'?'`, `'?%'`,
`'?p1_base=%'`, or a 100,000-character value; every case returns
`{valid: false, errors: [...]}`, so HC-003 holds on malformed input.

**VERDICT**: **PASS**

**Non-blocking finding carried to the backlog**: `validateUrl` validates by
*parsing and resolving* the candidate, but the config stores and `api-client.js`
concatenates the *raw, unresolved* string. Inert today — every accepted
"weird" value is a relative reference that necessarily resolves same-origin, and
no padding trick smuggled a foreign host through. But the validated string and
the string used to build fetch URLs are not provably the same string, so a future
change to the hardcoded API-path suffixes could reopen a `"//"`-concatenation
edge. Logged for normalisation rather than fixed here.

---

## Review Verdict (Reviewer hat)

**VERDICT**: APPROVE

**CHECKED** — the diff itself, not the reports:
- `validateUrl` reads `new URL(value, window.location.href)` then
  `parsed.origin !== pageOrigin`. **Parsed equality, no string comparison
  anywhere in the function** — which is the whole point, since prefix matching is
  the vulnerability being removed. Scheme allowlist confined to `http:`/`https:`;
  opaque origin (`'null'`) rejected explicitly, so a `file:`/`data:` host context
  cannot make a candidate compare equal; `try/catch` returns an error string
  rather than throwing, satisfying HC-003 on malformed input.
- `authenticatedFetch(url)` is eight lines with a single code path and no `token`
  parameter at all. There is no branch that could add an `Authorization` header,
  because there is no longer anything to branch on — the strongest form of AC5.
- No executable reference to `updateTokens`, `handleMessage`, `replaceState`,
  `TOKEN_PARAMS`, or a Bearer string survives in `src/`.
- Net **−50 lines** of production code. This story removes attack surface rather
  than adding defence to it, which is the right shape for a hardening story.
- `index.html` untouched, so `connect-src` remains the backstop and is not being
  leaned on as the defence.

**FINDINGS**: none blocking.

**NOTES**
1. The Builder's deviation — accepting relative same-origin paths by resolving
   against `window.location.href` — is approved. It cannot widen the check: a
   relative URL resolves to the page origin by construction.
2. The Builder's operational concern was checked rather than carried: Hestia
   passes `${window.location.origin}/api/energy` and serves the iframe from that
   same origin, so production is unaffected. See the Governor check above.
3. Mutation test 2 is the finding worth remembering from this story. The
   almost-right fix — `startsWith(pageOrigin)` — is killed by exactly one test,
   the one the Spec Author wrote specifically for the prefix-bypass class. Had
   that AC not been enumerated in the contract, a plausible implementation would
   have shipped with the vulnerability intact in a new form. That is the
   Architect-hat practice of writing security invariants as explicit numbered ACs
   paying for itself, and it is the durable lesson from RW-M05.

**COMMIT**: see the `status="done"` entry in `docs/REWORK_BACKLOG.md`.
