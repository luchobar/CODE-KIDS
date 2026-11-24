import {
  ensureAulaIdForGroup,
  inferTemplateIdFromMission,
  resolveAulaIdByGroup,
} from './classroomStats.js';
import { callTier2Api } from './httpClient.js';
import { parsePositiveIntId, resolveStudentIdOrNull } from './seedData.js';
import { readClassroomCache, writeClassroomCache } from './storageStore.js';
import { supabase } from './supabaseClient.js';

/**
 * Publica un reto escolar evitando duplicarlo en Supabase cuando Tier 2 ya lo insertó.
 */
export async function createClassroomAssignmentInSupabase({
  group,
  title,
  instructions,
  skill,
  missionId,
  templateId,
  docenteId,
}) {
  const cleanGroup = String(group || '5° A').trim();
  const resolvedTemplate = inferTemplateIdFromMission(missionId, skill, templateId);
  const newAssignment = {
    id: `${Date.now()}`,
    group: cleanGroup,
    title: String(title || '').trim(),
    instructions: String(instructions || '').trim(),
    skill: skill || 'Secuencias',
    missionId: missionId || 'sequence-forest',
    templateId: resolvedTemplate,
    createdAt: Date.now(),
  };

  const resolvedAulaId = resolveAulaIdByGroup(cleanGroup) || 1;
  const apiRes = await callTier2Api('/challenges', {
    method: 'POST',
    body: {
      aulaId: resolvedAulaId,
      codigoGrupo: cleanGroup,
      misionId: newAssignment.missionId,
      titulo: newAssignment.title,
      instrucciones: newAssignment.instructions,
      tematicaHabilidad: newAssignment.skill,
    },
  });

  const tier2Confirmed = Boolean(apiRes?.httpOk && apiRes?.data?.ok);
  if (tier2Confirmed && apiRes.data.challenge?.id) {
    newAssignment.id = `db-${apiRes.data.challenge.id}`;
    newAssignment.dbId = Number(apiRes.data.challenge.id);
  } else if (!tier2Confirmed && supabase) {
    try {
      const aulaId = await ensureAulaIdForGroup(cleanGroup, `Curso ${cleanGroup}`, docenteId);
      if (aulaId) {
        let dbMissionId = missionId;
        const { data: bySlug } = await supabase
          .from('misiones')
          .select('id')
          .eq('slug', missionId)
          .maybeSingle();

        if (bySlug?.id) {
          dbMissionId = bySlug.id;
        } else {
          const { data: byId } = await supabase
            .from('misiones')
            .select('id')
            .eq('id', missionId)
            .maybeSingle();
          dbMissionId = byId?.id || 'sequence-forest';
        }

        const { data: insertedReto } = await supabase
          .from('retos_aula')
          .insert({
            aula_id: aulaId,
            mision_id: dbMissionId,
            titulo: newAssignment.title,
            instrucciones: newAssignment.instructions,
            tematica_habilidad: newAssignment.skill,
          })
          .select('id')
          .single();

        if (insertedReto?.id) {
          newAssignment.id = `db-${insertedReto.id}`;
          newAssignment.dbId = Number(insertedReto.id);
        }
      }
    } catch {
      // Reto preservado en caché local si falla la conexión remota.
    }
  }

  const cache = readClassroomCache();
  const nextAssignments = [
    newAssignment,
    ...cache.assignments.filter(
      (a) =>
        !(
          a.group === newAssignment.group &&
          a.title === newAssignment.title &&
          a.missionId === newAssignment.missionId
        ),
    ),
  ];
  writeClassroomCache({ assignments: nextAssignments });

  return newAssignment;
}

/**
 * Registra la entrega de un estudiante evitando doble escritura si Tier 2 confirma.
 */
export async function syncAssignmentSubmissionInSupabase(submission, user) {
  const cache = readClassroomCache();
  const nextSubmissions = [
    submission,
    ...cache.submissions.filter((s) => s.id !== submission.id),
  ];
  writeClassroomCache({ submissions: nextSubmissions });

  const studentId = resolveStudentIdOrNull(user?.id ?? user?.name);
  const retoDbId = parsePositiveIntId(submission.dbId ?? submission.assignmentId);
  if (!studentId || !retoDbId) return submission;

  const payload = {
    retoId: retoDbId,
    estudianteId: studentId,
    puntaje: Math.round(Number(submission.score || 85)),
    cantidadIntentos: Number(submission.gameOutcome?.attempts || 1),
    logrado: Boolean(submission.gameOutcome?.success),
    textoEvidencia: String(submission.response || 'Reto superado'),
    retroalimentacionIa: String(submission.feedback || ''),
    recomendacionDocente: String(submission.recommendation || ''),
  };

  const apiRes = await callTier2Api('/submissions', { method: 'POST', body: payload });
  if (apiRes?.httpOk && apiRes?.data?.ok) {
    return submission;
  }

  if (supabase) {
    try {
      await supabase.from('entregas_retos').upsert(
        {
          reto_id: retoDbId,
          estudiante_id: studentId,
          puntaje: payload.puntaje,
          cantidad_intentos: payload.cantidadIntentos,
          logrado: payload.logrado,
          texto_evidencia: payload.textoEvidencia,
          retroalimentacion_ia: payload.retroalimentacionIa,
          recomendacion_docente: payload.recomendacionDocente,
          fuente_evaluacion: String(submission.source || 'fallback'),
          entregado_en: new Date().toISOString(),
        },
        { onConflict: 'reto_id,estudiante_id' },
      );
    } catch {
      // Entrega preservada en caché local.
    }
  }

  return submission;
}

