import type { RecallResult, Review } from '../../shared/schemas';
import { initialReviewState, nextReviewState } from '../../domain/reviews';
import { db } from '../db';
import { getProblem, updateReviewFields } from './problems';

export async function enqueueReview(problemId: string, now = Date.now()): Promise<void> {
  const problem = await getProblem(problemId);
  if (!problem || problem.nextReviewAt != null) return;
  const state = initialReviewState(now);
  const review: Review = {
    id: crypto.randomUUID(),
    problemId,
    scheduledFor: state.nextReviewAt,
    intervalDays: state.intervalDays,
    createdAt: now,
  };
  await db.transaction('rw', db.problems, db.reviews, async () => {
    await db.reviews.add(review);
    await updateReviewFields(problemId, {
      nextReviewAt: state.nextReviewAt,
      reviewStep: state.nextStep,
    });
  });
}

export async function completeReview(
  problemId: string,
  recallResult: RecallResult,
  now = Date.now(),
): Promise<void> {
  const problem = await getProblem(problemId);
  if (!problem) return;
  const state = nextReviewState(problem.reviewStep, recallResult, now);
  const review: Review = {
    id: crypto.randomUUID(),
    problemId,
    scheduledFor: problem.nextReviewAt ?? now,
    completedAt: now,
    recallResult,
    intervalDays: state.intervalDays,
    createdAt: now,
  };
  await db.transaction('rw', db.problems, db.reviews, async () => {
    await db.reviews.add(review);
    await updateReviewFields(problemId, {
      nextReviewAt: state.nextReviewAt,
      reviewStep: state.nextStep,
    });
  });
}
