import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle } from '@phosphor-icons/react';
import BlocklyMission from '../../BlocklyMission.jsx';
import CodeWorldLab from '../../CodeWorldLab.jsx';
import PythonMission from '../../PythonMission.jsx';
import { playSfx } from '../../hooks/useAudioEffects.js';
import InteractiveExercise from './InteractiveExercise.jsx';

/**
 * Espacio completo para resolver un reto escolar asignado (Blockly, Python, HTML5, JS o interactivo).
 */
export default function StudentAssignmentModal({
  assignment,
  previousSubmission,
  onSubmit,
  onClose,
  soundEnabled,
  remoteExpansion = null,
}) {
  const [gameOutcome, setGameOutcome] = useState(previousSubmission?.gameOutcome || null);
  const [result, setResult] = useState(previousSubmission || null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const missionIdStr = String(assignment.missionId || '');
  const isPythonAssignment =
    assignment.templateId === 'python-code' ||
    assignment.skill === 'Python' ||
    missionIdStr.startsWith('python-') ||
    missionIdStr.startsWith('py-');
  const isHtmlAssignment =
    assignment.templateId === 'html-markup' ||
    assignment.skill === 'HTML5' ||
    missionIdStr.startsWith('html-');
  const isJsAssignment =
    assignment.templateId === 'javascript-script' ||
    assignment.skill === 'JavaScript' ||
    missionIdStr.startsWith('js-');
  const usesBlockly = ['sequence-order', 'loop-count', 'if-choice'].includes(assignment.templateId);

  const submit = async (overrideOutcome = null) => {
    const activeOutcome = overrideOutcome || gameOutcome;
    if (!activeOutcome || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const saved = await onSubmit(assignment, activeOutcome.evidence, activeOutcome);
      setResult(saved);
    } catch (error) {
      setSubmitError(error?.message || 'No se pudo enviar la entrega. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!result && (isPythonAssignment || isHtmlAssignment || isJsAssignment)) {
    return (
      <div className="code-assignment-wrapper">
        <div className="code-assignment-banner">
          <div className="code-assignment-banner-info">
            <span className="modal-meta-label">
              Reto del Curso {assignment.group} · {assignment.skill}
            </span>
            <strong>{assignment.title}</strong>
          </div>
          <div className="code-assignment-banner-actions">
            {gameOutcome?.success ? (
              <button
                type="button"
                className="button-primary cta-3d-lime"
                onClick={() => submit(gameOutcome)}
                disabled={submitting}
              >
                <CheckCircle size={16} weight="fill" />
                <span>{submitting ? 'Enviando entrega...' : '¡Reto superado! Enviar al docente'}</span>
              </button>
            ) : (
              <span className="code-assignment-pending-hint">
                Resuelve y valida el código abajo para habilitar el envío al docente
              </span>
            )}
            <button type="button" className="button-secondary-pill" onClick={onClose}>
              <ArrowLeft size={14} weight="bold" />
              <span>Volver a mis retos</span>
            </button>
          </div>
        </div>

        {submitError && (
          <p className="auth-alert-box error" role="alert">
            {submitError}
          </p>
        )}

        {isPythonAssignment ? (
          <PythonMission
            key={assignment.id}
            completed={gameOutcome?.success ? [assignment.missionId] : []}
            initialMissionId={assignment.missionId}
            customMissions={remoteExpansion?.misiones || null}
            onComplete={(completedId, _xp, _coins, studentCode, attemptsCount) => {
              setGameOutcome({
                success: true,
                attempts: attemptsCount || 1,
                evidence: studentCode
                  ? `Código Python (${completedId}):\n${studentCode}`
                  : `Misión Python ${completedId} completada`,
              });
              if (soundEnabled) playSfx('win');
            }}
            onClose={onClose}
          />
        ) : (
          <CodeWorldLab
            key={assignment.id}
            worldSlug={isHtmlAssignment ? 'ciudadela-html' : 'neo-tokio-javascript'}
            initialMissionSlug={assignment.missionId}
            customWorlds={remoteExpansion?.mundos || null}
            customMissions={remoteExpansion?.misiones || null}
            completed={gameOutcome?.success ? [assignment.missionId] : []}
            onComplete={(completedSlug, _xp, _coins, studentCode, attemptsCount) => {
              setGameOutcome({
                success: true,
                attempts: attemptsCount || 1,
                evidence: studentCode
                  ? `Código ${assignment.skill} (${completedSlug}):\n${studentCode}`
                  : `Misión ${completedSlug} completada`,
              });
              if (soundEnabled) playSfx('win');
            }}
            onClose={onClose}
          />
        )}
      </div>
    );
  }

  return (
    <main id="top" className="apple-page fullscreen-exercise-page">
      <div className="fullscreen-exercise-container">
        <header className="workspace-topbar">
          <div className="workspace-topbar-left">
            <button type="button" className="workspace-back-btn" onClick={onClose}>
              <ArrowLeft size={16} weight="bold" />
              <span>Volver a mis retos</span>
            </button>
            <div className="workspace-title-group">
              <span className="modal-meta-label">
                Curso {assignment.group} | {assignment.skill}
              </span>
              <h1 id="assignment-title">{assignment.title}</h1>
              <p>{assignment.instructions}</p>
            </div>
          </div>

          {gameOutcome && !result && (
            <div className="workspace-topbar-actions">
              <button type="button" className="button-primary" onClick={() => submit()} disabled={submitting}>
                <span>{submitting ? 'PIPO está revisando tu entrega...' : 'Enviar al docente'}</span>
                <ArrowRight size={15} weight="regular" />
              </button>
            </div>
          )}
        </header>

        {submitError && (
          <p className="auth-alert-box error" role="alert">
            {submitError}
          </p>
        )}

        {result ? (
          <div className="store-utility-card submission-result">
            <strong>{result.score}%</strong>
            <span>
              Retroalimentación de PIPO
            </span>
            <p>{result.feedback}</p>
            <small>Tu docente revisa el resultado y conserva el criterio pedagógico.</small>
            <div className="assignment-submit-bar">
              <button type="button" className="button-primary" onClick={onClose}>
                <span>Volver a mi espacio</span>
                <ArrowRight size={15} weight="regular" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {usesBlockly ? (
              <BlocklyMission
                key={assignment.id}
                templateId={assignment.templateId}
                missionId={assignment.missionId}
                onComplete={(outcome) => {
                  setGameOutcome(outcome);
                  if (soundEnabled) playSfx(outcome.success ? 'win' : 'try');
                }}
              />
            ) : (
              <InteractiveExercise
                key={assignment.id}
                skill={assignment.skill}
                templateId={assignment.templateId}
                onComplete={(outcome) => {
                  setGameOutcome(outcome);
                  if (soundEnabled) playSfx(outcome.success ? 'win' : 'try');
                }}
              />
            )}
            {gameOutcome && (
              <div className="assignment-submit-bar">
                <button type="button" className="button-primary" onClick={() => submit()} disabled={submitting}>
                  <span>{submitting ? 'PIPO está revisando tu entrega...' : 'Enviar al docente'}</span>
                  <ArrowRight size={15} weight="regular" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
