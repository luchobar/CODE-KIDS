import { useCallback, useState } from 'react';
import {
  createClassroomAssignmentInSupabase,
  deleteClassroomAssignmentInSupabase,
  gradeSubmissionInSupabase,
  updateClassroomAssignmentInSupabase,
} from '../data/assignmentsRepository.js';
import {
  createCourseInSupabase,
  loadTeacherClassroomData,
  setStudentCourseEnrollment,
} from '../data/classroomRepository.js';
import { DEFAULT_COURSES } from '../data/seedData.js';
import { SAMPLE_STUDENTS } from '../domain/gamificationCatalog.js';

/**
 * Administra cursos, matrículas, retos y entregas de aula sincronizados con la capa de datos.
 */
export function useClassroomState({ setState, getTeacherId }) {
  const [classroomData, setClassroomData] = useState({
    courses: DEFAULT_COURSES,
    students: SAMPLE_STUDENTS,
    enrollmentsByGroup: { '5° A': [1, 2, 3], '6° B': [] },
  });
  const [classroomError, setClassroomError] = useState('');

  const applyClassroomSnapshot = useCallback((updated) => {
    if (!updated) return;
    setClassroomData({
      courses: updated.courses || [],
      students: updated.students || [],
      enrollmentsByGroup: updated.enrollmentsByGroup || {},
    });
  }, []);

  const refreshClassroomData = useCallback(async () => {
    try {
      const data = await loadTeacherClassroomData();
      if (!data) return null;
      applyClassroomSnapshot(data);
      setState((current) => {
        const mergedAssignmentsMap = new Map();
        [...(data.assignments || []), ...(current.assignments || [])].forEach((a) => {
          const key = `${a.group}::${a.missionId}::${a.title}`;
          if (!mergedAssignmentsMap.has(key)) mergedAssignmentsMap.set(key, a);
        });
        const mergedSubmissionsMap = new Map();
        [...(data.submissions || []), ...(current.submissions || [])].forEach((s) => {
          if (!mergedSubmissionsMap.has(s.id)) mergedSubmissionsMap.set(s.id, s);
        });
        return {
          ...current,
          assignments: Array.from(mergedAssignmentsMap.values()),
          submissions: Array.from(mergedSubmissionsMap.values()),
        };
      });
      setClassroomError('');
      return data;
    } catch {
      setClassroomError('No se pudo actualizar la información de aula.');
      return null;
    }
  }, [applyClassroomSnapshot, setState]);

  const handleCreateCourse = useCallback(
    async ({ codigoGrupo, nombre, studentIds = [] }) => {
      const updated = await createCourseInSupabase({
        codigoGrupo,
        nombre,
        docenteId: getTeacherId(),
        studentIds,
      });
      applyClassroomSnapshot(updated);
    },
    [applyClassroomSnapshot, getTeacherId],
  );

  const handleToggleEnrollment = useCallback(
    async ({ codigoGrupo, studentId, enroll }) => {
      const updated = await setStudentCourseEnrollment({
        codigoGrupo,
        studentId,
        enroll,
        docenteId: getTeacherId(),
      });
      applyClassroomSnapshot(updated);
    },
    [applyClassroomSnapshot, getTeacherId],
  );

  const handleBulkEnrollAll = useCallback(
    async (codigoGrupo, allStudentIds = []) => {
      const updated = await createCourseInSupabase({
        codigoGrupo,
        nombre:
          classroomData.courses.find((c) => c.codigoGrupo === codigoGrupo)?.nombre ||
          `Curso ${codigoGrupo}`,
        docenteId: getTeacherId(),
        studentIds: allStudentIds,
      });
      applyClassroomSnapshot(updated);
    },
    [applyClassroomSnapshot, classroomData.courses, getTeacherId],
  );

  const createAssignment = useCallback(
    async (assignment) => {
      const saved = await createClassroomAssignmentInSupabase({
        ...assignment,
        docenteId: getTeacherId(),
      });
      setState((current) => ({
        ...current,
        assignments: [
          saved,
          ...(current.assignments || []).filter(
            (a) =>
              !(a.group === saved.group && a.title === saved.title && a.missionId === saved.missionId),
          ),
        ],
      }));
    },
    [getTeacherId, setState],
  );

  const handleUpdateAssignment = useCallback(
    async (assignmentId, updates) => {
      const nextAssignments = await updateClassroomAssignmentInSupabase(assignmentId, updates);
      setState((current) => ({ ...current, assignments: nextAssignments }));
    },
    [setState],
  );

  const handleDeleteAssignment = useCallback(
    async (assignmentId) => {
      const nextAssignments = await deleteClassroomAssignmentInSupabase(assignmentId);
      setState((current) => ({
        ...current,
        assignments: nextAssignments,
        submissions: (current.submissions || []).filter(
          (s) => String(s.assignmentId) !== String(assignmentId),
        ),
      }));
    },
    [setState],
  );

  const handleGradeSubmission = useCallback(
    async (submissionId, payload) => {
      const nextSubmissions = await gradeSubmissionInSupabase(submissionId, payload);
      setState((current) => ({ ...current, submissions: nextSubmissions }));
    },
    [setState],
  );

  return {
    classroomData,
    classroomError,
    refreshClassroomData,
    handleCreateCourse,
    handleToggleEnrollment,
    handleBulkEnrollAll,
    createAssignment,
    handleUpdateAssignment,
    handleDeleteAssignment,
    handleGradeSubmission,
  };
}
