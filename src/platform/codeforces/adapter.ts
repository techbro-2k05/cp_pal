import {
  cfStatusResponseSchema,
  cfUserInfoResponseSchema,
  normalizeCodeforcesSubmission,
} from './normalize';
import { err, ok, type PlatformAdapter, type Result } from '../types';

const API = 'https://codeforces.com/api';

async function cfFetch(path: string): Promise<Result<unknown>> {
  let response: Response;
  try {
    response = await fetch(`${API}/${path}`, { credentials: 'omit' });
  } catch {
    return err('NETWORK_ERROR', 'Could not reach the Codeforces API.');
  }
  if (response.status === 429) {
    return err('RATE_LIMITED', 'Codeforces rate limit reached. Try again shortly.');
  }
  if (!response.ok) {
    return err('HTTP_ERROR', `Codeforces API HTTP ${response.status}.`);
  }
  try {
    return ok(await response.json());
  } catch {
    return err('PARSE_ERROR', 'Codeforces API returned non-JSON.');
  }
}

function mapFailedComment(comment: string | undefined): Result<never> {
  const text = comment ?? 'Codeforces API request failed.';
  const lower = text.toLowerCase();
  if (lower.includes('limit')) {
    return err('RATE_LIMITED', text);
  }
  if (lower.includes('not found') || lower.includes('handles:')) {
    return err('NOT_FOUND', text);
  }
  return err('PLATFORM_ERROR', text);
}

export const codeforcesAdapter: PlatformAdapter = {
  capabilities: { syncSubmissions: true, fetchMetadata: false },

  async validateHandle(handle: string) {
    const json = await cfFetch(`user.info?handles=${encodeURIComponent(handle)}`);
    if (!json.ok) return json;
    const parsed = cfUserInfoResponseSchema.safeParse(json.data);
    if (!parsed.success) {
      return err('PARSE_ERROR', 'Unexpected Codeforces user.info response.');
    }
    if (parsed.data.status !== 'OK' || !parsed.data.result?.[0]) {
      return mapFailedComment(parsed.data.comment);
    }
    return ok({ handle: parsed.data.result[0].handle });
  },

  async fetchRecentSubmissions(opts) {
    const json = await cfFetch(
      `user.status?handle=${encodeURIComponent(opts.handle)}&from=${opts.from}&count=${opts.count}`,
    );
    if (!json.ok) return json;
    const parsed = cfStatusResponseSchema.safeParse(json.data);
    if (!parsed.success) {
      return err('PARSE_ERROR', 'Unexpected Codeforces user.status response.');
    }
    if (parsed.data.status !== 'OK' || !parsed.data.result) {
      return mapFailedComment(parsed.data.comment);
    }
    const submissions = parsed.data.result
      .map(normalizeCodeforcesSubmission)
      .filter((item): item is NonNullable<typeof item> => item != null);
    return ok({
      submissions,
      hasMore: parsed.data.result.length === opts.count,
    });
  },
};
