import { exportPayloadSchema, type ExportPayload } from '../shared/schemas';
import { getSettings, setSettings } from '../shared/settings';
import { db } from './db';
import { findByPlatformSubmission, upsertPlatformFields } from './repositories/attempts';
import { getProblemByRef } from './repositories/problems';

export async function exportAll(): Promise<ExportPayload> {
  const [problems, attempts, notes, reviews, syncState, settings] = await Promise.all([
    db.problems.toArray(),
    db.attempts.toArray(),
    db.notes.toArray(),
    db.reviews.toArray(),
    db.syncState.toArray(),
    getSettings(),
  ]);
  return {
    version: 1,
    exportedAt: Date.now(),
    problems,
    attempts,
    notes,
    reviews,
    syncState,
    settings,
  };
}

export async function importAll(raw: unknown): Promise<{ problems: number; attempts: number; notes: number }> {
  const payload = exportPayloadSchema.parse(raw);
  const problemIdMap = new Map<string, string>();

  for (const incoming of payload.problems) {
    const byId = await db.problems.get(incoming.id);
    const byKey = await getProblemByRef({
      platform: incoming.platform,
      platformKey: incoming.platformKey,
    });
    const existing = byId ?? byKey;
    if (existing) {
      problemIdMap.set(incoming.id, existing.id);
      await db.problems.put({
        ...existing,
        status: existing.status === 'tracked' || incoming.status === 'tracked' ? 'tracked' : existing.status,
        titleCache: existing.titleCache ?? incoming.titleCache,
        difficultyCache: existing.difficultyCache ?? incoming.difficultyCache,
        topicsCache: existing.topicsCache ?? incoming.topicsCache,
        nextReviewAt: existing.nextReviewAt ?? incoming.nextReviewAt,
        reviewStep: existing.reviewStep ?? incoming.reviewStep,
      });
    } else {
      problemIdMap.set(incoming.id, incoming.id);
      await db.problems.put(incoming);
    }
  }

  let attempts = 0;
  for (const incoming of payload.attempts) {
    const problemId = problemIdMap.get(incoming.problemId) ?? incoming.problemId;
    if (incoming.platform && incoming.platformSubmissionId) {
      const existing = await findByPlatformSubmission(
        incoming.platform,
        incoming.platformSubmissionId,
      );
      if (existing) {
        await upsertPlatformFields(existing.problemId, {
          platform: incoming.platform,
          platformSubmissionId: incoming.platformSubmissionId,
          occurredAt: incoming.occurredAt,
          outcome: incoming.outcome,
          rawVerdict: incoming.rawVerdict,
          language: incoming.language,
        });
        attempts += 1;
        continue;
      }
    }
    const byId = await db.attempts.get(incoming.id);
    if (byId) {
      await db.attempts.put({
        ...byId,
        failureCategories: byId.classifiedAt ? byId.failureCategories : incoming.failureCategories,
        classifiedAt: byId.classifiedAt ?? incoming.classifiedAt,
        durationSeconds: byId.durationSeconds ?? incoming.durationSeconds,
        hintUsed: byId.hintUsed ?? incoming.hintUsed,
      });
    } else {
      await db.attempts.put({ ...incoming, problemId });
    }
    attempts += 1;
  }

  let notes = 0;
  for (const incoming of payload.notes) {
    const problemId = problemIdMap.get(incoming.problemId) ?? incoming.problemId;
    const existing = await db.notes.get(incoming.id);
    if (existing) {
      if (incoming.updatedAt > existing.updatedAt) {
        await db.notes.put({ ...incoming, problemId });
      }
    } else {
      await db.notes.put({ ...incoming, problemId });
    }
    notes += 1;
  }

  for (const incoming of payload.reviews) {
    const problemId = problemIdMap.get(incoming.problemId) ?? incoming.problemId;
    const existing = await db.reviews.get(incoming.id);
    if (!existing) {
      await db.reviews.put({ ...incoming, problemId });
    }
  }

  for (const incoming of payload.syncState) {
    const existing = await db.syncState.get([incoming.platform, incoming.handle]);
    if (!existing) {
      await db.syncState.put(incoming);
    } else {
      await db.syncState.put({
        ...existing,
        lastSeenSubmissionId: existing.lastSeenSubmissionId ?? incoming.lastSeenSubmissionId,
        lastSyncAt: Math.max(existing.lastSyncAt ?? 0, incoming.lastSyncAt ?? 0) || existing.lastSyncAt,
        initialImportComplete: existing.initialImportComplete || incoming.initialImportComplete,
      });
    }
  }

  if (payload.settings.codeforcesHandle) {
    const current = await getSettings();
    if (!current.codeforcesHandle) {
      await setSettings({ codeforcesHandle: payload.settings.codeforcesHandle });
    }
  }

  return { problems: payload.problems.length, attempts, notes };
}
