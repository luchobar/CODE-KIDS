import { spawn } from 'node:child_process';

const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen2.5:3b';
const TAGS_TIMEOUT_MS = 2500;
const POLL_TAGS_TIMEOUT_MS = 2000;
const POLL_INTERVAL_MS = 600;
const STARTUP_TIMEOUT_MS = 12_000;
const CHAT_TIMEOUT_MS = 90_000;

const ollamaUrl = (process.env.OLLAMA_URL || DEFAULT_OLLAMA_URL).replace(/\/$/, '');
const ollamaModel = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;

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
 * Devuelve el nombre del modelo Ollama configurado en el entorno.
 * @returns {string}
 */
export function getOllamaModelName() {
  return ollamaModel;
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
 * Verifica que el demonio local de Ollama responda; si no está activo, intenta iniciarlo.
 * @param {{ warmup?: boolean, log?: boolean }} [options]
 * @returns {Promise<{ ok: boolean, modelAvailable: boolean }>}
 */
export async function ensureOllamaReady({ warmup = false, log = false } = {}) {
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
 * Envía una consulta estructurada a Ollama reutilizando solicitudes idénticas en vuelo.
 * @param {string} systemPrompt
 * @param {unknown} input
 * @param {Record<string, unknown>} formatSchema
 * @returns {Promise<Record<string, unknown>>}
 */
export async function askOllama(systemPrompt, input, formatSchema) {
  const bodyPayload = JSON.stringify({
    model: ollamaModel,
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
