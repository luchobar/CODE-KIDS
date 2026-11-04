/**
 * CAPA DE LÓGICA DE NEGOCIO — MÓDULO DE INFORMES Y CONSULTAS SQL AVANZADAS
 * Archivo: /src/services/reports.service.js
 * Descripción:
 *   Implementa las 3 consultas analíticas complejas exigidas en la Rúbrica (Tarea 4):
 *     1. Informe de Estudiantes en Riesgo Pedagógico (Docente) — JOINs, GROUP BY, HAVING AVG(entregas_retos.puntuacion) < 3.0
 *     2. Informe de Desafíos con Mayor Tasa de Reintentos — COUNT(), AVG(cantidad_intentos), INNER JOIN, ORDER BY DESC
 *     3. Informe de Economía Gamificada (Administrador) — SUM(saldo_monedas), COUNT(inventario_avatares_usuario.avatar_id), LEFT JOIN
 */

import {
  executePostgresQuery,
  getRelationalStore,
  supabaseClient,
} from './db.client.js';

export const ANALYTICAL_SQL_QUERIES = {
  AT_RISK_STUDENTS: `
    SELECT
        a.id                                            AS aula_id,
        a.codigo_grupo                                  AS codigo_aula,
        a.nombre_grupo                                  AS nombre_aula,
        a.grado                                         AS grado,
        u.id                                            AS estudiante_id,
        u.nombre                                        AS estudiante_nombre,
        u.correo                                        AS estudiante_correo,
        COUNT(er.id)::int                               AS total_entregas_evaluadas,
        ROUND(AVG(er.puntuacion), 2)::float             AS promedio_puntuacion,
        ROUND(AVG(er.puntaje), 1)::float                AS promedio_porcentaje,
        MIN(er.puntuacion)::float                       AS nota_minima,
        MAX(er.puntuacion)::float                       AS nota_maxima,
        SUM(er.cantidad_intentos)::int                  AS intentos_en_retos,
        COALESCE((
            SELECT ROUND(AVG(pmu.cantidad_intentos), 2)::float
            FROM progreso_misiones_usuario pmu
            WHERE pmu.usuario_id = u.id
        ), 0)                                           AS promedio_intentos_mapa,
        CASE
            WHEN AVG(er.puntuacion) < 2.5 THEN 'Riesgo Alto - Intervención Inmediata'
            ELSE 'Riesgo Moderado - Refuerzo Guiado'
        END                                             AS nivel_alerta_pedagogica
    FROM usuarios u
    INNER JOIN matriculas_aula ma ON ma.estudiante_id = u.id
    INNER JOIN aulas a            ON a.id = ma.aula_id
    INNER JOIN entregas_retos er  ON er.estudiante_id = u.id
    INNER JOIN retos_aula ra      ON ra.id = er.reto_id AND ra.aula_id = a.id
    WHERE u.rol = 'estudiante'
      AND u.activo = TRUE
      AND ($1::text IS NULL OR a.codigo_grupo = $1)
    GROUP BY
        a.id, a.codigo_grupo, a.nombre_grupo, a.grado,
        u.id, u.nombre, u.correo
    HAVING AVG(er.puntuacion) < $2::numeric
    ORDER BY promedio_puntuacion ASC, intentos_en_retos DESC;
  `,

  HIGH_RETRY_MISSIONS: `
    SELECT
        m.id                                            AS mision_id,
        m.titulo_ejercicio                              AS titulo_ejercicio,
        m.nombre_corto                                  AS nombre_corto,
        m.nivel_dificultad                              AS nivel_dificultad,
        w.titulo                                        AS mundo_titulo,
        w.tematica_habilidad                            AS habilidad,
        COUNT(pmu.usuario_id)::int                      AS estudiantes_que_intentaron,
        SUM(pmu.cantidad_intentos)::int                 AS total_intentos_acumulados,
        ROUND(AVG(pmu.cantidad_intentos), 2)::float     AS promedio_intentos,
        MAX(pmu.cantidad_intentos)::int                 AS maximo_intentos_registrado,
        COUNT(CASE WHEN pmu.estado = 'completada' THEN 1 END)::int AS total_completadas,
        ROUND(
            (SUM(GREATEST(pmu.cantidad_intentos - 1, 0))::numeric /
             NULLIF(COUNT(pmu.usuario_id), 0)),
            2
        )::float                                        AS tasa_reintentos_por_estudiante
    FROM misiones m
    INNER JOIN mundos w                      ON w.id = m.mundo_id
    INNER JOIN progreso_misiones_usuario pmu ON pmu.mision_id = m.id
    WHERE pmu.cantidad_intentos > 0
    GROUP BY
        m.id, m.titulo_ejercicio, m.nombre_corto,
        m.nivel_dificultad, w.titulo, w.tematica_habilidad
    HAVING AVG(pmu.cantidad_intentos) >= 1.0
    ORDER BY promedio_intentos DESC, total_intentos_acumulados DESC;
  `,

  GAMIFIED_ECONOMY: `
    SELECT
        u.id                                                    AS usuario_id,
        u.nombre                                                AS estudiante,
        u.correo                                                AS correo,
        COALESCE(pg.nivel_actual, 1)::int                       AS nivel_actual,
        COALESCE(pg.puntos_xp, 0)::int                          AS puntos_xp,
        COALESCE(pg.saldo_monedas, 0)::int                      AS saldo_monedas_actual,
        COALESCE(pg.dias_racha, 0)::int                         AS dias_racha,
        COUNT(iau.avatar_id)::int                               AS total_avatares_desbloqueados,
        COALESCE(SUM(ca.costo_monedas), 0)::int                 AS monedas_invertidas_en_tienda,
        (COALESCE(pg.saldo_monedas, 0) + COALESCE(SUM(ca.costo_monedas), 0))::int AS riqueza_total_generada,
        (
            SELECT COUNT(iu.insignia_id)::int
            FROM insignias_usuario iu
            WHERE iu.usuario_id = u.id
        )                                                       AS total_insignias_ganadas
    FROM usuarios u
    LEFT JOIN perfiles_gamificacion pg        ON pg.usuario_id = u.id
    LEFT JOIN inventario_avatares_usuario iau ON iau.usuario_id = u.id
    LEFT JOIN catalogo_avatares ca            ON ca.id = iau.avatar_id
    WHERE u.rol = 'estudiante'
    GROUP BY
        u.id, u.nombre, u.correo,
        pg.nivel_actual, pg.puntos_xp, pg.saldo_monedas, pg.dias_racha
    ORDER BY monedas_invertidas_en_tienda DESC, saldo_monedas_actual DESC;
  `,
};

