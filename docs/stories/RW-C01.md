# RW-C01 — Capture the P1 `/v1/series` bucket contract from the live API

**Lane**: C (capture/donor) · **Complexity**: S · **TDD**: not-applicable
**Model lane**: Fable · **Opened**: 2026-07-30 · **Closes**: risk R1 (blocking)
**Unblocks on completion**: RW-M04's D3 gate removal, RW-E20 (grid Day/Month/Year
in Hestia), and the honest end of `GridBucket`.

*(No internal hostnames, container names, IPs, or tokens in this log — the
remote is public. Infrastructure specifics live only in the capture session's
transcript and the gitignored scratch.)*

---

## Why this story exists

No document has ever defined the P1 `/v1/series` bucket field names. Guessing
them shipped D3 (NaN bars, now gated by RW-M04), and the Lovable mock
independently re-invented them as `GridBucket { bucket, import_kwh, export_kwh }`
— an invention that reached production code in the reference (`grid.tsx`
imports the mock directly; MANIFEST F2). HC-006 makes the missing shape a
blocking escalation, not an assumption. This story replaces the guess with the
captured truth.

## Reconnaissance findings (2026-07-30, evidence rule)

- Both upstream APIs are containers on the VPS's edge network; Caddy fronts
  them with two layers: Hestia session validation (`forward_auth`) for the
  public path, plus server-side Bearer injection toward the upstream.
- **The upstream enforces auth itself**: `/health` answers openly
  (`{"status":"ok","db":"ok","redis":"ok"}` — note: the P1 service has a DB and
  Redis, so series data is real stored history, not a proxy to the meter), but
  `/v1/series?...&frame=day` returns **401 without the token**. The capture
  therefore needs one of the three access paths below.
- Endpoints confirmed reachable; frames per the client contract: `day`
  (hourly), `month` (daily), `year` (monthly).

## Capture protocol (execute after the access-path decision)

**Requests** (all read-only GETs):
1. P1 `/v1/series?device_id=<id>&frame=day` · `frame=month` · `frame=year` — the
   heart of the story (AC1).
2. Sungrow `/v1/series?device_id=<id>&frame=day` — re-verify the documented
   bucket shape in the same exercise (AC3); month/year too, they are cheap.
3. P1 `/v1/realtime` and `/v1/capacity/month/2026-07` — re-verify the documented
   shapes, and specifically confirm `import_power_w` exists as documented
   (MANIFEST F6 flagged that `peak.tsx` reads it).

**Output hygiene (AC5, non-negotiable)**:
- Raw responses land ONLY in the session scratchpad (outside the repo) and/or a
  VPS-side temp dir removed afterwards. Never in the repo, never in a committed
  file: no raw meter dumps, no internal names, no real cumulative meter totals.
- If the VPS-token path is used: the token is read into a shell variable **on
  the VPS inside one remote command** and never echoed — it must not enter the
  local transcript, any file, or the repo. (HC-002 governs the *client*; this
  is server-side ops in the same trust domain as the Caddyfile — but the same
  never-in-the-repo rule applies absolutely.)

**Analysis — what gets derived from the raw captures**:
1. **Field inventory** per frame: name, JSON type, unit, nullability across the
   full array (a field absent in some buckets is a finding, not noise).
2. **Sign semantics, determined not assumed**: using the day frame, compare
   solar-hours buckets (export expected) against evening buckets (import
   expected); cross-check magnitudes against the Sungrow day series for the
   same window via the conservation identity (`load − pv + battery`). The
   deliverable states **which field is authoritative for grid direction** and
   its sign convention, with the evidence.
3. **Sanity ranges** for each field, so future fixtures can assert bounds.
4. **Partial-period behaviour**: what today's incomplete bucket looks like in
   `day`, this month's in `month` — the "not yet" representation matters for
   RW-E20's empty/gap handling and for whether the mock's zero-filled future
   hours (MANIFEST F8) match reality.

**Recording (the deliverable)**:
- `Architecture.md` API Integration: the `/v1/series` row gains the full bucket
  table; the R1 marker is replaced with the captured contract; Open Risks marks
  R1 **closed** (AC6).
- `tests/fixtures/p1-series-{day,month,year}.json`: derived fixtures with the
  captured *shape* and scrubbed, rounded, plausible values (AC5).
- `lovable/src/types/energy.ts`: annotation on `GridBucket` marking it
  superseded by the captured shape — annotation only, reference stays read-only
  (AC4).
- Written transferable to Hestia verbatim in substance (AC7 / RW-E21).
- Unblock notes on RW-M04 (gate removable once a story builds on the contract)
  and RW-E20.

## Access-path options (Governor presents; the user decides — trigger 4:
anything touching tokens is escalation-worthy, and the token here is
production config)

