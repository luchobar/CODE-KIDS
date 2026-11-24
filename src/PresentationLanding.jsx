import { useState } from 'react';
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
 * Página pública de presentación controlada desde la barra de navegación global unificada.
 * @param {{ onOpenLogin: () => void, activeTab?: string, onTabChange?: (tab: string) => void }} props
 */
export default function PresentationLanding({
  onOpenLogin,
  activeTab,
  onTabChange,
}) {
  const [fallbackTab, setFallbackTab] = useState('overview');
  const currentTab = activeTab || fallbackTab;
  const changeTab = (nextTab) => {
    if (onTabChange) onTabChange(nextTab);
    else setFallbackTab(nextTab);
  };

  return (
    <div className="apple-page landing-page">
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
