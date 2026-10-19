import { useEffect, useState } from 'react';
import { parseProblemUrl } from '../../platform/url';
import type { ProblemReference } from '../../shared/schemas';

export function useActiveProblem(): { url: string | null; ref: ProblemReference | null } {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const refresh = async () => {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      setUrl(tab?.url ?? null);
    };
    void refresh();

    const onActivated = () => {
      void refresh();
    };
    const onUpdated = (_id: number, info: chrome.tabs.TabChangeInfo) => {
      if (info.url || info.status === 'complete') void refresh();
    };
    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  return { url, ref: parseProblemUrl(url) };
}
