import { useState } from 'react';
import { BookOpen, CaretDown, Compass, MagnifyingGlass } from '@phosphor-icons/react';
import { STEAM_GLOSSARY } from '../../data/pedagogicalGlossary.js';
import StudentProfilePanel from './StudentProfilePanel.jsx';

const GLOSSARY_CATEGORIES = ['Todos', 'Lógica', 'Bloques', 'Python', 'Web'];

/**
 * Vista Progreso y Glosario: perfil e insignias, mapa de dominio por habilidad y
 * glosario STEAM interactivo con acordeones filtrables por categoría o búsqueda.
 */
export default function StudentProgressTab({
  state,
  completedMissionCount,
  badges,
  onOpenShop,
  onStudySkill,
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [openTermId, setOpenTermId] = useState(STEAM_GLOSSARY[0]?.id || '');

  const scoreEntries = Object.entries(state.scores || {});
  const weakestSkill = [...scoreEntries].sort((a, b) => a[1] - b[1])[0]?.[0] || 'Bucles';

  const normalizedSearch = search.trim().toLowerCase();
  const filteredTerms = STEAM_GLOSSARY.filter((entry) => {
    const matchesCategory = category === 'Todos' || entry.category === category;
    if (!matchesCategory) return false;
    if (!normalizedSearch) return true;
    return (
      entry.term.toLowerCase().includes(normalizedSearch) ||
      entry.summary.toLowerCase().includes(normalizedSearch) ||
      entry.analogy.toLowerCase().includes(normalizedSearch)
    );
  });

  return (
    <div className="portal-tab-stack">
      <section className="product-tile-light">
        <div className="tile-container">
          <div className="student-dual-grid">
            <StudentProfilePanel
              userName={state.user.name}
              avatar={state.avatar}
              points={state.points}
              coins={state.coins}
              completedMissionCount={completedMissionCount}
              badges={badges}
              onOpenShop={onOpenShop}
            />

            <div className="skills-mastery-column">
              <div className="subsection-header">
                <h2 className="display-md">Dominio por habilidad</h2>
                <p className="body-copy">
                  Seguimiento de tus 4 pilares de pensamiento computacional.
                </p>
              </div>

              <article className="store-utility-card stack-sm">
                <div className="skill-mastery-list">
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

                <div className="glossary-reinforce-box mt-sm">
                  <small className="assignment-meta-tag">
                    <Compass size={13} weight="duotone" /> Habilidad con mayor oportunidad
                  </small>
                  <p className="body-copy">
                    Refuerza <b>{weakestSkill}</b> repasando su cápsula teórica con ejemplos guiados.
                  </p>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => onStudySkill(weakestSkill)}
                  >
                    <BookOpen size={15} weight="duotone" />
                    <span>Estudiar {weakestSkill} ahora</span>
                  </button>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="product-tile-parchment">
        <div className="tile-container">
          <div className="subsection-header">
            <span className="hero-eyebrow">📖 DICCIONARIO Y CHEAT-SHEETS STEAM</span>
            <h2 className="display-lg">Glosario interactivo de conceptos</h2>
            <p className="body-copy">
              Consulta definiciones en lenguaje sencillo, analogías de la vida diaria y ejemplos reales de código.
            </p>
          </div>

          <div className="glossary-toolbar mb-md">
            <div className="input-with-icon glossary-search-box">
              <span className="input-leading-icon" aria-hidden="true">
                <MagnifyingGlass size={16} weight="bold" />
              </span>
              <input
                type="search"
                className="search-input has-icon"
                placeholder="Buscar concepto (ej. bucle, Python, DOM...)"
                aria-label="Buscar concepto en el glosario"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="filter-pill-group" role="group" aria-label="Filtrar glosario por categoría">
              {GLOSSARY_CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  aria-pressed={category === cat}
                  className={`map-filter-chip${category === cat ? ' active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {filteredTerms.length === 0 ? (
            <div className="store-utility-card empty-state-card" role="status">
              <MagnifyingGlass size={26} weight="duotone" />
              <h3>Sin conceptos para «{search || category}»</h3>
              <p>Prueba otra palabra clave o vuelve a la categoría Todos.</p>
              <button
                type="button"
                className="button-secondary-pill"
                onClick={() => {
                  setSearch('');
                  setCategory('Todos');
                }}
              >
                <span>Ver todo el glosario</span>
              </button>
            </div>
          ) : (
            <div className="glossary-grid">
              {filteredTerms.map((item) => {
                const isExpanded = openTermId === item.id;
                return (
                  <article className="store-utility-card pedagogy-accordion-item" key={item.id}>
                    <button
                      type="button"
                      className="pedagogy-accordion-trigger"
                      aria-expanded={isExpanded}
                      onClick={() => setOpenTermId(isExpanded ? '' : item.id)}
                    >
                      <div className="pedagogy-accordion-head">
                        <span className="assignment-meta-tag">{item.category}</span>
                        <b>{item.term}</b>
                      </div>
                      <CaretDown
                        size={16}
                        weight="bold"
                        className={`pedagogy-chevron${isExpanded ? ' rotated' : ''}`}
                      />
                    </button>

                    <p className="body-copy mt-xs">{item.summary}</p>

                    {isExpanded && (
                      <div className="glossary-detail-drawer mt-sm">
                        <p className="glossary-analogy">
                          <b>Analogía:</b> {item.analogy}
                        </p>
                        <pre className="stepper-code-box">
                          <code>{item.example}</code>
                        </pre>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
