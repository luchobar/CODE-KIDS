import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Coins,
  Lightbulb,
  Lightning,
  WarningCircle,
} from '@phosphor-icons/react';

/**
 * Cascarón visual compartido por los laboratorios de código (Python, HTML5 y JavaScript).
 * Centraliza barra superior, selector de misiones, pistas, pestañas móviles y banner de resultados.
 */
export default function MissionWorkspaceShell({
  backLabel,
  onClose,
  metaLabel,
  title,
  titleId,
  intro,
  stagesNav,
  topbarExpanded = false,
  briefLabel,
  xpReward,
  coinReward,
  instructions,
  hintsCount = 0,
  hintIndex = 0,
  activeHint = '',
  onToggleHint,
  mobileTab,
  onChangeMobileTab,
  editorTabContent,
  previewTabContent,
  editorPanel,
  previewPanel,
  result,
  nextActionLabel,
  onNextAction,
  finalActionLabel,
  hasNextMission,
  isEmpty = false,
  emptyTitle = 'No hay misiones disponibles en este laboratorio.',
}) {
  if (isEmpty) {
    return (
      <main id="top" className="apple-page fullscreen-exercise-page">
        <div className="fullscreen-exercise-container">
          <div className="empty-state-card">
            <p>{emptyTitle}</p>
            <button type="button" className="workspace-back-btn" onClick={onClose}>
              <ArrowLeft size={16} weight="bold" />
              <span>{backLabel}</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="top" className="apple-page fullscreen-exercise-page">
      <div className="fullscreen-exercise-container">
        <header className={`workspace-topbar${topbarExpanded ? ' python-topbar-expanded' : ''}`}>
          <div className="workspace-topbar-left">
            <button type="button" className="workspace-back-btn" onClick={onClose}>
              <ArrowLeft size={16} weight="bold" />
              <span>{backLabel}</span>
            </button>
            <div className="workspace-title-group">
              <span className="modal-meta-label">{metaLabel}</span>
              <h1 id={titleId}>{title}</h1>
              <p className="python-intro">{intro}</p>
            </div>
          </div>
          {stagesNav}
        </header>

        <div className="python-teaching-row mission-brief-card">
          <div className="mission-brief-content">
            <div className="mission-brief-badges">
              <span className="python-teaching-label">{briefLabel}</span>
              <span className="mission-reward-tag">
                <Lightning size={13} weight="fill" /> +{xpReward} XP
              </span>
              <span className="mission-reward-tag coins">
                <Coins size={13} weight="fill" /> +{coinReward} Monedas
              </span>
            </div>
            {instructions}
          </div>
          {hintsCount > 0 && (
            <button type="button" onClick={onToggleHint}>
              <Lightbulb size={15} weight="regular" />
              <span>
                {hintIndex === 0
                  ? `Ver pista (0/${hintsCount})`
                  : hintIndex < hintsCount
                    ? `Siguiente pista (${hintIndex}/${hintsCount})`
                    : 'Ocultar pistas'}
              </span>
            </button>
          )}
        </div>

        {hintIndex > 0 && activeHint && (
          <p className="python-hint" role="status">
            <b>
              Pista {hintIndex} de {hintsCount}
            </b>
            <span>{activeHint}</span>
          </p>
        )}

        <div className="python-mobile-tabs-bar" role="tablist" aria-label="Selector de vista móvil">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'editor'}
            className={`python-mobile-tab-btn${mobileTab === 'editor' ? ' active' : ''}`}
            onClick={() => onChangeMobileTab('editor')}
          >
            {editorTabContent}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'preview'}
            className={`python-mobile-tab-btn${mobileTab === 'preview' ? ' active' : ''}`}
            onClick={() => onChangeMobileTab('preview')}
          >
            {previewTabContent}
          </button>
        </div>

        <div className={`python-workspace mobile-active-${mobileTab}`}>
          {editorPanel}
          {previewPanel}
        </div>

        {result?.message && (
          <div
            className={`python-result${result.passed ? ' success' : result.isError ? ' error' : ''}`}
            role="status"
          >
            {result.passed ? (
              <CheckCircle size={20} weight="fill" />
            ) : (
              <WarningCircle size={20} weight="regular" />
            )}
            <p>{result.message}</p>
            {result.passed && hasNextMission ? (
              <button type="button" onClick={onNextAction}>
                <span>{nextActionLabel}</span>
                <ArrowRight size={14} weight="regular" />
              </button>
            ) : result.passed ? (
              <button type="button" onClick={onClose}>
                <span>{finalActionLabel}</span>
                <ArrowRight size={14} weight="regular" />
              </button>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
