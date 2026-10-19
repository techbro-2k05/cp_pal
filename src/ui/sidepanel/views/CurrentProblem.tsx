import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { deriveProblemUrl, displayTitle } from '../../../platform/url';
import { db } from '../../../data/db';
import { getProblemByRef, trackProblem } from '../../../data/repositories/problems';
import { enqueueReview } from '../../../data/repositories/reviews';
import type { ProblemReference } from '../../../shared/schemas';
import { AttemptCard } from '../../components/AttemptCard';
import { ManualAttemptForm } from '../../components/ManualAttemptForm';
import { NotesPanel } from '../../components/NotesPanel';

export function CurrentProblem({
  url,
  problemRef,
}: {
  url: string | null;
  problemRef: ProblemReference | null;
}) {
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!problemRef || problemRef.platform !== 'leetcode') return;
    void chrome.runtime.sendMessage({ type: 'FETCH_METADATA', ref: problemRef });
  }, [problemRef?.platformKey, problemRef?.platform]);

  const problem = useLiveQuery(
    () => (problemRef ? getProblemByRef(problemRef) : Promise.resolve(undefined)),
    [problemRef?.platform, problemRef?.platformKey],
  );
  const attempts = useLiveQuery(
    () => (problem ? db.attempts.where('problemId').equals(problem.id).reverse().sortBy('occurredAt') : []),
    [problem?.id],
  );
  const notes = useLiveQuery(
    () => (problem ? db.notes.where('problemId').equals(problem.id).reverse().sortBy('updatedAt') : []),
    [problem?.id],
  );

  if (!problemRef) {
    return (
      <section className="card">
        <h2>Unsupported page</h2>
        <p className="muted">
          Open a Codeforces contest, problemset, or gym problem, or a LeetCode problem page. The
          current tab is {url ? <code>{url}</code> : 'not a readable problem URL'}.
        </p>
      </section>
    );
  }

  const title = displayTitle(problemRef, problem?.titleCache);

  return (
    <div className="stack">
      <section className="card stack">
        <div className="row space">
          <h2>{title}</h2>
          <span className="badge">{problemRef.platform}</span>
        </div>
        {problem?.difficultyCache ? <div className="muted">{problem.difficultyCache}</div> : null}
        {problem?.topicsCache?.length ? (
          <div className="chips">
            {problem.topicsCache.map((topic) => (
              <span className="chip" key={topic}>
                {topic}
              </span>
            ))}
          </div>
        ) : (
          <p className="muted">
            Tags appear after Codeforces imports a submission, or after LeetCode metadata loads.
          </p>
        )}
        <a href={deriveProblemUrl(problemRef)} target="_blank" rel="noreferrer">
          Open problem
        </a>
        {problem?.status === 'tracked' ? (
          <div className="row">
            <span className="badge ac">Tracked</span>
            <button className="btn" type="button" onClick={() => void enqueueReview(problem.id)}>
              Add to review
            </button>
          </div>
        ) : (
          <button className="btn primary" type="button" onClick={() => void trackProblem(problemRef)}>
            Track this problem
          </button>
        )}
        {problemRef.platform === 'codeforces' ? (
          <button
            className="btn"
            type="button"
            onClick={async () => {
              setSyncMsg('Syncing…');
              const result = await chrome.runtime.sendMessage({ type: 'SYNC_NOW' });
              setSyncMsg(result?.error?.message ?? result?.skipped ?? `Imported ${result?.imported ?? 0} submissions.`);
            }}
          >
            Sync Codeforces
          </button>
        ) : (
          <p className="muted">LeetCode history sync is not enabled. Record attempts manually.</p>
        )}
        {syncMsg ? <div className="alert info">{syncMsg}</div> : null}
      </section>

      {problem ? (
        <>
          <section className="card stack">
            <h3>Attempts</h3>
            <div className="list">
              {(attempts ?? []).map((attempt) => (
                <AttemptCard key={attempt.id} attempt={attempt} />
              ))}
              {(attempts ?? []).length === 0 ? <div className="empty">No attempts yet.</div> : null}
            </div>
          </section>
          <ManualAttemptForm problemId={problem.id} />
          <NotesPanel problemId={problem.id} notes={notes ?? []} />
        </>
      ) : (
        <p className="muted">Track the problem to attach notes and attempts.</p>
      )}
    </div>
  );
}
