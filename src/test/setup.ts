import 'fake-indexeddb/auto';

const memory = new Map<string, unknown>();

const chromeMock = {
  storage: {
    local: {
      async get(key: string | string[] | Record<string, unknown>) {
        if (typeof key === 'string') return { [key]: memory.get(key) };
        if (Array.isArray(key)) {
          return Object.fromEntries(key.map((k) => [k, memory.get(k)]));
        }
        return Object.fromEntries(Object.keys(key).map((k) => [k, memory.get(k) ?? key[k]]));
      },
      async set(items: Record<string, unknown>) {
        for (const [k, v] of Object.entries(items)) memory.set(k, v);
      },
    },
  },
};

Object.assign(globalThis, { chrome: chromeMock });
