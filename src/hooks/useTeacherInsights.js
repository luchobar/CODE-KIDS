import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTeacherInsights } from '../data/aiRepository.js';
import {
  buildFallbackTeacherInsights,
  buildTeacherActivitiesCatalog,
} from '../domain/progressRules.js';

/**
 * Obtiene el análisis pedagógico del aula desde Ollama con `AbortController` para evitar condiciones de carrera.
 */
export function useTeacherInsights({
  group,
  visibleStudents,
  groupSubmissions,
  groupAssignments,
  remoteExpansion,
}) {
  const [aiInsights, setAiInsights] = useState(null);
  const [aiStatus, setAiStatus] = useState('idle');
  const abortRef = useRef(null);

  const loadInsights = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAiStatus('loading');

    try {
      const payload = {
        group,
        studentRoster: visibleStudents.map((student) => ({
          score: student.score,
          weak: student.weak,
        })),
        submissions: groupSubmissions.map((row) => ({
          skill: row.skill,
          score: row.score,
          attempts: row.gameOutcome?.attempts || 1,
          success: Boolean(row.gameOutcome?.success),
        })),
        assignmentSkills: groupAssignments.map((item) => item.skill),
        missionCatalog: buildTeacherActivitiesCatalog(remoteExpansion).map((item) => ({
          id: item.id,
          templateId: item.templateId,
          skill: item.skill,
          category: item.category,
          level: item.level,
          name: item.name,
          exerciseTitle: item.exerciseTitle,
          instructions: item.instructions,
        })),
      };

      const data = await fetchTeacherInsights(payload, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setAiInsights(data);
      setAiStatus('ready');
    } catch (error) {
      if (error?.name === 'AbortError' || controller.signal.aborted) return;
      setAiInsights(buildFallbackTeacherInsights(group, visibleStudents));
      setAiStatus('ready');
    }
  }, [group, visibleStudents, groupSubmissions, groupAssignments, remoteExpansion]);

  useEffect(() => {
    loadInsights();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [group, groupSubmissions.length, visibleStudents.length]);

  return { aiInsights, aiStatus, reloadInsights: loadInsights };
}
