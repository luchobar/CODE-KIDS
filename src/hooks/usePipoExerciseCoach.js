import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPipoCoachFeedback } from '../data/aiRepository.js';

function buildContextualLocalCoach({
  skill = 'Lógica',
  language = 'Bloques',
  challenge = 'la misión',
  success = false,
  attempts = 1,
  codeOrBlocks = '',
  errorHint = '',
}) {
  const snippet = String(codeOrBlocks || '').trim();
  const linesCount = snippet ? snippet.split(/\r?\n/).filter((l) => l.trim()).length : 0;
  const usesLoop = /for\s+|while\s+|repetir|ck_repeat/i.test(snippet);
  const usesCond = /if\s+|si hay|ck_if/i.test(snippet);
  const usesReturn = /\breturn\b/.test(snippet);
  const usesSemanticHtml = /<(header|main|section|article|ul|h1|h2)\b/i.test(snippet);

  if (success) {
    const attemptPhrase =
      attempts === 1
        ? '¡Lo resolviste al primer intento!'
        : `¡Persististe durante ${attempts} intentos hasta lograrlo!`;
    const techniqueNote = usesLoop
      ? 'Aprovechaste estructuras repetitivas para mantener una solución compacta.'
      : usesCond
        ? 'Evaluaste condiciones con precisión para tomar el camino seguro.'
        : usesReturn
          ? 'Tu función retorna el valor exacto validado por los casos de prueba.'
          : usesSemanticHtml
            ? 'Estructuraste etiquetas semánticas limpias en el visor.'
            : `Completaste «${challenge}» con ${Math.max(1, linesCount)} paso(s) bien ordenados.`;

    return {
      assistant: 'PIPO',
      source: 'local',
      strength: usesLoop
        ? 'Dominio de ciclos'
        : usesCond
          ? 'Lógica condicional'
          : attempts === 1
            ? 'Precisión al 1.er intento'
            : `Superado en ${language}`,
      message: `${attemptPhrase} ${techniqueNote}`,
      tip:
        linesCount > 6 && !usesLoop
          ? 'Reto extra de PIPO: mira si puedes agrupar pasos repetidos con un bucle para usar aún menos líneas.'
          : `¡Sigue así! Ya tienes la base de ${skill.toLowerCase()} lista para la siguiente etapa.`,
    };
  }

  return {
    assistant: 'PIPO',
    source: 'local',
    strength: `Analizando intento #${attempts}`,
    message: errorHint
      ? `Casi lo tenemos en «${challenge}»: noté este detalle → ${errorHint}`
      : `Buen intento #${attempts} en «${challenge}». Revisemos el orden de tu código en ${language}.`,
    tip:
      language === 'Python' && !usesReturn && /def\s+/.test(snippet)
        ? 'Pista de PIPO: asegúrate de terminar tu función con «return» devolviendo el cálculo pedido.'
        : language === 'Python'
          ? 'Pista de PIPO: verifica los dos puntos (:) y los 4 espacios de sangría debajo de for o if.'
          : usesCond
            ? 'Pista de PIPO: comprueba hacia qué dirección gira el robot cuando el sensor detecta el obstáculo.'
            : 'Pista de PIPO: ejecuta paso a paso y observa en qué coordenada exacta cambia la ruta.',
  };
}

/**
 * Solicita a PIPO retroalimentación personalizada cada vez que el estudiante ejecuta o completa un ejercicio.
 */
export function usePipoExerciseCoach() {
  const [coachFeedback, setCoachFeedback] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const abortRef = useRef(null);

  useEffect(
    () => () => {
      if (abortRef.current) abortRef.current.abort();
    },
    [],
  );

  const resetCoachFeedback = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setCoachFeedback(null);
    setCoachLoading(false);
  }, []);

  const requestCoachFeedback = useCallback(async (context) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setCoachLoading(true);

    try {
      const response = await fetchPipoCoachFeedback(context, { signal: controller.signal });
      if (controller.signal.aborted) return null;
      const enriched = {
        assistant: 'PIPO',
        source: response?.source || 'pipo',
        message: response?.message || '',
        tip: response?.tip || '',
        strength: response?.strength || (context.success ? '¡Misión superada!' : 'Pista de PIPO'),
      };
      setCoachFeedback(enriched);
      return enriched;
    } catch {
      if (controller.signal.aborted) return null;
      const fallback = buildContextualLocalCoach(context);
      setCoachFeedback(fallback);
      return fallback;
    } finally {
      if (!controller.signal.aborted) {
        setCoachLoading(false);
      }
    }
  }, []);

  return {
    coachFeedback,
    coachLoading,
    requestCoachFeedback,
    resetCoachFeedback,
  };
}
