import { useState } from 'react';
import { ArrowLeft, ArrowRight, CaretDown, CheckCircle, Question } from '@phosphor-icons/react';
import { LANDING_FAQ_PEDAGOGY } from '../../data/pedagogicalGlossary.js';
import { LANDING_METHODOLOGY } from '../../data/landingContent.js';

/**
 * Stepper interactivo de las 3 fases de aprendizaje y acordeón pedagógico de preguntas frecuentes.
 */
export default function LandingFaqPedagogy() {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState(LANDING_FAQ_PEDAGOGY[0]?.id || '');

  const currentPhase = LANDING_METHODOLOGY[phaseIdx] || LANDING_METHODOLOGY[0];

  return (
    <div className="landing-pedagogy-stack mt-lg">
      <article className="store-utility-card pedagogy-stepper">
        <div className="pedagogy-stepper-top">
          <div>
            <span className="hero-eyebrow">🎯 EXPLORADOR DE FASES DE APRENDIZAJE</span>
            <h3 className="display-md">Cómo progresa un estudiante paso a paso</h3>
          </div>
          <div className="filter-pill-group" role="tablist" aria-label="Fases de la metodología">
            {LANDING_METHODOLOGY.map((phase, idx) => (
              <button
                type="button"
                key={phase.step}
                role="tab"
                aria-selected={phaseIdx === idx}
                className={`map-filter-chip${phaseIdx === idx ? ' active' : ''}`}
                onClick={() => setPhaseIdx(idx)}
              >
                <span>
                  Fase {phase.step} · {phase.subtitle}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="pedagogy-stepper-card mt-sm">
          <div className="step-card-header">
            <span className="step-subtitle">{currentPhase.subtitle}</span>
            <h4>{currentPhase.title}</h4>
          </div>
          <p className="body-copy">{currentPhase.description}</p>
          <ul className="step-features-list">
            {currentPhase.features.map((feat) => (
              <li key={feat}>
                <CheckCircle size={16} weight="fill" /> {feat}
              </li>
            ))}
          </ul>
        </div>

        <div className="pedagogy-stepper-actions">
          <button
            type="button"
            className="button-secondary-pill"
            disabled={phaseIdx === 0}
            onClick={() => setPhaseIdx((i) => Math.max(0, i - 1))}
          >
            <ArrowLeft size={14} weight="bold" />
            <span>Fase anterior</span>
          </button>
          <small className="pedagogy-step-counter">
            Fase {phaseIdx + 1} de {LANDING_METHODOLOGY.length}
          </small>
          <button
            type="button"
            className="button-secondary-pill"
            disabled={phaseIdx >= LANDING_METHODOLOGY.length - 1}
            onClick={() => setPhaseIdx((i) => Math.min(LANDING_METHODOLOGY.length - 1, i + 1))}
          >
            <span>Siguiente fase</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      </article>

      <article className="store-utility-card mt-lg" aria-label="Preguntas pedagógicas frecuentes">
        <div className="card-header-row">
          <div>
            <span className="hero-eyebrow">💡 PREGUNTAS FRECUENTES PEDAGÓGICAS</span>
            <h3>Resolvemos dudas clave de familias y colegios</h3>
          </div>
          <Question size={24} weight="duotone" />
        </div>

        <div className="pedagogy-accordions mt-sm">
          {LANDING_FAQ_PEDAGOGY.map((faq) => {
            const isOpen = openFaq === faq.id;
            return (
              <div className="pedagogy-accordion-item" key={faq.id}>
                <button
                  type="button"
                  className="pedagogy-accordion-trigger"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? '' : faq.id)}
                >
                  <b>{faq.question}</b>
                  <CaretDown
                    size={16}
                    weight="bold"
                    className={`pedagogy-chevron${isOpen ? ' rotated' : ''}`}
                  />
                </button>
                {isOpen && <p className="pedagogy-accordion-body">{faq.answer}</p>}
              </div>
            );
          })}
        </div>
      </article>
    </div>
  );
}
