import { spawn } from 'node:child_process';

const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen2.5:3b';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const TAGS_TIMEOUT_MS = 2500;
const POLL_TAGS_TIMEOUT_MS = 2000;
const POLL_INTERVAL_MS = 600;
const STARTUP_TIMEOUT_MS = 12_000;
const CHAT_TIMEOUT_MS = 90_000;
const GEMINI_TIMEOUT_MS = 25_000;

const ollamaUrl = (process.env.OLLAMA_URL || DEFAULT_OLLAMA_URL).replace(/\/$/, '');
const ollamaModel = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
const geminiApiKey = (process.env.GEMINI_API_KEY || '').trim();
const geminiModel = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();

let startupPromise = null;
const inflightRequests = new Map();

function logAi(enabled, level, message) {
  if (!enabled) return;
  if (level === 'warn') {
    console.warn(message);
    return;
  }
  console.log(message);
}

/**
 * Indica si existe una clave `GEMINI_API_KEY` configurada en el servidor (ej. Vercel).
 * @returns {boolean}
 */
export function isGeminiConfigured() {
  return Boolean(geminiApiKey);
}

/**
 * Devuelve el nombre del modelo IA activo (Gemini en la nube u Ollama local).
 * @returns {string}
 */
export function getOllamaModelName() {
  return isGeminiConfigured() ? geminiModel : ollamaModel;
}

/**
 * Consulta la API de etiquetas de Ollama para verificar conectividad y disponibilidad del modelo.
 * @param {number} [timeoutMs=2500]
 * @returns {Promise<{ ok: boolean, modelAvailable: boolean }>}
 */
export async function fetchOllamaTags(timeoutMs = TAGS_TIMEOUT_MS) {
  const response = await fetch(`${ollamaUrl}/api/tags`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Ollama tags status ${response.status}`);
  }
  const data = await response.json();
  const baseModelName = ollamaModel.split(':')[0];
  const available = (data.models || []).some(
    (item) => item.name === ollamaModel || item.name.startsWith(`${baseModelName}:`),
  );
  return { ok: true, modelAvailable: available };
}

/**
 * Envía un pulso ligero de calentamiento para mantener el modelo cargado en memoria.
 */
export function warmupOllamaModel() {
  if (isGeminiConfigured()) return;
  fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: ollamaModel, prompt: '', keep_alive: '30m' }),
  }).catch(() => {});
}

function trySpawnOllamaServe() {
  try {
    const child = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.on('error', () => {});
    child.unref();
  } catch {
    // Si el binario ollama no está en el PATH, el sondeo posterior reportará estado inactivo.
  }
}

/**
 * Verifica que el proveedor IA esté listo (Gemini en la nube o demonio local de Ollama).
 * @param {{ warmup?: boolean, log?: boolean }} [options]
 * @returns {Promise<{ ok: boolean, modelAvailable: boolean, provider?: string }>}
 */
export async function ensureOllamaReady({ warmup = false, log = false } = {}) {
  if (isGeminiConfigured()) {
    return { ok: true, modelAvailable: true, provider: 'gemini' };
  }
  if (startupPromise) return startupPromise;

  startupPromise = (async () => {
    try {
      const status = await fetchOllamaTags(TAGS_TIMEOUT_MS);
      logAi(
        log,
        'info',
        `[CodeKids AI] Ollama conectado en ${ollamaUrl} | Modelo ${ollamaModel}: ${
          status.modelAvailable ? 'disponible' : `NO encontrado (ejecuta: ollama pull ${ollamaModel})`
        }`,
      );
      if (warmup && status.modelAvailable) {
        warmupOllamaModel();
      }
      return status;
    } catch {
      logAi(
        log,
        'info',
        `[CodeKids AI] Ollama no detectado en ${ollamaUrl}. Iniciando "ollama serve" automáticamente...`,
      );
      trySpawnOllamaServe();

      const deadline = Date.now() + STARTUP_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        try {
          const status = await fetchOllamaTags(POLL_TAGS_TIMEOUT_MS);
          logAi(
            log,
            'info',
            `[CodeKids AI] Servicio Ollama iniciado correctamente en ${ollamaUrl} | Modelo ${ollamaModel}`,
          );
          if (warmup && status.modelAvailable) {
            warmupOllamaModel();
          }
          return status;
        } catch {
          // Seguir esperando hasta que el puerto 11434 responda.
        }
      }

      logAi(
        log,
        'warn',
        `[CodeKids AI] No se pudo iniciar Ollama automáticamente en ${ollamaUrl}. Verifica que Ollama esté instalado.`,
      );
      return { ok: false, modelAvailable: false };
    } finally {
      startupPromise = null;
    }
  })();

  return startupPromise;
}

/**
 * Extrae y parsea el objeto JSON devuelto por el modelo LLM.
 * @param {string} content
 * @returns {Record<string, unknown>}
 */
export function parseModelJson(content) {
  const cleaned = String(content || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('Respuesta JSON inválida del modelo.');
  }
}

async function callGeminiEndpoint(bodyObject) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`;
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': geminiApiKey,
    },
    signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    body: JSON.stringify(bodyObject),
  });
}

