import { useEffect, useRef, useState } from 'react';
import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  Code,
  Coins,
  Cpu,
  Lightbulb,
  Lightning,
  Lock,
  Play,
  Robot,
  Star,
  TerminalWindow,
  Wall,
  WarningCircle,
} from '@phosphor-icons/react';
import { FormattedInstructions } from './CodeWorldLab.jsx';
import {
  evaluatePythonFunctionMission,
  getExpansionMissionsByWorld,
} from './expansionCatalog.js';
import './PythonMission.css';

const baseGridMissions = [
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

const directionVectors = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];

function parsePython(source) {
  const lines = source
    .split('\n')
    .map((raw, index) => {
      const uncommented = raw.replace(/#.*$/, '').replace(/\s+$/, '');
      if (!uncommented.trim()) return null;
      if (uncommented.includes('\t')) throw new Error(`Usa espacios en lugar de tabulaciones en la línea ${index + 1}.`);
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
      if (line.indent > indent) throw new Error(`Revisa la sangría en la línea ${line.number}.`);

      const repeat = line.text.match(/^for\s+[a-zA-Z_]\w*\s+in\s+range\(\s*(\d+)\s*\)\s*:\s*$/);
      const conditional = /^if\s+hay_pared\(\)\s*:\s*$/.test(line.text);
      if (repeat || conditional) {
        const next = lines[cursor + 1];
        if (!next || next.indent !== indent + 4) throw new Error(`Agrega cuatro espacios al bloque debajo de la línea ${line.number}.`);
        const count = repeat ? Number(repeat[1]) : undefined;
        if (repeat && (count < 1 || count > 10)) throw new Error('Usa un número entre 1 y 10 dentro de range().');
        const nested = parseBlock(cursor + 1, indent + 4);
        if (!nested.nodes.length) throw new Error(`El bloque de la línea ${line.number} necesita al menos una instrucción.`);
        nodes.push(repeat ? { type: 'for', count, body: nested.nodes } : { type: 'if-wall', body: nested.nodes });
        cursor = nested.index;
        continue;
      }

      const command = line.text.match(/^(avanzar|girar_derecha|girar_izquierda)\(\)$/);
      if (!command) throw new Error(`No se reconoce «${line.text}» en la línea ${line.number}. Usa avanzar(), girar_derecha() o girar_izquierda().`);
      nodes.push({ type: command[1] });
      cursor += 1;
    }
    return { nodes, index: cursor };
  };

  if (!lines.length) throw new Error('Escribe al menos una instrucción para ejecutar.');
  if (lines[0].indent !== 0) throw new Error('La primera línea debe comenzar sin espacios iniciales.');
  return parseBlock(0, 0).nodes;
}

function blockedAhead(position, mission) {
  const direction = directionVectors[position.direction];
  const next = { x: position.x + direction.x, y: position.y + direction.y };
  return (
    next.x < 0 ||
    next.x > 2 ||
    next.y < 0 ||
    next.y > 2 ||
    Boolean(mission.wall && mission.wall.x === next.x && mission.wall.y === next.y)
  );
}

function buildAllPythonMissions(customMissions = null) {
  const rawAdvanced = getExpansionMissionsByWorld('laboratorio-python', customMissions).filter(
    (m) => m.reglas_validacion?.motor === 'python-runner',
  );

  const advancedMissions = rawAdvanced.map((item, idx) => ({
    id: item.slug,
    mode: 'function',
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

  return [...baseGridMissions, ...advancedMissions];
}

export default function PythonMission({
  completed = [],
  initialMissionId = '',
  customMissions = null,
  onComplete,
  onClose,
}) {
  const missions = buildAllPythonMissions(customMissions);

  const resolveInitialIndex = () => {
    if (initialMissionId) {
      const idx = missions.findIndex((m) => m.id === initialMissionId);
      if (idx >= 0) return idx;
    }
    const firstUnfinished = missions.findIndex((m) => !completed.includes(m.id));
    return firstUnfinished < 0 ? missions.length - 1 : firstUnfinished;
  };

  const [selectedIndex, setSelectedIndex] = useState(resolveInitialIndex);
  const mission = missions[selectedIndex] || missions[0];
  const [code, setCode] = useState(mission.starter);
  const [position, setPosition] = useState(mission.start || { x: 0, y: 2, direction: 0 });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState('');
  const [success, setSuccess] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [hintIndex, setHintIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [mobileTab, setMobileTab] = useState('editor');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!initialMissionId) return;
    const idx = missions.findIndex((m) => m.id === initialMissionId);
    if (idx >= 0 && idx !== selectedIndex) {
      setSelectedIndex(idx);
      setCode(missions[idx].starter);
      setPosition(missions[idx].start || { x: 0, y: 2, direction: 0 });
      setResult('');
      setSuccess(false);
      setTestResults([]);
      setHintIndex(0);
      setAttempts(0);
    }
  }, [initialMissionId]);

  const insertSnippet = (snippet, cursorOffset) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? code.length;
    const end = textarea.selectionEnd ?? code.length;
    const next = `${code.slice(0, start)}${snippet}${code.slice(end)}`;
    setCode(next);
    setResult('');
    setSuccess(false);
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = typeof cursorOffset === 'number' ? start + cursorOffset : start + snippet.length;
      textarea.setSelectionRange(pos, pos);
    });
  };

  // Etapa 1 (inicio Robot) y Etapa 4 (inicio Expansión Avanzada) desbloqueadas directamente
  const canUnlock = (index) => index === 0 || index === 3 || completed.includes(missions[index - 1]?.id);

  const selectMission = (index) => {
    if (!canUnlock(index)) return;
    setSelectedIndex(index);
    setCode(missions[index].starter);
    setPosition(missions[index].start || { x: 0, y: 2, direction: 0 });
    setResult('');
    setSuccess(false);
    setTestResults([]);
    setHintIndex(0);
    setAttempts(0);
  };

  const runCode = async () => {
    if (running) return;

    if (typeof window !== 'undefined' && window.innerWidth <= 860) {
      setMobileTab('preview');
    }

    if (mission.mode === 'function') {
      setAttempts((count) => count + 1);
      const outcome = evaluatePythonFunctionMission(code, mission.validation);
      setSuccess(outcome.passed);
      setResult(outcome.message);
      setTestResults(outcome.testResults || []);
      if (outcome.passed && onComplete) {
        onComplete(mission.id, mission.xpReward, mission.coinReward, code, attempts + 1);
      }
      return;
    }

    setRunning(true);
    setResult('');
    setSuccess(false);
    setPosition(mission.start);
    setAttempts((count) => count + 1);
    const current = { ...mission.start };
    const runtime = { steps: 0, blocked: false, usedConcept: false };
    try {
      const program = parsePython(code);
      const execute = async (nodes) => {
        for (const node of nodes) {
          if (runtime.blocked) return;
          if (node.type === 'for') {
            if (node.count > 1) runtime.usedConcept = true;
            for (let index = 0; index < node.count && !runtime.blocked; index += 1) await execute(node.body);
            continue;
          }
          if (node.type === 'if-wall') {
            runtime.usedConcept = true;
            if (blockedAhead(current, mission)) await execute(node.body);
            continue;
          }
          runtime.steps += 1;
          if (runtime.steps > 40) throw new Error('El programa supera el límite de pasos. Simplifica la ruta.');
          if (node.type === 'girar_derecha') current.direction = (current.direction + 1) % 4;
          else if (node.type === 'girar_izquierda') current.direction = (current.direction + 3) % 4;
          else {
            const vector = directionVectors[current.direction];
            const next = { ...current, x: current.x + vector.x, y: current.y + vector.y };
            if (
              next.x < 0 ||
              next.x > 2 ||
              next.y < 0 ||
              next.y > 2 ||
              (mission.wall && mission.wall.x === next.x && mission.wall.y === next.y)
            ) {
              runtime.blocked = true;
            } else {
              Object.assign(current, next);
            }
          }
          setPosition({ ...current });
          await new Promise((resolve) => window.setTimeout(resolve, 180));
        }
      };
      await execute(program);
      const atGoal = !runtime.blocked && current.x === mission.goal.x && current.y === mission.goal.y;
      const passed = atGoal && (!mission.requiredConcept || runtime.usedConcept);
      setSuccess(passed);
      setResult(
        passed
          ? 'Ejecución completada. El código llevó al robot hasta la meta.'
          : atGoal && mission.requiredConcept && !runtime.usedConcept
            ? 'Llegaste a la meta. Incorpora la estructura de control indicada para superar el ejercicio.'
            : runtime.blocked
              ? 'El robot encontró un obstáculo. Revisa el último giro o avance.'
              : 'El robot se detuvo antes de la meta. Ajusta las instrucciones y vuelve a ejecutar.',
      );
      if (passed && onComplete) {
        onComplete(mission.id, mission.xpReward, mission.coinReward, code, attempts + 1);
      }
    } catch (error) {
      setResult(error.message);
    } finally {
      setRunning(false);
    }
  };

  const nextHint = () => setHintIndex((index) => (index >= mission.hints.length ? 0 : index + 1));
  const insertTab = (event) => {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    const editor = event.currentTarget;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const next = `${code.slice(0, start)}    ${code.slice(end)}`;
    setCode(next);
    requestAnimationFrame(() => {
      editor.selectionStart = start + 4;
      editor.selectionEnd = start + 4;
    });
  };

  return (
    <main id="top" className="apple-page fullscreen-exercise-page">
      <div className="fullscreen-exercise-container">
        <header className="workspace-topbar python-topbar-expanded">
          <div className="workspace-topbar-left">
            <button type="button" className="workspace-back-btn" onClick={onClose}>
              <ArrowLeft size={16} weight="bold" />
              <span>Volver a mi espacio</span>
            </button>
            <div className="workspace-title-group">
              <span className="modal-meta-label">
                PYTHON · +{mission.xpReward} XP y +{mission.coinReward} monedas
              </span>
              <h1 id="python-title">Laboratorio de Código Python</h1>
              <p className="python-intro">
                {mission.mode === 'function'
                  ? mission.explanation
                  : 'De los bloques a la sintaxis escrita: resuelve cada ejercicio paso a paso.'}
              </p>
            </div>
          </div>

          <nav className="python-stages python-stages-six" aria-label="Niveles de Python">
            {missions.map((item, index) => {
              const isCompleted = completed.includes(item.id);
              const unlocked = canUnlock(index);
              return (
                <button
                  type="button"
                  key={item.id}
                  disabled={!unlocked}
                  aria-current={index === selectedIndex ? 'step' : undefined}
                  className={`python-stage${index === selectedIndex ? ' active' : ''}${isCompleted ? ' completed' : ''}`}
                  onClick={() => selectMission(index)}
                >
                  <span className="python-stage-badge">
                    {isCompleted ? (
                      <Check size={13} weight="bold" />
                    ) : unlocked ? (
                      item.mode === 'function' ? <Cpu size={13} weight="duotone" /> : <Code size={13} weight="regular" />
                    ) : (
                      <Lock size={13} weight="regular" />
                    )}
                  </span>
                  <span className="python-stage-copy">
                    <small>{item.stageLabel}</small>
                    <b>{item.title}</b>
                  </span>
                </button>
              );
            })}
          </nav>
        </header>

        <div className="python-teaching-row mission-brief-card">
          <div className="mission-brief-content">
            <div className="mission-brief-badges">
              <span className="python-teaching-label">
                {mission.mode === 'function' ? 'Misión Avanzada de Expansión' : 'Fundamento'}
              </span>
              <span className="mission-reward-tag">
                <Lightning size={13} weight="fill" /> +{mission.xpReward} XP
              </span>
              <span className="mission-reward-tag coins">
                <Coins size={13} weight="fill" /> +{mission.coinReward} Monedas
              </span>
            </div>
            {mission.mode === 'function' && mission.instructionsMd ? (
              <FormattedInstructions markdown={mission.instructionsMd} />
            ) : (
              <p>{mission.explanation}</p>
            )}
          </div>
          <button type="button" onClick={nextHint}>
            <Lightbulb size={15} weight="regular" />
            <span>
              {hintIndex === 0
                ? `Ver pista (0/${mission.hints.length})`
                : hintIndex < mission.hints.length
                  ? `Siguiente pista (${hintIndex}/${mission.hints.length})`
                  : 'Ocultar pistas'}
            </span>
          </button>
        </div>

        {hintIndex > 0 && (
          <p className="python-hint" role="status">
            <b>Pista {hintIndex} de {mission.hints.length}</b>
            <span>{mission.hints[hintIndex - 1]}</span>
          </p>
        )}

        <div className="python-mobile-tabs-bar" role="tablist" aria-label="Selector de vista de Python">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'editor'}
            className={`python-mobile-tab-btn${mobileTab === 'editor' ? ' active' : ''}`}
            onClick={() => setMobileTab('editor')}
          >
            <span className="tab-icon">💻</span>
            <span>Editor Python</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'preview'}
            className={`python-mobile-tab-btn${mobileTab === 'preview' ? ' active' : ''}`}
            onClick={() => setMobileTab('preview')}
          >
            <span className="tab-icon">{mission.mode === 'function' ? '🛰️' : '🤖'}</span>
            <span>{mission.mode === 'function' ? 'Consola Orbital' : 'Tablero del Robot'}</span>
            {running && <span className="tab-live-pulse" />}
          </button>
        </div>

        <div className={`python-workspace mobile-active-${mobileTab}`}>
          <div className="python-editor-card tab-panel-python-editor">
            <div className="python-editor-header">
              <span>
                <TerminalWindow size={15} weight="regular" /> main.py
              </span>
              <button
                type="button"
                onClick={() => {
                  setCode(mission.starter);
                  setResult('');
                  setSuccess(false);
                  setTestResults([]);
                }}
              >
                <ArrowCounterClockwise size={13} weight="regular" /> Restaurar código
              </button>
            </div>

            <div className="python-mobile-syntax-bar" aria-label="Teclado rápido de código Python">
              {mission.mode === 'function' ? (
                <>
                  <button type="button" className="syntax-chip" onClick={() => insertSnippet('    ')}>
                    <span>⇥ 4 esp</span>
                  </button>
                  <button type="button" className="syntax-chip" onClick={() => insertSnippet('if :\n        ', 3)}>
                    <code>if ...:</code>
                  </button>
                  <button type="button" className="syntax-chip" onClick={() => insertSnippet('for item in :\n        ', 12)}>
                    <code>for ... in:</code>
                  </button>
                  <button type="button" className="syntax-chip" onClick={() => insertSnippet('return ')}>
                    <code>return</code>
                  </button>
                  <button type="button" className="syntax-chip" onClick={() => insertSnippet('.append()', 8)}>
                    <code>.append()</code>
                  </button>
                  <button type="button" className="syntax-chip" onClick={() => insertSnippet(' in catalogo:')}>
                    <code>in catalogo:</code>
                  </button>
                  <button type="button" className="syntax-chip char-chip" onClick={() => insertSnippet(':')}>
                    <span>:</span>
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="syntax-chip" onClick={() => insertSnippet('avanzar()\n')}>
                    <code>avanzar()</code>
                  </button>
                  <button type="button" className="syntax-chip" onClick={() => insertSnippet('girar_derecha()\n')}>
                    <code>girar_derecha()</code>
                  </button>
                  <button type="button" className="syntax-chip" onClick={() => insertSnippet('girar_izquierda()\n')}>
                    <code>girar_izquierda()</code>
                  </button>
                  <button type="button" className="syntax-chip" onClick={() => insertSnippet('for paso in range(2):\n    ', 20)}>
                    <code>for ... in range():</code>
                  </button>
                  <button type="button" className="syntax-chip" onClick={() => insertSnippet('if hay_pared():\n    ', 19)}>
                    <code>if hay_pared():</code>
                  </button>
                  <button type="button" className="syntax-chip indent-chip" onClick={() => insertSnippet('    ')}>
                    <span>⇥ 4 esp</span>
                  </button>
                  <button type="button" className="syntax-chip char-chip" onClick={() => insertSnippet(':')}>
                    <span>:</span>
                  </button>
                  <button type="button" className="syntax-chip char-chip" onClick={() => insertSnippet('()', 1)}>
                    <span>( )</span>
                  </button>
                </>
              )}
            </div>

            <label className="sr-only" htmlFor="python-code-editor">Editor de código Python</label>
            <textarea
              ref={textareaRef}
              id="python-code-editor"
              aria-label="Escribe tu código Python"
              spellCheck="false"
              autoCapitalize="off"
              autoCorrect="off"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setResult('');
                setSuccess(false);
              }}
              onKeyDown={insertTab}
            />
            <div className="python-editor-footer">
              <small>
                {mission.mode === 'function' ? (
                  <>
                    Función objetivo: <code>{mission.validation?.funcion_objetivo}()</code> · Sangría de 4 espacios
                  </>
                ) : (
                  <>
                    Funciones disponibles: <code>avanzar()</code>, <code>girar_derecha()</code>, <code>girar_izquierda()</code>
                  </>
                )}
              </small>
              <button type="button" className="python-run" onClick={runCode} disabled={running}>
                <Play size={15} weight="fill" />
                <span>
                  {running
                    ? 'Ejecutando en Tablero...'
                    : mission.mode === 'function'
                      ? 'Validar Módulo ▶️'
                      : 'Ejecutar código ▶️'}
                </span>
              </button>
            </div>
          </div>

          <div className="python-preview code-lab-preview tab-panel-python-preview">
            <div className="python-preview-title">
              <span>{mission.stageLabel}</span>
              <b>{mission.objective}</b>
            </div>

            {mission.mode === 'function' ? (
              <div className="js-console-stage">
                {testResults.length > 0 ? (
                  <ul className="lab-test-list" aria-label="Casos de prueba del laboratorio Python">
                    {testResults.map((test) => (
                      <li key={test.id} className={`lab-test-item ${test.passed ? 'pass' : 'fail'}`}>
                        <span className="lab-test-status">{test.passed ? '✓' : '✕'}</span>
                        <div className="lab-test-copy">
                          <b>{test.description}</b>
                          <small>
                            Entrada: <code>{test.input}</code> → Retorno: <code>{test.actual}</code>
                            {!test.passed && (
                              <> · Esperado: <code>{test.expected}</code></>
                            )}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="lab-console-placeholder">
                    <Cpu size={34} weight="duotone" />
                    <p>
                      Completa tu función Python y presiona <b>«Validar Módulo»</b> para ejecutar la batería de pruebas orbitales.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="python-grid" role="img" aria-label="Tablero del reto de Python">
                {Array.from({ length: 9 }, (_, index) => {
                  const x = index % 3;
                  const y = Math.floor(index / 3);
                  const robot = position.x === x && position.y === y;
                  const goal = mission.goal.x === x && mission.goal.y === y;
                  const wall = mission.wall?.x === x && mission.wall?.y === y;
                  return (
                    <span
                      className={`python-cell${robot ? ' robot' : ''}${goal ? ' goal' : ''}${wall ? ' wall' : ''}`}
                      key={index}
                    >
                      {robot ? (
                        <i style={{ transform: `rotate(${position.direction * 90}deg)` }}>
                          <Robot size={32} weight="duotone" />
                        </i>
                      ) : goal ? (
                        <Star size={30} weight="fill" />
                      ) : wall ? (
                        <Wall size={30} weight="duotone" />
                      ) : null}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="python-preview-actions-mobile">
              <button
                type="button"
                className="python-back-to-editor-btn"
                onClick={() => setMobileTab('editor')}
              >
                <span>💻 Volver al Editor de Código</span>
              </button>
              <button
                type="button"
                className="python-preview-run-btn"
                onClick={runCode}
                disabled={running}
              >
                <Play size={15} weight="fill" />
                <span>{running ? 'Probando...' : 'Reejecutar'}</span>
              </button>
            </div>
            <small className="python-attempts">Intentos realizados: {attempts}</small>
          </div>
        </div>

        {result && (
          <div className={`python-result${success ? ' success' : ''}`} role="status">
            {success ? <CheckCircle size={20} weight="fill" /> : <WarningCircle size={20} weight="regular" />}
            <p>{result}</p>
            {success && selectedIndex < missions.length - 1 ? (
              <button type="button" onClick={() => selectMission(selectedIndex + 1)}>
                <span>Siguiente ejercicio</span>
                <ArrowRight size={14} weight="regular" />
              </button>
            ) : success ? (
              <button type="button" onClick={onClose}>
                <span>Volver a mi espacio</span>
                <ArrowRight size={14} weight="regular" />
              </button>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
