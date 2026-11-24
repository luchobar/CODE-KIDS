import { Compass, Cpu, Lightbulb, ListChecks, Sparkle } from '@phosphor-icons/react';
import MicroLearningPanel from './MicroLearningPanel.jsx';

/**
 * Panel lateral de guía con Pipo, objetivos de la misión y pistas progresivas para Blockly.
 */
export default function BlocklyBriefingPanel({
  mood,
  dialogue,
  skill,
  missionGoals,
  category,
  lesson,
  hintIndex,
  onToggleHint,
}) {
  return (
    <aside className="mission-briefing-panel tab-panel-briefing" aria-label="Instrucciones de la misión">
      <div className={`pipo-guide-card mood-${mood}`} aria-live="polite">
        <div className="pipo-avatar-orb">
          <Cpu size={28} weight="duotone" />
          <span className="pipo-status-dot" />
        </div>
        <div className="pipo-speech-bubble">
          <div className="pipo-speech-header">
            <b>
              {mood === 'party'
                ? '¡Pipo celebra tu código!'
                : mood === 'thinking'
                  ? 'Pipo analiza la ruta...'
                  : 'Guía Pipo · En línea'}
            </b>
            <span className="pipo-skill-chip">{skill}</span>
          </div>
          <p>{dialogue}</p>
        </div>
      </div>

      <div className="mission-objectives-box">
        <div className="objectives-box-header">
          <ListChecks size={18} weight="bold" />
          <span>Objetivos de la misión</span>
        </div>
        <ul className="objectives-bullet-list">
          {missionGoals.map((goalText, idx) => (
            <li key={goalText}>
              <span className="objective-bullet-index">{idx + 1}</span>
              <span>{goalText}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mission-concept-capsule">
        <span className="blockly-lesson-tag">
          <Compass size={14} weight="bold" /> Cápsula de poder: {category}
        </span>
        <p>{lesson.explanation}</p>
        <button
          type="button"
          className="blockly-hint-button"
          aria-expanded={hintIndex > 0}
          onClick={onToggleHint}
        >
          <Lightbulb size={16} weight="duotone" />
          <span>
            {hintIndex === 0
              ? 'Desbloquear pista'
              : hintIndex < lesson.hints.length
                ? `Siguiente pista (${hintIndex}/${lesson.hints.length})`
                : 'Ocultar pistas'}
          </span>
        </button>

        {hintIndex > 0 && (
          <div className="blockly-hint-card" role="status">
            <b>
              <Sparkle size={14} weight="fill" /> Pista {hintIndex} de {lesson.hints.length}
            </b>
            <span>{lesson.hints[hintIndex - 1]}</span>
          </div>
        )}
      </div>

      <MicroLearningPanel skill={category} variant="compact" />
    </aside>
  );
}
