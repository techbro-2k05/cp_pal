import { codeforcesAdapter } from '../platform/codeforces/adapter';
import { leetcodeAdapter } from '../platform/leetcode/adapter';
import type { ProblemReference } from '../shared/schemas';
import { getSettings, setSettings } from '../shared/settings';
import {
  hasStoredFinalSubmission,
  problemHasFailedAttempt,
  upsertPlatformFields,
} from '../data/repositories/attempts';
import { enqueueReview } from '../data/repositories/reviews';
import { getSyncState, putSyncState } from '../data/repositories/syncState';
import { upsertSeenProblem } from '../data/repositories/problems';

const PAGE_SIZE = 50;
const INITIAL_IMPORT_CAP = 500;
const AUTO_SYNC_DEBOUNCE_MS = 60_000;
const RATE_LIMIT_MS = 2_000;
const MAX_PAGES_PER_RUN = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SyncReport = {
  imported: number;
  pages: number;
  error?: { code: string; message: string };
  skipped?: string;
};

export async function syncCodeforces(force: boolean): Promise<SyncReport> {
  const settings = await getSettings();
  const handle = settings.codeforcesHandle;
  if (!handle) {
    return { imported: 0, pages: 0, skipped: 'Set a Codeforces handle in Settings first.' };
  }

  let state = (await getSyncState('codeforces', handle)) ?? {
    platform: 'codeforces' as const,
    handle,
    initialImportComplete: false,
  };

  const now = Date.now();
  if (!force && state.lastSyncAt && now - state.lastSyncAt < AUTO_SYNC_DEBOUNCE_MS) {
    return { imported: 0, pages: 0, skipped: 'Recently synced.' };
  }
  if (state.nextAllowedAt && now < state.nextAllowedAt) {
    return {
      imported: 0,
      pages: 0,
      error: { code: 'RATE_LIMITED', message: 'Codeforces allows at most one request every two seconds.' },
    };
  }

  let imported = 0;
  let pages = 0;
  let from = 1;
  let reachedKnownFinal = false;

  while (pages < MAX_PAGES_PER_RUN) {
    if (pages > 0) {
      await sleep(RATE_LIMIT_MS);
    }
    state = {
      ...state,
      nextAllowedAt: Date.now() + RATE_LIMIT_MS,
    };
    await putSyncState(state);

    const page = await codeforcesAdapter.fetchRecentSubmissions?.({
      handle,
      from,
      count: PAGE_SIZE,
    });
    if (!page || !page.ok) {
      return {
        imported,
        pages,
        error: page?.error ?? { code: 'UNSUPPORTED', message: 'Codeforces adapter unavailable.' },
      };
    }

    for (const submission of page.data.submissions) {
      if (
        state.initialImportComplete &&
        (await hasStoredFinalSubmission('codeforces', submission.platformSubmissionId))
      ) {
        reachedKnownFinal = true;
      }
      const problem = await upsertSeenProblem(submission.ref, {
        titleCache: submission.title,
        difficultyCache: submission.difficulty,
        topicsCache: submission.topics,
        metadataFetchedAt: Date.now(),
      });
      const { attempt, verdictChangedToAc } = await upsertPlatformFields(problem.id, {
        platform: 'codeforces',
        platformSubmissionId: submission.platformSubmissionId,
        occurredAt: submission.occurredAt,
        outcome: submission.outcome,
        rawVerdict: submission.rawVerdict,
        language: submission.language,
      });
      imported += 1;
      if (
        state.initialImportComplete &&
        verdictChangedToAc &&
        (await problemHasFailedAttempt(attempt.problemId))
      ) {
        await enqueueReview(attempt.problemId);
      }
    }

    pages += 1;
    const oldest = page.data.submissions.at(-1);
    state = {
      ...state,
      lastSyncAt: Date.now(),
      lastSeenSubmissionId: oldest?.platformSubmissionId ?? state.lastSeenSubmissionId,
      nextAllowedAt: Date.now() + RATE_LIMIT_MS,
    };

    const importedCount = from + page.data.submissions.length - 1;
    if (!state.initialImportComplete && importedCount >= INITIAL_IMPORT_CAP) {
      state.initialImportComplete = true;
      await putSyncState(state);
      break;
    }
    if (!page.data.hasMore || page.data.submissions.length === 0) {
      state.initialImportComplete = true;
      await putSyncState(state);
      break;
    }
    if (state.initialImportComplete && (reachedKnownFinal || from === 1 && page.data.submissions.length < PAGE_SIZE)) {
      await putSyncState(state);
      break;
    }
    if (state.initialImportComplete && reachedKnownFinal) {
      await putSyncState(state);
      break;
    }
    from += PAGE_SIZE;
    await putSyncState(state);
  }

  return { imported, pages };
}

export async function fetchMetadataFor(ref: ProblemReference) {
  if (ref.platform !== 'leetcode' || !leetcodeAdapter.fetchProblemMetadata) {
    return { ok: false as const, error: { code: 'UNSUPPORTED', message: 'No metadata adapter for this platform.' } };
  }
  const result = await leetcodeAdapter.fetchProblemMetadata(ref);
  if (result.ok) {
    await upsertSeenProblem(ref, {
      titleCache: result.data.title,
      difficultyCache: result.data.difficulty,
      topicsCache: result.data.topics,
      metadataFetchedAt: Date.now(),
    });
  }
  return result;
}

export async function validateHandle(handle: string) {
  const result = await codeforcesAdapter.validateHandle?.(handle);
  if (!result) {
    return { ok: false as const, error: { code: 'UNSUPPORTED', message: 'Handle validation unavailable.' } };
  }
  if (result.ok) {
    await setSettings({ codeforcesHandle: result.data.handle });
  }
  return result;
}
