import assert from 'node:assert/strict';
import test from 'node:test';
import {
  registerUserAccount,
  getStudentHudProfile,
  deactivateUserAccount,
  listMapMissionsWithProgress,
  getAvatarStoreCatalog,
  purchaseStoreAvatar,
  updateRewardsAfterMission,
  changeActiveAvatar,
  enrollStudentInAula,
  unenrollStudentFromAula,
  getClassroomRanking,
  publishAulaChallenge,
  updateAulaChallenge,
  deleteAulaChallenge,
  submitChallengeDelivery,
  gradeStudentSubmission,
  getAtRiskStudentsReport,
  getHighRetryMissionsReport,
  getGamifiedEconomyReport,
  getAllAnalyticalReports,
} from '../../../src/services/index.js';

test('TAREA 4 — Informe 1: Estudiantes en Riesgo Pedagógico (HAVING AVG(puntuacion) < 3.0)', async () => {
  const report = await getAtRiskStudentsReport({ threshold: 3.0 });
  assert.equal(report.ok, true);
  assert.ok(report.sql.includes('HAVING AVG(er.puntuacion) <'));
  assert.ok(Array.isArray(report.rows));
  assert.ok(report.rows.length >= 2);
  for (const row of report.rows) {
    assert.ok(row.promedio_puntuacion < 3.0);
  }
});

test('TAREA 4 — Informe 2: Desafíos con Mayor Tasa de Reintentos (COUNT, AVG, INNER JOIN)', async () => {
  const report = await getHighRetryMissionsReport();
  assert.equal(report.ok, true);
  assert.ok(report.sql.includes('INNER JOIN progreso_misiones_usuario'));
  assert.ok(report.rows.length > 0);
  assert.ok(report.rows[0].promedio_intentos >= report.rows[report.rows.length - 1].promedio_intentos);
});

test('TAREA 4 — Informe 3: Economía Gamificada (SUM(saldo_monedas), COUNT(avatar_id), LEFT JOIN)', async () => {
  const report = await getGamifiedEconomyReport();
  assert.equal(report.ok, true);
  assert.ok(report.sql.includes('LEFT JOIN inventario_avatares_usuario'));
  assert.ok(report.summary.masa_monetaria_en_circulacion > 0);
  assert.ok(report.summary.total_desbloqueos_tienda > 0);

  const consolidated = await getAllAnalyticalReports({ threshold: 3.0 });
  assert.equal(consolidated.ok, true);
  assert.ok(consolidated.atRiskStudents.rows.length >= 2);
});

test('TAREA 3 — CRUD Completo (CREATE, READ, UPDATE, DELETE) en Capa de Servicios 3FN', async () => {
  // 1. CREATE (INSERT): Registrar usuario
  const reg = await registerUserAccount({
    nombre: 'Camila Exploradora',
    correo: `camila.${Date.now()}@codekids.edu.co`,
    contrasena: 'PasswordSegura2026*',
    rol: 'estudiante',
    avatar: 'fox',
  });
  assert.equal(reg.ok, true);
  assert.equal(reg.operation, 'INSERT');
  const newUserId = reg.user.id;

  // 2. READ (SELECT): Consultar HUD del estudiante
  const hud = await getStudentHudProfile(newUserId);
  assert.equal(hud.ok, true);
  assert.equal(hud.operation, 'SELECT');
  assert.equal(hud.hud.nombre, 'Camila Exploradora');

  // 3. CREATE (INSERT): Matricular estudiante en aula 1 (5° A)
  const enroll = await enrollStudentInAula({
    aulaId: 1,
    codigoGrupo: '5° A',
    estudianteId: newUserId,
  });
  assert.equal(enroll.ok, true);
  assert.equal(enroll.operation, 'INSERT');

  // 4. READ (SELECT): Listar misiones del mapa y catálogo de tienda
  const map = await listMapMissionsWithProgress(newUserId);
  assert.equal(map.ok, true);
  assert.ok(map.missions.length >= 12);

  const catalog = await getAvatarStoreCatalog(newUserId);
  assert.equal(catalog.ok, true);
  assert.ok(catalog.catalog.length >= 5);

  // 5. UPDATE: Actualizar XP y monedas tras ganar misión
  const reward = await updateRewardsAfterMission({
    usuarioId: newUserId,
    misionId: 'sequence-forest',
    xpGanado: 50,
    monedasGanadas: 40,
    estrellas: 3,
    intentos: 1,
  });
  assert.equal(reward.ok, true);
  assert.equal(reward.operation, 'UPDATE');

  // 6. CREATE (INSERT) + UPDATE: Comprar avatar y cambiar avatar activo
  const buy = await purchaseStoreAvatar({
    usuarioId: newUserId,
    avatarId: 'robot',
    costo: 40,
  });
  assert.equal(buy.ok, true);
  assert.equal(buy.operation, 'INSERT');

  const avatar = await changeActiveAvatar({
    usuarioId: newUserId,
    avatarId: 'fox',
  });
  assert.equal(avatar.ok, true);
  assert.equal(avatar.operation, 'UPDATE');

  // 7. CREATE (INSERT), UPDATE y DELETE de reto escolar
  const challenge = await publishAulaChallenge({
    aulaId: 1,
    codigoGrupo: '5° A',
    misionId: 'loop-bridge',
    titulo: 'Reto Test CRUD Bucles',
    instrucciones: 'Supera el puente con repetir',
    tematicaHabilidad: 'Bucles',
  });
  assert.equal(challenge.ok, true);
  assert.equal(challenge.operation, 'INSERT');
  const retoId = challenge.challenge.id;

  const editChallenge = await updateAulaChallenge(retoId, {
    titulo: 'Reto Test CRUD Bucles (Actualizado)',
  });
  assert.equal(editChallenge.ok, true);
  assert.equal(editChallenge.operation, 'UPDATE');

  // 8. CREATE (INSERT) y UPDATE de entrega de misión
  const sub = await submitChallengeDelivery({
    retoId,
    estudianteId: newUserId,
    puntuacion: 4.5,
    puntaje: 90,
    cantidadIntentos: 1,
    logrado: true,
    textoEvidencia: 'repetir 4 veces avanzar',
  });
  assert.equal(sub.ok, true);
  assert.equal(sub.operation, 'INSERT');
  const entregaId = sub.submission.id;

  const grade = await gradeStudentSubmission({
    entregaId,
    retoId,
    estudianteId: newUserId,
    puntuacion: 4.8,
    puntaje: 96,
    recomendacionDocente: 'Excelente optimización de bloques.',
  });
  assert.equal(grade.ok, true);
  assert.equal(grade.operation, 'UPDATE');

  // 9. READ (SELECT): Ranking del curso
  const rank = await getClassroomRanking({ aulaId: 1, codigoGrupo: '5° A' });
  assert.equal(rank.ok, true);
  assert.equal(rank.operation, 'SELECT');
  assert.ok(rank.ranking.length > 0);

  // 10. DELETE: Dar de baja matrícula, eliminar reto y desactivar cuenta
  const unenroll = await unenrollStudentFromAula({
    aulaId: 1,
    codigoGrupo: '5° A',
    estudianteId: newUserId,
  });
  assert.equal(unenroll.ok, true);
  assert.equal(unenroll.operation, 'DELETE');

  const delChallenge = await deleteAulaChallenge(retoId);
  assert.equal(delChallenge.ok, true);
  assert.equal(delChallenge.operation, 'DELETE');

  const delUser = await deactivateUserAccount(newUserId);
  assert.equal(delUser.ok, true);
});
