import type { RecallResult } from '../shared/schemas';

export const REVIEW_LADDER_DAYS = [1, 3, 7, 14, 30, 60] as const;

export type ReviewAdvance = {
  nextStep: number;
  intervalDays: number;
  nextReviewAt: number;
};

export function isFinalVerdict(outcome: string): boolean {
  return outcome !== 'PENDING';
}

export function nextReviewState(
  currentStep: number | undefined,
  result: RecallResult,
  now = Date.now(),
): ReviewAdvance {
  let nextStep = currentStep ?? 0;
  if (result === 'independent') {
    nextStep = Math.min(nextStep + 1, REVIEW_LADDER_DAYS.length - 1);
  } else if (result === 'failed') {
    nextStep = 0;
  }
  const intervalDays = REVIEW_LADDER_DAYS[nextStep];
  return {
    nextStep,
    intervalDays,
    nextReviewAt: now + intervalDays * 24 * 60 * 60 * 1000,
  };
}

export function initialReviewState(now = Date.now()): ReviewAdvance {
  return {
    nextStep: 0,
    intervalDays: REVIEW_LADDER_DAYS[0],
    nextReviewAt: now + REVIEW_LADDER_DAYS[0] * 24 * 60 * 60 * 1000,
  };
}
