import type {
  AdapterErrorCode,
  AttemptOutcome,
  ProblemReference,
} from '../shared/schemas';

export type AdapterError = { code: AdapterErrorCode; message: string };
export type Result<T> = { ok: true; data: T } | { ok: false; error: AdapterError };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err(code: AdapterErrorCode, message: string): Result<never> {
  return { ok: false, error: { code, message } };
}

export type PlatformProblemMetadata = {
  title: string;
  difficulty?: string;
  topics: string[];
};

export type NormalizedSubmission = {
  platformSubmissionId: string;
  ref: ProblemReference;
  title?: string;
  difficulty?: string;
  topics: string[];
  occurredAt: number;
  outcome: AttemptOutcome;
  rawVerdict: string;
  language?: string;
};

export type NormalizedSubmissionPage = {
  submissions: NormalizedSubmission[];
  hasMore: boolean;
};

export type SyncOptions = {
  handle: string;
  from: number;
  count: number;
};

export interface PlatformAdapter {
  capabilities: { syncSubmissions: boolean; fetchMetadata: boolean };
  fetchProblemMetadata?(ref: ProblemReference): Promise<Result<PlatformProblemMetadata>>;
  fetchRecentSubmissions?(opts: SyncOptions): Promise<Result<NormalizedSubmissionPage>>;
  validateHandle?(handle: string): Promise<Result<{ handle: string }>>;
}
