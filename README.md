# CP Companion

A local-first Chrome extension for competitive programmers. It sits in the **side panel** while you solve on Codeforces or LeetCode, so you can track problems, record why attempts failed, keep private notes, and back up that learning data. Platforms stay the source of truth for statements and submissions; this extension stores your context.

Personal notes and history stay in the browser (IndexedDB). There is no account and no backend.

## Requirements

- Google Chrome 114 or newer (side panel API)
- Node.js 20+ only if you want to build from source

## Install (unpacked)

1. Build the extension (or use an already-built `dist/` folder):

   ```bash
   npm install
   npm run build
   ```

2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the `dist` folder in this project.
5. Pin **CP Companion** from the puzzle-piece menu.
6. Click the toolbar icon. Chrome opens the side panel. Leave it open while you browse problems.

Reload the unpacked extension from `chrome://extensions` after you run `npm run build` again.

## Use

### 1. Set your Codeforces handle

Open **Settings**, type your handle, and click **Save and validate**. The extension calls the public `user.info` API. The handle is never scraped from a problem page.

### 2. Track the current problem

Open a supported URL, then use the **Current** view:

- Codeforces contest: `https://codeforces.com/contest/<id>/problem/<index>`
- Codeforces problemset: `https://codeforces.com/problemset/problem/<id>/<index>`
- Codeforces gym: `https://codeforces.com/gym/<id>/problem/<index>` (indexes such as `A1` work)
- LeetCode: `https://leetcode.com/problems/<slug>/` and contest-prefixed problem URLs

On an unsupported page the panel says so instead of guessing. Click **Track this problem** to keep a local reference. Tracking does not copy the problem statement.

### 3. Import Codeforces submissions

Click **Sync Codeforces**, or just open the panel / a Codeforces problem page. Sync is incremental, deduplicates by submission ID, and updates a verdict if it changes (for example `TESTING` → `OK`). It respects the API rate limit (one call per two seconds) and does not fetch source code.

Imported failures start **unclassified**. Confirm a cause yourself; a Wrong Answer verdict is never treated as proof of an edge-case bug.

LeetCode history import is not enabled. Record those attempts manually. Public LeetCode titles/difficulty may still load when you open a problem.

### 4. Notes, classification, and reviews

- Add private notes on the current problem.
- Classify failed attempts: algorithm, implementation, complexity, edge case, misread, or other.
- **Tracked** lists tracked problems and items that still need classification.
- **Review** uses a fixed ladder of 1, 3, 7, 14, 30, 60 days. Use **Add to review** on a tracked problem, then record Independent / Hint / Failed.

### 5. Backup and restore

In **Settings**, **Export JSON** downloads your data. **Import JSON** merges by record ID and by `(platform, submission id)`, so repeating an import should not duplicate platform submissions.

## Develop

```bash
npm install
npm test
npm run dev      # Vite + unpacked reload via CRXJS
npm run build
```

Load `dist` unpacked as described above. Unit tests cover URL parsing, verdict mapping, platform-field upserts, the review ladder, and export/import.

## Permissions

| Permission | Why |
|---|---|
| `sidePanel` | Show the companion next to the problem page |
| `storage` | Save your Codeforces handle and preferences |
| `codeforces.com` | Official submission/user API and problem URLs |
| `leetcode.com` | Detect problem pages and optional public metadata |

The extension does not request `tabs`, `cookies`, or `<all_urls>`. It does not read session cookies or store submission source.

## Privacy

No personal data is sent to a CP Companion server (there isn’t one). Codeforces requests use only the handle you enter. You can delete the extension to remove local data, or export first if you want a copy.

Site integrations can break when Codeforces or LeetCode change. Manual tracking and existing notes keep working if a sync fails.

## Docs

- Product scope: [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)
- Design and data model: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
