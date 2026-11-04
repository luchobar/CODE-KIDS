/**
 * CAPA DE LÓGICA DE NEGOCIO — SERVICIO DE GAMIFICACIÓN, MAPA Y TIENDA (CRUD)
 * Archivo: /src/services/gamification.service.js
 * Operaciones TAREA 3:
 *   - CREATE (INSERT): Comprar avatar e insertar en 'inventario_avatares_usuario'
 *   - READ (SELECT): Listar misiones del mapa ('mundos' + 'misiones' + 'progreso_misiones_usuario') y catálogo de tienda ('catalogo_avatares')
 *   - UPDATE (UPDATE): Actualizar XP/monedas tras ganar misión y cambiar avatar activo en 'perfiles_gamificacion'
 */

import {
  executePostgresQuery,
  getRelationalStore,
  saveRelationalStore,
  supabaseClient,
} from './db.client.js';

/**
 * READ (SELECT): Lista los mundos y misiones del mapa junto con el progreso del estudiante.
 */
export async function listMapMissionsWithProgress(usuarioId = 1) {
  const uid = Number(usuarioId) || 1;

  const pgRows = await executePostgresQuery(
    `SELECT
        w.id AS mundo_id,
        w.orden_mundo,
        w.tematica_habilidad,
        w.titulo AS mundo_titulo,
        m.id AS mision_id,
        m.orden_etapa,
        m.nivel_dificultad,
        m.plantilla_id,
        m.nombre_corto,
        m.titulo_ejercicio,
        m.recompensa_xp,
        m.recompensa_monedas,
        m.configuracion_tablero,
        COALESCE(pmu.estado, 'disponible') AS estado_usuario,
        COALESCE(pmu.estrellas_ganadas, 0) AS estrellas_ganadas,
        COALESCE(pmu.cantidad_intentos, 0) AS cantidad_intentos
     FROM mundos w
     INNER JOIN misiones m ON m.mundo_id = w.id
     LEFT JOIN progreso_misiones_usuario pmu
            ON pmu.mision_id = m.id AND pmu.usuario_id = $1
     WHERE w.activo = TRUE
     ORDER BY w.orden_mundo ASC, m.orden_etapa ASC;`,
    [uid],
  );

  if (pgRows) {
    return { ok: true, operation: 'SELECT', source: 'postgresql', missions: pgRows };
  }

  const store = getRelationalStore();
  let mundos = store.mundos;
  let misiones = store.misiones;
  let progreso = store.progreso_misiones_usuario.filter(
    (p) => Number(p.usuario_id) === uid,
  );

  if (supabaseClient) {
    try {
      const [{ data: dbMundos }, { data: dbMisiones }, { data: dbProgreso }] = await Promise.all([
        supabaseClient.from('mundos').select('*').eq('activo', true).order('orden_mundo', { ascending: true }),
        supabaseClient.from('misiones').select('*').order('orden_etapa', { ascending: true }),
        supabaseClient.from('progreso_misiones_usuario').select('*').eq('usuario_id', uid),
      ]);
      if (dbMundos?.length) mundos = dbMundos;
      if (dbMisiones?.length) misiones = dbMisiones;
      if (dbProgreso?.length) progreso = dbProgreso;
    } catch {
      /* continúa con almacén relacional */
    }
  }

  const mundosMap = new Map(mundos.map((w) => [String(w.id), w]));
  const progresoMap = new Map(progreso.map((p) => [String(p.mision_id), p]));

  const missions = misiones.map((m) => {
    const w = mundosMap.get(String(m.mundo_id)) || {};
    const p = progresoMap.get(String(m.id));
    return {
      mundo_id: m.mundo_id,
      orden_mundo: w.orden_mundo || 1,
      tematica_habilidad: w.tematica_habilidad || 'Secuencias',
      mundo_titulo: w.titulo || 'Mundo',
      mision_id: m.id,
      orden_etapa: m.orden_etapa,
      nivel_dificultad: m.nivel_dificultad || 'Inicio',
      plantilla_id: m.plantilla_id || 'sequence-order',
      nombre_corto: m.nombre_corto || m.titulo_ejercicio,
      titulo_ejercicio: m.titulo_ejercicio,
      recompensa_xp: m.recompensa_xp ?? 10,
      recompensa_monedas: m.recompensa_monedas ?? 10,
      configuracion_tablero: m.configuracion_tablero || {},
      estado_usuario: p?.estado || 'disponible',
      estrellas_ganadas: p?.estrellas_ganadas ?? 0,
      cantidad_intentos: p?.cantidad_intentos ?? 0,
    };
  });

  return {
    ok: true,
    operation: 'SELECT',
    source: supabaseClient ? 'supabase' : 'relational-3fn',
    missions,
  };
}

