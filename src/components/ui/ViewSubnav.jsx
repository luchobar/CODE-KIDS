import { CaretRight } from '@phosphor-icons/react';

/**
 * Barra de sub-navegación multi-vista fija con migas de pan (breadcrumbs),
 * pestañas instantáneas sin pérdida de estado y ranura contextual opcional.
 */
export default function ViewSubnav({
  breadcrumbs = [],
  tabs = [],
  activeTab,
  onTabChange,
  rightSlot = null,
  ariaLabel = 'Secciones de la vista',
}) {
  return (
    <div className="view-subnav-bar">
      <div className="view-subnav-inner">
        <div className="view-subnav-top">
          {breadcrumbs.length > 0 && (
            <nav className="breadcrumb-trail" aria-label="Ruta de navegación">
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
          )}

          {rightSlot && <div className="view-subnav-slot">{rightSlot}</div>}
        </div>

        {tabs.length > 0 && (
          <div className="view-tabs-list" role="tablist" aria-label={ariaLabel}>
            {tabs.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  role="tab"
                  aria-selected={selected}
                  className={`view-tab-btn${selected ? ' active' : ''}`}
                  onClick={() => onTabChange(tab.id)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {typeof tab.badge === 'number' && tab.badge > 0 && (
                    <span className="view-tab-badge">{tab.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
