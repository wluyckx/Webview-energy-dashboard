# Webview Energy Dashboard — archived, moved to Hestia

> **This project has moved.** The energy dashboard is now a native `/energy`
> route inside **Hestia** (the Personal-Assistant-App PWA), not a standalone
> WebView app. This repository is a **frozen historical record** — read-only.

**→ [github.com/wluyckx/Personal-Assistant-App](https://github.com/wluyckx/Personal-Assistant-App)**

## What happened

Under this repo's ADR-010/011/012, the Lovable-generated frontend was
**extracted, not adopted**: its application layer was ported into Hestia as a
native, live-data, code-split, trilingual `/energy` feature, and the standalone
artifact was decommissioned (2026-07-30). Along the way four shipped
truthfulness defects (D1–D4) were fixed and the P1 API contract was captured
from the live meter (closing R1).

## Where the knowledge lives now

All durable domain knowledge — the **Sign Convention Reference**, the captured
P1/Sungrow API contracts, the R1 history, and the governance lessons — was
transferred to Hestia's `docs/energy-domain.md` (self-contained). Maintaining
the feature needs no access to this archive.

## What remains here (for the record)

- `Architecture.md` — the full ADR log and the extraction rationale.
- `docs/REWORK_BACKLOG.md` — the 30-story extraction plan (RW-M/RW-C/RW-E).
- `docs/stories/` — per-story logs, including the cutover (`RW-E22.md`).
- `lovable/` — the read-only staged design reference (`MANIFEST.md`).
- `src/` — the legacy vanilla-JS artifact (the D1–D4 fixes shipped here before
  decommission).