/**
 * READ (SELECT): Consulta el catálogo de la tienda de avatares e indica cuáles posee el estudiante.
 */
export async function getAvatarStoreCatalog(usuarioId = 1) {
  const uid = Number(usuarioId) || 1;

  const pgRows = await executePostgresQuery(
    `SELECT
        ca.id,
        ca.nombre_visible,
        ca.costo_monedas,
        ca.tono_tema,
        ca.descripcion,
        ca.es_inicial,
        CASE WHEN iau.avatar_id IS NOT NULL THEN TRUE ELSE FALSE END AS desbloqueado
     FROM catalogo_avatares ca
     LEFT JOIN inventario_avatares_usuario iau
            ON iau.avatar_id = ca.id AND iau.usuario_id = $1
     ORDER BY ca.costo_monedas ASC;`,
    [uid],
  );

  if (pgRows) {
    return { ok: true, operation: 'SELECT', source: 'postgresql', catalog: pgRows };
  }

  const store = getRelationalStore();
  let avatares = store.catalogo_avatares;
  let inventario = store.inventario_avatares_usuario.filter(
    (i) => Number(i.usuario_id) === uid,
  );

  if (supabaseClient) {
    try {
      const [{ data: dbAvatares }, { data: dbInv }] = await Promise.all([
        supabaseClient.from('catalogo_avatares').select('*').order('costo_monedas', { ascending: true }),
        supabaseClient.from('inventario_avatares_usuario').select('avatar_id').eq('usuario_id', uid),
      ]);
      if (dbAvatares?.length) avatares = dbAvatares;
      if (dbInv?.length) inventario = dbInv;
    } catch {
      /* continúa con almacén relacional */
    }
  }

  const ownedSet = new Set(inventario.map((i) => String(i.avatar_id)));
  const catalog = avatares.map((ca) => ({
    ...ca,
    desbloqueado: ownedSet.has(String(ca.id)),
  }));

  return {
    ok: true,
    operation: 'SELECT',
    source: supabaseClient ? 'supabase' : 'relational-3fn',
    catalog,
  };
}

/**
 * CREATE (INSERT) + UPDATE: Compra un avatar en la tienda ('inventario_avatares_usuario')
 * y descuenta las monedas equipándolo en 'perfiles_gamificacion'.
 */
