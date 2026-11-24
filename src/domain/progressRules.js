import { BLOCKLY_CHALLENGES, challengeCategory } from '../blocklyChallenges.js';
import { readUserProfile } from '../data/storageStore.js';
import { EXPANSION_MISSIONS } from '../expansionCatalog.js';

const PYTHON_BASE_ACTIVITIES = [
  {
    id: 'python-sequence',
    templateId: 'python-code',
    skill: 'Python',
    category: 'Python',
    level: 'Inicio',
    name: 'Python Etapa 1: Primer comando',
    exerciseTitle: 'Laboratorio Python: Guiar al robot con avanzar() y girar_derecha()',
    description: 'Sintaxis escrita básica y llamadas a funciones en Python.',
    instructions:
      'Escribe los comandos avanzar() y girar_derecha() paso a paso en el editor para llevar al robot hasta la estrella.',
    isNewExpansion: false,
  },
  {
    id: 'python-loop',
    templateId: 'python-code',
    skill: 'Python',
    category: 'Python',
    level: 'En camino',
    name: 'Python Etapa 2: Bucle for',
    exerciseTitle: 'Laboratorio Python: Cruzar el pasillo con for paso in range()',
    description: 'Ciclos for e indentación de 4 espacios en Python.',
    instructions:
      'Utiliza un bucle for paso in range(): con sangría de 4 espacios para avanzar hasta la meta sin repetir líneas.',
    isNewExpansion: false,
  },
  {
    id: 'python-condition',
    templateId: 'python-code',
    skill: 'Python',
    category: 'Python',
    level: 'Explorador',
    name: 'Python Etapa 3: Sensor if',
    exerciseTitle: 'Laboratorio Python: Esquivar obstáculo con if hay_pared():',
    description: 'Condicionales if integrados dentro de un recorrido en Python.',
    instructions:
      'Combina for e if hay_pared(): para detectar el muro, girar a tiempo y alcanzar la estrella.',
    isNewExpansion: false,
  },
];

/**
 * Calcula la racha diaria consecutiva del estudiante.
 */
export function progressStreak(current, date = new Date()) {
  const today = date.toLocaleDateString('en-CA');
  if (current.lastStoryDay === today) {
    return { streak: current.streak || 1, lastStoryDay: today };
  }
  const yesterday = new Date(date.getTime() - 86400000).toLocaleDateString('en-CA');
  return {
    streak: current.lastStoryDay === yesterday ? (current.streak || 0) + 1 : (current.streak || 1),
    lastStoryDay: today,
  };
}

/**
 * Fusiona de forma uniforme los datos remotos de estudiante con su perfil local guardado.
 */
export function mergeRemoteStudentProfile(current, studentData, user) {
  if (!studentData) return current;
  const ownLocal = readUserProfile(user);
  const remoteCompleted = Array.isArray(studentData.completedMissions)
    ? studentData.completedMissions
    : [];
  const remotePythonIds = remoteCompleted.filter(
    (slug) => typeof slug === 'string' && (slug.startsWith('python-') || slug.startsWith('py-')),
  );

  return {
    ...current,
    points: Math.max(ownLocal.points || 0, studentData.points || 0),
    coins: Math.max(ownLocal.coins ?? 20, studentData.coins ?? 20),
    streak: Math.max(ownLocal.streak || 1, studentData.streak || 1),
    avatar: studentData.avatar || ownLocal.avatar || user?.avatar || 'dragon',
    ownedAvatars: Array.from(
      new Set([
        'astronaut',
        ...(ownLocal.ownedAvatars || []),
        ...(studentData.ownedAvatars || []),
        user?.avatar || 'dragon',
      ]),
    ),
    completedMissions: Array.from(
      new Set([...(ownLocal.completedMissions || []), ...remoteCompleted]),
    ),
    pythonProgress: Array.from(
      new Set([...(ownLocal.pythonProgress || []), ...remotePythonIds]),
    ),
    scores: studentData.scores || ownLocal.scores || current.scores,
    user: current.user
      ? {
          ...current.user,
          id: studentData.userId || current.user.id,
          group:
            studentData.enrolledGroups?.[0] ||
            current.user.group ||
            '5° A',
          enrolledGroups:
            studentData.enrolledGroups?.length > 0
              ? studentData.enrolledGroups
              : current.user.enrolledGroups || ['5° A'],
        }
      : current.user,
  };
}

/**
 * Calcula las insignias obtenidas por el estudiante sin duplicar predicados.
 * @param {string[]} allCompleted
 */
