export const HTML_SNIPPETS = [
  { label: '<h1>...</h1>', snippet: '<h1></h1>', offset: 4 },
  { label: '<p>...</p>', snippet: '<p></p>', offset: 3 },
  { label: '<strong>...</strong>', snippet: '<strong></strong>', offset: 8 },
  { label: '<ul>...</ul>', snippet: '<ul>\n  <li></li>\n</ul>', offset: 11 },
  { label: '<li>...</li>', snippet: '<li></li>', offset: 4 },
  { label: '<a href="">', snippet: '<a href="#lanzamiento"></a>', offset: 23 },
];

export const JS_SNIPPETS = [
  { label: 'const ', snippet: 'const ' },
  { label: 'return ', snippet: 'return ' },
  { label: '`...`', snippet: '``', offset: 1 },
  { label: '${...}', snippet: '${}', offset: 2 },
  { label: 'if (...) {}', snippet: 'if () {\n  \n}', offset: 4 },
  { label: 'else if', snippet: ' else if () {\n  \n}', offset: 10 },
  { label: 'else {}', snippet: ' else {\n  \n}', offset: 10 },
  { label: '>=', snippet: ' >= ' },
];

const HOLOGRAM_THEMES = {
  dark: {
    canvas: '#0d1626',
    glow: 'rgba(56, 189, 248, 0.18)',
    ink: '#f8fafc',
    muted: '#e2e8f0',
    surface: 'rgba(22, 36, 58, 0.78)',
    border: 'rgba(56, 189, 248, 0.35)',
    heading: '#38bdf8',
    strongInk: '#b8ec63',
    strongBg: 'rgba(184, 236, 99, 0.14)',
    ctaStart: '#b8ec63',
    ctaEnd: '#84cc16',
    ctaInk: '#0b1320',
  },
  light: {
    canvas: '#f4f8ff',
    glow: 'rgba(27, 126, 220, 0.12)',
    ink: '#0f172a',
    muted: '#334155',
    surface: 'rgba(255, 255, 255, 0.96)',
    border: 'rgba(27, 126, 220, 0.28)',
    heading: '#1b7edc',
    strongInk: '#2f6d00',
    strongBg: 'rgba(132, 204, 22, 0.16)',
    ctaStart: '#1b7edc',
    ctaEnd: '#1463b0',
    ctaInk: '#ffffff',
  },
};

/**
 * Construye el documento HTML aislado para el visor holográfico respetando el tema activo.
 * @param {string} rawHtml
 * @param {'dark' | 'light'} [theme='dark']
 * @returns {string}
 */
export function buildHologramSrcDoc(rawHtml, theme = 'dark') {
  const palette = HOLOGRAM_THEMES[theme === 'light' ? 'light' : 'dark'];
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 18px;
    background: radial-gradient(circle at top right, ${palette.glow}, transparent 60%), ${palette.canvas};
    color: ${palette.ink};
    font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
    line-height: 1.5;
  }
  header, section {
    border: 1.5px solid ${palette.border};
    border-radius: 14px;
    padding: 16px;
    background: ${palette.surface};
    box-shadow: 0 0 24px ${palette.glow};
  }
  h1, h2 {
    margin: 0 0 8px;
    color: ${palette.heading};
    letter-spacing: -0.01em;
  }
  h1 { font-size: 1.35rem; }
  h2 { font-size: 1.1rem; }
  p { margin: 6px 0 0; color: ${palette.muted}; }
  strong {
    color: ${palette.strongInk};
    padding: 2px 8px;
    border-radius: 999px;
    background: ${palette.strongBg};
  }
  ul {
    margin: 10px 0 14px;
    padding-left: 20px;
    color: ${palette.muted};
  }
  li { margin-bottom: 4px; }
  a {
    display: inline-block;
    padding: 8px 14px;
    border-radius: 999px;
    background: linear-gradient(135deg, ${palette.ctaStart}, ${palette.ctaEnd});
    color: ${palette.ctaInk};
    font-weight: 700;
    text-decoration: none;
    font-size: 0.88rem;
  }
</style>
</head>
<body>${rawHtml || ''}</body>
</html>`;
}
