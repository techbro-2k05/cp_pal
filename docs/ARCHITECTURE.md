# CP Companion — Architecture

**Status:** Draft v0.2 — conflicts with REQUIREMENTS.md resolved; items marked *provisional* need validation
**Last updated:** 2026-10-19
**Related document:** `REQUIREMENTS.md` (the *what* and *why*)

> **Notes sections** (blockquotes starting with "Note") explain the underlying concept. They are for learning and can be deleted before release.

## 1. Architecture goals

- Keep platform-specific logic replaceable.
- Avoid duplicating platform-owned problem catalogues.
- Preserve user-authored learning data independently of external API availability.
- Make imports idempotent and incremental.
- Keep the initial release small enough to validate before adding sync, AI, or a backend.

## 2. Stack

| Concern | Decision | Rationale |
|---|---|---|
| Platform | Chrome Extension, Manifest V3, Chrome 114+ | Side panel API requires 114+ |
| Language | TypeScript | Shared types across worker and UI |
| UI | React, in a **side panel** (tracked list is a second view) | One surface for v0; components in `ui/components` move to a dashboard page later |
| Scaffold | Vite + React + TypeScript (WXT is a Vite-based alternative if MV3 wiring becomes a time sink) | Fast iteration |
| Persistence | IndexedDB via **Dexie**; `chrome.storage.local` for preferences | Versioned migrations, live queries |
| Validation | **Zod** schemas in `shared/schemas.ts` | One definition is type, validator and documentation |
| Tests | Vitest, `fake-indexeddb`, saved JSON fixtures | Fast, no browser needed for most logic |
| Backend | None in MVP | Privacy and scope |

## 3. Component boundaries

### UI (side panel)

- Renders the current problem, attempt history, notes, tracked list, and (P1) review queue.
- **Reads and writes IndexedDB directly** through repository modules.
- Sends messages to the service worker only for commands that need it (`SYNC_NOW`).
- Never calls platform endpoints directly from React components.

> **Note: shared origin.** The side panel, future dashboard and service worker are all pages of `chrome-extension://<id>`, so they share one IndexedDB. Routing every read through the worker adds message types to validate and wakes the worker needlessly. With Dexie, `useLiveQuery` re-renders the UI automatically when the worker writes during a sync.

### Tab context (no content script in P0)

- The side panel reads the active tab with `chrome.tabs.query` and listens to `tabs.onActivated` / `tabs.onUpdated` while open. Host permissions make `tab.url` readable; the `tabs` permission is not needed.
- It calls the pure function `parseProblemUrl(url): ProblemReference | null`.
- The service worker also listens to `tabs.onUpdated` to trigger debounced sync on supported-page visits.

> **Note: SPAs and navigation.** LeetCode is a single-page app. Moving between problems changes the URL via `history.pushState` without a page load, so a content script that runs once at load misses it. Tab events fire for these changes. Add a content script only when DOM reading is required (the LeetCode proof of concept), and keep it narrowly matched.

`parseProblemUrl` is **synchronous and does no network I/O**, so it is trivially unit-testable. It must handle Codeforces `/contest/<id>/problem/<index>`, `/problemset/problem/<id>/<index>`, `/gym/<id>/problem/<index>`, indexes like `A1`, and LeetCode `/problems/<slug>/…` including contest-prefixed URLs.

### Service worker

- Registers all listeners synchronously at top level.
- Handles: `SYNC_NOW`, tab-visit sync trigger, (later) `chrome.alarms` and notifications.
- Validates incoming messages against Zod schemas; never fetches arbitrary URLs from message payloads.
- Is treated as ephemeral: persist state, never rely on in-memory variables, never keep long tasks alive.

### Platform adapters

