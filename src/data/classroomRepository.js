import {
  computeStudentStats,
  ensureAulaIdForGroup,
  inferTemplateIdFromMission,
  resolveAulaIdByGroup,
} from './classroomStats.js';
import { callTier2Api } from './httpClient.js';
import {
  DEFAULT_COURSES,
  DEFAULT_DB_STUDENTS,
  DEFAULT_DIAGNOSTIC_SCORES,
  parsePositiveIntId,
} from './seedData.js';
import {
  getLocalRegisteredAccounts,
  readClassroomCache,
  writeClassroomCache,
} from './storageStore.js';
import { supabase } from './supabaseClient.js';

function getLocalRegisteredStudents() {
  const rawAccounts = getLocalRegisteredAccounts();
  const list = Array.isArray(rawAccounts) ? rawAccounts : Object.values(rawAccounts || {});
  return list
    .filter((acc) => acc && acc.role === 'student')
    .map((acc, idx) => ({
      id: typeof acc.id === 'number' ? acc.id : 1000 + idx,
      name: acc.name,
      email: acc.email,
      avatar: acc.avatar || 'astronaut',
      points: 120,
      coins: 40,
      level: 1,
      streak: 1,
      completedCount: 0,
      scores: { ...DEFAULT_DIAGNOSTIC_SCORES, Bucles: 55, Descomposición: 65 },
    }));
}

function mergeRemoteStudents(usuariosRows, perfilesRows, progresoRows, fallbackStudents) {
  if (!Array.isArray(usuariosRows) || usuariosRows.length === 0) return fallbackStudents;

  const perfilMap = new Map((perfilesRows || []).map((p) => [Number(p.usuario_id), p]));
  const completedCountMap = new Map();
  (progresoRows || []).forEach((row) => {
    if (row.estado === 'completada') {
      const uid = Number(row.usuario_id);
      completedCountMap.set(uid, (completedCountMap.get(uid) || 0) + 1);
    }
  });

  return usuariosRows.map((u) => {
    const uid = Number(u.id);
    const perfil = perfilMap.get(uid);
    return {
      id: uid,
      name: u.nombre,
      email: u.correo,
      avatar: perfil?.avatar_activo_id || 'astronaut',
      points: perfil?.puntos_xp ?? 100,
      coins: perfil?.saldo_monedas ?? 30,
      level: perfil?.nivel_actual ?? 1,
      streak: perfil?.dias_racha ?? 1,
      completedCount: completedCountMap.get(uid) || 0,
      scores: perfil?.puntajes_diagnostico || {
        Secuencias: 75,
        Bucles: 50,
        Condicionales: 80,
        Descomposición: 60,
      },
    };
  });
}

