import { useEffect, useState } from 'react';
import { fetchStudentAdaptiveRoute } from '../data/aiRepository.js';
import { buildFallbackAdaptiveRoute } from '../domain/progressRules.js';

/**
 * Obtiene la ruta adaptativa de aprendizaje desde Ollama con respaldo determinista y cancelación segura.
 */
export function useAdaptiveRoute({ userName, scores, completed, submissions, blocklyWorlds }) {
  const [aiRoute, setAiRoute] = useState(null);
  const [routeStatus, setRouteStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    setRouteStatus('loading');

    const payload = {
      scores,
      progress: completed || [],
      recentResults: (submissions || [])
        .filter((row) => row.studentName === userName)
        .slice(0, 8)
        .map(({ skill, score, gameOutcome }) => ({
          skill,
          score,
          success: Boolean(gameOutcome?.success),
          attempts: gameOutcome?.attempts || 1,
        })),
      missionCatalog: blocklyWorlds.flatMap((world) =>
        world.ids.map((id, index) => ({ id, skill: world.skill, level: index + 1 })),
      ),
    };

    fetchStudentAdaptiveRoute(payload, { signal: controller.signal })
      .then((data) => {
        setAiRoute(data);
        setRouteStatus('ready');
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setAiRoute(
          buildFallbackAdaptiveRoute({
            userName,
            scores,
            completed,
            blocklyWorlds,
          }),
        );
        setRouteStatus('ready');
      });

    return () => controller.abort();
  }, [scores, completed, submissions, userName]);

  return { aiRoute, routeStatus };
}
