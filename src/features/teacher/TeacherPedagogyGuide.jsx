import { useState } from 'react';
import { BookOpen, CaretDown } from '@phosphor-icons/react';
import { TEACHER_PEDAGOGICAL_GUIDES } from '../../data/pedagogicalGlossary.js';

/**
 * Guía pedagógica interactiva con divulgación progresiva (acordeones) para decisiones en el aula.
 */
export default function TeacherPedagogyGuide() {
  const [openId, setOpenId] = useState(TEACHER_PEDAGOGICAL_GUIDES[0]?.id || '');

  return (
    <section className="store-utility-card mt-lg" aria-label="Guía didáctica docente">
      <div className="card-header-row">
        <div>
          <span className="hero-eyebrow">📘 MICRO-GUÍA DIDÁCTICA DOCENTE</span>
          <h3>Cómo acompañar al grupo según sus señales</h3>
          <p>
            Estrategias breves basadas en analítica educativa para intervenir a tiempo sin sobrecargar la clase.
          </p>
        </div>
        <BookOpen size={22} weight="duotone" />
      </div>

      <div className="pedagogy-accordions mt-sm">
        {TEACHER_PEDAGOGICAL_GUIDES.map((guide) => {
          const isOpen = openId === guide.id;
          return (
            <article className="pedagogy-accordion-item" key={guide.id}>
              <button
                type="button"
                className="pedagogy-accordion-trigger"
                aria-expanded={isOpen}
                onClick={() => setOpenId(isOpen ? '' : guide.id)}
              >
                <div className="pedagogy-accordion-head">
                  <b>{guide.title}</b>
                  <small>{guide.summary}</small>
                </div>
                <CaretDown
                  size={16}
                  weight="bold"
                  className={`pedagogy-chevron${isOpen ? ' rotated' : ''}`}
                />
              </button>
              {isOpen && <p className="pedagogy-accordion-body">{guide.body}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
