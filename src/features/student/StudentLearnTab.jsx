import { SkillGlyph } from '../../components/layout/Glyphs.jsx';
import ContextualTooltip from '../../components/ui/ContextualTooltip.jsx';
import MicroLearningPanel from '../../components/ui/MicroLearningPanel.jsx';
import { PEDAGOGICAL_MODULE_LIST } from '../../data/pedagogicalModules.js';
import WorldMapSection from './WorldMapSection.jsx';

/**
 * Vista Módulos y Mundos: selector de teoría guiada paso a paso integrado con el mapa desbloqueable.
 */
export default function StudentLearnTab({
  selectedSkill,
  onSelectSkill,
  worlds,
  allCompleted,
  completedMissionCount,
  totalMissionCount,
  onOpenMissionById,
  reducedMotion = false,
}) {
  const handleSelectWorldTheory = (skillName) => {
    onSelectSkill(skillName);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <div className="portal-tab-stack">
      <section className="product-tile-parchment learn-theory-tile">
        <div className="tile-container">
          <div className="subsection-header subsection-header-row">
            <div>
              <span className="hero-eyebrow">📚 MICRO-APRENDIZAJE POR HABILIDAD</span>
              <h2 className="display-lg">Módulos teóricos y ejemplos guiados</h2>
              <p className="body-copy">
                Elige un tema para entender qué es, por qué importa y practicar con pasos claros antes de entrar a un reto.
              </p>
            </div>
            <ContextualTooltip
              label="Cómo usar los módulos"
              content="Cada módulo combina explicación corta, ejemplos paso a paso, tips de estudio y errores comunes. Luego pulsa «Practicar misión recomendada»."
              align="right"
            />
          </div>

          <div className="module-selector-strip mb-md" role="tablist" aria-label="Seleccionar módulo de aprendizaje">
            {PEDAGOGICAL_MODULE_LIST.map((mod) => {
              const selected = selectedSkill === mod.skill;
              return (
                <button
                  type="button"
                  key={mod.skill}
                  role="tab"
                  aria-selected={selected}
                  className={`map-filter-chip${selected ? ' active' : ''}`}
                  onClick={() => onSelectSkill(mod.skill)}
                >
                  <SkillGlyph skill={mod.skill} size={15} />
                  <span>{mod.skill}</span>
                </button>
              );
            })}
          </div>

          <MicroLearningPanel
            skill={selectedSkill}
            variant="full"
            onPracticeMission={onOpenMissionById}
          />
        </div>
      </section>

      <WorldMapSection
        worlds={worlds}
        allCompleted={allCompleted}
        completedMissionCount={completedMissionCount}
        totalMissionCount={totalMissionCount}
        onOpenMissionById={onOpenMissionById}
        onStudyWorldSkill={handleSelectWorldTheory}
      />
    </div>
  );
}
