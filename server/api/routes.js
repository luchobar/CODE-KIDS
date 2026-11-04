/**
 * CAPA DE CONTROLADORES EXPRESS (Arquitectura por Capas - Presentación <-> Negocio <-> Datos)
 * Archivo: /server/api/routes.js
 * Descripción:
 *   Expone los endpoints RESTful para el CRUD completo (Tarea 3) y los
 *   Informes Analíticos SQL Avanzados (Tarea 4), delegando la lógica de negocio
 *   a la capa de servicios desacoplada (/src/services/).
 */

import express from 'express';
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
} from '../../src/services/index.js';

export function createApiRouter() {
  const router = express.Router();
  router.use(express.json({ limit: '64kb' }));

  // ===========================================================================
  // TAREA 4: ENDPOINTS DE INFORMES ANALÍTICOS SQL AVANZADOS (reports.service.js)
  // ===========================================================================

  // 0. Consolidado de los 3 informes analíticos
  router.get('/reports', async (req, res) => {
    try {
      const aulaCodigo = req.query.group || req.query.aula || null;
      const threshold = req.query.threshold ? Number(req.query.threshold) : 3.0;
      const data = await getAllAnalyticalReports({ aulaCodigo, threshold });
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // 1. Informe de Estudiantes en Riesgo Pedagógico (Docente) — HAVING AVG(puntuacion) < 3.0
  router.get('/reports/at-risk-students', async (req, res) => {
    try {
      const aulaCodigo = req.query.group || req.query.aula || null;
      const threshold = req.query.threshold ? Number(req.query.threshold) : 3.0;
      const report = await getAtRiskStudentsReport({ aulaCodigo, threshold });
      return res.status(200).json(report);
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // 2. Informe de Desafíos con Mayor Tasa de Reintentos — COUNT(), AVG(cantidad_intentos), INNER JOIN
  router.get('/reports/high-retry-missions', async (_req, res) => {
    try {
      const report = await getHighRetryMissionsReport();
      return res.status(200).json(report);
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // 3. Informe de Economía Gamificada (Administrador) — SUM(saldo_monedas), COUNT(avatar_id), LEFT JOIN
  router.get('/reports/gamified-economy', async (_req, res) => {
    try {
      const report = await getGamifiedEconomyReport();
      return res.status(200).json(report);
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // TAREA 3: ENDPOINTS CRUD COMPLETO (CREATE, READ, UPDATE, DELETE)
  // ===========================================================================

  // --- CREATE (INSERT) ---

  // 1. Registrar usuario
  router.post('/users', async (req, res) => {
    try {
      const result = await registerUserAccount(req.body || {});
      return res.status(result.ok ? 201 : 400).json(result);
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  // 2. Matricular estudiante en aula
  router.post('/classrooms/:aulaId/enrollments', async (req, res) => {
    try {
      const result = await enrollStudentInAula({
        aulaId: req.params.aulaId,
        codigoGrupo: req.body?.codigoGrupo,
        estudianteId: req.body?.estudianteId,
      });
      return res.status(201).json(result);
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  // 3. Publicar reto
  router.post('/challenges', async (req, res) => {
    try {
      const result = await publishAulaChallenge(req.body || {});
      return res.status(201).json(result);
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  // 4. Comprar avatar
  router.post('/store/purchase', async (req, res) => {
    try {
      const result = await purchaseStoreAvatar(req.body || {});
      return res.status(201).json(result);
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  // 5. Enviar entrega de misión
  router.post('/submissions', async (req, res) => {
    try {
      const result = await submitChallengeDelivery(req.body || {});
      return res.status(201).json(result);
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  // --- READ (SELECT) ---

  // 1. Consultar HUD de estudiante
  router.get('/students/:id/hud', async (req, res) => {
    try {
      const result = await getStudentHudProfile(req.params.id);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  // 2. Listar misiones del mapa
  router.get('/missions/map', async (req, res) => {
    try {
      const usuarioId = req.query.usuarioId || 1;
      const result = await listMapMissionsWithProgress(usuarioId);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  // 3. Ver ranking del curso
  router.get('/classrooms/:aulaId/ranking', async (req, res) => {
    try {
      const result = await getClassroomRanking({
        aulaId: req.params.aulaId,
        codigoGrupo: req.query.group || '5° A',
      });
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  // 4. Catálogo de tienda
  router.get('/store/catalog', async (req, res) => {
    try {
      const usuarioId = req.query.usuarioId || 1;
      const result = await getAvatarStoreCatalog(usuarioId);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  // --- UPDATE (UPDATE) ---

  // 1. Actualizar XP/monedas tras ganar misión
  router.patch('/students/:id/rewards', async (req, res) => {
    try {
      const result = await updateRewardsAfterMission({
        usuarioId: req.params.id,
        ...(req.body || {}),
      });
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  // 2. Cambiar avatar activo
  router.patch('/students/:id/avatar', async (req, res) => {
    try {
      const result = await changeActiveAvatar({
        usuarioId: req.params.id,
        avatarId: req.body?.avatarId,
      });
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  // 3. Calificar entrega
  router.patch('/submissions/:id/grade', async (req, res) => {
    try {
      const result = await gradeStudentSubmission({
        entregaId: req.params.id,
        ...(req.body || {}),
      });
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  // 4. Editar reto escolar
  router.put('/challenges/:id', async (req, res) => {
    try {
      const result = await updateAulaChallenge(req.params.id, req.body || {});
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  // --- DELETE (DELETE) ---

  // 1. Dar de baja la matrícula de un alumno de un aula
  router.delete('/classrooms/:aulaId/enrollments/:estudianteId', async (req, res) => {
    try {
      const result = await unenrollStudentFromAula({
        aulaId: req.params.aulaId,
        codigoGrupo: req.query.group,
        estudianteId: req.params.estudianteId,
      });
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  // 2. Eliminar reto asignado
  router.delete('/challenges/:id', async (req, res) => {
    try {
      const result = await deleteAulaChallenge(req.params.id);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  // 3. Desactivar o eliminar cuenta de usuario
  router.delete('/users/:id', async (req, res) => {
    try {
      const hardDelete = req.query.hard === '1' || req.body?.hardDelete === true;
      const result = await deactivateUserAccount(req.params.id, { hardDelete });
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export function createApiApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api/v1', createApiRouter());
  return app;
}
