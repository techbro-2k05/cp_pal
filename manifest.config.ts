import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'CP Companion',
  version: '0.1.0',
  description:
    'Local-first companion for Codeforces and LeetCode: track problems, classify failures, take notes, and back up your learning data.',
  minimum_chrome_version: '114',
  action: {
    default_title: 'Open CP Companion',
    default_icon: {
      '16': 'public/icons/icon16.png',
      '32': 'public/icons/icon32.png',
      '48': 'public/icons/icon48.png',
      '128': 'public/icons/icon128.png',
    },
  },
  icons: {
    '16': 'public/icons/icon16.png',
    '32': 'public/icons/icon32.png',
    '48': 'public/icons/icon48.png',
    '128': 'public/icons/icon128.png',
  },
  side_panel: {
    default_path: 'src/ui/sidepanel/index.html',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  permissions: ['sidePanel', 'storage'],
  host_permissions: [
    'https://codeforces.com/*',
    'https://www.codeforces.com/*',
    'https://leetcode.com/*',
    'https://www.leetcode.com/*',
  ],
});
