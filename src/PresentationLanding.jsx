import { useState } from 'react';
import { Compass, GraduationCap, MapTrifold, RocketLaunch, Steps } from '@phosphor-icons/react';
import ViewSubnav from './components/ui/ViewSubnav.jsx';
import LandingFaqPedagogy from './features/landing/LandingFaqPedagogy.jsx';
import {
  LandingAudienceSection,
  LandingHeroSection,
  LandingMethodologySection,
  LandingObjectivesSection,
  LandingWorldsSection,
} from './features/landing/LandingSections.jsx';
import './PresentationLanding.css';

/**
 * Página pública de presentación organizada en 4 vistas navegables sin scroll interminable.
 * @param {{ onOpenLogin: () => void, activeTab?: string, onTabChange?: (tab: string) => void, breadcrumbs?: Array }} props
 */
export default function PresentationLanding({
  onOpenLogin,
  activeTab,
  onTabChange,
  breadcrumbs = [],
}) {
  const [fallbackTab, setFallbackTab] = useState('overview');
  const currentTab = activeTab || fallbackTab;
  const changeTab = (nextTab) => {
    if (onTabChange) onTabChange(nextTab);
    else setFallbackTab(nextTab);
  };

  const tabs = [
    { id: 'overview', label: 'Inicio y Propósito', icon: <Compass size={16} weight="duotone" /> },
    { id: 'methodology', label: 'Metodología Paso a Paso', icon: <Steps size={16} weight="duotone" /> },
    { id: 'worlds', label: '7 Mundos y Lenguajes', icon: <MapTrifold size={16} weight="duotone" /> },
    { id: 'community', label: 'Estudiantes y Colegios', icon: <GraduationCap size={16} weight="duotone" /> },
  ];

  return (
    <div className="apple-page landing-page">
      <ViewSubnav
        breadcrumbs={breadcrumbs}
        tabs={tabs}
        activeTab={currentTab}
        onTabChange={changeTab}
        ariaLabel="Explorar presentación de CodeKids"
        rightSlot={
          <button
            type="button"
            className="button-primary sub-nav-cta"
            onClick={onOpenLogin}
          >
            <RocketLaunch size={14} weight="fill" />
            <span>Entrar ahora</span>
          </button>
        }
      />

      <div key={currentTab} className="view-stage-panel">
        {currentTab === 'overview' && (
          <>
            <LandingHeroSection
              onOpenLogin={onOpenLogin}
              onGoToMethodology={() => changeTab('methodology')}
            />
            <LandingObjectivesSection />
          </>
        )}

        {currentTab === 'methodology' && (
          <>
            <LandingMethodologySection />
            <section className="product-tile-parchment">
              <div className="tile-container">
                <LandingFaqPedagogy />
              </div>
            </section>
          </>
        )}

        {currentTab === 'worlds' && <LandingWorldsSection />}

        {currentTab === 'community' && <LandingAudienceSection onOpenLogin={onOpenLogin} />}
      </div>
    </div>
  );
}
