import { useMemo, useState } from 'react';
import { GraduationCap, NotePencil, Plus, Sparkle, UsersThree } from '@phosphor-icons/react';
import StatCard from '../../components/layout/StatCard.jsx';
import { DEFAULT_COURSES } from '../../data/seedData.js';
import { SAMPLE_STUDENTS } from '../../domain/gamificationCatalog.js';
import { useTeacherInsights } from '../../hooks/useTeacherInsights.js';
import AssignmentResultsPanel from './AssignmentResultsPanel.jsx';
import CreateAssignmentPanel from './CreateAssignmentPanel.jsx';
import CreateCourseCard from './CreateCourseCard.jsx';
import SqlAnalyticalReportsPanel from './SqlAnalyticalReportsPanel.jsx';
import StudentDirectoryCard from './StudentDirectoryCard.jsx';
import TeacherAiInsightsPanel from './TeacherAiInsightsPanel.jsx';

function scrollIntoSection(id, reducedMotion) {
  document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
}

/**
 * Consola de gestión docente: cursos, matrícula de estudiantes, asignación/calificación,
 * informes SQL analíticos y asesoría pedagógica con IA.
 */
export default function TeacherDashboard({
  state,
  courses = [],
  dbStudents = [],
  enrollmentsByGroup = {},
  onCreateCourse,
  onToggleEnrollment,
  onBulkEnrollAll,
  onCreate,
  onUpdateAssignment,
  onDeleteAssignment,
  onGradeSubmission,
  remoteExpansion = null,
  reducedMotion = false,
}) {
  const courseList = courses.length > 0 ? courses : DEFAULT_COURSES;
  const [group, setGroup] = useState(courseList[0]?.codigoGrupo || '5° A');
  const [draftExercise, setDraftExercise] = useState(null);
  const [assignedProposalIds, setAssignedProposalIds] = useState([]);

  const allStudents = dbStudents.length > 0 ? dbStudents : SAMPLE_STUDENTS;
  const enrolledIdsInCurrentGroup = enrollmentsByGroup[group] || [];

  const enrolledDbStudents = useMemo(
    () =>
      allStudents.filter((student) =>
        enrolledIdsInCurrentGroup.some((id) => String(id) === String(student.id)),
      ),
    [allStudents, enrolledIdsInCurrentGroup],
  );

  const groupAssignments = useMemo(
    () => (state.assignments || []).filter((assignment) => assignment.group === group),
    [state.assignments, group],
  );

  const groupSubmissions = useMemo(
    () =>
      (state.submissions || [])
        .filter((submission) => submission.group === group)
        .sort((a, b) => b.createdAt - a.createdAt),
    [state.submissions, group],
  );

  const visibleStudents = useMemo(() => {
    const submissionStudents = [...new Set(groupSubmissions.map((s) => s.studentName))].map(
      (name) => {
        const rows = groupSubmissions.filter((s) => s.studentName === name);
        const skillScores = Object.entries(
          rows.reduce(
            (scores, row) => ({ ...scores, [row.skill]: [...(scores[row.skill] || []), row.score] }),
            {},
          ),
        )
          .map(([skill, values]) => [
            skill,
            Math.round(values.reduce((sum, val) => sum + val, 0) / values.length),
          ])
          .sort((a, b) => a[1] - b[1]);

        return {
          name,
          group,
          score: Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length),
          weak: skillScores[0]?.[0] || 'Bucles',
        };
      },
    );

    return [
      ...enrolledDbStudents.map((base) => {
        const sub = submissionStudents.find((s) => s.name === base.name);
        return sub ? { ...base, score: sub.score, weak: sub.weak, group } : { ...base, group };
      }),
      ...submissionStudents.filter((sub) => !enrolledDbStudents.some((base) => base.name === sub.name)),
    ];
  }, [enrolledDbStudents, groupSubmissions, group]);

  const { aiInsights, aiStatus, reloadInsights } = useTeacherInsights({
    group,
    visibleStudents,
    groupSubmissions,
    groupAssignments,
    remoteExpansion,
  });

  const handleAssignProposal = async (proposal, proposalKey) => {
    await onCreate({
      title: proposal.title,
      instructions: proposal.instructions,
      skill: proposal.skill,
      templateId: proposal.templateId,
      missionId: proposal.missionId,
      group,
    });
    setAssignedProposalIds((current) => [...new Set([...current, proposalKey])]);
  };

  const handleCustomizeProposal = (proposal) => {
    setDraftExercise({
      missionId: proposal.missionId,
      skill: proposal.skill,
      title: proposal.title,
      instructions: proposal.instructions,
      updatedAt: Date.now(),
    });
    scrollIntoSection('create-exercise', reducedMotion);
  };

  const currentCourseMeta = courseList.find((c) => c.codigoGrupo === group);

  return (
    <main id="top" className="apple-page">
      <section className="product-tile-light teacher-hero-tile">
        <div className="tile-container split-hero-grid">
          <div className="split-hero-copy">
            <span className="hero-eyebrow">PANEL DOCENTE | {state.user.name.toUpperCase()}</span>
            <h1 className="hero-display">Gestiona tus cursos y actividades.</h1>
            <p className="hero-lead">
              Crea cursos, inscribe a los estudiantes registrados en la base de datos de Supabase y asígnales retos de Blockly, Python, HTML5 y JavaScript.
            </p>
            <div className="teacher-course-bar">
              <div className="course-selector-group" role="group" aria-label="Seleccionar curso">
                {courseList.map((courseItem) => {
                  const cCode = courseItem.codigoGrupo;
                  const count = (enrollmentsByGroup[cCode] || []).length;
                  return (
                    <button
                      type="button"
                      key={cCode}
                      className={group === cCode ? 'configurator-option-chip selected' : 'configurator-option-chip'}
                      onClick={() => setGroup(cCode)}
                    >
                      <span>
                        Curso {cCode} ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="teacher-hero-actions">
                <button
                  type="button"
                  className="button-secondary-pill"
                  onClick={() => scrollIntoSection('courses-manager', reducedMotion)}
                >
                  <Plus size={15} weight="bold" />
                  <span>Crear curso / Inscribir</span>
                </button>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => scrollIntoSection('create-exercise', reducedMotion)}
                >
                  <NotePencil size={15} weight="bold" />
                  <span>Asignar actividad</span>
                </button>
              </div>
            </div>
          </div>
          <div className="split-hero-visual">
            <img
              className="product-render-shadow hero-product-image"
              src="/images/teacher-studio.png"
              alt="Aula interactiva CodeKids con bloques de programación y robot Pipo"
              width="960"
              height="720"
            />
          </div>
        </div>
      </section>

      <section id="courses-manager" className="product-tile-parchment teacher-courses-section">
        <div className="tile-container">
          <div className="metrics-bento-grid">
            <StatCard
              icon={<GraduationCap size={22} weight="regular" />}
              label="Cursos activos"
              value={courseList.length}
              note={currentCourseMeta?.nombre || `Curso ${group}`}
              tone="lav"
            />
            <StatCard
              icon={<UsersThree size={22} weight="regular" />}
              label={`Inscritos en ${group}`}
              value={enrolledDbStudents.length}
              note={`De ${allStudents.length} estudiantes en BD`}
              tone="blue"
            />
            <StatCard
              icon={<NotePencil size={22} weight="regular" />}
              label="Actividades"
              value={groupAssignments.length}
              note={`Asignadas a ${group}`}
              tone="mint"
            />
          </div>

          <div className="teacher-courses-management-grid">
            <CreateCourseCard
              allStudents={allStudents}
              onCreateCourse={onCreateCourse}
              onCourseCreated={setGroup}
            />
            <StudentDirectoryCard
              group={group}
              allStudents={allStudents}
              enrolledDbStudents={enrolledDbStudents}
              enrolledIdsInCurrentGroup={enrolledIdsInCurrentGroup}
              enrollmentsByGroup={enrollmentsByGroup}
              onToggleEnrollment={onToggleEnrollment}
              onBulkEnrollAll={onBulkEnrollAll}
            />
          </div>

          <div className="teacher-workflow-grid" id="create-exercise">
            <CreateAssignmentPanel
              group={group}
              courses={courseList}
              onCreate={onCreate}
              draftExercise={draftExercise}
              remoteExpansion={remoteExpansion}
            />
            <AssignmentResultsPanel
              submissions={groupSubmissions}
              assignments={groupAssignments}
              onUpdateAssignment={onUpdateAssignment}
              onDeleteAssignment={onDeleteAssignment}
              onGradeSubmission={onGradeSubmission}
            />
          </div>

          <SqlAnalyticalReportsPanel group={group} />
        </div>
      </section>

      <section id="curriculum" className="product-tile-dark">
        <div className="tile-container">
          <div className="roster-header-bar">
            <div>
              <h2 className="display-lg">Avance del grupo {group}.</h2>
              <p className="lead-subcopy">
                Seguimiento de los estudiantes inscritos en {group}, informe pedagógico y propuestas de nuevas actividades.
              </p>
            </div>
            <button
              type="button"
              className="button-primary"
              onClick={reloadInsights}
              disabled={aiStatus === 'loading'}
            >
              <Sparkle size={16} weight="fill" />
              <span>{aiStatus === 'loading' ? 'Generando informe...' : 'Actualizar informe con Ollama'}</span>
            </button>
          </div>

          {visibleStudents.length ? (
            <div className="student-roster-cards">
              {visibleStudents.map((student) => (
                <article className="roster-student-card" key={student.id || student.name}>
                  <div className="roster-student-head">
                    <span className="student-initial-badge">{student.name.charAt(0)}</span>
                    <div>
                      <h3>{student.name}</h3>
                      <small>
                        Curso {group}
                        {student.email ? ` · ${student.email}` : ''}
                      </small>
                    </div>
                    <strong className="roster-score-number">{student.score || 78}%</strong>
                  </div>
                  <div className="roster-student-meta">
                    <span>Falencia a reforzar: {student.weak || 'Bucles'}</span>
                    <span>{(student.score || 78) > 80 ? 'En camino' : 'Requiere refuerzo'}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="dark-empty-card">
              <UsersThree size={28} weight="regular" />
              <p>
                Aún no hay estudiantes inscritos en {group}. Usa el panel superior «Estudiantes en Base de Datos» para inscribirlos con un clic.
              </p>
            </div>
          )}

          <TeacherAiInsightsPanel
            group={group}
            aiInsights={aiInsights}
            aiStatus={aiStatus}
            groupAssignments={groupAssignments}
            assignedProposalIds={assignedProposalIds}
            onAssignProposal={handleAssignProposal}
            onCustomizeProposal={handleCustomizeProposal}
          />
        </div>
      </section>
    </main>
  );
}
