import { spawn } from 'node:child_process';

const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen2.5:3b';
const DEFAULT_GEMINI_MODELS = [
  'gemini-4-hydrogen',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];
const TAGS_TIMEOUT_MS = 2500;
const POLL_TAGS_TIMEOUT_MS = 2000;
const POLL_INTERVAL_MS = 600;
const STARTUP_TIMEOUT_MS = 12_000;
const CHAT_TIMEOUT_MS = 90_000;
const GEMINI_TIMEOUT_MS = 25_000;

let startupPromise = null;
const inflightRequests = new Map();

function getOllamaUrl() {
  return (process.env.OLLAMA_URL || DEFAULT_OLLAMA_URL).replace(/\/$/, '');
}

function getOllamaLocalModel() {
  return (process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL).trim();
}

function getGeminiApiKey() {
  const raw = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  return String(raw).trim().replace(/^['"]|['"]$/g, '');
}

function getCandidateGeminiModels() {
  const configured = String(process.env.GEMINI_MODEL || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
  const isDeprecated = /^gemini-(1\.|2\.)/i.test(configured);
  const custom = configured && !isDeprecated ? [configured] : [];
  return Array.from(new Set([...custom, ...DEFAULT_GEMINI_MODELS]));
}

function logAi(enabled, level, message) {
  if (!enabled) return;
  if (level === 'warn') {
    console.warn(message);
    return;
  }
  console.log(message);
}

/**
 * Indica si existe una clave de API en la nube configurada para PIPO.
 * @returns {boolean}
 */
export function isGeminiConfigured() {
  return Boolean(getGeminiApiKey());
}

/**
 * Devuelve el identificador público del asistente pedagógico (siempre PIPO).
 * @returns {string}
 */
export function getOllamaModelName() {
  return 'PIPO';
}

/**
 * Consulta la API local de etiquetas cuando no hay proveedor en la nube.
 * @param {number} [timeoutMs=2500]
 * @returns {Promise<{ ok: boolean, modelAvailable: boolean }>}
 */
export async function fetchOllamaTags(timeoutMs = TAGS_TIMEOUT_MS) {
  const ollamaUrl = getOllamaUrl();
  const ollamaModel = getOllamaLocalModel();
  const response = await fetch(`${ollamaUrl}/api/tags`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Local AI status ${response.status}`);
  }
  const data = await response.json();
  const baseModelName = ollamaModel.split(':')[0];
  const available = (data.models || []).some(
    (item) => item.name === ollamaModel || item.name.startsWith(`${baseModelName}:`),
  );
  return { ok: true, modelAvailable: available };
}

/**
 * Envía un pulso ligero de calentamiento al motor local si aplica.
 */
export function warmupOllamaModel() {
  if (isGeminiConfigured()) return;
  const ollamaUrl = getOllamaUrl();
  const ollamaModel = getOllamaLocalModel();
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
    // Entorno sin binario local (ej. Serverless): se ignora silenciosamente.
  }
}

/**
 * Verifica disponibilidad del motor de PIPO (nube o local).
 * @param {{ warmup?: boolean, log?: boolean }} [options]
 * @returns {Promise<{ ok: boolean, modelAvailable: boolean }>}
 */
export async function ensureOllamaReady({ warmup = false, log = false } = {}) {
  if (isGeminiConfigured()) {
    return { ok: true, modelAvailable: true };
  }
  if (startupPromise) return startupPromise;

  const ollamaUrl = getOllamaUrl();
  const ollamaModel = getOllamaLocalModel();

  startupPromise = (async () => {
    try {
      const status = await fetchOllamaTags(TAGS_TIMEOUT_MS);
      logAi(log, 'info', `[PIPO AI] Servicio local activo en ${ollamaUrl}`);
      if (warmup && status.modelAvailable) {
        warmupOllamaModel();
      }
      return status;
    } catch {
      trySpawnOllamaServe();
      const deadline = Date.now() + STARTUP_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        try {
          const status = await fetchOllamaTags(POLL_TAGS_TIMEOUT_MS);
          logAi(log, 'info', `[PIPO AI] Servicio local iniciado (${ollamaModel})`);
          if (warmup && status.modelAvailable) {
            warmupOllamaModel();
          }
          return status;
        } catch {
          // Espera a que el demonio local escuche.
        }
      }
      logAi(log, 'warn', `[PIPO AI] Motor local no detectado en ${ollamaUrl}.`);
      return { ok: false, modelAvailable: false };
    } finally {
      startupPromise = null;
    }
  })();

  return startupPromise;
}

/**
 * Extrae y parsea el objeto JSON devuelto por el modelo.
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
    throw new Error('Respuesta JSON inválida de PIPO.');
  }
}

function extractInteractionOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }
  if (Array.isArray(payload?.steps)) {
    const outputSteps = payload.steps.filter((step) => step?.type === 'model_output');
    const lastStep = outputSteps[outputSteps.length - 1];
    if (Array.isArray(lastStep?.content)) {
      const joined = lastStep.content
        .filter((part) => part?.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text)
        .join('');
      if (joined.trim()) return joined;
    }
  }
  const candidateText = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || '')
    .join('');
  return candidateText || '';
}

async function postInteractionsApi(apiKey, bodyObj) {
  return fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
      'Api-Revision': '2026-05-20',
    },
    signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    body: JSON.stringify(bodyObj),
  });
}

async function postGenerateContentFallback(apiKey, modelName, systemPrompt, inputText, schema) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`;
  const generationConfig = schema
    ? { responseMimeType: 'application/json', responseJsonSchema: schema }
    : { responseMimeType: 'application/json' };

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: inputText }] }],
      generationConfig,
    }),
  });
}

