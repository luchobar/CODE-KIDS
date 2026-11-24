/**
 * Pie de página institucional con enlaces directos a módulos pedagógicos, laboratorios y vistas.
 */
export default function Footer({
  onHome,
  onGoMissions,
  onPython,
  onAssessment,
  user,
  onOpenLogin,
  onSelectStudentSkill,
  onSelectLandingTab,
}) {
  const handleNav = (event, action) => {
    event.preventDefault();
    if (action) action();
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openSkillModule = (skill) => {
    if (user?.role === 'student' && onSelectStudentSkill) {
      onSelectStudentSkill(skill);
    } else if (!user && onSelectLandingTab) {
      onSelectLandingTab('methodology');
    } else {
      onGoMissions?.();
    }
  };

  return (
    <footer className="apple-footer">
      <div className="apple-footer-inner">
        <div className="apple-footer-columns">
          <div className="apple-footer-col">
            <h4>Aprendizaje</h4>
            <ul>
              <li>
                <a href="#top" onClick={(e) => handleNav(e, () => openSkillModule('Secuencias'))}>
                  Secuencias lógicas
                </a>
              </li>
              <li>
                <a href="#top" onClick={(e) => handleNav(e, () => openSkillModule('Bucles'))}>
                  Bucles e iteración
                </a>
              </li>
              <li>
                <a href="#top" onClick={(e) => handleNav(e, () => openSkillModule('Condicionales'))}>
                  Estructuras condicionales
                </a>
              </li>
              <li>
                <a href="#top" onClick={(e) => handleNav(e, () => openSkillModule('Funciones'))}>
                  Depuración guiada
                </a>
              </li>
            </ul>
          </div>

          <div className="apple-footer-col">
            <h4>Laboratorios</h4>
            <ul>
              <li>
                <a
                  href="#top"
                  onClick={(e) =>
                    handleNav(
                      e,
                      user?.role === 'student'
                        ? onGoMissions
                        : () => onSelectLandingTab?.('worlds'),
                    )
                  }
                >
                  Entorno visual Blockly
                </a>
              </li>
              <li>
                <a
                  href="#top"
                  onClick={(e) =>
                    handleNav(
                      e,
                      user?.role === 'student' ? () => onPython('') : () => onSelectLandingTab?.('worlds'),
                    )
                  }
                >
                  Transición a Python
                </a>
              </li>
              <li>
                <a
                  href="#top"
                  onClick={(e) =>
                    handleNav(
                      e,
                      user?.role === 'student' ? onAssessment : () => onSelectLandingTab?.('methodology'),
                    )
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
                <a
                  href="#top"
                  onClick={(e) =>
                    handleNav(e, user ? onHome : () => onSelectLandingTab?.('community'))
                  }
                >
                  Panel de seguimiento docente
                </a>
              </li>
              <li>
                <a
                  href="#top"
                  onClick={(e) =>
                    handleNav(e, user ? onGoMissions : () => onSelectLandingTab?.('worlds'))
                  }
                >
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
