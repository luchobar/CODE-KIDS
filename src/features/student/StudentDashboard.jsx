import { useMemo, useState } from 'react';
import { buildStudentWorldsCatalog } from '../../domain/gamificationCatalog.js';
import { computeEarnedBadges } from '../../domain/progressRules.js';
import { useAdaptiveRoute } from '../../hooks/useAdaptiveRoute.js';
import StudentLabsTab from './StudentLabsTab.jsx';
import StudentLearnTab from './StudentLearnTab.jsx';
import StudentOverviewTab from './StudentOverviewTab.jsx';
import StudentProgressTab from './StudentProgressTab.jsx';

/**
 * Portal del estudiante organizado en 4 vistas controladas desde la barra global unificada
 * (y la barra inferior móvil), sin barras de pestañas duplicadas.
 */
export default function StudentDashboard({
  state,
  onAssessment,
  onPractice,
  onPython,
  onOpenCodeWorld,
  expansionData,
  pythonProgress,
  group,
  availableCourses = [],
  enrolledGroups = [],
  onGroupChange,
  onOpenAssignment,
  onOpenShop,
  activeTab,
  onTabChange,
  selectedLearnSkill,
  onSelectLearnSkill,
  reducedMotion = false,
}) {
  const [fallbackTab, setFallbackTab] = useState('overview');
  const [fallbackSkill, setFallbackSkill] = useState('Secuencias');

  const currentTab = activeTab || fallbackTab;
  const currentSkill = selectedLearnSkill || fallbackSkill;
  const changeTab = (nextTab, nextSkill = '') => {
    if (onTabChange) {
      onTabChange(nextTab, nextSkill);
    } else {
      setFallbackTab(nextTab);
      if (nextSkill) setFallbackSkill(nextSkill);
    }
  };
  const changeSkill = (nextSkill) => {
    if (onSelectLearnSkill) onSelectLearnSkill(nextSkill);
    else setFallbackSkill(nextSkill);
  };

  const completed = state.completedMissions || [];
  const allCompleted = useMemo(
    () => Array.from(new Set([...completed, ...(pythonProgress || [])])),
    [completed, pythonProgress],
  );
  const assignments = (state.assignments || []).filter((assignment) => assignment.group === group);
  const submissions = state.submissions || [];

  const worlds = useMemo(() => buildStudentWorldsCatalog(expansionData), [expansionData]);
  const blocklyWorlds = useMemo(() => worlds.slice(0, 4), [worlds]);

  const { aiRoute, routeStatus } = useAdaptiveRoute({
    userName: state.user.name,
    scores: state.scores,
    completed: state.completedMissions,
    submissions: state.submissions,
    blocklyWorlds,
  });

  const openMissionById = (missionId) => {
    if (!missionId) return;
    if (missionId.startsWith('python-') || missionId.startsWith('py-')) {
      onPython(missionId);
    } else if (missionId.startsWith('html-')) {
      onOpenCodeWorld('ciudadela-html', missionId);
    } else if (missionId.startsWith('js-')) {
      onOpenCodeWorld('neo-tokio-javascript', missionId);
    } else {
      onPractice(missionId);
    }
  };

  const firstOpen =
    worlds.flatMap((world) => world.ids).find((id) => !allCompleted.includes(id)) || 'sequence-forest';
  const firstBlocklyOpen =
    blocklyWorlds.flatMap((world) => world.ids).find((id) => !allCompleted.includes(id)) ||
    'sequence-forest';
  const totalMissionCount = worlds.reduce((sum, world) => sum + world.ids.length, 0);
  const completedMissionCount = worlds.reduce(
    (sum, world) => sum + world.ids.filter((id) => allCompleted.includes(id)).length,
    0,
  );
  const pythonWorldIds = worlds.find((w) => w.skill === 'Python')?.ids || [];
  const pythonDoneCount = pythonWorldIds.filter((id) => allCompleted.includes(id)).length;
  const badges = computeEarnedBadges(allCompleted);

  return (
    <main id="top" className="apple-page">
      <div key={currentTab} className="view-stage-panel">
        {currentTab === 'overview' && (
          <StudentOverviewTab
            state={state}
            group={group}
            badges={badges}
            completedMissionCount={completedMissionCount}
            totalMissionCount={totalMissionCount}
            aiRoute={aiRoute}
            routeStatus={routeStatus}
            firstOpen={firstOpen}
            assignments={assignments}
            submissions={submissions}
            onAssessment={onAssessment}
            onOpenMissionById={openMissionById}
            onNavigateTab={changeTab}
          />
        )}

        {currentTab === 'learn' && (
          <StudentLearnTab
            selectedSkill={currentSkill}
            onSelectSkill={changeSkill}
            worlds={worlds}
            allCompleted={allCompleted}
            completedMissionCount={completedMissionCount}
            totalMissionCount={totalMissionCount}
            onOpenMissionById={openMissionById}
            reducedMotion={reducedMotion}
          />
        )}

        {currentTab === 'labs' && (
          <StudentLabsTab
            firstBlocklyOpen={firstBlocklyOpen}
            pythonDoneCount={pythonDoneCount}
            group={group}
            studentName={state.user.name}
            assignments={assignments}
            submissions={submissions}
            availableCourses={availableCourses}
            enrolledGroups={enrolledGroups}
            onGroupChange={onGroupChange}
            onOpenAssignment={onOpenAssignment}
            onPractice={onPractice}
            onPython={onPython}
            onOpenCodeWorld={onOpenCodeWorld}
            onAssessment={onAssessment}
          />
        )}

        {currentTab === 'progress' && (
          <StudentProgressTab
            state={state}
            completedMissionCount={completedMissionCount}
            badges={badges}
            onOpenShop={onOpenShop}
            onStudySkill={(skill) => changeTab('learn', skill)}
          />
        )}
      </div>
    </main>
  );
}
