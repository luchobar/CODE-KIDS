import { useState } from 'react';
import { BookOpen, Check, ClipboardText, NotePencil, WarningCircle, X } from '@phosphor-icons/react';

/**
 * Panel CRUD docente para editar/eliminar retos publicados y calificar entregas del grupo.
 */
export default function AssignmentResultsPanel({
  submissions = [],
  assignments = [],
  onUpdateAssignment,
  onDeleteAssignment,
  onGradeSubmission,
}) {
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [gradingSubmissionId, setGradingSubmissionId] = useState(null);
  const [gradeValue, setGradeValue] = useState(90);
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  const handleSaveAssignment = async (itemId) => {
    if (!onUpdateAssignment) return;
    setActionError('');
    setBusyId(itemId);
    try {
      await onUpdateAssignment(itemId, { title: editTitle, instructions: editInstructions });
      setEditingAssignmentId(null);
    } catch (err) {
      setActionError(err?.message || 'No se pudo actualizar el reto.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (itemId) => {
    if (!onDeleteAssignment) return;
    setActionError('');
    setBusyId(itemId);
    try {
      await onDeleteAssignment(itemId);
      setConfirmDeleteId(null);
    } catch (err) {
      setActionError(err?.message || 'No se pudo eliminar el reto.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveGrade = async (submission) => {
    if (!onGradeSubmission) return;
    setActionError('');
    setBusyId(submission.id);
    try {
      await onGradeSubmission(submission.id, {
        score: gradeValue,
        feedback: gradeFeedback || submission.feedback,
        assignmentId: submission.assignmentId,
        studentId: submission.studentId,
      });
      setGradingSubmissionId(null);
    } catch (err) {
      setActionError(err?.message || 'No se pudo guardar la calificación.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="store-utility-card assignment-results-card">
      <div className="card-header-row">
        <div>
          <h3>Gestión de Retos ({assignments.length}) y Entregas ({submissions.length})</h3>
          <p>CRUD completo: edita o elimina retos publicados y califica entregas del grupo.</p>
        </div>
        <ClipboardText size={22} weight="regular" />
      </div>

      {actionError && (
        <p className="auth-alert-box error" role="alert">
          <WarningCircle size={16} weight="fill" />
          <span>{actionError}</span>
        </p>
      )}

      {assignments.length > 0 && (
        <div className="result-list result-list-spaced">
          {assignments.map((item) => {
            const isEditing = editingAssignmentId === item.id;
            const isConfirmingDelete = confirmDeleteId === item.id;
            const isBusy = busyId === item.id;

            return (
              <article className="submission-item-card" key={item.id}>
                {isEditing ? (
                  <div className="stack-sm">
                    <input
                      className="search-input"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Título del reto"
                    />
                    <textarea
                      className="apple-textarea"
                      value={editInstructions}
                      onChange={(e) => setEditInstructions(e.target.value)}
                      placeholder="Instrucciones del reto"
                    />
                    <div className="inline-actions-row">
                      <button
                        type="button"
                        className="button-primary"
                        disabled={isBusy}
                        onClick={() => handleSaveAssignment(item.id)}
                      >
                        <Check size={14} weight="bold" />
                        <span>{isBusy ? 'Guardando...' : 'Guardar UPDATE'}</span>
                      </button>
                      <button
                        type="button"
                        className="button-secondary-pill"
                        onClick={() => setEditingAssignmentId(null)}
                      >
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="submission-item-top">
                      <div className="submission-item-meta">
                        <strong>{item.title}</strong>
                        <small>
                          Reto activo · {item.skill} · Curso {item.group}
                        </small>
                      </div>
                      <div className="inline-actions-row">
                        <button
                          type="button"
                          className="button-secondary-pill"
                          onClick={() => {
                            setEditingAssignmentId(item.id);
                            setEditTitle(item.title);
                            setEditInstructions(item.instructions);
                            setConfirmDeleteId(null);
                          }}
                        >
                          <NotePencil size={14} weight="bold" />
                          <span>Editar</span>
                        </button>
                        {isConfirmingDelete ? (
                          <>
                            <button
                              type="button"
                              className="button-primary"
                              disabled={isBusy}
                              onClick={() => handleDelete(item.id)}
                            >
                              <span>{isBusy ? 'Eliminando...' : 'Confirmar'}</span>
                            </button>
                            <button
                              type="button"
                              className="button-secondary-pill"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              <span>Cancelar</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="button-secondary-pill"
                            onClick={() => setConfirmDeleteId(item.id)}
                          >
                            <X size={14} weight="bold" />
                            <span>Eliminar</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="submission-evidence">{item.instructions}</p>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}

      {submissions.length ? (
        <div className="result-list">
          {submissions.map((submission) => {
            const isGrading = gradingSubmissionId === submission.id;
            const isBusy = busyId === submission.id;
            const nota5 = (Number(submission.score || 0) / 20).toFixed(2);

            return (
              <article className="submission-item-card" key={submission.id}>
                <div className="submission-item-top">
                  <span className="student-initial-badge">{submission.studentName.charAt(0)}</span>
                  <div className="submission-item-meta">
                    <strong>{submission.studentName}</strong>
                    <small>
                      {submission.assignmentTitle} | {submission.skill}
                    </small>
                  </div>
                  <b className={submission.score >= 80 ? 'score-pill high' : 'score-pill'}>
                    {submission.score}% ({nota5}/5.0)
                  </b>
                </div>
                <p className="submission-evidence">{submission.response}</p>
                <p className="submission-feedback">{submission.feedback}</p>
                <div className="teacher-recommendation-box">
                  <b>Sugerencia:</b>
                  <span>{submission.recommendation}</span>
                </div>

                {isGrading ? (
                  <div className="stack-sm mt-sm">
                    <label className="field-label">
                      Calificación docente (0 a 100% — equivalente {(gradeValue / 20).toFixed(2)} / 5.0)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="search-input"
                      value={gradeValue}
                      onChange={(e) => setGradeValue(Number(e.target.value))}
                    />
                    <input
                      className="search-input"
                      value={gradeFeedback}
                      onChange={(e) => setGradeFeedback(e.target.value)}
                      placeholder="Retroalimentación del docente"
                    />
                    <div className="inline-actions-row">
                      <button
                        type="button"
                        className="button-primary"
                        disabled={isBusy}
                        onClick={() => handleSaveGrade(submission)}
                      >
                        <Check size={14} weight="bold" />
                        <span>{isBusy ? 'Guardando...' : 'Guardar Calificación (UPDATE)'}</span>
                      </button>
                      <button
                        type="button"
                        className="button-secondary-pill"
                        onClick={() => setGradingSubmissionId(null)}
                      >
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-xs">
                    <button
                      type="button"
                      className="button-secondary-pill"
                      onClick={() => {
                        setGradingSubmissionId(submission.id);
                        setGradeValue(submission.score || 85);
                        setGradeFeedback(submission.feedback || '');
                      }}
                    >
                      <NotePencil size={14} weight="regular" />
                      <span>Calificar / Editar nota</span>
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state-card">
          <BookOpen size={28} weight="regular" />
          <h3>Sin entregas todavía</h3>
          <p>Cuando respondan tus ejercicios, aquí verás su evaluación y sugerencias.</p>
        </div>
      )}
    </section>
  );
}
