import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../data/db';
import { deriveProblemUrl, displayTitle, problemToRef } from '../../../platform/url';
import { listUnclassifiedAttempts } from '../../../data/repositories/attempts';

export function TrackedList() {
  const problems = useLiveQuery(async () => {
    const rows = await db.problems.where('status').equals('tracked').toArray();
    return rows.sort((a, b) => (b.lastSeenAt ?? b.createdAt) - (a.lastSeenAt ?? a.createdAt));
  }, []);
  const unclassified = useLiveQuery(() => listUnclassifiedAttempts(), []);

  return (
    <div className="stack">
      <section className="card">
        <h2>Needs classification</h2>
        {(unclassified ?? []).length === 0 ? (
          <p className="muted">Imported failures stay here until you confirm a cause.</p>
        ) : (
          <div className="list">
            {(unclassified ?? []).map((attempt) => (
              <div className="item" key={attempt.id}>
                <span className="badge fail">{attempt.outcome}</span>
                <div className="muted">{new Date(attempt.occurredAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="card stack">
        <h2>Tracked problems</h2>
        {(problems ?? []).map((problem) => {
          const ref = problemToRef(problem);
          return (
            <a className="item" key={problem.id} href={deriveProblemUrl(ref)} target="_blank" rel="noreferrer">
              <strong>{displayTitle(ref, problem.titleCache)}</strong>
              <div className="muted">
                {problem.platform} · {problem.difficultyCache ?? 'no rating yet'}
              </div>
            </a>
          );
        })}
        {(problems ?? []).length === 0 ? <div className="empty">Nothing tracked yet.</div> : null}
      </section>
    </div>
  );
}