export async function purchaseStoreAvatar({ usuarioId, avatarId, costo = 30 }) {
  const uid = Number(usuarioId) || 1;
  const cleanAvatarId = String(avatarId || 'dragon').trim();
  const numericCost = Math.max(0, Number(costo) || 0);

  // 1. PostgreSQL directo
  const pgInv = await executePostgresQuery(
    `INSERT INTO inventario_avatares_usuario (usuario_id, avatar_id, desbloqueado_en)
     VALUES ($1, $2, NOW())
     ON CONFLICT (usuario_id, avatar_id) DO NOTHING
     RETURNING usuario_id, avatar_id, desbloqueado_en;`,
    [uid, cleanAvatarId],
  );
  if (pgInv) {
    await executePostgresQuery(
      `UPDATE perfiles_gamificacion
       SET saldo_monedas = GREATEST(0, saldo_monedas - $1),
           avatar_activo_id = $2,
           actualizado_en = NOW()
       WHERE usuario_id = $3;`,
      [numericCost, cleanAvatarId, uid],
    );
    return {
      ok: true,
      operation: 'INSERT',
      source: 'postgresql',
      usuario_id: uid,
      avatar_id: cleanAvatarId,
    };
  }

  // 2. Supabase Client
  if (supabaseClient) {
    try {
      await supabaseClient.from('inventario_avatares_usuario').upsert({
        usuario_id: uid,
        avatar_id: cleanAvatarId,
      });

      const { data: perfil } = await supabaseClient
        .from('perfiles_gamificacion')
        .select('saldo_monedas')
        .eq('usuario_id', uid)
        .maybeSingle();

      if (perfil) {
        await supabaseClient
          .from('perfiles_gamificacion')
          .update({
            saldo_monedas: Math.max(0, Number(perfil.saldo_monedas || 0) - numericCost),
            avatar_activo_id: cleanAvatarId,
            actualizado_en: new Date().toISOString(),
          })
          .eq('usuario_id', uid);
      }
    } catch {
      /* continúa al almacén relacional */
    }
  }

  // 3. Almacén relacional 3FN
  const store = getRelationalStore();
  const alreadyOwned = store.inventario_avatares_usuario.some(
    (i) => Number(i.usuario_id) === uid && String(i.avatar_id) === cleanAvatarId,
  );
  if (!alreadyOwned) {
    store.inventario_avatares_usuario.push({
      usuario_id: uid,
      avatar_id: cleanAvatarId,
      desbloqueado_en: new Date().toISOString(),
    });
  }
  store.perfiles_gamificacion = store.perfiles_gamificacion.map((p) =>
    Number(p.usuario_id) === uid
      ? {
          ...p,
          saldo_monedas: Math.max(0, Number(p.saldo_monedas || 0) - numericCost),
          avatar_activo_id: cleanAvatarId,
        }
      : p,
  );
  saveRelationalStore(store);

  return {
    ok: true,
    operation: 'INSERT',
    source: supabaseClient ? 'supabase' : 'relational-3fn',
    usuario_id: uid,
    avatar_id: cleanAvatarId,
  };
}

/**
 * UPDATE: Actualiza XP, monedas y progreso tras ganar una misión ('perfiles_gamificacion' + 'progreso_misiones_usuario').
 */
