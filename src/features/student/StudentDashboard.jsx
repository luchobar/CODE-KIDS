import { useMemo } from 'react';
import {
  ArrowRight,
  FileHtml,
  FileJs,
  Flame,
  Lightning,
  Play,
  Sparkle,
  TerminalWindow,
  Trophy,
} from '@phosphor-icons/react';
import StatCard from '../../components/layout/StatCard.jsx';
import { buildStudentWorldsCatalog } from '../../domain/gamificationCatalog.js';
import { computeEarnedBadges } from '../../domain/progressRules.js';
import { useAdaptiveRoute } from '../../hooks/useAdaptiveRoute.js';
import StudentAssignmentsSection from './StudentAssignmentsSection.jsx';
import StudentProfilePanel from './StudentProfilePanel.jsx';
import WorldMapSection from './WorldMapSection.jsx';

/**
 * Panel principal del estudiante: hero, métricas, ruta adaptativa IA, mapa de mundos y retos escolares.
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
}) {
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
      <section className="product-tile-light student-hero-tile">
        <div className="tile-container split-hero-grid">
          <div className="split-hero-copy">
            <span className="hero-eyebrow">🚀 TU MODO HISTORIA · MAPA DE AVENTURA</span>
            <h1 className="hero-display">¡Hola, {state.user.name}!</h1>
            <p className="hero-lead">
              Cada misión completada en bloques, Python, HTML5 o JavaScript suma XP a tu rango de explorador. ¿Listo para tu siguiente reto?
            </p>
            <div className="hero-cta-row">
              <button
                type="button"
                className="button-primary adventure-cta-btn cta-3d-lime"
                onClick={() => openMissionById(firstOpen)}
              >
                <Play size={16} weight="fill" />
                <span>Continuar misión actual</span>
              </button>
              <button type="button" className="button-secondary-pill" onClick={onAssessment}>
                <Sparkle size={15} weight="duotone" />
                <span>Test de nivelación</span>
              </button>
            </div>
          </div>
          <div className="split-hero-visual">
            <img
              className="product-render-shadow hero-product-image"
              src="/images/hero-codekids.png"
              alt="Robot Pipo listo para una nueva misión de bloques"
              width="960"
              height="720"
            />
          </div>
        </div>
      </section>

      <section className="product-tile-parchment">
        <div className="tile-container">
          <div className="section-header-stack">
            <h2 className="display-lg">Tu centro de mando.</h2>
            <p className="lead-subcopy">
              Consulta tu experiencia acumulada, tu racha diaria y las sugerencias personalizadas por IA.
            </p>
          </div>

          <div className="metrics-bento-grid">
            <StatCard
              icon={<Lightning size={24} weight="fill" />}
              label="Experiencia Total"
              value={`${state.points} XP`}
              note={`Explorador Nivel ${Math.floor((state.points || 0) / 100) + 1}`}
              tone="mint"
            />
            <StatCard
              icon={<Flame size={24} weight="fill" />}
              label="Racha Activa"
              value={`${state.streak || 1} ${(state.streak || 1) === 1 ? 'día' : 'días'}`}
              note="¡Sigue practicando hoy!"
              tone="peach"
            />
            <StatCard
              icon={<Trophy size={24} weight="fill" />}
              label="Insignias y Medallas"
              value={`${badges.count} de 3`}
              note={`${completedMissionCount} de ${totalMissionCount} misiones superadas`}
              tone="lav"
            />
          </div>

          {routeStatus === 'loading' && !aiRoute && (
            <div className="store-utility-card ai-route-banner" role="status">
              <div className="ai-route-header">
                <div className="ai-route-title-group">
                  <Sparkle size={20} weight="fill" />
                  <div>
                    <h3>Calculando tu ruta sugerida...</h3>
                    <p>Analizando tu progreso para recomendarte el próximo desafío ideal.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {routeStatus === 'ready' && aiRoute && (
            <div className="store-utility-card ai-route-banner">
              <div className="ai-route-header">
                <div className="ai-route-title-group">
                  <Sparkle size={20} weight="fill" />
                  <div>
                    <h3>Ruta sugerida por Ollama</h3>
                    <p>{aiRoute.summary}</p>
                  </div>
                </div>
                <span className="model-tag">{aiRoute.model}</span>
              </div>
              {aiRoute.priorities?.length > 0 && (
                <div className="ai-priority-grid">
                  {aiRoute.priorities.slice(0, 2).map((item) => (
                    <div className="ai-priority-item" key={item.skill}>
                      <b>{item.skill}</b>
                      <p>{item.reason}</p>
                      <small>Idea: {item.activity}</small>
                    </div>
                  ))}
                </div>
              )}
              {aiRoute.recommendedMissionIds?.length > 0 && (
                <div className="ai-route-actions">
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() =>
                      openMissionById(
                        aiRoute.recommendedMissionIds.find((id) => !allCompleted.includes(id)) || firstOpen,
                      )
                    }
                  >
                    <span>Practicar misión sugerida</span>
                    <ArrowRight size={15} weight="regular" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <WorldMapSection
        worlds={worlds}
        allCompleted={allCompleted}
        completedMissionCount={completedMissionCount}
        totalMissionCount={totalMissionCount}
        onOpenMissionById={openMissionById}
      />

      <section className="product-tile-light">
        <div className="tile-container">
          <div className="student-dual-grid">
            <StudentAssignmentsSection
              group={group}
              studentName={state.user.name}
              assignments={assignments}
              submissions={submissions}
              availableCourses={availableCourses}
              enrolledGroups={enrolledGroups}
              onGroupChange={onGroupChange}
              onOpenAssignment={onOpenAssignment}
            />
            <StudentProfilePanel
              userName={state.user.name}
              avatar={state.avatar}
              points={state.points}
              coins={state.coins}
              completedMissionCount={completedMissionCount}
              badges={badges}
              onOpenShop={onOpenShop}
            />
          </div>
        </div>
      </section>

      <section className="product-tile-dark-2 python-feature-tile">
        <div className="tile-container split-hero-grid">
          <div className="split-hero-copy">
            <span className="hero-eyebrow">⚡ EXPANSIÓN MULTILENGUAJE</span>
            <h2 className="display-lg">Laboratorios de Código Real.</h2>
            <p className="lead-subcopy">
              Escribe código en vivo en Python ({pythonDoneCount} de 6 etapas), construye interfaces en Ciudadela HTML o programa drones en Neo-Tokio JavaScript.
            </p>
            <div className="hero-cta-row">
              <button type="button" className="button-primary" onClick={() => onPython('')}>
                <TerminalWindow size={16} weight="regular" />
                <span>Python (6 etapas)</span>
              </button>
              <button
                type="button"
                className="button-secondary-pill"
                onClick={() => onOpenCodeWorld('ciudadela-html', '')}
              >
                <FileHtml size={16} weight="regular" />
                <span>Ciudadela HTML</span>
              </button>
              <button
                type="button"
                className="button-secondary-pill"
                onClick={() => onOpenCodeWorld('neo-tokio-javascript', '')}
              >
                <FileJs size={16} weight="regular" />
                <span>Neo-Tokio JS</span>
              </button>
            </div>
          </div>
          <div className="split-hero-visual">
            <img
              className="product-render-shadow hero-product-image"
              src="/images/python-lab.png"
              alt="Laboratorios de programación Python, HTML5 y JavaScript de CodeKids"
              loading="lazy"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
