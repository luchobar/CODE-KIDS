import { getExpansionMissionsByWorld } from '../expansionCatalog.js';
import { isBlockedAhead, stepForward, turnLeft, turnRight } from './gridPhysics.js';

export const PYTHON_GRID_MAX_STEPS = 40;

export const BASE_PYTHON_GRID_MISSIONS = [
  {
    id: 'python-sequence',
    mode: 'grid',
    title: 'Secuencia en el bosque',
    stageLabel: 'Etapa 1 · Secuencias',
    explanation: 'Python interpreta las instrucciones línea por línea, de arriba hacia abajo.',
    objective: 'Completa la ruta del robot hasta la meta.',
    xpReward: 15,
    coinReward: 10,
    hints: [
      'avanzar() desplaza al robot una casilla hacia adelante.',
      'El robot comienza orientado hacia arriba.',
      'Añade avanzar() después del giro a la derecha.',
    ],
    start: { x: 0, y: 2, direction: 0 },
    goal: { x: 2, y: 0 },
    wall: null,
    starter: 'avanzar()\navanzar()\ngirar_derecha()\navanzar()\n# Agrega la instrucción final',
  },
  {
    id: 'python-loop',
    mode: 'grid',
    title: 'Iteración sobre el puente',
    stageLabel: 'Etapa 2 · Bucles',
    explanation: 'Un bucle for repite un bloque indentado. range(2) ejecuta su interior dos veces.',
    objective: 'Ajusta el parámetro de range() para cruzar el puente.',
    xpReward: 20,
    coinReward: 15,
    hints: [
      'La línea dentro del bucle for lleva cuatro espacios de sangría.',
      'Cuenta las casillas entre la posición inicial y la meta.',
      'Actualiza el número dentro de range(...).',
    ],
    start: { x: 0, y: 2, direction: 1 },
    goal: { x: 2, y: 2 },
    wall: null,
    requiredConcept: 'for',
    starter: 'for paso in range(1):\n    avanzar()',
  },
  {
    id: 'python-condition',
    mode: 'grid',
    title: 'Desvío condicional',
    stageLabel: 'Etapa 3 · Condicionales',
    explanation: 'La sentencia if evalúa una condición y ejecuta su bloque solo cuando es verdadera.',
    objective: 'Corrige la decisión inicial para rodear el obstáculo.',
    xpReward: 25,
    coinReward: 15,
    hints: [
      'hay_pared() devuelve verdadero cuando la siguiente casilla está bloqueada.',
      'El giro dentro del bloque if debe orientar al robot hacia una ruta despejada.',
      'Reemplaza girar_izquierda() por el giro adecuado.',
    ],
    start: { x: 0, y: 0, direction: 1 },
    goal: { x: 2, y: 0 },
    wall: { x: 1, y: 0 },
    requiredConcept: 'if',
    starter:
      'if hay_pared():\n    girar_izquierda()\navanzar()\navanzar()\ngirar_izquierda()\navanzar()\navanzar()\ngirar_izquierda()\navanzar()\navanzar()',
  },
];

/**
 * Combina las etapas introductorias de grilla con las misiones avanzadas de expansión.
 * @param {Array<Record<string, any>> | null} customMissions
 */
export function buildAllPythonMissions(customMissions = null) {
  const rawAdvanced = getExpansionMissionsByWorld('laboratorio-python', customMissions).filter(
    (m) => m.reglas_validacion?.motor === 'python-runner',
  );

  const advancedMissions = rawAdvanced.map((item, idx) => ({
    id: item.slug,
    mode: 'function',
    isChapterStart: idx === 0,
    title: item.titulo,
    stageLabel: `Etapa ${item.orden || idx + 4} · Expansión`,
    explanation: item.contexto_narrativo,
    instructionsMd: item.instrucciones_md,
    objective: item.titulo,
    xpReward: item.xp_recompensa || 45,
    coinReward: item.monedas_recompensa || 30,
    hints: Array.isArray(item.pistas)
      ? item.pistas.map((h) => (typeof h === 'string' ? h : h.texto))
      : [],
    starter: item.codigo_inicial,
    validation: item.reglas_validacion,
  }));

  return [...BASE_PYTHON_GRID_MISSIONS, ...advancedMissions];
}

/**
 * Parsea un subconjunto pedagógico de Python (secuencias, `for range`, `if hay_pared()`).
 * @param {string} source
 */
