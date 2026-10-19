import { useEffect, useState } from 'react';
import { useActiveProblem } from '../hooks/useActiveProblem';
import { CurrentProblem } from './views/CurrentProblem';
import { ReviewQueue } from './views/ReviewQueue';
import { SettingsView } from './views/SettingsView';
import { TrackedList } from './views/TrackedList';

type View = 'current' | 'tracked' | 'review' | 'settings';

export function App() {
  const [view, setView] = useState<View>('current');
  const { url, ref } = useActiveProblem();

  useEffect(() => {
    void chrome.runtime.sendMessage({ type: 'PANEL_OPENED' });
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="logo">CP</div>
          <div>
            <h1>CP Companion</h1>
            <p>Local learning journal</p>
          </div>
        </div>
        <nav className="nav">
          {(
            [
              ['current', 'Current'],
              ['tracked', 'Tracked'],
              ['review', 'Review'],
              ['settings', 'Settings'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} className={view === id ? 'active' : ''} type="button" onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="content">
        {view === 'current' ? <CurrentProblem url={url} problemRef={ref} /> : null}
        {view === 'tracked' ? <TrackedList /> : null}
        {view === 'review' ? <ReviewQueue /> : null}
        {view === 'settings' ? <SettingsView /> : null}
      </main>
    </div>
  );
}
