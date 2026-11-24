import { useMemo, useState } from 'react';
import {
  GraduationCap,
  NotePencil,
  Plus,
  Sparkle,
  UsersThree,
} from '@phosphor-icons/react';
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
import TeacherPedagogyGuide from './TeacherPedagogyGuide.jsx';

/**
 * Consola docente multi-vista controlada desde la barra de navegación global unificada
 * (sin barras de pestañas duplicadas).
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
  activeTab,
  onTabChange,
  selectedGroup,
  onSelectGroup,
}) {
  const courseList = courses.length > 0 ? courses : DEFAULT_COURSES;
  const [fallbackGroup, setFallbackGroup] = useState(courseList[0]?.codigoGrupo || '5° A');
  const [fallbackTab, setFallbackTab] = useState('overview');
  const [draftExercise, setDraftExercise] = useState(null);
  const [assignedProposalIds, setAssignedProposalIds] = useState([]);

  const group = selectedGroup || fallbackGroup;
  const setGroup = (nextGroup) => {
    if (onSelectGroup) onSelectGroup(nextGroup);
    else setFallbackGroup(nextGroup);
  };

  const currentTab = activeTab || fallbackTab;
  const changeTab = (nextTab) => {
    if (onTabChange) onTabChange(nextTab);
    else setFallbackTab(nextTab);
  };

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

  const { aiInsights, aiStatus, teacherFocus, setTeacherFocus, reloadInsights } = useTeacherInsights({
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
    changeTab('assignments');
  };

  const currentCourseMeta = courseList.find((c) => c.codigoGrupo === group);

  return (
    <main id="top" className="apple-page">
      <div key={currentTab} className="view-stage-panel">
        {currentTab === 'overview' && (
          <div className="portal-tab-stack">
            <section className="product-tile-light teacher-hero-tile compact-portal-hero">
              <div className="tile-container split-hero-grid">
                <div className="split-hero-copy">
                  <span className="hero-eyebrow">PANEL DOCENTE | {state.user.name.toUpperCase()}</span>
                  <h1 className="hero-display">Gestión de aula sin fricciones.</h1>
                  <p className="hero-lead">
                    Supervisa el curso <b>{group}</b>, administra matrículas en Supabase y publica actividades interactivas de programación.
                  </p>
                  <div className="teacher-hero-actions">
                    <button
                      type="button"
                      className="button-secondary-pill"
                      onClick={() => changeTab('courses')}
                    >
                      <Plus size={15} weight="bold" />
                      <span>Crear curso / Inscribir</span>
                    </button>
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => changeTab('assignments')}
                    >
                      <NotePencil size={15} weight="bold" />
                      <span>Asignar actividad</span>
                    </button>
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

            <section className="product-tile-parchment">
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

                <div className="roster-header-bar">
                  <div>
                    <h2 className="display-lg">Avance del grupo {group}</h2>
                    <p className="body-copy">
                      Seguimiento individual de desempeño promedio y habilidad prioritaria a reforzar.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button-secondary-pill"
                    onClick={() => changeTab('analytics')}
                  >
                    <Sparkle size={15} weight="fill" />
                    <span>Ver analítica SQL e IA</span>
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
                  <div className="dark-empty-card" role="status">
                    <UsersThree size={28} weight="regular" />
                    <p>
                      Aún no hay estudiantes inscritos en {group}. Ve a «Cursos y Matrícula» para inscribirlos en un clic.
                    </p>
                  </div>
                )}

                <TeacherPedagogyGuide />
              </div>
            </section>
          </div>
        )}

        {currentTab === 'courses' && (
          <section className="product-tile-parchment">
            <div className="tile-container">
              <div className="subsection-header">
                <span className="hero-eyebrow">🏫 ADMINISTRACIÓN DE CURSOS</span>
                <h2 className="display-lg">Cursos y matrícula en BD ({group})</h2>
                <p className="body-copy">
                  Crea nuevos cursos escolares y vincula estudiantes registrados con actualización inmediata.
                </p>
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
            </div>
          </section>
        )}

        {currentTab === 'assignments' && (
          <section className="product-tile-parchment">
            <div className="tile-container">
              <div className="subsection-header">
                <span className="hero-eyebrow">📝 GESTIÓN DE RETOS Y ENTREGAS</span>
                <h2 className="display-lg">Actividades para {group}</h2>
                <p className="body-copy">
                  Publica nuevos retos de bloques o código escrito, edita consignas y califica entregas del curso.
                </p>
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
            </div>
          </section>
        )}

        {currentTab === 'analytics' && (
          <section className="product-tile-dark">
            <div className="tile-container">
              <div className="roster-header-bar">
                <div>
                  <span className="hero-eyebrow">📊 ANALÍTICA PEDAGÓGICA Y SQL (3FN)</span>
                  <h2 className="display-lg">Diagnóstico del curso {group}</h2>
                  <p className="lead-subcopy">
                    Diagnóstico especializado de PIPO junto a consultas analíticas complejas con JOIN, GROUP BY y HAVING.
                  </p>
                </div>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => reloadInsights(teacherFocus)}
                  disabled={aiStatus === 'loading'}
                >
                  <Sparkle size={16} weight="fill" />
                  <span>{aiStatus === 'loading' ? 'PIPO analizando el curso...' : 'Generar diagnóstico con PIPO'}</span>
                </button>
              </div>

              <TeacherAiInsightsPanel
                group={group}
                teacherFocus={teacherFocus}
                onTeacherFocusChange={setTeacherFocus}
                onRequestFocus={(focus) => { setTeacherFocus(focus); reloadInsights(focus); }}
                aiInsights={aiInsights}
                aiStatus={aiStatus}
                groupAssignments={groupAssignments}
                assignedProposalIds={assignedProposalIds}
                onAssignProposal={handleAssignProposal}
                onCustomizeProposal={handleCustomizeProposal}
              />

              <SqlAnalyticalReportsPanel group={group} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
