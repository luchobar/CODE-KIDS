/**
 * CAPA DE LÓGICA DE NEGOCIO — SERVICIO DE AULAS, MATRÍCULAS, RETOS Y ENTREGAS (CRUD)
 * Archivo: /src/services/classroom.service.js
 * Operaciones TAREA 3:
 *   - CREATE (INSERT): Matricular estudiante en aula, publicar reto, enviar entrega de misión
 *   - READ (SELECT): Ver ranking del curso
 *   - UPDATE (UPDATE): Calificar entrega, editar reto escolar
 *   - DELETE (DELETE): Dar de baja la matrícula de un alumno de un aula, eliminar reto asignado
 */

import {
  executePostgresQuery,
  getRelationalStore,
  saveRelationalStore,
  supabaseClient,
} from './db.client.js';

function resolveAulaIdInStore(store, { aulaId, codigoGrupo }) {
  if (aulaId && Number.isFinite(Number(aulaId))) return Number(aulaId);
  const cleanCode = String(codigoGrupo || '5° A').trim();
  const found = store.aulas.find(
    (a) => a.codigo_grupo === cleanCode || a.codigo_acceso === cleanCode,
  );
  return found ? Number(found.id) : 1;
}

/**
 * CREATE (INSERT): Matricula a un estudiante en un aula ('matriculas_aula').
 */
export async function enrollStudentInAula({ aulaId, codigoGrupo = '5° A', estudianteId }) {
  const store = getRelationalStore();
  const resolvedAulaId = resolveAulaIdInStore(store, { aulaId, codigoGrupo });
  const sid = Number(estudianteId);

  const pgIns = await executePostgresQuery(
    `INSERT INTO matriculas_aula (aula_id, estudiante_id, fecha_matricula, matriculado_en)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (aula_id, estudiante_id) DO NOTHING
     RETURNING aula_id, estudiante_id, fecha_matricula;`,
    [resolvedAulaId, sid],
  );
  if (pgIns) {
    return { ok: true, operation: 'INSERT', source: 'postgresql', enrollment: pgIns[0] || { aula_id: resolvedAulaId, estudiante_id: sid } };
  }

  if (supabaseClient) {
    try {
      await supabaseClient
        .from('matriculas_aula')
        .upsert({ aula_id: resolvedAulaId, estudiante_id: sid }, { onConflict: 'aula_id,estudiante_id' });
    } catch {
      /* continúa al almacén relacional */
    }
  }

  const exists = store.matriculas_aula.some(
    (m) => Number(m.aula_id) === resolvedAulaId && Number(m.estudiante_id) === sid,
  );
  if (!exists) {
    store.matriculas_aula.push({
      aula_id: resolvedAulaId,
      estudiante_id: sid,
      fecha_matricula: new Date().toISOString(),
    });
    saveRelationalStore(store);
  }

  return {
    ok: true,
    operation: 'INSERT',
    source: supabaseClient ? 'supabase' : 'relational-3fn',
    enrollment: { aula_id: resolvedAulaId, estudiante_id: sid },
  };
}

/**
 * DELETE (DELETE): Da de baja la matrícula de un alumno en un aula ('matriculas_aula').
 */
export async function unenrollStudentFromAula({ aulaId, codigoGrupo = '5° A', estudianteId }) {
  const store = getRelationalStore();
  const resolvedAulaId = resolveAulaIdInStore(store, { aulaId, codigoGrupo });
  const sid = Number(estudianteId);

  const pgDel = await executePostgresQuery(
    `DELETE FROM matriculas_aula
     WHERE aula_id = $1 AND estudiante_id = $2
     RETURNING aula_id, estudiante_id;`,
    [resolvedAulaId, sid],
  );
  if (pgDel) {
    return { ok: true, operation: 'DELETE', source: 'postgresql', deleted: pgDel[0] || { aula_id: resolvedAulaId, estudiante_id: sid } };
  }

  if (supabaseClient) {
    try {
      await supabaseClient
        .from('matriculas_aula')
        .delete()
        .eq('aula_id', resolvedAulaId)
        .eq('estudiante_id', sid);
    } catch {
      /* continúa al almacén relacional */
    }
  }

  store.matriculas_aula = store.matriculas_aula.filter(
    (m) => !(Number(m.aula_id) === resolvedAulaId && Number(m.estudiante_id) === sid),
  );
  saveRelationalStore(store);

  return {
    ok: true,
    operation: 'DELETE',
    source: supabaseClient ? 'supabase' : 'relational-3fn',
    deleted: { aula_id: resolvedAulaId, estudiante_id: sid },
  };
}

