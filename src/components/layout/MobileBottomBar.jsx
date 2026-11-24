import { BookOpen, Coins, Compass, TerminalWindow, Trophy } from '@phosphor-icons/react';

/**
 * Barra de navegación inferior móvil para estudiantes en pantallas pequeñas,
 * sincronizada con las 4 vistas principales del portal y la tienda de avatares.
 */
export default function MobileBottomBar({
  view,
  studentTab = 'overview',
  avatarShopOpen,
  onSelectTab,
  onOpenShop,
}) {
  const navItems = [
    {
      id: 'overview',
      label: 'Resumen',
      active: !avatarShopOpen && view === 'home' && studentTab === 'overview',
      icon: (isActive) => <Compass size={22} weight={isActive ? 'fill' : 'duotone'} />,
    },
    {
      id: 'learn',
      label: 'Aprender',
      active: !avatarShopOpen && view === 'home' && studentTab === 'learn',
      icon: (isActive) => <BookOpen size={22} weight={isActive ? 'fill' : 'duotone'} />,
    },
    {
      id: 'labs',
      label: 'Práctica',
      active: !avatarShopOpen && view === 'home' && studentTab === 'labs',
      icon: (isActive) => <TerminalWindow size={22} weight={isActive ? 'fill' : 'duotone'} />,
    },
    {
      id: 'progress',
      label: 'Progreso',
      active: !avatarShopOpen && view === 'home' && studentTab === 'progress',
      icon: (isActive) => <Trophy size={22} weight={isActive ? 'fill' : 'duotone'} />,
    },
  ];

  return (
    <nav className="mobile-bottom-bar" aria-label="Navegación móvil inferior">
      {navItems.map((item) => (
        <button
          type="button"
          key={item.id}
          className={`mobile-bottom-item${item.active ? ' active' : ''}`}
          onClick={() => onSelectTab?.(item.id)}
        >
          {item.icon(item.active)}
          <span>{item.label}</span>
        </button>
      ))}
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
