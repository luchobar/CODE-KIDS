import { useEffect, useId, useRef, useState } from 'react';
import { Info, X } from '@phosphor-icons/react';

/**
 * Tooltip interactivo accesible para contextualizar reglas y controles dentro de herramientas.
 * Se cierra con Escape o al hacer clic fuera del contenedor.
 * @param {{ label: string, content: string, align?: 'left' | 'right' }} props
 */
export default function ContextualTooltip({ label, content, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!content) return null;

  return (
    <span className="contextual-tooltip-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`contextual-tooltip-trigger${open ? ' open' : ''}`}
        aria-label={label}
        aria-expanded={open}
        aria-controls={popoverId}
        title={label}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Info size={15} weight={open ? 'fill' : 'bold'} />
      </button>

      {open && (
        <span
          id={popoverId}
          role="tooltip"
          className={`contextual-tooltip-popover align-${align}`}
        >
          <span className="contextual-tooltip-head">
            <b>{label}</b>
            <button
              type="button"
              className="contextual-tooltip-close"
              aria-label="Cerrar ayuda"
              onClick={() => setOpen(false)}
            >
              <X size={12} weight="bold" />
            </button>
          </span>
          <span className="contextual-tooltip-body">{content}</span>
        </span>
      )}
    </span>
  );
}
