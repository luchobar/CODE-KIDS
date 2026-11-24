import { useState } from 'react';
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import { DIAGNOSTIC_QUESTIONS } from '../../domain/gamificationCatalog.js';

/**
 * Cuestionario diagnóstico inicial de 4 preguntas de pensamiento computacional.
 */
export default function AssessmentView({ onSubmit, onCancel }) {
  const [answers, setAnswers] = useState({});

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
              Responde estas cuatro preguntas a tu manera. Al terminar te sugerimos por dónde continuar.
            </p>
          </div>

          <div className="question-stack">
            {DIAGNOSTIC_QUESTIONS.map((question, index) => (
              <fieldset className="store-utility-card question-utility-card" key={question.skill}>
                <legend>
                  <span className="question-skill-pill">{question.skill}</span>
                  <strong>{question.prompt}</strong>
                </legend>
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
                        onChange={() => setAnswers({ ...answers, [index]: optionIndex })}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="assessment-footer-bar">
            <button
              type="button"
              className="button-primary"
              disabled={Object.keys(answers).length < DIAGNOSTIC_QUESTIONS.length}
              onClick={() => onSubmit(answers)}
            >
              <span>Ver mi ruta personalizada</span>
              <ArrowRight size={15} weight="regular" />
            </button>
            {Object.keys(answers).length < DIAGNOSTIC_QUESTIONS.length && (
              <small className="field-helper">Responde las 4 preguntas para continuar.</small>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
