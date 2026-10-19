import { useLiveQuery } from 'dexie-react-hooks';
import { completeReview } from '../../../data/repositories/reviews';
import { listDueReviews } from '../../../data/repositories/problems';
import { deriveProblemUrl, displayTitle, problemToRef } from '../../../platform/url';
import type { RecallResult } from '../../../shared/schemas';

const ACTIONS: { result: RecallResult; label: string }[] = [
  { result: 'independent', label: 'Independent' },
  { result: 'hint', label: 'Hint' },
  { result: 'failed', label: 'Failed' },
];

export function ReviewQueue() {
  const due = useLiveQuery(() => listDueReviews(), []);

  return (
    <section className="card stack">
      <h2>Due reviews</h2>
      <p className="muted">
        Ladder: 1, 3, 7, 14, 30, 60 days. Independent moves up; hint repeats; failed resets.
      </p>
      {(due ?? []).map((problem) => {
        const ref = problemToRef(problem);
        return (
          <div className="item stack" key={problem.id}>
            <strong>{displayTitle(ref, problem.titleCache)}</strong>
            <a href={deriveProblemUrl(ref)} target="_blank" rel="noreferrer">
              Open problem
            </a>
            <div className="row">
              {ACTIONS.map((action) => (
                <button
                  key={action.result}
                  className="btn"
                  type="button"
                  onClick={() => void completeReview(problem.id, action.result)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {(due ?? []).length === 0 ? (
        <div className="empty">Nothing due. Add a problem to review from the current page.</div>
      ) : null}
    </section>
  );
}
