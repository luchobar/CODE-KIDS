import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Compass, Lightbulb, ListChecks } from '@phosphor-icons/react';
import { DIAGNOSTIC_PEDAGOGY } from '../../data/pedagogicalGlossary.js';
import { DIAGNOSTIC_QUESTIONS } from '../../domain/gamificationCatalog.js';

/**
 * Cuestionario diagnóstico paso a paso (con vista completa opcional) y guía pedagógica contextual.
 */
export default function AssessmentView({ onSubmit, onCancel }) {
  const [answers, setAnswers] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const totalCount = DIAGNOSTIC_QUESTIONS.length;
  const progressPercent = Math.round((answeredCount / totalCount) * 100);
  const visibleQuestions = showAll
    ? DIAGNOSTIC_QUESTIONS.map((q, index) => ({ q, index }))
    : [{ q: DIAGNOSTIC_QUESTIONS[currentStep], index: currentStep }];

  const selectAnswer = (questionIndex, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  return (
    <main className="apple-page">
      <section className="product-tile-light">
        <div className="tile-container narrow-container">
          <button type="button" className="text-link back-nav-link" onClick={onCancel}>
            <ArrowLeft size={15} weight="regular" />
            <span>Volver a mi espacio</span>
          </button>

          <div className="section-header-stack left-aligned">
            <span className="hero-eyebrow">DIAGNÓSTICO DE PENSAMIENTO COMPUTACIONAL</span>
            <h1 className="display-lg">¡Vamos a descubrir cómo piensas!</h1>
            <p className="body-copy">
              Avanza pregunta por pregunta con pistas de razonamiento. Al terminar te recomendaremos el módulo ideal para ti.
            </p>
          </div>

          <div className="store-utility-card assessment-stepper-bar mb-md">
            <div className="assessment-stepper-top">
              <div className="assessment-step-pills" role="tablist" aria-label="Pasos del diagnóstico">
                {DIAGNOSTIC_QUESTIONS.map((item, idx) => {
                  const isAnswered = answers[idx] !== undefined;
                  const isCurrent = !showAll && currentStep === idx;
                  return (
                    <button
                      type="button"
                      key={item.skill}
                      role="tab"
                      aria-selected={isCurrent}
                      className={`stepper-dot-btn${isCurrent ? ' active' : ''}${isAnswered ? ' done' : ''}`}
                      onClick={() => {
                        setShowAll(false);
                        setCurrentStep(idx);
                      }}
                    >
                      {isAnswered ? <Check size={12} weight="bold" /> : idx + 1}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="button-secondary-pill"
                onClick={() => setShowAll((prev) => !prev)}
              >
                <ListChecks size={15} weight="bold" />
                <span>{showAll ? 'Modo paso a paso' : 'Ver las 4 preguntas juntas'}</span>
              </button>
            </div>

            <div className="assessment-progress-meta">
              <small>
                Respondidas: <b>{answeredCount}</b> de {totalCount}
              </small>
              <div className="skill-mastery-track" aria-label={`Progreso del diagnóstico ${progressPercent}%`}>
                <div className="skill-mastery-fill" style={{ width: `${Math.max(8, progressPercent)}%` }} />
              </div>
            </div>
          </div>

          <div className="question-stack">
            {visibleQuestions.map(({ q: question, index }) => {
              const guide = DIAGNOSTIC_PEDAGOGY[question.skill];
              return (
                <fieldset className="store-utility-card question-utility-card" key={question.skill}>
                  <legend>
                    <span className="question-skill-pill">
                      Pregunta {index + 1} de {totalCount} · {question.skill}
                    </span>
                    <strong>{question.prompt}</strong>
                  </legend>

                  {guide && (
                    <div className="assessment-pedagogy-note">
                      <p>
                        <Compass size={15} weight="duotone" />
                        <span>
                          <b>¿Qué explora?:</b> {guide.evaluates}
                        </span>
                      </p>
                      <p>
                        <Lightbulb size={15} weight="duotone" />
                        <span>
                          <b>Tip para pensarlo:</b> {guide.thinkingTip}
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="question-options-grid">
                    {question.options.map((option, optionIndex) => (
                      <label
                        className={
                          answers[index] === optionIndex
                            ? 'configurator-option-chip selected answer-chip'
                            : 'configurator-option-chip answer-chip'
                        }
                        key={option}
                      >
                        <input
                          type="radio"
                          name={`q-${index}`}
                          checked={answers[index] === optionIndex}
                          onChange={() => selectAnswer(index, optionIndex)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </div>

          <div className="assessment-footer-bar">
            {!showAll && (
              <>
                <button
                  type="button"
                  className="button-secondary-pill"
                  disabled={currentStep === 0}
                  onClick={() => setCurrentStep((idx) => Math.max(0, idx - 1))}
                >
                  <ArrowLeft size={15} weight="bold" />
                  <span>Anterior</span>
                </button>
                {currentStep < totalCount - 1 && (
                  <button
                    type="button"
                    className="button-secondary-pill"
                    onClick={() => setCurrentStep((idx) => Math.min(totalCount - 1, idx + 1))}
                  >
                    <span>Siguiente</span>
                    <ArrowRight size={15} weight="bold" />
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              className="button-primary cta-3d-lime"
              disabled={answeredCount < totalCount}
              onClick={() => onSubmit(answers)}
            >
              <span>Ver mi ruta personalizada</span>
              <ArrowRight size={15} weight="regular" />
            </button>

            {answeredCount < totalCount && (
              <small className="field-helper">
                Responde las {totalCount} preguntas para desbloquear tu recomendación.
              </small>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
