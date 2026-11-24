import { useEffect, useMemo, useState } from 'react';
import {
  ArrowCounterClockwise,
  Broadcast,
  Check,
  Code,
  FileHtml,
  FileJs,
  Lock,
  Play,
  TerminalWindow,
} from '@phosphor-icons/react';
import { FormattedInstructions } from './components/ui/FormattedInstructions.jsx';
import MissionWorkspaceShell from './components/ui/MissionWorkspaceShell.jsx';
import {
  buildHologramSrcDoc,
  HTML_SNIPPETS,
  JS_SNIPPETS,
} from './engines/hologramPreview.js';
import {
  evaluateHtmlDomMission,
  evaluateJavaScriptMission,
  getExpansionMissionsByWorld,
  getExpansionWorld,
} from './expansionCatalog.js';
import { isCompactViewport, useCodeSnippetEditor } from './hooks/useCodeSnippetEditor.js';
import './PythonMission.css';

export { FormattedInstructions };

function readActiveTheme() {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

/**
 * Laboratorio interactivo de mundos de código real (HTML5 Ciudadela y Neo-Tokio JavaScript).
 */
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

  const missions = useMemo(
    () => getExpansionMissionsByWorld(worldSlug, customMissions),
    [worldSlug, customMissions],
  );
  const isHtml = worldSlug === 'ciudadela-html' || worldMeta.tecnologia === 'HTML5';

  const resolveMissionIndex = () => {
    if (initialMissionSlug) {
      const idx = missions.findIndex((m) => m.slug === initialMissionSlug);
      if (idx >= 0) return idx;
    }
    const firstPending = missions.findIndex((m) => !completed.includes(m.slug));
    return firstPending < 0 ? 0 : firstPending;
  };

  const [selectedIndex, setSelectedIndex] = useState(resolveMissionIndex);
  const mission = missions[selectedIndex] || missions[0] || null;
  const [code, setCode] = useState(mission?.codigo_inicial || '');
  const [evaluation, setEvaluation] = useState(null);
  const [hintIndex, setHintIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [mobileTab, setMobileTab] = useState('editor');
  const [activeTheme, setActiveTheme] = useState(readActiveTheme);

  useEffect(() => {
    setSelectedIndex(resolveMissionIndex());
  }, [worldSlug, initialMissionSlug, missions]);

  useEffect(() => {
    if (!mission) return;
    setCode(mission.codigo_inicial || '');
    setEvaluation(null);
    setHintIndex(0);
    setAttempts(0);
  }, [mission?.slug, worldSlug]);

  useEffect(() => {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return undefined;
    const observer = new MutationObserver(() => setActiveTheme(readActiveTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const { textareaRef, insertSnippet, handleTabKeyDown } = useCodeSnippetEditor(code, setCode, {
    tabString: '  ',
    onInsert: () => setEvaluation(null),
  });

  const hintsList = Array.isArray(mission?.pistas)
    ? mission.pistas.map((h) => (typeof h === 'string' ? h : h.texto))
    : [];

  const canUnlock = (index) => index === 0 || completed.includes(missions[index - 1]?.slug);

  const selectMission = (index) => {
    if (!canUnlock(index)) return;
    setSelectedIndex(index);
  };

  const runValidation = () => {
    if (!mission) return;
    if (isCompactViewport()) setMobileTab('preview');
    const nextAttempt = attempts + 1;
    setAttempts(nextAttempt);

    const outcome = isHtml
      ? evaluateHtmlDomMission(code, mission.reglas_validacion)
      : evaluateJavaScriptMission(code, mission.reglas_validacion);

    setEvaluation(outcome);
    if (outcome.passed && onComplete) {
      onComplete(
        mission.slug,
        mission.xp_recompensa,
        mission.monedas_recompensa,
        code,
        nextAttempt,
      );
    }
  };

  const snippets = isHtml ? HTML_SNIPPETS : JS_SNIPPETS;

  return (
    <MissionWorkspaceShell
      isEmpty={!mission}
      emptyTitle={`No encontramos misiones activas en ${worldMeta.titulo}.`}
      backLabel="Volver al mapa"
      onClose={onClose}
      metaLabel={`${worldMeta.tecnologia} · +${mission?.xp_recompensa ?? 0} XP y +${mission?.monedas_recompensa ?? 0} monedas`}
      title={worldMeta.titulo}
      intro={mission?.contexto_narrativo || worldMeta.descripcion}
      stagesNav={
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
                  <small>
                    Misión {item.orden} · +{item.xp_recompensa} XP
                  </small>
                  <b>{item.titulo}</b>
                </span>
              </button>
            );
          })}
        </nav>
      }
      briefLabel="Consigna de Misión"
      xpReward={mission?.xp_recompensa ?? 0}
      coinReward={mission?.monedas_recompensa ?? 0}
      instructions={<FormattedInstructions markdown={mission?.instrucciones_md || ''} />}
      hintsCount={hintsList.length}
      hintIndex={hintIndex}
      activeHint={hintsList[hintIndex - 1] || ''}
      onToggleHint={() => setHintIndex((idx) => (idx >= hintsList.length ? 0 : idx + 1))}
      mobileTab={mobileTab}
      onChangeMobileTab={setMobileTab}
      editorTabContent={
        <>
          <Code size={16} weight="bold" />
          <span>Editor {isHtml ? 'HTML' : 'JS'}</span>
        </>
      }
      previewTabContent={
        <>
          <Broadcast size={16} weight="bold" />
          <span>{isHtml ? 'Holograma en Vivo' : 'Consola Neo-Tokio'}</span>
        </>
      }
      editorPanel={
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
            onKeyDown={handleTabKeyDown}
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
      }
      previewPanel={
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
                srcDoc={buildHologramSrcDoc(code, activeTheme)}
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
                            <>
                              {' '}
                              · Esperado: <code>{test.expected}</code>
                            </>
                          )}
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="lab-console-placeholder">
                  <FileJs size={34} weight="duotone" />
                  <p>
                    Presiona <b>«Ejecutar Pruebas»</b> para verificar tu función en los sistemas de Neo-Tokio.
                  </p>
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
            <button type="button" className="python-preview-run-btn" onClick={runValidation}>
              <Play size={15} weight="fill" />
              <span>Validar</span>
            </button>
          </div>
        </div>
      }
      result={
        evaluation
          ? {
              passed: evaluation.passed,
              message: evaluation.message,
              isError: !evaluation.passed && String(evaluation.message || '').includes('Error'),
            }
          : null
      }
      hasNextMission={selectedIndex < missions.length - 1}
      nextActionLabel="Siguiente misión"
      onNextAction={() => selectMission(selectedIndex + 1)}
      finalActionLabel="Volver al mapa"
    />
  );
}
