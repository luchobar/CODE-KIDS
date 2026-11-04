-- =============================================================================
-- CODEKIDS — TAREA 4: Módulo de Informes y Consultas SQL Analíticas Avanzadas
-- Archivo: /sql/04_analytical_queries.sql
-- Motor: PostgreSQL 16+ / Supabase
-- Descripción:
--   Consultas SQL analíticas con múltiples JOINs, GROUP BY, HAVING, funciones
--   de agregación (AVG, COUNT, SUM, MIN, MAX) y subconsultas correlacionadas.
-- =============================================================================

-- =============================================================================
-- INFORME 1: Estudiantes en Riesgo Pedagógico por Aula (Consola Docente)
-- Usa SELECT, INNER JOIN múltiple, GROUP BY, HAVING AVG(entregas_retos.puntuacion) < 3.0
-- y subconsulta correlacionada para calcular el total de intentos en el mapa.
-- =============================================================================
SELECT
    a.id                                            AS aula_id,
    a.codigo_grupo                                  AS codigo_aula,
    a.nombre_grupo                                  AS nombre_aula,
    a.grado                                         AS grado,
    u.id                                            AS estudiante_id,
    u.nombre                                        AS estudiante_nombre,
    u.correo                                        AS estudiante_correo,
    COUNT(er.id)                                    AS total_entregas_evaluadas,
    ROUND(AVG(er.puntuacion), 2)                    AS promedio_puntuacion,
    ROUND(AVG(er.puntaje), 1)                       AS promedio_porcentaje,
    MIN(er.puntuacion)                              AS nota_minima,
    MAX(er.puntuacion)                              AS nota_maxima,
    SUM(er.cantidad_intentos)                       AS intentos_en_retos,
    COALESCE((
        SELECT ROUND(AVG(pmu.cantidad_intentos), 2)
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
GROUP BY
    a.id,
    a.codigo_grupo,
    a.nombre_grupo,
    a.grado,
    u.id,
    u.nombre,
    u.correo
HAVING AVG(er.puntuacion) < 3.0
ORDER BY promedio_puntuacion ASC, intentos_en_retos DESC;


-- =============================================================================
-- INFORME 2: Desafíos con Mayor Tasa de Reintentos (Análisis Curricular)
-- Usa COUNT(), AVG(cantidad_intentos), SUM() e INNER JOIN entre misiones,
-- mundos y progreso_misiones_usuario ordenado descendentemente.
-- =============================================================================
SELECT
    m.id                                            AS mision_id,
    m.titulo_ejercicio                              AS titulo_ejercicio,
    m.nombre_corto                                  AS nombre_corto,
    m.nivel_dificultad                              AS nivel_dificultad,
    w.titulo                                        AS mundo_titulo,
    w.tematica_habilidad                            AS habilidad,
    COUNT(pmu.usuario_id)                           AS estudiantes_que_intentaron,
    SUM(pmu.cantidad_intentos)                      AS total_intentos_acumulados,
    ROUND(AVG(pmu.cantidad_intentos), 2)            AS promedio_intentos,
    MAX(pmu.cantidad_intentos)                      AS maximo_intentos_registrado,
    COUNT(CASE WHEN pmu.estado = 'completada' THEN 1 END) AS total_completadas,
    ROUND(
        (SUM(GREATEST(pmu.cantidad_intentos - 1, 0))::numeric /
         NULLIF(COUNT(pmu.usuario_id), 0)),
        2
    )                                               AS tasa_reintentos_por_estudiante
FROM misiones m
INNER JOIN mundos w                     ON w.id = m.mundo_id
INNER JOIN progreso_misiones_usuario pmu ON pmu.mision_id = m.id
WHERE pmu.cantidad_intentos > 0
GROUP BY
    m.id,
    m.titulo_ejercicio,
    m.nombre_corto,
    m.nivel_dificultad,
    w.titulo,
    w.tematica_habilidad
HAVING AVG(pmu.cantidad_intentos) >= 1.0
ORDER BY promedio_intentos DESC, total_intentos_acumulados DESC;


-- =============================================================================
-- INFORME 3: Economía Gamificada y Uso de la Tienda de Avatares (Administrador)
-- Usa SUM(saldo_monedas), AVG(puntos_xp) y COUNT(inventario_avatares_usuario.avatar_id)
-- con LEFT JOIN para medir el poder adquisitivo, circulación de monedas y compras.
-- =============================================================================
SELECT
    u.id                                                    AS usuario_id,
    u.nombre                                                AS estudiante,
    u.correo                                                AS correo,
    COALESCE(pg.nivel_actual, 1)                            AS nivel_actual,
    COALESCE(pg.puntos_xp, 0)                               AS puntos_xp,
    COALESCE(pg.saldo_monedas, 0)                           AS saldo_monedas_actual,
    COALESCE(pg.dias_racha, 0)                              AS dias_racha,
    COUNT(iau.avatar_id)                                    AS total_avatares_desbloqueados,
    COALESCE(SUM(ca.costo_monedas), 0)                      AS monedas_invertidas_en_tienda,
    (COALESCE(pg.saldo_monedas, 0) + COALESCE(SUM(ca.costo_monedas), 0)) AS riqueza_total_generada,
    (
        SELECT COUNT(iu.insignia_id)
        FROM insignias_usuario iu
        WHERE iu.usuario_id = u.id
    )                                                       AS total_insignias_ganadas
FROM usuarios u
LEFT JOIN perfiles_gamificacion pg        ON pg.usuario_id = u.id
LEFT JOIN inventario_avatares_usuario iau ON iau.usuario_id = u.id
LEFT JOIN catalogo_avatares ca            ON ca.id = iau.avatar_id
WHERE u.rol = 'estudiante'
GROUP BY
    u.id,
    u.nombre,
    u.correo,
    pg.nivel_actual,
    pg.puntos_xp,
    pg.saldo_monedas,
    pg.dias_racha
ORDER BY monedas_invertidas_en_tienda DESC, saldo_monedas_actual DESC;

-- Resumen global agregado de Economía Gamificada (KPIs para el Administrador):
SELECT
    COUNT(DISTINCT u.id)                                    AS total_estudiantes_activos,
    COALESCE(SUM(pg.saldo_monedas), 0)                      AS masa_monetaria_en_circulacion,
    ROUND(AVG(pg.saldo_monedas), 2)                         AS promedio_monedas_por_estudiante,
    COALESCE(SUM(pg.puntos_xp), 0)                          AS xp_total_ecosistema,
    COUNT(iau.avatar_id)                                    AS total_desbloqueos_tienda
FROM usuarios u
LEFT JOIN perfiles_gamificacion pg        ON pg.usuario_id = u.id
LEFT JOIN inventario_avatares_usuario iau ON iau.usuario_id = u.id
WHERE u.rol = 'estudiante';
