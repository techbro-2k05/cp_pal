import { runtimeMessageSchema } from '../shared/schemas';
import { fetchMetadataFor, syncCodeforces, validateHandle } from './sync-coordinator';

export async function routeMessage(raw: unknown) {
  const parsed = runtimeMessageSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: 'PARSE_ERROR', message: 'Unknown or invalid message.' } };
  }
  const message = parsed.data;
  switch (message.type) {
    case 'SYNC_NOW':
      return syncCodeforces(true);
    case 'PANEL_OPENED':
      return syncCodeforces(false);
    case 'VALIDATE_HANDLE':
      return validateHandle(message.handle);
    case 'FETCH_METADATA':
      return fetchMetadataFor(message.ref);
    default:
      return { ok: false, error: { code: 'UNSUPPORTED', message: 'Unhandled message.' } };
  }
}