/**
 * READ (SELECT): Consulta el ranking del curso ordenado por XP y misiones completadas.
 */
export async function getClassroomRanking({ aulaId, codigoGrupo = '5° A' } = {}) {
  const store = getRelationalStore();
  const resolvedAulaId = resolveAulaIdInStore(store, { aulaId, codigoGrupo });

  const pgRows = await executePostgresQuery(
    `SELECT
        ROW_NUMBER() OVER (ORDER BY COALESCE(pg.puntos_xp, 0) DESC, u.nombre ASC)::int AS posicion,
        u.id AS estudiante_id,
        u.nombre,
        u.correo,
        a.codigo_grupo,
        COALESCE(pg.puntos_xp, 0)::int AS puntos_xp,
        COALESCE(pg.nivel_actual, 1)::int AS nivel_actual,
        COALESCE(pg.saldo_monedas, 0)::int AS saldo_monedas,
        COALESCE(pg.dias_racha, 1)::int AS dias_racha,
        COALESCE(pg.avatar_activo_id, 'dragon') AS avatar_activo_id,
        COUNT(CASE WHEN pmu.estado = 'completada' THEN 1 END)::int AS misiones_completadas
     FROM matriculas_aula ma
     INNER JOIN aulas a ON a.id = ma.aula_id
     INNER JOIN usuarios u ON u.id = ma.estudiante_id
     LEFT JOIN perfiles_gamificacion pg ON pg.usuario_id = u.id
     LEFT JOIN progreso_misiones_usuario pmu ON pmu.usuario_id = u.id
     WHERE ma.aula_id = $1 AND u.activo = TRUE
     GROUP BY u.id, u.nombre, u.correo, a.codigo_grupo, pg.puntos_xp, pg.nivel_actual, pg.saldo_monedas, pg.dias_racha, pg.avatar_activo_id
     ORDER BY puntos_xp DESC, misiones_completadas DESC;`,
    [resolvedAulaId],
  );

  if (pgRows) {
    return { ok: true, operation: 'SELECT', source: 'postgresql', ranking: pgRows };
  }

  const enrolledIds = new Set(
    store.matriculas_aula
      .filter((m) => Number(m.aula_id) === resolvedAulaId)
      .map((m) => Number(m.estudiante_id)),
  );

  const ranking = store.usuarios
    .filter((u) => enrolledIds.has(Number(u.id)) && u.activo !== false)
    .map((u) => {
      const uid = Number(u.id);
      const pg = store.perfiles_gamificacion.find((p) => Number(p.usuario_id) === uid);
      const completed = store.progreso_misiones_usuario.filter(
        (p) => Number(p.usuario_id) === uid && p.estado === 'completada',
      ).length;
      return {
        estudiante_id: uid,
        nombre: u.nombre,
        correo: u.correo,
        codigo_grupo: codigoGrupo,
        puntos_xp: pg?.puntos_xp ?? 0,
        nivel_actual: pg?.nivel_actual ?? 1,
        saldo_monedas: pg?.saldo_monedas ?? 0,
        dias_racha: pg?.dias_racha ?? 1,
        avatar_activo_id: pg?.avatar_activo_id ?? 'dragon',
        misiones_completadas: completed,
      };
    })
    .sort((a, b) => b.puntos_xp - a.puntos_xp || b.misiones_completadas - a.misiones_completadas)
    .map((item, idx) => ({ posicion: idx + 1, ...item }));

  return {
    ok: true,
    operation: 'SELECT',
    source: supabaseClient ? 'supabase' : 'relational-3fn',
    ranking,
  };
}

/**
 * CREATE (INSERT): Publica un reto escolar en 'retos_aula'.
 */
