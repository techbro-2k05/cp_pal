import { useState } from 'react';
import type { Note, NoteKind } from '../../shared/schemas';
import { NOTE_KIND_LABELS } from '../../shared/schemas';
import { addNote, deleteNote, updateNote } from '../../data/repositories/notes';

const KINDS = Object.keys(NOTE_KIND_LABELS) as NoteKind[];

export function NotesPanel({ problemId, notes }: { problemId: string; notes: Note[] }) {
  const [kind, setKind] = useState<NoteKind>('general');
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  return (
    <section className="card stack">
      <h3>Private notes</h3>
      <select value={kind} onChange={(e) => setKind(e.target.value as NoteKind)}>
        {KINDS.map((k) => (
          <option key={k} value={k}>
            {NOTE_KIND_LABELS[k]}
          </option>
        ))}
      </select>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What did you learn?" />
      <button
        className="btn primary"
        type="button"
        disabled={!body.trim()}
        onClick={() => {
          void addNote({ problemId, kind, body: body.trim() });
          setBody('');
        }}
      >
        Add note
      </button>
      <div className="list">
        {notes.map((note) => (
          <div className="item" key={note.id}>
            <div className="row space">
              <strong>{NOTE_KIND_LABELS[note.kind]}</strong>
              <div className="row">
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => {
                    setEditing(note.id);
                    setDraft(note.body);
                  }}
                >
                  Edit
                </button>
                <button className="btn danger" type="button" onClick={() => void deleteNote(note.id)}>
                  Delete
                </button>
              </div>
            </div>
            {editing === note.id ? (
              <div className="stack">
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} />
                <button
                  className="btn primary"
                  type="button"
                  onClick={() => {
                    void updateNote(note.id, { body: draft });
                    setEditing(null);
                  }}
                >
                  Save
                </button>
              </div>
            ) : (
              <p>{note.body}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
