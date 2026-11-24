import { useState } from 'react';
import {
  ArrowRight,
  Brain,
  CheckCircle,
  Compass,
  Cpu,
  FileHtml,
  FileJs,
  Flame,
  GraduationCap,
  RocketLaunch,
  SlidersHorizontal,
  Sparkle,
  Star,
  Student,
  TerminalWindow,
  Trophy,
  Wall,
} from '@phosphor-icons/react';
import {
  LANDING_AUDIENCES,
  LANDING_METHODOLOGY,
  LANDING_OBJECTIVES,
  LANDING_STATS,
  LANDING_WORLDS,
} from '../../data/landingContent.js';

const OBJECTIVE_ICONS = {
  brain: <Brain size={28} weight="duotone" />,
  trophy: <Trophy size={28} weight="duotone" />,
  terminal: <TerminalWindow size={28} weight="duotone" />,
  sparkle: <Sparkle size={28} weight="duotone" />,
};

const WORLD_ICONS = {
  compass: <Compass size={24} weight="regular" />,
  sliders: <SlidersHorizontal size={24} weight="regular" />,
  wall: <Wall size={24} weight="regular" />,
  terminal: <TerminalWindow size={24} weight="regular" />,
  cpu: <Cpu size={24} weight="regular" />,
  html: <FileHtml size={24} weight="regular" />,
  js: <FileJs size={24} weight="regular" />,
};

const WORLD_FILTERS = [
  { id: 'all', label: 'Todos los mundos (7)' },
  { id: 'blocks', label: 'Bloques Visuales (4)' },
  { id: 'code', label: 'Código Real (3)' },
];

