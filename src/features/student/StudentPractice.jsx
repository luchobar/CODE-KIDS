import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, Coins, Lightning } from '@phosphor-icons/react';
import BlocklyMission from '../../BlocklyMission.jsx';
import { getBlocklyChallenge } from '../../blocklyChallenges.js';
import { fetchPipoCoachFeedback } from '../../data/aiRepository.js';
import { playSfx } from '../../hooks/useAudioEffects.js';

/**
 * Espacio de práctica guiada con Blockly y mensajes motivacionales de Pipo IA.
 */
export default function StudentPractice({ skill, onClose, onComplete, soundEnabled }) {
  const challenge = getBlocklyChallenge(skill);
  const [outcome, setOutcome] = useState(null);
  const [awarded, setAwarded] = useState(false);
  const [dialogue, setDialogue] = useState(
    '¡Hola, explorador! Vamos a ayudarme a llegar a la estrella.',
  );
  const coachAbortRef = useRef(null);
  const mood = outcome?.success ? 'party' : outcome ? 'thinking' : 'hello';

  useEffect(
    () => () => {
      if (coachAbortRef.current) coachAbortRef.current.abort();
    },
    [],
  );

  const complete = async (result) => {
    setOutcome(result);
    if (!result.success && soundEnabled) playSfx('try');
    setDialogue(
      result.success
        ? '¡Lo lograste! ¡El camino quedó perfecto!'
        : '¡Encontramos una pista! Revisemos los bloques y probemos otro camino.',
    );
    if (result.success && !awarded) {
      setAwarded(Boolean(onComplete(challenge.id)));
    }

    if (coachAbortRef.current) coachAbortRef.current.abort();
    const controller = new AbortController();
    coachAbortRef.current = controller;

    try {
      const data = await fetchPipoCoachFeedback(
        {
          skill: challenge.skill,
          challenge: challenge.exerciseTitle,
          success: result.success,
          attempts: result.attempts,
        },
        { signal: controller.signal },
      );
      if (!controller.signal.aborted && data?.message) {
        setDialogue(data.message);
      }
    } catch {
      // Pipo conserva su respuesta local cuando Ollama no está conectado.
    }
  };

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
                ⚡ Misión {challenge.level} · Recompensa: +10 XP y +10 monedas
              </span>
              <h1 id="practice-title">{challenge.exerciseTitle}</h1>
              <p>{challenge.instructions}</p>
            </div>
          </div>

          <div className="workspace-reward-badges">
            <span className="reward-pill xp">
              <Lightning size={15} weight="fill" /> +10 XP
            </span>
            <span className="reward-pill coins">
              <Coins size={15} weight="fill" /> +10 Monedas
            </span>
          </div>
        </header>

        <BlocklyMission
          key={challenge.id}
          missionId={challenge.id}
          templateId={challenge.templateId}
          onComplete={complete}
          dialogue={dialogue}
          mood={mood}
          soundEnabled={soundEnabled}
        />

        {outcome?.success && (
          <div className="story-win" role="status">
            <CheckCircle size={20} weight="fill" />
            <div className="story-win-copy">
              <b>¡Misión completada!</b>
              <span>
                {awarded
                  ? 'Ganaste 10 XP y 10 monedas. ¡Tu aventura sigue!'
                  : '¡La resolviste otra vez! Tu racha sigue viva.'}
              </span>
            </div>
            <button type="button" className="button-primary" onClick={onClose}>
              <span>Volver al mapa</span>
              <ArrowRight size={14} weight="regular" />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
