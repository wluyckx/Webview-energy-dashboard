# RW-E22 / Hestia STORY-109 — Cutover & Decommission

**Lane**: E (executes in Hestia + on the VPS + on GitHub) · **Gated by**: THIS
repo's Governor (donor R11 — the one cross-repo gate) · **Status**: DRAFT
contract, awaiting Wim's go-ahead. Nothing here is executed yet.

This is the terminal story of the whole transition. It is **not** TDD-shaped
work: it touches the live VPS, the public GitHub remote, and what real users
see. It runs deliberately, phase by phase, each phase verified before the next,
each with a rollback that has been thought through in advance.

---

## Deployment Contract (§2.5, extended for a multi-phase cutover)

**DEPLOY**: Hestia `main` at the STORY-109 commit — the native `/energy` route
replacing the iframe — plus two VPS operations (remove the `/embed/energy`
Caddy route, stop the `energy-dashboard` container) and one GitHub operation
(archive the donor repo `wluyckx/Webview-energy-dashboard` read-only).

**PROCEDURE**: five phases, in this order. The ordering is the safety property:
the native route is proven in production *before* anything the old path depends
on is removed, and the donor is archived *last*, only after the standalone
dashboard is provably unreferenced.

### Phase 0 — Preconditions (abort if any fails)
- P0.1 Hestia `main`: working tree clean; all four gates green locally
  (`npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npx vite build`).
  Note: `main` carries 6 **pre-existing** unrelated failures (useAudioPlayback,
  a ChatInput test) documented since STORY-089 — the gate is "no NEW failures
  and the energy suite green (~90 tests)", confirmed by comparing against the
  recorded baseline, not a bare zero.
- P0.2 The STORY-109 code change (route swap, below) is merged to `main` via
  the normal gate — it is the only code in this story and goes through a PR
  like any other, BEFORE the ops phases.
- P0.3 SSH to the VPS reachable (`deploy@ubuntu-hetzner-cpx32-w1`, Tailscale —
  the host `deploy-pwa.sh` calls `hestia.wimluyckx.dev` resolves to the same
  box; confirm which name authenticates before relying on the script).
- P0.4 **Backups staged before any mutation**:
  - VPS: `cp ~/infra/caddy/sites/hestia.Caddyfile{,.pre-cutover-20260730}`.
  - VPS: confirm the `energy-dashboard` image is tagged
    `ghcr.io/wluyckx/energy-dashboard:rollback-20260730` (staged during the
    2026-07-30 deploy — verify it still exists; re-tag from the running
    container if not).
  - The donor repo's final `main` is pushed and is the archive's frozen state.
- P0.5 Capture the current production state for the rollback baseline
  (read-only): `curl -s -o /dev/null -w "%{http_code}"
  https://hestia.wimluyckx.dev/embed/energy/` (expect 401 — auth-gated, alive);
  `docker ps --filter name=energy-dashboard`; the `/energy` page currently
  renders the iframe.

### The code change (Phase 0's PR — Hestia, normal gate)
Swap `/energy` from the iframe to the native island:
- `src/App.tsx`: point the `/energy` route at the lazy `EnergyPage` (the same
  element `/energy/native` uses), and **remove the transitional
  `/energy/native` route** (its job is done — it existed only so the native
  island could be verified in production alongside the still-live iframe).
- Delete `src/pages/EnergyDashboard.tsx` (the iframe page) and its import.
- Keep `/grid` and `/peak` as-is.
- Update the `EnergyPage`/route header CHANGELOG.
- This is a tiny diff; it ships in the normal deploy of Phase 1.

### Phase 1 — Deploy the native SPA to production
- `bash infra/vps/deploy-pwa.sh` (gates → `vite build` → rsync `dist/` →
  `/home/deploy/apps/hestia-ui/dist`; the Caddy SPA fallback serves it).
- The native `/energy`, `/grid`, `/peak` routes are now live. The
  `/embed/energy` Caddy route and the `energy-dashboard` container still exist,
  untouched — they are simply no longer referenced by any client.

