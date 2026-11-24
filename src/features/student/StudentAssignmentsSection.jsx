import { ClipboardText } from '@phosphor-icons/react';

/**
 * Lista de retos escolares publicados por el docente para el curso seleccionado del estudiante.
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
  const groupOptions = Array.from(
    new Set([
      ...(enrolledGroups || []),
      ...(availableCourses || []).map((c) => c.codigoGrupo || c),
      '5° A',
      '6° B',
    ]),
  );

  return (
    <div className="assignments-column">
      <div className="subsection-header subsection-header-row">
        <div>
          <h2 className="display-md">Retos del colegio ({group})</h2>
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

      {assignments.length ? (
        <div className="utility-card-stack">
          {assignments.map((assignment) => {
            const submitted = submissions.find(
              (item) => item.assignmentId === assignment.id && item.studentName === studentName,
            );
            return (
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
            );
          })}
        </div>
      ) : (
        <div className="store-utility-card empty-state-card">
          <ClipboardText size={28} weight="regular" />
          <h3>Sin retos asignados todavía</h3>
          <p>Aquí aparecerán los ejercicios que publique tu docente para el curso {group}.</p>
        </div>
      )}
    </div>
  );
}
