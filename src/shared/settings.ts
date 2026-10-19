import { settingsSchema, type Settings } from './schemas';

const KEY = 'cpCompanionSettings';

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(KEY);
  const parsed = settingsSchema.safeParse(stored[KEY] ?? {});
  return parsed.success ? parsed.data : {};
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = settingsSchema.parse({ ...current, ...patch });
  await chrome.storage.local.set({ [KEY]: next });
  return next;
}
