import { useState } from 'react';
import { Compass, Lock, Play, Star, Trophy } from '@phosphor-icons/react';
import { SkillGlyph } from '../../components/layout/Glyphs.jsx';

const TOPIC_FILTERS = [
  'Todos',
  'Secuencias',
  'Bucles',
  'Condicionales',
  'Funciones',
  'Python',
  'HTML5',
  'JavaScript',
];

const DIFFICULTY_FILTERS = [
  { id: 'Todas', label: '⚡ Todas las dificultades' },
  { id: 'Inicio', label: '🟢 Nivel 1 · Inicio' },
  { id: 'En camino', label: '🟡 Nivel 2 · En camino' },
  { id: 'Explorador', label: '🟣 Nivel 3 · Explorador' },
];

const DEFAULT_LEVELS = ['Inicio', 'En camino', 'Explorador'];
const DEFAULT_NAMES = [
  'Misión 1 · Primer paso',
  'Misión 2 · Nuevo camino',
  'Misión 3 · Gran jefe',
];

/**
 * Mapa interactivo de 7 mundos con filtros por temática y dificultad y estado vacío explícito.
 */
export default function WorldMapSection({
  worlds,
  allCompleted,
  completedMissionCount,
  totalMissionCount,
  onOpenMissionById,
}) {
  const [skillFilter, setSkillFilter] = useState('Todos');
  const [difficultyFilter, setDifficultyFilter] = useState('Todas');

  const filteredWorlds = worlds
    .filter((world) => skillFilter === 'Todos' || world.skill === skillFilter)
    .map((world) => {
      const worldIndex = worlds.findIndex((w) => w.skill === world.skill);
      const visibleNodes = world.ids
        .map((id, index) => {
          const levelLabel = world.nodeLevels?.[index] || DEFAULT_LEVELS[index] || 'Explorador';
          return { id, index, levelLabel };
        })
        .filter((node) => difficultyFilter === 'Todas' || node.levelLabel === difficultyFilter);
      return { world, worldIndex, visibleNodes };
    })
    .filter((entry) => entry.visibleNodes.length > 0);

  return (
    <section id="curriculum" className="product-tile-dark world-map-tile">
      <div className="tile-container">
        <div className="section-header-stack">
          <span className="hero-eyebrow">🗺️ MAPA DE MUNDOS DESBLOQUEABLES</span>
          <h2 className="display-lg">Elige tu próxima misión.</h2>
          <p className="lead-subcopy">
            Supera las etapas para ganar estrellas, medallas y dominar nuevos lenguajes ({completedMissionCount} de {totalMissionCount} misiones).
          </p>
        </div>

        <div className="adventure-filters-bar" aria-label="Filtros del mapa de misiones">
          <div className="filter-pill-group" role="group" aria-label="Filtrar por temática o lenguaje">
            {TOPIC_FILTERS.map((topic) => (
              <button
                type="button"
                key={topic}
                aria-pressed={skillFilter === topic}
                className={`map-filter-chip${skillFilter === topic ? ' active' : ''}`}
                onClick={() => setSkillFilter(topic)}
              >
                {topic !== 'Todos' && <SkillGlyph skill={topic} size={15} />}
                <span>{topic}</span>
              </button>
            ))}
          </div>

          <div className="filter-pill-group difficulty-group" role="group" aria-label="Filtrar por dificultad">
            {DIFFICULTY_FILTERS.map((diff) => (
              <button
                type="button"
                key={diff.id}
                aria-pressed={difficultyFilter === diff.id}
                className={`map-filter-chip diff-chip${difficultyFilter === diff.id ? ' active' : ''}`}
                onClick={() => setDifficultyFilter(diff.id)}
              >
                <span>{diff.label}</span>
              </button>
            ))}
          </div>
        </div>

        {filteredWorlds.length === 0 ? (
          <div className="dark-empty-card" role="status">
            <Compass size={28} weight="duotone" />
            <p>
              No hay misiones para la combinación de filtros «{skillFilter}» y «{difficultyFilter}».
            </p>
            <button
              type="button"
              className="button-secondary-pill"
              onClick={() => {
                setSkillFilter('Todos');
                setDifficultyFilter('Todas');
              }}
            >
              <span>Mostrar todos los mundos</span>
            </button>
          </div>
        ) : (
          <div className="worlds-stack">
            {filteredWorlds.map(({ world, worldIndex, visibleNodes }) => {
              const totalInWorld = world.ids.length;
              const worldDoneCount = world.ids.filter((id) => allCompleted.includes(id)).length;
              const previousWorldComplete =
                worldIndex === 0 ||
                worldIndex >= 3 ||
                worlds[worldIndex - 1].ids.every((prevId) => allCompleted.includes(prevId));

              return (
                <article className={`world-showcase-row world-tone-${world.color}`} key={world.skill}>
                  <div className="world-showcase-media">
                    <span className="world-sector-badge">MUNDO 0{worldIndex + 1}</span>
                    <img
                      className="product-render-shadow world-render-img"
                      src={world.image}
                      alt={world.title}
                      loading="lazy"
                    />
                  </div>
                  <div className="world-showcase-content">
                    <div className="world-showcase-header">
                      <div className="world-header-top">
                        <span className="world-skill-label">
                          <SkillGlyph skill={world.skill} size={14} /> {world.skill}
                        </span>
                        <span className="world-progress-pill">
                          <Star size={13} weight="fill" /> {worldDoneCount * 3} / {totalInWorld * 3} estrellas
                        </span>
                      </div>
                      <h3>{world.title}</h3>
                      <p>{world.subtitle}</p>
                      <small className="world-completion-meta">
                        {worldDoneCount} de {totalInWorld} misiones completadas
                      </small>
                    </div>
                    <div className="world-nodes-grid">
                      {visibleNodes.map(({ id, index }) => {
                        const done = allCompleted.includes(id);
                        const unlockedEntryIndex =
                          index === 0 || (world.mode === 'python' && index === 3);
                        const locked =
                          !previousWorldComplete ||
                          (!unlockedEntryIndex && !allCompleted.includes(world.ids[index - 1]));
                        const active = !done && !locked;
                        const nodeLabel =
                          world.nodeNames?.[index] || DEFAULT_NAMES[index] || `Misión ${index + 1}`;
                        const xpValue = world.nodeXp?.[index] || 10;

                        return (
                          <button
                            type="button"
                            key={id}
                            disabled={locked}
                            onClick={() => onOpenMissionById(id)}
                            aria-label={`${nodeLabel}${locked ? ', bloqueado' : done ? ', completado con 3 estrellas' : ', disponible'}`}
                            className={`world-stage-pill${done ? ' done' : ''}${active ? ' active' : ''}${locked ? ' locked' : ''}`}
                          >
                            <span className="world-stage-icon">
                              {done ? (
                                <Trophy size={16} weight="fill" />
                              ) : locked ? (
                                <Lock size={15} weight="duotone" />
                              ) : (
                                <Play size={14} weight="fill" />
                              )}
                            </span>
                            <span className="world-stage-text">
                              <b>{nodeLabel}</b>
                              <small>
                                {done
                                  ? `Completado · +${xpValue} XP`
                                  : locked
                                    ? '🔒 Bloqueado'
                                    : `⚡ ¡Disponible! · +${xpValue} XP`}
                              </small>
                              <span className="mission-node-stars" aria-hidden="true">
                                {[1, 2, 3].map((starIdx) => (
                                  <Star
                                    key={starIdx}
                                    size={12}
                                    weight={done ? 'fill' : 'regular'}
                                    className={done ? 'star-earned' : 'star-empty'}
                                  />
                                ))}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
