import { useState } from 'react';
import { Check, Plus, UsersThree, WarningCircle } from '@phosphor-icons/react';
import { AvatarGlyph } from '../../components/layout/Glyphs.jsx';

/**
 * Directorio filtrable de estudiantes registrados para matricular o retirar en el curso activo.
 */
export default function StudentDirectoryCard({
  group,
  allStudents,
  enrolledDbStudents,
  enrolledIdsInCurrentGroup,
  enrollmentsByGroup,
  onToggleEnrollment,
  onBulkEnrollAll,
}) {
  const [studentSearch, setStudentSearch] = useState('');
  const [enrollmentFilter, setEnrollmentFilter] = useState('all');
  const [pendingStudentId, setPendingStudentId] = useState(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [enrollError, setEnrollError] = useState('');

  const filteredDirectoryStudents = allStudents.filter((student) => {
    const isEnrolledHere = enrolledIdsInCurrentGroup.some((id) => String(id) === String(student.id));
    if (enrollmentFilter === 'enrolled' && !isEnrolledHere) return false;
    if (enrollmentFilter === 'unenrolled' && isEnrolledHere) return false;
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      String(student.name || '').toLowerCase().includes(q) ||
      String(student.email || '').toLowerCase().includes(q)
    );
  });

  const handleToggle = async (studentId, enroll) => {
    setEnrollError('');
    setPendingStudentId(studentId);
    try {
      await onToggleEnrollment({ codigoGrupo: group, studentId, enroll });
    } catch (err) {
      setEnrollError(err?.message || 'No se pudo actualizar la matrícula.');
    } finally {
      setPendingStudentId(null);
    }
  };

  const handleBulk = async () => {
    setEnrollError('');
    setBulkPending(true);
    try {
      await onBulkEnrollAll(group, allStudents.map((s) => s.id));
    } catch (err) {
      setEnrollError(err?.message || 'No se pudieron inscribir todos los estudiantes.');
    } finally {
      setBulkPending(false);
    }
  };

  return (
    <section className="store-utility-card db-students-enrollment-card">
      <div className="card-header-row">
        <div>
          <h3>Estudiantes en Base de Datos → Curso {group}</h3>
          <p>
            Inscribe o retira estudiantes registrados en Supabase dentro del curso <b>{group}</b> y asígnales actividades.
          </p>
        </div>
        <UsersThree size={24} weight="duotone" />
      </div>

      <div className="db-students-toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Buscar estudiante por nombre o correo..."
          aria-label="Buscar estudiante por nombre o correo"
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
        />
        <div className="db-students-filter-row">
          <div className="filter-pill-group" role="group" aria-label="Filtrar por estado de inscripción">
            {[
              { id: 'all', label: `Todos (${allStudents.length})` },
              { id: 'enrolled', label: `Inscritos en ${group} (${enrolledDbStudents.length})` },
              {
                id: 'unenrolled',
                label: `Sin inscribir (${Math.max(0, allStudents.length - enrolledDbStudents.length)})`,
              },
            ].map((tab) => (
              <button
                type="button"
                key={tab.id}
                className={
                  enrollmentFilter === tab.id
                    ? 'configurator-option-chip selected'
                    : 'configurator-option-chip'
                }
                onClick={() => setEnrollmentFilter(tab.id)}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {enrolledDbStudents.length < allStudents.length && (
            <button
              type="button"
              className="button-secondary-pill"
              disabled={bulkPending}
              onClick={handleBulk}
            >
              <Plus size={14} weight="bold" />
              <span>{bulkPending ? 'Inscribiendo...' : `Inscribir a todos en ${group}`}</span>
            </button>
          )}
        </div>
      </div>

      {enrollError && (
        <p className="auth-alert-box error" role="alert">
          <WarningCircle size={16} weight="fill" />
          <span>{enrollError}</span>
        </p>
      )}

      {filteredDirectoryStudents.length === 0 ? (
        <div className="empty-state-card" role="status">
          <UsersThree size={26} weight="regular" />
          <h3>Sin estudiantes en este filtro</h3>
          <p>Ajusta tu búsqueda o cambia el filtro de inscripción para ver estudiantes.</p>
        </div>
      ) : (
        <div className="db-student-list" role="list">
          {filteredDirectoryStudents.map((student) => {
            const isEnrolled = enrolledIdsInCurrentGroup.some(
              (id) => String(id) === String(student.id),
            );
            const isBusy = String(pendingStudentId) === String(student.id);
            const studentCourses = Object.entries(enrollmentsByGroup)
              .filter(
                ([, ids]) =>
                  Array.isArray(ids) && ids.some((id) => String(id) === String(student.id)),
              )
              .map(([cCode]) => cCode);

            return (
              <article className="db-student-row" key={student.id} role="listitem">
                <div className="db-student-identity">
                  <span className="db-student-avatar">
                    <AvatarGlyph avatar={student.avatar} size={22} />
                  </span>
                  <div className="db-student-copy">
                    <div className="db-student-name-line">
                      <strong>{student.name}</strong>
                      <span className="db-student-xp-badge">
                        Nv. {student.level || 1} · {student.points || 0} XP
                      </span>
                    </div>
                    <small className="db-student-email">
                      {student.email || 'Estudiante registrado'} · {student.completedCount || 0} misiones superadas
                    </small>
                    <div className="db-student-course-tags">
                      {studentCourses.length > 0 ? (
                        studentCourses.map((cCode) => (
                          <span
                            key={cCode}
                            className={
                              cCode === group ? 'student-course-tag active' : 'student-course-tag'
                            }
                          >
                            Curso {cCode}
                          </span>
                        ))
                      ) : (
                        <span className="student-course-tag empty">Sin curso asignado</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="db-student-actions">
                  <button
                    type="button"
                    disabled={isBusy}
                    className={isEnrolled ? 'button-secondary-pill enrolled-pill' : 'button-primary'}
                    onClick={() => handleToggle(student.id, !isEnrolled)}
                  >
                    {isBusy ? (
                      <span>Actualizando...</span>
                    ) : isEnrolled ? (
                      <>
                        <Check size={14} weight="bold" />
                        <span>Inscrito en {group} (Retirar)</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} weight="bold" />
                        <span>Inscribir en {group}</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
