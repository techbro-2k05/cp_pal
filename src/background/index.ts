import { parseProblemUrl } from '../platform/url';
import { routeMessage } from './message-router';
import { syncCodeforces } from './sync-coordinator';

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void routeMessage(message).then(sendResponse);
  return true;
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  const url = changeInfo.url ?? tab.url;
  if (!url || !parseProblemUrl(url)) return;
  void syncCodeforces(false);
});
