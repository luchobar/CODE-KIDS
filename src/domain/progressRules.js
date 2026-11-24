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
 * Evaluador heurístico local de entregas cuando Ollama no está accesible.
 */
export function evaluateWorkFallback(assignment, response = '', gameOutcome = null) {
  if (gameOutcome) {
    const score = gameOutcome.success
      ? Math.max(85, 100 - Math.max(0, (gameOutcome.attempts || 1) - 1) * 5)
      : 55;
    return {
      score,
      feedback: gameOutcome.success
        ? `Reto superado. Aplicaste ${assignment.skill.toLowerCase()} con precisión para resolver la actividad.`
        : `Intento registrado. Practiquemos ${assignment.skill.toLowerCase()} paso a paso para consolidar este reto.`,
      recommendation: gameOutcome.success
        ? 'Propón una variante con un obstáculo adicional para transferir esta habilidad a un nuevo escenario.'
        : `Repasa ${assignment.skill.toLowerCase()} con un ejemplo guiado antes de repetir el tablero.`,
    };
  }

  const words = String(response).trim().split(/\s+/).filter(Boolean).length;
  const text = String(response).toLowerCase();
  const signals = {
    Bucles: /repet|bucle|veces|iterar/.test(text),
    Secuencias: /primero|después|luego|orden|paso/.test(text),
    Condicionales: /si |cuando|condición|entonces/.test(text),
    Descomposición: /divid|parte|tarea|paso|pequeñ/.test(text),
  };
  const conceptMentioned = signals[assignment.skill] || false;
  const score = Math.min(
    100,
    Math.max(25, 35 + Math.min(words, 15) * 2 + (conceptMentioned ? 25 : 0) + (words > 18 ? 10 : 0)),
  );
  const feedback =
    score >= 80
      ? `Explicaste con claridad tu aplicación de ${assignment.skill.toLowerCase()}.`
      : conceptMentioned
        ? `Buen avance en ${assignment.skill.toLowerCase()}. Añade un ejemplo concreto del recorrido.`
        : `Detalla cómo utilizaste ${assignment.skill.toLowerCase()} y qué ocurre en cada paso.`;
  const recommendation =
    score >= 80
      ? 'Propón un reto con una variante nueva para que aplique lo aprendido en otro contexto.'
      : conceptMentioned
        ? 'Pídele que ensamble su solución y describa el resultado antes de ejecutarlo.'
        : `Repasa ${assignment.skill.toLowerCase()} con una actividad guiada breve.`;
  return { score, feedback, recommendation };
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
 * Genera la ruta adaptativa local de respaldo según el diagnóstico del estudiante.
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
    Secuencias: 'Organiza bloques de avance y giros en el orden lógico correcto.',
    Bucles: 'Aplica el bloque «repetir» para resolver trayectorias largas ahorrando instrucciones.',
    Condicionales: 'Evalúa sensores «si hay pared» para tomar decisiones automáticas ante obstáculos.',
    Descomposición: 'Identifica errores en rutinas previas y depura la ruta del personaje.',
  };
  const reasons = {
    Secuencias: `Diagnóstico: ${scores.Secuencias || 60}%. Fortalecer el paso a paso consolidará tus bases algorítmicas.`,
    Bucles: `Diagnóstico: ${scores.Bucles || 45}%. Dominar repeticiones te permitirá resolver desafíos en menos pasos.`,
    Condicionales: `Diagnóstico: ${scores.Condicionales || 55}%. Aprender a bifurcar caminos te dará control total del robot.`,
    Descomposición: `Diagnóstico: ${scores.Descomposición || 50}%. Desarmar problemas grandes en pasos pequeños evitará bloqueos.`,
  };

  return {
    summary: `¡Hola, ${userName || 'Explorador'}! Tu ruta personalizada adaptativa recomienda afianzar ${weakest} y ${secondWeakest} para acelerar tu ascenso al siguiente nivel.`,
    model: 'CodeKids Adaptive AI Tutor',
    priorities: [
      {
        skill: weakest,
        reason: reasons[weakest] || 'Habilidad prioritaria según tu perfil diagnóstico.',
        activity: activities[weakest] || 'Práctica interactiva en el mapa.',
      },
      {
        skill: secondWeakest,
        reason: reasons[secondWeakest] || 'Refuerzo complementario para completar tu perfil.',
        activity: activities[secondWeakest] || 'Desafío en el tablero espacial.',
      },
    ],
    recommendedMissionIds: recommendedMissions.slice(0, 2),
  };
}

