import { resolveAulaIdByGroup } from './classroomStats.js';
import { callTier2Api } from './httpClient.js';
import {
  DEFAULT_DB_STUDENTS,
  parsePositiveIntId,
  REPORT_SQL_PREVIEW,
} from './seedData.js';
import { readClassroomCache } from './storageStore.js';

function buildClientFallbackAtRisk({ aulaCodigo = null, threshold = 3.0 } = {}) {
  const maxAvg = Number(threshold) || 3.0;
  const cache = readClassroomCache();
  const byStudent = new Map();

  for (const sub of cache.submissions || []) {
    if (aulaCodigo && sub.group !== aulaCodigo) continue;
    const key = `${sub.group || '5° A'}::${sub.studentId || sub.studentName}`;
    const list = byStudent.get(key) || [];
    list.push(sub);
    byStudent.set(key, list);
  }

  const rows = [];
  for (const [, subs] of byStudent.entries()) {
    const sample = subs[0];
    const scores = subs.map((s) => Number(s.score || 0) / 20);
    const avgPuntuacion = Number(
      (scores.reduce((acc, n) => acc + n, 0) / scores.length).toFixed(2),
    );
    if (avgPuntuacion >= maxAvg) continue;

    rows.push({
      aula_id: resolveAulaIdByGroup(sample.group, cache.courses) || 1,
      codigo_aula: sample.group || '5° A',
      nombre_aula: `Curso ${sample.group || '5° A'}`,
      estudiante_id: sample.studentId || sample.studentName,
      estudiante_nombre: sample.studentName || 'Estudiante',
      estudiante_correo: '',
      total_entregas_evaluadas: subs.length,
      promedio_puntuacion: avgPuntuacion,
      promedio_porcentaje: Number((avgPuntuacion * 20).toFixed(1)),
      intentos_en_retos: subs.reduce(
        (acc, s) => acc + Number(s.gameOutcome?.attempts || 1),
        0,
      ),
      promedio_intentos_mapa: 1,
      nivel_alerta_pedagogica:
        avgPuntuacion < 2.5
          ? 'Riesgo Alto - Intervención Inmediata'
          : 'Riesgo Moderado - Refuerzo Guiado',
    });
  }

  return {
    ok: true,
    source: 'client-cache',
    sql: REPORT_SQL_PREVIEW.AT_RISK_STUDENTS,
    threshold: maxAvg,
    rows: rows.sort((a, b) => a.promedio_puntuacion - b.promedio_puntuacion),
  };
}

function buildClientFallbackHighRetry() {
  const cache = readClassroomCache();
  const grouped = new Map();

  for (const sub of cache.submissions || []) {
    const missionId = sub.assignmentId || sub.assignmentTitle || 'mision';
    const current = grouped.get(missionId) || {
      mision_id: missionId,
      titulo_ejercicio: sub.assignmentTitle || 'Reto de clase',
      habilidad: sub.skill || 'Secuencias',
      mundo_titulo: 'Aula escolar',
      nivel_dificultad: 'Práctica',
      attempts: [],
    };
    current.attempts.push(Math.max(1, Number(sub.gameOutcome?.attempts || 1)));
    grouped.set(missionId, current);
  }

  const rows = Array.from(grouped.values())
    .map((item) => {
      const total = item.attempts.reduce((a, b) => a + b, 0);
      const avg = Number((total / item.attempts.length).toFixed(2));
      const retries = item.attempts.reduce((acc, n) => acc + Math.max(0, n - 1), 0);
      return {
        ...item,
        estudiantes_que_intentaron: item.attempts.length,
        total_intentos_acumulados: total,
        promedio_intentos: avg,
        maximo_intentos_registrado: Math.max(...item.attempts),
        tasa_reintentos_por_estudiante: Number((retries / item.attempts.length).toFixed(2)),
      };
    })
    .sort((a, b) => b.promedio_intentos - a.promedio_intentos);

  return {
    ok: true,
    source: 'client-cache',
    sql: REPORT_SQL_PREVIEW.HIGH_RETRY_MISSIONS,
    rows,
  };
}

