import {
  ArrowRight,
  Brain,
  CheckCircle,
  Code,
  Compass,
  Cpu,
  FileHtml,
  FileJs,
  Flame,
  GraduationCap,
  Lightning,
  Planet,
  RocketLaunch,
  SlidersHorizontal,
  Sparkle,
  Star,
  Student,
  TerminalWindow,
  Trophy,
  UsersThree,
  Wall,
} from '@phosphor-icons/react';
import './PresentationLanding.css';

export default function PresentationLanding({ onOpenLogin }) {
  const scrollToSection = (event, sectionId) => {
    event.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="apple-page landing-page">
      {/* 1. HERO PRINCIPAL DE PRESENTACIÓN */}
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
              <strong>CodeKids</strong> es una plataforma interactiva y gamificada que enseña
              <strong> pensamiento computacional</strong> y programación a través de misiones espaciales.
              Guiamos a los estudiantes paso a paso desde <strong>bloques visuales lógicos</strong> hasta código real
              escrito en <strong>Python</strong>, <strong>HTML5</strong> y <strong>JavaScript</strong>.
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

              <a
                href="#objetivo"
                className="button-secondary-pill landing-secondary-btn"
                onClick={(e) => scrollToSection(e, 'objetivo')}
              >
                <Compass size={18} weight="duotone" />
                <span>Conoce el objetivo</span>
              </a>
            </div>

            {/* Tira rápida de impacto educativo */}
            <div className="landing-stats-strip">
              <div className="landing-stat-item">
                <span className="landing-stat-number">8 a 15</span>
                <span className="landing-stat-label">Años recomendados</span>
              </div>
              <div className="landing-stat-item">
                <span className="landing-stat-number">7 Mundos</span>
                <span className="landing-stat-label">Aventuras temáticas</span>
              </div>
              <div className="landing-stat-item">
                <span className="landing-stat-number">+22 Retos</span>
                <span className="landing-stat-label">Misiones interactivas</span>
              </div>
              <div className="landing-stat-item">
                <span className="landing-stat-number">3 Lenguajes</span>
                <span className="landing-stat-label">Python, HTML5 y JS</span>
              </div>
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

      {/* 2. ¿QUÉ ES CODEKIDS Y CUÁL ES EL OBJETIVO? */}
      <section id="objetivo" className="product-tile-parchment">
        <div className="tile-container">
          <div className="section-header-stack">
            <span className="hero-eyebrow">💡 NUESTRO PROPÓSITO FORMATIVO</span>
            <h2 className="display-lg">¿Qué es CodeKids y cuál es nuestro objetivo?</h2>
            <p className="lead-subcopy">
              CodeKids nace con la misión de democratizar la educación tecnológica, transformando el tiempo de pantalla
              en una experiencia formativa donde los niños no solo consumen tecnología, sino que aprenden a crearla.
            </p>
          </div>

          <div className="objective-grid">
            <article className="objective-card">
              <div className="objective-icon-bubble bubble-blue">
                <Brain size={28} weight="duotone" />
              </div>
              <h3>Pensamiento Computacional</h3>
              <p>
                Desarrollamos habilidades de descomposición, reconocimiento de patrones, abstracción y
                lógica algorítmica. Los estudiantes aprenden a estructurar ideas antes de preocuparse por la sintaxis.
              </p>
            </article>

            <article className="objective-card">
              <div className="objective-icon-bubble bubble-lime">
                <Trophy size={28} weight="duotone" />
              </div>
              <h3>Gamificación con Sentido</h3>
              <p>
                El juego es el motor del aprendizaje. A través de la narrativa espacial con el robot Pipo,
                los niños ganan experiencia (XP), monedas espaciales, desbloquean avatares y celebran su racha diaria.
              </p>
            </article>

            <article className="objective-card">
              <div className="objective-icon-bubble bubble-purple">
                <TerminalWindow size={28} weight="duotone" />
              </div>
              <h3>Del Bloque al Código Escrito</h3>
              <p>
                Servimos como el puente natural entre la programación visual por bloques y los lenguajes profesionales:
                escriben funciones reales en Python, estructuran la web en HTML5 y programan lógica en JavaScript.
              </p>
            </article>

            <article className="objective-card">
              <div className="objective-icon-bubble bubble-amber">
                <Sparkle size={28} weight="duotone" />
              </div>
              <h3>Tutor Adaptativo e Inclusión</h3>
              <p>
                Un sistema pedagógico inteligente que detecta debilidades y sugiere rutas de refuerzo personalizadas,
                con opciones de accesibilidad (modo claro/oscuro, contraste y soporte tipográfico).
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 3. METODOLOGÍA EDUCATIVA EN 3 FASES */}
      <section id="metodologia" className="product-tile-light">
        <div className="tile-container">
          <div className="section-header-stack">
            <span className="hero-eyebrow">📈 RUTA DE APRENDIZAJE GRADUAL</span>
            <h2 className="display-lg">Una metodología sin frustración.</h2>
            <p className="lead-subcopy">
              Diseñamos una curva de dificultad progresiva para que cada estudiante avance con confianza y autonomía.
            </p>
          </div>

          <div className="methodology-row-grid">
            <article className="methodology-step-card">
              <span className="step-number-tag">1</span>
              <div className="step-card-header">
                <span className="step-subtitle">Fase Inicial</span>
                <h3>Lógica Visual con Bloques</h3>
              </div>
              <p className="step-card-body">
                Los alumnos ensamblan bloques magnéticos para orientar y mover robots por laberintos. Aprenden orden de
                ejecución, secuencias y repeticiones sin errores tipográficos.
              </p>
              <ul className="step-features-list">
                <li><CheckCircle size={16} weight="fill" /> Secuencias paso a paso</li>
                <li><CheckCircle size={16} weight="fill" /> Bucles e iteración lógica</li>
                <li><CheckCircle size={16} weight="fill" /> Detección espacial sin frustración</li>
              </ul>
            </article>

            <article className="methodology-step-card">
              <span className="step-number-tag">2</span>
              <div className="step-card-header">
                <span className="step-subtitle">Fase Intermedia</span>
                <h3>Decisiones y Subrutinas</h3>
              </div>
              <p className="step-card-body">
                Incorporan sensores automáticos («si hay pared») para resolver rutas variables y aprenden a modular
                código depurando errores en circuitos orbitales.
              </p>
              <ul className="step-features-list">
                <li><CheckCircle size={16} weight="fill" /> Condiciones lógicas (if / else)</li>
                <li><CheckCircle size={16} weight="fill" /> Funciones y modularidad</li>
                <li><CheckCircle size={16} weight="fill" /> Depuración de programas</li>
              </ul>
            </article>

            <article className="methodology-step-card">
              <span className="step-number-tag">3</span>
              <div className="step-card-header">
                <span className="step-subtitle">Fase Avanzada</span>
                <h3>Laboratorios de Código Real</h3>
              </div>
              <p className="step-card-body">
                Dan el salto al teclado escribiendo comandos y funciones reales en Python, maquetando con etiquetas HTML5
                en vivo y programando drones autónomos con JavaScript.
              </p>
              <ul className="step-features-list">
                <li><CheckCircle size={16} weight="fill" /> Python con listas y diccionarios</li>
                <li><CheckCircle size={16} weight="fill" /> Hologramas y etiquetas HTML5</li>
                <li><CheckCircle size={16} weight="fill" /> Casos de prueba en JavaScript</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* 4. LOS 7 MUNDOS DE CODEKIDS */}
      <section id="mundos" className="product-tile-dark">
        <div className="tile-container">
          <div className="section-header-stack">
            <span className="hero-eyebrow">🗺️ UNIVERSO EXPANDIBLE</span>
            <h2 className="display-lg">Explora los 7 mundos temáticos.</h2>
            <p className="lead-subcopy">
              Cada mundo presenta desafíos únicos, mecánicas propias y recompensas coleccionables.
            </p>
          </div>

          <div className="bento-curriculum-grid">
            <article className="bento-cell bento-cell-featured">
              <div className="bento-cell-copy">
                <Compass size={24} weight="regular" />
                <h3>El Bosque de las Secuencias</h3>
                <p>Ensambla bloques de avance y giros en orden exacto para guiar al robot hasta la estrella.</p>
              </div>
              <img
                className="product-render-shadow bento-render"
                src="/images/world-forest.png"
                alt="Escenario de El Bosque de las Secuencias"
                loading="lazy"
              />
            </article>

            <article className="bento-cell bento-cell-surface">
              <SlidersHorizontal size={24} weight="regular" />
              <h3>La Isla de los Bucles</h3>
              <p>Descubre patrones que se repiten para ahorrar instrucciones y cruzar puentes infinitos.</p>
            </article>

            <article className="bento-cell bento-cell-surface">
              <Wall size={24} weight="regular" />
              <h3>La Cueva de las Decisiones</h3>
              <p>Usa sensores inteligentes para evaluar obstáculos y tomar caminos libres de peligros.</p>
            </article>

            <article className="bento-cell bento-cell-featured">
              <div className="bento-cell-copy">
                <TerminalWindow size={24} weight="regular" />
                <h3>Laboratorio de Código Python</h3>
                <p>Domina desde comandos del robot hasta escudos cuánticos, listas filtradas y diccionarios estelares en 6 etapas.</p>
              </div>
              <img
                className="product-render-shadow bento-render"
                src="/images/python-lab.png"
                alt="Estación del Laboratorio de Python"
                loading="lazy"
              />
            </article>

            <article className="bento-cell bento-cell-surface">
              <Cpu size={24} weight="regular" />
              <h3>Estación de Funciones</h3>
              <p>Depura circuitos averiados y crea subrutinas reutilizables para misiones de ingeniería espacial.</p>
            </article>

            <article className="bento-cell bento-cell-surface">
              <FileHtml size={24} weight="regular" />
              <h3>Ciudadela HTML</h3>
              <p>Reconstruye faros holográficos y portales de suministros con etiquetas semánticas HTML5 en tiempo real.</p>
            </article>

            <article className="bento-cell bento-cell-surface">
              <FileJs size={24} weight="regular" />
              <h3>Neo-Tokio JavaScript</h3>
              <p>Programa los neones de la metrópolis y la lógica de vuelo de drones autónomos con funciones JavaScript.</p>
            </article>
          </div>
        </div>
      </section>

      {/* 5. PARA ESTUDIANTES Y DOCENTES */}
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
            <article className="audience-card">
              <span className="audience-card-badge">
                <Student size={14} weight="duotone" />
                <span>Para Estudiantes</span>
              </span>
              <h3>Aprende jugando a tu propio ritmo</h3>
              <p>
                Los niños exploran el mapa de aventuras con autonomía, reciben pistas pedagógicas progresivas si se atascan
                y personalizan a su compañero de misión en la tienda de avatares espaciales.
              </p>
              <ul className="audience-checklist">
                <li><CheckCircle size={18} weight="fill" /> Mapa interactivo de aventura con 22 misiones</li>
                <li><CheckCircle size={18} weight="fill" /> Sistema de recompensas: XP, racha y monedas</li>
                <li><CheckCircle size={18} weight="fill" /> Tienda con avatares coleccionables (dragón, zorro, robot, unicornio)</li>
                <li><CheckCircle size={18} weight="fill" /> Test diagnóstico de nivelación computacional</li>
              </ul>
            </article>

            <article className="audience-card">
              <span className="audience-card-badge">
                <GraduationCap size={14} weight="duotone" />
                <span>Para Docentes y Colegios</span>
              </span>
              <h3>Gestión de aula y analítica pedagógica</h3>
              <p>
                Los profesores cuentan con una consola docente especializada para publicar retos según el curso
                (ej. 5° A o 6° B), supervisar el avance de cada estudiante y recibir diagnósticos pedagógicos de IA.
              </p>
              <ul className="audience-checklist">
                <li><CheckCircle size={18} weight="fill" /> Consola docente con vista de grupo y estudiantes</li>
                <li><CheckCircle size={18} weight="fill" /> Asignación y evaluación de retos personalizados</li>
                <li><CheckCircle size={18} weight="fill" /> Métricas de desempeño, intentos y porcentaje de acierto</li>
                <li><CheckCircle size={18} weight="fill" /> Respaldo transaccional y sincronización segura con Supabase</li>
              </ul>
            </article>
          </div>

          {/* BANNER FINAL CON BOTÓN DE ACCESO */}
          <div className="landing-final-banner">
            <Sparkle size={32} weight="fill" style={{ color: '#b8ec63' }} />
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
    </div>
  );
}
