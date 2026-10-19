import { describe, expect, it } from 'vitest';
import { parseProblemUrl } from '../../platform/url';

describe('parseProblemUrl', () => {
  it('parses Codeforces contest URLs', () => {
    expect(parseProblemUrl('https://codeforces.com/contest/1843/problem/C')).toEqual({
      platform: 'codeforces',
      platformKey: 'contest:1843:C',
      contestId: 1843,
      problemIndex: 'C',
    });
  });

  it('parses problemset URLs', () => {
    expect(parseProblemUrl('https://www.codeforces.com/problemset/problem/4/A?locale=en')).toEqual({
      platform: 'codeforces',
      platformKey: 'contest:4:A',
      contestId: 4,
      problemIndex: 'A',
    });
  });

  it('parses gym URLs and A1-style indexes', () => {
    expect(parseProblemUrl('https://codeforces.com/gym/104921/problem/A1/')).toEqual({
      platform: 'codeforces',
      platformKey: 'contest:104921:A1',
      contestId: 104921,
      problemIndex: 'A1',
    });
  });

  it('parses LeetCode slugs including contest-prefixed URLs', () => {
    expect(parseProblemUrl('https://leetcode.com/problems/two-sum/description/')).toEqual({
      platform: 'leetcode',
      platformKey: 'slug:two-sum',
      problemSlug: 'two-sum',
    });
    expect(
      parseProblemUrl('https://leetcode.com/contest/weekly-contest-400/problems/minimum-number-of-chairs/'),
    ).toEqual({
      platform: 'leetcode',
      platformKey: 'slug:minimum-number-of-chairs',
      problemSlug: 'minimum-number-of-chairs',
    });
  });

  it('returns null for unsupported URLs', () => {
    expect(parseProblemUrl('https://codeforces.com/profile/tourist')).toBeNull();
    expect(parseProblemUrl('https://leetcode.com/problemset/')).toBeNull();
    expect(parseProblemUrl('https://example.com')).toBeNull();
    expect(parseProblemUrl(undefined)).toBeNull();
  });
});
