import { z } from 'zod';

export const platformSchema = z.enum(['codeforces', 'leetcode']);
export type Platform = z.infer<typeof platformSchema>;

export const problemStatusSchema = z.enum(['seen', 'tracked']);
export type ProblemStatus = z.infer<typeof problemStatusSchema>;

export const attemptOutcomeSchema = z.enum([
  'AC',
  'WA',
  'TLE',
  'MLE',
  'RE',
  'CE',
  'PENDING',
  'OTHER',
]);
export type AttemptOutcome = z.infer<typeof attemptOutcomeSchema>;

export const attemptSourceSchema = z.enum(['platform', 'manual']);
export type AttemptSource = z.infer<typeof attemptSourceSchema>;

export const failureCategorySchema = z.enum([
  'algorithm',
  'implementation',
  'complexity',
  'edge_case',
  'misread',
  'other',
]);
export type FailureCategory = z.infer<typeof failureCategorySchema>;

export const noteKindSchema = z.enum([
  'approach',
  'failure',
  'insight',
  'complexity',
  'general',
]);
export type NoteKind = z.infer<typeof noteKindSchema>;

export const recallResultSchema = z.enum(['independent', 'hint', 'failed']);
export type RecallResult = z.infer<typeof recallResultSchema>;

export const problemReferenceSchema = z.object({
  platform: platformSchema,
  platformKey: z.string().min(1),
  contestId: z.number().int().positive().optional(),
  problemIndex: z.string().optional(),
  problemsetName: z.string().optional(),
  problemSlug: z.string().optional(),
});
export type ProblemReference = z.infer<typeof problemReferenceSchema>;

export const problemSchema = z.object({
  id: z.string().uuid(),
  platform: platformSchema,
  platformKey: z.string().min(1),
  status: problemStatusSchema,
  titleCache: z.string().optional(),
  difficultyCache: z.string().optional(),
  topicsCache: z.array(z.string()).optional(),
  metadataFetchedAt: z.number().optional(),
  nextReviewAt: z.number().optional(),
  reviewStep: z.number().int().min(0).optional(),
  createdAt: z.number(),
  lastSeenAt: z.number().optional(),
});
export type Problem = z.infer<typeof problemSchema>;

export const attemptSchema = z.object({
  id: z.string().uuid(),
  problemId: z.string().uuid(),
  source: attemptSourceSchema,
  createdAt: z.number(),
  platform: platformSchema.optional(),
  platformSubmissionId: z.string().optional(),
  occurredAt: z.number(),
  outcome: attemptOutcomeSchema,
  rawVerdict: z.string().optional(),
  language: z.string().optional(),
  failureCategories: z.array(failureCategorySchema).default([]),
  classifiedAt: z.number().optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  hintUsed: z.boolean().optional(),
});
export type Attempt = z.infer<typeof attemptSchema>;

export const noteSchema = z.object({
  id: z.string().uuid(),
  problemId: z.string().uuid(),
  attemptId: z.string().uuid().optional(),
  kind: noteKindSchema,
  body: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Note = z.infer<typeof noteSchema>;

export const reviewSchema = z.object({
  id: z.string().uuid(),
  problemId: z.string().uuid(),
  scheduledFor: z.number(),
  completedAt: z.number().optional(),
  recallResult: recallResultSchema.optional(),
  intervalDays: z.number(),
  createdAt: z.number(),
});
export type Review = z.infer<typeof reviewSchema>;

export const syncStateSchema = z.object({
  platform: platformSchema,
  handle: z.string(),
  lastSeenSubmissionId: z.string().optional(),
  lastSyncAt: z.number().optional(),
  nextAllowedAt: z.number().optional(),
  initialImportComplete: z.boolean(),
});
export type SyncState = z.infer<typeof syncStateSchema>;

export const settingsSchema = z.object({
  codeforcesHandle: z.string().optional(),
});
export type Settings = z.infer<typeof settingsSchema>;

export const adapterErrorCodeSchema = z.enum([
  'UNAUTHENTICATED',
  'RATE_LIMITED',
  'NETWORK_ERROR',
  'HTTP_ERROR',
  'PLATFORM_ERROR',
  'PARSE_ERROR',
  'UNSUPPORTED',
  'NOT_FOUND',
]);
export type AdapterErrorCode = z.infer<typeof adapterErrorCodeSchema>;

export const runtimeMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('SYNC_NOW') }),
  z.object({ type: z.literal('PANEL_OPENED') }),
  z.object({ type: z.literal('VALIDATE_HANDLE'), handle: z.string().min(1) }),
  z.object({ type: z.literal('FETCH_METADATA'), ref: problemReferenceSchema }),
]);
export type RuntimeMessage = z.infer<typeof runtimeMessageSchema>;

export const exportPayloadSchema = z.object({
  version: z.literal(1),
  exportedAt: z.number(),
  problems: z.array(problemSchema),
  attempts: z.array(attemptSchema),
  notes: z.array(noteSchema),
  reviews: z.array(reviewSchema),
  syncState: z.array(syncStateSchema),
  settings: settingsSchema,
});
export type ExportPayload = z.infer<typeof exportPayloadSchema>;

export const FAILURE_CATEGORY_LABELS: Record<FailureCategory, string> = {
  algorithm: 'Algorithm / approach',
  implementation: 'Implementation bug',
  complexity: 'Complexity / performance',
  edge_case: 'Edge case',
  misread: 'Misread problem / requirements',
  other: 'Other / unsure',
};

export const NOTE_KIND_LABELS: Record<NoteKind, string> = {
  approach: 'Approach',
  failure: 'Failure',
  insight: 'Insight',
  complexity: 'Complexity',
  general: 'General',
};
