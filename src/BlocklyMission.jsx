import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import 'blockly/blocks';
import * as Spanish from 'blockly/msg/es';
import {
  ArrowCounterClockwise,
  CheckCircle,
  Compass,
  Cpu,
  FastForward,
  Lightbulb,
  ListChecks,
  Pause,
  Play,
  Robot,
  Sparkle,
  Star,
  Wall,
  WarningCircle,
} from '@phosphor-icons/react';
import { BLOCKLY_LESSONS, challengeCategory, getBlocklyChallenge } from './blocklyChallenges.js';
import './BlocklyMission.css';

Blockly.setLocale(Spanish);

const GRID_SIZE = 3;
const MAX_STEPS = 24;
const directions = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];
const moveBlock = { kind: 'block', type: 'ck_move' };
const turns = [
  { kind: 'block', type: 'ck_turn_right' },
  { kind: 'block', type: 'ck_turn_left' },
];

/* Paleta Gamificada de Bloques (Estilo Scratch / Duolingo) */
const toolboxes = {
  'sequence-order': [
    { kind: 'category', name: '🚀 Mover', colour: '#06B6D4', contents: [moveBlock] },
    { kind: 'category', name: '🧭 Girar', colour: '#6366F1', contents: turns },
  ],
  'loop-count': [
    { kind: 'category', name: '🚀 Mover', colour: '#06B6D4', contents: [moveBlock] },
    { kind: 'category', name: '🧭 Girar', colour: '#6366F1', contents: turns },
    { kind: 'category', name: '🔁 Bucles', colour: '#8B5CF6', contents: [{ kind: 'block', type: 'ck_repeat' }] },
  ],
  'if-choice': [
    { kind: 'category', name: '🚀 Mover', colour: '#06B6D4', contents: [moveBlock] },
    { kind: 'category', name: '🧭 Girar', colour: '#6366F1', contents: turns },
    { kind: 'category', name: '⚡ Condición', colour: '#F97316', contents: [{ kind: 'block', type: 'ck_if_wall' }] },
  ],
};

const startBlock = {
  type: 'ck_start',
  message0: '🚩 al comenzar misión',
  nextStatement: null,
  colour: '#F59E0B',
  tooltip: 'El robot Pipo inicia la secuencia cuando presionas Ejecutar.',
};

if (!Blockly.Blocks.ck_start) {
  Blockly.defineBlocksWithJsonArray([
    startBlock,
    {
      type: 'ck_move',
      message0: '🚀 avanzar 1 paso',
      previousStatement: null,
      nextStatement: null,
      colour: '#06B6D4',
      tooltip: 'Avanza una casilla hacia donde mira el robot.',
    },
    {
      type: 'ck_turn_right',
      message0: '↪️ girar a la derecha',
      previousStatement: null,
      nextStatement: null,
      colour: '#6366F1',
      tooltip: 'Gira 90 grados a la derecha.',
    },
    {
      type: 'ck_turn_left',
      message0: '↩️ girar a la izquierda',
      previousStatement: null,
      nextStatement: null,
      colour: '#4F46E5',
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
      colour: '#8B5CF6',
      tooltip: 'Repite los bloques que coloques dentro.',
    },
    {
      type: 'ck_if_wall',
      message0: '⚡ si hay pared delante %1',
      args0: [{ type: 'input_statement', name: 'DO' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#F97316',
      tooltip: 'Ejecuta estos bloques solo si el sensor detecta un muro enfrente.',
    },
  ]);
} else {
  /* Actualizar colores vibrantes incluso en hot-reload */
  if (Blockly.Blocks.ck_start) Blockly.Blocks.ck_start.init = function initStart() {
    this.jsonInit(startBlock);
  };
}

function getEvidence(block) {
  const labels = [];
  let current = block;
  while (current) {
    if (current.type === 'ck_move') labels.push('avanzar');
    else if (current.type === 'ck_turn_right') labels.push('girar derecha');
    else if (current.type === 'ck_turn_left') labels.push('girar izquierda');
    else if (current.type === 'ck_repeat') {
      labels.push(
        `repetir ${current.getFieldValue('TIMES')} veces (${getEvidence(current.getInputTargetBlock('DO')) || 'vacío'})`,
      );
    } else if (current.type === 'ck_if_wall') {
      labels.push(`si hay pared (${getEvidence(current.getInputTargetBlock('DO')) || 'vacío'})`);
    }
    current = current.getNextBlock();
  }
  return labels.join(' -> ');
}

function isBlocked(position, mission) {
  const direction = directions[position.direction];
  const next = { x: position.x + direction.x, y: position.y + direction.y };
  return (
    next.x < 0 ||
    next.x >= GRID_SIZE ||
    next.y < 0 ||
    next.y >= GRID_SIZE ||
    Boolean(mission.wall && next.x === mission.wall.x && next.y === mission.wall.y)
  );
}

function addSeedProgram(workspace, start, specs) {
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
  connectChain(specs, start.nextConnection);
}

function playSnapTone() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.065);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
    osc.onended = () => ctx.close();
  } catch {
    /* Audio opcional */
  }
}