**A — VPS-side, server-held token (autonomous, transcript-safe).** One remote
shell command reads the token from the Caddy config into a variable on the VPS
and curls the upstreams directly; only JSON comes back. Token never leaves the
VPS. Fastest; touches the token config read-only.

**B — Browser session (most conservative).** Claude-in-Chrome drives the
logged-in browser to `https://hestia.wimluyckx.dev/api/energy/v1/series?...` —
the session cookie plus Caddy's own injection do the auth exactly as production
does it. Nobody and nothing touches the token; also validates the full
production path end-to-end. Needs the Chrome extension connected.

**C — User-run commands.** The prepared command block is handed over to run via
`!`; zero agent contact with any credential.

---

## Pipeline record (slim log)

**Access path**: user chose A (VPS-side, server-held token). First attempt
401'd — the Caddyfile holds `{env.*}` placeholders, not literals; the real
tokens live in the Caddy container's environment. Second attempt expanded the
token variables **inside the container**, so they never reached even the host
shell, let alone this transcript. 8/8 endpoints captured, 93 KB raw, scratchpad
only.

**The captured P1 `/v1/series` contract** (full table in Architecture.md):
bucket = `{bucket, avg_power_w, max_power_w, energy_import_kwh,
energy_export_kwh}`. Direction = two unsigned per-bucket magnitudes.
`avg_power_w` proven to be the signed net average — `(imp−exp)·1000/h` matches
it exactly in every hourly bucket. Frames: day=hourly, **month=WEEKLY
(Monday-start)**, year=monthly; incomplete trailing buckets omitted (~2 h lag
observed); **gaps are omitted buckets** (the 2026-07-06 week is simply absent).

**Findings beyond the target contract:**
1. **D3's record corrected**: the "invented" fields EXIST — the defect was
   semantic (per-bucket energies read as cumulative meters, plus /1000), not
   absent fields. The prior "the real payload lacks them ⇒ NaN" claim (mine,
   in the RW-M04 contract) was assumption stated as fact — sixth
   contract-precision defect, caught by the capture itself. Defect table and
   Contract Discipline sections corrected with the sharper moral: guessing can
   fail even when the names are right.
2. **Capacity doc drift**: `peaks[]` entries are `{bucket, avg_power_w}` — the
   documented `ts` never existed — and the array is ALL 1,470 quarter-hours of
   the month, not per-day peaks. The staged `peak.tsx` reads `p.ts` →
   undefined; MANIFEST F6's suspicion confirmed. Corrected in Architecture.
3. **The real July peak is 7,359 W** — the staged capacity gauge clamps at a
   4.0 kW scale, so the actual bill-setting peak would render indistinguishable
   from 4 kW. RW-E18's gauge scale needs rethinking against real data (noted in
   the backlog entry below).
4. **Sungrow re-verification (AC3)**: two undocumented bucket fields found —
   `avg_export_power_w` is near-zero NOISE (0.07–1.0 W), not literally 0
   (the "always 0" claim is approximately true; never-read rule unchanged), and
   `sample_count` (≈16,460 = a full day at 5 s) is a usable completeness
   signal. Sungrow month frame = daily (P1's is weekly) — frames are not
   uniform across APIs.
5. **Three timestamp formats** across the two APIs (P1 series space+offset,
   P1 realtime/capacity ISO-T, Sungrow T…Z). Parse defensively.
6. **R13 quantified**: P1 vs conservation identity — 1–2 W agreement at night,
   60–90 W divergence in solar hours, opposite signs near the zero crossing.
7. Realtime/capacity re-verified: `import_power_w` exists as documented;
   realtime `energy_import_kwh` is the cumulative lifetime meter (~16.3 MWh) —
   same names as the series' per-bucket fields, different semantics. Loudly
   documented as the trap D3 fell into.

**AC evidence**: AC1 three frames captured · AC2 full field table with name,
type, unit, sign semantics and the authoritative-direction statement recorded ·
AC3 Sungrow re-verified with drift recorded · AC4 `GridBucket` annotated
superseded (annotation only) · AC5 fixtures `p1-series-{day,month,year}.json`
derived with scrubbed device id and rounded values, month fixture deliberately
preserving the missing-week gap; raw capture stays in session scratchpad; no
token, hostname, or raw dump anywhere near the repo · AC6 R1 closed, unblocks
noted · AC7 the contract section is self-contained and transfers verbatim in
substance at RW-E21.

**Governor disposition on the legacy tabs**: RW-M04's gate could now be
removed by a properly scoped story — but ADR-012 authorizes no such story, the
semantics are subtle (weekly month frame, same-name traps), and decommission
approaches. **The legacy tabs stay gated; Hestia builds the real thing at
RW-E20 from the captured contract.** The gate's unlock comment is satisfied in
spirit: the contract is captured; the build happens in the successor.

**R1 is closed. Nothing in either codebase is blocked on an unknown anymore.**
