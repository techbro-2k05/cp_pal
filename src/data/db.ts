import Dexie, { type Table } from 'dexie';
import type { Attempt, Note, Problem, Review, SyncState } from '../shared/schemas';

export class CompanionDB extends Dexie {
  problems!: Table<Problem, string>;
  attempts!: Table<Attempt, string>;
  notes!: Table<Note, string>;
  reviews!: Table<Review, string>;
  syncState!: Table<SyncState, [string, string]>;

  constructor() {
    super('cp-companion');
    this.version(1).stores({
      problems: 'id, &[platform+platformKey], status, nextReviewAt',
      attempts: 'id, problemId, occurredAt, &[platform+platformSubmissionId]',
      notes: 'id, problemId, attemptId',
      reviews: 'id, problemId, completedAt',
      syncState: '[platform+handle]',
    });
  }
}

export const db = new CompanionDB();
