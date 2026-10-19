import { useState } from 'react';
import type { Attempt, FailureCategory } from '../../shared/schemas';
import { FAILURE_CATEGORY_LABELS } from '../../shared/schemas';
import { classifyAttempt, deleteAttempt } from '../../data/repositories/attempts';

const CATEGORIES = Object.keys(FAILURE_CATEGORY_LABELS) as FailureCategory[];

export function AttemptCard({ attempt }: { attempt: Attempt }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FailureCategory[]>(attempt.failureCategories);
  const needsClass =
    attempt.source === 'platform' &&
    attempt.outcome !== 'AC' &&
    attempt.outcome !== 'PENDING' &&
    attempt.classifiedAt == null;

  const badgeClass =
    attempt.outcome === 'AC' ? 'ac' : attempt.outcome === 'PENDING' ? 'pending' : 'fail';

  return (
    <div className="item">
      <div className="row space">
        <div>
          <span className={`badge ${badgeClass}`}>{attempt.outcome}</span>
          {attempt.rawVerdict && attempt.outcome === 'OTHER' ? (
            <span className="muted"> {attempt.rawVerdict}</span>
          ) : null}
          <div className="muted">
            {new Date(attempt.occurredAt).toLocaleString()} · {attempt.source}
            {attempt.language ? ` · ${attempt.language}` : ''}
          </div>
        </div>
        {attempt.source === 'manual' ? (
          <button className="btn danger" type="button" onClick={() => void deleteAttempt(attempt.id)}>
            Delete
          </button>
        ) : null}
      </div>
      {needsClass ? <div className="muted">Needs classification</div> : null}
      {attempt.classifiedAt ? (
        <div className="muted">
          {attempt.failureCategories.map((c) => FAILURE_CATEGORY_LABELS[c]).join(', ') || 'Unclassified'}
        </div>
      ) : null}
      {attempt.outcome !== 'AC' && attempt.outcome !== 'PENDING' ? (
        <>
          <button className="btn ghost" type="button" onClick={() => setOpen((v) => !v)}>
            {attempt.classifiedAt ? 'Edit classification' : 'Classify failure'}
          </button>
          {open ? (
            <div className="stack">
              <p className="muted">Verdicts are shown; they never pre-select a cause.</p>
              <div className="chips">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`chip ${selected.includes(cat) ? 'on' : ''}`}
                    onClick={() =>
                      setSelected((curr) =>
                        curr.includes(cat) ? curr.filter((c) => c !== cat) : [...curr, cat],
                      )
                    }
                  >
                    {FAILURE_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  void classifyAttempt(attempt.id, selected);
                  setOpen(false);
                }}
              >
                Save classification
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
