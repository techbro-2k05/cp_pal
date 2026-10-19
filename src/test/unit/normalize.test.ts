import { describe, expect, it } from 'vitest';
import { mapCodeforcesVerdict, normalizeCodeforcesSubmission } from '../../platform/codeforces/normalize';

describe('Codeforces normalization', () => {
  it('maps known verdicts and keeps unknown as OTHER', () => {
    expect(mapCodeforcesVerdict('OK')).toBe('AC');
    expect(mapCodeforcesVerdict('TESTING')).toBe('PENDING');
    expect(mapCodeforcesVerdict('CHALLENGED')).toBe('OTHER');
  });

  it('normalizes a submission using the embedded problem object', () => {
    const result = normalizeCodeforcesSubmission({
      id: 123,
      creationTimeSeconds: 1_700_000_000,
      programmingLanguage: 'C++17',
      verdict: 'WRONG_ANSWER',
      problem: {
        contestId: 4,
        index: 'A',
        name: 'Watermelon',
        rating: 800,
        tags: ['math'],
      },
    });
    expect(result).toMatchObject({
      platformSubmissionId: '123',
      ref: { platform: 'codeforces', platformKey: 'contest:4:A', contestId: 4, problemIndex: 'A' },
      title: 'Watermelon',
      difficulty: '800',
      topics: ['math'],
      occurredAt: 1_700_000_000_000,
      outcome: 'WA',
      rawVerdict: 'WRONG_ANSWER',
      language: 'C++17',
    });
  });
});