```ts
type AdapterErrorCode =
  | 'UNAUTHENTICATED' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'HTTP_ERROR'
  | 'PLATFORM_ERROR' | 'PARSE_ERROR' | 'UNSUPPORTED' | 'NOT_FOUND';

type AdapterError = { code: AdapterErrorCode; message: string };
type Result<T> = { ok: true; data: T } | { ok: false; error: AdapterError };

interface PlatformAdapter {
  capabilities: { syncSubmissions: boolean; fetchMetadata: boolean };
  fetchProblemMetadata?(ref: ProblemReference): Promise<Result<PlatformProblemMetadata>>;
  fetchRecentSubmissions?(opts: SyncOptions): Promise<Result<NormalizedSubmissionPage>>;
}
```

`capabilities` lets the UI hide Sync for a platform until it works, instead of probing optional methods. URL parsing lives outside the adapter (see above). Do not force LeetCode and Codeforces into identical capabilities.

> **Note: why `Result` instead of `null` or exceptions.** `null` cannot distinguish "not found" from "network down". Returning a typed result forces every caller to handle failure, which is how "manual tracking keeps working when an adapter fails" becomes a compile-time property.

> **Note: types are erased at runtime.** A TypeScript `Submission` type does not protect you when Codeforces returns an unexpected shape. Define a Zod schema, infer the type from it, and validate every API response. Validation failure becomes `PARSE_ERROR`.

#### CodeforcesAdapter

- Endpoints: `user.info` (validate handle) and `user.status` (submissions). **Do not call `problemset.problems`**: it returns the whole catalogue, which contradicts ADR-005. Each submission embeds a `problem` object (name, rating, tags) that fills the metadata cache.
- Side effect: tags only appear after your first submission to a problem, which acts as a natural spoiler guard (Codeforces hides tags on purpose).
- Rate limit: at most one call per two seconds; persist `nextAllowedAt` in `syncState`.
- Do not request source code.
- Normalize `contestId`, `problem.index`, `problem.name`, `problem.tags`, submission ID, timestamp (`creationTimeSeconds × 1000`), language, verdict.
- Public data needs no login or API key.

Official references: https://codeforces.com/apiHelp/methods · https://codeforces.com/apiHelp/objects

#### LeetCodeAdapter

- Problem reference: `problemSlug`.
- Use a verified GraphQL query or data already rendered in the page; prove query names and fields in a small experiment. Treat GraphQL as an unstable implementation detail.
- A service-worker `fetch` with `credentials: "include"` may fail (CORS, cookies, server-side checks). Do not assume it works.
- Never read `LEETCODE_SESSION` or other cookies.
- If needed, prefer a narrow content-script path or manual fallback; evaluate security implications before any page-context bridge.
- Return `UNAUTHENTICATED`, `UNSUPPORTED`, `RATE_LIMITED`, `NETWORK_ERROR` or `PARSE_ERROR` as appropriate.
- Test against saved fixtures with personal identifiers and source code removed.
- Keep the adapter easy to disable: undocumented endpoints carry terms-of-service and stability risk.

## 4. Data flow

### Page opened

1. Side panel (or worker) receives the tab URL and calls `parseProblemUrl`.
2. Unsupported URL → "unsupported page" state.
3. Supported → panel looks up the local problem by `(platform, platformKey)`.
4. If found, load notes, attempts and review state; if not, offer **Track**.
5. Tracking sets `status = 'tracked'` (creating the row if needed).

### Submission sync (Codeforces)

1. Trigger: user presses Sync, panel opens, or a supported page is visited. Compare with stored `lastSyncAt` for debounce.
2. Worker calls the adapter, honoring `nextAllowedAt`.
3. Adapter returns normalized, schema-validated submissions.
4. Import service upserts by `(platform, platformSubmissionId)`, updating **platform fields only**. New problems are created with `status = 'seen'`.
5. Cursor and `lastSyncAt` are saved after **each page**.
6. UI updates through live queries.

### Review completion (P1)

1. User opens a due review and records `independent | hint | failed`.
2. Review service computes the next step and due date (pure function).
3. One transaction appends to `reviews` and updates `problems.reviewStep` / `nextReviewAt`.

## 5. Sync algorithm

`user.status` returns submissions **newest first**, supports `from` and `count`, and IDs increase over time.

