import * as Blockly from 'blockly';
import 'blockly/blocks';
import * as Spanish from 'blockly/msg/es';
import { isBlockedAhead, stepForward, turnLeft, turnRight } from './gridPhysics.js';

export const BLOCKLY_MAX_BLOCKS = 32;
export const BLOCKLY_MAX_STEPS = 24;

const BLOCK_PALETTE = {
  start: '#F59E0B',
  move: '#06B6D4',
  turnRight: '#6366F1',
  turnLeft: '#4F46E5',
  repeat: '#8B5CF6',
  ifWall: '#F97316',
  gridLine: '#CBD5E1',
};

export const BLOCKLY_GRID_COLOUR = BLOCK_PALETTE.gridLine;

const moveBlock = { kind: 'block', type: 'ck_move' };
const turnBlocks = [
  { kind: 'block', type: 'ck_turn_right' },
  { kind: 'block', type: 'ck_turn_left' },
];

export const BLOCKLY_TOOLBOXES = {
  'sequence-order': [
    { kind: 'category', name: '🚀 Mover', colour: BLOCK_PALETTE.move, contents: [moveBlock] },
    { kind: 'category', name: '🧭 Girar', colour: BLOCK_PALETTE.turnRight, contents: turnBlocks },
  ],
  'loop-count': [
    { kind: 'category', name: '🚀 Mover', colour: BLOCK_PALETTE.move, contents: [moveBlock] },
    { kind: 'category', name: '🧭 Girar', colour: BLOCK_PALETTE.turnRight, contents: turnBlocks },
    {
      kind: 'category',
      name: '🔁 Bucles',
      colour: BLOCK_PALETTE.repeat,
      contents: [{ kind: 'block', type: 'ck_repeat' }],
    },
  ],
  'if-choice': [
    { kind: 'category', name: '🚀 Mover', colour: BLOCK_PALETTE.move, contents: [moveBlock] },
    { kind: 'category', name: '🧭 Girar', colour: BLOCK_PALETTE.turnRight, contents: turnBlocks },
    {
      kind: 'category',
      name: '⚡ Condición',
      colour: BLOCK_PALETTE.ifWall,
      contents: [{ kind: 'block', type: 'ck_if_wall' }],
    },
  ],
};

const START_BLOCK_DEF = {
  type: 'ck_start',
  message0: '🚩 al comenzar misión',
  nextStatement: null,
  colour: BLOCK_PALETTE.start,
  tooltip: 'El robot Pipo inicia la secuencia cuando presionas Ejecutar.',
};

