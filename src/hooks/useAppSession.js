import { useCallback, useEffect, useRef, useState } from 'react';
import { evaluateAssignmentWithAi } from '../data/aiRepository.js';
import { syncAssignmentSubmissionInSupabase } from '../data/assignmentsRepository.js';
import { logoutAuthSession } from '../data/authRepository.js';
import { loadExpansionFromSupabase } from '../data/expansionRepository.js';
import {
  createDefaultUserProfile,
  getUserProfileKey,
  readAppState,
  readUserProfile,
  writeAppState,
  writeUserProfile,
} from '../data/storageStore.js';
import {
  loadStudentFromSupabase,
  syncAvatarPurchase,
  syncAvatarSelection,
  syncMissionSuccess,
} from '../data/studentRepository.js';
import { isSupabaseConfigured } from '../data/supabaseClient.js';
import { DIAGNOSTIC_QUESTIONS } from '../domain/gamificationCatalog.js';
import {
  evaluateWorkFallback,
  mergeRemoteStudentProfile,
  progressStreak,
} from '../domain/progressRules.js';
import { playSfx } from './useAudioEffects.js';

/**
 * Orquesta sesión de usuario, hidratación inicial, recompensas, tienda de avatares,
 * diagnóstico y envío de entregas con sincronización remota resiliente.
 */
