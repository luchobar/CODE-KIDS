function renderInlineMarkdown(text) {
  const parts = String(text || '').split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={`code-${idx}`} className="md-inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={`bold-${idx}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={`em-${idx}`}>{part.slice(1, -1)}</em>;
    }
    return <span key={`txt-${idx}`}>{part}</span>;
  });
}

/**
 * Renderiza consignas en Markdown simplificado (encabezados ###, citas, listas y código en línea).
 * @param {{ markdown: string }} props
 */
export function FormattedInstructions({ markdown }) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let listItems = [];
  let listOrdered = false;

  const flushList = (keyPrefix) => {
    if (!listItems.length) return;
    if (listOrdered) {
      blocks.push(
        <ol key={`${keyPrefix}-ol`} className="md-instruction-list ordered">
          {listItems.map((item, idx) => (
            <li key={`${keyPrefix}-oli-${idx}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>,
      );
    } else {
      blocks.push(
        <ul key={`${keyPrefix}-ul`} className="md-instruction-list">
          {listItems.map((item, idx) => (
            <li key={`${keyPrefix}-uli-${idx}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
    }
    listItems = [];
  };

  lines.forEach((raw, idx) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      flushList(`empty-${idx}`);
      return;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (listItems.length && !listOrdered) flushList(`switch-${idx}`);
      listOrdered = true;
      listItems.push(orderedMatch[1]);
      return;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      if (listItems.length && listOrdered) flushList(`switch-${idx}`);
      listOrdered = false;
      listItems.push(bulletMatch[1]);
      return;
    }

    flushList(`line-${idx}`);

    if (trimmed.startsWith('### ')) {
      blocks.push(
        <h3 key={`h3-${idx}`} className="md-instruction-heading">
          {renderInlineMarkdown(trimmed.slice(4))}
        </h3>,
      );
    } else if (trimmed.startsWith('> ')) {
      blocks.push(
        <blockquote key={`bq-${idx}`} className="md-instruction-callout">
          {renderInlineMarkdown(trimmed.slice(2))}
        </blockquote>,
      );
    } else {
      blocks.push(
        <p key={`p-${idx}`} className="md-instruction-paragraph">
          {renderInlineMarkdown(trimmed)}
        </p>,
      );
    }
  });

  flushList('final');
  return <div className="md-instructions-box">{blocks}</div>;
}