/**
 * Carga las tablas necesarias desde Supabase (si está activo) fusionándolas con el almacén relacional
 * para que los informes analíticos reflejen tanto los datos en vivo de Supabase como la semilla pedagógica.
 */
async function loadRelationalDatasetForReports() {
  const base = getRelationalStore();
  if (!supabaseClient) return base;

  try {
    const [
      { data: usuarios },
      { data: perfiles },
      { data: avatares },
      { data: inventario },
      { data: insigniasUsuario },
      { data: mundos },
      { data: misiones },
      { data: progreso },
      { data: aulas },
      { data: matriculas },
      { data: retos },
      { data: entregas },
    ] = await Promise.all([
      supabaseClient.from('usuarios').select('*'),
      supabaseClient.from('perfiles_gamificacion').select('*'),
      supabaseClient.from('catalogo_avatares').select('*'),
      supabaseClient.from('inventario_avatares_usuario').select('*'),
      supabaseClient.from('insignias_usuario').select('*'),
      supabaseClient.from('mundos').select('*'),
      supabaseClient.from('misiones').select('*'),
      supabaseClient.from('progreso_misiones_usuario').select('*'),
      supabaseClient.from('aulas').select('*'),
      supabaseClient.from('matriculas_aula').select('*'),
      supabaseClient.from('retos_aula').select('*'),
      supabaseClient.from('entregas_retos').select('*'),
    ]);

    return {
      usuarios: usuarios?.length ? usuarios : base.usuarios,
      perfiles_gamificacion: perfiles?.length ? perfiles : base.perfiles_gamificacion,
      catalogo_avatares: avatares?.length ? avatares : base.catalogo_avatares,
      inventario_avatares_usuario: inventario?.length ? inventario : base.inventario_avatares_usuario,
      insignias_usuario: insigniasUsuario?.length ? insigniasUsuario : base.insignias_usuario,
      mundos: mundos?.length ? mundos : base.mundos,
      misiones: misiones?.length ? misiones : base.misiones,
      progreso_misiones_usuario: progreso?.length ? progreso : base.progreso_misiones_usuario,
      aulas: aulas?.length ? aulas : base.aulas,
      matriculas_aula: matriculas?.length ? matriculas : base.matriculas_aula,
      retos_aula: retos?.length ? retos : base.retos_aula,
      entregas_retos: entregas?.length ? entregas : base.entregas_retos,
    };
  } catch {
    return base;
  }
}

