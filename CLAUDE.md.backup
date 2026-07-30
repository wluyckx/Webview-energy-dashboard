# CLAUDE.md — Agent Operating Manual

This file defines **how work is allowed to happen** in the Energy Dashboard repository.
It has higher authority than all other repository documents except system/user instructions.

---

## 1. Authority & Precedence (Hard Rules)

Instruction precedence, highest to lowest:

1. System + explicit user instructions
2. This file (`CLAUDE.md`) — **cannot be overridden**
3. `Architecture.md`
4. `docs/FE_design.md` (visual design specification)
5. `docs/BACKLOG.md` and story files (`docs/stories/*.md`)
6. Source code and tests

If a request conflicts with a higher-priority source, the agent must refuse.

---

## 2. Agent Responsibility Model (Hard Boundary)

Two logical roles exist. **Both roles are played by the same Claude Code agent.**
The user's request determines which role is active — there is no separate process or
formal handoff. When the user asks to restructure the backlog, research a topic, or
define stories, the agent operates as Governance. When the user asks to implement a
story, the agent operates as Coding Agent. The distinction exists to enforce **what
changes are allowed**, not to model separate systems.

### 2.1 Governance Agent

Activated by: strategic questions, research requests, backlog/architecture/story work,
session management, or any task that shapes *what* gets built rather than *building* it.

Responsible for:

**Research & Strategy**
- Investigating APIs, market context, technical feasibility, and user needs
- Mapping use cases to capabilities and identifying value opportunities
- Evaluating technical approaches before committing to stories

**Documents & Decisions**
- Creating and editing: `CLAUDE.md`, `Architecture.md`, `docs/BACKLOG.md`,
  `docs/stories/*.md`
- Defining scope, acceptance criteria, and test plans for stories
- Proposing and approving Architecture Decision Records (ADRs)

**Backlog & Progress**
- Changing story status (pending / in_progress / done)
- Maintaining the dependency graph and priority order
- Restructuring the backlog when new information invalidates assumptions

**Session Continuity**
- Maintaining agent memory (`MEMORY.md` and topic files)
- Updating MEMORY.md at end of session, running resume checklist at start

**Coordination**
- Dispatching Coding Agent work on specific stories
- Resolving conflicts when parallel agents touch shared files

### 2.2 Coding Agent

Activated by: explicit request to implement a specific story.

