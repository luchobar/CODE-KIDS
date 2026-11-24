export const DEFAULT_MISSIONS = [
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

/**
 * Normaliza hasta 3 ejercicios propuestos por el modelo garantizando IDs válidos del catálogo.
 * @param {Array<Record<string, unknown>>} rawExercises
 * @param {Array<Record<string, unknown>>} catalog
 * @param {string[]} dominantWeakSkills
 * @returns {Array<Record<string, unknown>>}
 */
export function normalizeProposedExercises(rawExercises, catalog, dominantWeakSkills) {
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
      const debugMission = missions.find((m) => !usedIds.has(m.id) && String(m.id).startsWith('debug-'));
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
        item.reason || `Refuerza ${String(baseMission.skill || 'lógica').toLowerCase()} con práctica guiada en tablero.`,
      ).slice(0, 220),
    });
    if (normalized.length >= 3) break;
  }

  const fallbackSkills = dominantWeakSkills.length > 0
    ? dominantWeakSkills
    : ['Bucles', 'Descomposición', 'Condicionales'];

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

/**
 * Construye el prompt y esquema JSON para la ruta adaptativa del estudiante.
 */
export function buildStudentRoutePrompt(input = {}) {
  return {
    system:
      'Eres un tutor de programación para niños de primaria en Colombia. Usa solo los datos anónimos entregados. Genera una ruta breve y amable en español. Prioriza máximo 2 habilidades y recomienda solo IDs de misión presentes en el catálogo. No diagnostiques ni etiquetes al niño. Devuelve JSON con summary (string), priorities (array de {skill, reason, activity}), recommendedMissionIds (array de strings).',
    payload: {
      scores: input.scores,
      progress: input.progress,
      recentResults: input.recentResults,
      missionCatalog: input.missionCatalog,
    },
    schema: {
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
    validIds: new Set((input.missionCatalog || []).map((mission) => mission.id)),
  };
}

/**
 * Construye el prompt y esquema JSON para evaluar una entrega de misión.
 */
export function buildEvaluatePrompt(input = {}) {
  return {
    system:
      'Evalúas evidencia de retos introductorios de programación por bloques para niños de primaria. El éxito o fracaso del motor del juego (success) es un hecho y no debes cambiarlo. Da una puntuación orientativa 0-100, una retroalimentación formativa y amable para el estudiante (feedback) y una recomendación pedagógica concreta para que el docente sepa cómo proceder con el niño (recommendation). Devuelve JSON con score (integer), feedback (string), recommendation (string).',
    payload: {
      skill: input.skill,
      instruction: input.instruction,
      success: Boolean(input.success),
      attempts: Math.max(1, Number(input.attempts) || 1),
      evidence: String(input.evidence || '').slice(0, 1800),
    },
    schema: {
      type: 'object',
      properties: {
        score: { type: 'integer', minimum: 0, maximum: 100 },
        feedback: { type: 'string' },
        recommendation: { type: 'string' },
      },
      required: ['score', 'feedback', 'recommendation'],
    },
  };
}

/**
 * Agrega entregas y falencias del aula y construye el prompt del asesor docente.
 */
export function buildTeacherInsightsPrompt(input = {}) {
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

  return {
    system:
      'Eres asesor pedagógico de pensamiento computacional para docentes de primaria en Colombia. Analiza los resultados agregados del curso y las habilidades por reforzar (falencias). Redacta un informe claro en español que ayude al docente a saber cómo proceder en clase y desarrolla 3 propuestas de ejercicios prácticos usando los missionId del catálogo entregado para asignar a los estudiantes según sus falencias. Devuelve JSON con: overview (string con diagnóstico del grupo y orientación docente), focusSkills (array de {skill, evidence, activity}), nextSteps (array de strings con pasos concretos para la clase) y proposedExercises (array de 3 objetos {missionId, targetSkill, title, instructions, reason}).',
    payload: {
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
    schema: {
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
    sampleSize: rows.length,
    catalog,
    dominantWeakSkills,
  };
}

/**
 * Construye el prompt y esquema JSON para los mensajes cortos del tutor robot Pipo.
 */
export function buildCoachPrompt(input = {}) {
  return {
    system:
      'Eres Pipo, una mascota robot alegre que acompaña a niños de primaria aprendiendo programación. Responde con una sola frase corta, cariñosa, divertida y en español colombiano natural. Si falló, anima sin regañar y ofrece una pista general sin revelar la solución. Si acertó, celebra el esfuerzo. No uses emojis excesivos. Devuelve JSON con message (string).',
    payload: {
      skill: String(input.skill || '').slice(0, 40),
      challenge: String(input.challenge || '').slice(0, 80),
      success: Boolean(input.success),
      attempts: Math.max(1, Number(input.attempts) || 1),
    },
    schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    },
  };
}