function mapRemoteAssignmentsAndSubmissions(
  retosRows,
  entregasRows,
  aulaIdToGroup,
  dbStudents,
  cachedAssignments,
  cachedSubmissions,
) {
  let dbAssignments = [...cachedAssignments];
  let dbSubmissions = [...cachedSubmissions];
  const retoIdToMeta = new Map();

  if (Array.isArray(retosRows) && retosRows.length > 0) {
    const remoteAssignments = retosRows.map((r) => {
      const groupCode = aulaIdToGroup.get(Number(r.aula_id)) || '5° A';
      const canonicalMissionId = r.misiones?.slug || r.mision_id || 'sequence-forest';
      const skill = r.tematica_habilidad || 'Secuencias';
      const item = {
        id: `db-${r.id}`,
        dbId: Number(r.id),
        group: groupCode,
        title: r.titulo,
        instructions: r.instrucciones,
        skill,
        missionId: canonicalMissionId,
        templateId: inferTemplateIdFromMission(canonicalMissionId, skill, r.misiones?.plantilla_id),
        createdAt: r.creado_en ? new Date(r.creado_en).getTime() : Date.now(),
      };
      retoIdToMeta.set(Number(r.id), item);
      return item;
    });

    const byKey = new Map();
    [...remoteAssignments, ...dbAssignments].forEach((a) => {
      const key = `${a.group}::${a.missionId}::${a.title}`;
      if (!byKey.has(key)) byKey.set(key, a);
    });
    dbAssignments = Array.from(byKey.values());
  }

  if (Array.isArray(entregasRows) && entregasRows.length > 0) {
    const studentIdToName = new Map(dbStudents.map((s) => [Number(s.id), s.name]));
    const remoteSubmissions = entregasRows
      .map((e) => {
        const assignmentMeta = retoIdToMeta.get(Number(e.reto_id));
        if (!assignmentMeta) return null;
        const studentName =
          studentIdToName.get(Number(e.estudiante_id)) || `Estudiante #${e.estudiante_id}`;
        return {
          id: `${assignmentMeta.id}-${studentName}`,
          assignmentId: assignmentMeta.id,
          assignmentTitle: assignmentMeta.title,
          skill: assignmentMeta.skill,
          group: assignmentMeta.group,
          studentId: Number(e.estudiante_id),
          studentName,
          score: Number(e.puntaje || 0),
          response: e.texto_evidencia || 'Reto completado',
          feedback: e.retroalimentacion_ia || 'Actividad evaluada.',
          recommendation: e.recomendacion_docente || 'Continúa practicando.',
          source: e.fuente_evaluacion || 'supabase',
          gameOutcome: {
            success: Boolean(e.logrado),
            attempts: Number(e.cantidad_intentos || 1),
            evidence: e.texto_evidencia || '',
          },
          createdAt: e.entregado_en ? new Date(e.entregado_en).getTime() : Date.now(),
        };
      })
      .filter(Boolean);

    const subMap = new Map();
    [...remoteSubmissions, ...dbSubmissions].forEach((s) => {
      if (!subMap.has(s.id)) subMap.set(s.id, s);
    });
    dbSubmissions = Array.from(subMap.values());
  }

  return { dbAssignments, dbSubmissions };
}

/**
 * Carga cursos, estudiantes registrados, matrículas, retos y entregas consolidando Supabase y caché local.
 */
