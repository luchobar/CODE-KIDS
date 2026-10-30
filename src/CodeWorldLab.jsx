import { useEffect, useRef, useState } from 'react';
import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  Broadcast,
  Check,
  CheckCircle,
  Code,
  Coins,
  FileHtml,
  FileJs,
  Lightbulb,
  Lightning,
  Lock,
  Play,
  TerminalWindow,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  evaluateHtmlDomMission,
  evaluateJavaScriptMission,
  getExpansionMissionsByWorld,
  getExpansionWorld,
} from './expansionCatalog.js';
import './PythonMission.css';

function renderInlineMarkdown(text) {
  const parts = String(text || '').split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return <code key={idx} className="md-inline-code">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }
    return <span key={idx}>{part}</span>;
  });
}

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
          {listItems.map((item, i) => (
            <li key={i}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>,
      );
    } else {
      blocks.push(
        <ul key={`${keyPrefix}-ul`} className="md-instruction-list">
          {listItems.map((item, i) => (
            <li key={i}>{renderInlineMarkdown(item)}</li>
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
        <h3 key={idx} className="md-instruction-heading">
          {renderInlineMarkdown(trimmed.slice(4))}
        </h3>,
      );
    } else if (trimmed.startsWith('> ')) {
      blocks.push(
        <blockquote key={idx} className="md-instruction-callout">
          {renderInlineMarkdown(trimmed.slice(2))}
        </blockquote>,
      );
    } else {
      blocks.push(
        <p key={idx} className="md-instruction-paragraph">
          {renderInlineMarkdown(trimmed)}
        </p>,
      );
    }
  });

  flushList('final');
  return <div className="md-instructions-box">{blocks}</div>;
}

const HTML_SNIPPETS = [
  { label: '<h1>...</h1>', snippet: '<h1></h1>', offset: 4 },
  { label: '<p>...</p>', snippet: '<p></p>', offset: 3 },
  { label: '<strong>...</strong>', snippet: '<strong></strong>', offset: 8 },
  { label: '<ul>...</ul>', snippet: '<ul>\n  <li></li>\n</ul>', offset: 11 },
  { label: '<li>...</li>', snippet: '<li></li>', offset: 4 },
  { label: '<a href="">', snippet: '<a href="#lanzamiento"></a>', offset: 23 },
];

const JS_SNIPPETS = [
  { label: 'const ', snippet: 'const ' },
  { label: 'return ', snippet: 'return ' },
  { label: '`...`', snippet: '``', offset: 1 },
  { label: '${...}', snippet: '${}', offset: 2 },
  { label: 'if (...) {}', snippet: 'if () {\n  \n}', offset: 4 },
  { label: 'else if', snippet: ' else if () {\n  \n}', offset: 10 },
  { label: 'else {}', snippet: ' else {\n  \n}', offset: 10 },
  { label: '>=', snippet: ' >= ' },
];

function buildHologramSrcDoc(rawHtml) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 18px;
    background: radial-gradient(circle at top right, rgba(56, 189, 248, 0.18), transparent 60%), #0d1626;
    color: #f8fafc;
    font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
    line-height: 1.5;
  }
  header, section {
    border: 1.5px solid rgba(56, 189, 248, 0.35);
    border-radius: 14px;
    padding: 16px;
    background: rgba(22, 36, 58, 0.78);
    box-shadow: 0 0 24px rgba(56, 189, 248, 0.12);
  }
  h1, h2 {
    margin: 0 0 8px;
    color: #38bdf8;
    letter-spacing: -0.01em;
  }
  h1 { font-size: 1.35rem; }
  h2 { font-size: 1.1rem; }
  p { margin: 6px 0 0; color: #e2e8f0; }
  strong {
    color: #b8ec63;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(184, 236, 99, 0.14);
  }
  ul {
    margin: 10px 0 14px;
    padding-left: 20px;
    color: #e2e8f0;
  }
  li { margin-bottom: 4px; }
  a {
    display: inline-block;
    padding: 8px 14px;
    border-radius: 999px;
    background: linear-gradient(135deg, #b8ec63, #84cc16);
    color: #0b1320;
    font-weight: 700;
    text-decoration: none;
    font-size: 0.88rem;
  }
</style>
</head>
<body>${rawHtml || ''}</body>
</html>`;
}

export default function CodeWorldLab({
  worldSlug,
  initialMissionSlug = '',
  customWorlds = null,
  customMissions = null,
  completed = [],
  onComplete,
  onClose,
}) {
  const worldMeta =
    (Array.isArray(customWorlds) && customWorlds.find((w) => w.slug === worldSlug)) ||
    getExpansionWorld(worldSlug) || {
      titulo: worldSlug === 'ciudadela-html' ? 'Ciudadela HTML' : 'Neo-Tokio JavaScript',
      slug: worldSlug,
      descripcion: 'Misiones interactivas de código.',
      tecnologia: worldSlug === 'ciudadela-html' ? 'HTML5' : 'JavaScript',
    };

  const missions = getExpansionMissionsByWorld(worldSlug, customMissions);
  const isHtml = worldSlug === 'ciudadela-html' || worldMeta.tecnologia === 'HTML5';

  const resolveInitialIndex = () => {
    if (initialMissionSlug) {
      const idx = missions.findIndex((m) => m.slug === initialMissionSlug);
      if (idx >= 0) return idx;
    }
    const firstPending = missions.findIndex((m) => !completed.includes(m.slug));
    return firstPending < 0 ? 0 : firstPending;
  };

  const [selectedIndex, setSelectedIndex] = useState(resolveInitialIndex);
  const mission = missions[selectedIndex] || missions[0];
  const [code, setCode] = useState(mission?.codigo_inicial || '');
  const [evaluation, setEvaluation] = useState(null);
  const [hintIndex, setHintIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [mobileTab, setMobileTab] = useState('editor');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!mission) return;
    setCode(mission.codigo_inicial || '');
    setEvaluation(null);
    setHintIndex(0);
    setAttempts(0);
  }, [selectedIndex, worldSlug]);

  if (!mission) return null;

  const hintsList = Array.isArray(mission.pistas)
    ? mission.pistas.map((h) => (typeof h === 'string' ? h : h.texto))
    : [];

  const canUnlock = (index) => index === 0 || completed.includes(missions[index - 1]?.slug);

  const selectMission = (index) => {
    if (!canUnlock(index)) return;
    setSelectedIndex(index);
  };

  const insertSnippet = (snippet, cursorOffset) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? code.length;
    const end = textarea.selectionEnd ?? code.length;
    const next = `${code.slice(0, start)}${snippet}${code.slice(end)}`;
    setCode(next);
    setEvaluation(null);
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = typeof cursorOffset === 'number' ? start + cursorOffset : start + snippet.length;
      textarea.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    insertSnippet('  ');
  };

  const runValidation = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 860) {
      setMobileTab('preview');
    }
    setAttempts((c) => c + 1);
    const outcome = isHtml
      ? evaluateHtmlDomMission(code, mission.reglas_validacion)
      : evaluateJavaScriptMission(code, mission.reglas_validacion);

    setEvaluation(outcome);
    if (outcome.passed && onComplete) {
      onComplete(mission.slug, mission.xp_recompensa, mission.monedas_recompensa, code, attempts + 1);
    }
  };

  const nextHint = () => setHintIndex((idx) => (idx >= hintsList.length ? 0 : idx + 1));
  const snippets = isHtml ? HTML_SNIPPETS : JS_SNIPPETS;

  return (
    <main id="top" className="apple-page fullscreen-exercise-page">
      <div className="fullscreen-exercise-container">
        <header className="workspace-topbar">
          <div className="workspace-topbar-left">
            <button type="button" className="workspace-back-btn" onClick={onClose}>
              <ArrowLeft size={16} weight="bold" />
              <span>Volver al mapa</span>
            </button>
            <div className="workspace-title-group">
              <span className="modal-meta-label">
                {worldMeta.tecnologia} · +{mission.xp_recompensa} XP y +{mission.monedas_recompensa} monedas
              </span>
              <h1>{worldMeta.titulo}</h1>
              <p className="python-intro">{mission.contexto_narrativo}</p>
            </div>
          </div>

          <nav className="python-stages" aria-label={`Misiones de ${worldMeta.titulo}`}>
            {missions.map((item, index) => {
              const isDone = completed.includes(item.slug);
              const unlocked = canUnlock(index);
              return (
                <button
                  type="button"
                  key={item.slug}
                  disabled={!unlocked}
                  aria-current={index === selectedIndex ? 'step' : undefined}
                  className={`python-stage${index === selectedIndex ? ' active' : ''}${isDone ? ' completed' : ''}`}
                  onClick={() => selectMission(index)}
                >
                  <span className="python-stage-badge">
                    {isDone ? (
                      <Check size={13} weight="bold" />
                    ) : unlocked ? (
                      isHtml ? <FileHtml size={14} weight="duotone" /> : <FileJs size={14} weight="duotone" />
                    ) : (
                      <Lock size={13} weight="regular" />
                    )}
                  </span>
                  <span className="python-stage-copy">
                    <small>Misión {item.orden} · +{item.xp_recompensa} XP</small>
                    <b>{item.titulo}</b>
                  </span>
                </button>
              );
            })}
          </nav>
        </header>

        <div className="python-teaching-row mission-brief-card">
          <div className="mission-brief-content">
            <div className="mission-brief-badges">
              <span className="python-teaching-label">Consigna de Misión</span>
              <span className="mission-reward-tag">
                <Lightning size={13} weight="fill" /> +{mission.xp_recompensa} XP
              </span>
              <span className="mission-reward-tag coins">
                <Coins size={13} weight="fill" /> +{mission.monedas_recompensa} Monedas
              </span>
            </div>
            <FormattedInstructions markdown={mission.instrucciones_md} />
          </div>
          {hintsList.length > 0 && (
            <button type="button" onClick={nextHint}>
              <Lightbulb size={15} weight="regular" />
              <span>
                {hintIndex === 0
                  ? `Ver pista (0/${hintsList.length})`
                  : hintIndex < hintsList.length
                    ? `Siguiente pista (${hintIndex}/${hintsList.length})`
                    : 'Ocultar pistas'}
              </span>
            </button>
          )}
        </div>

        {hintIndex > 0 && hintsList[hintIndex - 1] && (
          <p className="python-hint" role="status">
            <b>Pista {hintIndex} de {hintsList.length}</b>
            <span>{hintsList[hintIndex - 1]}</span>
          </p>
        )}

        <div className="python-mobile-tabs-bar" role="tablist" aria-label="Selector de vista móvil">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'editor'}
            className={`python-mobile-tab-btn${mobileTab === 'editor' ? ' active' : ''}`}
            onClick={() => setMobileTab('editor')}
          >
            <Code size={16} weight="bold" />
            <span>Editor {isHtml ? 'HTML' : 'JS'}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'preview'}
            className={`python-mobile-tab-btn${mobileTab === 'preview' ? ' active' : ''}`}
            onClick={() => setMobileTab('preview')}
          >
            <Broadcast size={16} weight="bold" />
            <span>{isHtml ? 'Holograma en Vivo' : 'Consola Neo-Tokio'}</span>
          </button>
        </div>

        <div className={`python-workspace mobile-active-${mobileTab}`}>
          <div className="python-editor-card tab-panel-python-editor">
            <div className="python-editor-header">
              <span>
                <TerminalWindow size={15} weight="regular" /> {isHtml ? 'ciudadela.html' : 'neotokio.js'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCode(mission.codigo_inicial);
                  setEvaluation(null);
                }}
              >
                <ArrowCounterClockwise size={13} weight="regular" /> Restaurar código
              </button>
            </div>

            <div className="python-mobile-syntax-bar" aria-label="Atajos rápidos de sintaxis">
              {snippets.map((item) => (
                <button
                  type="button"
                  key={item.label}
                  className="syntax-chip"
                  onClick={() => insertSnippet(item.snippet, item.offset)}
                >
                  <code>{item.label}</code>
                </button>
              ))}
            </div>

            <label className="sr-only" htmlFor="world-code-editor">
              Editor de código {worldMeta.tecnologia}
            </label>
            <textarea
              ref={textareaRef}
              id="world-code-editor"
              aria-label={`Escribe tu código ${worldMeta.tecnologia}`}
              spellCheck="false"
              autoCapitalize="off"
              autoCorrect="off"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setEvaluation(null);
              }}
              onKeyDown={handleKeyDown}
            />

            <div className="python-editor-footer">
              <small>
                Lenguaje activo: <code>{worldMeta.tecnologia}</code> · Intentos: {attempts}
              </small>
              <button type="button" className="python-run" onClick={runValidation}>
                <Play size={15} weight="fill" />
                <span>{isHtml ? 'Proyectar Holograma ▶️' : 'Ejecutar Pruebas ▶️'}</span>
              </button>
            </div>
          </div>

          <div className="python-preview code-lab-preview tab-panel-python-preview">
            <div className="python-preview-title">
              <span>{isHtml ? 'Visor Holográfico de la Ciudadela' : 'Terminal de Pruebas Neo-Tokio'}</span>
              <b>{mission.titulo}</b>
            </div>

            {isHtml ? (
              <div className="html-hologram-stage">
                <iframe
                  title="Vista previa holográfica HTML5"
                  className="html-hologram-iframe"
                  sandbox=""
                  srcDoc={buildHologramSrcDoc(code)}
                />
                {evaluation?.checks?.length > 0 && (
                  <ul className="lab-test-list" aria-label="Verificación de etiquetas DOM">
                    {evaluation.checks.map((chk) => (
                      <li key={chk.id} className={`lab-test-item ${chk.passed ? 'pass' : 'fail'}`}>
                        <span className="lab-test-status">{chk.passed ? '✓' : '✕'}</span>
                        <div className="lab-test-copy">
                          <b>{chk.label}</b>
                          <small>{chk.detail}</small>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="js-console-stage">
                {evaluation?.testResults?.length ? (
                  <ul className="lab-test-list" aria-label="Resultados de casos de prueba">
                    {evaluation.testResults.map((test) => (
                      <li key={test.id} className={`lab-test-item ${test.passed ? 'pass' : 'fail'}`}>
                        <span className="lab-test-status">{test.passed ? '✓' : '✕'}</span>
                        <div className="lab-test-copy">
                          <b>{test.description}</b>
                          <small>
                            Entrada: <code>({test.input})</code> → Tu salida: <code>{test.actual}</code>
                            {!test.passed && (
                              <> · Esperado: <code>{test.expected}</code></>
                            )}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="lab-console-placeholder">
                    <FileJs size={34} weight="duotone" />
                    <p>Presiona <b>«Ejecutar Pruebas»</b> para verificar tu función en los sistemas de Neo-Tokio.</p>
                  </div>
                )}
              </div>
            )}

            <div className="python-preview-actions-mobile">
              <button
                type="button"
                className="python-back-to-editor-btn"
                onClick={() => setMobileTab('editor')}
              >
                <span>💻 Volver al Editor</span>
              </button>
              <button
                type="button"
                className="python-preview-run-btn"
                onClick={runValidation}
              >
                <Play size={15} weight="fill" />
                <span>Validar</span>
              </button>
            </div>
          </div>
        </div>

        {evaluation && (
          <div className={`python-result${evaluation.passed ? ' success' : ''}`} role="status">
            {evaluation.passed ? <CheckCircle size={20} weight="fill" /> : <WarningCircle size={20} weight="regular" />}
            <p>{evaluation.message}</p>
            {evaluation.passed && selectedIndex < missions.length - 1 ? (
              <button type="button" onClick={() => selectMission(selectedIndex + 1)}>
                <span>Siguiente misión</span>
                <ArrowRight size={14} weight="regular" />
              </button>
            ) : evaluation.passed ? (
              <button type="button" onClick={onClose}>
                <span>Volver al mapa</span>
                <ArrowRight size={14} weight="regular" />
              </button>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
