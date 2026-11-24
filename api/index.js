import { handleApiRequest } from '../server.js';

/**
 * Entrypoint Serverless de Vercel para despachar todas las rutas `/api/*`
 * (incluyendo Tutor IA con Gemini y endpoints REST `/api/v1/*`).
 */
export default function handler(req, res) {
  return handleApiRequest(req, res);
}
