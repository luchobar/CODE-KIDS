import {
  Coins,
  Compass,
  RocketLaunch,
  Sparkle,
  TerminalWindow,
} from '@phosphor-icons/react';

/**
 * Barra de navegación inferior móvil para estudiantes en pantallas pequeñas.
 */
export default function MobileBottomBar({
  view,
  avatarShopOpen,
  onHome,
  onGoMissions,
  onOpenPython,
  onOpenAssessment,
  onOpenShop,
}) {
  return (
    <nav className="mobile-bottom-bar" aria-label="Navegación móvil inferior">
      <button
        type="button"
        className={`mobile-bottom-item${view === 'home' ? ' active' : ''}`}
        onClick={onHome}
      >
        <Compass size={22} weight={view === 'home' ? 'fill' : 'duotone'} />
        <span>Inicio</span>
      </button>
      <button type="button" className="mobile-bottom-item" onClick={onGoMissions}>
        <RocketLaunch size={22} weight="duotone" />
        <span>Misiones</span>
      </button>
      <button type="button" className="mobile-bottom-item" onClick={() => onOpenPython('')}>
        <TerminalWindow size={22} weight="duotone" />
        <span>Python</span>
      </button>
      <button
        type="button"
        className={`mobile-bottom-item${view === 'assessment' ? ' active' : ''}`}
        onClick={onOpenAssessment}
      >
        <Sparkle size={22} weight={view === 'assessment' ? 'fill' : 'duotone'} />
        <span>Diagnóstico</span>
      </button>
      <button
        type="button"
        className={`mobile-bottom-item${avatarShopOpen ? ' active' : ''}`}
        onClick={onOpenShop}
      >
        <Coins size={22} weight="fill" />
        <span>Tienda</span>
      </button>
    </nav>
  );
}