export function computeEarnedBadges(allCompleted = []) {
  const firstCode = allCompleted.length >= 1;
  const loopsMaster = ['loop-bridge', 'loop-zigzag', 'loop-garden'].every((id) =>
    allCompleted.includes(id),
  );
  const logicSteel = ['condition-detour', 'condition-cave', 'condition-river'].every((id) =>
    allCompleted.includes(id),
  );
  const count = [firstCode, loopsMaster, logicSteel].filter(Boolean).length;
  return { firstCode, loopsMaster, logicSteel, count };
}

/**
 * Evaluador heurístico local de respaldo firmado por PIPO cuando la red no está disponible.
 */
export function evaluateWorkFallback(assignment, response = '', gameOutcome = null) {
  if (gameOutcome) {
    const attempts = gameOutcome.attempts || 1;
    const score = gameOutcome.success
      ? Math.max(85, 100 - Math.max(0, attempts - 1) * 5)
      : 55;
    return {
      score,
      assistant: 'PIPO',
      feedback: gameOutcome.success
        ? `¡Excelente trabajo! PIPO verificó tu solución de ${assignment.skill.toLowerCase()} completada en ${attempts} intento(s).`
        : `PIPO registró tu avance (${attempts} intento(s)). Repasemos ${assignment.skill.toLowerCase()} paso a paso para superar este reto.`,
      recommendation: gameOutcome.success
        ? 'El estudiante resolvió con solidez; se sugiere asignarle una variante con mayor complejidad o sintaxis escrita.'
        : `Requiere acompañamiento guiado en ${assignment.skill.toLowerCase()} revisando la traza paso a paso.`,
    };
  }

  const words = String(response).trim().split(/\s+/).filter(Boolean).length;
  const text = String(response).toLowerCase();
  const signals = {
    Bucles: /repet|bucle|veces|iterar|for/.test(text),
    Secuencias: /primero|después|luego|orden|paso|avanzar/.test(text),
    Condicionales: /si |cuando|condición|entonces|if/.test(text),
    Descomposición: /divid|parte|tarea|paso|pequeñ/.test(text),
  };
  const conceptMentioned = signals[assignment.skill] || false;
  const score = Math.min(
    100,
    Math.max(25, 35 + Math.min(words, 15) * 2 + (conceptMentioned ? 25 : 0) + (words > 18 ? 10 : 0)),
  );
  const feedback =
    score >= 80
      ? `PIPO destaca la claridad con que explicaste tu solución de ${assignment.skill.toLowerCase()}.`
      : conceptMentioned
        ? `PIPO nota buen dominio conceptual de ${assignment.skill.toLowerCase()}; detalla qué ocurre en cada paso.`
        : `PIPO te sugiere describir cómo aplicaste ${assignment.skill.toLowerCase()} línea por línea.`;
  const recommendation =
    score >= 80
      ? 'Listo para avanzar al siguiente reto con autonomía.'
      : `Reforzar ${assignment.skill.toLowerCase()} conectando su explicación con una prueba en el simulador.`;
  return { score, assistant: 'PIPO', feedback, recommendation };
}

export function stripMarkdownFormatting(md = '') {
  return String(md)
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
}

/**
 * Construye el catálogo unificado de actividades asignables por el docente.
 */
export function buildTeacherActivitiesCatalog(remoteExpansion = null) {
  const blocklyItems = BLOCKLY_CHALLENGES.map((item) => ({
    ...item,
    category: challengeCategory(item),
    isNewExpansion: false,
  }));

  const sourceExpansion =
    remoteExpansion?.misiones?.length > 0 ? remoteExpansion.misiones : EXPANSION_MISSIONS;

  const expansionItems = sourceExpansion.map((m) => {
    const isPy = m.mundo_slug === 'laboratorio-python' || String(m.slug).startsWith('py-');
    const isHtml = m.mundo_slug === 'ciudadela-html' || String(m.slug).startsWith('html-');
    const category = isPy ? 'Python' : isHtml ? 'HTML5' : 'JavaScript';
    const templateId = isPy ? 'python-code' : isHtml ? 'html-markup' : 'javascript-script';
    const levelLabel = m.orden === 1 ? 'Inicio' : m.orden === 2 ? 'En camino' : 'Explorador';

    return {
      id: m.slug,
      templateId,
      skill: category,
      category,
      level: levelLabel,
      name: `⚡ ${m.titulo}`,
      exerciseTitle: m.titulo,
      description:
        m.contexto_narrativo || `Misión interactiva de ${category} (+${m.xp_recompensa} XP)`,
      instructions: stripMarkdownFormatting(m.instrucciones_md) || m.contexto_narrativo,
      xpReward: m.xp_recompensa,
      coinReward: m.monedas_recompensa,
      isNewExpansion: true,
    };
  });

  return [...blocklyItems, ...PYTHON_BASE_ACTIVITIES, ...expansionItems];
}