/**
 * Genera el informe pedagógico docente de respaldo cuando Ollama no está conectado.
 */
export function buildFallbackTeacherInsights(targetGroup, roster = []) {
  const avgScore = roster.length
    ? Math.round(roster.reduce((acc, s) => acc + (s.score || 75), 0) / roster.length)
    : 78;

  return {
    overview: `Informe pedagógico para ${targetGroup}: Promedio general de ${avgScore}% con ${roster.length} estudiante(s) activo(s). El curso está listo para combinar lógica de bloques con las nuevas misiones de Python, Ciudadela HTML y Neo-Tokio JavaScript.`,
    model: 'CodeKids Pedagogic AI Engine',
    focusSkills: [
      {
        skill: 'Bucles y Python',
        evidence:
          'Oportunidad para transferir el bloque «repetir» hacia ciclos for e indentación real en Python.',
        activity: 'Asignar «Protocolo Escudo Cuántico» o «Python Etapa 2: Bucle for» al curso.',
      },
      {
        skill: 'Desarrollo Web (HTML5 / JS)',
        evidence:
          'Los estudiantes con buen dominio condicional pueden avanzar a estructurar DOM y lógica reactiva.',
        activity: 'Asignar «El Faro Holográfico (HTML5)» y «Neones de Shibuya (JavaScript)».',
      },
    ],
    nextSteps: [
      'Inscribir a los estudiantes de la base de datos en su respectivo curso desde el panel de gestión.',
      'Asignar una misión de transición en Python o Ciudadela HTML para evaluar sintaxis escrita.',
      'Revisar el código enviado por cada estudiante en la columna de respuestas del grupo.',
    ],
    proposedExercises: [
      {
        missionId: 'py-protocolo-escudo-cuantico',
        templateId: 'python-code',
        skill: 'Python',
        targetSkill: 'Python Avanzado',
        level: 'Inicio',
        title: 'Laboratorio Python: Protocolo Escudo Cuántico',
        instructions:
          'Completa la función calcular_energia_escudo(baterias, factor) retornando el producto solo si supera o iguala 100.',
        reason: 'Nueva actividad de expansión para introducir funciones y condicionales en Python.',
      },
      {
        missionId: 'html-faro-holografico',
        templateId: 'html-markup',
        skill: 'HTML5',
        targetSkill: 'Estructura Web HTML5',
        level: 'Inicio',
        title: 'Ciudadela HTML: El Faro Holográfico',
        instructions:
          'Construye dentro de <header> un encabezado <h1>Ciudadela HTML</h1> y el párrafo de estado Activo.',
        reason:
          'Permite que el curso practique etiquetas semánticas HTML5 con vista previa holográfica en vivo.',
      },
      {
        missionId: 'js-neones-shibuya',
        templateId: 'javascript-script',
        skill: 'JavaScript',
        targetSkill: 'Variables y Eventos JS',
        level: 'Inicio',
        title: 'Neo-Tokio JS: Neones de Shibuya',
        instructions:
          'Calcula energiaTotal multiplicando bateriasActivas * 25 y devuelve el mensaje con template literals.',
        reason: 'Refuerza variables constantes, operadores aritméticos y plantillas de texto en JavaScript.',
      },
    ],
  };
}
