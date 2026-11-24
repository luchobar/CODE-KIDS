import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowCounterClockwise,
  Check,
  Code,
  Cpu,
  Lock,
  Play,
  TerminalWindow,
} from '@phosphor-icons/react';
import { FormattedInstructions } from './components/ui/FormattedInstructions.jsx';
import MissionWorkspaceShell from './components/ui/MissionWorkspaceShell.jsx';
import RobotGridStage from './components/ui/RobotGridStage.jsx';
import {
  buildAllPythonMissions,
  compilePythonGridExecution,
} from './engines/pythonGridEngine.js';
import { evaluatePythonFunctionMission } from './expansionCatalog.js';
import { isCompactViewport, useCodeSnippetEditor } from './hooks/useCodeSnippetEditor.js';
import './PythonMission.css';

const FUNCTION_SNIPPETS = [
  { label: '⇥ 4 esp', snippet: '    ', isText: true },
  { label: 'if ...:', snippet: 'if :\n        ', offset: 3 },
  { label: 'for ... in:', snippet: 'for item in :\n        ', offset: 12 },
  { label: 'return', snippet: 'return ' },
  { label: '.append()', snippet: '.append()', offset: 8 },
  { label: 'in catalogo:', snippet: ' in catalogo:' },
  { label: ':', snippet: ':', className: 'char-chip', isText: true },
];

const GRID_SNIPPETS = [
  { label: 'avanzar()', snippet: 'avanzar()\n' },
  { label: 'girar_derecha()', snippet: 'girar_derecha()\n' },
  { label: 'girar_izquierda()', snippet: 'girar_izquierda()\n' },
  { label: 'for ... in range():', snippet: 'for paso in range(2):\n    ', offset: 20 },
  { label: 'if hay_pared():', snippet: 'if hay_pared():\n    ', offset: 19 },
  { label: '⇥ 4 esp', snippet: '    ', className: 'indent-chip', isText: true },
  { label: ':', snippet: ':', className: 'char-chip', isText: true },
  { label: '( )', snippet: '()', offset: 1, className: 'char-chip', isText: true },
];

/**
 * Laboratorio interactivo de Python (etapas de grilla y retos avanzados de funciones).
 */