/**
 * Genera la ruta adaptativa local de respaldo firmada por PIPO según el diagnóstico real del estudiante.
 */
export function buildFallbackAdaptiveRoute({ userName, scores = {}, completed = [], blocklyWorlds = [] }) {
  const skillsList = ['Secuencias', 'Bucles', 'Condicionales', 'Descomposición'];
  const sorted = [...skillsList].sort((a, b) => (scores[a] || 50) - (scores[b] || 50));
  const weakest = sorted[0] || 'Bucles';
  const secondWeakest = sorted[1] || 'Condicionales';
  const worldForWeakest = blocklyWorlds.find((w) => w.skill === weakest) || blocklyWorlds[0];
  const pending = (worldForWeakest?.ids || []).filter((id) => !completed.includes(id));
  const recommendedMissions =
    pending.length > 0 ? pending : worldForWeakest?.ids || ['loop-bridge'];

  const activities = {
    Secuencias: 'Organiza bloques de avance y giros en el orden lógico exacto.',
    Bucles: 'Aplica el bloque «repetir» para resolver trayectorias largas ahorrando instrucciones.',
    Condicionales: 'Evalúa sensores «si hay pared» para tomar decisiones automáticas ante obstáculos.',
    Descomposición: 'Identifica errores en rutinas previas y depura la ruta paso a paso.',
  };
  const reasons = {
    Secuencias: `Puntaje actual: ${scores.Secuencias || 60}%. Fortalecer el paso a paso consolidará tus bases.`,
    Bucles: `Puntaje actual: ${scores.Bucles || 45}%. Dominar repeticiones te permitirá resolver retos en menos líneas.`,
    Condicionales: `Puntaje actual: ${scores.Condicionales || 55}%. Aprender a bifurcar caminos te dará control total.`,
    Descomposición: `Puntaje actual: ${scores.Descomposición || 50}%. Dividir retos grandes en tramos pequeños evita bloqueos.`,
  };

  return {
    summary: `¡Hola, ${userName || 'Explorador'}! Soy PIPO: según tus resultados actuales te sugiero entrenar ${weakest} y ${secondWeakest} para subir de nivel más rápido.`,
    assistant: 'PIPO',
    model: 'PIPO',
    priorities: [
      {
        skill: weakest,
        reason: reasons[weakest] || 'Habilidad prioritaria según tu perfil actual.',
        activity: activities[weakest] || 'Práctica interactiva en el mapa.',
      },
      {
        skill: secondWeakest,
        reason: reasons[secondWeakest] || 'Refuerzo complementario recomendado por PIPO.',
        activity: activities[secondWeakest] || 'Desafío en el tablero espacial.',
      },
    ],
    recommendedMissionIds: recommendedMissions.slice(0, 2),
  };
}

/**
 * Diagnóstico dinámico de respaldo de PIPO calculado sobre los estudiantes, entregas y foco reales del curso.
 */
