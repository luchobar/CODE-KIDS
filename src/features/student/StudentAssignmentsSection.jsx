import { useState } from 'react';
import { ClipboardText } from '@phosphor-icons/react';
import ContextualTooltip from '../../components/ui/ContextualTooltip.jsx';
import { WORKSPACE_TOOLTIPS } from '../../data/pedagogicalGlossary.js';

const ASSIGNMENT_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'done', label: 'Evaluados' },
];

/**
 * Lista de retos escolares publicados por el docente con filtro de estado y guía contextual.
 */
export default function StudentAssignmentsSection({
  group,
  studentName,
  assignments,
  submissions,
  availableCourses = [],
  enrolledGroups = [],
  onGroupChange,
  onOpenAssignment,
}) {
  const [statusFilter, setStatusFilter] = useState('all');

  const groupOptions = Array.from(
    new Set([
      ...(enrolledGroups || []),
      ...(availableCourses || []).map((c) => c.codigoGrupo || c),
      '5° A',
      '6° B',
    ]),
  );

  const enriched = assignments.map((assignment) => ({
    assignment,
    submitted: submissions.find(
      (item) => item.assignmentId === assignment.id && item.studentName === studentName,
    ),
  }));

  const filtered = enriched.filter(({ submitted }) => {
    if (statusFilter === 'pending') return !submitted;
    if (statusFilter === 'done') return Boolean(submitted);
    return true;
  });

  return (
    <div className="assignments-column">
      <div className="subsection-header subsection-header-row">
        <div>
          <div className="inline-actions-row">
            <h2 className="display-md">Retos del colegio ({group})</h2>
            <ContextualTooltip
              label="Cómo se evalúan tus retos"
              content={WORKSPACE_TOOLTIPS.assignmentEval}
            />
          </div>
          <p className="body-copy">Actividades publicadas por tu docente para tu grupo.</p>
        </div>
        {onGroupChange && (
          <div className="course-selector-group" role="group" aria-label="Seleccionar mi curso">
            {groupOptions.map((courseName) => {
              const isEnrolled = (enrolledGroups || []).includes(courseName);
              return (
                <button
                  type="button"
                  key={courseName}
                  className={
                    group === courseName
                      ? 'configurator-option-chip selected'
                      : 'configurator-option-chip'
                  }
                  onClick={() => onGroupChange(courseName)}
                >
                  <span>
                    {courseName}
                    {isEnrolled ? ' ✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {assignments.length > 0 && (
        <div className="filter-pill-group mb-md" role="group" aria-label="Filtrar retos escolares">
          {ASSIGNMENT_FILTERS.map((f) => (
            <button
              type="button"
              key={f.id}
              aria-pressed={statusFilter === f.id}
              className={`map-filter-chip${statusFilter === f.id ? ' active' : ''}`}
              onClick={() => setStatusFilter(f.id)}
            >
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      )}

      {filtered.length ? (
        <div className="utility-card-stack">
          {filtered.map(({ assignment, submitted }) => (
            <article className="store-utility-card assignment-utility-row" key={assignment.id}>
              <div className="assignment-utility-info">
                <span className="assignment-meta-tag">
                  {assignment.skill} | {submitted ? `Evaluado: ${submitted.score}%` : 'Pendiente'}
                </span>
                <h3>{assignment.title}</h3>
                <p>{assignment.instructions}</p>
              </div>
              <button
                type="button"
                className={submitted ? 'button-secondary-pill' : 'button-primary'}
                onClick={() => onOpenAssignment(assignment, submitted)}
              >
                <span>{submitted ? 'Ver resultado' : 'Resolver reto'}</span>
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="store-utility-card empty-state-card" role="status">
          <ClipboardText size={28} weight="regular" />
          <h3>
            {assignments.length === 0
              ? 'Sin retos asignados todavía'
              : statusFilter === 'pending'
                ? 'No tienes retos pendientes'
                : 'Aún no hay retos evaluados'}
          </h3>
          <p>
            {assignments.length === 0
              ? `Aquí aparecerán los ejercicios que publique tu docente para el curso ${group}.`
              : 'Cambia el filtro superior para ver todas las actividades del grupo.'}
          </p>
        </div>
      )}
    </div>
  );
}
