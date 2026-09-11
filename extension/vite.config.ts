import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json' with { type: 'json' }

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    outDir: 'dist',
    rollupOptions: {
      // queue-view.html isn't referenced from the manifest, so declare it explicitly
      // so vite emits it into dist/ where chrome.runtime.getURL() can find it.
      input: {
        'queue-view': 'src/popup/queue-view.html',
      },
    },
  },
})