export function parsePythonGridProgram(source) {
  const lines = String(source || '')
    .split('\n')
    .map((raw, index) => {
      const uncommented = raw.replace(/#.*$/, '').replace(/\s+$/, '');
      if (!uncommented.trim()) return null;
      if (uncommented.includes('\t')) {
        throw new Error(`Usa espacios en lugar de tabulaciones en la línea ${index + 1}.`);
      }
      const indent = uncommented.match(/^ */)[0].length;
      return { indent, text: uncommented.trim(), number: index + 1 };
    })
    .filter(Boolean);

  const parseBlock = (index, indent) => {
    const nodes = [];
    let cursor = index;
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (line.indent < indent) break;
      if (line.indent > indent) {
        throw new Error(`Revisa la sangría en la línea ${line.number}.`);
      }

      const repeat = line.text.match(/^for\s+[a-zA-Z_]\w*\s+in\s+range\(\s*(\d+)\s*\)\s*:\s*$/);
      const conditional = /^if\s+hay_pared\(\)\s*:\s*$/.test(line.text);
      if (repeat || conditional) {
        const next = lines[cursor + 1];
        if (!next || next.indent !== indent + 4) {
          throw new Error(`Agrega cuatro espacios al bloque debajo de la línea ${line.number}.`);
        }
        const count = repeat ? Number(repeat[1]) : undefined;
        if (repeat && (count < 1 || count > 10)) {
          throw new Error('Usa un número entre 1 y 10 dentro de range().');
        }
        const nested = parseBlock(cursor + 1, indent + 4);
        if (!nested.nodes.length) {
          throw new Error(`El bloque de la línea ${line.number} necesita al menos una instrucción.`);
        }
        nodes.push(
          repeat
            ? { type: 'for', count, body: nested.nodes }
            : { type: 'if-wall', body: nested.nodes },
        );
        cursor = nested.index;
        continue;
      }

      const command = line.text.match(/^(avanzar|girar_derecha|girar_izquierda)\(\)$/);
      if (!command) {
        throw new Error(
          `No se reconoce «${line.text}» en la línea ${line.number}. Usa avanzar(), girar_derecha() o girar_izquierda().`,
        );
      }
      nodes.push({ type: command[1] });
      cursor += 1;
    }
    return { nodes, index: cursor };
  };

  if (!lines.length) throw new Error('Escribe al menos una instrucción para ejecutar.');
  if (lines[0].indent !== 0) throw new Error('La primera línea debe comenzar sin espacios iniciales.');
  return parseBlock(0, 0).nodes;
}

/**
 * Compila y evalúa de forma pura la secuencia de pasos del robot Python antes de animarla.
 * @param {string} source
 * @param {Record<string, any>} mission
 */
export function compilePythonGridExecution(source, mission) {
  const program = parsePythonGridProgram(source);
  const snapshots = [];
  let current = { ...mission.start };
  let blocked = false;
  let usedConcept = false;

  const visit = (nodes) => {
    for (const node of nodes) {
      if (blocked) return;
      if (node.type === 'for') {
        if (node.count > 1) usedConcept = true;
        for (let i = 0; i < node.count && !blocked; i += 1) {
          visit(node.body);
        }
        continue;
      }
      if (node.type === 'if-wall') {
        usedConcept = true;
        if (isBlockedAhead(current, mission.wall)) {
          visit(node.body);
        }
        continue;
      }

      if (snapshots.length + 1 > PYTHON_GRID_MAX_STEPS) {
        throw new Error('El programa supera el límite de pasos. Simplifica la ruta.');
      }

      if (node.type === 'girar_derecha') {
        current = turnRight(current);
      } else if (node.type === 'girar_izquierda') {
        current = turnLeft(current);
      } else {
        const moved = stepForward(current, mission.wall);
        current = moved.position;
        if (moved.blocked) blocked = true;
      }
      snapshots.push({ ...current });
    }
  };

  visit(program);

  const atGoal = !blocked && current.x === mission.goal.x && current.y === mission.goal.y;
  const passed = atGoal && (!mission.requiredConcept || usedConcept);

  let message = 'El robot se detuvo antes de la meta. Ajusta las instrucciones y vuelve a ejecutar.';
  if (passed) {
    message = 'Ejecución completada. El código llevó al robot hasta la meta.';
  } else if (atGoal && mission.requiredConcept && !usedConcept) {
    message = 'Llegaste a la meta. Incorpora la estructura de control indicada para superar el ejercicio.';
  } else if (blocked) {
    message = 'El robot encontró un obstáculo. Revisa el último giro o avance.';
  }

  return {
    snapshots,
    passed,
    blocked,
    message,
  };
}
