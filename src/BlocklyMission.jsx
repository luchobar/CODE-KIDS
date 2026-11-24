import {
  ArrowCounterClockwise,
  CheckCircle,
  FastForward,
  Pause,
  Play,
  WarningCircle,
} from '@phosphor-icons/react';
import { BLOCKLY_LESSONS, challengeCategory, getBlocklyChallenge } from './blocklyChallenges.js';
import BlocklyBriefingPanel from './components/ui/BlocklyBriefingPanel.jsx';
import ContextualTooltip from './components/ui/ContextualTooltip.jsx';
import RobotGridStage from './components/ui/RobotGridStage.jsx';
import { WORKSPACE_TOOLTIPS } from './data/pedagogicalGlossary.js';
import { BLOCKLY_MAX_BLOCKS } from './engines/blocklyConfig.js';
import { useBlocklyWorkspace } from './hooks/useBlocklyWorkspace.js';
import './BlocklyMission.css';

function buildMissionGoals(mission) {
  const requirementNote =
    mission.requiresBlock === 'ck_repeat'
      ? 'Usa el bloque morado «repetir» para ahorrar energía.'
      : mission.requiresBlock === 'ck_if_wall'
        ? 'Usa el sensor naranja «si hay pared» para decidir.'
        : 'Ordena los bloques de arriba hacia abajo sin pasos extra.';

  return [
    `Lleva a Pipo hasta la estrella en (${mission.goal.x + 1}, ${mission.goal.y + 1}).`,
    mission.wall
      ? 'Esquiva el obstáculo energético del tablero.'
      : 'Mantén a Pipo dentro de los límites del mapa.',
    requirementNote,
  ];
}

/**
 * Vista interactiva de programación por bloques con Blockly y simulación paso a paso.
 */
export default function BlocklyMission({
  templateId = 'sequence-order',
  missionId,
  onComplete,
  dialogue = '¡Hola, explorador! Conecta los bloques como piezas de energía para llevarme a la estrella.',
  mood = 'hello',
  soundEnabled = false,
}) {
  const mission = getBlocklyChallenge(missionId, templateId);
  const category = mission ? challengeCategory(mission) : 'Secuencias';
  const lesson = BLOCKLY_LESSONS[category] || BLOCKLY_LESSONS.Secuencias;

  const {
    hostRef,
    position,
    trail,
    running,
    paused,
    activeBlockLabel,
    blockCount,
    snapPulse,
    showConfetti,
    message,
    messageIsError,
    workspaceError,
    attempts,
    hintIndex,
    mobileTab,
    switchMobileTab,
    runProgram,
    togglePause,
    runSingleStep,
    resetRun,
    showNextHint,
  } = useBlocklyWorkspace({
    mission,
    lessonHintsLength: lesson.hints.length,
    onComplete,
    soundEnabled,
  });

  if (!mission) {
    return (
      <div className="empty-state-card">
        <p>No encontramos esta misión de bloques en el catálogo.</p>
      </div>
    );
  }

  const missionGoals = buildMissionGoals(mission);
  const isWonMessage = message.startsWith('Objetivo completado');

  return (
    <div className="blockly-mission">
      <div className="blockly-mobile-tabs-bar" role="tablist" aria-label="Selector de vista móvil">
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'editor'}
          className={`blockly-mobile-tab-btn${mobileTab === 'editor' ? ' active' : ''}`}
          onClick={() => switchMobileTab('editor')}
        >
          <span className="tab-icon">🧩</span>
          <span>Bloques</span>
          <span className="mobile-pill-badge">{blockCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'stage'}
          className={`blockly-mobile-tab-btn${mobileTab === 'stage' ? ' active' : ''}`}
          onClick={() => switchMobileTab('stage')}
        >
          <span className="tab-icon">🤖</span>
          <span>Escenario</span>
          {running && <span className="tab-live-pulse" />}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'briefing'}
          className={`blockly-mobile-tab-btn${mobileTab === 'briefing' ? ' active' : ''}`}
          onClick={() => switchMobileTab('briefing')}
        >
          <span className="tab-icon">💡</span>
          <span>Pipo y Pistas</span>
          {hintIndex > 0 && <span className="tab-hint-counter">{hintIndex}</span>}
        </button>
      </div>

      <div className={`blockly-three-panel-grid mobile-active-${mobileTab}`}>
        <BlocklyBriefingPanel
          mood={mood}
          dialogue={dialogue}
          skill={mission.skill}
          missionGoals={missionGoals}
          category={category}
          lesson={lesson}
          hintIndex={hintIndex}
          onToggleHint={showNextHint}
        />

        <section className="blockly-editor-panel tab-panel-editor" aria-label="Espacio de trabajo de bloques">
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
                Bloques: <b>{blockCount}</b> / {BLOCKLY_MAX_BLOCKS}
              </span>
              <ContextualTooltip
                label="Límite de bloques"
                content={WORKSPACE_TOOLTIPS.blockLimit}
                align="right"
              />
            </div>
          </div>

          <div className="blockly-editor-area">
            {workspaceError ? (
              <div className="auth-alert-box error" role="alert">
                <WarningCircle size={18} weight="fill" />
                <span>{workspaceError}</span>
              </div>
            ) : (
              <div ref={hostRef} className="blockly-host" aria-label="Editor de programación por bloques" />
            )}
          </div>

          <div className="blockly-editor-mobile-quickbar">
            <button type="button" className="btn-quick-run" onClick={runProgram} disabled={running}>
              <Play size={16} weight="fill" />
              <span>{running ? 'Ejecutando en Escenario...' : 'Probar en Escenario ▶️'}</span>
            </button>
            <button type="button" className="btn-quick-switch" onClick={() => switchMobileTab('stage')}>
              <span>Ver Escenario 🤖</span>
            </button>
          </div>
        </section>

        <section className="robot-game tab-panel-stage" aria-label="Escenario de simulación">
          {showConfetti && (
            <div className="confetti-burst" aria-hidden="true">
              {Array.from({ length: 18 }, (_, idx) => (
                <span key={`confetti-${idx}`} className={`confetti-piece c-${idx % 6}`} />
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

          <RobotGridStage
            position={position}
            goal={mission.goal}
            wall={mission.wall}
            trail={trail}
            variant="blockly"
          />

          {activeBlockLabel && (
            <div className="active-step-monitor" role="status">
              <FastForward size={14} weight="fill" />
              <span>{activeBlockLabel}</span>
            </div>
          )}

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

              <button
                type="button"
                className="media-ctrl-btn switch-blocks-btn"
                onClick={() => switchMobileTab('editor')}
                title="Volver al constructor de bloques"
              >
                <span>🧩 Bloques</span>
              </button>
            </div>

            <div className="blockly-stage-helper-row">
              <small className="blockly-attempts">Intentos en esta misión: {attempts}</small>
              <ContextualTooltip
                label="Depuración paso a paso"
                content={WORKSPACE_TOOLTIPS.stepDebugger}
                align="right"
              />
            </div>
          </div>
        </section>
      </div>

      {message && (
        <p
          className={`blockly-feedback${isWonMessage ? ' won' : messageIsError ? ' error' : ''}`}
          role="status"
        >
          {isWonMessage ? <CheckCircle size={20} weight="fill" /> : <WarningCircle size={20} weight="fill" />}
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}
