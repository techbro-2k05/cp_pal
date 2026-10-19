import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../data/db';
import { exportAll, importAll } from '../../data/export';
import { addManualAttempt, upsertPlatformFields } from '../../data/repositories/attempts';
import { addNote } from '../../data/repositories/notes';
import { trackProblem } from '../../data/repositories/problems';

describe('export/import', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('round-trips user data and does not duplicate platform submissions', async () => {
    const problem = await trackProblem({
      platform: 'codeforces',
      platformKey: 'contest:4:A',
      contestId: 4,
      problemIndex: 'A',
    });
    await upsertPlatformFields(problem.id, {
      platform: 'codeforces',
      platformSubmissionId: '7',
      occurredAt: 10,
      outcome: 'WA',
      rawVerdict: 'WRONG_ANSWER',
    });
    await addManualAttempt({
      problemId: problem.id,
      occurredAt: 20,
      outcome: 'AC',
      failureCategories: [],
    });
    await addNote({ problemId: problem.id, kind: 'insight', body: 'gcd of even numbers' });

    const payload = await exportAll();
    await db.delete();
    await db.open();
    await importAll(payload);
    await importAll(payload);

    expect(await db.problems.count()).toBe(1);
    expect(await db.attempts.count()).toBe(2);
    expect(await db.notes.count()).toBe(1);
    const note = (await db.notes.toArray())[0];
    expect(note.body).toBe('gcd of even numbers');
  });
});
