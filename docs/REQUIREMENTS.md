# CP Companion — Requirements

**Status:** Draft v0.3 — conflicts with ARCHITECTURE.md resolved
**Last updated:** 2026-10-19
**Purpose:** Define product scope and acceptance criteria (the *what* and *why*).
**Related document:** `ARCHITECTURE.md` (the *how*: stack, data model, build sequence, ADRs)

> **Document ownership rule:** this file owns scope, principles, user journeys and acceptance criteria. `ARCHITECTURE.md` owns design, project structure, build order and decision records. Do not duplicate content between them; link instead.

---

## 1. Product vision

CP Companion is a local-first Chrome extension for competitive programmers. It helps users understand their problem-solving patterns, record why attempts fail, and revisit problems at the right time.

It does not duplicate Codeforces or LeetCode's problem catalogue, editorial content, or submission database. Those platforms remain the source of truth for platform-owned information. CP Companion stores the user's own learning context and the minimum identifiers/history needed to connect it to platform data.

## 2. Target user and core problem

**Target user:** A competitive programmer who practices on Codeforces and LeetCode and wants to improve deliberately, not merely accumulate solved counts.

**Core problem:** Platform verdicts say what happened, but usually do not capture why the user struggled, what they learned, or when they should revisit a problem.

**Input / processing / output (one-line model):**

- **Input:** the current tab's URL, a Codeforces handle typed once, and the user's own actions (track, classify, note, review).
- **Processing:** parse URL into a stable problem key; fetch and normalize submissions through a platform adapter; deduplicate; store locally.
- **Output:** a side panel showing the current problem, its attempt history, private notes, and due reviews.

## 3. Product principles

1. **Learning data first:** Personal notes, failure categories, recall outcomes, and review scheduling are the product's core value.
2. **No unnecessary duplication:** Do not import or maintain a complete local catalogue of platform problems.
3. **Local-first privacy:** Store personal notes and learning history locally by default. No account or remote backend in MVP.
4. **Platform adapters:** Keep Codeforces- and LeetCode-specific logic isolated behind a shared interface.
5. **Graceful degradation:** If a platform API or page structure changes, manual tracking and existing local notes must continue to work.
6. **Transparent inference:** A verdict such as Wrong Answer must not automatically be treated as proof of an edge-case bug. The verdict may be shown next to the category picker but never pre-selects it.
7. **Minimal permissions:** Request only the host permissions and Chrome APIs required for enabled features.
8. **Sync never overwrites user data:** platform refreshes may update platform-owned fields only.

## 4. MVP scope

### P0 — Required for first usable release

- Chrome Manifest V3 extension with a **side panel** as the single UI surface.
- Support Codeforces and LeetCode problem pages.
- Identify a problem using a stable platform key:
  - Codeforces: `platform + contestId + problemIndex` (include `problemsetName` where applicable).
  - LeetCode: `platform + problemSlug`.
- Let the user explicitly **track** a problem without copying its statement or metadata.
- Record attempts and outcomes when reliably available; allow manual entry/editing when extraction is unavailable.
- Let the user classify a failed attempt:
  - Algorithm / approach
  - Implementation bug
  - Complexity / performance
  - Edge case
  - Misread problem / requirements
  - Other / unsure
- Imported failures start as **unclassified** and appear in a "Needs classification" list until the user confirms a category.
- Attach private notes to a problem and, where relevant, a specific attempt.
- Basic tracked-problems list (a second view inside the side panel) and per-problem history.
- Codeforces handle entry (validated against the API) and incremental submission sync.
- **JSON export and import of personal data** (promoted from P1: with no backend, export is the only backup).
- Persist data locally across browser restarts and extension updates.
- Show clear states for unsupported pages, unavailable platform data, and fetch failures.

### P1 — After the core loop works

- Review queue with due dates and recall outcomes (independent / hint / failed).
- Separate dashboard page: attempts, solved problems, recurring failure categories, due reviews.
- Simple topic-level summaries using platform-provided tags when available and user labels otherwise.
- Optional Chrome notifications, disabled by default.

### Explicitly out of scope for MVP

- Full local mirror of either platform's problem database (this includes the Codeforces `problemset.problems` endpoint).
- Storing submitted source code by default.
- Automatically inferring the true cause of any failed submission.
- AI-generated analysis or cloud LLM calls.
- User accounts, cloud sync, social features, leaderboards, or a hosted backend.
- Submitting code or acting on the user's behalf.
- Circumventing platform authentication, access controls, rate limits, or anti-bot mechanisms.

## 5. Integration requirements

### Codeforces

