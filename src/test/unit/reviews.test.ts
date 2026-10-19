import { describe, expect, it } from 'vitest';
import { nextReviewState, REVIEW_LADDER_DAYS } from '../../domain/reviews';

describe('review ladder', () => {
  const now = 1_000_000;

  it('advances one step on independent recall', () => {
    const next = nextReviewState(0, 'independent', now);
    expect(next.nextStep).toBe(1);
    expect(next.intervalDays).toBe(REVIEW_LADDER_DAYS[1]);
    expect(next.nextReviewAt).toBe(now + REVIEW_LADDER_DAYS[1] * 86400000);
  });

  it('repeats the same step on hint', () => {
    const next = nextReviewState(2, 'hint', now);
    expect(next.nextStep).toBe(2);
    expect(next.intervalDays).toBe(REVIEW_LADDER_DAYS[2]);
  });

  it('resets to step 0 on failure', () => {
    const next = nextReviewState(4, 'failed', now);
    expect(next.nextStep).toBe(0);
    expect(next.intervalDays).toBe(1);
  });
});
