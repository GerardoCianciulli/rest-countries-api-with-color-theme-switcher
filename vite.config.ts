import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// GitHub Pages serves this project from https://<user>.github.io/<repo-name>/,
// so every asset URL has to be prefixed with the repository path.
const REPO_PATH = '/rest-countries-api-with-color-theme-switcher/';

export default defineConfig({
  base: REPO_PATH,
  plugins: [react(), svgr()],
  server: {
    proxy: {
      // The REST Countries key only accepts browser requests from origins allow-listed in its dashboard.
      // In dev we call `/rc-api/...` and let Vite forward it server-side without the `Origin` header,
      // so localhost doesn't need to be on that list. Production calls the API directly.
      '/rc-api': {
        target: 'https://api.restcountries.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rc-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
    },
  },
});
