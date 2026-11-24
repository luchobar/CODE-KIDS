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
 * Normaliza hasta 3 ejercicios propuestos por PIPO garantizando IDs válidos del catálogo
 * y evitando repetir actividades ya asignadas cuando hay alternativas.
 */
export function normalizeProposedExercises(
  rawExercises,
  catalog,
  dominantWeakSkills,
  alreadyAssignedIds = [],
) {
  const missions = Array.isArray(catalog) && catalog.length > 0 ? catalog : DEFAULT_MISSIONS;
  const byId = new Map(missions.map((item) => [item.id, item]));
  const assignedSet = new Set(Array.isArray(alreadyAssignedIds) ? alreadyAssignedIds : []);
  const usedIds = new Set();
  const normalized = [];

  const findMissionForSkill = (skillName) => {
    const clean = String(skillName || '').toLowerCase();
    const candidates = missions.filter((m) => !usedIds.has(m.id));
    const preferUnassigned = [
      ...candidates.filter((m) => !assignedSet.has(m.id)),
      ...candidates.filter((m) => assignedSet.has(m.id)),
    ];

    const matchBySkill = preferUnassigned.find(
      (m) =>
        String(m.skill || '').toLowerCase().includes(clean) ||
        String(m.category || '').toLowerCase().includes(clean),
    );
    if (matchBySkill) return matchBySkill;
    if (clean.includes('descompos') || clean.includes('depur')) {
      const debugMission = preferUnassigned.find((m) => String(m.id).startsWith('debug-'));
      if (debugMission) return debugMission;
    }
    return preferUnassigned[0] || missions[0];
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
      title: String(item.title || baseMission.exerciseTitle || baseMission.name).slice(0, 100),
      instructions: String(item.instructions || baseMission.instructions).slice(0, 300),
      reason: String(
        item.reason ||
          `Seleccionado por PIPO para reforzar ${String(baseMission.skill || 'lógica').toLowerCase()}.`,
      ).slice(0, 260),
    });
    if (normalized.length >= 3) break;
  }

  const fallbackSkills =
    dominantWeakSkills.length > 0
      ? dominantWeakSkills
      : ['Bucles', 'Condicionales', 'Python', 'Secuencias'];

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
      title: `${mission.exerciseTitle}: refuerzo focalizado en ${weakSkill}`,
      instructions: mission.instructions,
      reason: `Sugerido por PIPO tras detectar necesidad de práctica en ${weakSkill.toLowerCase()}.`,
    });
  }

  return normalized;
}

/**
 * Construye el prompt y esquema JSON para la ruta adaptativa personalizada de PIPO.
 */
