import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTeacherInsights } from '../data/aiRepository.js';
import {
  buildFallbackTeacherInsights,
  buildTeacherActivitiesCatalog,
} from '../domain/progressRules.js';

/**
 * Obtiene la asesoría pedagógica especializada de PIPO enviando nómina detallada,
 * evidencias reales de entregas, retos ya publicados y enfoque específico del docente.
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
  const [teacherFocus, setTeacherFocus] = useState('');
  const abortRef = useRef(null);

  const loadInsights = useCallback(
    async (overrideFocus) => {
      const activeFocus =
        typeof overrideFocus === 'string' ? overrideFocus.trim() : teacherFocus.trim();

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setAiStatus('loading');

      try {
        const payload = {
          group,
          teacherFocus: activeFocus,
          studentRoster: visibleStudents.map((student) => ({
            name: student.name,
            score: student.score,
            weak: student.weak,
            points: student.points || 0,
            completedCount: student.completedCount || 0,
          })),
          submissions: groupSubmissions.map((row) => ({
            studentName: row.studentName,
            assignmentTitle: row.assignmentTitle,
            skill: row.skill,
            score: row.score,
            attempts: row.gameOutcome?.attempts || 1,
            success: Boolean(row.gameOutcome?.success),
            evidence: row.response || row.gameOutcome?.evidence || '',
          })),
          assignmentSkills: groupAssignments.map((item) => item.skill),
          assignedMissionIds: groupAssignments.map((item) => item.missionId).filter(Boolean),
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
        setAiInsights(
          buildFallbackTeacherInsights(
            group,
            visibleStudents,
            groupSubmissions,
            groupAssignments,
            remoteExpansion,
            activeFocus,
          ),
        );
        setAiStatus('ready');
      }
    },
    [group, visibleStudents, groupSubmissions, groupAssignments, remoteExpansion, teacherFocus],
  );

  useEffect(() => {
    loadInsights('');
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [group, groupSubmissions.length, visibleStudents.length]);

  return {
    aiInsights,
    aiStatus,
    teacherFocus,
    setTeacherFocus,
    reloadInsights: loadInsights,
  };
}