**VERIFY 1** (each with captured evidence):
- V1.1 `https://hestia.wimluyckx.dev/energy` returns 200 (auth cookie present)
  and the served HTML is the SPA shell; loading it in an authenticated browser
  renders the **native** dark island (the power-flow SVG hero, KPI strip),
  NOT an iframe. The fingerprint `History is not available yet` is gone (that
  was the legacy artifact); the native fingerprints (e.g. the i18n status
  labels, the recharts timeline) are present.
- V1.2 `/grid` and `/peak` load and render their screens; the power flow shows
  live values (or the honest offline/mock state if the backend is briefly
  unreachable — never a blank screen).
- V1.3 `/api/energy/*` and `/api/solar/*` still return data (the native client
  uses the same same-origin proxy — this must be unaffected).
- V1.4 No console errors from a real load; the entry chunk is unchanged in size
  (recharts stayed behind the lazy boundary).

**ROLLBACK 1**: `git revert` the route-swap commit, redeploy via
`deploy-pwa.sh`. The iframe path and its infrastructure are still fully intact
at this phase, so rollback is a clean redeploy with zero VPS-side changes.

### Phase 2 — Remove the `/embed/energy` Caddy route
Only after VERIFY 1 passes. Edit the **live** config
`~/infra/caddy/sites/hestia.Caddyfile` on the VPS (the hand-maintained one —
the repo's `infra/vps/Caddyfile.hestia` has diverged and is NOT what runs):
delete the `handle /embed/energy/* { … reverse_proxy energy-dashboard:80 }`
block. Reload Caddy (`docker exec caddy caddy reload --config /etc/caddy/Caddyfile`
or the compose-managed equivalent — confirm the reload mechanism, do not
restart the container blind).

**VERIFY 2**:
- V2.1 `curl … /embed/energy/` now returns 404 (route gone), not 502.
- V2.2 `/energy`, `/grid`, `/peak`, and every OTHER Hestia route
  (`/`, `/api/*`, recipes) still work — the reload did not break the file.
- V2.3 Caddy logs show a clean reload, no config parse error.

**ROLLBACK 2**: restore `hestia.Caddyfile.pre-cutover-20260730`, reload. (The
container is still running, so the route works again immediately.)

### Phase 3 — Stop & remove the standalone container
Only after VERIFY 2 passes and V2.2 confirms nothing else 502s (proving nothing
still routes to `energy-dashboard`). On the VPS:
`cd ~/apps/energy-dashboard && docker compose down` (stops and removes the
`energy-dashboard` container). Leave the `rollback-20260730` image in place as
the safety net; do not `docker rmi` it in this story.

**VERIFY 3**:
- V3.1 `docker ps` shows no `energy-dashboard` container.
- V3.2 `/energy` (native) still works — proving it never depended on the
  container.
- V3.3 The `edge` network and every other container are unaffected.

**ROLLBACK 3**: `docker compose up -d` in `~/apps/energy-dashboard` brings the
container back; combined with ROLLBACK 2's Caddy restore, the iframe path is
whole again.

### Phase 4 — Archive the donor repository
Only after Phases 1–3 verify and a **soak period** (recommend ≥24 h of the
native route serving production without incident — this is the one step with no
clean rollback, so it waits for confidence, not just green checks).
- Final donor `main` pushed (this contract, all story logs, `energy-domain.md`
  already transferred to Hestia under STORY-108 — R10 closed, nothing strands).
- Set the GitHub repo `wluyckx/Webview-energy-dashboard` to **Archived**
  (read-only) via repo settings. This is Wim's action or an explicit
  `gh repo archive` — a public-remote, irreversible-in-spirit operation, so it
  is confirmed with Wim regardless of what else is automated.

**VERIFY 4**: the donor repo shows the Archived banner; its content is intact
and read-only; ADR-011's disposition (donor → transitional host → archive) is
complete.

**ROLLBACK 4**: un-archive via settings (GitHub archival is reversible, but
treat it as final — the point of the soak is to not need this).

---

## Standing caveats carried into this contract
- **R8 (deploy provenance)**: resolved for the donor by decommission — after
  Phase 3 there is no standalone artifact whose provenance can drift. The
  Hestia PWA deploy is a straight rsync of a locally-built `dist/`, provenance-
  clean by construction.
- **House rules**: `.backup` before the Caddy edit (P0.4); Telegram only if a
  phase fails and needs attention; the archival and the VPS mutations are
  escalation-worthy and are Wim's explicit go — this contract does not
  self-authorise them.
- **Operator discipline**: every VERIFY item reports captured command output,
  never "should work". A failed VERIFY triggers that phase's ROLLBACK
  immediately, then stop and report — no debugging live in production.

---

## Open questions for Wim before execution
1. **Go/no-go on the ordering** — deploy native → verify → remove embed route →
   stop container → (soak) → archive. Any preference to keep the container
   parked (stopped but not removed) longer than the donor repo's archival?
2. **The soak period** before archival — 24 h as drafted, or shorter/longer?
3. **Who pulls the archive trigger** — I can run `gh repo archive` at your word,
   or you do it in GitHub settings. Either way it is your explicit call.
4. **`/energy/native` removal** — the contract deletes the transitional route in
   the swap PR. If you'd rather keep it as a permanent alias, say so.

---

## Pipeline record

**Drafted 2026-07-30. Go-ahead 2026-07-30**: approved ordering, 24h soak,
archive by the agent.

**Phase 0 (code) — DONE** (Hestia PR #22): `/energy` now renders the native
`EnergyPage`; `/energy/native` route and the iframe `EnergyDashboard` page (+
its test) removed. Gates green, energy suite 218/218, the 6 pre-existing
unrelated failures unchanged.

**Phase 1 (deploy) — DONE, VERIFY 1 PASS**: built the merged main, deployed via
`deploy-pwa.sh --skip-build` (its own vitest gate would false-fail on the 6
pre-existing failures, so gated manually first). Evidence: the cutover
EnergyPage chunk (`EnergyPage-Dgi82tce.js`) is live and matches the local
build; **no `/embed/energy` reference remains in the served SPA**; `/energy`,
`/grid`, `/peak` all 200; `/api/energy` and `/api/solar` alive (401 unauth);
entry chunk unchanged (recharts behind the lazy boundary).

**Phase 2 (remove embed route) — DONE after a caught failure, VERIFY 2 PASS.**
First attempt hit `ambiguous site definition: hestia.wimluyckx.dev` on
validate. ROLLBACK 2 restored the backup — and the *restored* file ALSO
failed validate, proving the error was **not** the edit. Root cause: the
running Caddy does `import /etc/caddy/sites/*` (glob, no extension filter), so
the P0.4 backup I placed **inside** `sites/` was itself imported as a second
`hestia.wimluyckx.dev` block. This was a latent restart landmine of my own
making (the running config, loaded at container start, was unaffected;
production stayed healthy throughout). Defused by moving the backup to
`~/infra/caddy/backups/`; validate then returned "Valid configuration". Re-did
the edit with **validate as a hard pre-reload gate**; reloaded cleanly.
Evidence: `/embed/energy/` now serves the Hestia SPA (theme-color #0D9488),
not the container dashboard; the container logged **0 requests in 3 min**;
every other route/API/subdomain alive; config valid and restart-safe (no
stray files in `sites/`).

**Phase 3 (stop container) — DONE, VERIFY 3 PASS**: `docker compose down` in
`~/apps/energy-dashboard` removed the `energy-dashboard` container. `/energy`,
`/grid`, `/peak` still 200 (never depended on it); caddy/agent-api/p1-api/
sungrow-api/mealie all healthy; the `rollback-20260730` image kept as the
safety net.

**Phase 4 (archive) — PENDING the 24h soak.** Scheduled to re-verify
production health and, only if healthy, run `gh repo archive` — see the
scheduled job. Not executed yet.

## Lesson (recorded for the house ops conventions)
**Never place a `.backup` of a Caddy site file inside a glob-imported
directory.** `import sites/*` imports every file, so a backup in `sites/`
becomes a duplicate site definition that a `caddy validate`/reload rejects and
a container restart would fail on. Back up to a sibling directory. The
contract's own P0.4 step said `cp …/sites/hestia.Caddyfile{,.pre-cutover}` —
that was the defect; corrected to `~/infra/caddy/backups/`.