export async function loadTeacherClassroomData() {
  const cache = readClassroomCache();
  let dbStudents = [...DEFAULT_DB_STUDENTS];
  let dbCourses = [...cache.courses];
  const enrollmentsByGroup = { ...cache.enrollmentsByGroup };
  let dbAssignments = [...cache.assignments];
  let dbSubmissions = [...cache.submissions];

  if (supabase) {
    try {
      const [
        { data: usuariosRows },
        { data: perfilesRows },
        { data: progresoRows },
        { data: aulasRows },
        { data: matriculasRows },
        { data: retosRows },
        { data: entregasRows },
      ] = await Promise.all([
        supabase
          .from('usuarios')
          .select('id, nombre, correo, rol, activo')
          .eq('rol', 'estudiante')
          .order('id', { ascending: true }),
        supabase
          .from('perfiles_gamificacion')
          .select('usuario_id, puntos_xp, nivel_actual, saldo_monedas, dias_racha, avatar_activo_id, puntajes_diagnostico'),
        supabase.from('progreso_misiones_usuario').select('usuario_id, mision_id, estado'),
        supabase
          .from('aulas')
          .select('id, codigo_grupo, nombre, docente_id, anio_escolar')
          .order('id', { ascending: true }),
        supabase.from('matriculas_aula').select('aula_id, estudiante_id'),
        supabase
          .from('retos_aula')
          .select('id, aula_id, mision_id, titulo, instrucciones, tematica_habilidad, creado_en, misiones(id, slug, plantilla_id)')
          .order('creado_en', { ascending: false }),
        supabase
          .from('entregas_retos')
          .select('id, reto_id, estudiante_id, puntaje, cantidad_intentos, logrado, texto_evidencia, retroalimentacion_ia, recomendacion_docente, fuente_evaluacion, entregado_en')
          .order('entregado_en', { ascending: false }),
      ]);

      dbStudents = mergeRemoteStudents(usuariosRows, perfilesRows, progresoRows, dbStudents);

      const aulaIdToGroup = new Map();
      if (Array.isArray(aulasRows) && aulasRows.length > 0) {
        const remoteCourses = aulasRows.map((a) => {
          aulaIdToGroup.set(Number(a.id), a.codigo_grupo);
          return {
            id: Number(a.id),
            codigoGrupo: a.codigo_grupo,
            nombre: a.nombre,
            anioEscolar: a.anio_escolar || 2026,
          };
        });
        const mergedCourseMap = new Map();
        [...DEFAULT_COURSES, ...dbCourses, ...remoteCourses].forEach((c) => {
          if (c?.codigoGrupo) mergedCourseMap.set(c.codigoGrupo, c);
        });
        dbCourses = Array.from(mergedCourseMap.values());
      }

      if (Array.isArray(matriculasRows) && aulaIdToGroup.size > 0) {
        const remoteEnrollments = {};
        dbCourses.forEach((c) => {
          remoteEnrollments[c.codigoGrupo] = [];
        });
        matriculasRows.forEach((m) => {
          const groupCode = aulaIdToGroup.get(Number(m.aula_id));
          if (groupCode) {
            remoteEnrollments[groupCode] = Array.from(
              new Set([...(remoteEnrollments[groupCode] || []), Number(m.estudiante_id)]),
            );
          }
        });
        Object.entries(remoteEnrollments).forEach(([groupCode, ids]) => {
          const cachedIds = enrollmentsByGroup[groupCode] || [];
          enrollmentsByGroup[groupCode] = Array.from(new Set([...ids, ...cachedIds]));
        });
      }

      const mapped = mapRemoteAssignmentsAndSubmissions(
        retosRows,
        entregasRows,
        aulaIdToGroup,
        dbStudents,
        dbAssignments,
        dbSubmissions,
      );
      dbAssignments = mapped.dbAssignments;
      dbSubmissions = mapped.dbSubmissions;
    } catch {
      // Mantiene datos locales resilientes si falla la consulta remota.
    }
  }

  const seenEmails = new Set(dbStudents.map((s) => String(s.email || '').toLowerCase()));
  getLocalRegisteredStudents().forEach((loc) => {
    const emailKey = String(loc.email || '').toLowerCase();
    if (emailKey && !seenEmails.has(emailKey)) {
      seenEmails.add(emailKey);
      dbStudents.push(loc);
    }
  });

  dbCourses.forEach((course) => {
    if (!Array.isArray(enrollmentsByGroup[course.codigoGrupo])) {
      enrollmentsByGroup[course.codigoGrupo] = [];
    }
  });

  const enrichedStudents = dbStudents.map((student) => {
    const enrolledCourses = Object.entries(enrollmentsByGroup)
      .filter(([, ids]) => Array.isArray(ids) && ids.some((id) => String(id) === String(student.id)))
      .map(([groupCode]) => groupCode);

    return computeStudentStats({
      ...student,
      enrolledCourses,
      group: enrolledCourses[0] || 'Sin curso',
    });
  });

  writeClassroomCache({
    courses: dbCourses,
    enrollmentsByGroup,
    assignments: dbAssignments,
    submissions: dbSubmissions,
  });

  return {
    courses: dbCourses,
    students: enrichedStudents,
    enrollmentsByGroup,
    assignments: dbAssignments,
    submissions: dbSubmissions,
  };
}

/**
 * Crea un curso nuevo e inscribe estudiantes iniciales en Supabase y caché local.
 */
