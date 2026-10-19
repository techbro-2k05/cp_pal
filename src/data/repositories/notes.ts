import type { Note, NoteKind } from '../../shared/schemas';
import { db } from '../db';

export async function listNotes(problemId: string): Promise<Note[]> {
  return db.notes.where('problemId').equals(problemId).reverse().sortBy('updatedAt');
}

export async function addNote(input: {
  problemId: string;
  attemptId?: string;
  kind: NoteKind;
  body: string;
}): Promise<Note> {
  const now = Date.now();
  const note: Note = {
    id: crypto.randomUUID(),
    problemId: input.problemId,
    attemptId: input.attemptId,
    kind: input.kind,
    body: input.body,
    createdAt: now,
    updatedAt: now,
  };
  await db.notes.add(note);
  return note;
}

export async function updateNote(id: string, patch: { body?: string; kind?: NoteKind }): Promise<void> {
  await db.notes.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteNote(id: string): Promise<void> {
  await db.notes.delete(id);
}
