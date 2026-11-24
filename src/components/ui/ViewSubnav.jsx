import { CaretRight } from '@phosphor-icons/react';

/**
 * Rastro compacto de migas de pan (breadcrumbs) para contextualizar la ubicación actual
 * dentro de la barra unificada sin duplicar botones de navegación.
 */
export default function ViewSubnav({ breadcrumbs = [], className = '' }) {
  if (!breadcrumbs.length) return null;

  return (
    <nav className={`breadcrumb-trail${className ? ` ${className}` : ''}`} aria-label="Ruta de navegación">
      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        return (
          <span className="breadcrumb-item" key={crumb.id || crumb.label}>
            {crumb.onClick && !isLast ? (
              <button type="button" className="breadcrumb-link" onClick={crumb.onClick}>
                {crumb.label}
              </button>
            ) : (
              <span className={isLast ? 'breadcrumb-current' : 'breadcrumb-text'}>
                {crumb.label}
              </span>
            )}
            {!isLast && <CaretRight size={12} weight="bold" aria-hidden="true" />}
          </span>
        );
      })}
    </nav>
  );
}