/**
 * 1. Informe de Estudiantes en Riesgo Pedagógico (Docente)
 * Aplica SELECT, INNER JOIN múltiple, GROUP BY y HAVING AVG(entregas_retos.puntuacion) < 3.0
 */
export async function getAtRiskStudentsReport({ aulaCodigo = null, threshold = 3.0 } = {}) {
  const maxAvg = Number(threshold) || 3.0;
  const cleanAula = aulaCodigo ? String(aulaCodigo).trim() : null;

  // 1. Ejecución nativa en PostgreSQL si DATABASE_URL está disponible
  const pgRows = await executePostgresQuery(ANALYTICAL_SQL_QUERIES.AT_RISK_STUDENTS, [
    cleanAula,
    maxAvg,
  ]);
  if (pgRows) {
    return {
      ok: true,
      source: 'postgresql',
      sql: ANALYTICAL_SQL_QUERIES.AT_RISK_STUDENTS.trim(),
      threshold: maxAvg,
      rows: pgRows,
    };
  }

  // 2. Ejecución sobre datos de Supabase / Almacén Relacional 3FN
  const ds = await loadRelationalDatasetForReports();
  const aulasById = new Map(ds.aulas.map((a) => [Number(a.id), a]));
  const retosById = new Map(ds.retos_aula.map((r) => [Number(r.id), r]));
  const usuariosById = new Map(
    ds.usuarios
      .filter((u) => (u.rol === 'estudiante' || u.rol === 'student') && u.activo !== false)
      .map((u) => [Number(u.id), u]),
  );

  // Subconsulta correlacionada: promedio de intentos en el mapa por usuario
  const mapAttemptsByUser = new Map();
  for (const pmu of ds.progreso_misiones_usuario) {
    const uid = Number(pmu.usuario_id);
    const list = mapAttemptsByUser.get(uid) || [];
    list.push(Number(pmu.cantidad_intentos || 0));
    mapAttemptsByUser.set(uid, list);
  }

  // Agrupación (GROUP BY aula_id, estudiante_id) tras INNER JOINs
  const groups = new Map();

  for (const matricula of ds.matriculas_aula) {
    const aula = aulasById.get(Number(matricula.aula_id));
    const user = usuariosById.get(Number(matricula.estudiante_id));
    if (!aula || !user) continue;

    const codigoAula = aula.codigo_grupo || aula.codigo_acceso;
    if (cleanAula && codigoAula !== cleanAula) continue;

    // INNER JOIN entregas_retos & retos_aula
    const studentDeliveries = ds.entregas_retos.filter((er) => {
      if (Number(er.estudiante_id) !== Number(user.id)) return false;
      const reto = retosById.get(Number(er.reto_id));
      return reto && Number(reto.aula_id) === Number(aula.id);
    });

    if (studentDeliveries.length === 0) continue;

    const key = `${aula.id}::${user.id}`;
    const puntuaciones = studentDeliveries.map((er) => {
      if (er.puntuacion !== undefined && er.puntuacion !== null && Number(er.puntuacion) > 0) {
        return Number(er.puntuacion);
      }
      return Number(((Number(er.puntaje || 0) / 20)).toFixed(2));
    });
    const puntajes = studentDeliveries.map((er) =>
      er.puntaje !== undefined && er.puntaje !== null && Number(er.puntaje) > 0
        ? Number(er.puntaje)
        : Math.round(Number(er.puntuacion || 0) * 20),
    );
    const intentosRetos = studentDeliveries.reduce(
      (acc, er) => acc + Number(er.cantidad_intentos || 1),
      0,
    );

    const avgPuntuacion = Number(
      (puntuaciones.reduce((a, b) => a + b, 0) / puntuaciones.length).toFixed(2),
    );
    const avgPorcentaje = Number(
      (puntajes.reduce((a, b) => a + b, 0) / puntajes.length).toFixed(1),
    );

    // Cláusula HAVING AVG(entregas_retos.puntuacion) < 3.0
    if (avgPuntuacion < maxAvg) {
      const mapList = mapAttemptsByUser.get(Number(user.id)) || [];
      const avgMapAttempts = mapList.length
        ? Number((mapList.reduce((a, b) => a + b, 0) / mapList.length).toFixed(2))
        : 0;

      groups.set(key, {
        aula_id: Number(aula.id),
        codigo_aula: codigoAula,
        nombre_aula: aula.nombre_grupo || aula.nombre,
        grado: aula.grado || 'Primaria',
        estudiante_id: Number(user.id),
        estudiante_nombre: user.nombre,
        estudiante_correo: user.correo,
        total_entregas_evaluadas: studentDeliveries.length,
        promedio_puntuacion: avgPuntuacion,
        promedio_porcentaje: avgPorcentaje,
        nota_minima: Math.min(...puntuaciones),
        nota_maxima: Math.max(...puntuaciones),
        intentos_en_retos: intentosRetos,
        promedio_intentos_mapa: avgMapAttempts,
        nivel_alerta_pedagogica:
          avgPuntuacion < 2.5
            ? 'Riesgo Alto - Intervención Inmediata'
            : 'Riesgo Moderado - Refuerzo Guiado',
      });
    }
  }

  const rows = Array.from(groups.values()).sort(
    (a, b) =>
      a.promedio_puntuacion - b.promedio_puntuacion ||
      b.intentos_en_retos - a.intentos_en_retos,
  );

  return {
    ok: true,
    source: supabaseClient ? 'supabase' : 'relational-3fn',
    sql: ANALYTICAL_SQL_QUERIES.AT_RISK_STUDENTS.trim(),
    threshold: maxAvg,
    rows,
  };
}