export async function publishAulaChallenge({
  aulaId,
  codigoGrupo = '5° A',
  misionId = 'sequence-forest',
  titulo,
  instrucciones = '',
  tematicaHabilidad = 'Secuencias',
  fechaLimite = null,
}) {
  const store = getRelationalStore();
  const resolvedAulaId = resolveAulaIdInStore(store, { aulaId, codigoGrupo });
  const cleanTitle = String(titulo || 'Nuevo reto de programación').trim();
  const cleanInstructions = String(instrucciones || 'Resuelve la misión asignada.').trim();
  const deadline = fechaLimite || new Date(Date.now() + 14 * 86400000).toISOString();

  const pgIns = await executePostgresQuery(
    `INSERT INTO retos_aula (aula_id, mision_id, titulo, instrucciones, tematica_habilidad, fecha_limite, activo)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)
     RETURNING id, aula_id, mision_id, titulo, instrucciones, tematica_habilidad, fecha_limite, activo, creado_en;`,
    [resolvedAulaId, misionId, cleanTitle, cleanInstructions, tematicaHabilidad, deadline],
  );
  if (pgIns && pgIns[0]) {
    return { ok: true, operation: 'INSERT', source: 'postgresql', challenge: pgIns[0] };
  }

  let remoteId = null;
  if (supabaseClient) {
    try {
      const { data: inserted } = await supabaseClient
        .from('retos_aula')
        .insert({
          aula_id: resolvedAulaId,
          mision_id: misionId,
          titulo: cleanTitle,
          instrucciones: cleanInstructions,
          tematica_habilidad: tematicaHabilidad,
        })
        .select('id')
        .single();
      remoteId = inserted?.id;
    } catch {
      /* continúa al almacén relacional */
    }
  }

  const nextId =
    remoteId ||
    store.retos_aula.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
  const challenge = {
    id: Number(nextId),
    aula_id: resolvedAulaId,
    mision_id: misionId,
    titulo: cleanTitle,
    instrucciones: cleanInstructions,
    tematica_habilidad: tematicaHabilidad,
    fecha_limite: deadline,
    activo: true,
    creado_en: new Date().toISOString(),
  };
  store.retos_aula.unshift(challenge);
  saveRelationalStore(store);

  return {
    ok: true,
    operation: 'INSERT',
    source: supabaseClient ? 'supabase' : 'relational-3fn',
    challenge,
  };
}

/**
 * UPDATE (UPDATE): Edita un reto escolar existente en 'retos_aula'.
 */
export async function updateAulaChallenge(
  retoId,
  { titulo, instrucciones, misionId, tematicaHabilidad, fechaLimite, activo },
) {
  const numericRetoId = Number(String(retoId).replace(/^db-/, ''));

  const pgUpd = await executePostgresQuery(
    `UPDATE retos_aula
     SET titulo = COALESCE($1, titulo),
         instrucciones = COALESCE($2, instrucciones),
         mision_id = COALESCE($3, mision_id),
         tematica_habilidad = COALESCE($4, tematica_habilidad),
         fecha_limite = COALESCE($5, fecha_limite),
         activo = COALESCE($6, activo)
     WHERE id = $7
     RETURNING id, aula_id, mision_id, titulo, instrucciones, tematica_habilidad, fecha_limite, activo;`,
    [
      titulo || null,
      instrucciones || null,
      misionId || null,
      tematicaHabilidad || null,
      fechaLimite || null,
      typeof activo === 'boolean' ? activo : null,
      numericRetoId,
    ],
  );
  if (pgUpd && pgUpd[0]) {
    return { ok: true, operation: 'UPDATE', source: 'postgresql', challenge: pgUpd[0] };
  }

  if (supabaseClient && Number.isFinite(numericRetoId)) {
    try {
      const patch = {};
      if (titulo !== undefined) patch.titulo = titulo;
      if (instrucciones !== undefined) patch.instrucciones = instrucciones;
      if (misionId !== undefined) patch.mision_id = misionId;
      if (tematicaHabilidad !== undefined) patch.tematica_habilidad = tematicaHabilidad;
      await supabaseClient.from('retos_aula').update(patch).eq('id', numericRetoId);
    } catch {
      /* continúa al almacén relacional */
    }
  }

  const store = getRelationalStore();
  let updatedChallenge = null;
  store.retos_aula = store.retos_aula.map((r) => {
    if (Number(r.id) !== numericRetoId && String(r.id) !== String(retoId)) return r;
    updatedChallenge = {
      ...r,
      titulo: titulo !== undefined ? titulo : r.titulo,
      instrucciones: instrucciones !== undefined ? instrucciones : r.instrucciones,
      mision_id: misionId !== undefined ? misionId : r.mision_id,
      tematica_habilidad:
        tematicaHabilidad !== undefined ? tematicaHabilidad : r.tematica_habilidad,
      activo: typeof activo === 'boolean' ? activo : r.activo,
    };
    return updatedChallenge;
  });
  saveRelationalStore(store);

  return {
    ok: true,
    operation: 'UPDATE',
    source: supabaseClient ? 'supabase' : 'relational-3fn',
    challenge: updatedChallenge || { id: numericRetoId, titulo, instrucciones },
  };
}

/**
 * DELETE (DELETE): Elimina un reto asignado en 'retos_aula'.
 */
