import { useState } from 'react';
import type { AttemptOutcome } from '../../shared/schemas';
import { addManualAttempt } from '../../data/repositories/attempts';

const OUTCOMES: AttemptOutcome[] = ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'OTHER'];

export function ManualAttemptForm({ problemId }: { problemId: string }) {
  const [outcome, setOutcome] = useState<AttemptOutcome>('WA');
  const [language, setLanguage] = useState('');
  const [duration, setDuration] = useState('');
  const [hintUsed, setHintUsed] = useState(false);

  return (
    <section className="card stack">
      <h3>Record attempt</h3>
      <p className="muted">Use this when import is unavailable (including LeetCode).</p>
      <select value={outcome} onChange={(e) => setOutcome(e.target.value as AttemptOutcome)}>
        {OUTCOMES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Language (optional)" />
      <input
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        placeholder="Minutes spent (optional)"
        inputMode="numeric"
      />
      <label className="row">
        <input type="checkbox" checked={hintUsed} onChange={(e) => setHintUsed(e.target.checked)} />
        Hint used
      </label>
      <button
        className="btn primary"
        type="button"
        onClick={() => {
          const minutes = Number(duration);
          void addManualAttempt({
            problemId,
            occurredAt: Date.now(),
            outcome,
            language: language || undefined,
            durationSeconds: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 60) : undefined,
            hintUsed,
            failureCategories: [],
          });
        }}
      >
        Save attempt
      </button>
    </section>
  );
}
