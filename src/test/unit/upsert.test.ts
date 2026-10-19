import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../data/db';
import { upsertPlatformFields } from '../../data/repositories/attempts';
import { upsertSeenProblem } from '../../data/repositories/problems';

describe('upsertPlatformFields', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('updates platform fields without touching user classification', async () => {
    const problem = await upsertSeenProblem(
      { platform: 'codeforces', platformKey: 'contest:4:A', contestId: 4, problemIndex: 'A' },
      { titleCache: 'Watermelon' },
    );
    const first = await upsertPlatformFields(problem.id, {
      platform: 'codeforces',
      platformSubmissionId: '99',
      occurredAt: 1,
      outcome: 'PENDING',
      rawVerdict: 'TESTING',
      language: 'C++17',
    });
    await db.attempts.update(first.attempt.id, {
      failureCategories: ['edge_case'],
      classifiedAt: 42,
      durationSeconds: 600,
      hintUsed: true,
    });

    const second = await upsertPlatformFields(problem.id, {
      platform: 'codeforces',
      platformSubmissionId: '99',
      occurredAt: 2,
      outcome: 'AC',
      rawVerdict: 'OK',
      language: 'C++20',
    });

    expect(second.verdictChangedToAc).toBe(true);
    expect(second.attempt.outcome).toBe('AC');
    expect(second.attempt.rawVerdict).toBe('OK');
    expect(second.attempt.language).toBe('C++20');
    expect(second.attempt.failureCategories).toEqual(['edge_case']);
    expect(second.attempt.classifiedAt).toBe(42);
    expect(second.attempt.durationSeconds).toBe(600);
    expect(second.attempt.hintUsed).toBe(true);
    expect(await db.attempts.count()).toBe(1);
  });
});