1. **First sync:** page through, persisting `lastSeenSubmissionId` after each page. Optionally cap the initial import (for example the latest 500) and offer "load older".
2. **Later syncs:** always re-fetch a small first page (for example 50), then continue paging only until reaching a submission already stored with a final verdict.
3. **Upsert** each submission using the platform-fields-only function (§6).
4. **Rate limit:** persist `nextAllowedAt`; if the worker dies, the next trigger resumes.

> **Note: idempotency means "same input, same end state".** Insert-if-absent is not enough: a submission can be `TESTING` when first seen and `OK` later. Re-fetching the first page every time catches these verdict changes, and upsert makes repeats harmless.

> **Note: persisted state beats timers.** MV3 workers are terminated after roughly 30 seconds idle and `setTimeout` does not keep them alive. Treat each sync as "do a few pages, save the cursor, exit". Debounce by comparing a stored `lastSyncAt`, never an in-memory variable.

## 6. Persistence model

IndexedDB via Dexie. Timestamps are epoch milliseconds (numbers). IDs are `crypto.randomUUID()` strings, which also makes later export/import merging safe.

```ts
db.version(1).stores({
  problems:  'id, &[platform+platformKey], status, nextReviewAt',
  attempts:  'id, problemId, occurredAt, &[platform+platformSubmissionId]',
  notes:     'id, problemId, attemptId',
  reviews:   'id, problemId, completedAt',
  syncState: '[platform+handle]',
});
```

### `problems`

- `id`, `platform` (`codeforces | leetcode`), `platformKey`
- `status`: `seen | tracked` (sync creates `seen`; only the user sets `tracked`)
- `titleCache?`, `difficultyCache?`, `topicsCache?`, `metadataFetchedAt?`
- `nextReviewAt?`, `reviewStep?` (P1)
- `createdAt`, `lastSeenAt?`
- **No stored URL.** Derive it from `platform + platformKey` to avoid staleness and page-supplied URL risk.

Canonical keys: Codeforces `contest:<contestId>:<index>` (include `problemsetName` for nonstandard problemsets); LeetCode `slug:<problemSlug>`.

### `attempts`

Platform-owned fields (written by sync):
- `platform` (denormalized from the problem so the unique compound index works), `platformSubmissionId?`
- `occurredAt`, `outcome` (`AC | WA | TLE | MLE | RE | CE | PENDING | OTHER`), `rawVerdict?`, `language?`

User-owned fields (never written by sync):
- `failureCategories[]`, `classifiedAt?`, `durationSeconds?`, `hintUsed?`

Shared: `id`, `problemId`, `source` (`platform | manual`), `createdAt`.

Verdict mapping: Codeforces `OK → AC`, `TESTING → PENDING`, unknown verdicts → `OTHER` (raw string kept).

Enforce ownership in code: all sync writes go through one `upsertPlatformFields()` function, covered by a test that proves user fields survive a re-sync.

> **Note: unclassified vs "Other".** An empty category list is ambiguous. `classifiedAt` records that the user confirmed a classification, so "Needs classification" is a simple query and "Other / unsure" remains a deliberate answer.

> **Note: IndexedDB key rules.** Valid keys are numbers, strings, dates, binary and arrays. `null`, `undefined` and booleans are not valid keys; a record whose indexed field is missing is simply absent from that index. That is why `nextReviewAt` (a number on `problems`) makes "what is due?" a fast range query, `where('nextReviewAt').belowOrEqual(now)`, while "reviews where `completedAt` is null" could not use an index.

> **Note: why the unique index still allows manual attempts.** In a compound index, a record missing any component is skipped. Manual attempts have no `platformSubmissionId`, so they never collide.

### `notes`

`id`, `problemId`, `attemptId?`, `kind` (`approach | failure | insight | complexity | general`), `body`, `createdAt`, `updatedAt`.

### `reviews` (append-only log, P1)

`id`, `problemId`, `scheduledFor`, `completedAt`, `recallResult` (`independent | hint | failed`), `intervalDays`, `createdAt`. Current state lives on `problems`.

### `syncState`

Keyed by `[platform+handle]`: `lastSeenSubmissionId?`, `lastSyncAt?`, `nextAllowedAt?`, `initialImportComplete`.

