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

function resolveInitialPublicView() {
  if (typeof window === 'undefined') return 'landing';
  const params = new URLSearchParams(window.location.search);
  return params.get('resetToken') || params.get('mode') === 'login' ? 'login' : 'landing';
}

/**
 * Compositor raíz de CodeKids: coordina navegación de vistas públicas, portal estudiante y consola docente.
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

  const classroomRefreshRef = useRef(null);

  const clearActiveWorkspaces = useCallback(() => {
    setActiveSkill('');
    setActiveAssignment(null);
    setActivePython(false);
    setActivePythonMissionId('');
    setActiveCodeWorld(null);
  }, []);

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
  }, [view, activeSkill, activeAssignment, activePython, activeCodeWorld, scrollBehavior]);

  const handleEnterSession = async (user) => {
    await enter(user);
    setView('home');
    setPublicView('landing');
  };

  const handleExitSession = async () => {
    await exit();
    setView('home');
    setPublicView('landing');
  };

  const openLoginView = () => {
    setPublicView('login');
    window.scrollTo({ top: 0, behavior: scrollBehavior });
  };

  const openLandingView = () => {
    setPublicView('landing');
    window.scrollTo({ top: 0, behavior: scrollBehavior });
  };

  const resetToHome = () => {
    clearActiveWorkspaces();
    if (!state.user) setPublicView('landing');
    setView('home');
    window.scrollTo({ top: 0, behavior: scrollBehavior });
  };

  const goToMissions = () => {
    clearActiveWorkspaces();
    if (!state.user) {
      if (publicView !== 'landing') setPublicView('landing');
      window.setTimeout(() => {
        document.getElementById('mundos')?.scrollIntoView({ behavior: scrollBehavior });
      }, 80);
      return;
    }
    setView('home');
    window.setTimeout(() => {
      document.getElementById('curriculum')?.scrollIntoView({ behavior: scrollBehavior });
    }, 60);
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

  const showMobileStudentBar =
    state.user?.role === 'student' &&
    !activePython &&
    !activeCodeWorld &&
    !activeSkill &&
    !activeAssignment;

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
        onGoMissions={goToMissions}
        publicView={publicView}
        onOpenLogin={openLoginView}
        onBackToLanding={openLandingView}
      />

      {!state.user ? (
        publicView === 'login' ? (
          <LoginView onEnter={handleEnterSession} onBackToLanding={openLandingView} />
        ) : (
          <PresentationLanding onOpenLogin={openLoginView} />
        )
      ) : state.user.role === 'teacher' ? (
        <TeacherDashboard
          state={state}
          courses={classroomData.courses}
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
          reducedMotion={Boolean(a11y.reducedMotion)}
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
        <ResultView state={state} onDone={() => setView('home')} />
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
        />
      )}

      <Footer
        user={state.user}
        onHome={resetToHome}
        onGoMissions={goToMissions}
        onPython={openPythonLab}
        onAssessment={openAssessment}
        onOpenLogin={openLoginView}
      />

      {showMobileStudentBar && (
        <MobileBottomBar
          view={view}
          avatarShopOpen={avatarShop}
          onHome={resetToHome}
          onGoMissions={goToMissions}
          onOpenPython={openPythonLab}
          onOpenAssessment={openAssessment}
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
