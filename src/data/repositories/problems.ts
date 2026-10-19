import type { Problem, ProblemReference, ProblemStatus } from '../../shared/schemas';
import { db } from '../db';

export async function getProblemByRef(ref: ProblemReference): Promise<Problem | undefined> {
  return db.problems.where('[platform+platformKey]').equals([ref.platform, ref.platformKey]).first();
}

export async function getProblem(id: string): Promise<Problem | undefined> {
  return db.problems.get(id);
}

export async function listTrackedProblems(): Promise<Problem[]> {
  const rows = await db.problems.where('status').equals('tracked').toArray();
  return rows.sort((a, b) => (b.lastSeenAt ?? b.createdAt) - (a.lastSeenAt ?? a.createdAt));
}

export async function listDueReviews(now = Date.now()): Promise<Problem[]> {
  return db.problems.where('nextReviewAt').belowOrEqual(now).sortBy('nextReviewAt');
}

export async function upsertSeenProblem(
  ref: ProblemReference,
  cache: Partial<
    Pick<Problem, 'titleCache' | 'difficultyCache' | 'topicsCache' | 'metadataFetchedAt'>
  >,
): Promise<Problem> {
  const now = Date.now();
  const existing = await getProblemByRef(ref);
  if (existing) {
    const updated: Problem = {
      ...existing,
      lastSeenAt: now,
      titleCache: cache.titleCache ?? existing.titleCache,
      difficultyCache: cache.difficultyCache ?? existing.difficultyCache,
      topicsCache: cache.topicsCache ?? existing.topicsCache,
      metadataFetchedAt: cache.metadataFetchedAt ?? existing.metadataFetchedAt,
    };
    await db.problems.put(updated);
    return updated;
  }
  const created: Problem = {
    id: crypto.randomUUID(),
    platform: ref.platform,
    platformKey: ref.platformKey,
    status: 'seen',
    createdAt: now,
    lastSeenAt: now,
    ...cache,
  };
  await db.problems.add(created);
  return created;
}

export async function setProblemStatus(id: string, status: ProblemStatus): Promise<void> {
  await db.problems.update(id, { status, lastSeenAt: Date.now() });
}

export async function trackProblem(ref: ProblemReference): Promise<Problem> {
  const existing = await upsertSeenProblem(ref, {});
  await setProblemStatus(existing.id, 'tracked');
  return { ...existing, status: 'tracked', lastSeenAt: Date.now() };
}

export async function updateReviewFields(
  id: string,
  fields: Pick<Problem, 'nextReviewAt' | 'reviewStep'>,
): Promise<void> {
  await db.problems.update(id, fields);
}
