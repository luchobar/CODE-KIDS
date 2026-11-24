import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { createAuthApp } from './server/auth/routes.js';
import { createApiApp } from './server/api/routes.js';
import { ensureOllamaReady, getOllamaModelName } from './server/ai/ollamaClient.js';
import { createAiRouter } from './server/ai/routes.js';

export { ensureOllamaReady };

const port = Number(process.env.API_PORT || 3001);
let unifiedApp = null;

function getUnifiedApp() {
  if (unifiedApp) return unifiedApp;

  const authApp = createAuthApp();
  const apiApp = createApiApp();
  const aiRouter = createAiRouter();

  const app = express();
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    if (req.url && req.url.startsWith('/api/v1/auth')) {
      return authApp(req, res, next);
    }
    return next();
  });

  app.use((req, res, next) => {
    if (req.url && req.url.startsWith('/api/v1/')) {
      return apiApp(req, res, next);
    }
    return next();
  });

  app.use('/api', aiRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada.' });
  });

  unifiedApp = app;
  return unifiedApp;
}

/**
 * Despacha cualquier petición `/api/*` entrante (desde Vite middleware o servidor standalone).
 * Preserva compatibilidad exacta con `vite.config.js`.
 * @param {import('node:http').IncomingMessage} request
 * @param {import('node:http').ServerResponse} response
 */
export function handleApiRequest(request, response) {
  try {
    const app = getUnifiedApp();
    return app(request, response);
  } catch (error) {
    if (!response.headersSent) {
      response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      response.end(
        JSON.stringify({
          error: 'Error interno al procesar la solicitud.',
          detail: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        }),
      );
    }
    return undefined;
  }
}

const isMainModule =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const server = createServer(handleApiRequest);
  server.listen(port, '127.0.0.1', () => {
    console.log(`Codekids AI API en http://127.0.0.1:${port} | modelo ${getOllamaModelName()}`);
    ensureOllamaReady({ warmup: true, log: true });
  });
}
