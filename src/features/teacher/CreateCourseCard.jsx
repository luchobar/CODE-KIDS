import { useState } from 'react';
import { CheckCircle, GraduationCap, Plus, WarningCircle } from '@phosphor-icons/react';
import { AvatarGlyph } from '../../components/layout/Glyphs.jsx';

/**
 * Formulario docente para crear un curso en la base de datos e inscribir estudiantes iniciales.
 */
export default function CreateCourseCard({ allStudents, onCreateCourse, onCourseCreated }) {
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [creatingCourse, setCreatingCourse] = useState(false);

  const togglePreselectStudent = (studentId) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  };

  const handleCreateCourseSubmit = async (event) => {
    event.preventDefault();
    const cleanCode = newCourseCode.trim();
    if (!cleanCode || creatingCourse) return;
    setCreatingCourse(true);
    setFeedback(null);
    try {
      await onCreateCourse({
        codigoGrupo: cleanCode,
        nombre: newCourseName.trim() || `Curso ${cleanCode}`,
        studentIds: selectedStudentIds,
      });
      onCourseCreated(cleanCode);
      setFeedback({
        type: 'success',
        text: `Curso «${cleanCode}» creado con ${selectedStudentIds.length} estudiante(s) inscrito(s).`,
      });
      setNewCourseCode('');
      setNewCourseName('');
      setSelectedStudentIds([]);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err?.message || 'No se pudo crear el curso.',
      });
    } finally {
      setCreatingCourse(false);
    }
  };

  return (
    <form className="store-utility-card create-course-card" onSubmit={handleCreateCourseSubmit}>
      <div className="card-header-row">
        <div>
          <h3>Crear nuevo curso</h3>
          <p>
            Crea un aula en la base de datos y selecciona qué estudiantes deseas inscribir de inmediato.
          </p>
        </div>
        <GraduationCap size={24} weight="duotone" />
      </div>

      <div className="course-form-row">
        <div className="form-field-block">
          <label className="field-label" htmlFor="new-course-code">
            Código del curso (ej. 7° A, 8° B, Robótica)
          </label>
          <input
            id="new-course-code"
            className="search-input"
            placeholder="Ej. 7° A"
            value={newCourseCode}
            onChange={(e) => setNewCourseCode(e.target.value)}
            required
          />
        </div>

        <div className="form-field-block">
          <label className="field-label" htmlFor="new-course-name">
            Nombre descriptivo del curso
          </label>
          <input
            id="new-course-name"
            className="search-input"
            placeholder="Ej. Grado 7° A - Código Python, HTML y JS"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
          />
        </div>
      </div>

      <div className="form-field-block">
        <div className="field-label-row">
          <label className="field-label">
            Inscribir estudiantes de la base de datos ({selectedStudentIds.length} seleccionados)
          </label>
          <div className="inline-mini-actions">
            <button
              type="button"
              className="text-link"
              onClick={() => setSelectedStudentIds(allStudents.map((s) => s.id))}
            >
              Seleccionar todos
            </button>
            {selectedStudentIds.length > 0 && (
              <button
                type="button"
                className="text-link"
                onClick={() => setSelectedStudentIds([])}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="student-preselect-chips" role="group" aria-label="Estudiantes disponibles en base de datos">
          {allStudents.map((student) => {
            const isChecked = selectedStudentIds.includes(student.id);
            return (
              <button
                type="button"
                key={student.id}
                aria-pressed={isChecked}
                className={isChecked ? 'student-select-pill selected' : 'student-select-pill'}
                onClick={() => togglePreselectStudent(student.id)}
              >
                <AvatarGlyph avatar={student.avatar} size={15} />
                <span>{student.name}</span>
                <small>{isChecked ? '✓ Incluir' : '+'}</small>
              </button>
            );
          })}
        </div>
      </div>

      <button type="submit" className="button-primary full-width-btn" disabled={creatingCourse}>
        <Plus size={16} weight="bold" />
        <span>
          {creatingCourse ? 'Guardando curso en Supabase...' : 'Crear curso e inscribir seleccionados'}
        </span>
      </button>

      {feedback && (
        <p
          className={feedback.type === 'error' ? 'auth-alert-box error' : 'publish-success'}
          role={feedback.type === 'error' ? 'alert' : 'status'}
        >
          {feedback.type === 'error' ? (
            <WarningCircle size={16} weight="fill" />
          ) : (
            <CheckCircle size={16} weight="fill" />
          )}
          <span>{feedback.text}</span>
        </p>
      )}
    </form>
  );
}
