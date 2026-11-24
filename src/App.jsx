import { useCallback, useEffect, useRef, useState } from 'react';
import CodeWorldLab from './CodeWorldLab.jsx';
import PresentationLanding from './PresentationLanding.jsx';
import PythonMission from './PythonMission.jsx';
import Footer from './components/layout/Footer.jsx';
import Header from './components/layout/Header.jsx';
import MobileBottomBar from './components/layout/MobileBottomBar.jsx';
import LoginView from './features/auth/LoginView.jsx';
import AssessmentView from './features/student/AssessmentView.jsx';
import AvatarShopModal from './features/student/AvatarShopModal.jsx';
import ResultView from './features/student/ResultView.jsx';
import StudentAssignmentModal from './features/student/StudentAssignmentModal.jsx';
import StudentDashboard from './features/student/StudentDashboard.jsx';
import StudentPractice from './features/student/StudentPractice.jsx';
import TeacherDashboard from './features/teacher/TeacherDashboard.jsx';
import { useAccessibility } from './hooks/useAccessibility.js';
import { useAppSession } from './hooks/useAppSession.js';
import { useClassroomState } from './hooks/useClassroomState.js';
import { usePortalNavigation } from './hooks/usePortalNavigation.js';
import { DEFAULT_COURSES } from './data/seedData.js';

function resolveInitialPublicView() {
  if (typeof window === 'undefined') return 'landing';
  const params = new URLSearchParams(window.location.search);
  return params.get('resetToken') || params.get('mode') === 'login' ? 'login' : 'landing';
}

/**
 * Compositor raíz multi-vista de CodeKids: coordina vistas públicas, portal explorador,
 * consola docente, laboratorios interactivos y estado global de navegación.
 */