/**
 * 2. Informe de Desafíos con Mayor Tasa de Reintentos
 * Usa COUNT(), AVG(cantidad_intentos) e INNER JOIN entre misiones y progreso_misiones_usuario
 * ordenado descendentemente.
 */
export async function getHighRetryMissionsReport() {
  const pgRows = await executePostgresQuery(ANALYTICAL_SQL_QUERIES.HIGH_RETRY_MISSIONS);
  if (pgRows) {
    return {
      ok: true,
      source: 'postgresql',
      sql: ANALYTICAL_SQL_QUERIES.HIGH_RETRY_MISSIONS.trim(),
      rows: pgRows,
    };
  }

  const ds = await loadRelationalDatasetForReports();
  const mundosById = new Map(ds.mundos.map((w) => [String(w.id), w]));
  const misionesById = new Map(ds.misiones.map((m) => [String(m.id), m]));

  // INNER JOIN entre misiones, mundos y progreso_misiones_usuario
  const groupedByMission = new Map();

  for (const pmu of ds.progreso_misiones_usuario) {
    const intentos = Number(pmu.cantidad_intentos || 0);
    if (intentos <= 0) continue;

    const mision = misionesById.get(String(pmu.mision_id));
    if (!mision) continue;
    const mundo = mundosById.get(String(mision.mundo_id)) || {
      titulo: 'Mundo Principal',
      tematica_habilidad: 'Secuencias',
    };

    const current = groupedByMission.get(mision.id) || {
      mision,
      mundo,
      attemptsList: [],
      completedCount: 0,
    };

    current.attemptsList.push(intentos);
    if (pmu.estado === 'completada') {
      current.completedCount += 1;
    }
    groupedByMission.set(mision.id, current);
  }

  const rows = Array.from(groupedByMission.values())
    .map(({ mision, mundo, attemptsList, completedCount }) => {
      const countStudents = attemptsList.length;
      const totalAttempts = attemptsList.reduce((a, b) => a + b, 0);
      const avgAttempts = Number((totalAttempts / countStudents).toFixed(2));
      const maxAttempts = Math.max(...attemptsList);
      const retriesSum = attemptsList.reduce((acc, n) => acc + Math.max(0, n - 1), 0);
      const retryRate = Number((retriesSum / countStudents).toFixed(2));

      return {
        mision_id: mision.id,
        titulo_ejercicio: mision.titulo_ejercicio || mision.titulo || mision.id,
        nombre_corto: mision.nombre_corto || mision.titulo_ejercicio || mision.id,
        nivel_dificultad: mision.nivel_dificultad || 'Inicio',
        mundo_titulo: mundo.titulo,
        habilidad: mundo.tematica_habilidad || 'Secuencias',
        estudiantes_que_intentaron: countStudents,
        total_intentos_acumulados: totalAttempts,
        promedio_intentos: avgAttempts,
        maximo_intentos_registrado: maxAttempts,
        total_completadas: completedCount,
        tasa_reintentos_por_estudiante: retryRate,
      };
    })
    .filter((row) => row.promedio_intentos >= 1.0)
    .sort(
      (a, b) =>
        b.promedio_intentos - a.promedio_intentos ||
        b.total_intentos_acumulados - a.total_intentos_acumulados,
    );

  return {
    ok: true,
    source: supabaseClient ? 'supabase' : 'relational-3fn',
    sql: ANALYTICAL_SQL_QUERIES.HIGH_RETRY_MISSIONS.trim(),
    rows,
  };
}