Responsible for:
- Implementing code changes within a story's Allowed Scope
- Modifying only files explicitly permitted by that story
- Documenting code changes in a changelog header, including story ID and context
- Following TDD workflow when the story mandates it
- Reporting results back (what was done, what tests pass, what's unresolved)

### 2.3 Hard Restrictions

The Coding Agent must NOT:
- Edit governance or backlog documents
- Change scope, AC, or story status
- Introduce new architecture, dependencies, or patterns not in `Architecture.md`
- Modify files outside a story's Allowed Scope
- Add dependencies not listed in `Architecture.md` Tech Stack
- Add npm runtime dependencies (production artifact is a single HTML file with no node_modules)
- Modify build pipeline (`scripts/build.js`) without explicit story permission

If such changes are required, the Coding Agent must stop and request a
Backlog Update or Architecture Proposal.

---

## 2.4 Session Continuity Protocol

Context windows close. Agent memory bridges the gap.

### How Memory Works

Claude Code **automatically injects** `MEMORY.md` into the system prompt at the start of
every conversation. This is a platform feature — the agent does not need to read or load it
manually. It is always present in context from the first message.

**Key constraints**:
- Only the **first 200 lines** of `MEMORY.md` are loaded. Lines beyond 200 are silently
  truncated. This is a hard platform limit — keep the file concise.
- Memory is **local to this machine**. It lives in `.claude/` outside the git repo and is
  not committed, shared, or synced. If you work from a different machine, memory is empty.
- Memory is a **guide, not gospel**. Git log + test results are the ground truth. Memory
  helps the agent know where to look, not what to believe.

### Memory Directory

```
.claude/projects/-Users-Wim-Webview-energy-dashboard/memory/
├── MEMORY.md          # Auto-loaded into system prompt (max 200 lines)
├── patterns.md        # Coding patterns, gotchas, lessons learned
├── design.md          # Design tokens, UI decisions, rejection log
└── {topic}.md         # Additional topic files as needed
```

### MEMORY.md — What Goes In (max 200 lines)

Keep this file a concise index of current state. It must contain:

1. **Current State**: What phase the project is in, what's actively being worked on
2. **Key Facts**: Important discoveries, API capabilities, architecture decisions —
   things a new session needs immediately to avoid repeating work
3. **Backlog Status**: Which stories are done/in-progress/blocked
4. **Resume Checklist**: Exact commands to reconstruct state in next session
5. **Links to Topic Files**: Pointers to `patterns.md`, `design.md`, etc. for details

**Do NOT put in MEMORY.md**: session-by-session logs, full research transcripts,
verbose explanations, or anything that belongs in a topic file.

### Topic Files — When to Split

Create a separate topic file (linked from MEMORY.md) when:
- A topic exceeds 10-15 lines of detail (e.g., API endpoint inventory, debug notes)
- Information is reference material read on-demand, not needed every session
- Patterns/lessons accumulate over time (e.g., `patterns.md`)

Topic files are **not auto-loaded**. The agent must explicitly read them when relevant.

### Governance Agent: End-of-Session Duties

Before ending a session, the Governance Agent **must** update `MEMORY.md` with:
1. **Active Work**: Stories in_progress, which agents were dispatched, expected outcomes
2. **Completed Work**: Stories done this session, test results, commits made
3. **Key Decisions**: Scope changes, cancellations, priority shifts, blockers discovered
4. **Resume Checklist**: Exact commands to reconstruct state in next session

If MEMORY.md approaches 200 lines, move detail into topic files and replace with links.

### Context Window Pressure — Mandatory Memory Write

When the context window exceeds **90% capacity** (indicated by automatic message
compression or a system warning), the agent **must immediately** write current state
to `MEMORY.md` before continuing work. This is a hard rule — do not wait for session
end.

The write must include:
1. Everything from "End-of-Session Duties" above (active work, completed work, decisions, resume checklist)
2. Any in-flight agent IDs that can be resumed
3. Enough context for a fresh session to continue seamlessly

**Rationale**: Context compression loses narrative detail. Writing to memory before
compression ensures continuity even if the session is interrupted or compacted.

### Governance Agent: Start-of-Session Protocol

When starting a new session:
1. `MEMORY.md` is already in context — read it for orientation
2. Run the Resume Checklist commands (typically: `git log`, test suite, check story status)
3. Reconcile: if Coding Agents completed after last session closed, their work shows in
   git log and test results but not in MEMORY.md — update accordingly
4. Update story statuses based on ground truth (code + tests), not memory alone

### Coding Agent: Reporting

When a Coding Agent completes work (in a subagent), its results are returned to the
Governance Agent within the same session. If the session closes before results arrive:
- Work persists in git (if committed) and on filesystem
- Next Governance session reconstructs state via git log + test suite
- No data is lost, only the narrative context

### Agent Coordination Rules

When dispatching multiple Coding Agents in parallel on related stories:
- Warn each agent about shared files that may be created/modified concurrently
- Agents must **check before creating** shared files (e.g., barrel exports, route configs)
- Agents must **read before editing** shared files
- Expect minor merge conflicts in shared files — Governance resolves after completion

---

## 3. Required Response Modes

Every response must declare **exactly one** mode:

- Analysis — reasoning only
- Task Contract — intake confirmation before coding
- Code Change — implementation only
- Architecture Proposal — ADR, no code
- Backlog Update — story or backlog edits
- Blocked — refusal (mandatory grammar)

---

## 4. Context Loading Rules (Strict)

Before coding, the Coding Agent **must** load (in this order):

### Mandatory (Load First)
1. `CLAUDE.md` — This file (operating manual)
2. `SKILL.md` — Security skill (always apply)
3. `Architecture.md` — Full document, especially:
   - Tech Stack
   - Directory Structure
   - Key Components
   - Development Patterns
   - Testing Strategy
4. `docs/FE_design.md` — Required for ALL presentation stories (any story with `<design_intent>`). Contains the authoritative color system, typography, spacing, component designs, and interaction specifications.
5. Exactly one story file from `docs/stories/` (e.g., `docs/stories/phase-1-foundation.md`)

### Forbidden
- Loading multiple stories simultaneously (load only the one being implemented)
- Unrelated modules not in story's Allowed Scope
- Guessing file structures or API contracts
- Making assumptions about undocumented behavior

If required context is missing or ambiguous, the agent is Blocked.

---

## 5. Definition of Ready (Pre-Flight Check)

Before the Coding Agent may begin ANY story, ALL conditions must be true:

### Story Requirements
- [ ] Story status is **pending** or explicitly assigned
- [ ] Story has explicit Acceptance Criteria
- [ ] Story has a Test Plan
- [ ] Story has Dependencies listed (or "None")

### TDD Requirements (for TDD-mandated stories)
- [ ] Story has "Test-First Requirements" section
- [ ] Test fixtures or mocks identified
- [ ] Expected behavior documented (where applicable)
- [ ] Mock strategy defined (for external dependencies)

### Agent Requirements
- [ ] Agent has loaded `CLAUDE.md` (this file)
- [ ] Agent has loaded `SKILL.md` (security skill)
- [ ] Agent has loaded **full** `Architecture.md`
- [ ] Agent has loaded the **single** story file being implemented
- [ ] Agent has NOT loaded other stories

### Architecture Verification
- [ ] Tech stack matches Architecture.md Tech Stack section
- [ ] Directory structure matches Architecture.md Directory Structure section
- [ ] Patterns match Architecture.md Development Patterns section

### Design Verification
- [ ] `docs/FE_design.md` loaded for stories with `<design_intent>` element
- [ ] Color tokens referenced by CSS custom property names from FE_design.md (e.g., `--solar`, `--grid-import`)
- [ ] Typography follows FE_design.md type scale (data font for numbers, body font for labels)
- [ ] Component layout matches FE_design.md component specification

### Domain Verification
- [ ] Sign conventions documented for any energy flow logic (P1 positive=import, Sungrow battery positive=charge)
- [ ] API endpoint contracts referenced from Architecture.md (not guessed)
- [ ] Production HTML size impact estimated (must stay under 200 KB)

If ANY condition is false, the agent is Blocked. Do not proceed.

---

## 6. Task Intake Gate (No Exceptions)

No code may be written until a **Task Contract** has been produced and validated.

### Minimum Required Intake
- Story ID (e.g., STORY-001)
- Story file path (e.g., `docs/stories/phase-1-foundation.md`)
- Acceptance Criteria (explicit checklist from story)
- Test Plan (from story)
- Allowed Scope (files/modules to be created or modified)
- Architecture sections consulted (list specific sections)

Missing information means the agent is Blocked.

---

## 7. Task Contract (Required Format)

### Task Contract Template
```
Task Contract

- Story ID: [e.g., STORY-001]
- Story file: [e.g., docs/stories/phase-1-foundation.md]
- Goal (1 sentence): [What this story accomplishes]
- Acceptance Criteria:
  - [ ] AC1: ...
  - [ ] AC2: ...
- Test Plan: [How to verify]
- Intended changes (files/modules):
  - [file1]
  - [file2]
- Out of scope: [What will NOT be changed]
- Architecture consulted:
  - Tech Stack
  - Directory Structure
  - [other relevant sections]
- Stop conditions (what forces escalation):
  - [e.g., "If new dependency needed"]
  - [e.g., "If production HTML exceeds 200 KB"]
```

---

## 8. Architecture Change Gate

Any change affecting:
- System structure or layer boundaries
- Data flow between layers
- Dependencies (adding new packages)
- Directory conventions
- API contracts or polling intervals
- URL parameter schema
- Sign conventions for energy flow values
- CDN dependencies (e.g., Chart.js version)

requires:
1. Architecture Proposal
2. Update to `Architecture.md`
3. Explicit approval from Governance Agent before implementation

The Coding Agent must STOP and escalate. Do not proceed with unapproved changes.

---

## 9. Refusal Requirement & Grammar

When blocking, the agent **must** use this exact format:

### Refusal Grammar
```
Blocked

Reason: [One of the defined reasons below]
Missing: [What is needed to proceed]
Action: [What must happen to unblock]
```

### Valid Block Reasons
- `story_not_ready` — Story missing AC, Test Plan, or Dependencies
- `context_not_loaded` — Required documents not loaded
- `scope_violation` — Request exceeds story's Allowed Scope
- `architecture_change` — Change requires ADR approval
- `ambiguous_requirement` — Story or Architecture unclear
- `dependency_not_approved` — New package not in Architecture.md Tech Stack
- `security_vulnerability` — Code introduces a security flaw
- `unvalidated_input` — External input not properly validated
- `secrets_exposed` — Credentials, API keys, or tokens in code
- `sign_convention_violation` — Energy flow direction does not match documented sign convention
- `payload_exceeded` — Change would push production HTML over 200 KB limit
- `design_violation` — Visual output violates docs/FE_design.md specifications (colors, typography, layout, component anatomy)

Free-form refusals are NOT allowed. Use the grammar above.

---

## 10. Definition of Done (Enforced)

Work is Done only when:
- [ ] All Acceptance Criteria are satisfied
- [ ] Tests executed per Test Plan
- [ ] No undocumented TODOs introduced
- [ ] Changelog header added to all modified source files
- [ ] Code passes linting (zero warnings)
- [ ] Code passes formatting check
- [ ] All tests pass with no failures
- [ ] Documentation on all public APIs
- [ ] Security checklist passed (per Section 13)
- [ ] Story status updated by Governance Agent
- [ ] Production build succeeds and output is under 200 KB
- [ ] Sign conventions verified for any energy flow logic
- [ ] Visual output matches docs/FE_design.md for presentation stories
- [ ] Accessibility: prefers-reduced-motion respected, WCAG AA contrast, minimum 44x44px touch targets

## 10b. Governance agent after scoped task execution.
The governance agent asks user to /clear context when all parallel tasks launched by the governance agents are marked done.
---

## 11. Code File Documentation Standard

All source files must include a header:

```javascript
/**
 * Module description.
 *
 * CHANGELOG:
 * - YYYY-MM-DD: Description (STORY-XXX)
 *
 * TODO:
 * - Outstanding items
 */
```

### Rules
- CHANGELOG entry required for every meaningful change
- Include story ID in each entry
- Most recent entry at top
- Remove completed TODOs after next sprint

---

## 12. Test-Driven Development (TDD) Mandate

### TDD Classification

| Category | TDD Mandate | Test Strategy |
|----------|-------------|---------------|
| URL Parameter Parsing | **Required** | Unit tests, edge cases for malformed input |
| API Clients (P1, Sungrow) | **Required** | Mock-first, contract tests against expected JSON schemas |
| Data Transformers | **Required** | Unit tests, sign convention validation |
| Energy Flow Calculations | **Required** | Unit tests, property-based (conservation of energy) |
| Chart Configuration | Recommended | Snapshot tests for config objects |
| DOM Rendering | Recommended | JSDOM-based component tests |
| Mock Data Generators | Recommended | Unit tests |
| Utility Functions | Recommended | Unit tests |
| CSS / Theming | N/A | Visual (manual) |
| Documentation | N/A | - |

### TDD Without Manual Inspection

**CONSTRAINT**: Tests MUST NOT require manual interaction or visual inspection.

**Allowed Test Strategies**:
1. **Schema validation**: Output conforms to expected types and constraints
2. **Sanity checks**: Values in reasonable ranges
3. **Snapshot testing**: Auto-captured, reviewed once
4. **Mock-based**: Mock external dependencies (fetch, DOM)
5. **Property-based**: Mathematical/logical properties hold (e.g., energy balance)

### TDD Workflow (Red-Green-Refactor)

1. **RED**: Write failing test first
   - Create test file before implementation file
   - Tests verify expected behavior against mocks
   - All tests must fail initially

2. **GREEN**: Write minimal code to pass
   - Only write enough code to make tests pass
   - No premature optimization

3. **REFACTOR**: Clean up while keeping tests green
   - Improve code quality
   - Tests must remain passing

---

## 13. Security Directives (Mandatory)

**Skill**: Security Guidelines (installed at `SKILL.md`)

The `SKILL.md` file contains security guidelines. It is **automatically loaded** and must be followed for all code changes.

All code must be written from a **security-first perspective**.

### 13.1 Security Review Checklist (Per Code Change)

Before any code is merged, verify:

- [ ] No hardcoded IP addresses, API URLs, or credentials
- [ ] No Secret Key Exposure (no API keys, tokens, or secrets in code or assets)
- [ ] No Path Traversal (validate and sanitize file paths)
- [ ] No Insecure Network Requests (HTTPS required for external APIs)
- [ ] No unvalidated user input used in network requests or queries
- [ ] No sensitive data logged in production
- [ ] No insecure data storage (sensitive data encrypted at rest)

### 13.2 Web-Specific Security

- [ ] No XSS vectors (sanitize all user-facing output)
- [ ] No inline event handlers (use addEventListener)
- [ ] Content Security Policy compatible
- [ ] URL parameter values must be validated (type, format, allowlist for known params)

### 13.3 Input Validation (Hard Rules)

All external input must be validated:

| Input Source | Validation Required |
|--------------|---------------------|
| API JSON responses (P1, Sungrow) | Schema validation, type checking, null safety |
| URL parameters (tokens, IDs, theme) | Type, format, allowlist for known params |
| Chart.js CDN resource | Subresource integrity hash |
| WebView postMessage events | Origin validation, type checking |
| Timer/interval callbacks | Stale data detection, error boundaries |

### 13.4 Security in Definition of Done

Work is NOT Done if:
- Any item in Security Checklist fails
- Security tests not included for sensitive operations
- Input validation missing for external data
- Hardcoded secrets or URLs found in code

---

## 14. Development Commands

```bash
# Lint (required before commit — zero warnings)
npx eslint src/

# Format (required before commit)
npx prettier --check .

# Test (all tests must pass)
npx jest

# Test with coverage
npx jest --coverage

# Build (inlines CSS+JS into single HTML — verify output < 200 KB)
node scripts/build.js

# Clean
rm -rf dist/ coverage/
```

---

## 15. Project-Specific Rules

### Hard Constraints

### HC-001: Single-File Delivery
**Constraint**: Production artifact must be a single self-contained HTML file (< 200 KB)
**Rationale**: Loaded in Flutter WebView, no server to serve multiple files
**Implications**:
- All CSS and JS must be inlined during build
- Separate files during development are fine (src/ directory)
- Build step (`node scripts/build.js`) produces the final `dist/dashboard.html`
**Allowed**: Chart.js via CDN, separate files during dev
**Forbidden**: npm runtime dependencies, build frameworks (webpack, vite), multiple HTML files in production

### HC-002: Secure Credential Delivery
**Constraint**: Bearer tokens must be delivered via WebView bridge (postMessage), not URL parameters. Base URLs and device IDs may use URL parameters. If tokens appear in URL (dev/test fallback), they must be immediately scrubbed via `history.replaceState`.
**Rationale**: URL parameters leak into browser history, server logs, crash reports, and Referer headers.
**Implications**:
- Dashboard waits for bootstrap postMessage with tokens before making API calls
- Any tokens in URL params are scrubbed immediately after parsing
- Tokens stored in JS memory only — never persisted
- Mock mode must work without real credentials
**Allowed**: URL parameters for non-sensitive config (base URLs, device IDs, mock). WebView bridge for tokens. Dev/test URL token fallback with immediate scrubbing.
**Forbidden**: Hardcoded Bearer tokens in source code. Tokens remaining in URL bar after load. Tokens in localStorage/sessionStorage/cookies. Logging tokens to console.

### HC-003: Graceful Degradation
**Constraint**: Dashboard must never show a blank screen
**Rationale**: Energy monitoring is a daily-use tool; stale data is better than no data
**Implications**:
- Every API call must have error handling with fallback UI
- Cached last-known values displayed with staleness indicator
- Mock data available as ultimate fallback
**Allowed**: Cached last-known values with staleness indicator, mock data fallback
**Forbidden**: Blank screens, unhandled errors that crash the UI

### HC-004: Dark Mode Only
**Constraint**: The dashboard is dark mode only. No light theme is supported.
**Rationale**: This is an always-on monitoring tool. Dark backgrounds reduce eye strain and make colored energy flows pop. Design direction: "Calm Control Room" (per FE_design.md).
**Implications**:
- CSS custom properties define one theme only (dark)
- No theme toggle UI, no theme URL parameter processing
- All colors optimized for dark backgrounds
**Allowed**: CSS custom properties for token consistency, dark background variations (base, surface, elevated)
**Forbidden**: Light mode implementation, theme switching logic, white/light backgrounds

### Domain-Specific Rules

- All API communication must be over HTTPS
- Poll rates must match the specified intervals (5s realtime, 60s balance, 5min timeline)
- Sign conventions must be respected (P1 positive=import, Sungrow battery positive=charge)
- Mock mode must be toggleable via `&mock=true` URL parameter
- Both P1 and Sungrow APIs use Bearer token authentication delivered via WebView bridge (or URL fallback with immediate scrubbing)
- Energy values must be displayed with correct units (W, kW, kWh) and appropriate precision
- All colors must use CSS custom property tokens defined in docs/FE_design.md (e.g., `--solar`, `--grid-import`, `--bg-base`)
- Typography must follow FE_design.md type scale (tabular-lining mono font for numbers, humanist sans for labels)
- Spacing must follow 8px base grid (4, 8, 12, 16, 24, 32, 48, 64)
- Animations must respect `prefers-reduced-motion` media query
- Touch targets must be minimum 44x44px on mobile
- Number value transitions must animate (~400ms ease-out), never snap