export default function App() {
  const { a11y, setA11y, resetA11y } = useAccessibility();
  const [view, setView] = useState('home');
  const [activeSkill, setActiveSkill] = useState('');
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [activePython, setActivePython] = useState(false);
  const [activePythonMissionId, setActivePythonMissionId] = useState('');
  const [activeCodeWorld, setActiveCodeWorld] = useState(null);
  const [avatarShop, setAvatarShop] = useState(false);
  const [publicView, setPublicView] = useState(resolveInitialPublicView);
  const [teacherGroup, setTeacherGroup] = useState('5° A');

  const classroomRefreshRef = useRef(null);

  const clearActiveWorkspaces = useCallback(() => {
    setActiveSkill('');
    setActiveAssignment(null);
    setActivePython(false);
    setActivePythonMissionId('');
    setActiveCodeWorld(null);
  }, []);

  const {
    studentTab,
    selectedLearnSkill,
    setSelectedLearnSkill,
    teacherTab,
    landingTab,
    navigateStudentTab,
    navigateTeacherTab,
    navigateLandingTab,
    resetNavigation,
    buildBreadcrumbs,
  } = usePortalNavigation();

  const {
    state,
    setState,
    remoteExpansion,
    enter,
    exit,
    completeMission,
    buyAvatar,
    selectAvatar,
    submitAssignment,
    completeAssessment,
    toggleSound,
    changeStudentGroup,
  } = useAppSession({
    refreshClassroomData: () => classroomRefreshRef.current?.(),
    onWorkspaceReset: clearActiveWorkspaces,
  });

  const {
    classroomData,
    refreshClassroomData,
    handleCreateCourse,
    handleToggleEnrollment,
    handleBulkEnrollAll,
    createAssignment,
    handleUpdateAssignment,
    handleDeleteAssignment,
    handleGradeSubmission,
  } = useClassroomState({
    setState,
    getTeacherId: () => (typeof state.user?.id === 'number' ? state.user.id : 4),
  });

  classroomRefreshRef.current = refreshClassroomData;

  const scrollBehavior = a11y.reducedMotion ? 'auto' : 'smooth';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: scrollBehavior });
  }, [
    view,
    activeSkill,
    activeAssignment,
    activePython,
    activeCodeWorld,
    studentTab,
    teacherTab,
    landingTab,
    publicView,
    scrollBehavior,
  ]);

  const handleEnterSession = async (user) => {
    await enter(user);
    resetNavigation();
    setView('home');
    setPublicView('landing');
  };

  const handleExitSession = async () => {
    await exit();
    resetNavigation();
    setView('home');
    setPublicView('landing');
  };

  const openLoginView = () => {
    setPublicView('login');
  };

  const openLandingView = (nextTab = '') => {
    if (nextTab) navigateLandingTab(nextTab);
    setPublicView('landing');
  };

  const resetToHome = () => {
    clearActiveWorkspaces();
    if (!state.user) {
      setPublicView('landing');
      navigateLandingTab('overview');
    } else if (state.user.role === 'teacher') {
      navigateTeacherTab('overview');
    } else {
      navigateStudentTab('overview');
    }
    setView('home');
  };

  const handleSelectStudentTab = (tabId, skill = '') => {
    clearActiveWorkspaces();
    setView('home');
    navigateStudentTab(tabId, skill);
  };

  const handleSelectTeacherTab = (tabId) => {
    clearActiveWorkspaces();
    navigateTeacherTab(tabId);
  };

  const goToMissions = () => {
    clearActiveWorkspaces();
    if (!state.user) {
      openLandingView('worlds');
      return;
    }
    if (state.user.role === 'teacher') {
      handleSelectTeacherTab('assignments');
      return;
    }
    handleSelectStudentTab('learn');
  };

  const openAssessment = () => {
    clearActiveWorkspaces();
    setView('assessment');
  };

  const openPythonLab = (missionId = '') => {
    clearActiveWorkspaces();
    setActivePythonMissionId(typeof missionId === 'string' ? missionId : '');
    setActivePython(true);
  };

  const openCodeWorldLab = (worldSlug, missionSlug = '') => {
    if (!worldSlug) return;
    clearActiveWorkspaces();
    setActiveCodeWorld({
      worldSlug,
      missionSlug: typeof missionSlug === 'string' ? missionSlug : '',
    });
  };

  const handleFinishAssessment = (answers) => {
    completeAssessment(answers);
    setView('result');
  };

  const teacherCourses =
    classroomData.courses?.length > 0 ? classroomData.courses : DEFAULT_COURSES;
  const activeTeacherGroup = teacherCourses.some((c) => c.codigoGrupo === teacherGroup)
    ? teacherGroup
    : teacherCourses[0]?.codigoGrupo || '5° A';

  const studentGroup = state.user?.group || '5° A';
  const studentPendingCount =
    state.user?.role === 'student'
      ? (state.assignments || [])
          .filter((a) => a.group === studentGroup)
          .filter(
            (a) =>
              !(state.submissions || []).some(
                (s) => s.assignmentId === a.id && s.studentName === state.user.name,
              ),
          ).length
      : 0;
  const teacherAssignmentsCount =
    state.user?.role === 'teacher'
      ? (state.assignments || []).filter((a) => a.group === activeTeacherGroup).length
      : 0;

  const hasOpenWorkspace = Boolean(
    activePython || activeCodeWorld || activeSkill || activeAssignment,
  );
  const showMobileStudentBar = state.user?.role === 'student' && !hasOpenWorkspace;

  const breadcrumbs = buildBreadcrumbs({
    user: state.user,
    view,
    activeSkill,
    activeAssignment,
    activePython,
    activeCodeWorld,
    studentTab,
    teacherTab,
    landingTab,
    onHome: resetToHome,
  });

  return (
    <div className="portal-shell">
      <Header
        user={state.user}
        state={state}
        a11y={a11y}
        onChangeA11y={setA11y}
        onResetA11y={resetA11y}
        onExit={handleExitSession}
        onOpenShop={() => setAvatarShop(true)}
        onToggleSound={toggleSound}
        onAssessment={openAssessment}
        onPython={openPythonLab}
        onHome={resetToHome}
        publicView={publicView}
        onOpenLogin={openLoginView}
        onBackToLanding={() => openLandingView('overview')}
        activeView={hasOpenWorkspace ? 'workspace' : view}
        studentTab={studentTab}
        onStudentTabChange={(tab) => handleSelectStudentTab(tab)}
        studentPendingCount={studentPendingCount}
        teacherTab={teacherTab}
        onTeacherTabChange={handleSelectTeacherTab}
        teacherGroup={activeTeacherGroup}
        onTeacherGroupChange={setTeacherGroup}
        teacherCourses={teacherCourses}
        enrollmentsByGroup={classroomData.enrollmentsByGroup}
        teacherAssignmentsCount={teacherAssignmentsCount}
        landingTab={landingTab}
        onLandingTabChange={openLandingView}
        breadcrumbs={breadcrumbs}
      />

      {!state.user ? (
        publicView === 'login' ? (
          <LoginView onEnter={handleEnterSession} onBackToLanding={() => openLandingView('overview')} />
        ) : (
          <PresentationLanding
            onOpenLogin={openLoginView}
            activeTab={landingTab}
            onTabChange={navigateLandingTab}
          />
        )
      ) : state.user.role === 'teacher' ? (
        <TeacherDashboard
          state={state}
          courses={teacherCourses}
          dbStudents={classroomData.students}
          enrollmentsByGroup={classroomData.enrollmentsByGroup}
          onCreateCourse={handleCreateCourse}
          onToggleEnrollment={handleToggleEnrollment}
          onBulkEnrollAll={handleBulkEnrollAll}
          onCreate={createAssignment}
          onUpdateAssignment={handleUpdateAssignment}
          onDeleteAssignment={handleDeleteAssignment}
          onGradeSubmission={handleGradeSubmission}
          remoteExpansion={remoteExpansion}
          activeTab={teacherTab}
          onTabChange={navigateTeacherTab}
          selectedGroup={activeTeacherGroup}
          onSelectGroup={setTeacherGroup}
        />
      ) : activePython ? (
        <PythonMission
          completed={Array.from(
            new Set([...(state.pythonProgress || []), ...(state.completedMissions || [])]),
          )}
          initialMissionId={activePythonMissionId}
          customMissions={remoteExpansion?.misiones || null}
          onComplete={(id, xp = 15, coins = 10) =>
            completeMission(id, xp, coins, { trackPython: true })
          }
          onClose={() => {
            setActivePython(false);
            setActivePythonMissionId('');
          }}
        />
      ) : activeCodeWorld ? (
        <CodeWorldLab
          worldSlug={activeCodeWorld.worldSlug}
          initialMissionSlug={activeCodeWorld.missionSlug}
          customWorlds={remoteExpansion?.mundos || null}
          customMissions={remoteExpansion?.misiones || null}
          completed={state.completedMissions || []}
          onComplete={(slug, xp = 25, coins = 15) => completeMission(slug, xp, coins)}
          onClose={() => setActiveCodeWorld(null)}
        />
      ) : activeSkill ? (
        <StudentPractice
          skill={activeSkill}
          onClose={() => setActiveSkill('')}
          onComplete={(missionId) => completeMission(missionId, 10, 10)}
          soundEnabled={state.soundEnabled}
        />
      ) : activeAssignment ? (
        <StudentAssignmentModal
          assignment={activeAssignment.assignment}
          previousSubmission={activeAssignment.previousSubmission}
          onSubmit={submitAssignment}
          onClose={() => setActiveAssignment(null)}
          soundEnabled={state.soundEnabled}
          remoteExpansion={remoteExpansion}
        />
      ) : view === 'assessment' ? (
        <AssessmentView onSubmit={handleFinishAssessment} onCancel={() => setView('home')} />
      ) : view === 'result' ? (
        <ResultView
          state={state}
          onDone={() => setView('home')}
          onStudySkill={(skill) => handleSelectStudentTab('learn', skill)}
        />
      ) : (
        <StudentDashboard
          state={state}
          onAssessment={openAssessment}
          onPractice={setActiveSkill}
          onPython={openPythonLab}
          onOpenCodeWorld={openCodeWorldLab}
          expansionData={remoteExpansion}
          pythonProgress={state.pythonProgress || []}
          group={state.user.group || '5° A'}
          availableCourses={classroomData.courses}
          enrolledGroups={state.user.enrolledGroups || []}
          onGroupChange={changeStudentGroup}
          onOpenAssignment={(assignment, previousSubmission) =>
            setActiveAssignment({ assignment, previousSubmission })
          }
          onOpenShop={() => setAvatarShop(true)}
          activeTab={studentTab}
          onTabChange={navigateStudentTab}
          selectedLearnSkill={selectedLearnSkill}
          onSelectLearnSkill={setSelectedLearnSkill}
          reducedMotion={Boolean(a11y.reducedMotion)}
        />
      )}

      <Footer
        user={state.user}
        onHome={resetToHome}
        onGoMissions={goToMissions}
        onPython={openPythonLab}
        onAssessment={openAssessment}
        onOpenLogin={openLoginView}
        onSelectStudentSkill={(skill) => handleSelectStudentTab('learn', skill)}
        onSelectLandingTab={openLandingView}
      />

      {showMobileStudentBar && (
        <MobileBottomBar
          view={view}
          studentTab={studentTab}
          avatarShopOpen={avatarShop}
          onSelectTab={(tabId) => handleSelectStudentTab(tabId)}
          onOpenShop={() => setAvatarShop(true)}
        />
      )}

      {avatarShop && state.user?.role === 'student' && (
        <AvatarShopModal
          state={state}
          onClose={() => setAvatarShop(false)}
          onBuy={buyAvatar}
          onSelect={selectAvatar}
        />
      )}
    </div>
  );
}
