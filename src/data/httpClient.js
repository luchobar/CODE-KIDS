const TIER2_BASE_PATH = '/api/v1';
const AI_BASE_PATH = '/api/ai';
const AUTH_CSRF_PATH = '/api/v1/auth/csrf';

/**
 * Ejecuta una petición JSON hacia la Capa de Negocio Express (`/api/v1/*`).
 * Retorna `null` si la red o el servidor Express no están disponibles.
 * @param {string} endpointPath
 * @param {{ method?: string, body?: unknown, signal?: AbortSignal }} [options]
 * @returns {Promise<{ status: number, httpOk: boolean, data: any } | null>}
 */
export async function callTier2Api(endpointPath, { method = 'GET', body, signal } = {}) {
  if (typeof fetch !== 'function') return null;
  try {
    const response = await fetch(`${TIER2_BASE_PATH}${endpointPath}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
    const contentType = response.headers?.get?.('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    const data = await response.json();
    return { status: response.status, httpOk: response.ok, data };
  } catch {
    return null;
  }
}

/**
 * Envía una petición autenticada con token CSRF y cookies hacia `/api/v1/auth/*`.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export async function fetchWithCsrf(url, options = {}) {
  const csrfRes = await fetch(AUTH_CSRF_PATH, {
    credentials: 'include',
    signal: options.signal,
  });
  if (!csrfRes.ok) {
    throw new Error('No fue posible obtener el token de seguridad CSRF.');
  }
  const csrfPayload = await csrfRes.json();
  const csrfToken = csrfPayload?.csrfToken || '';

  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': csrfToken,
      ...(options.headers || {}),
    },
  });
}

/**
 * Envía una solicitud JSON hacia los endpoints del tutor inteligente (`/api/ai/*`).
 * @param {string} endpointPath
 * @param {unknown} payload
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<any>}
 */
export async function postAiEndpoint(endpointPath, payload, { signal } = {}) {
  const response = await fetch(`${AI_BASE_PATH}${endpointPath}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Error del servicio IA (${response.status}).`);
  }

  return response.json();
}
