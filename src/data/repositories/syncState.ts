import type { Platform, SyncState } from '../../shared/schemas';
import { db } from '../db';

export async function getSyncState(platform: Platform, handle: string): Promise<SyncState | undefined> {
  return db.syncState.get([platform, handle]);
}

export async function putSyncState(state: SyncState): Promise<void> {
  await db.syncState.put(state);
}

export async function listSyncState(): Promise<SyncState[]> {
  return db.syncState.toArray();
}