export function useAppSession({ refreshClassroomData, onWorkspaceReset }) {
  const [state, setState] = useState(readAppState);
  const [isHydrating, setIsHydrating] = useState(true);
  const [remoteExpansion, setRemoteExpansion] = useState(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
    if (state.user?.role === 'student') {
      writeUserProfile(state.user, state);
    }
    writeAppState(state);
  }, [state]);

  useEffect(() => {
    let active = true;
    const tasks = [refreshClassroomData()];

    if (state.user?.role === 'student') {
      const initialUser = state.user;
      const initialKey = getUserProfileKey(initialUser);
      tasks.push(
        loadStudentFromSupabase(
          initialUser.id || initialUser.name?.toLowerCase(),
          initialUser.email,
        )
          .then((studentData) => {
            if (!active || !studentData) return;
            setState((current) => {
              if (!current.user || getUserProfileKey(current.user) !== initialKey) {
                return current;
              }
              return mergeRemoteStudentProfile(current, studentData, current.user);
            });
          })
          .catch(() => {}),
      );
    }

    if (isSupabaseConfigured) {
      tasks.push(
        loadExpansionFromSupabase()
          .then((data) => {
            if (active && data) setRemoteExpansion(data);
          })
          .catch(() => {}),
      );
    }

    Promise.allSettled(tasks).finally(() => {
      if (active) setIsHydrating(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const enter = useCallback(
    async (user) => {
      const localProfile = readUserProfile(user);
      const targetUserKey = getUserProfileKey(user);
      onWorkspaceReset();

      setState((current) => ({
        ...current,
        ...localProfile,
        avatar: user.avatar || localProfile.avatar || 'dragon',
        ownedAvatars: Array.from(
          new Set(['astronaut', ...(localProfile.ownedAvatars || []), user.avatar || 'dragon']),
        ),
        user: {
          ...user,
          group: user.role === 'student' ? user.group || '5° A' : undefined,
          enrolledGroups: user.role === 'student' ? ['5° A'] : undefined,
        },
      }));

      const latestClassroom = await refreshClassroomData();
      if (user.role === 'student' && latestClassroom) {
        const matchedStudent = (latestClassroom.students || []).find(
          (s) =>
            (user.id && String(s.id) === String(user.id)) ||
            (user.email && String(s.email).toLowerCase() === String(user.email).toLowerCase()) ||
            String(s.name).toLowerCase() === String(user.name || '').toLowerCase(),
        );
        if (matchedStudent?.enrolledCourses?.length > 0) {
          setState((current) =>
            current.user && getUserProfileKey(current.user) === targetUserKey
              ? {
                  ...current,
                  user: {
                    ...current.user,
                    group: matchedStudent.enrolledCourses[0],
                    enrolledGroups: matchedStudent.enrolledCourses,
                  },
                }
              : current,
          );
        }
      }

      if (user.role === 'student') {
        try {
          const studentData = await loadStudentFromSupabase(
            user.id || user.name?.toLowerCase(),
            user.email,
          );
          if (studentData) {
            setState((current) => {
              if (!current.user || getUserProfileKey(current.user) !== targetUserKey) {
                return current;
              }
              return mergeRemoteStudentProfile(current, studentData, user);
            });
          }
        } catch {
          // Mantiene perfil local si la red o Supabase fallan.
        }
      }
    },
    [refreshClassroomData, onWorkspaceReset],
  );

  const exit = useCallback(async () => {
    const current = stateRef.current;
    if (current.user?.role === 'student') {
      writeUserProfile(current.user, current);
    }
    await logoutAuthSession();
    onWorkspaceReset();
    setState((prev) => ({
      ...prev,
      ...createDefaultUserProfile(null),
      user: null,
    }));
  }, [onWorkspaceReset]);

  const completeMission = useCallback(
    (missionId, xpReward = 10, coinReward = 10, { trackPython = false } = {}) => {
      const currentSnapshot = stateRef.current;
      const alreadyDone =
        (currentSnapshot.completedMissions || []).includes(missionId) ||
        (trackPython && (currentSnapshot.pythonProgress || []).includes(missionId));

      setState((current) => {
        const completed = current.completedMissions || [];
        const pyProgress = current.pythonProgress || [];
        const firstCompletion =
          !completed.includes(missionId) && (!trackPython || !pyProgress.includes(missionId));

        return {
          ...current,
          completedMissions: firstCompletion ? [...completed, missionId] : completed,
          pythonProgress: trackPython
            ? Array.from(new Set([...pyProgress, missionId]))
            : pyProgress,
          points: current.points + (firstCompletion ? xpReward : 0),
          coins: (current.coins || 0) + (firstCompletion ? coinReward : 0),
          ...progressStreak(current),
        };
      });

      if (currentSnapshot.soundEnabled) playSfx('win');

      if (!alreadyDone && currentSnapshot.user) {
        syncMissionSuccess(
          currentSnapshot.user.id || currentSnapshot.user.name?.toLowerCase(),
          missionId,
          3,
          xpReward,
          coinReward,
        ).catch(() => {});
      }

      return !alreadyDone;
    },
    [],
  );

  const buyAvatar = useCallback(async (item) => {
    const snapshot = stateRef.current;
    if ((snapshot.ownedAvatars || ['astronaut']).includes(item.avatar)) {
      return { ok: false, error: 'Ya posees este avatar en tu colección.' };
    }
    if ((snapshot.coins || 0) < item.cost) {
      return { ok: false, error: 'No tienes monedas suficientes para desbloquear este avatar.' };
    }

    setState((current) => {
      if ((current.ownedAvatars || ['astronaut']).includes(item.avatar) || (current.coins || 0) < item.cost) {
        return current;
      }
      return {
        ...current,
        coins: current.coins - item.cost,
        ownedAvatars: [...(current.ownedAvatars || ['astronaut']), item.avatar],
        avatar: item.avatar,
      };
    });

    if (snapshot.user) {
      const res = await syncAvatarPurchase(
        snapshot.user.id || snapshot.user.name?.toLowerCase(),
        item.avatar,
        item.cost,
      );
      if (res && res.ok === false && res.error !== 'Servicio de tienda no disponible.') {
        setState((current) => ({
          ...current,
          coins: snapshot.coins,
          ownedAvatars: snapshot.ownedAvatars,
          avatar: snapshot.avatar,
        }));
        return { ok: false, error: res.error };
      }
    }

    return { ok: true };
  }, []);

  const selectAvatar = useCallback((avatar) => {
    setState((current) =>
      (current.ownedAvatars || ['astronaut']).includes(avatar)
        ? { ...current, avatar }
        : current,
    );
    const activeUser = stateRef.current.user;
    if (activeUser) {
      syncAvatarSelection(activeUser.id || activeUser.name?.toLowerCase(), avatar).catch(() => {});
    }
  }, []);

  const submitAssignment = useCallback(async (assignment, response, gameOutcome) => {
    const activeUser = stateRef.current.user;
    let evaluation;
    try {
      evaluation = await evaluateAssignmentWithAi({
        skill: assignment.skill,
        instruction: assignment.instructions,
        success: gameOutcome.success,
        attempts: gameOutcome.attempts,
        evidence: response,
      });
    } catch {
      evaluation = { ...evaluateWorkFallback(assignment, response, gameOutcome), source: 'fallback' };
    }

    const submission = {
      ...evaluation,
      id: `${assignment.id}-${activeUser.name}`,
      assignmentId: assignment.id,
      dbId: assignment.dbId,
      assignmentTitle: assignment.title,
      skill: assignment.skill,
      group: assignment.group,
      studentName: activeUser.name,
      response,
      gameOutcome,
      createdAt: Date.now(),
    };

    const previous = (stateRef.current.submissions || []).find(
      (item) => item.assignmentId === assignment.id && item.studentName === activeUser.name,
    );
    const newSuccess = gameOutcome.success && !previous?.gameOutcome?.success;
    const firstAttempt = !previous;

    setState((current) => ({
      ...current,
      scores: { ...current.scores, [assignment.skill]: evaluation.score },
      points: current.points + (firstAttempt ? (evaluation.score >= 80 ? 10 : 5) : 0),
      coins: (current.coins || 0) + (newSuccess ? 5 : 0),
      ...(gameOutcome.success ? progressStreak(current) : {}),
      submissions: [
        ...(current.submissions || []).filter((item) => item.id !== submission.id),
        submission,
      ],
    }));

    syncAssignmentSubmissionInSupabase(submission, activeUser).catch(() => {});
    return submission;
  }, []);

  const completeAssessment = useCallback((answers) => {
    const currentScores = stateRef.current.scores;
    const updates = { ...currentScores };
    DIAGNOSTIC_QUESTIONS.forEach((question, index) => {
      updates[question.skill] = Math.min(
        100,
        Math.max(25, (updates[question.skill] || 50) + (answers[index] === question.answer ? 12 : -8)),
      );
    });
    const correct = DIAGNOSTIC_QUESTIONS.filter(
      (question, index) => answers[index] === question.answer,
    ).length;

    setState((current) => ({
      ...current,
      scores: updates,
      lastScore: Math.round((correct / DIAGNOSTIC_QUESTIONS.length) * 100),
      points: current.points + correct * 10,
    }));
  }, []);

  const toggleSound = useCallback(
    () => setState((current) => ({ ...current, soundEnabled: !current.soundEnabled })),
    [],
  );

  const changeStudentGroup = useCallback(
    (group) => setState((current) => ({ ...current, user: { ...current.user, group } })),
    [],
  );

  return {
    state,
    setState,
    isHydrating,
    remoteExpansion,
    enter,
    exit,
    completeMission,
    buyAvatar,
    selectAvatar,
    submitAssignment,
    completeAssessment,
    toggleSound,
    changeStudentGroup,
  };
}