export async function deleteAulaChallenge(retoId) {
  const numericRetoId = Number(String(retoId).replace(/^db-/, ''));

  const pgDel = await executePostgresQuery(
    `DELETE FROM retos_aula WHERE id = $1 RETURNING id, titulo;`,
    [numericRetoId],
  );
  if (pgDel && pgDel[0]) {
    return { ok: true, operation: 'DELETE', source: 'postgresql', deleted: pgDel[0] };
  }

  if (supabaseClient && Number.isFinite(numericRetoId)) {
    try {
      await supabaseClient.from('retos_aula').delete().eq('id', numericRetoId);
    } catch {
      /* continúa al almacén relacional */
    }
  }

  const store = getRelationalStore();
  store.retos_aula = store.retos_aula.filter(
    (r) => Number(r.id) !== numericRetoId && String(r.id) !== String(retoId),
  );
  store.entregas_retos = store.entregas_retos.filter(
    (e) => Number(e.reto_id) !== numericRetoId,
  );
  saveRelationalStore(store);

  return {
    ok: true,
    operation: 'DELETE',
    source: supabaseClient ? 'supabase' : 'relational-3fn',
    deletedId: retoId,
  };
}

/**
 * CREATE (INSERT): Envía la entrega de un estudiante para un reto ('entregas_retos').
 */
export async function submitChallengeDelivery({
  retoId,
  estudianteId,
  puntuacion,
  puntaje,
  cantidadIntentos = 1,
  logrado = true,
  textoEvidencia = 'Reto completado',
  retroalimentacionIa = 'Buen trabajo resolviendo el reto.',
  recomendacionDocente = 'Continuar al siguiente nivel.',
}) {
  const rid = Number(String(retoId).replace(/^db-/, '')) || 1;
  const sid = Number(estudianteId) || 1;
  const resolvedPuntaje =
    puntaje !== undefined && puntaje !== null
      ? Math.max(0, Math.min(100, Math.round(Number(puntaje))))
      : Math.max(0, Math.min(100, Math.round(Number(puntuacion || 4.25) * 20)));
  const resolvedPuntuacion =
    puntuacion !== undefined && puntuacion !== null
      ? Number(Math.max(0, Math.min(5, Number(puntuacion))).toFixed(2))
      : Number((resolvedPuntaje / 20).toFixed(2));

  const pgIns = await executePostgresQuery(
    `INSERT INTO entregas_retos
       (reto_id, estudiante_id, puntuacion, puntaje, cantidad_intentos, logrado, texto_evidencia, retroalimentacion_ia, recomendacion_docente, estado, fecha_entrega, entregado_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'entregado', NOW(), NOW())
     ON CONFLICT (reto_id, estudiante_id) DO UPDATE
     SET puntuacion = EXCLUDED.puntuacion,
         puntaje = EXCLUDED.puntaje,
         cantidad_intentos = EXCLUDED.cantidad_intentos,
         logrado = EXCLUDED.logrado,
         texto_evidencia = EXCLUDED.texto_evidencia,
         retroalimentacion_ia = EXCLUDED.retroalimentacion_ia,
         recomendacion_docente = EXCLUDED.recomendacion_docente,
         fecha_entrega = NOW(),
         entregado_en = NOW()
     RETURNING *;`,
    [
      rid,
      sid,
      resolvedPuntuacion,
      resolvedPuntaje,
      cantidadIntentos,
      Boolean(logrado),
      textoEvidencia,
      retroalimentacionIa,
      recomendacionDocente,
    ],
  );
  if (pgIns && pgIns[0]) {
    return { ok: true, operation: 'INSERT', source: 'postgresql', submission: pgIns[0] };
  }

  if (supabaseClient) {
    try {
      await supabaseClient.from('entregas_retos').upsert(
        {
          reto_id: rid,
          estudiante_id: sid,
          puntaje: resolvedPuntaje,
          cantidad_intentos: cantidadIntentos,
          logrado: Boolean(logrado),
          texto_evidencia: textoEvidencia,
          retroalimentacion_ia: retroalimentacionIa,
          recomendacion_docente: recomendacionDocente,
          entregado_en: new Date().toISOString(),
        },
        { onConflict: 'reto_id,estudiante_id' },
      );
    } catch {
      /* continúa al almacén relacional */
    }
  }

  const store = getRelationalStore();
  const existingIdx = store.entregas_retos.findIndex(
    (e) => Number(e.reto_id) === rid && Number(e.estudiante_id) === sid,
  );
  const record = {
    id:
      existingIdx >= 0
        ? store.entregas_retos[existingIdx].id
        : store.entregas_retos.reduce((max, e) => Math.max(max, Number(e.id) || 0), 0) + 1,
    reto_id: rid,
    estudiante_id: sid,
    puntuacion: resolvedPuntuacion,
    puntaje: resolvedPuntaje,
    cantidad_intentos: cantidadIntentos,
    logrado: Boolean(logrado),
    texto_evidencia: textoEvidencia,
    retroalimentacion_ia: retroalimentacionIa,
    recomendacion_docente: recomendacionDocente,
    estado: 'calificado',
    fecha_entrega: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    store.entregas_retos[existingIdx] = record;
  } else {
    store.entregas_retos.push(record);
  }
  saveRelationalStore(store);

  return {
    ok: true,
    operation: 'INSERT',
    source: supabaseClient ? 'supabase' : 'relational-3fn',
    submission: record,
  };
}

