import { useState } from 'react';
import { ArrowDown, ArrowUp, Cpu, Minus, Play, Plus, Star } from '@phosphor-icons/react';

/**
 * Mini-ejercicios interactivos sin Blockly para actividades escolares generales o de descomposición.
 */
export default function InteractiveExercise({ skill, templateId, onComplete }) {
  const isSequence = templateId ? templateId === 'sequence-order' : skill === 'Secuencias';
  const isLoop = templateId ? templateId === 'loop-count' : skill === 'Bucles';
  const isConditional = templateId ? templateId === 'if-choice' : skill === 'Condicionales';
  const isDecomposition = !templateId && skill === 'Descomposición';

  const [order, setOrder] = useState(
    isDecomposition ? ['Probar', 'Planear', 'Construir'] : ['Avanzar', 'Inicio', 'Llegada'],
  );
  const [repetitions, setRepetitions] = useState(1);
  const [choice, setChoice] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState('');

  const correctOrder = isDecomposition
    ? ['Planear', 'Construir', 'Probar']
    : ['Inicio', 'Avanzar', 'Llegada'];

  const moveItem = (index, direction) =>
    setOrder((current) => {
      const next = [...current];
      const target = index + direction;
      if (target >= 0 && target < next.length) {
        [next[index], next[target]] = [next[target], next[index]];
      }
      return next;
    });

  const check = () => {
    const nextAttempt = attempts + 1;
    setAttempts(nextAttempt);
    let success = false;
    let evidence = '';

    if (isSequence || isDecomposition) {
      success = order.every((item, index) => item === correctOrder[index]);
      evidence = `Orden: ${order.join(' -> ')}`;
    } else if (isLoop) {
      success = repetitions === 4;
      evidence = `Bloque repetir ${repetitions} veces`;
    } else if (isConditional) {
      success = choice === 'Girar';
      evidence = choice ? `Si encuentra una pared: ${choice.toLowerCase()}` : 'Sin acción seleccionada';
    }

    setMessage(success ? '¡Sí! El reto funciona.' : 'Casi... cambia algo y prueba otra vez.');
    onComplete({ success, evidence, attempts: nextAttempt });
  };

  return (
    <div className="interactive-exercise">
      <div className="game-board">
        <span className="game-mascot">
          <Cpu size={28} weight="duotone" />
        </span>
        {isLoop ? (
          <div className="loop-track">
            {[1, 2, 3, 4].map((step) => (
              <span className={step <= repetitions ? 'track-step active' : 'track-step'} key={step}>
                <Star size={16} weight="fill" />
              </span>
            ))}
          </div>
        ) : (
          <span className="game-goal">
            <Star size={24} weight="fill" />
          </span>
        )}
      </div>

      {isSequence || isDecomposition ? (
        <>
          <p className="game-prompt">Ordena los pasos para llegar a la meta:</p>
          <div className="sequence-builder">
            {order.map((item, index) => (
              <div className="sequence-piece" key={item}>
                <span className="piece-number">{index + 1}</span>
                <b>{item}</b>
                <div className="sequence-piece-actions">
                  <button
                    type="button"
                    aria-label={`Mover ${item} arriba`}
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                  >
                    <ArrowUp size={14} weight="regular" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Mover ${item} abajo`}
                    disabled={index === order.length - 1}
                    onClick={() => moveItem(index, 1)}
                  >
                    <ArrowDown size={14} weight="regular" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : isLoop ? (
        <>
          <p className="game-prompt">El robot necesita 4 pasos. ¿Cuántas veces repetimos «avanzar»?</p>
          <div className="repeat-builder">
            <button
              type="button"
              aria-label="Restar una repetición"
              onClick={() => setRepetitions((value) => Math.max(1, value - 1))}
            >
              <Minus size={16} weight="bold" />
            </button>
            <div>
              <strong>{repetitions}</strong>
              <span>veces</span>
            </div>
            <button
              type="button"
              aria-label="Sumar una repetición"
              onClick={() => setRepetitions((value) => Math.min(6, value + 1))}
            >
              <Plus size={16} weight="bold" />
            </button>
          </div>
        </>
      ) : isConditional ? (
        <>
          <p className="game-prompt">Si el robot encuentra una pared, ¿qué bloque usa?</p>
          <div className="condition-options">
            {['Avanzar', 'Girar', 'Saltar'].map((item) => (
              <button
                type="button"
                className={choice === item ? 'configurator-option-chip selected' : 'configurator-option-chip'}
                key={item}
                onClick={() => setChoice(item)}
              >
                <span>{item}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      <button type="button" className="button-primary game-check-btn" onClick={check}>
        <Play size={15} weight="fill" />
        <span>Probar reto</span>
      </button>
      {message && (
        <p className={message.startsWith('¡Sí!') ? 'game-message success' : 'game-message'}>{message}</p>
      )}
    </div>
  );
}
