import { useEffect, useRef } from 'react';
import {
  Eye,
  Moon,
  PersonArmsSpread,
  SlidersHorizontal,
  SpeakerHigh,
  SpeakerSlash,
  Sun,
  TextAa,
  X,
} from '@phosphor-icons/react';

const FONT_SCALE_OPTIONS = [
  { id: 'normal', label: 'Normal' },
  { id: 'lg', label: 'Grande' },
  { id: 'xl', label: 'Extra' },
];

/**
 * Menú emergente de accesibilidad y apariencia (tema claro/oscuro, escala tipográfica, contraste, audio).
 */
export default function AccessibilityMenu({
  a11y,
  onChangeA11y,
  onResetA11y,
  soundEnabled,
  onToggleSound,
  isOpen,
  onToggleOpen,
  onClose,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div className="a11y-menu-wrapper" ref={menuRef}>
      <button
        type="button"
        className={`a11y-trigger-btn${isOpen ? ' active' : ''}`}
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Abrir menú de accesibilidad y apariencia"
      >
        <PersonArmsSpread size={15} weight="bold" />
        <span>Accesibilidad</span>
      </button>

      {isOpen && (
        <section className="a11y-popover" role="dialog" aria-label="Menú de accesibilidad">
          <div className="a11y-popover-header">
            <div>
              <b>Accesibilidad y Apariencia</b>
              <small>Personaliza tu experiencia de estudio</small>
            </div>
            <button type="button" className="a11y-close-btn" onClick={onClose} aria-label="Cerrar menú">
              <X size={15} weight="bold" />
            </button>
          </div>

          <div className="a11y-group">
            <span className="a11y-group-label">Modo de color</span>
            <div className="a11y-theme-grid" role="radiogroup" aria-label="Selecciona el modo de color">
              <button
                type="button"
                role="radio"
                aria-checked={a11y.theme === 'dark'}
                className={a11y.theme === 'dark' ? 'a11y-option-card selected' : 'a11y-option-card'}
                onClick={() => onChangeA11y({ ...a11y, theme: 'dark' })}
              >
                <span className="a11y-theme-swatch dark-swatch">
                  <Moon size={16} weight="fill" />
                </span>
                <span className="a11y-option-copy">
                  <b>Modo Oscuro</b>
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={a11y.theme === 'light'}
                className={a11y.theme === 'light' ? 'a11y-option-card selected' : 'a11y-option-card'}
                onClick={() => onChangeA11y({ ...a11y, theme: 'light' })}
              >
                <span className="a11y-theme-swatch light-swatch">
                  <Sun size={16} weight="fill" />
                </span>
                <span className="a11y-option-copy">
                  <b>Modo Claro</b>
                </span>
              </button>
            </div>
          </div>

          <div className="a11y-group">
            <span className="a11y-group-label">
              <TextAa size={14} weight="bold" /> Tamaño de texto
            </span>
            <div className="a11y-scale-pills" role="group" aria-label="Tamaño de texto">
              {FONT_SCALE_OPTIONS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={a11y.fontScale === item.id}
                  className={a11y.fontScale === item.id ? 'a11y-pill selected' : 'a11y-pill'}
                  onClick={() => onChangeA11y({ ...a11y, fontScale: item.id })}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="a11y-toggles-list">
            <label className="a11y-toggle-row">
              <span>
                <Eye size={15} weight="regular" /> Alto contraste en bordes
              </span>
              <input
                type="checkbox"
                checked={Boolean(a11y.highContrast)}
                onChange={(event) => onChangeA11y({ ...a11y, highContrast: event.target.checked })}
              />
            </label>

            <label className="a11y-toggle-row">
              <span>
                <SlidersHorizontal size={15} weight="regular" /> Reducir animaciones
              </span>
              <input
                type="checkbox"
                checked={Boolean(a11y.reducedMotion)}
                onChange={(event) => onChangeA11y({ ...a11y, reducedMotion: event.target.checked })}
              />
            </label>

            <label className="a11y-toggle-row">
              <span>
                {soundEnabled ? (
                  <SpeakerHigh size={15} weight="regular" />
                ) : (
                  <SpeakerSlash size={15} weight="regular" />
                )}{' '}
                Efectos de sonido
              </span>
              <input type="checkbox" checked={Boolean(soundEnabled)} onChange={onToggleSound} />
            </label>
          </div>

          <button type="button" className="a11y-reset-btn" onClick={onResetA11y}>
            Restablecer valores predeterminados
          </button>
        </section>
      )}
    </div>
  );
}
