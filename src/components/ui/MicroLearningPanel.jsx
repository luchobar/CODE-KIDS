import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CaretDown,
  CheckCircle,
  Clock,
  Lightbulb,
  Play,
  WarningCircle,
} from '@phosphor-icons/react';
import { getPedagogicalModule } from '../../data/pedagogicalModules.js';

const DETAIL_SECTIONS = [
  { id: 'concepts', label: 'Conceptos Clave' },
  { id: 'tips', label: 'Tips de Estudio' },
  { id: 'mistakes', label: 'Errores Comunes' },
];

/**
 * Cápsula pedagógica interactiva con contexto teórico-práctico, stepper guiado paso a paso
 * y divulgación progresiva (conceptos clave, tips y errores frecuentes).
 */
export default function MicroLearningPanel({
  skill,
  variant = 'full',
  defaultOpen = false,
  onPracticeMission = null,
}) {
  const moduleData = getPedagogicalModule(skill);
  const [isOpen, setIsOpen] = useState(variant === 'full' ? true : defaultOpen);
  const [stepIndex, setStepIndex] = useState(0);
  const [detailTab, setDetailTab] = useState('concepts');

  useEffect(() => {
    setStepIndex(0);
  }, [moduleData.skill]);

  useEffect(() => {
    if (variant === 'full') {
      setIsOpen(true);
    } else {
      setIsOpen(defaultOpen);
    }
  }, [variant, defaultOpen]);

  const steps = moduleData.steps || [];
  const activeStep = steps[stepIndex] || steps[0];

  return (
    <section
      className={`pedagogy-panel variant-${variant}`}
      aria-label={`Módulo educativo ${moduleData.title}`}
    >
      {variant === 'compact' ? (
        <button
          type="button"
          className="pedagogy-compact-toggle"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span className="pedagogy-toggle-title">
            <BookOpen size={17} weight="duotone" />
            <span>📘 Cápsula Pedagógica: {moduleData.title}</span>
          </span>
          <CaretDown
            size={16}
            weight="bold"
            className={`pedagogy-chevron${isOpen ? ' rotated' : ''}`}
          />
        </button>
      ) : (
        <header className="pedagogy-panel-header">
          <div className="pedagogy-header-copy">
            <div className="pedagogy-meta-row">
              <span className="pedagogy-level-chip">{moduleData.levelBadge}</span>
              <span className="pedagogy-time-chip">
                <Clock size={13} weight="bold" />
                <span>{moduleData.estimatedMinutes} min lectura + práctica</span>
              </span>
            </div>
            <h3>{moduleData.title}</h3>
            <p>{moduleData.tagline}</p>
          </div>
          {onPracticeMission && moduleData.recommendedMissionId && (
            <button
              type="button"
              className="button-primary cta-3d-lime"
              onClick={() => onPracticeMission(moduleData.recommendedMissionId)}
            >
              <Play size={16} weight="fill" />
              <span>Practicar misión recomendada</span>
            </button>
          )}
        </header>
      )}

      {isOpen && (
        <div className="pedagogy-body">
          <div className="pedagogy-pillars-grid">
            <article className="pedagogy-pillar-card">
              <b>¿Qué es?</b>
              <p>{moduleData.whatIs}</p>
            </article>
            <article className="pedagogy-pillar-card">
              <b>¿Por qué importa?</b>
              <p>{moduleData.whyImportant}</p>
            </article>
            <article className="pedagogy-pillar-card">
              <b>En escenarios reales</b>
              <p>{moduleData.realWorld}</p>
            </article>
          </div>

          {activeStep && (
            <div className="pedagogy-stepper" aria-label="Ejemplo guiado paso a paso">
              <div className="pedagogy-stepper-top">
                <span className="pedagogy-stepper-title">Ejemplo paso a paso</span>
                <div className="pedagogy-stepper-dots" role="tablist" aria-label="Pasos del ejemplo">
                  {steps.map((step, idx) => (
                    <button
                      type="button"
                      key={step.stepTitle}
                      role="tab"
                      aria-selected={idx === stepIndex}
                      className={`stepper-dot-btn${idx === stepIndex ? ' active' : ''}`}
                      onClick={() => setStepIndex(idx)}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pedagogy-stepper-card">
                <strong>{activeStep.stepTitle}</strong>
                <pre className="stepper-code-box">
                  <code>{activeStep.snippet}</code>
                </pre>
                <p>{activeStep.explanation}</p>
              </div>

              <div className="pedagogy-stepper-actions">
                <button
                  type="button"
                  className="button-secondary-pill"
                  disabled={stepIndex === 0}
                  onClick={() => setStepIndex((idx) => Math.max(0, idx - 1))}
                >
                  <ArrowLeft size={14} weight="bold" />
                  <span>Anterior</span>
                </button>
                <small className="pedagogy-step-counter">
                  Paso {stepIndex + 1} de {steps.length}
                </small>
                <button
                  type="button"
                  className="button-secondary-pill"
                  disabled={stepIndex >= steps.length - 1}
                  onClick={() => setStepIndex((idx) => Math.min(steps.length - 1, idx + 1))}
                >
                  <span>Siguiente</span>
                  <ArrowRight size={14} weight="bold" />
                </button>
              </div>
            </div>
          )}

          <div className="pedagogy-detail-box">
            <div className="pedagogy-detail-tabs" role="tablist" aria-label="Micro-aprendizaje">
              {DETAIL_SECTIONS.map((sec) => (
                <button
                  type="button"
                  key={sec.id}
                  role="tab"
                  aria-selected={detailTab === sec.id}
                  className={`pedagogy-detail-tab${detailTab === sec.id ? ' active' : ''}`}
                  onClick={() => setDetailTab(sec.id)}
                >
                  <span>{sec.label}</span>
                </button>
              ))}
            </div>

            {detailTab === 'concepts' && (
              <ul className="pedagogy-concepts-list">
                {moduleData.keyConcepts.map((concept) => (
                  <li key={concept.term}>
                    <CheckCircle size={16} weight="fill" />
                    <div>
                      <b>{concept.term}: </b>
                      <span>{concept.definition}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {detailTab === 'tips' && (
              <ul className="pedagogy-tips-list">
                {moduleData.studyTips.map((tip) => (
                  <li key={tip}>
                    <Lightbulb size={16} weight="duotone" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}

            {detailTab === 'mistakes' && (
              <div className="pedagogy-mistakes-grid">
                {moduleData.commonMistakes.map((item) => (
                  <div className="mistake-pair" key={item.mistake}>
                    <p className="mistake-bad">
                      <WarningCircle size={15} weight="fill" />
                      <span>
                        <b>Error frecuente:</b> {item.mistake}
                      </span>
                    </p>
                    <p className="mistake-fix">
                      <CheckCircle size={15} weight="fill" />
                      <span>
                        <b>Cómo evitarlo:</b> {item.fix}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
