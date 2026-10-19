import type { Problem, ProblemReference } from '../shared/schemas';

const CF_HOST = /^(www\.)?codeforces\.com$/i;
const LC_HOST = /^(www\.)?leetcode\.com$/i;

const CF_INDEX = '[A-Za-z][0-9A-Za-z]*';

function pathname(url: URL): string {
  return url.pathname.replace(/\/+$/, '');
}

export function codeforcesPlatformKey(input: {
  contestId?: number;
  index: string;
  problemsetName?: string;
}): string {
  const index = input.index.toUpperCase();
  if (input.problemsetName) {
    const contest = input.contestId ?? '';
    return `${input.problemsetName}:${contest}:${index}`;
  }
  return `contest:${input.contestId}:${index}`;
}

export function leetcodePlatformKey(slug: string): string {
  return `slug:${slug}`;
}

export function deriveProblemUrl(ref: ProblemReference): string {
  if (ref.platform === 'leetcode') {
    const slug = ref.problemSlug ?? ref.platformKey.replace(/^slug:/, '');
    return `https://leetcode.com/problems/${slug}/`;
  }
  const contestId = ref.contestId;
  const index = ref.problemIndex ?? '';
  if (contestId && contestId >= 100000) {
    return `https://codeforces.com/gym/${contestId}/problem/${index}`;
  }
  if (contestId) {
    return `https://codeforces.com/contest/${contestId}/problem/${index}`;
  }
  return 'https://codeforces.com/';
}

export function displayTitle(ref: ProblemReference, titleCache?: string): string {
  if (titleCache) return titleCache;
  if (ref.platform === 'leetcode') {
    return (ref.problemSlug ?? ref.platformKey.replace(/^slug:/, '')).replace(/-/g, ' ');
  }
  if (ref.contestId && ref.problemIndex) {
    return `Codeforces ${ref.contestId}${ref.problemIndex}`;
  }
  return ref.platformKey;
}

export function problemToRef(problem: Pick<Problem, 'platform' | 'platformKey'>): ProblemReference {
  if (problem.platform === 'leetcode') {
    return {
      platform: 'leetcode',
      platformKey: problem.platformKey,
      problemSlug: problem.platformKey.replace(/^slug:/, ''),
    };
  }
  const [kind, contestPart, index] = problem.platformKey.split(':');
  const contestId = contestPart ? Number(contestPart) : undefined;
  if (kind === 'contest') {
    return {
      platform: 'codeforces',
      platformKey: problem.platformKey,
      contestId,
      problemIndex: index,
    };
  }
  return {
    platform: 'codeforces',
    platformKey: problem.platformKey,
    problemsetName: kind,
    contestId: contestId && !Number.isNaN(contestId) ? contestId : undefined,
    problemIndex: index,
  };
}

export function parseProblemUrl(url: string | undefined | null): ProblemReference | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (CF_HOST.test(parsed.hostname)) {
    return parseCodeforces(parsed);
  }
  if (LC_HOST.test(parsed.hostname)) {
    return parseLeetCode(parsed);
  }
  return null;
}

function parseCodeforces(url: URL): ProblemReference | null {
  const path = pathname(url);

  const contest = path.match(
    new RegExp(`^/(?:contest|gym)/(\\d+)/problem/(${CF_INDEX})$`, 'i'),
  );
  if (contest) {
    const contestId = Number(contest[1]);
    const problemIndex = contest[2].toUpperCase();
    return {
      platform: 'codeforces',
      platformKey: codeforcesPlatformKey({ contestId, index: problemIndex }),
      contestId,
      problemIndex,
    };
  }

  const problemset = path.match(
    new RegExp(`^/problemset/problem/(\\d+)/(${CF_INDEX})$`, 'i'),
  );
  if (problemset) {
    const contestId = Number(problemset[1]);
    const problemIndex = problemset[2].toUpperCase();
    return {
      platform: 'codeforces',
      platformKey: codeforcesPlatformKey({ contestId, index: problemIndex }),
      contestId,
      problemIndex,
    };
  }

  return null;
}

function parseLeetCode(url: URL): ProblemReference | null {
  const path = pathname(url);
  const match = path.match(
    /^(?:\/contest\/[^/]+)?\/problems\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/.*)?$/i,
  );
  if (!match) return null;
  const problemSlug = match[1].toLowerCase();
  return {
    platform: 'leetcode',
    platformKey: leetcodePlatformKey(problemSlug),
    problemSlug,
  };
}
