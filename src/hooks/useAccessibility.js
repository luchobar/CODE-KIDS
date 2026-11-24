import { useEffect, useState } from 'react';
import { DEFAULT_A11Y_SETTINGS } from '../data/seedData.js';
import { readA11ySettings, writeA11ySettings } from '../data/storageStore.js';

/**
 * Administra tema visual y preferencias de accesibilidad sincronizadas con `<html>` y `localStorage`.
 */
export function useAccessibility() {
  const [a11y, setA11y] = useState(readA11ySettings);

  useEffect(() => {
    writeA11ySettings(a11y);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', a11y.theme);
      document.documentElement.setAttribute('data-font-scale', a11y.fontScale || 'normal');
      document.documentElement.setAttribute('data-reduced-motion', String(Boolean(a11y.reducedMotion)));
      document.documentElement.setAttribute('data-high-contrast', String(Boolean(a11y.highContrast)));
    }
  }, [a11y]);

  const resetA11y = () => setA11y(DEFAULT_A11Y_SETTINGS);

  return { a11y, setA11y, resetA11y };
}
