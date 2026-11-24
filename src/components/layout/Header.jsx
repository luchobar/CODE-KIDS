import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  BookOpen,
  ChartBar,
  Coins,
  Compass,
  Flame,
  GraduationCap,
  MapTrifold,
  NotePencil,
  RocketLaunch,
  Sparkle,
  Steps,
  TerminalWindow,
  Trophy,
  UsersThree,
} from '@phosphor-icons/react';
import ViewSubnav from '../ui/ViewSubnav.jsx';
import AccessibilityMenu from './AccessibilityMenu.jsx';
import { AvatarGlyph } from './Glyphs.jsx';

/**
 * Barra de navegación global unificada (una sola hilera de pestañas sin duplicaciones)
 * acompañada únicamente de la tira HUD contextual cuando el usuario ha iniciado sesión.
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
  studentPendingCount = 0,
  teacherTab = 'overview',
  onTeacherTabChange,
  teacherGroup = '5° A',
  onTeacherGroupChange,
  teacherCourses = [],
  enrollmentsByGroup = {},
  teacherAssignmentsCount = 0,
  landingTab = 'overview',
  onLandingTabChange,
  breadcrumbs = [],
  avatarShopOpen = false,
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
    { id: 'overview', label: 'Inicio', icon: <Compass size={15} weight="duotone" /> },
    { id: 'methodology', label: 'Metodología', icon: <Steps size={15} weight="duotone" /> },
    { id: 'worlds', label: 'Mundos', icon: <MapTrifold size={15} weight="duotone" /> },
    { id: 'community', label: 'Comunidad', icon: <GraduationCap size={15} weight="duotone" /> },
  ];

  const studentLinks = [
    { id: 'overview', label: 'Resumen', icon: <Compass size={15} weight="duotone" /> },
    { id: 'learn', label: 'Módulos y Mundos', short: 'Aprender', icon: <BookOpen size={15} weight="duotone" /> },
    {
      id: 'labs',
      label: 'Práctica y Retos',
      short: 'Práctica',
      icon: <TerminalWindow size={15} weight="duotone" />,
      badge: studentPendingCount,
    },
    { id: 'progress', label: 'Progreso', icon: <Trophy size={15} weight="duotone" /> },
  ];

  const teacherLinks = [
    { id: 'overview', label: 'Resumen', icon: <Compass size={15} weight="duotone" /> },
    { id: 'courses', label: 'Cursos', icon: <UsersThree size={15} weight="duotone" /> },
    {
      id: 'assignments',
      label: 'Actividades',
      icon: <NotePencil size={15} weight="duotone" />,
      badge: teacherAssignmentsCount,
    },
    { id: 'analytics', label: 'Analítica SQL e IA', short: 'Analítica', icon: <ChartBar size={15} weight="duotone" /> },
  ];

  const roleClass = user ? `role-${user.role}` : 'role-public';

  // Fuente única de navegación móvil: se deriva de las mismas listas que la barra superior.
  let mobileItems = [];
  if (user?.role === 'student') {
    mobileItems = [
      ...studentLinks.map((item) => ({
        ...item,
        active: !avatarShopOpen && activeView === 'home' && studentTab === item.id,
        onClick: () => onStudentTabChange?.(item.id),
      })),
      {
        id: 'assessment',
        label: 'Diagnóstico',
        icon: <Sparkle size={15} weight="duotone" />,
        active: !avatarShopOpen && activeView === 'assessment',
        onClick: onAssessment,
      },
      {
        id: 'shop',
        label: 'Tienda',
        icon: <Coins size={15} weight="fill" />,
        badge: state?.coins || 0,
        active: avatarShopOpen,
        onClick: onOpenShop,
      },
    ];
  } else if (user?.role === 'teacher') {
    mobileItems = teacherLinks.map((item) => ({
      ...item,
      active: teacherTab === item.id,
      onClick: () => onTeacherTabChange?.(item.id),
    }));
  } else {
    mobileItems = publicLinks.map((item) => ({
      ...item,
      active: publicView === 'landing' && landingTab === item.id,
      onClick: () => goLandingTab(item.id),
    }));
  }
  const showMobileBar = activeView !== 'workspace' && typeof document !== 'undefined';
  const mobileBar = showMobileBar
    ? createPortal(
        <nav className="mobile-bottom-bar unified-mobile-bar" aria-label="Navegación móvil">
          {mobileItems.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-current={item.active ? 'page' : undefined}
              className={`mobile-bottom-item${item.active ? ' active' : ''}`}
              onClick={item.onClick}
            >
              <span className="mobile-bottom-icon">
                {item.icon}
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="mobile-bottom-badge">{item.badge}</span>
                )}
              </span>
              <span>{item.short || item.label}</span>
            </button>
          ))}
        </nav>,
        document.body,
      )
    : null;

  return (
    <div className="apple-nav-stack">
      {mobileBar}
      <header className={`global-nav ${roleClass}`} aria-label="Navegación global">
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
                      {item.icon}
                      <span>{item.label}</span>
                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span className="view-tab-badge">{item.badge}</span>
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-current={activeView === 'assessment' ? 'page' : undefined}
                  className={`global-nav-link-btn${activeView === 'assessment' ? ' active' : ''}`}
                  onClick={onAssessment}
                >
                  <Sparkle size={15} weight="duotone" />
                  <span>Diagnóstico</span>
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
                    {item.icon}
                    <span>{item.label}</span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="view-tab-badge">{item.badge}</span>
                    )}
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
                    {item.icon}
                    <span>{item.label}</span>
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
            <div className="sub-nav-context">
              <span className="hud-mode-pill">
                <Sparkle size={14} weight="fill" />
                <span>{user.role === 'teacher' ? 'Consola Docente' : `Explorador · ${user.name}`}</span>
              </span>
              <ViewSubnav breadcrumbs={breadcrumbs} className="subnav-inline-crumbs" />
            </div>

            <div className="sub-nav-controls">
              {user.role === 'student' ? (
                <>
                  <span className="sub-nav-metric">
                    <GraduationCap size={15} weight="duotone" />
                    <span>{user.group || '5° A'}</span>
                  </span>

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
                <>
                  {teacherCourses.length > 0 && onTeacherGroupChange && (
                    <div className="course-selector-group" role="group" aria-label="Seleccionar curso activo">
                      {teacherCourses.map((courseItem) => {
                        const cCode = courseItem.codigoGrupo;
                        const count = (enrollmentsByGroup[cCode] || []).length;
                        return (
                          <button
                            type="button"
                            key={cCode}
                            className={
                              teacherGroup === cCode
                                ? 'subnav-course-pill selected'
                                : 'subnav-course-pill'
                            }
                            onClick={() => onTeacherGroupChange(cCode)}
                          >
                            <span>
                              {cCode} ({count})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <span className="sub-nav-metric">
                    <GraduationCap size={16} weight="duotone" />
                    <span>{user.name}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
