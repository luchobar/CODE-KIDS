import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createAuthApp } from './server/auth/routes.js';

const authApp = createAuthApp();
const port = Number(process.env.API_PORT || 3001);
const ollamaUrl = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const model = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

let startupPromise = null;
const inflightRequests = new Map();

async function fetchOllamaTags(timeoutMs = 2500) {
  const response = await fetch(`${ollamaUrl}/api/tags`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Ollama tags status ${response.status}`);
  const data = await response.json();
  const available = (data.models || []).some(
    (item) => item.name === model || item.name.startsWith(`${model.split(':')[0]}:`),
  );
  return { ok: true, modelAvailable: available };
}

function warmupOllamaModel() {
  fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, prompt: '', keep_alive: '30m' }),
  }).catch(() => {});
}

export async function ensureOllamaReady({ warmup = false, log = false } = {}) {
  if (startupPromise) return startupPromise;

  startupPromise = (async () => {
    try {
      const status = await fetchOllamaTags(2500);
      if (log) {
        console.log(
          `[CodeKids AI] Ollama conectado en ${ollamaUrl} | Modelo ${model}: ${
            status.modelAvailable ? 'disponible' : 'NO encontrado (ejecuta: ollama pull ' + model + ')'
          }`,
        );
      }
      if (warmup && status.modelAvailable) {
        warmupOllamaModel();
      }
      return status;
    } catch {
      if (log) {
        console.log(`[CodeKids AI] Ollama no detectado en ${ollamaUrl}. Iniciando "ollama serve" automáticamente...`);
      }
      try {
        const child = spawn('ollama', ['serve'], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        });
        child.on('error', () => {});
        child.unref();
      } catch {
        // Si el comando ollama no está en el PATH, el bucle inferior fallará de forma controlada.
      }

      const deadline = Date.now() + 12_000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        try {
          const status = await fetchOllamaTags(2000);
          if (log) {
            console.log(`[CodeKids AI] Servicio Ollama iniciado correctamente en ${ollamaUrl} | Modelo ${model}`);
          }
          if (warmup && status.modelAvailable) {
            warmupOllamaModel();
          }
          return status;
        } catch {
          // Seguir esperando a que el puerto 11434 esté listo
        }
      }

      if (log) {
        console.warn(
          `[CodeKids AI] No se pudo iniciar Ollama automáticamente en ${ollamaUrl}. Verifica que Ollama esté instalado.`,
        );
      }
      return { ok: false, modelAvailable: false };
    } finally {
      startupPromise = null;
    }
  })();

  return startupPromise;
}

const DEFAULT_MISSIONS = [
  {
    id: 'sequence-forest',
    templateId: 'sequence-order',
    skill: 'Secuencias',
    category: 'Secuencias',
    level: 'Inicio',
    name: 'El bosque',
    exerciseTitle: 'El viaje del robot',
    instructions: 'Arma una secuencia de bloques paso a paso para llevar a Pipo hasta la estrella.',
  },
  {
    id: 'sequence-city',
    templateId: 'sequence-order',
    skill: 'Secuencias',
    category: 'Secuencias',
    level: 'En camino',
    name: 'La ciudad',
    exerciseTitle: 'Cruza la ciudad',
    instructions: 'Guía al robot por la ciudad y rodea el obstáculo central ordenando cada giro.',
  },
  {
    id: 'loop-bridge',
    templateId: 'loop-count',
    skill: 'Bucles',
    category: 'Bucles',
    level: 'Inicio',
    name: 'El puente',
    exerciseTitle: 'Cruza el puente con bucles',
    instructions: 'Usa el bloque «repetir» para que el robot cruce el puente sin duplicar bloques innecesarios.',
  },
  {
    id: 'loop-zigzag',
    templateId: 'loop-count',
    skill: 'Bucles',
    category: 'Bucles',
    level: 'En camino',
    name: 'El zigzag',
    exerciseTitle: 'Trayectoria en zigzag',
    instructions: 'Construye un patrón con «repetir» combinando avanzar y girar para llegar a la meta.',
  },
  {
    id: 'condition-detour',
    templateId: 'if-choice',
    skill: 'Condicionales',
    category: 'Condicionales',
    level: 'Inicio',
    name: 'El desvío',
    exerciseTitle: 'Rodea el muro con condicionales',
    instructions: 'Usa el bloque «si hay pared» para detectar el obstáculo y tomar un camino despejado.',
  },
  {
    id: 'condition-cave',
    templateId: 'if-choice',
    skill: 'Condicionales',
    category: 'Condicionales',
    level: 'En camino',
    name: 'La galería',
    exerciseTitle: 'Busca otra salida',
    instructions: 'Evalúa si el robot tiene un muro enfrente, gira a tiempo y alcanza la estrella.',
  },
  {
    id: 'debug-sequence',
    templateId: 'sequence-order',
    skill: 'Secuencias',
    category: 'Depuración',
    level: 'Laboratorio',
    name: 'El giro equivocado',
    exerciseTitle: 'Corrige la secuencia del robot',
    instructions: 'Identifica en qué paso se desvía el programa inicial, divídelo por partes y corrige el giro.',
  },
  {
    id: 'debug-loop',
    templateId: 'loop-count',
    skill: 'Bucles',
    category: 'Depuración',
    level: 'Laboratorio',
    name: 'La repetición incompleta',
    exerciseTitle: 'Ajusta el contador del bucle',
    instructions: 'El robot se detiene antes de la meta. Analiza cuántas repeticiones faltan y corrige el bucle.',
  },
  {
    id: 'debug-condition',
    templateId: 'if-choice',
    skill: 'Condicionales',
    category: 'Depuración',
    level: 'Laboratorio',
    name: 'La decisión invertida',
    exerciseTitle: 'Repara la condición del obstáculo',
    instructions: 'Prueba el programa base y corrige la decisión dentro del bloque «si hay pared».',
  },
];

function send(response, status, data) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(data));
}

async function readBody(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 64_000) throw new Error('La solicitud supera el tamaño permitido.');
  }
  return JSON.parse(raw || '{}');
}

function parseModelJson(content) {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
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
    signal: AbortSignal.timeout(90_000),
    body: bodyPayload,
  });
  if (!result.ok) throw new Error(`Ollama respondió ${result.status}.`);
  const payload = await result.json();
  return parseModelJson(payload.message?.content || '');
}

async function askOllama(system, input, format) {
  const bodyPayload = JSON.stringify({
    model,
    stream: false,
    format,
    keep_alive: '30m',
    options: { temperature: 0.2 },
    messages: [
      { role: 'system', content: system },
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

function normalizeProposedExercises(rawExercises, catalog, dominantWeakSkills) {
  const missions = Array.isArray(catalog) && catalog.length > 0 ? catalog : DEFAULT_MISSIONS;
  const byId = new Map(missions.map((item) => [item.id, item]));
  const usedIds = new Set();
  const normalized = [];

  const findMissionForSkill = (skillName) => {
    const clean = String(skillName || '').toLowerCase();
    const matchBySkill = missions.find(
      (m) =>
        !usedIds.has(m.id) &&
        (String(m.skill || '').toLowerCase().includes(clean) ||
          String(m.category || '').toLowerCase().includes(clean)),
    );
    if (matchBySkill) return matchBySkill;
    if (clean.includes('descompos') || clean.includes('depur')) {
      const debugMission = missions.find((m) => !usedIds.has(m.id) && m.id.startsWith('debug-'));
      if (debugMission) return debugMission;
    }
    return missions.find((m) => !usedIds.has(m.id)) || missions[0];
  };

  for (const item of Array.isArray(rawExercises) ? rawExercises : []) {
    let baseMission = byId.get(item.missionId);
    if (!baseMission || usedIds.has(baseMission.id)) {
      baseMission = findMissionForSkill(item.targetSkill || item.skill);
    }
    if (!baseMission) continue;
    usedIds.add(baseMission.id);
    normalized.push({
      missionId: baseMission.id,
      templateId: baseMission.templateId || 'sequence-order',
      skill: baseMission.skill || 'Secuencias',
      targetSkill: String(item.targetSkill || baseMission.category || baseMission.skill || 'Bucles'),
      level: baseMission.level || 'Inicio',
      title: String(item.title || baseMission.exerciseTitle || baseMission.name).slice(0, 90),
      instructions: String(item.instructions || baseMission.instructions).slice(0, 260),
      reason: String(
        item.reason || `Refuerza ${baseMission.skill.toLowerCase()} con práctica guiada en tablero.`,
      ).slice(0, 220),
    });
    if (normalized.length >= 3) break;
  }

  const fallbackSkills = dominantWeakSkills.length > 0 ? dominantWeakSkills : ['Bucles', 'Descomposición', 'Condicionales'];
  for (const weakSkill of fallbackSkills) {
    if (normalized.length >= 3) break;
    const mission = findMissionForSkill(weakSkill);
    if (!mission || usedIds.has(mission.id)) continue;
    usedIds.add(mission.id);
    normalized.push({
      missionId: mission.id,
      templateId: mission.templateId || 'sequence-order',
      skill: mission.skill || 'Secuencias',
      targetSkill: weakSkill,
      level: mission.level || 'Inicio',
      title: `${mission.exerciseTitle}: refuerzo de ${weakSkill.toLowerCase()}`,
      instructions: mission.instructions,
      reason: `Propuesto para atender la falencia detectada en ${weakSkill.toLowerCase()} mediante bloques visuales.`,
    });
  }

  return normalized;
}

export async function handleApiRequest(request, response) {
  const url = (request.url || '').split('?')[0];

  if (url.startsWith('/api/v1/auth')) {
    return authApp(request, response);
  }

  if (request.method === 'GET' && url === '/api/health') {
    const status = await ensureOllamaReady({ warmup: false, log: false });
    return send(response, 200, {
      ok: true,
      model,
      ollama: status.ok,
      modelAvailable: status.modelAvailable,
    });
  }

  if (
    request.method !== 'POST' ||
    !['/api/ai/student-route', '/api/ai/evaluate', '/api/ai/teacher-insights', '/api/ai/coach'].includes(url)
  ) {
    return send(response, 404, { error: 'Ruta no encontrada.' });
  }

  try {
    const input = await readBody(request);
    let result;

    if (url === '/api/ai/student-route') {
      result = await askOllama(
        'Eres un tutor de programación para niños de primaria en Colombia. Usa solo los datos anónimos entregados. Genera una ruta breve y amable en español. Prioriza máximo 2 habilidades y recomienda solo IDs de misión presentes en el catálogo. No diagnostiques ni etiquetes al niño. Devuelve JSON con summary (string), priorities (array de {skill, reason, activity}), recommendedMissionIds (array de strings).',
        {
          scores: input.scores,
          progress: input.progress,
          recentResults: input.recentResults,
          missionCatalog: input.missionCatalog,
        },
        {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            priorities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  skill: { type: 'string' },
                  reason: { type: 'string' },
                  activity: { type: 'string' },
                },
                required: ['skill', 'reason', 'activity'],
              },
            },
            recommendedMissionIds: { type: 'array', items: { type: 'string' } },
          },
          required: ['summary', 'priorities', 'recommendedMissionIds'],
        },
      );
      const validIds = new Set((input.missionCatalog || []).map((mission) => mission.id));
      result.recommendedMissionIds = (result.recommendedMissionIds || [])
        .filter((id) => validIds.has(id))
        .slice(0, 3);
    } else if (url === '/api/ai/evaluate') {
      result = await askOllama(
        'Evalúas evidencia de retos introductorios de programación por bloques para niños de primaria. El éxito o fracaso del motor del juego (success) es un hecho y no debes cambiarlo. Da una puntuación orientativa 0-100, una retroalimentación formativa y amable para el estudiante (feedback) y una recomendación pedagógica concreta para que el docente sepa cómo proceder con el niño (recommendation). Devuelve JSON con score (integer), feedback (string), recommendation (string).',
        {
          skill: input.skill,
          instruction: input.instruction,
          success: Boolean(input.success),
          attempts: Math.max(1, Number(input.attempts) || 1),
          evidence: String(input.evidence || '').slice(0, 1800),
        },
        {
          type: 'object',
          properties: {
            score: { type: 'integer', minimum: 0, maximum: 100 },
            feedback: { type: 'string' },
            recommendation: { type: 'string' },
          },
          required: ['score', 'feedback', 'recommendation'],
        },
      );
      result.score = Math.max(
        input.success ? 80 : 0,
        Math.min(input.success ? 100 : 65, Math.round(Number(result.score) || 0)),
      );
    } else if (url === '/api/ai/teacher-insights') {
      const rows = Array.isArray(input.submissions) ? input.submissions.slice(0, 200) : [];
      const roster = Array.isArray(input.studentRoster) ? input.studentRoster.slice(0, 60) : [];
      const catalog = Array.isArray(input.missionCatalog) && input.missionCatalog.length > 0
        ? input.missionCatalog
        : DEFAULT_MISSIONS;

      const totals = {};
      for (const row of rows) {
        const skill = String(row.skill || 'Otra').slice(0, 60);
        const bucket = (totals[skill] ||= {
          skill,
          count: 0,
          scoreTotal: 0,
          attemptsTotal: 0,
          incomplete: 0,
        });
        bucket.count += 1;
        bucket.scoreTotal += Math.max(0, Math.min(100, Number(row.score) || 0));
        bucket.attemptsTotal += Math.max(1, Math.min(30, Number(row.attempts) || 1));
        if (!row.success) bucket.incomplete += 1;
      }

      const aggregates = Object.values(totals).map((item) => ({
        skill: item.skill,
        responses: item.count,
        averageScore: Math.round(item.scoreTotal / item.count),
        averageAttempts: Math.round((item.attemptsTotal / item.count) * 10) / 10,
        incomplete: item.incomplete,
      }));

      const weakCounts = {};
      for (const student of roster) {
        const weak = String(student.weak || '').trim();
        if (!weak) continue;
        weakCounts[weak] = (weakCounts[weak] || 0) + 1;
      }
      const dominantWeakSkills = Object.entries(weakCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([skill]) => skill);

      result = await askOllama(
        'Eres asesor pedagógico de pensamiento computacional para docentes de primaria en Colombia. Analiza los resultados agregados del curso y las habilidades por reforzar (falencias). Redacta un informe claro en español que ayude al docente a saber cómo proceder en clase y desarrolla 3 propuestas de ejercicios prácticos usando los missionId del catálogo entregado para asignar a los estudiantes según sus falencias. Devuelve JSON con: overview (string con diagnóstico del grupo y orientación docente), focusSkills (array de {skill, evidence, activity}), nextSteps (array de strings con pasos concretos para la clase) y proposedExercises (array de 3 objetos {missionId, targetSkill, title, instructions, reason}).',
        {
          group: String(input.group || '').slice(0, 30),
          studentCount: roster.length,
          detectedWeaknesses: weakCounts,
          aggregateSubmissions: aggregates,
          assignmentSkills: input.assignmentSkills || [],
          availableMissions: catalog.map((m) => ({
            missionId: m.id,
            skill: m.skill,
            category: m.category || m.skill,
            level: m.level,
            defaultTitle: m.exerciseTitle || m.name,
            defaultInstructions: m.instructions,
          })),
        },
        {
          type: 'object',
          properties: {
            overview: { type: 'string' },
            focusSkills: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  skill: { type: 'string' },
                  evidence: { type: 'string' },
                  activity: { type: 'string' },
                },
                required: ['skill', 'evidence', 'activity'],
              },
            },
            nextSteps: { type: 'array', items: { type: 'string' } },
            proposedExercises: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  missionId: { type: 'string' },
                  targetSkill: { type: 'string' },
                  title: { type: 'string' },
                  instructions: { type: 'string' },
                  reason: { type: 'string' },
                },
                required: ['missionId', 'targetSkill', 'title', 'instructions', 'reason'],
              },
            },
          },
          required: ['overview', 'focusSkills', 'nextSteps', 'proposedExercises'],
        },
      );
      result.sampleSize = rows.length;
      result.proposedExercises = normalizeProposedExercises(
        result.proposedExercises,
        catalog,
        dominantWeakSkills,
      );
    } else {
      result = await askOllama(
        'Eres Pipo, una mascota robot alegre que acompaña a niños de primaria aprendiendo programación. Responde con una sola frase corta, cariñosa, divertida y en español colombiano natural. Si falló, anima sin regañar y ofrece una pista general sin revelar la solución. Si acertó, celebra el esfuerzo. No uses emojis excesivos. Devuelve JSON con message (string).',
        {
          skill: String(input.skill || '').slice(0, 40),
          challenge: String(input.challenge || '').slice(0, 80),
          success: Boolean(input.success),
          attempts: Math.max(1, Number(input.attempts) || 1),
        },
        {
          type: 'object',
          properties: { message: { type: 'string' } },
          required: ['message'],
        },
      );
      result.message = String(result.message || '').slice(0, 180);
    }

    return send(response, 200, { ...result, model, source: 'ollama' });
  } catch (error) {
    const status = error.message.includes('tamaño') ? 413 : error.name === 'TimeoutError' ? 504 : 503;
    return send(response, status, {
      error:
        error.name === 'TimeoutError'
          ? 'Ollama tardó demasiado en responder.'
          : 'No fue posible obtener una respuesta de Ollama.',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

const isMainModule =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const server = createServer(handleApiRequest);
  server.listen(port, '127.0.0.1', () => {
    console.log(`Codekids AI API en http://127.0.0.1:${port} | modelo ${model}`);
    ensureOllamaReady({ warmup: true, log: true });
  });
}