/**
 * 3. Informe de Economía Gamificada (Administrador)
 * Usa SUM(saldo_monedas) y COUNT(inventario_avatares_usuario.avatar_id) con LEFT JOIN
 * para medir el uso de la tienda y la masa monetaria.
 */
export async function getGamifiedEconomyReport() {
  const pgRows = await executePostgresQuery(ANALYTICAL_SQL_QUERIES.GAMIFIED_ECONOMY);
  if (pgRows) {
    const totalCoins = pgRows.reduce((acc, r) => acc + Number(r.saldo_monedas_actual || 0), 0);
    const totalSpent = pgRows.reduce((acc, r) => acc + Number(r.monedas_invertidas_en_tienda || 0), 0);
    const totalUnlocks = pgRows.reduce((acc, r) => acc + Number(r.total_avatares_desbloqueados || 0), 0);
    const totalXp = pgRows.reduce((acc, r) => acc + Number(r.puntos_xp || 0), 0);

    return {
      ok: true,
      source: 'postgresql',
      sql: ANALYTICAL_SQL_QUERIES.GAMIFIED_ECONOMY.trim(),
      summary: {
        total_estudiantes_activos: pgRows.length,
        masa_monetaria_en_circulacion: totalCoins,
        monedas_gastadas_en_tienda: totalSpent,
        promedio_monedas_por_estudiante: pgRows.length ? Number((totalCoins / pgRows.length).toFixed(2)) : 0,
        xp_total_ecosistema: totalXp,
        total_desbloqueos_tienda: totalUnlocks,
      },
      rows: pgRows,
    };
  }

  const ds = await loadRelationalDatasetForReports();
  const perfilesByUser = new Map(
    ds.perfiles_gamificacion.map((p) => [Number(p.usuario_id), p]),
  );
  const avatarCostById = new Map(
    ds.catalogo_avatares.map((a) => [String(a.id), Number(a.costo_monedas || 0)]),
  );

  const students = ds.usuarios.filter(
    (u) => u.rol === 'estudiante' || u.rol === 'student',
  );

  // LEFT JOIN usuarios -> perfiles_gamificacion -> inventario_avatares_usuario -> catalogo_avatares
  const rows = students
    .map((u) => {
      const uid = Number(u.id);
      const perfil = perfilesByUser.get(uid);
      const ownedRows = ds.inventario_avatares_usuario.filter(
        (item) => Number(item.usuario_id) === uid,
      );
      const badgesRows = (ds.insignias_usuario || []).filter(
        (b) => Number(b.usuario_id) === uid,
      );

      const coinsSpent = ownedRows.reduce(
        (sum, item) => sum + (avatarCostById.get(String(item.avatar_id)) || 0),
        0,
      );
      const currentCoins = Number(perfil?.saldo_monedas ?? 0);
      const currentXp = Number(perfil?.puntos_xp ?? 0);
      const currentLevel = Number(perfil?.nivel_actual ?? Math.floor(currentXp / 100) + 1);

      return {
        usuario_id: uid,
        estudiante: u.nombre,
        correo: u.correo,
        nivel_actual: currentLevel,
        puntos_xp: currentXp,
        saldo_monedas_actual: currentCoins,
        dias_racha: Number(perfil?.dias_racha ?? 1),
        total_avatares_desbloqueados: ownedRows.length,
        monedas_invertidas_en_tienda: coinsSpent,
        riqueza_total_generada: currentCoins + coinsSpent,
        total_insignias_ganadas: badgesRows.length,
      };
    })
    .sort(
      (a, b) =>
        b.monedas_invertidas_en_tienda - a.monedas_invertidas_en_tienda ||
        b.saldo_monedas_actual - a.saldo_monedas_actual,
    );

  const totalCoins = rows.reduce((acc, r) => acc + r.saldo_monedas_actual, 0);
  const totalSpent = rows.reduce((acc, r) => acc + r.monedas_invertidas_en_tienda, 0);
  const totalUnlocks = rows.reduce((acc, r) => acc + r.total_avatares_desbloqueados, 0);
  const totalXp = rows.reduce((acc, r) => acc + r.puntos_xp, 0);

  return {
    ok: true,
    source: supabaseClient ? 'supabase' : 'relational-3fn',
    sql: ANALYTICAL_SQL_QUERIES.GAMIFIED_ECONOMY.trim(),
    summary: {
      total_estudiantes_activos: rows.length,
      masa_monetaria_en_circulacion: totalCoins,
      monedas_gastadas_en_tienda: totalSpent,
      promedio_monedas_por_estudiante: rows.length
        ? Number((totalCoins / rows.length).toFixed(2))
        : 0,
      xp_total_ecosistema: totalXp,
      total_desbloqueos_tienda: totalUnlocks,
    },
    rows,
  };
}

/**
 * Obtiene los 3 informes analíticos consolidados para la Consola Docente / Administrador.
 */
export async function getAllAnalyticalReports({ aulaCodigo = null, threshold = 3.0 } = {}) {
  const [atRisk, highRetry, economy] = await Promise.all([
    getAtRiskStudentsReport({ aulaCodigo, threshold }),
    getHighRetryMissionsReport(),
    getGamifiedEconomyReport(),
  ]);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    atRiskStudents: atRisk,
    highRetryMissions: highRetry,
    gamifiedEconomy: economy,
  };
}
