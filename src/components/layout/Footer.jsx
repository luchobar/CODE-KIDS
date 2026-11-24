/**
 * Pie de página institucional con enlaces de acceso directo a misiones, laboratorios y docente.
 */
export default function Footer({ onHome, onGoMissions, onPython, onAssessment, user, onOpenLogin }) {
  const handleNav = (event, action) => {
    event.preventDefault();
    if (action) action();
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="apple-footer">
      <div className="apple-footer-inner">
        <div className="apple-footer-columns">
          <div className="apple-footer-col">
            <h4>Aprendizaje</h4>
            <ul>
              <li>
                <a href="#curriculum" onClick={(e) => handleNav(e, onGoMissions)}>
                  Secuencias lógicas
                </a>
              </li>
              <li>
                <a href="#curriculum" onClick={(e) => handleNav(e, onGoMissions)}>
                  Bucles e iteración
                </a>
              </li>
              <li>
                <a href="#curriculum" onClick={(e) => handleNav(e, onGoMissions)}>
                  Estructuras condicionales
                </a>
              </li>
              <li>
                <a href="#curriculum" onClick={(e) => handleNav(e, onGoMissions)}>
                  Depuración guiada
                </a>
              </li>
            </ul>
          </div>
          <div className="apple-footer-col">
            <h4>Laboratorios</h4>
            <ul>
              <li>
                <a href="#curriculum" onClick={(e) => handleNav(e, onGoMissions)}>
                  Entorno visual Blockly
                </a>
              </li>
              <li>
                <a
                  href="#top"
                  onClick={(e) =>
                    handleNav(e, user?.role === 'student' ? () => onPython('') : onGoMissions)
                  }
                >
                  Transición a Python
                </a>
              </li>
              <li>
                <a
                  href="#top"
                  onClick={(e) =>
                    handleNav(e, user?.role === 'student' ? onAssessment : onHome)
                  }
                >
                  Diagnóstico adaptativo
                </a>
              </li>
            </ul>
          </div>
          <div className="apple-footer-col">
            <h4>Comunidad y Acceso</h4>
            <ul>
              {!user && onOpenLogin ? (
                <li>
                  <a
                    href="#top"
                    className="footer-login-highlight"
                    onClick={(e) => handleNav(e, onOpenLogin)}
                  >
                    🚀 Acceder a la plataforma
                  </a>
                </li>
              ) : null}
              <li>
                <a href="#top" onClick={(e) => handleNav(e, onHome)}>
                  Panel de seguimiento docente
                </a>
              </li>
              <li>
                <a href="#curriculum" onClick={(e) => handleNav(e, onGoMissions)}>
                  Biblioteca de ejercicios
                </a>
              </li>
              <li>
                <a href="#top" onClick={(e) => handleNav(e, onHome)}>
                  Recomendaciones con IA
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="apple-footer-brand-row">
          <img src="/images/logo_horizontal.jpg" alt="CodeKids Logo" className="footer-brand-logo" />
          <p className="footer-brand-tagline">
            Pensamiento computacional, programación por bloques y Python en una aventura gamificada.
          </p>
        </div>
        <div className="apple-footer-legal">
          <p>CodeKids Educación. Pensamiento computacional diseñado con claridad y precisión.</p>
        </div>
      </div>
    </footer>
  );
}