- Use the official Codeforces API for supported public data.
- First run: the user types their handle (validated with `user.info`). Current-page detection supplies **problem context** independently of the handle; the handle is *not* scraped from the page.
- Fetch submissions incrementally; never repeatedly download full history unnecessarily.
- Normalize submission IDs, timestamps, problem identity, language, verdict, and problem tags (taken from the submission's embedded `problem` object).
- Respect the documented rate limit (at most one call per two seconds) and handle API-level error responses.
- Do not assume the public API provides source code.

Official API reference: https://codeforces.com/apiHelp/methods

### LeetCode

- Test available data paths before promising automatic history import (proof-of-concept gate).
- Prefer structured GraphQL/page data when accessible and permitted; treat undocumented endpoints as unstable.
- Distinguish public problem metadata from authenticated submission history.
- Do not assume a service-worker request can reuse login cookies: credential behavior, CORS, server validation and query requirements must be tested.
- Do not read or store session cookies/tokens.
- If automatic extraction is unavailable, provide a content-script extraction path where appropriate, and manual attempt entry as the required fallback.
- Keep the integration behind an adapter that can be disabled without affecting the data model or UI.

## 6. Data ownership and persistence

### Platform-owned data

Examples: problem title, difficulty, tags, submission verdict, submission timestamp, submission ID.

- Fetch from the platform when available.
- Store only a minimal cache or snapshot when needed for responsiveness, deduplication, or historical continuity.
- Keep provenance and last-fetched time if cached.

### CP Companion-owned data

Examples: failure category, private notes, time spent, hint usage, review outcome, due date, tracked status.

- Persist locally.
- Never overwrite user-authored data from a platform refresh.
- Allow export and deletion.

## 7. Core user journeys

1. **Track a problem:** Open a supported problem → panel shows it → user taps Track → local reference saved.
2. **Record a failed attempt:** Import a verdict or add an attempt manually → user selects a failure category → optional note saved.
3. **Review a problem** *(P1)*: Open due queue → revisit problem → record recall result → next review date updates.
4. **Inspect progress:** View tracked problems, attempt history, and recurring failure categories.
5. **Back up / restore:** Export JSON → later import into a fresh install without duplicates.

## 8. Non-functional requirements

- TypeScript for shared models and integration boundaries; runtime schemas validate external data.
- Local data survives browser restarts and extension updates (versioned schema migrations).
- Platform network failures must not block notes or manual tracking.
- Imports are idempotent: repeated syncs produce the same end state, including verdict changes (e.g. testing → accepted).
- No secrets or session cookies in logs or storage.
- Narrow permissions, each justified.
- Unit-test normalization, deduplication, URL parsing, scheduling, export/import and failure classification.
- Test integration failure cases: logged out, rate-limited, malformed response, changed page markup, network unavailable.

## 9. MVP acceptance criteria

- The extension loads as an unpacked Manifest V3 extension and opens the side panel on toolbar click.
- It recognizes supported Codeforces and LeetCode problem URLs (including contest, problemset, gym, and indexes like `A1`) and ignores others with a clear "unsupported page" state.
- A user can track a problem and add/edit/delete personal notes.
- A user can record an attempt manually even when platform extraction fails.
- Imported Codeforces submissions are not duplicated on repeated sync, and a changed verdict updates the existing attempt.
- Sync never modifies notes, failure categories, or other user-owned fields.
- Failure categories are user-confirmed; imported failures show as unclassified.
- All personal data remains after Chrome restarts; export followed by import on a clean profile restores it.
- Codeforces API errors and LeetCode authentication/data-access failures appear as recoverable states.
- The codebase contains no hard-coded personal handle, cookie, or token.

## 10. Open questions (resolve through experiments)

1. Which LeetCode queries and fields are accessible from the extension using the signed-in session?
2. Can LeetCode submission history be extracted from the already-open page without broad cookie permissions?
3. Should failed submissions be auto-recorded as platform events (current default: yes, as *unclassified*; the user confirms the reason)?

### Resolved

| Question | Resolution |
|---|---|
| UI priority | Side panel only for v0; dashboard page is P1 |
| Codeforces onboarding | Handle typed by user; URL detection for problem context |
| Sync trigger | Panel open and supported page visit, debounced, incremental, rate-limited |
| Review algorithm | Fixed ladder `[1, 3, 7, 14, 30, 60]` days (see ARCHITECTURE §8) |
| Review queue entry | First AC after at least one failed attempt, or an explicit "Add to review" button |
| Scaffold / storage / backend | Vite + React + TS; IndexedDB (Dexie) + `chrome.storage.local`; none |

## 11. Security and platform constraints

- Permissions: `sidePanel`, `storage`, plus host permissions scoped to Codeforces and LeetCode. No `<all_urls>`, no `cookies`. The `tabs` permission is not needed: host permissions already make `tab.url` readable for those origins. Add `alarms`/`notifications` only when those features ship.
- Codeforces calls respect the documented rate limit and API-level errors; sync is incremental and deduplicates by submission ID. Source code is not fetched or retained.
- LeetCode GraphQL is not assumed stable or officially supported; verify in a browser proof of concept.
- A service worker is ephemeral: register listeners synchronously at top level, persist state, use `chrome.alarms` for future scheduled work.
- The side panel requires the `sidePanel` permission and a deliberate way to open it; target Chrome 114+.
- No remote code, no `eval`; follow Manifest V3 CSP.
- Treat page content, messages and API responses as untrusted. Validate message schemas; restrict fetches to known platform origins.
- Platform integrations can break; provide typed errors and manual fallbacks.

## 12. Decision log

Decisions and their rationale are recorded once, as ADRs in `ARCHITECTURE.md` §11. Summary:

| ADR | Decision |
|---|---|
| 001 | Local-first, no backend |
| 002 | Platform adapters behind a shared boundary |
| 003 | Codeforces official API first |
| 004 | LeetCode is a proof-of-concept gate |
| 005 | Do not mirror problem catalogues |
| 006 | User-confirmed failure causes |
| 007 | Side panel only for v0; dashboard deferred |
| 008 | URL detection from tab events; content script only when DOM access is needed |
| 009 | UI reads IndexedDB directly; worker handles background work only |
| 010 | Dexie, Zod and typed `Result` outcomes |
| 011 | `seen` vs `tracked` problem status |
| 012 | Export/import is P0 |
