import {
  ArrowRight,
  BookOpen,
  ClipboardText,
  Compass,
  Flame,
  Lightning,
  Play,
  Sparkle,
  Trophy,
} from '@phosphor-icons/react';
import StatCard from '../../components/layout/StatCard.jsx';
import ContextualTooltip from '../../components/ui/ContextualTooltip.jsx';

/**
 * Vista Resumen del estudiante: bienvenida compacta, métricas clave, ruta IA y estado de retos.
 */
export default function StudentOverviewTab({
  state,
  group,
  badges,
  completedMissionCount,
  totalMissionCount,
  aiRoute,
  routeStatus,
  firstOpen,
  assignments = [],
  submissions = [],
  onAssessment,
  onOpenMissionById,
  onNavigateTab,
}) {
  const scoreEntries = Object.entries(state.scores || {});
  const weakestSkill = [...scoreEntries].sort((a, b) => a[1] - b[1])[0]?.[0] || 'Bucles';
  const topAiSkill = aiRoute?.priorities?.[0]?.skill || weakestSkill;

  const evaluatedCount = assignments.filter((a) =>
    submissions.some((s) => s.assignmentId === a.id && s.studentName === state.user.name),
  ).length;
  const pendingCount = Math.max(0, assignments.length - evaluatedCount);
  const nextPending = assignments.find(
    (a) => !submissions.some((s) => s.assignmentId === a.id && s.studentName === state.user.name),
  );

  return (
    <div className="portal-tab-stack">
      <section className="product-tile-light student-hero-tile compact-portal-hero">
        <div className="tile-container split-hero-grid">
          <div className="split-hero-copy">
            <span className="hero-eyebrow">🚀 TU MODO HISTORIA · RESUMEN DIARIO</span>
            <h1 className="hero-display">¡Hola, {state.user.name}!</h1>
            <p className="hero-lead">
              Explora cápsulas guiadas, supera misiones en bloques o código real y avanza a tu propio ritmo sin perder tu progreso.
            </p>
            <div className="hero-cta-row">
              <button
                type="button"
                className="button-primary adventure-cta-btn cta-3d-lime"
                onClick={() => onOpenMissionById(firstOpen)}
              >
                <Play size={16} weight="fill" />
                <span>Continuar misión actual</span>
              </button>
              <button
                type="button"
                className="button-secondary-pill"
                onClick={() => onNavigateTab('learn', weakestSkill)}
              >
                <BookOpen size={15} weight="duotone" />
                <span>Módulos de aprendizaje</span>
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
              alt="Robot Pipo listo para una nueva misión de programación"
              width="960"
              height="720"
            />
          </div>
        </div>
      </section>

      <section className="product-tile-parchment">
        <div className="tile-container">
          <div className="overview-metrics-head">
            <div>
              <h2 className="display-lg">Tu centro de mando</h2>
              <p className="body-copy">
                Indicadores en tiempo real y recomendaciones de tu tutor IA.
              </p>
            </div>
            <ContextualTooltip
              label="Cómo funcionan XP, rachas e insignias"
              content="Cada misión completada por primera vez suma XP y monedas para la tienda de avatares. Las insignias reconocen tus hitos."
              align="right"
            />
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
              label="Insignias y Misiones"
              value={`${badges.count} de 3`}
              note={`${completedMissionCount} de ${totalMissionCount} misiones superadas`}
              tone="lav"
            />
          </div>

          {routeStatus === 'loading' && !aiRoute && (
            <div className="store-utility-card ai-route-banner mb-md" role="status">
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
            <div className="store-utility-card ai-route-banner mb-md">
              <div className="ai-route-header">
                <div className="ai-route-title-group">
                  <Sparkle size={20} weight="fill" />
                  <div>
                    <h3>Ruta sugerida por PIPO</h3>
                    <p>{aiRoute.summary}</p>
                  </div>
                </div>
                <span className="model-tag">PIPO</span>
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
              <div className="inline-actions-row">
                {aiRoute.recommendedMissionIds?.length > 0 && (
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() =>
                      onOpenMissionById(
                        aiRoute.recommendedMissionIds.find((id) => !(state.completedMissions || []).includes(id)) ||
                          firstOpen,
                      )
                    }
                  >
                    <span>Practicar misión sugerida</span>
                    <ArrowRight size={15} weight="regular" />
                  </button>
                )}
                <button
                  type="button"
                  className="button-secondary-pill"
                  onClick={() => onNavigateTab('learn', topAiSkill)}
                >
                  <BookOpen size={15} weight="duotone" />
                  <span>Ver teoría recomendada ({topAiSkill})</span>
                </button>
              </div>
            </div>
          )}

          <div className="student-dual-grid">
            <article className="store-utility-card">
              <div className="card-header-row">
                <div>
                  <h3>Brújula de habilidades</h3>
                  <p>Dominio estimado según tu diagnóstico y entregas.</p>
                </div>
                <Compass size={22} weight="duotone" />
              </div>

              <div className="skill-mastery-list mt-sm">
                {scoreEntries.map(([skillName, value]) => (
                  <div className="skill-mastery-row" key={skillName}>
                    <div className="skill-mastery-labels">
                      <b>{skillName}</b>
                      <span>{value}%</span>
                    </div>
                    <div className="skill-mastery-track">
                      <div
                        className="skill-mastery-fill"
                        style={{ width: `${Math.min(100, Math.max(8, value))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-sm">
                <button
                  type="button"
                  className="text-link"
                  onClick={() => onNavigateTab('learn', weakestSkill)}
                >
                  <span>Reforzar {weakestSkill} con ejemplos guiados</span>
                  <ArrowRight size={14} weight="bold" />
                </button>
              </div>
            </article>

            <article className="store-utility-card">
              <div className="card-header-row">
                <div>
                  <h3>Retos del colegio ({group})</h3>
                  <p>Resumen de tareas asignadas por tu docente.</p>
                </div>
                <ClipboardText size={22} weight="duotone" />
              </div>

              <div className="overview-assignment-stats mt-sm">
                <div className="overview-stat-pill">
                  <b>{pendingCount}</b>
                  <small>Pendientes</small>
                </div>
                <div className="overview-stat-pill">
                  <b>{evaluatedCount}</b>
                  <small>Evaluados</small>
                </div>
              </div>

              <p className="body-copy mt-sm">
                {nextPending
                  ? `Próximo reto sugerido: «${nextPending.title}» (${nextPending.skill}).`
                  : assignments.length > 0
                    ? '¡Excelente! Completaste todos los retos asignados para tu grupo.'
                    : `Tu docente aún no ha publicado retos para ${group}.`}
              </p>

              <div className="mt-sm">
                <button
                  type="button"
                  className="button-secondary-pill"
                  onClick={() => onNavigateTab('labs')}
                >
                  <span>Ir a Práctica y Retos</span>
                  <ArrowRight size={14} weight="bold" />
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