async function requestGeminiChat(systemPrompt, input, formatSchema) {
  const apiKey = getGeminiApiKey();
  const models = getCandidateGeminiModels();
  const inputText = typeof input === 'string' ? input : JSON.stringify(input);
  let lastStatus = 0;
  let lastReason = '';

  for (const modelName of models) {
    // 1. Intento principal: Interactions API oficial con JSON Schema estricto
    let response = await postInteractionsApi(apiKey, {
      model: modelName,
      store: false,
      system_instruction: systemPrompt,
      input: inputText,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: formatSchema,
      },
    });

    // Si el validador de schema rechaza algún atributo, reintenta en JSON libre guiado por system_instruction
    if (response.status === 400) {
      response = await postInteractionsApi(apiKey, {
        model: modelName,
        store: false,
        system_instruction: `${systemPrompt} Responde únicamente con un objeto JSON válido sin bloques markdown.`,
        input: inputText,
        response_format: {
          type: 'text',
          mime_type: 'application/json',
        },
      });
    }

    // Si el endpoint /interactions no está habilitado para esa clave/modelo, intenta generateContent
    if (response.status === 404 || response.status === 400) {
      response = await postGenerateContentFallback(
        apiKey,
        modelName,
        systemPrompt,
        inputText,
        formatSchema,
      );
      if (response.status === 400) {
        response = await postGenerateContentFallback(
          apiKey,
          modelName,
          `${systemPrompt} Responde únicamente con un objeto JSON válido.`,
          inputText,
          null,
        );
      }
    }

    if (response.ok) {
      const payload = await response.json();
      const text = extractInteractionOutputText(payload);
      return parseModelJson(text);
    }

    lastStatus = response.status;
    try {
      const errBody = await response.json();
      lastReason = String(errBody?.error?.message || '').slice(0, 180);
    } catch {
      lastReason = '';
    }

    // Si la clave misma es inválida (401/403 API_KEY_INVALID), no ciclar innecesariamente
    if (lastStatus === 401 || (lastStatus === 400 && /api.?key/i.test(lastReason))) {
      break;
    }
  }

  console.warn(`[PIPO AI] Upstream HTTP ${lastStatus}${lastReason ? `: ${lastReason}` : ''}`);
  const err = new Error(`PIPO upstream status ${lastStatus}`);
  err.upstreamStatus = lastStatus;
  err.upstreamReason = lastReason;
  throw err;
}

async function requestOllamaChat(bodyPayload) {
  const ollamaUrl = getOllamaUrl();
  const result = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
    body: bodyPayload,
  });
  if (!result.ok) {
    throw new Error(`Motor local respondió ${result.status}.`);
  }
  const payload = await result.json();
  return parseModelJson(payload.message?.content || '');
}

/**
 * Ejecuta una sonda ligera para verificar conectividad real de PIPO en producción sin exponer secretos.
 */
export async function probeAiConnection() {
  if (!isGeminiConfigured()) {
    const local = await ensureOllamaReady({ warmup: false, log: false });
    return { liveAi: Boolean(local.ok && local.modelAvailable), mode: 'local' };
  }
  try {
    const res = await requestGeminiChat(
      'Eres PIPO. Devuelve JSON con ok: true.',
      { ping: 1 },
      { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
    );
    return { liveAi: Boolean(res && typeof res === 'object'), mode: 'cloud' };
  } catch (err) {
    return {
      liveAi: false,
      mode: 'cloud',
      upstreamStatus: err?.upstreamStatus || 503,
      hint: err?.upstreamReason || 'Verifica la clave configurada en las variables de entorno.',
    };
  }
}

/**
 * Envía una consulta estructurada a PIPO reutilizando solicitudes idénticas en vuelo.
 * @param {string} systemPrompt
 * @param {unknown} input
 * @param {Record<string, unknown>} formatSchema
 * @returns {Promise<Record<string, unknown>>}
 */
export async function askOllama(systemPrompt, input, formatSchema) {
  const useCloud = isGeminiConfigured();
  const cacheKey = JSON.stringify({
    mode: useCloud ? 'cloud' : 'local',
    systemPrompt,
    input,
  });

  if (inflightRequests.has(cacheKey)) {
    const shared = await inflightRequests.get(cacheKey);
    return structuredClone(shared);
  }

  const task = (async () => {
    if (useCloud) {
      return requestGeminiChat(systemPrompt, input, formatSchema);
    }
    const localBody = JSON.stringify({
      model: getOllamaLocalModel(),
      stream: false,
      format: formatSchema,
      keep_alive: '30m',
      options: { temperature: 0.35 },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(input) },
      ],
    });
    try {
      return await requestOllamaChat(localBody);
    } catch (firstError) {
      const status = await ensureOllamaReady({ log: true });
      if (!status.ok) throw firstError;
      return await requestOllamaChat(localBody);
    }
  })();

  inflightRequests.set(cacheKey, task);
  try {
    const data = await task;
    return structuredClone(data);
  } finally {
    inflightRequests.delete(cacheKey);
  }
}
