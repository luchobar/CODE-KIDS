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
 * Barra de navegación global superior y barra HUD gamificada del usuario autenticado.
 * Conecta directamente con las pestañas multi-vista de público, estudiante y docente.
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
  publicView = 'landing',
  onOpenLogin,
  onBackToLanding,
  activeView = 'home',
  studentTab = 'overview',
  onStudentTabChange,
  teacherTab = 'overview',
  onTeacherTabChange,
  landingTab = 'overview',
  onLandingTabChange,
}) {
  const [a11yOpen, setA11yOpen] = useState(false);
  const points = state?.points || 0;
  const level = Math.floor(points / 100) + 1;
  const xpInLevel = points % 100;
  const scrollBehavior = a11y?.reducedMotion ? 'auto' : 'smooth';

  const goLandingTab = (tabId) => {
    if (onLandingTabChange) onLandingTabChange(tabId);
    if (publicView !== 'landing' && onBackToLanding) onBackToLanding();
  };

  const publicLinks = [
    { id: 'overview', label: 'Inicio' },
    { id: 'methodology', label: 'Metodología' },
    { id: 'worlds', label: 'Mundos' },
    { id: 'community', label: 'Comunidad' },
  ];

  const studentLinks = [
    { id: 'overview', label: 'Resumen' },
    { id: 'learn', label: 'Aprender' },
    { id: 'labs', label: 'Práctica' },
    { id: 'progress', label: 'Progreso' },
  ];

  const teacherLinks = [
    { id: 'overview', label: 'Resumen' },
    { id: 'courses', label: 'Cursos' },
    { id: 'assignments', label: 'Actividades' },
    { id: 'analytics', label: 'Analítica' },
  ];

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
                onHome?.();
              } else {
                goLandingTab('overview');
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
            {user?.role === 'student' ? (
              <>
                {studentLinks.map((item) => {
                  const isActive = activeView === 'home' && studentTab === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      aria-current={isActive ? 'page' : undefined}
                      className={`global-nav-link-btn${isActive ? ' active' : ''}`}
                      onClick={() => onStudentTabChange?.(item.id)}
                    >
                      {item.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-current={activeView === 'assessment' ? 'page' : undefined}
                  className={`global-nav-link-btn${activeView === 'assessment' ? ' active' : ''}`}
                  onClick={onAssessment}
                >
                  Diagnóstico
                </button>
              </>
            ) : user?.role === 'teacher' ? (
              teacherLinks.map((item) => {
                const isActive = teacherTab === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    aria-current={isActive ? 'page' : undefined}
                    className={`global-nav-link-btn${isActive ? ' active' : ''}`}
                    onClick={() => onTeacherTabChange?.(item.id)}
                  >
                    {item.label}
                  </button>
                );
              })
            ) : (
              publicLinks.map((item) => {
                const isActive = publicView === 'landing' && landingTab === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    aria-current={isActive ? 'page' : undefined}
                    className={`global-nav-link-btn${isActive ? ' active' : ''}`}
                    onClick={() => goLandingTab(item.id)}
                  >
                    {item.label}
                  </button>
                );
              })
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
