import type { Attempt, FailureCategory } from '../../shared/schemas';
import { isFinalVerdict } from '../../domain/reviews';
import { db } from '../db';

export type PlatformAttemptFields = Pick<
  Attempt,
  'platform' | 'platformSubmissionId' | 'occurredAt' | 'outcome' | 'rawVerdict' | 'language'
>;

export async function listAttempts(problemId: string): Promise<Attempt[]> {
  return db.attempts.where('problemId').equals(problemId).reverse().sortBy('occurredAt');
}

export async function getAttempt(id: string): Promise<Attempt | undefined> {
  return db.attempts.get(id);
}

export async function listUnclassifiedAttempts(): Promise<Attempt[]> {
  const rows = await db.attempts.toArray();
  return rows.filter(
    (attempt) =>
      attempt.source === 'platform' &&
      attempt.outcome !== 'AC' &&
      attempt.outcome !== 'PENDING' &&
      attempt.classifiedAt == null,
  );
}

export async function addManualAttempt(
  input: Omit<Attempt, 'id' | 'source' | 'createdAt' | 'platform' | 'platformSubmissionId'>,
): Promise<Attempt> {
  const attempt: Attempt = {
    ...input,
    id: crypto.randomUUID(),
    source: 'manual',
    createdAt: Date.now(),
    failureCategories: input.failureCategories ?? [],
  };
  await db.attempts.add(attempt);
  return attempt;
}

export async function classifyAttempt(
  id: string,
  failureCategories: FailureCategory[],
): Promise<void> {
  await db.attempts.update(id, { failureCategories, classifiedAt: Date.now() });
}

export async function updateManualAttempt(
  id: string,
  patch: Partial<Pick<Attempt, 'outcome' | 'language' | 'durationSeconds' | 'hintUsed' | 'occurredAt'>>,
): Promise<void> {
  const existing = await db.attempts.get(id);
  if (!existing || existing.source !== 'manual') return;
  await db.attempts.update(id, patch);
}

export async function deleteAttempt(id: string): Promise<void> {
  const existing = await db.attempts.get(id);
  if (!existing || existing.source !== 'manual') return;
  await db.attempts.delete(id);
}

export async function findByPlatformSubmission(
  platform: string,
  platformSubmissionId: string,
): Promise<Attempt | undefined> {
  return db.attempts
    .where('[platform+platformSubmissionId]')
    .equals([platform, platformSubmissionId])
    .first();
}

export async function upsertPlatformFields(
  problemId: string,
  fields: PlatformAttemptFields,
): Promise<{ attempt: Attempt; verdictChangedToAc: boolean }> {
  if (!fields.platform || !fields.platformSubmissionId) {
    throw new Error('platform submission identity is required');
  }
  const existing = await findByPlatformSubmission(fields.platform, fields.platformSubmissionId);
  if (existing) {
    const previousOutcome = existing.outcome;
    const updated: Attempt = {
      ...existing,
      occurredAt: fields.occurredAt,
      outcome: fields.outcome,
      rawVerdict: fields.rawVerdict,
      language: fields.language,
    };
    await db.attempts.put(updated);
    return {
      attempt: updated,
      verdictChangedToAc: previousOutcome !== 'AC' && fields.outcome === 'AC',
    };
  }
  const created: Attempt = {
    id: crypto.randomUUID(),
    problemId,
    source: 'platform',
    createdAt: Date.now(),
    failureCategories: [],
    ...fields,
  };
  await db.attempts.add(created);
  return { attempt: created, verdictChangedToAc: fields.outcome === 'AC' };
}

export async function problemHasFailedAttempt(problemId: string): Promise<boolean> {
  const attempts = await db.attempts.where('problemId').equals(problemId).toArray();
  return attempts.some((attempt) => attempt.outcome !== 'AC' && attempt.outcome !== 'PENDING');
}

export async function hasStoredFinalSubmission(
  platform: string,
  platformSubmissionId: string,
): Promise<boolean> {
  const existing = await findByPlatformSubmission(platform, platformSubmissionId);
  return Boolean(existing && isFinalVerdict(existing.outcome));
}