export function buildFallbackTeacherInsights(
  targetGroup,
  roster = [],
  submissions = [],
  groupAssignments = [],
  remoteExpansion = null,
  teacherFocus = '',
) {
  const avgScore = roster.length
    ? Math.round(roster.reduce((acc, s) => acc + (Number(s.score) || 75), 0) / roster.length)
    : 78;

  const weakMap = {};
  for (const s of roster) {
    const w = String(s.weak || 'Bucles').trim();
    weakMap[w] = (weakMap[w] || 0) + 1;
  }
  for (const sub of submissions) {
    if ((Number(sub.score) || 0) < 80 && sub.skill) {
      weakMap[sub.skill] = (weakMap[sub.skill] || 0) + 1;
    }
  }

  const sortedWeak = Object.entries(weakMap)
    .sort((a, b) => b[1] - a[1])
    .map(([skill, count]) => ({ skill, count }));

  const primaryWeak = sortedWeak[0]?.skill || 'Bucles';
  const secondaryWeak = sortedWeak[1]?.skill || 'Condicionales';

  const lowGroup = roster.filter((s) => (Number(s.score) || 75) < 75);
  const midGroup = roster.filter((s) => {
    const sc = Number(s.score) || 75;
    return sc >= 75 && sc < 86;
  });
  const highGroup = roster.filter((s) => (Number(s.score) || 75) >= 86);

  const studentClusters = [];
  if (lowGroup.length > 0) {
    studentClusters.push({
      groupLabel: 'Nivelación prioritaria (< 75%)',
      students: lowGroup.map((s) => `${s.name} (${s.score || 68}% · ${s.weak || primaryWeak})`).join(', '),
      recommendation: `Acompañamiento paso a paso en ${primaryWeak} usando el depurador visual antes de evaluar código escrito.`,
    });
  }
  if (midGroup.length > 0) {
    studentClusters.push({
      groupLabel: 'Consolidación activa (75% – 85%)',
      students: midGroup.map((s) => `${s.name} (${s.score || 78}%)`).join(', '),
      recommendation: `Práctica guiada en parejas combinando ${primaryWeak} y transición gradual a Python.`,
    });
  }
  if (highGroup.length > 0) {
    studentClusters.push({
      groupLabel: 'Reto de profundización (≥ 86%)',
      students: highGroup.map((s) => `${s.name} (${s.score}%)`).join(', '),
      recommendation: 'Asignar funciones en Python, Ciudadela HTML5 o Neo-Tokio JavaScript y rol de mentores pares.',
    });
  }

  const assignedIds = new Set((groupAssignments || []).map((a) => a.missionId));
  const catalog = buildTeacherActivitiesCatalog(remoteExpansion);
  const unassigned = catalog.filter((m) => !assignedIds.has(m.id));
  const pool = unassigned.length >= 3 ? unassigned : catalog;

  const focusLower = String(teacherFocus || '').toLowerCase();
  const desiredSkills = [];
  if (focusLower.includes('python')) desiredSkills.push('Python');
  if (focusLower.includes('html') || focusLower.includes('web')) desiredSkills.push('HTML5');
  if (focusLower.includes('javascript') || focusLower.includes('js')) desiredSkills.push('JavaScript');
  if (focusLower.includes('depur') || focusLower.includes('error')) desiredSkills.push('Depuración');
  desiredSkills.push(primaryWeak, secondaryWeak, 'Python', 'HTML5', 'JavaScript');

  const chosen = [];
  const used = new Set();
  for (const sk of desiredSkills) {
    if (chosen.length >= 3) break;
    const found = pool.find(
      (item) =>
        !used.has(item.id) &&
        (String(item.skill).toLowerCase() === String(sk).toLowerCase() ||
          String(item.category).toLowerCase() === String(sk).toLowerCase()),
    );
    if (found) {
      used.add(found.id);
      chosen.push({
        missionId: found.id,
        templateId: found.templateId,
        skill: found.skill,
        targetSkill: sk,
        level: found.level,
        title: `${found.exerciseTitle} · Plan ${targetGroup}`,
        instructions: found.instructions,
        reason: `Seleccionado por PIPO para atender ${sk} en ${targetGroup} (${
          lowGroup.length > 0
            ? `apoyo focalizado para ${lowGroup.map((s) => s.name).join(', ')}`
            : `promedio actual ${avgScore}%`
        }).`,
      });
    }
  }

  const focusNote = teacherFocus
    ? ` Enfoque solicitado («${teacherFocus}»): prioricé estrategias y retos alineados directamente con tu consulta.`
    : '';

  return {
    overview: `Diagnóstico de PIPO para ${targetGroup}: promedio del grupo ${avgScore}% con ${roster.length} estudiante(s) y ${submissions.length} entrega(s) evaluadas. Las habilidades prioritarias hoy son ${primaryWeak} y ${secondaryWeak}.${focusNote}`,
    assistant: 'PIPO',
    model: 'PIPO',
    source: 'local-dynamic',
    studentClusters,
    focusSkills: [
      {
        skill: primaryWeak,
        evidence: `${weakMap[primaryWeak] || 1} indicador(es) del grupo señalan ${primaryWeak} como área crítica.`,
        activity: `Modelar un ejemplo corto de ${primaryWeak} con ejecución «Paso a paso» (10 min) antes del trabajo autónomo.`,
      },
      {
        skill: secondaryWeak,
        evidence: `Habilidad complementaria para consolidar el desempeño general (${avgScore}%) en ${targetGroup}.`,
        activity: `Resolver en parejas verbalizando la condición o secuencia antes de ejecutar la validación.`,
      },
    ],
    nextSteps: [
      lowGroup.length > 0
        ? `Dedicar 10 minutos de andamiaje directo con ${lowGroup.map((s) => s.name).join(', ')} reforzando ${primaryWeak}.`
        : `Abrir la clase con un reto guiado de ${primaryWeak} proyectado para todo el grupo ${targetGroup}.`,
      `Publicar una de las ${chosen.length} actividades recomendadas abajo (filtradas sin repetir tareas ya activas en ${targetGroup}).`,
      highGroup.length > 0
        ? `Proponer reto de código escrito a ${highGroup.map((s) => s.name).join(', ')} e invitarlos como apoyo par.`
        : 'Revisar la evidencia de código en «Retos y Entregas» para detectar errores de conteo o sangría.',
    ],
    proposedExercises: chosen,
  };
}