export function buildStudentRoutePrompt(input = {}) {
  return {
    system:
      'Eres PIPO, el robot tutor pedagógico de CodeKids. Jamás menciones nombres de modelos técnicos externos; hablas en primera persona como PIPO. Analiza los puntajes diagnósticos, misiones ya completadas e intentos recientes del estudiante para darle una recomendación genuinamente personalizada en español motivador. Prioriza máximo 2 habilidades concretas explicando por qué según sus números reales, y recomienda IDs de misión del catálogo que aún no haya completado.',
    payload: {
      studentName: String(input.studentName || '').slice(0, 40),
      scores: input.scores,
      completedMissions: input.progress,
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
 * Construye el prompt y esquema JSON para que PIPO evalúe la entrega de un reto escolar.
 */
export function buildEvaluatePrompt(input = {}) {
  return {
    system:
      'Eres PIPO, tutor evaluador de programación en CodeKids. Nunca menciones otros nombres de IA; eres PIPO. Analiza el código o bloques reales enviados en "evidence", el número de intentos y la consigna. Respeta estrictamente "success". Entrega en español: score (entero 0-100), feedback (retroalimentación específica para el estudiante comentando qué hizo bien en su código/bloques y cómo optimizarlo, máx 280 caracteres) y recommendation (sugerencia didáctica precisa para el docente sobre el razonamiento observado en esta entrega).',
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
 * Construye el prompt enriquecido del asesor docente PIPO con agrupación diferenciada,
 * evidencia real de entregas y atención a consultas específicas del profesor.
 */
export function buildTeacherInsightsPrompt(input = {}) {
  const rows = Array.isArray(input.submissions) ? input.submissions.slice(0, 120) : [];
  const roster = Array.isArray(input.studentRoster) ? input.studentRoster.slice(0, 60) : [];
  const catalog =
    Array.isArray(input.missionCatalog) && input.missionCatalog.length > 0
      ? input.missionCatalog
      : DEFAULT_MISSIONS;
  const assignedMissionIds = Array.isArray(input.assignedMissionIds)
    ? input.assignedMissionIds.slice(0, 40)
    : [];
  const teacherFocus = String(input.teacherFocus || '').trim().slice(0, 300);

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

  const recentEvidenceSamples = rows.slice(0, 8).map((r) => ({
    studentName: String(r.studentName || 'Estudiante').slice(0, 40),
    assignmentTitle: String(r.assignmentTitle || '').slice(0, 70),
    skill: String(r.skill || '').slice(0, 40),
    score: Number(r.score) || 0,
    attempts: Number(r.attempts) || 1,
    success: Boolean(r.success),
    evidenceSnippet: String(r.evidence || '').slice(0, 220),
  }));

  return {
    system:
      'Eres PIPO, el Asesor Pedagógico Especialista en Pensamiento Computacional y STEAM de CodeKids. Jamás menciones otros nombres de IA o modelos técnicos; identifícate únicamente como PIPO. Analiza a fondo la nómina real de estudiantes (sus nombres, puntajes y falencias específicas), las evidencias de código/bloques entregadas, los promedios de reintentos y el enfoque solicitado por el docente ("teacherFocus"). Evita respuestas genéricas o repetitivas: cita datos concretos del grupo y nombres de estudiantes que requieren nivelación vs reto avanzado. Si viene "teacherFocus", respóndelo directamente en "overview" y adapta las actividades propuestas a esa necesidad. Prioriza misiones del catálogo que NO estén en "alreadyAssignedMissionIds". Devuelve JSON estricto con overview, studentClusters (agrupación diferenciada del aula), focusSkills, nextSteps (guion concreto de intervención para la clase) y proposedExercises (3 retos adaptados con título e instrucciones contextualizadas para este grupo).',
    payload: {
      group: String(input.group || '').slice(0, 30),
      teacherFocus: teacherFocus || 'Diagnóstico integral diferenciado del curso actual',
      studentCount: roster.length,
      studentsDetail: roster.map((s) => ({
        name: String(s.name || 'Estudiante').slice(0, 40),
        score: Number(s.score) || 75,
        weakSkill: String(s.weak || 'Bucles').slice(0, 40),
        points: Number(s.points) || 0,
        completedCount: Number(s.completedCount) || 0,
      })),
      detectedWeaknessesCount: weakCounts,
      aggregateSubmissionsBySkill: aggregates,
      recentSubmissionSamples: recentEvidenceSamples,
      alreadyAssignedMissionIds: assignedMissionIds,
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
        studentClusters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              groupLabel: { type: 'string' },
              students: { type: 'string' },
              recommendation: { type: 'string' },
            },
            required: ['groupLabel', 'students', 'recommendation'],
          },
        },
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
      required: ['overview', 'studentClusters', 'focusSkills', 'nextSteps', 'proposedExercises'],
    },
    sampleSize: rows.length,
    catalog,
    dominantWeakSkills,
    assignedMissionIds,
  };
}

/**
 * Construye el prompt y esquema JSON para la retroalimentación real de PIPO al finalizar
 * o intentar cualquier ejercicio (Blockly, Python, HTML5 o JavaScript).
 */
export function buildCoachPrompt(input = {}) {
  return {
    system:
      'Eres PIPO, el compañero robot tutor de CodeKids para estudiantes de 8 a 15 años. Jamás menciones nombres técnicos de modelos; eres PIPO. Analiza el código o secuencia de bloques real que construyó el estudiante ("codeOrBlocks"), el lenguaje/herramienta ("language"), la cantidad de intentos y el resultado ("success" y "errorHint"). Da una retroalimentación genuina, específica sobre lo que escribió o ensambló (menciona sus bloques, funciones, etiquetas o bucles reales): 1) "message": comentario cercano y específico sobre su solución o intento (2 a 3 oraciones claras, máx 280 caracteres). 2) "tip": consejo práctico concreto (si acertó, qué concepto acaba de dominar o cómo optimizarlo; si falló, pista puntual sobre qué línea/bloque revisar sin regalarle la respuesta completa, máx 200 caracteres). 3) "strength": etiqueta breve de habilidad observada (máx 45 caracteres).',
    payload: {
      skill: String(input.skill || '').slice(0, 40),
      language: String(input.language || input.skill || 'Bloques').slice(0, 30),
      challenge: String(input.challenge || '').slice(0, 90),
      instructions: String(input.instructions || '').slice(0, 240),
      success: Boolean(input.success),
      attempts: Math.max(1, Number(input.attempts) || 1),
      codeOrBlocks: String(input.codeOrBlocks || '').slice(0, 1200),
      errorHint: String(input.errorHint || '').slice(0, 200),
    },
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        tip: { type: 'string' },
        strength: { type: 'string' },
      },
      required: ['message', 'tip', 'strength'],
    },
  };
}
