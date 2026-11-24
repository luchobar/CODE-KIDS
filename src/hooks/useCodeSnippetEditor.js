import { useRef } from 'react';

/**
 * Detecta si la pantalla actual está en rango móvil/tablet compacto para alternar pestañas al ejecutar.
 * @returns {boolean}
 */
export function isCompactViewport() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(max-width: 860px)').matches;
}

/**
 * Hook compartido para insertar fragmentos de sintaxis e indentación con Tab en editores `<textarea>`.
 * @param {string} code
 * @param {(nextCode: string) => void} onCodeChange
 * @param {{ tabString?: string, onInsert?: () => void }} [options]
 */
export function useCodeSnippetEditor(code, onCodeChange, { tabString = '    ', onInsert } = {}) {
  const textareaRef = useRef(null);

  const insertSnippet = (snippet, cursorOffset) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? code.length;
    const end = textarea.selectionEnd ?? code.length;
    const next = `${code.slice(0, start)}${snippet}${code.slice(end)}`;
    onCodeChange(next);
    if (onInsert) onInsert();
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = typeof cursorOffset === 'number' ? start + cursorOffset : start + snippet.length;
      textarea.setSelectionRange(pos, pos);
    });
  };

  const handleTabKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    insertSnippet(tabString);
  };

  return {
    textareaRef,
    insertSnippet,
    handleTabKeyDown,
  };
}
