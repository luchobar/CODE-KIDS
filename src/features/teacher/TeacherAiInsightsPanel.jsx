import { useState } from 'react';
import { CheckCircle, NotePencil, Plus, Sparkle, WarningCircle } from '@phosphor-icons/react';
import { SkillGlyph } from '../../components/layout/Glyphs.jsx';

const FOCUS_CHIPS = [
  'Nivelación urgente (<75%)',
  'Transición de bloques a Python',
  'Retos web HTML5 y JS',
  'Depuración de errores frecuentes',
];

/**
 * Panel oscuro de análisis pedagógico docente con propuestas de refuerzo asignables en un clic.
 */
export default function TeacherAiInsightsPanel({
  group,
  aiInsights,
  aiStatus,
  groupAssignments,
  assignedProposalIds,
  onAssignProposal,
  onCustomizeProposal,
  teacherFocus = '',
  onTeacherFocusChange,
  onRequestFocus,
}) {
  const [assigningKey, setAssigningKey] = useState('');
  const [assignError, setAssignError] = useState('');

  const handleAssign = async (proposal, proposalKey) => {
    if (assigningKey) return;
    setAssignError('');
    setAssigningKey(proposalKey);
    try {
      await onAssignProposal(proposal, proposalKey);
    } catch (err) {
      setAssignError(err?.message || 'No se pudo asignar la propuesta al curso.');
    } finally {
      setAssigningKey('');
    }
  };

  if (aiStatus === 'loading' && !aiInsights) {
    return (
      <div className="teacher-ai-insights-dark" role="status">
        <div className="insights-dark-header">
          <Sparkle size={18} weight="fill" />
          <b>PIPO está analizando las falencias del curso {group}...</b>
        </div>
        <p>Generando diagnóstico pedagógico, plan de intervención y propuestas de ejercicios personalizados.</p>
      </div>
    );
  }

  if (!aiInsights) return null;

  return (
    <div className="teacher-ai-insights-dark">
      <div className="insights-dark-header">
        <Sparkle size={18} weight="fill" />
        <b>Informe pedagógico y guía docente · PIPO</b>
      </div>
      <span className="pipo-live-badge">{aiInsights.source === 'pipo' ? 'IA en vivo' : 'Análisis dinámico del aula'}</span>
      {onRequestFocus && (
        <form
          className="pipo-teacher-prompt-bar"
          onSubmit={(event) => {
            event.preventDefault();
            onRequestFocus(teacherFocus);
          }}
        >
          <b>Consultar enfoque especializado a PIPO</b>
          <div className="pipo-focus-chips">
            {FOCUS_CHIPS.map((chip) => (
              <button
                type="button"
                key={chip}
                className={teacherFocus === chip ? 'pipo-focus-chip is-active' : 'pipo-focus-chip'}
                onClick={() => onRequestFocus(chip)}
                disabled={aiStatus === 'loading'}
              >
                {chip}
              </button>
            ))}
          </div>
          <div className="pipo-teacher-form">
            <input
              className="search-input"
              type="text"
              value={teacherFocus}
              placeholder="Ej: ¿Cómo apoyo a quienes fallan en bucles?"
              onChange={(event) => onTeacherFocusChange?.(event.target.value)}
              aria-label="Enfoque pedagógico para PIPO"
            />
            <button type="submit" className="primary-action" disabled={aiStatus === 'loading'}>
              <Sparkle size={14} weight="fill" />
              <span>{aiStatus === 'loading' ? 'PIPO pensando...' : 'Pedir plan a PIPO'}</span>
            </button>
          </div>
        </form>
      )}
      <p>{aiInsights.overview}</p>

      {aiInsights.studentClusters?.length > 0 && (
        <div className="student-clusters-grid">
          {aiInsights.studentClusters.map((cluster, index) => (
            <article className="student-cluster-card" key={(cluster.groupLabel || 'grupo') + index}>
              <b>{cluster.groupLabel}</b>
              {Array.isArray(cluster.students) && cluster.students.length > 0 && (
                <small>{cluster.students.join(', ')}</small>
              )}
              <p>{cluster.recommendation}</p>
            </article>
          ))}
        </div>
      )}

      {aiInsights.focusSkills?.length > 0 && (
        <div className="insights-focus-grid">
          {aiInsights.focusSkills.map((item) => (
            <article className="insights-focus-card" key={item.skill}>
              <b>Enfoque: {item.skill}</b>
              <p>{item.evidence}</p>
              <small>Cómo proceder: {item.activity}</small>
            </article>
          ))}
        </div>
      )}

      {aiInsights.nextSteps?.length > 0 && (
        <div className="insights-steps-section">
          <b className="insights-section-subtitle">Pasos recomendados para la clase</b>
          <ul className="insights-steps-list">
            {aiInsights.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      )}

      {assignError && (
        <p className="auth-alert-box error mt-sm" role="alert">
          <WarningCircle size={16} weight="fill" />
          <span>{assignError}</span>
        </p>
      )}

      {aiInsights.proposedExercises?.length > 0 && (
        <div className="proposed-exercises-section">
          <div className="proposed-exercises-header">
            <div>
              <b className="insights-section-subtitle">
                Nuevas actividades recomendadas para el grupo ({group})
              </b>
              <p className="proposed-exercises-lead">
                Asigna estas nuevas misiones de Python, Ciudadela HTML, Neo-Tokio JS o Blockly con un solo clic para los estudiantes inscritos en {group}.
              </p>
            </div>
          </div>

          <div className="proposed-exercises-grid">
            {aiInsights.proposedExercises.map((proposal) => {
              const proposalKey = `${group}-${proposal.missionId}-${proposal.title}`;
              const alreadyAssigned =
                assignedProposalIds.includes(proposalKey) ||
                groupAssignments.some(
                  (item) => item.missionId === proposal.missionId && item.title === proposal.title,
                );
              const isAssigning = assigningKey === proposalKey;

              return (
                <article className="proposed-exercise-card" key={proposalKey}>
                  <div className="proposed-exercise-tags">
                    <span className="proposed-skill-badge">
                      <SkillGlyph skill={proposal.skill} size={14} />
                      <span>{proposal.targetSkill || proposal.skill}</span>
                    </span>
                    <span className="proposed-level-badge">{proposal.level}</span>
                  </div>
                  <h4>{proposal.title}</h4>
                  <p className="proposed-exercise-instructions">{proposal.instructions}</p>
                  <div className="proposed-exercise-reason">
                    <b>¿Por qué asignarlo?:</b>
                    <span>{proposal.reason}</span>
                  </div>
                  <div className="proposed-exercise-actions">
                    {alreadyAssigned ? (
                      <span className="proposal-assigned-pill" role="status">
                        <CheckCircle size={16} weight="fill" />
                        <span>Asignado a {group}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="button-primary"
                        disabled={Boolean(assigningKey)}
                        onClick={() => handleAssign(proposal, proposalKey)}
                      >
                        <Plus size={15} weight="bold" />
                        <span>{isAssigning ? 'Asignando...' : `Asignar a ${group}`}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="button-secondary-pill"
                      onClick={() => onCustomizeProposal(proposal)}
                    >
                      <NotePencil size={15} weight="regular" />
                      <span>Personalizar</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
