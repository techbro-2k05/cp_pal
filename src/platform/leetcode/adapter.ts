import { z } from 'zod';
import { err, ok, type PlatformAdapter } from '../types';

const questionSchema = z.object({
  data: z
    .object({
      question: z
        .object({
          title: z.string(),
          titleSlug: z.string(),
          difficulty: z.string().optional(),
          topicTags: z
            .array(z.object({ name: z.string() }))
            .nullish(),
        })
        .nullable(),
    })
    .optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

const METADATA_QUERY = `
query questionTitle($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    title
    titleSlug
    difficulty
    topicTags { name }
  }
}
`;

export const leetcodeAdapter: PlatformAdapter = {
  capabilities: { syncSubmissions: false, fetchMetadata: true },

  async fetchProblemMetadata(ref) {
    const slug = ref.problemSlug ?? ref.platformKey.replace(/^slug:/, '');
    let response: Response;
    try {
      response = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        credentials: 'omit',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: METADATA_QUERY,
          variables: { titleSlug: slug },
        }),
      });
    } catch {
      return err('NETWORK_ERROR', 'Could not reach LeetCode.');
    }
    if (response.status === 401 || response.status === 403) {
      return err('UNAUTHENTICATED', 'LeetCode rejected the metadata request.');
    }
    if (response.status === 429) {
      return err('RATE_LIMITED', 'LeetCode rate limit reached.');
    }
    if (!response.ok) {
      return err('HTTP_ERROR', `LeetCode HTTP ${response.status}.`);
    }
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return err('PARSE_ERROR', 'LeetCode returned non-JSON.');
    }
    const parsed = questionSchema.safeParse(json);
    if (!parsed.success) {
      return err('PARSE_ERROR', 'Unexpected LeetCode GraphQL shape.');
    }
    if (parsed.data.errors?.length) {
      return err('PLATFORM_ERROR', parsed.data.errors[0].message);
    }
    const question = parsed.data.data?.question;
    if (!question) {
      return err('NOT_FOUND', 'LeetCode problem not found.');
    }
    return ok({
      title: question.title,
      difficulty: question.difficulty,
      topics: (question.topicTags ?? []).map((tag) => tag.name),
    });
  },

};
