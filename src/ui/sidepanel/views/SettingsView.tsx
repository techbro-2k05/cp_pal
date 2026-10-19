import { useEffect, useState } from 'react';
import { exportAll, importAll } from '../../../data/export';
import { getSettings } from '../../../shared/settings';

export function SettingsView() {
  const [handle, setHandle] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getSettings().then((s) => setHandle(s.codeforcesHandle ?? ''));
  }, []);

  return (
    <div className="stack">
      <section className="card stack">
        <h2>Codeforces handle</h2>
        <p className="muted">Typed by you, never scraped from the page. Validated with the public API.</p>
        <input value={handle} onChange={(e) => setHandle(e.target.value.trim())} placeholder="tourist" />
        <button
          className="btn primary"
          type="button"
          onClick={async () => {
            setError(null);
            setStatus('Checking…');
            const result = await chrome.runtime.sendMessage({ type: 'VALIDATE_HANDLE', handle });
            if (result?.ok) {
              setHandle(result.data.handle);
              setStatus(`Saved handle ${result.data.handle}.`);
            } else {
              setStatus(null);
              setError(result?.error?.message ?? 'Could not validate handle.');
            }
          }}
        >
          Save and validate
        </button>
        {status ? <div className="alert info">{status}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}
      </section>

      <section className="card stack">
        <h2>Backup</h2>
        <p className="muted">All personal data stays on this device. Export is the backup path.</p>
        <button
          className="btn"
          type="button"
          onClick={async () => {
            const payload = await exportAll();
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cp-companion-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export JSON
        </button>
        <label className="btn">
          Import JSON
          <input
            type="file"
            accept="application/json"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                const json = JSON.parse(await file.text());
                const result = await importAll(json);
                setStatus(`Imported ${result.problems} problems, ${result.attempts} attempts, ${result.notes} notes.`);
                setError(null);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Import failed.');
              }
            }}
          />
        </label>
      </section>

      <section className="card">
        <h2>Privacy</h2>
        <p className="muted">
          No account, no backend. Notes never leave the browser unless you export them. Cookies and
          submission source code are not read or stored.
        </p>
      </section>
    </div>
  );
}