### Settings

Handles and preferences in `chrome.storage.local`. Never store session cookies or tokens.

## 7. Data ownership rules

- Platform data is external and may be refreshed.
- User notes, classifications and review history are user-owned and never overwritten by sync.
- A platform submission ID is the preferred dedup key; manual attempts are first-class.
- Deleting cached metadata never deletes notes or review history.
- Schema changes use Dexie `version(n).upgrade()` migrations.
- **Known limitation:** a manual attempt may later be duplicated by an imported one. For MVP, use manual entry mainly where import is unavailable (LeetCode).
- **Export/import (P0):** JSON containing all user-owned data plus minimal platform references. Import merges by UUID and by `(platform, platformSubmissionId)`.

## 8. Review scheduling (P1)

Fixed ladder: `[1, 3, 7, 14, 30, 60]` days.

- `independent` → move up one step.
- `hint` → repeat the same step.
- `failed` → back to step 0.

**Queue entry:** first AC after at least one failed attempt, or an explicit "Add to review" button.

This is one pure function, easy to unit-test.

> **Note: spaced repetition.** Reviewing just as you are about to forget strengthens memory most, so intervals grow after successes and shrink after failures. SM-2 (Anki's classic) and FSRS tune intervals per item from review history. They need data to be worthwhile, so start with the ladder; because it is isolated, swapping algorithms later touches nothing else.

## 9. Security, privacy, permissions

- Permissions: `sidePanel`, `storage`, and host permissions for `codeforces.com` and `leetcode.com` only. No `cookies`, no `tabs`, no `<all_urls>`.
- Call `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`; the panel needs a user gesture to open.
- Do not store or log cookies, tokens or full source code.
- Treat page content and API responses as untrusted; validate with Zod.
- Validate runtime messages; no arbitrary URL fetching from message handlers.
- No remote code, no `eval`.
- No personal data sent to third parties.
- Chrome Web Store: each host permission must be justified and a privacy disclosure published. "No data leaves the device" is a strong, simple answer.
- Tell users that integrations can stop working when sites change.

## 10. Failure handling and tests

Adapters return typed `Result` values (codes in §3). Existing notes and manual tracking remain usable when any adapter fails.

### Unit tests

- `parseProblemUrl` (contest, problemset, gym, `A1`-style indexes, LeetCode slugs, unsupported URLs).
- Response normalization and verdict mapping.
- Dedup, upsert, cursor logic, verdict-change update.
- `upsertPlatformFields` never touches user fields.
- Review ladder.
- Migrations and repositories (`fake-indexeddb`).
- Export → import round trip.

### Integration tests

- Codeforces: success, API-level failure, rate limit, empty history, malformed response.
- LeetCode: logged out and logged in, CORS failure, GraphQL errors, shape change.
- Repeated sync does not duplicate attempts.

### Manual browser tests

- Codeforces contest, problemset and gym URLs; LeetCode problem page and in-app navigation between problems.
- Unsupported URLs; logged-out state.
- Extension reload and browser restart with data persistence.

## 11. Architectural decision records

### ADR-001: Local-first, no backend
**Decision:** IndexedDB and `chrome.storage.local` for MVP.
**Reason:** Lower complexity, better privacy.
**Revisit when:** cross-device sync or accounts become a concrete requirement.

### ADR-002: Platform adapters behind a shared boundary
**Decision:** Separate Codeforces and LeetCode integrations from application logic.
**Reason:** Authentication and data availability differ; either integration may need replacement.

### ADR-003: Codeforces official API first
**Decision:** Use `user.info` and `user.status`; do not call `problemset.problems`.
**Reason:** Structured JSON reduces scraping fragility; submissions already embed problem metadata.
**Constraint:** Respect rate limits; no source-code access.

### ADR-004: LeetCode is a proof-of-concept gate
**Decision:** No promise of automatic history sync until verified in a real browser.
**Reason:** Query availability, login state and CORS can change.
**Fallback:** Current-page extraction and manual attempt entry.

### ADR-005: Do not mirror problem catalogues
**Decision:** Store canonical references and small metadata caches only.
**Reason:** Catalogues already exist and are not the differentiator.

### ADR-006: User-confirmed failure causes
**Decision:** Verdicts import as outcomes; reasons are user-entered or confirmed.
**Reason:** A verdict alone cannot identify the underlying mistake.

### ADR-007: Side panel only for v0; dashboard deferred
**Decision:** One UI surface; tracked list is a second panel view; dashboard page is P1.
**Reason:** Two entry points double UI work. Components are reused later.

### ADR-008: Tab events for page detection
**Decision:** Detect problems from `tabs` events with a pure URL parser; add content scripts only for DOM reading.
**Reason:** Handles SPA navigation, removes a component and a message type.

### ADR-009: UI reads IndexedDB directly
**Decision:** UI uses repositories and live queries; worker handles sync, tab-triggered work, alarms.
**Reason:** Shared origin; fewer messages to validate; automatic UI refresh after sync.

### ADR-010: Dexie, Zod and typed Results
**Decision:** Use Dexie for storage and migrations, Zod for runtime validation, `Result<T>` for adapter outcomes.
**Reason:** Types are erased at runtime; failures must be explicit.

### ADR-011: `seen` vs `tracked`
**Decision:** Sync creates `seen` problems; tracking is a deliberate user action.
**Reason:** Accurate attempt counts without cluttering the tracked list.

### ADR-012: Export/import is P0
**Decision:** JSON export/import ships in the first release.
**Reason:** Local-only data has no other backup path.

## 12. Implementation sequence

Single source of truth for build order.

**Saturday**
1. Scaffold Vite + React + TS; configure MV3 manifest, side panel, action-click behavior; verify it loads unpacked.
2. Shared types and Zod schemas; `parseProblemUrl` with tests.
3. Dexie schema and repositories (problems, attempts, notes, syncState).
4. Minimal side panel: current problem, Track button, manual attempt, failure classification, notes.
5. Tracked-problems view.

**Sunday**
6. Codeforces handle onboarding and incremental `user.status` sync with rate limiting, upsert and fixtures.
7. JSON export/import.
8. Review ladder and queue (P1; if time allows).
9. Time-boxed LeetCode proof of concept: metadata first, then submissions logged in and logged out. If it fails, manual entry already works.

**Later**
10. Dashboard page, `chrome.alarms` notifications, topic analytics, broader tests, Web Store prep.

## 13. Project structure

A starting boundary, not a mandate: create only the files needed for the current slice.

```text
cp-companion/
├── public/icons/
├── src/
│   ├── background/
│   │   ├── index.ts              # MV3 worker entry, top-level listeners
│   │   ├── message-router.ts     # validated commands (SYNC_NOW, ...)
│   │   └── sync-coordinator.ts   # trigger, debounce, checkpoints
│   ├── platform/
│   │   ├── types.ts              # adapter contracts, Result, DTOs
│   │   ├── url.ts                # parseProblemUrl (pure)
│   │   ├── codeforces/{adapter.ts, normalize.ts}
│   │   └── leetcode/{adapter.ts, graphql-poc.ts, page-extractor.ts}
│   ├── domain/{problems,attempts,reviews,analytics}/
│   ├── data/{db.ts, repositories/, migrations/, export.ts}
│   ├── ui/{sidepanel/, components/, styles/}   # dashboard/ added in P1
│   ├── shared/{messages.ts, schemas.ts}
│   ├── content/                  # only when the LeetCode PoC needs DOM access
│   └── test/{fixtures/, unit/}
├── manifest.json
├── vite.config.ts
├── tsconfig.json
├── package.json
├── REQUIREMENTS.md
├── ARCHITECTURE.md
└── README.md
```

## 14. Remaining validation items

- LeetCode: which data path works (service worker, content script, or manual only).
- Whether auto-recording failures as unclassified feels right in daily use.
- Initial import cap size for Codeforces (500 is provisional).
- Whether the ladder intervals suit real usage; revisit with FSRS once review history exists.