function buildClientFallbackEconomy() {
  const rows = DEFAULT_DB_STUDENTS.map((s) => ({
    usuario_id: s.id,
    estudiante: s.name,
    correo: s.email,
    nivel_actual: s.level,
    puntos_xp: s.points,
    saldo_monedas_actual: s.coins,
    dias_racha: s.streak,
    total_avatares_desbloqueados: 2,
    monedas_invertidas_en_tienda: 30,
    riqueza_total_generada: s.coins + 30,
    total_insignias_ganadas: 1,
  }));

  const totalCoins = rows.reduce((acc, r) => acc + r.saldo_monedas_actual, 0);
  const totalXp = rows.reduce((acc, r) => acc + r.puntos_xp, 0);
  return {
    ok: true,
    source: 'client-cache',
    sql: REPORT_SQL_PREVIEW.GAMIFIED_ECONOMY,
    summary: {
      total_estudiantes_activos: rows.length,
      masa_monetaria_en_circulacion: totalCoins,
      monedas_gastadas_en_tienda: rows.length * 30,
      promedio_monedas_por_estudiante: rows.length
        ? Number((totalCoins / rows.length).toFixed(2))
        : 0,
      xp_total_ecosistema: totalXp,
      total_desbloqueos_tienda: rows.length * 2,
    },
    rows,
  };
}

/**
 * Obtiene el informe de estudiantes en riesgo pedagógico desde Tier 2 con respaldo local ligero.
 * Nunca importa `src/services/db.client.js` para evitar fugas de credenciales/pg al navegador.
 */
export async function getAtRiskStudentsReport({ aulaCodigo = null, threshold = 3.0 } = {}) {
  const params = new URLSearchParams({ threshold: String(threshold) });
  if (aulaCodigo) params.set('group', aulaCodigo);
  const apiRes = await callTier2Api(`/reports/at-risk-students?${params.toString()}`);
  if (apiRes?.httpOk && apiRes?.data?.ok) return apiRes.data;
  return buildClientFallbackAtRisk({ aulaCodigo, threshold });
}

/**
 * Obtiene el informe de desafíos con mayor tasa de reintentos.
 */
export async function getHighRetryMissionsReport() {
  const apiRes = await callTier2Api('/reports/high-retry-missions');
  if (apiRes?.httpOk && apiRes?.data?.ok) return apiRes.data;
  return buildClientFallbackHighRetry();
}

/**
 * Obtiene el informe de economía gamificada.
 */
export async function getGamifiedEconomyReport() {
  const apiRes = await callTier2Api('/reports/gamified-economy');
  if (apiRes?.httpOk && apiRes?.data?.ok) return apiRes.data;
  return buildClientFallbackEconomy();
}

/**
 * Obtiene los 3 informes analíticos consolidados vía `/api/v1/reports` con respaldo cliente seguro.
 */
export async function getAllAnalyticalReports({ aulaCodigo = null, threshold = 3.0 } = {}) {
  const params = new URLSearchParams({ threshold: String(threshold) });
  if (aulaCodigo) params.set('group', aulaCodigo);

  const apiRes = await callTier2Api(`/reports?${params.toString()}`);
  if (apiRes?.httpOk && apiRes?.data?.ok) return apiRes.data;

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    atRiskStudents: buildClientFallbackAtRisk({ aulaCodigo, threshold }),
    highRetryMissions: buildClientFallbackHighRetry(),
    gamifiedEconomy: buildClientFallbackEconomy(),
  };
}

/**
 * Consulta el ranking del curso resolviendo el ID de aula dinámicamente.
 */
export async function getClassroomRanking({ aulaId, codigoGrupo = '5° A' } = {}) {
  const resolvedId =
    parsePositiveIntId(aulaId) || resolveAulaIdByGroup(codigoGrupo) || 1;
  const apiRes = await callTier2Api(
    `/classrooms/${resolvedId}/ranking?group=${encodeURIComponent(codigoGrupo || '5° A')}`,
  );
  if (apiRes?.httpOk && apiRes?.data?.ok) return apiRes.data;

  const cache = readClassroomCache();
  const enrolledIds = new Set(
    (cache.enrollmentsByGroup?.[codigoGrupo] || []).map((id) => Number(id)),
  );
  const ranking = DEFAULT_DB_STUDENTS.filter((s) =>
    enrolledIds.size ? enrolledIds.has(Number(s.id)) : true,
  )
    .sort((a, b) => b.points - a.points)
    .map((s, idx) => ({
      posicion: idx + 1,
      estudiante_id: s.id,
      nombre: s.name,
      correo: s.email,
      nivel_actual: s.level,
      puntos_xp: s.points,
      saldo_monedas: s.coins,
      misiones_completadas: s.completedCount,
    }));

  return { ok: true, source: 'client-cache', ranking };
}
