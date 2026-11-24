import { useState } from 'react';
import {
  ArrowLeft,
  Coins,
  Flame,
  GraduationCap,
  RocketLaunch,
  Sparkle,
  TerminalWindow,
} from '@phosphor-icons/react';
import AccessibilityMenu from './AccessibilityMenu.jsx';
import { AvatarGlyph } from './Glyphs.jsx';

/**
 * Barra de navegación global y barra HUD gamificada del usuario autenticado.
 */
export default function Header({
  user,
  state,
  a11y,
  onChangeA11y,
  onResetA11y,
  onExit,
  onOpenShop,
  onToggleSound,
  onAssessment,
  onPython,
  onHome,
  onGoMissions,
  publicView = 'landing',
  onOpenLogin,
  onBackToLanding,
}) {
  const [a11yOpen, setA11yOpen] = useState(false);
  const points = state?.points || 0;
  const level = Math.floor(points / 100) + 1;
  const xpInLevel = points % 100;
  const scrollBehavior = a11y?.reducedMotion ? 'auto' : 'smooth';

  const scrollToLanding = (event, sectionId) => {
    event.preventDefault();
    if (publicView !== 'landing' && onBackToLanding) {
      onBackToLanding();
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: scrollBehavior });
      }, 100);
      return;
    }
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: scrollBehavior });
    } else {
      window.scrollTo({ top: 0, behavior: scrollBehavior });
    }
  };

  return (
    <div className="apple-nav-stack">
      <header className="global-nav" aria-label="Navegación global">
        <div className="global-nav-inner">
          <a
            className="global-nav-brand brand-with-logo"
            href="#top"
            onClick={(event) => {
              event.preventDefault();
              if (user) {
                if (onHome) onHome();
              } else if (onBackToLanding) {
                onBackToLanding();
              } else {
                window.scrollTo({ top: 0, behavior: scrollBehavior });
              }
            }}
            title="CodeKids - Plataforma Educativa"
          >
            <img
              src="/images/logo_horizontal.jpg"
              alt="CodeKids Logo"
              className="global-nav-logo-horizontal"
            />
          </a>

          <nav className="global-nav-links" aria-label="Secciones principales">
            {user ? (
              <>
                <button type="button" className="global-nav-link-btn" onClick={() => onHome?.()}>
                  Mapa
                </button>
                <button type="button" className="global-nav-link-btn" onClick={() => onGoMissions?.()}>
                  Misiones
                </button>
                {user.role === 'student' && (
                  <>
                    <button type="button" className="global-nav-link-btn" onClick={onAssessment}>
                      Diagnóstico
                    </button>
                    <button type="button" className="global-nav-link-btn" onClick={() => onPython?.('')}>
                      Lab Python
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <button type="button" className="global-nav-link-btn" onClick={(e) => scrollToLanding(e, 'top')}>
                  Inicio
                </button>
                <button type="button" className="global-nav-link-btn" onClick={(e) => scrollToLanding(e, 'objetivo')}>
                  ¿Qué es? y Objetivo
                </button>
                <button type="button" className="global-nav-link-btn" onClick={(e) => scrollToLanding(e, 'metodologia')}>
                  Metodología
                </button>
                <button type="button" className="global-nav-link-btn" onClick={(e) => scrollToLanding(e, 'mundos')}>
                  Mundos
                </button>
              </>
            )}
          </nav>

          <div className="global-nav-actions">
            <AccessibilityMenu
              a11y={a11y}
              onChangeA11y={onChangeA11y}
              onResetA11y={onResetA11y}
              soundEnabled={state?.soundEnabled}
              onToggleSound={onToggleSound}
              isOpen={a11yOpen}
              onToggleOpen={() => setA11yOpen((prev) => !prev)}
              onClose={() => setA11yOpen(false)}
            />

            {!user ? (
              publicView === 'login' ? (
                <button
                  type="button"
                  className="button-secondary-pill nav-access-btn"
                  onClick={onBackToLanding}
                >
                  <ArrowLeft size={15} weight="bold" />
                  <span>Presentación</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="button-primary-pill nav-access-btn cta-3d-lime"
                  onClick={onOpenLogin}
                >
                  <RocketLaunch size={15} weight="fill" />
                  <span>Acceder</span>
                </button>
              )
            ) : (
              <button type="button" className="button-dark-utility" onClick={onExit}>
                Salir
              </button>
            )}
          </div>
        </div>
      </header>

      {user && (
        <div className="sub-nav-frosted">
          <div className="sub-nav-inner">
            <div className="sub-nav-title">
              <span className="hud-mode-pill">
                <Sparkle size={14} weight="fill" />
                <span>{user.role === 'teacher' ? 'Consola Docente' : `Explorador · ${user.name}`}</span>
              </span>
            </div>
            <div className="sub-nav-controls">
              {user.role === 'student' ? (
                <>
                  <div
                    className="hud-xp-pill"
                    title={`${points} XP totales (${100 - xpInLevel} XP para subir a Nivel ${level + 1})`}
                  >
                    <span className="hud-level-badge">
                      <AvatarGlyph avatar={state.avatar} size={15} />
                      <b>Nvl. {level}</b>
                    </span>
                    <div className="hud-xp-track" aria-label={`Experiencia: ${xpInLevel} de 100 XP`}>
                      <div className="hud-xp-fill" style={{ width: `${Math.max(12, xpInLevel)}%` }} />
                    </div>
                    <small className="hud-xp-text">{xpInLevel}/100 XP</small>
                  </div>

                  <span className="sub-nav-metric streak-metric" title="Racha de días activos">
                    <Flame size={16} weight="fill" />
                    <span>{state.streak || 1} días</span>
                  </span>

                  <button
                    type="button"
                    className="button-pearl-capsule coin-hud-btn"
                    onClick={onOpenShop}
                    aria-label={`Abrir tienda de avatares, tienes ${state.coins || 0} monedas`}
                  >
                    <Coins size={15} weight="fill" />
                    <span>{state.coins || 0}</span>
                  </button>

                  <button type="button" className="button-primary sub-nav-cta" onClick={() => onPython?.('')}>
                    <TerminalWindow size={15} weight="bold" />
                    <span>Python</span>
                  </button>
                </>
              ) : (
                <span className="sub-nav-metric">
                  <GraduationCap size={16} weight="duotone" />
                  <span>{user.name}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
