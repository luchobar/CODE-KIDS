import { ArrowRight, Compass } from '@phosphor-icons/react';

/**
 * Pantalla resumen tras completar el test diagnóstico mostrando la habilidad recomendada.
 */
export default function ResultView({ state, onDone }) {
  const weakest = Object.entries(state.scores || {}).sort((a, b) => a[1] - b[1])[0] || [
    'Bucles',
    50,
  ];

  return (
    <main className="apple-page">
      <section className="product-tile-light">
        <div className="tile-container narrow-container centered-result">
          <span className="hero-eyebrow">TU DIAGNÓSTICO ESTÁ LISTO</span>
          <h1 className="hero-display">¡Buen trabajo, {state.user.name}!</h1>
          <p className="hero-lead">
            Obtuviste {state.lastScore}% de respuestas correctas. Ya sabemos qué habilidad te ayudará a dar el siguiente paso.
          </p>

          <article className="store-utility-card recommendation-spotlight">
            <Compass size={28} weight="regular" />
            <div>
              <small>Te recomendamos practicar</small>
              <h2>{weakest[0]}</h2>
              <p>
                Empezaremos con ejemplos guiados y retos cortos de {weakest[0].toLowerCase()}. Cuando te sientas listo, subimos el nivel.
              </p>
            </div>
          </article>

          <div className="hero-cta-row centered">
            <button type="button" className="button-primary" onClick={onDone}>
              <span>Ir a mi nueva ruta</span>
              <ArrowRight size={15} weight="regular" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