export default function PythonMission({
  completed = [],
  initialMissionId = '',
  customMissions = null,
  onComplete,
  onClose,
}) {
  const missions = useMemo(() => buildAllPythonMissions(customMissions), [customMissions]);
  const cancelledRef = useRef(false);
  const stepTimerRef = useRef(null);

  const resolveInitialIndex = () => {
    if (initialMissionId) {
      const idx = missions.findIndex((m) => m.id === initialMissionId);
      if (idx >= 0) return idx;
    }
    const firstUnfinished = missions.findIndex((m) => !completed.includes(m.id));
    return firstUnfinished < 0 ? Math.max(0, missions.length - 1) : firstUnfinished;
  };

  const [selectedIndex, setSelectedIndex] = useState(resolveInitialIndex);
  const mission = missions[selectedIndex] || missions[0];
  const [code, setCode] = useState(mission?.starter || '');
  const [position, setPosition] = useState(mission?.start || { x: 0, y: 2, direction: 0 });
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [hintIndex, setHintIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [mobileTab, setMobileTab] = useState('editor');

  const clearTimers = () => {
    if (stepTimerRef.current) {
      window.clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  };

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (!initialMissionId) return;
    const idx = missions.findIndex((m) => m.id === initialMissionId);
    if (idx >= 0 && idx !== selectedIndex) {
      clearTimers();
      setSelectedIndex(idx);
      setCode(missions[idx].starter);
      setPosition(missions[idx].start || { x: 0, y: 2, direction: 0 });
      setOutcome(null);
      setTestResults([]);
      setHintIndex(0);
      setAttempts(0);
      setRunning(false);
    }
  }, [initialMissionId, missions]);

  const { textareaRef, insertSnippet, handleTabKeyDown } = useCodeSnippetEditor(code, setCode, {
    tabString: '    ',
    onInsert: () => setOutcome(null),
  });

  const canUnlock = (index) =>
    index === 0 ||
    Boolean(missions[index]?.isChapterStart) ||
    completed.includes(missions[index - 1]?.id);

  const selectMission = (index) => {
    if (!canUnlock(index) || running) return;
    clearTimers();
    setSelectedIndex(index);
    setCode(missions[index].starter);
    setPosition(missions[index].start || { x: 0, y: 2, direction: 0 });
    setOutcome(null);
    setTestResults([]);
    setHintIndex(0);
    setAttempts(0);
  };

  const runCode = async () => {
    if (!mission || running) return;
    if (isCompactViewport()) setMobileTab('preview');

    const nextAttempt = attempts + 1;
    setAttempts(nextAttempt);

    if (mission.mode === 'function') {
      const fnOutcome = evaluatePythonFunctionMission(code, mission.validation);
      setOutcome({ passed: fnOutcome.passed, message: fnOutcome.message, isError: !fnOutcome.passed });
      setTestResults(fnOutcome.testResults || []);
      if (fnOutcome.passed && onComplete) {
        onComplete(mission.id, mission.xpReward, mission.coinReward, code, nextAttempt);
      }
      return;
    }

    setRunning(true);
    setOutcome(null);
    setPosition(mission.start);

    try {
      const compiled = compilePythonGridExecution(code, mission);
      for (const snap of compiled.snapshots) {
        if (cancelledRef.current) return;
        setPosition(snap);
        await new Promise((resolve) => {
          stepTimerRef.current = window.setTimeout(resolve, 180);
        });
      }
      if (cancelledRef.current) return;

      setOutcome({ passed: compiled.passed, message: compiled.message, isError: compiled.blocked });
      if (compiled.passed && onComplete) {
        onComplete(mission.id, mission.xpReward, mission.coinReward, code, nextAttempt);
      }
    } catch (error) {
      if (!cancelledRef.current) {
        setOutcome({ passed: false, message: error.message, isError: true });
      }
    } finally {
      if (!cancelledRef.current) setRunning(false);
    }
  };

  const snippets = mission?.mode === 'function' ? FUNCTION_SNIPPETS : GRID_SNIPPETS;

  return (
    <MissionWorkspaceShell
      isEmpty={!mission}
      emptyTitle="No hay misiones de Python disponibles en este momento."
      backLabel="Volver a mi espacio"
      onClose={onClose}
      metaLabel={`PYTHON · +${mission?.xpReward ?? 0} XP y +${mission?.coinReward ?? 0} monedas`}
      title="Laboratorio de Código Python"
      titleId="python-title"
      intro={
        mission?.mode === 'function'
          ? mission.explanation
          : 'De los bloques a la sintaxis escrita: resuelve cada ejercicio paso a paso.'
      }
      topbarExpanded
      stagesNav={
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
      }
      briefLabel={mission?.mode === 'function' ? 'Misión Avanzada de Expansión' : 'Fundamento'}
      xpReward={mission?.xpReward ?? 0}
      coinReward={mission?.coinReward ?? 0}
      instructions={
        mission?.mode === 'function' && mission.instructionsMd ? (
          <FormattedInstructions markdown={mission.instructionsMd} />
        ) : (
          <p>{mission?.explanation}</p>
        )
      }
      hintsCount={mission?.hints?.length || 0}
      hintIndex={hintIndex}
      activeHint={mission?.hints?.[hintIndex - 1] || ''}
      onToggleHint={() =>
        setHintIndex((idx) => (idx >= (mission?.hints?.length || 0) ? 0 : idx + 1))
      }
      mobileTab={mobileTab}
      onChangeMobileTab={setMobileTab}
      editorTabContent={
        <>
          <span className="tab-icon">💻</span>
          <span>Editor Python</span>
        </>
      }
      previewTabContent={
        <>
          <span className="tab-icon">{mission?.mode === 'function' ? '🛰️' : '🤖'}</span>
          <span>{mission?.mode === 'function' ? 'Consola Orbital' : 'Tablero del Robot'}</span>
          {running && <span className="tab-live-pulse" />}
        </>
      }
      editorPanel={
        <div className="python-editor-card tab-panel-python-editor">
          <div className="python-editor-header">
            <span>
              <TerminalWindow size={15} weight="regular" /> main.py
            </span>
            <button
              type="button"
              onClick={() => {
                setCode(mission.starter);
                setOutcome(null);
                setTestResults([]);
              }}
            >
              <ArrowCounterClockwise size={13} weight="regular" /> Restaurar código
            </button>
          </div>

          <div className="python-mobile-syntax-bar" aria-label="Teclado rápido de código Python">
            {snippets.map((item) => (
              <button
                type="button"
                key={item.label}
                className={`syntax-chip${item.className ? ` ${item.className}` : ''}`}
                onClick={() => insertSnippet(item.snippet, item.offset)}
              >
                {item.isText ? <span>{item.label}</span> : <code>{item.label}</code>}
              </button>
            ))}
          </div>

          <label className="sr-only" htmlFor="python-code-editor">
            Editor de código Python
          </label>
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
              setOutcome(null);
            }}
            onKeyDown={handleTabKeyDown}
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
      }
      previewPanel={
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
                            <>
                              {' '}
                              · Esperado: <code>{test.expected}</code>
                            </>
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
            <RobotGridStage
              position={position}
              goal={mission.goal}
              wall={mission.wall}
              variant="python"
              ariaLabel="Tablero del reto de Python"
            />
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
      }
      result={outcome}
      hasNextMission={selectedIndex < missions.length - 1}
      nextActionLabel="Siguiente ejercicio"
      onNextAction={() => selectMission(selectedIndex + 1)}
      finalActionLabel="Volver a mi espacio"
    />
  );
}