const CUSTOM_BLOCKS = [
  START_BLOCK_DEF,
  {
    type: 'ck_move',
    message0: '🚀 avanzar 1 paso',
    previousStatement: null,
    nextStatement: null,
    colour: BLOCK_PALETTE.move,
    tooltip: 'Avanza una casilla hacia donde mira el robot.',
  },
  {
    type: 'ck_turn_right',
    message0: '↪️ girar a la derecha',
    previousStatement: null,
    nextStatement: null,
    colour: BLOCK_PALETTE.turnRight,
    tooltip: 'Gira 90 grados a la derecha.',
  },
  {
    type: 'ck_turn_left',
    message0: '↩️ girar a la izquierda',
    previousStatement: null,
    nextStatement: null,
    colour: BLOCK_PALETTE.turnLeft,
    tooltip: 'Gira 90 grados a la izquierda.',
  },
  {
    type: 'ck_repeat',
    message0: '🔁 repetir %1 veces %2',
    args0: [
      { type: 'field_number', name: 'TIMES', value: 2, min: 1, max: 8 },
      { type: 'input_statement', name: 'DO' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: BLOCK_PALETTE.repeat,
    tooltip: 'Repite los bloques que coloques dentro.',
  },
  {
    type: 'ck_if_wall',
    message0: '⚡ si hay pared delante %1',
    args0: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: null,
    nextStatement: null,
    colour: BLOCK_PALETTE.ifWall,
    tooltip: 'Ejecuta estos bloques solo si el sensor detecta un muro enfrente.',
  },
];

let blocklyRegistered = false;

/**
 * Configura el idioma español y registra los bloques personalizados de CodeKids de forma idempotente.
 */
export function ensureBlocklyRegistered() {
  if (!blocklyRegistered) {
    Blockly.setLocale(Spanish);
    blocklyRegistered = true;
  }
  if (!Blockly.Blocks.ck_start) {
    Blockly.defineBlocksWithJsonArray(CUSTOM_BLOCKS);
  } else {
    Blockly.Blocks.ck_start.init = function initStart() {
      this.jsonInit(START_BLOCK_DEF);
    };
  }
}

/**
 * Extrae una representación textual legible de la cadena de bloques conectada.
 * @param {import('blockly').Block | null} block
 * @returns {string}
 */
export function extractBlocklyEvidence(block) {
  const labels = [];
  let current = block;
  while (current) {
    if (current.type === 'ck_move') labels.push('avanzar');
    else if (current.type === 'ck_turn_right') labels.push('girar derecha');
    else if (current.type === 'ck_turn_left') labels.push('girar izquierda');
    else if (current.type === 'ck_repeat') {
      const inner = extractBlocklyEvidence(current.getInputTargetBlock('DO')) || 'vacío';
      labels.push(`repetir ${current.getFieldValue('TIMES')} veces (${inner})`);
    } else if (current.type === 'ck_if_wall') {
      const inner = extractBlocklyEvidence(current.getInputTargetBlock('DO')) || 'vacío';
      labels.push(`si hay pared (${inner})`);
    }
    current = current.getNextBlock();
  }
  return labels.join(' -> ');
}

/**
 * Inserta y conecta bloques iniciales prearmados en misiones de depuración.
 */
export function addSeedProgram(workspace, startBlock, specs) {
  if (!specs?.length) return;
  const connectChain = (items, firstConnection) => {
    let connection = firstConnection;
    items.forEach((spec) => {
      const block = workspace.newBlock(spec.type);
      if (spec.times) block.setFieldValue(String(spec.times), 'TIMES');
      block.initSvg();
      block.render();
      if (connection && block.previousConnection) connection.connect(block.previousConnection);
      if (spec.body?.length) connectChain(spec.body, block.getInput('DO').connection);
      connection = block.nextConnection;
    });
  };
  connectChain(specs, startBlock.nextConnection);
}

/**
 * Compila el AST visual de Blockly en una cola lineal de pasos de simulación.
 * @param {import('blockly').WorkspaceSvg | null} workspace
 * @param {Record<string, any>} mission
 */
export function buildActionQueue(workspace, mission) {
  if (!workspace || !mission) {
    return { actions: [], usedRequired: false, tooMany: false, stopped: false, finalPos: mission?.start, root: null };
  }

  const root = workspace.getTopBlocks(true).find((block) => block.type === 'ck_start') || null;
  const actions = [];
  let simPos = { ...mission.start };
  let usedRequired = false;
  let tooMany = false;
  let stopped = false;

  const trace = (first) => {
    let block = first;
    while (block && !stopped && !tooMany) {
      if (block.type === 'ck_repeat') {
        const count = Number(block.getFieldValue('TIMES')) || 1;
        if (count > 1 && block.getInputTargetBlock('DO')) usedRequired = true;
        for (let i = 0; i < count && !stopped && !tooMany; i += 1) {
          trace(block.getInputTargetBlock('DO'));
        }
      } else if (block.type === 'ck_if_wall') {
        usedRequired = true;
        if (isBlockedAhead(simPos, mission.wall)) {
          trace(block.getInputTargetBlock('DO'));
        }
      } else if (['ck_move', 'ck_turn_left', 'ck_turn_right'].includes(block.type)) {
        if (actions.length + 1 > BLOCKLY_MAX_STEPS) {
          tooMany = true;
          break;
        }
        let blockedStep = false;
        let label = '🚀 Avanzar 1 paso';
        if (block.type === 'ck_turn_right') {
          simPos = turnRight(simPos);
          label = '↪️ Girar derecha';
        } else if (block.type === 'ck_turn_left') {
          simPos = turnLeft(simPos);
          label = '↩️ Girar izquierda';
        } else {
          const moved = stepForward(simPos, mission.wall);
          simPos = moved.position;
          if (moved.blocked) {
            blockedStep = true;
            stopped = true;
          }
        }
        actions.push({ blockId: block.id, label, snapshot: { ...simPos }, blockedStep });
      }
      block = block.getNextBlock();
    }
  };

  trace(root?.getNextBlock() || null);
  return { actions, usedRequired, tooMany, stopped, finalPos: simPos, root };
}

/**
 * Evalúa el resultado final de la ejecución Blockly frente a los objetivos de la misión.
 */
export function evaluateBlocklyOutcome(plan, mission, workspace) {
  const { finalPos, stopped, tooMany, usedRequired, root } = plan;
  const reachedGoal =
    !stopped &&
    !tooMany &&
    finalPos?.x === mission.goal.x &&
    finalPos?.y === mission.goal.y;
  const missingRequiredBlock = Boolean(reachedGoal && mission.requiresBlock && !usedRequired);
  const success = reachedGoal && !missingRequiredBlock;

  let feedbackMessage = 'El robot aún no alcanza la meta. Ajusta los bloques y vuelve a probar.';
  if (tooMany) {
    feedbackMessage = 'Demasiados pasos. Simplifica la secuencia de bloques y vuelve a probar.';
  } else if (stopped) {
    feedbackMessage = 'Trayectoria bloqueada. Revisa el giro o el obstáculo antes de avanzar.';
  } else if (missingRequiredBlock) {
    const requiredLabel =
      mission.requiresBlock === 'ck_repeat' ? 'el bloque repetir' : 'el bloque «si hay pared»';
    feedbackMessage = `Meta alcanzada. Incluye ${requiredLabel} para completar el objetivo.`;
  } else if (success) {
    feedbackMessage = 'Objetivo completado. El robot llegó a la meta.';
  }

  const program = extractBlocklyEvidence(root?.getNextBlock() || null) || 'sin bloques';
  return {
    success,
    isError: stopped || tooMany,
    feedbackMessage,
    evidence: `Programa: al comenzar -> ${program}`,
    workspaceSnapshot: workspace ? Blockly.serialization.workspaces.save(workspace) : null,
  };
}
