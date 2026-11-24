import {
  LandingAudienceSection,
  LandingHeroSection,
  LandingMethodologySection,
  LandingObjectivesSection,
  LandingWorldsSection,
} from './features/landing/LandingSections.jsx';
import './PresentationLanding.css';

/**
 * Página pública de presentación de CodeKids.
 * Respeta las preferencias de movimiento reducido al desplazarse hacia secciones.
 * @param {{ onOpenLogin: () => void }} props
 */
export default function PresentationLanding({ onOpenLogin }) {
  const scrollToSection = (event, sectionId) => {
    event.preventDefault();
    const element = document.getElementById(sectionId);
    if (!element) return;

    const prefersReduced =
      document.documentElement.getAttribute('data-reduced-motion') === 'true' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    element.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
  };

  return (
    <div className="apple-page landing-page">
      <LandingHeroSection
        onOpenLogin={onOpenLogin}
        onScrollToObjective={(event) => scrollToSection(event, 'objetivo')}
      />
      <LandingObjectivesSection />
      <LandingMethodologySection />
      <LandingWorldsSection />
      <LandingAudienceSection onOpenLogin={onOpenLogin} />
    </div>
  );
}