export function LandingHeroSection({ onOpenLogin, onGoToMethodology }) {
  return (
    <section id="top" className="product-tile-light landing-hero-tile cosmic-auth-stage">
      <div className="cosmic-orb orb-cyan" aria-hidden="true" />
      <div className="cosmic-orb orb-violet" aria-hidden="true" />
      <div className="cosmic-orb orb-lime" aria-hidden="true" />

      <div className="tile-container split-hero-grid">
        <div className="split-hero-copy">
          <span className="landing-badge-chip">
            <Sparkle size={14} weight="fill" />
            <span>Plataforma EdTech STEAM · Edades 8 a 15 años</span>
          </span>

          <h1 className="landing-hero-title">
            Donde los niños descubren el poder de crear con código.
          </h1>

          <p className="landing-hero-description">
            <strong>CodeKids</strong> enseña <strong>pensamiento computacional</strong> mediante misiones guiadas,
            llevando al estudiante desde <strong>bloques visuales</strong> hasta código real en{' '}
            <strong>Python</strong>, <strong>HTML5</strong> y <strong>JavaScript</strong>.
          </p>

          <div className="landing-cta-group">
            <button
              type="button"
              className="button-store-hero cta-3d-lime landing-access-btn"
              onClick={onOpenLogin}
            >
              <RocketLaunch size={20} weight="fill" />
              <span>Acceder a la Plataforma</span>
              <ArrowRight size={18} weight="bold" />
            </button>

            <button
              type="button"
              className="button-secondary-pill landing-secondary-btn"
              onClick={onGoToMethodology}
            >
              <Compass size={18} weight="duotone" />
              <span>Explorar metodología</span>
            </button>
          </div>

          <div className="landing-stats-strip">
            {LANDING_STATS.map((stat) => (
              <div key={stat.label} className="landing-stat-item">
                <span className="landing-stat-number">{stat.number}</span>
                <span className="landing-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="split-hero-visual">
          <div className="hero-showcase-frame">
            <div className="floating-achievement-badge top-badge">
              <Flame size={18} weight="fill" />
              <span>¡Racha activa y avatares!</span>
            </div>
            <img
              className="product-render-shadow hero-product-image"
              src="/images/hero-codekids.png"
              alt="Robot Pipo y la aventura de programación CodeKids"
              width="960"
              height="720"
            />
            <div className="floating-achievement-badge bottom-badge">
              <Star size={18} weight="fill" />
              <span>+120 XP · Misiones desbloqueables</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingObjectivesSection() {
  return (
    <section id="objetivo" className="product-tile-parchment">
      <div className="tile-container">
        <div className="section-header-stack">
          <span className="hero-eyebrow">💡 NUESTRO PROPÓSITO FORMATIVO</span>
          <h2 className="display-lg">¿Qué es CodeKids y cuál es nuestro objetivo?</h2>
          <p className="lead-subcopy">
            Transformamos el tiempo frente a la pantalla en pensamiento lógico, resolución creativa de problemas y autonomía digital.
          </p>
        </div>

        <div className="objective-grid">
          {LANDING_OBJECTIVES.map((card) => (
            <article key={card.id} className="objective-card">
              <div className={`objective-icon-bubble ${card.tone}`}>{OBJECTIVE_ICONS[card.icon]}</div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingMethodologySection() {
  return (
    <section id="metodologia" className="product-tile-light">
      <div className="tile-container">
        <div className="section-header-stack">
          <span className="hero-eyebrow">📈 RUTA DE APRENDIZAJE GRADUAL</span>
          <h2 className="display-lg">Una metodología sin frustración.</h2>
          <p className="lead-subcopy">
            Tres fases progresivas diseñadas para construir confianza antes de pasar al teclado profesional.
          </p>
        </div>

        <div className="methodology-row-grid">
          {LANDING_METHODOLOGY.map((phase) => (
            <article key={phase.step} className="methodology-step-card">
              <span className="step-number-tag">{phase.step}</span>
              <div className="step-card-header">
                <span className="step-subtitle">{phase.subtitle}</span>
                <h3>{phase.title}</h3>
              </div>
              <p className="step-card-body">{phase.description}</p>
              <ul className="step-features-list">
                {phase.features.map((feat) => (
                  <li key={feat}>
                    <CheckCircle size={16} weight="fill" /> {feat}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingWorldsSection() {
  const [filter, setFilter] = useState('all');

  const visibleWorlds = LANDING_WORLDS.filter((world) => {
    const isCode = ['python', 'html', 'js'].includes(world.id);
    if (filter === 'blocks') return !isCode;
    if (filter === 'code') return isCode;
    return true;
  });

  return (
    <section id="mundos" className="product-tile-dark">
      <div className="tile-container">
        <div className="section-header-stack">
          <span className="hero-eyebrow">🗺️ UNIVERSO EXPANDIBLE</span>
          <h2 className="display-lg">Explora los 7 mundos temáticos.</h2>
          <p className="lead-subcopy">
            Filtra por modalidad para conocer cómo pasamos de bloques visuales a código escrito real.
          </p>
        </div>

        <div className="adventure-filters-bar mb-md" role="group" aria-label="Filtrar mundos por tipo">
          <div className="filter-pill-group">
            {WORLD_FILTERS.map((opt) => (
              <button
                type="button"
                key={opt.id}
                aria-pressed={filter === opt.id}
                className={`map-filter-chip${filter === opt.id ? ' active' : ''}`}
                onClick={() => setFilter(opt.id)}
              >
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bento-curriculum-grid">
          {visibleWorlds.map((world) =>
            world.featured ? (
              <article key={world.id} className="bento-cell bento-cell-featured">
                <div className="bento-cell-copy">
                  {WORLD_ICONS[world.icon]}
                  <h3>{world.title}</h3>
                  <p>{world.description}</p>
                </div>
                <img
                  className="product-render-shadow bento-render"
                  src={world.image}
                  alt={world.alt}
                  loading="lazy"
                />
              </article>
            ) : (
              <article key={world.id} className="bento-cell bento-cell-surface">
                {WORLD_ICONS[world.icon]}
                <h3>{world.title}</h3>
                <p>{world.description}</p>
              </article>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

export function LandingAudienceSection({ onOpenLogin }) {
  return (
    <section id="audiencia" className="product-tile-light">
      <div className="tile-container">
        <div className="section-header-stack">
          <span className="hero-eyebrow">👥 IMPACTO PARA LA COMUNIDAD EDUCATIVA</span>
          <h2 className="display-lg">Diseñado para estudiantes y profesores.</h2>
          <p className="lead-subcopy">
            Una plataforma integral tanto para el aprendizaje autodidacta en casa como para el aula escolar.
          </p>
        </div>

        <div className="audience-dual-grid">
          {LANDING_AUDIENCES.map((aud) => (
            <article key={aud.id} className="audience-card">
              <span className="audience-card-badge">
                {aud.icon === 'student' ? (
                  <Student size={14} weight="duotone" />
                ) : (
                  <GraduationCap size={14} weight="duotone" />
                )}
                <span>{aud.badge}</span>
              </span>
              <h3>{aud.title}</h3>
              <p>{aud.description}</p>
              <ul className="audience-checklist">
                {aud.checklist.map((item) => (
                  <li key={item}>
                    <CheckCircle size={18} weight="fill" /> {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="landing-final-banner">
          <Sparkle size={32} weight="fill" className="landing-final-sparkle" />
          <h2>¿Listo para comenzar tu aventura en CodeKids?</h2>
          <p>
            Inicia sesión con tu cuenta de explorador o regístrate en segundos para desbloquear tu primera misión.
          </p>
          <button
            type="button"
            className="button-store-hero cta-3d-lime landing-access-btn"
            onClick={onOpenLogin}
          >
            <RocketLaunch size={20} weight="fill" />
            <span>Acceder a la Plataforma</span>
            <ArrowRight size={18} weight="bold" />
          </button>
        </div>
      </div>
    </section>
  );
}