export async function updateRewardsAfterMission({
  usuarioId,
  misionId,
  xpGanado = 10,
  monedasGanadas = 10,
  estrellas = 3,
  intentos = 1,
  evidencia = 'Misión completada',
}) {
  const uid = Number(usuarioId) || 1;
  const cleanMissionId = String(misionId || 'sequence-forest').trim();
  const addXp = Math.max(0, Number(xpGanado) || 10);
  const addCoins = Math.max(0, Number(monedasGanadas) || 10);

  // 1. PostgreSQL directo
  const pgUpd = await executePostgresQuery(
    `UPDATE perfiles_gamificacion
     SET puntos_xp = puntos_xp + $1,
         saldo_monedas = saldo_monedas + $2,
         ultima_fecha_actividad = CURRENT_DATE,
         actualizado_en = NOW()
     WHERE usuario_id = $3
     RETURNING usuario_id, puntos_xp, nivel_actual, saldo_monedas, dias_racha;`,
    [addXp, addCoins, uid],
  );

  if (pgUpd) {
    await executePostgresQuery(
      `INSERT INTO progreso_misiones_usuario
         (usuario_id, mision_id, estado, estrellas_ganadas, cantidad_intentos, ultima_evidencia, completada_en, actualizado_en)
       VALUES ($1, $2, 'completada', $3, $4, $5, NOW(), NOW())
       ON CONFLICT (usuario_id, mision_id) DO UPDATE
       SET estado = 'completada',
           estrellas_ganadas = GREATEST(progreso_misiones_usuario.estrellas_ganadas, EXCLUDED.estrellas_ganadas),
           cantidad_intentos = progreso_misiones_usuario.cantidad_intentos + EXCLUDED.cantidad_intentos,
           ultima_evidencia = EXCLUDED.ultima_evidencia,
           completada_en = NOW(),
           actualizado_en = NOW();`,
      [uid, cleanMissionId, estrellas, intentos, evidencia],
    );
    return { ok: true, operation: 'UPDATE', source: 'postgresql', profile: pgUpd[0] };
  }

  // 2. Supabase Client
  if (supabaseClient) {
    try {
      await supabaseClient.from('progreso_misiones_usuario').upsert({
        usuario_id: uid,
        mision_id: cleanMissionId,
        estado: 'completada',
        estrellas_ganadas: estrellas,
        cantidad_intentos: intentos,
        ultima_evidencia: evidencia,
        completada_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      });

      const { data: current } = await supabaseClient
        .from('perfiles_gamificacion')
        .select('puntos_xp, saldo_monedas')
        .eq('usuario_id', uid)
        .maybeSingle();

      if (current) {
        await supabaseClient
          .from('perfiles_gamificacion')
          .update({
            puntos_xp: Number(current.puntos_xp || 0) + addXp,
            saldo_monedas: Number(current.saldo_monedas || 0) + addCoins,
            actualizado_en: new Date().toISOString(),
          })
          .eq('usuario_id', uid);
      }
    } catch {
      /* continúa al almacén relacional */
    }
  }

  // 3. Almacén relacional 3FN
  const store = getRelationalStore();
  let updatedProfile = null;
  store.perfiles_gamificacion = store.perfiles_gamificacion.map((p) => {
    if (Number(p.usuario_id) !== uid) return p;
    const nextXp = Number(p.puntos_xp || 0) + addXp;
    updatedProfile = {
      ...p,
      puntos_xp: nextXp,
      nivel_actual: Math.floor(nextXp / 100) + 1,
      saldo_monedas: Number(p.saldo_monedas || 0) + addCoins,
    };
    return updatedProfile;
  });

  const existingProgIdx = store.progreso_misiones_usuario.findIndex(
    (pmu) => Number(pmu.usuario_id) === uid && String(pmu.mision_id) === cleanMissionId,
  );
  if (existingProgIdx >= 0) {
    const prev = store.progreso_misiones_usuario[existingProgIdx];
    store.progreso_misiones_usuario[existingProgIdx] = {
      ...prev,
      estado: 'completada',
      estrellas_ganadas: Math.max(Number(prev.estrellas_ganadas || 0), estrellas),
      cantidad_intentos: Number(prev.cantidad_intentos || 0) + intentos,
      ultima_evidencia: evidencia,
    };
  } else {
    store.progreso_misiones_usuario.push({
      usuario_id: uid,
      mision_id: cleanMissionId,
      estado: 'completada',
      estrellas_ganadas: estrellas,
      cantidad_intentos: intentos,
      ultima_evidencia: evidencia,
    });
  }
  saveRelationalStore(store);

  return {
    ok: true,
    operation: 'UPDATE',
    source: supabaseClient ? 'supabase' : 'relational-3fn',
    profile: updatedProfile,
  };
}

/**
 * UPDATE: Cambia el avatar activo del estudiante en 'perfiles_gamificacion'.
 */
export async function changeActiveAvatar({ usuarioId, avatarId }) {
  const uid = Number(usuarioId) || 1;
  const cleanAvatarId = String(avatarId || 'dragon').trim();

  const pgUpd = await executePostgresQuery(
    `UPDATE perfiles_gamificacion
     SET avatar_activo_id = $1, actualizado_en = NOW()
     WHERE usuario_id = $2
     RETURNING usuario_id, avatar_activo_id;`,
    [cleanAvatarId, uid],
  );
  if (pgUpd) {
    return { ok: true, operation: 'UPDATE', source: 'postgresql', updated: pgUpd[0] };
  }

  if (supabaseClient) {
    try {
      await supabaseClient
        .from('perfiles_gamificacion')
        .update({ avatar_activo_id: cleanAvatarId, actualizado_en: new Date().toISOString() })
        .eq('usuario_id', uid);
    } catch {
      /* continúa al almacén relacional */
    }
  }

  const store = getRelationalStore();
  store.perfiles_gamificacion = store.perfiles_gamificacion.map((p) =>
    Number(p.usuario_id) === uid ? { ...p, avatar_activo_id: cleanAvatarId } : p,
  );
  saveRelationalStore(store);

  return {
    ok: true,
    operation: 'UPDATE',
    source: supabaseClient ? 'supabase' : 'relational-3fn',
    usuario_id: uid,
    avatar_activo_id: cleanAvatarId,
  };
}
