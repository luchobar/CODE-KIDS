import {
  Compass,
  Cpu,
  FileHtml,
  FileJs,
  SlidersHorizontal,
  TerminalWindow,
  Wall,
} from '@phosphor-icons/react';

/**
 * Vista previa curricular en formato bento mostrada debajo del acceso a CodeKids.
 */
export default function AuthCurriculumPreview() {
  return (
    <section id="curriculum" className="product-tile-dark">
      <div className="tile-container">
        <div className="section-header-stack">
          <h2 className="display-lg">De los bloques visuales a Python, HTML5 y JavaScript.</h2>
          <p className="lead-subcopy">
            Explora mundos interactivos diseñados para desarrollar pensamiento computacional y programación real paso a paso.
          </p>
        </div>

        <div className="bento-curriculum-grid">
          <article className="bento-cell bento-cell-featured">
            <div className="bento-cell-copy">
              <Compass size={24} weight="regular" />
              <h3>El Bosque de las Secuencias</h3>
              <p>Ensambla bloques de movimiento y giro en orden para llevar a Pipo hasta la estrella.</p>
            </div>
            <img
              className="product-render-shadow bento-render"
              src="/images/world-forest.png"
              alt="Escenario 3D de El Bosque de las Secuencias con el robot Pipo"
              loading="lazy"
            />
          </article>

          <article className="bento-cell bento-cell-surface">
            <SlidersHorizontal size={24} weight="regular" />
            <h3>La Isla de los Bucles</h3>
            <p>Descubre patrones que se repiten para cruzar puentes y jardines con menos bloques.</p>
          </article>

          <article className="bento-cell bento-cell-surface">
            <Wall size={24} weight="regular" />
            <h3>La Cueva de las Decisiones</h3>
            <p>Usa condiciones inteligentes para detectar paredes y elegir caminos despejados.</p>
          </article>

          <article className="bento-cell bento-cell-featured">
            <div className="bento-cell-copy">
              <TerminalWindow size={24} weight="regular" />
              <h3>Laboratorio de Código Python</h3>
              <p>
                Avanza desde comandos del robot hasta funciones cuánticas, listas filtradas y diccionarios estelares en 6 etapas.
              </p>
            </div>
            <img
              className="product-render-shadow bento-render"
              src="/images/python-lab.png"
              alt="Estación del Laboratorio de Python con tablero del robot"
              loading="lazy"
            />
          </article>

          <article className="bento-cell bento-cell-surface">
            <Cpu size={24} weight="regular" />
            <h3>Estación de Funciones</h3>
            <p>Depura módulos orbitales y organiza subrutinas reutilizables libres de errores.</p>
          </article>

          <article className="bento-cell bento-cell-surface">
            <FileHtml size={24} weight="regular" />
            <h3>Ciudadela HTML</h3>
            <p>Reconstruye hologramas y portales espaciales con etiquetas semánticas HTML5 en tiempo real.</p>
          </article>

          <article className="bento-cell bento-cell-surface">
            <FileJs size={24} weight="regular" />
            <h3>Neo-Tokio JavaScript</h3>
            <p>Programa los neones y drones autónomos de la metrópolis cibernética con funciones JS.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