export default function BlocklyMission({
  templateId = 'sequence-order',
  missionId,
  onComplete,
  dialogue = '¡Hola, explorador! Conecta los bloques como piezas de energía para llevarme a la estrella.',
  mood = 'hello',
  soundEnabled = false,
}) {
  const mission = getBlocklyChallenge(missionId, templateId);
  const toolbox = toolboxes[mission.templateId];
  const lesson = BLOCKLY_LESSONS[challengeCategory(mission)] || BLOCKLY_LESSONS.Secuencias;
  const hostRef = useRef(null);
  const workspaceRef = useRef(null);
  const pausedRef = useRef(false);

  const [position, setPosition] = useState(mission.start);
  const [trail, setTrail] = useState([{ x: mission.start.x, y: mission.start.y }]);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stepCursor, setStepCursor] = useState(0);
  const [activeBlockLabel, setActiveBlockLabel] = useState('');
  const [blockCount, setBlockCount] = useState(1);
  const [snapPulse, setSnapPulse] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [message, setMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const workspace = Blockly.inject(hostRef.current, {
      toolbox: { kind: 'categoryToolbox', contents: toolbox },
      renderer: 'zelos',
      sounds: false,
      trashcan: true,
      grid: { spacing: 24, length: 3, colour: '#CBD5E1', snap: true },
      zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 1.25, minScale: 0.65 },
      move: { scrollbars: true, drag: true, wheel: true },
      maxBlocks: 32,
    });
    workspaceRef.current = workspace;
    const start = workspace.newBlock('ck_start');
    start.setDeletable(false);
    start.setMovable(false);
    start.initSvg();
    start.render();
    start.moveBy(22, 24);
    addSeedProgram(workspace, start, mission.seedProgram);
    setBlockCount(workspace.getAllBlocks(false).length);

    const handleWorkspaceEvent = (event) => {
      if (!workspaceRef.current) return;
      setBlockCount(workspaceRef.current.getAllBlocks(false).length);
      if (event.type === Blockly.Events.BLOCK_MOVE && event.newParentId && event.newParentId !== event.oldParentId) {
        setSnapPulse(true);
        if (soundEnabled) playSnapTone();
        window.setTimeout(() => setSnapPulse(false), 650);
      }
    };
    workspace.addChangeListener(handleWorkspaceEvent);

    const resizeObserver = new ResizeObserver(() => Blockly.svgResize(workspace));
    resizeObserver.observe(hostRef.current);
    return () => {
      workspace.removeChangeListener(handleWorkspaceEvent);
      resizeObserver.disconnect();
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, [mission.id]);

  /* Compila la lista lineal de acciones para ejecución fluida o paso a paso */
  const buildActionQueue = () => {
    const workspace = workspaceRef.current;
    if (!workspace) return { actions: [], usedRequired: false, tooMany: false };
    const root = workspace.getTopBlocks(true).find((block) => block.type === 'ck_start');
    const actions = [];
    const simPos = { ...mission.start };
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
          if (isBlocked(simPos, mission)) {
            trace(block.getInputTargetBlock('DO'));
          }
        } else if (['ck_move', 'ck_turn_left', 'ck_turn_right'].includes(block.type)) {
          if (actions.length + 1 > MAX_STEPS) {
            tooMany = true;
            break;
          }
          let blockedStep = false;
          let label = '🚀 Avanzar 1 paso';
          if (block.type === 'ck_turn_right') {
            simPos.direction = (simPos.direction + 1) % 4;
            label = '↪️ Girar derecha';
          } else if (block.type === 'ck_turn_left') {
            simPos.direction = (simPos.direction + 3) % 4;
            label = '↩️ Girar izquierda';
          } else {
            const dir = directions[simPos.direction];
            const next = { ...simPos, x: simPos.x + dir.x, y: simPos.y + dir.y };
            if (
              next.x < 0 ||
              next.x >= GRID_SIZE ||
              next.y < 0 ||
              next.y >= GRID_SIZE ||
              (mission.wall && next.x === mission.wall.x && next.y === mission.wall.y)
            ) {
              blockedStep = true;
              stopped = true;
            } else {
              Object.assign(simPos, next);
            }
          }
          actions.push({
            blockId: block.id,
            label,
            snapshot: { ...simPos },
            blockedStep,
          });
        }
        block = block.getNextBlock();
      }
    };

    trace(root?.getNextBlock());
    return { actions, usedRequired, tooMany, stopped, finalPos: simPos, root };
  };

  const finalizeOutcome = ({ finalPos, stopped, tooMany, usedRequired, root }) => {
    const workspace = workspaceRef.current;
    const nextAttempt = attempts + 1;
    const reachedGoal =
      !stopped && !tooMany && finalPos.x === mission.goal.x && finalPos.y === mission.goal.y;
    const missingRequiredBlock = reachedGoal && mission.requiresBlock && !usedRequired;
    const success = reachedGoal && !missingRequiredBlock;

    setAttempts(nextAttempt);
    setRunning(false);
    setPaused(false);
    pausedRef.current = false;
    setActiveBlockLabel('');
    if (workspace) workspace.highlightBlock(null);

    if (success) {
      setShowConfetti(true);
      window.setTimeout(() => setShowConfetti(false), 3200);
    }

    setMessage(
      tooMany
        ? 'Demasiados pasos. Simplifica la secuencia de bloques y vuelve a probar.'
        : stopped
          ? 'Trayectoria bloqueada. Revisa el giro o el obstáculo antes de avanzar.'
          : missingRequiredBlock
            ? `Meta alcanzada. Incluye ${
                mission.requiresBlock === 'ck_repeat' ? 'el bloque repetir' : 'el bloque «si hay pared»'
              } para completar el objetivo.`
            : success
              ? 'Objetivo completado. El robot llegó a la meta.'
              : 'El robot aún no alcanza la meta. Ajusta los bloques y vuelve a probar.',
    );

    const program = getEvidence(root?.getNextBlock()) || 'sin bloques';
    onComplete({
      success,
      attempts: nextAttempt,
      evidence: `Programa: al comenzar -> ${program}`,
      workspace: workspace ? Blockly.serialization.workspaces.save(workspace) : null,
    });
  };

  const runProgram = async () => {
    const workspace = workspaceRef.current;
    if (!workspace || running) return;
    const plan = buildActionQueue();
    setRunning(true);
    setPaused(false);
    pausedRef.current = false;
    setStepCursor(0);
    setMessage('');
    setShowConfetti(false);
    setPosition({ ...mission.start });
    setTrail([{ x: mission.start.x, y: mission.start.y }]);

    for (let i = 0; i < plan.actions.length; i += 1) {
      while (pausedRef.current) {
        await new Promise((resolve) => window.setTimeout(resolve, 90));
      }
      const step = plan.actions[i];
      setActiveBlockLabel(step.label);
      if (workspaceRef.current) workspaceRef.current.highlightBlock(step.blockId);
      setPosition({ ...step.snapshot });
      setTrail((prev) => [...prev, { x: step.snapshot.x, y: step.snapshot.y }]);
      await new Promise((resolve) => window.setTimeout(resolve, 260));
    }

    finalizeOutcome(plan);
  };

  const togglePause = () => {
    if (!running) return;
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
  };

  const runSingleStep = () => {
    if (running) return;
    const plan = buildActionQueue();
    if (!plan.actions.length) {
      finalizeOutcome(plan);
      return;
    }
    const nextIndex = stepCursor < plan.actions.length ? stepCursor : 0;
    if (nextIndex === 0) {
      setMessage('');
      setShowConfetti(false);
      setTrail([{ x: mission.start.x, y: mission.start.y }]);
    }
    const step = plan.actions[nextIndex];
    setActiveBlockLabel(`Paso ${nextIndex + 1}/${plan.actions.length}: ${step.label}`);
    if (workspaceRef.current) workspaceRef.current.highlightBlock(step.blockId);
    setPosition({ ...step.snapshot });
    setTrail((prev) => [...prev, { x: step.snapshot.x, y: step.snapshot.y }]);

    if (nextIndex + 1 >= plan.actions.length) {
      setStepCursor(0);
      finalizeOutcome(plan);
    } else {
      setStepCursor(nextIndex + 1);
    }
  };

  const resetRun = () => {
    if (running && !pausedRef.current) return;
    pausedRef.current = false;
    setRunning(false);
    setPaused(false);
    setStepCursor(0);
    setActiveBlockLabel('');
    setPosition(mission.start);
    setTrail([{ x: mission.start.x, y: mission.start.y }]);
    setMessage('');
    setShowConfetti(false);
    if (workspaceRef.current) workspaceRef.current.highlightBlock(null);
  };

  const showNextHint = () => setHintIndex((current) => (current >= lesson.hints.length ? 0 : current + 1));

  const missionGoals = [
    `Lleva a Pipo hasta la estrella en (${mission.goal.x + 1}, ${mission.goal.y + 1}).`,
    mission.wall
      ? 'Esquiva el obstáculo energético del tablero.'
      : 'Mantén a Pipo dentro de los límites del mapa.',
    mission.requiresBlock === 'ck_repeat'
      ? 'Usa el bloque morado «repetir» para ahorrar energía.'
      : mission.requiresBlock === 'ck_if_wall'
        ? 'Usa el sensor naranja «si hay pared» para decidir.'
        : 'Ordena los bloques de arriba hacia abajo sin pasos extra.',
  ];

  return (
    <div className="blockly-mission">
      <div className="blockly-three-panel-grid">
        {/* PANEL IZQUIERDO: Guía Pipo + Objetivos en Viñetas + Pistas */}
        <aside className="mission-briefing-panel" aria-label="Instrucciones de la misión">
          <div className={`pipo-guide-card mood-${mood}`} aria-live="polite">
            <div className="pipo-avatar-orb">
              <Cpu size={28} weight="duotone" />
              <span className="pipo-status-dot" />
            </div>
            <div className="pipo-speech-bubble">
              <div className="pipo-speech-header">
                <b>
                  {mood === 'party'
                    ? '¡Pipo celebra tu código!'
                    : mood === 'thinking'
                      ? 'Pipo analiza la ruta...'
                      : 'Guía Pipo · En línea'}
                </b>
                <span className="pipo-skill-chip">{mission.skill}</span>
              </div>
              <p>{dialogue}</p>
            </div>
          </div>

          <div className="mission-objectives-box">
            <div className="objectives-box-header">
              <ListChecks size={18} weight="bold" />
              <span>Objetivos de la misión</span>
            </div>
            <ul className="objectives-bullet-list">
              {missionGoals.map((goalText, idx) => (
                <li key={idx}>
                  <span className="objective-bullet-index">{idx + 1}</span>
                  <span>{goalText}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mission-concept-capsule">
            <span className="blockly-lesson-tag">
              <Compass size={14} weight="bold" /> Cápsula de poder: {challengeCategory(mission)}
            </span>
            <p>{lesson.explanation}</p>
            <button
              type="button"
              className="blockly-hint-button"
              aria-expanded={hintIndex > 0}
              onClick={showNextHint}
            >
              <Lightbulb size={16} weight="duotone" />
              <span>
                {hintIndex === 0
                  ? 'Desbloquear pista'
                  : hintIndex < lesson.hints.length
                    ? `Siguiente pista (${hintIndex}/${lesson.hints.length})`
                    : 'Ocultar pistas'}
              </span>
            </button>

            {hintIndex > 0 && (
              <div className="blockly-hint-card" role="status">
                <b>
                  <Sparkle size={14} weight="fill" /> Pista {hintIndex} de {lesson.hints.length}
                </b>
                <span>{lesson.hints[hintIndex - 1]}</span>
              </div>
            )}
          </div>
        </aside>

        {/* PANEL CENTRAL: Área de Bloques y Espacio de Trabajo */}
        <section className="blockly-editor-panel" aria-label="Espacio de trabajo de bloques">
          <div className="editor-panel-toolbar">
            <div className="editor-toolbar-title">
              <span className="editor-dot cyan" />
              <span className="editor-dot violet" />
              <span className="editor-dot lime" />
              <b>Constructor de Bloques</b>
            </div>
            <div className="editor-toolbar-badges">
              {snapPulse && (
                <span className="snap-feedback-pill" role="status">
                  ⚡ ¡Bloque ensamblado!
                </span>
              )}
              <span className="block-counter-pill">
                Bloques: <b>{blockCount}</b> / 32
              </span>
            </div>
          </div>
          <div className="blockly-editor-area">
            <div ref={hostRef} className="blockly-host" aria-label="Editor de programación por bloques" />
          </div>
        </section>

        {/* PANEL DERECHO: Visualizador / Escenario del Juego */}
        <section className="robot-game" aria-label="Escenario de simulación">
          {showConfetti && (
            <div className="confetti-burst" aria-hidden="true">
              {Array.from({ length: 18 }, (_, idx) => (
                <span key={idx} className={`confetti-piece c-${idx % 6}`} />
              ))}
            </div>
          )}

          <div className="robot-game-header">
            <div className="robot-game-title">
              <span className="stage-badge">{mission.level}</span>
              <b>{mission.name}</b>
            </div>
            <span className="stage-coords-pill">
              Pos: ({position.x + 1}, {position.y + 1})
            </span>
          </div>

          <div className="robot-grid" role="img" aria-label="Tablero del reto. Lleva el robot hasta la meta.">
            {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
              const x = index % GRID_SIZE;
              const y = Math.floor(index / GRID_SIZE);
              const isRobot = position.x === x && position.y === y;
              const isGoal = mission.goal.x === x && mission.goal.y === y;
              const isWall = mission.wall?.x === x && mission.wall?.y === y;
              const isVisited = trail.some((pt) => pt.x === x && pt.y === y) && !isRobot;
              return (
                <div
                  className={`robot-cell${isRobot ? ' robot-cell-active' : ''}${isGoal ? ' robot-cell-goal' : ''}${
                    isWall ? ' robot-cell-wall' : ''
                  }${isVisited ? ' robot-cell-trail' : ''}`}
                  key={index}
                >
                  <span className="cell-coord-tag">
                    {x + 1},{y + 1}
                  </span>
                  {isRobot ? (
                    <span className="robot-sprite" style={{ transform: `rotate(${position.direction * 90}deg)` }}>
                      <Robot size={30} weight="duotone" />
                    </span>
                  ) : isGoal ? (
                    <Star size={28} weight="fill" className="goal-icon" />
                  ) : isWall ? (
                    <Wall size={26} weight="duotone" className="wall-icon" />
                  ) : isVisited ? (
                    <span className="trail-energy-dot" />
                  ) : null}
                </div>
              );
            })}
          </div>

          {activeBlockLabel && (
            <div className="active-step-monitor" role="status">
              <FastForward size={14} weight="fill" />
              <span>{activeBlockLabel}</span>
            </div>
          )}

          {/* Controles Estilo Reproductor Multimedia */}
          <div className="robot-controls">
            <button type="button" className="game-check" onClick={runProgram} disabled={running}>
              <Play size={16} weight="fill" />
              <span>{running ? 'Ejecutando' : 'Probar'}</span>
            </button>

            <div className="media-secondary-controls">
              <button
                type="button"
                className="media-ctrl-btn step-btn"
                onClick={runSingleStep}
                disabled={running}
                title="Ejecutar un bloque a la vez"
              >
                <FastForward size={15} weight="bold" />
                <span>Paso a paso</span>
              </button>

              {running && (
                <button
                  type="button"
                  className="media-ctrl-btn pause-btn"
                  onClick={togglePause}
                  title={paused ? 'Reanudar ejecución' : 'Pausar ejecución'}
                >
                  {paused ? <Play size={15} weight="fill" /> : <Pause size={15} weight="fill" />}
                  <span>{paused ? 'Reanudar' : 'Pausa'}</span>
                </button>
              )}

              <button
                type="button"
                className="robot-reset"
                onClick={resetRun}
                disabled={running && !paused}
                title="Reiniciar escenario"
              >
                <ArrowCounterClockwise size={15} weight="bold" />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>

          <small className="blockly-attempts">Intentos en esta misión: {attempts}</small>
        </section>
      </div>

      {message && (
        <p className={message.startsWith('Objetivo completado') ? 'blockly-feedback won' : 'blockly-feedback'} role="status">
          {message.startsWith('Objetivo completado') ? (
            <CheckCircle size={20} weight="fill" />
          ) : (
            <WarningCircle size={20} weight="fill" />
          )}
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}