/**
 * UPDATE (UPDATE): Califica o actualiza la nota y retroalimentación de una entrega ('entregas_retos').
 */
export async function gradeStudentSubmission({
  entregaId,
  retoId,
  estudianteId,
  puntuacion,
  puntaje,
  retroalimentacionIa,
  recomendacionDocente,
  estado = 'calificado',
}) {
  const resolvedPuntaje =
    puntaje !== undefined && puntaje !== null
      ? Math.max(0, Math.min(100, Math.round(Number(puntaje))))
      : Math.max(0, Math.min(100, Math.round(Number(puntuacion || 4.0) * 20)));
  const resolvedPuntuacion =
    puntuacion !== undefined && puntuacion !== null
      ? Number(Math.max(0, Math.min(5, Number(puntuacion))).toFixed(2))
      : Number((resolvedPuntaje / 20).toFixed(2));

  if (entregaId && Number.isFinite(Number(entregaId))) {
    const pgUpd = await executePostgresQuery(
      `UPDATE entregas_retos
       SET puntuacion = $1,
           puntaje = $2,
           retroalimentacion_ia = COALESCE($3, retroalimentacion_ia),
           recomendacion_docente = COALESCE($4, recomendacion_docente),
           estado = $5
       WHERE id = $6
       RETURNING *;`,
      [
        resolvedPuntuacion,
        resolvedPuntaje,
        retroalimentacionIa || null,
        recomendacionDocente || null,
        estado,
        Number(entregaId),
      ],
    );
    if (pgUpd && pgUpd[0]) {
      return { ok: true, operation: 'UPDATE', source: 'postgresql', submission: pgUpd[0] };
    }
  }

  if (supabaseClient) {
    try {
      const patch = {
        puntaje: resolvedPuntaje,
        ...(retroalimentacionIa ? { retroalimentacion_ia: retroalimentacionIa } : {}),
        ...(recomendacionDocente ? { recomendacion_docente: recomendacionDocente } : {}),
      };
      if (entregaId && Number.isFinite(Number(entregaId))) {
        await supabaseClient.from('entregas_retos').update(patch).eq('id', Number(entregaId));
      } else if (retoId && estudianteId) {
        const rid = Number(String(retoId).replace(/^db-/, ''));
        await supabaseClient
          .from('entregas_retos')
          .update(patch)
          .eq('reto_id', rid)
          .eq('estudiante_id', Number(estudianteId));
      }
    } catch {
      /* continúa al almacén relacional */
    }
  }

  const store = getRelationalStore();
  let updated = null;
  store.entregas_retos = store.entregas_retos.map((e) => {
    const matchById = entregaId && Number(e.id) === Number(entregaId);
    const matchByPair =
      retoId &&
      estudianteId &&
      Number(e.reto_id) === Number(String(retoId).replace(/^db-/, '')) &&
      Number(e.estudiante_id) === Number(estudianteId);

    if (!matchById && !matchByPair) return e;
    updated = {
      ...e,
      puntuacion: resolvedPuntuacion,
      puntaje: resolvedPuntaje,
      retroalimentacion_ia: retroalimentacionIa || e.retroalimentacion_ia,
      recomendacion_docente: recomendacionDocente || e.recomendacion_docente,
      estado,
    };
    return updated;
  });
  saveRelationalStore(store);

  return {
    ok: true,
    operation: 'UPDATE',
    source: supabaseClient ? 'supabase' : 'relational-3fn',
    submission: updated || {
      id: entregaId,
      puntuacion: resolvedPuntuacion,
      puntaje: resolvedPuntaje,
      estado,
    },
  };
}