/**
 * Edita un reto escolar en caché y servidor (Tier 2 o respaldo Supabase sin duplicar).
 */
export async function updateClassroomAssignmentInSupabase(assignmentId, updates = {}) {
  const cache = readClassroomCache();
  const nextAssignments = (cache.assignments || []).map((a) =>
    String(a.id) === String(assignmentId)
      ? {
          ...a,
          title: updates.title !== undefined ? String(updates.title).trim() : a.title,
          instructions:
            updates.instructions !== undefined
              ? String(updates.instructions).trim()
              : a.instructions,
          skill: updates.skill || a.skill,
        }
      : a,
  );
  writeClassroomCache({ assignments: nextAssignments });

  const numericId = parsePositiveIntId(assignmentId);
  if (!numericId) return nextAssignments;

  const apiRes = await callTier2Api(`/challenges/${numericId}`, {
    method: 'PUT',
    body: {
      titulo: updates.title,
      instrucciones: updates.instructions,
      tematicaHabilidad: updates.skill,
    },
  });

  if (apiRes?.httpOk && apiRes?.data?.ok) return nextAssignments;

  if (supabase) {
    try {
      const patch = {};
      if (updates.title !== undefined) patch.titulo = String(updates.title).trim();
      if (updates.instructions !== undefined) {
        patch.instrucciones = String(updates.instructions).trim();
      }
      if (updates.skill !== undefined) patch.tematica_habilidad = updates.skill;
      await supabase.from('retos_aula').update(patch).eq('id', numericId);
    } catch {
      // Cambio preservado en caché local.
    }
  }

  return nextAssignments;
}

/**
 * Elimina un reto escolar en caché y servidor validando su ID antes de mutar.
 */
export async function deleteClassroomAssignmentInSupabase(assignmentId) {
  const cache = readClassroomCache();
  const nextAssignments = (cache.assignments || []).filter(
    (a) => String(a.id) !== String(assignmentId),
  );
  const nextSubmissions = (cache.submissions || []).filter(
    (s) => String(s.assignmentId) !== String(assignmentId),
  );
  writeClassroomCache({ assignments: nextAssignments, submissions: nextSubmissions });

  const numericId = parsePositiveIntId(assignmentId);
  if (!numericId) return nextAssignments;

  const apiRes = await callTier2Api(`/challenges/${numericId}`, { method: 'DELETE' });
  if (apiRes?.httpOk && apiRes?.data?.ok) return nextAssignments;

  if (supabase) {
    try {
      await supabase.from('retos_aula').delete().eq('id', numericId);
    } catch {
      // Eliminación preservada en caché local.
    }
  }

  return nextAssignments;
}

/**
 * Actualiza la calificación y retroalimentación de una entrega sin doble escritura.
 */
export async function gradeSubmissionInSupabase(
  submissionId,
  { score, puntuacion, feedback, recommendation, assignmentId, studentId } = {},
) {
  const resolvedScore =
    score !== undefined
      ? Math.max(0, Math.min(100, Math.round(Number(score))))
      : Math.max(0, Math.min(100, Math.round(Number(puntuacion || 4.0) * 20)));

  const cache = readClassroomCache();
  const nextSubmissions = (cache.submissions || []).map((s) =>
    String(s.id) === String(submissionId)
      ? {
          ...s,
          score: resolvedScore,
          feedback: feedback !== undefined ? feedback : s.feedback,
          recommendation: recommendation !== undefined ? recommendation : s.recommendation,
        }
      : s,
  );
  writeClassroomCache({ submissions: nextSubmissions });

  const numericSubId = parsePositiveIntId(String(submissionId || '').replace(/\D+/g, ''));
  let tier2Confirmed = false;
  if (numericSubId) {
    const apiRes = await callTier2Api(`/submissions/${numericSubId}/grade`, {
      method: 'PATCH',
      body: {
        puntaje: resolvedScore,
        puntuacion: Number((resolvedScore / 20).toFixed(2)),
        retroalimentacionIa: feedback,
        recomendacionDocente: recommendation,
      },
    });
    tier2Confirmed = Boolean(apiRes?.httpOk && apiRes?.data?.ok);
  }

  if (!tier2Confirmed && supabase) {
    try {
      const numericRetoId = parsePositiveIntId(assignmentId);
      const validStudentId = parsePositiveIntId(studentId);
      if (numericRetoId && validStudentId) {
        await supabase
          .from('entregas_retos')
          .update({
            puntaje: resolvedScore,
            ...(feedback !== undefined ? { retroalimentacion_ia: feedback } : {}),
            ...(recommendation !== undefined ? { recomendacion_docente: recommendation } : {}),
          })
          .eq('reto_id', numericRetoId)
          .eq('estudiante_id', validStudentId);
      }
    } catch {
      // Calificación preservada en caché local.
    }
  }

  return nextSubmissions;
}
