import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { handleApiRequest, ensureOllamaReady } from './server.js';

function codekidsOllamaMiddleware() {
  const middleware = (req, res, next) => {
    if (req.url && req.url.startsWith('/api/')) {
      handleApiRequest(req, res);
      return;
    }
    next();
  };

  return {
    name: 'codekids-ollama-api',
    configureServer(server) {
      ensureOllamaReady({ warmup: true, log: true });
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      ensureOllamaReady({ warmup: true, log: true });
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), codekidsOllamaMiddleware()],
});