async function requestGeminiChat(systemPrompt, input, formatSchema) {
  const baseBody = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseJsonSchema: formatSchema,
    },
  };

  let result = await callGeminiEndpoint(baseBody);

  if (result.status === 400) {
    const fallbackBody = {
      ...baseBody,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    };
    result = await callGeminiEndpoint(fallbackBody);
  }

  if (!result.ok) {
    let reason = '';
    try {
      const errJson = await result.json();
      reason = String(errJson?.error?.message || '').slice(0, 180);
    } catch {
      reason = '';
    }
    console.warn(`[CodeKids AI] Gemini HTTP ${result.status}${reason ? `: ${reason}` : ''}`);
    throw new Error(`Gemini respondió ${result.status}.`);
  }

  const payload = await result.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parseModelJson(text);
}

async function requestOllamaChat(bodyPayload) {
  const result = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
    body: bodyPayload,
  });
  if (!result.ok) {
    throw new Error(`Ollama respondió ${result.status}.`);
  }
  const payload = await result.json();
  return parseModelJson(payload.message?.content || '');
}

/**
 * Envía una consulta estructurada al proveedor IA activo (Gemini API si hay `GEMINI_API_KEY` u Ollama local)
 * reutilizando solicitudes idénticas en vuelo.
 * @param {string} systemPrompt
 * @param {unknown} input
 * @param {Record<string, unknown>} formatSchema
 * @returns {Promise<Record<string, unknown>>}
 */
export async function askOllama(systemPrompt, input, formatSchema) {
  const activeProvider = isGeminiConfigured() ? 'gemini' : 'ollama';
  const bodyPayload = JSON.stringify({
    provider: activeProvider,
    model: getOllamaModelName(),
    stream: false,
    format: formatSchema,
    keep_alive: '30m',
    options: { temperature: 0.2 },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(input) },
    ],
  });

  if (inflightRequests.has(bodyPayload)) {
    const shared = await inflightRequests.get(bodyPayload);
    return structuredClone(shared);
  }

  const task = (async () => {
    if (activeProvider === 'gemini') {
      return requestGeminiChat(systemPrompt, input, formatSchema);
    }
    try {
      return await requestOllamaChat(bodyPayload);
    } catch (firstError) {
      const status = await ensureOllamaReady({ log: true });
      if (!status.ok) throw firstError;
      return await requestOllamaChat(bodyPayload);
    }
  })();

  inflightRequests.set(bodyPayload, task);
  try {
    const data = await task;
    return structuredClone(data);
  } finally {
    inflightRequests.delete(bodyPayload);
  }
}