export async function createCourseInSupabase({ codigoGrupo, nombre, docenteId, studentIds = [] }) {
  const cleanCode = String(codigoGrupo || '').trim();
  const cleanName = String(nombre || '').trim() || `Curso ${cleanCode}`;
  if (!cleanCode) {
    throw new Error('Ingresa el código o identificador del curso (ej. 7° A).');
  }

  const cache = readClassroomCache();
  const existingIdx = cache.courses.findIndex(
    (c) => c.codigoGrupo.toLowerCase() === cleanCode.toLowerCase(),
  );
  const nextCourses =
    existingIdx >= 0
      ? cache.courses.map((c, idx) => (idx === existingIdx ? { ...c, nombre: cleanName } : c))
      : [
          ...cache.courses,
          { id: Date.now(), codigoGrupo: cleanCode, nombre: cleanName, anioEscolar: 2026 },
        ];

  const currentEnrolled = cache.enrollmentsByGroup[cleanCode] || [];
  const nextEnrollments = {
    ...cache.enrollmentsByGroup,
    [cleanCode]: Array.from(
      new Set([...currentEnrolled, ...studentIds.map((id) => Number(id) || id)]),
    ),
  };

  writeClassroomCache({ courses: nextCourses, enrollmentsByGroup: nextEnrollments });

  if (supabase) {
    try {
      const aulaId = await ensureAulaIdForGroup(cleanCode, cleanName, docenteId);
      if (aulaId && studentIds.length > 0) {
        const numericIds = studentIds
          .map((id) => parsePositiveIntId(id))
          .filter((id) => id !== null);
        if (numericIds.length > 0) {
          await supabase
            .from('matriculas_aula')
            .upsert(
              numericIds.map((estudiante_id) => ({ aula_id: aulaId, estudiante_id })),
              { onConflict: 'aula_id,estudiante_id' },
            );
        }
      }
    } catch {
      // Curso preservado en caché local.
    }
  }

  return loadTeacherClassroomData();
}

/**
 * Matricula o retira un estudiante de un curso evitando doble escritura si Tier 2 confirma.
 */
export async function setStudentCourseEnrollment({
  codigoGrupo,
  studentId,
  enroll = true,
  docenteId,
}) {
  const cleanCode = String(codigoGrupo || '').trim();
  const validStudentId = parsePositiveIntId(studentId);
  if (!cleanCode || studentId === undefined || studentId === null) {
    return loadTeacherClassroomData();
  }

  const cache = readClassroomCache();
  const currentList = cache.enrollmentsByGroup[cleanCode] || [];
  const nextList = enroll
    ? Array.from(new Set([...currentList, studentId]))
    : currentList.filter((id) => String(id) !== String(studentId));

  writeClassroomCache({
    enrollmentsByGroup: { ...cache.enrollmentsByGroup, [cleanCode]: nextList },
  });

  if (validStudentId !== null) {
    const resolvedAulaId = resolveAulaIdByGroup(cleanCode, cache.courses) || 1;
    const apiRes = enroll
      ? await callTier2Api(`/classrooms/${resolvedAulaId}/enrollments`, {
          method: 'POST',
          body: { codigoGrupo: cleanCode, estudianteId: validStudentId },
        })
      : await callTier2Api(
          `/classrooms/${resolvedAulaId}/enrollments/${validStudentId}?group=${encodeURIComponent(cleanCode)}`,
          { method: 'DELETE' },
        );

    const tier2Confirmed = Boolean(apiRes?.httpOk && apiRes?.data?.ok);
    if (!tier2Confirmed && supabase) {
      try {
        const aulaId = await ensureAulaIdForGroup(cleanCode, `Curso ${cleanCode}`, docenteId);
        if (aulaId) {
          if (enroll) {
            await supabase
              .from('matriculas_aula')
              .upsert(
                { aula_id: aulaId, estudiante_id: validStudentId },
                { onConflict: 'aula_id,estudiante_id' },
              );
          } else {
            await supabase
              .from('matriculas_aula')
              .delete()
              .eq('aula_id', aulaId)
              .eq('estudiante_id', validStudentId);
          }
        }
      } catch {
        // Matrícula preservada en caché local.
      }
    }
  }

  return loadTeacherClassroomData();
}
