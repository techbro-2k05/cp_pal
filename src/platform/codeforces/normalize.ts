import { z } from 'zod';
import type { AttemptOutcome } from '../../shared/schemas';
import type { NormalizedSubmission } from '../types';
import { codeforcesPlatformKey } from '../url';

export const cfProblemSchema = z.object({
  contestId: z.number().optional(),
  problemsetName: z.string().optional(),
  index: z.string(),
  name: z.string(),
  rating: z.number().optional(),
  tags: z.array(z.string()).default([]),
});

export const cfSubmissionSchema = z.object({
  id: z.number(),
  creationTimeSeconds: z.number(),
  relativeTimeSeconds: z.number().optional(),
  programmingLanguage: z.string().optional(),
  verdict: z.string().optional(),
  problem: cfProblemSchema,
});

export const cfStatusResponseSchema = z.object({
  status: z.string(),
  comment: z.string().optional(),
  result: z.array(cfSubmissionSchema).optional(),
});

export const cfUserInfoResponseSchema = z.object({
  status: z.string(),
  comment: z.string().optional(),
  result: z
    .array(
      z.object({
        handle: z.string(),
      }),
    )
    .optional(),
});

const VERDICT_MAP: Record<string, AttemptOutcome> = {
  OK: 'AC',
  WRONG_ANSWER: 'WA',
  TIME_LIMIT_EXCEEDED: 'TLE',
  MEMORY_LIMIT_EXCEEDED: 'MLE',
  RUNTIME_ERROR: 'RE',
  COMPILATION_ERROR: 'CE',
  TESTING: 'PENDING',
  SUBMITTED: 'PENDING',
};

export function mapCodeforcesVerdict(verdict: string | undefined): AttemptOutcome {
  if (!verdict) return 'PENDING';
  return VERDICT_MAP[verdict] ?? 'OTHER';
}

export function normalizeCodeforcesSubmission(
  raw: z.infer<typeof cfSubmissionSchema>,
): NormalizedSubmission | null {
  const { problem } = raw;
  if (problem.contestId == null && !problem.problemsetName) return null;
  const index = problem.index.toUpperCase();
  const platformKey = codeforcesPlatformKey({
    contestId: problem.contestId,
    index,
    problemsetName: problem.problemsetName,
  });
  return {
    platformSubmissionId: String(raw.id),
    ref: {
      platform: 'codeforces',
      platformKey,
      contestId: problem.contestId,
      problemIndex: index,
      problemsetName: problem.problemsetName,
    },
    title: problem.name,
    difficulty: problem.rating != null ? String(problem.rating) : undefined,
    topics: problem.tags,
    occurredAt: raw.creationTimeSeconds * 1000,
    outcome: mapCodeforcesVerdict(raw.verdict),
    rawVerdict: raw.verdict ?? 'UNKNOWN',
    language: raw.programmingLanguage,
  };
}
