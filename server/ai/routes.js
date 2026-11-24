import express from 'express';
import {
  askOllama,
  ensureOllamaReady,
  probeAiConnection,
} from './ollamaClient.js';
import {
  buildCoachPrompt,
  buildEvaluatePrompt,
  buildStudentRoutePrompt,
  buildTeacherInsightsPrompt,
  normalizeProposedExercises,
} from './prompts.js';

function applyBasicApiHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  return next();
}

/**
 * Crea el router Express para salud y asistencia inteligente de PIPO (`/api/health`, `/api/ai/*`).
 * @returns {import('express').Router}
 */
export function createAiRouter() {
  const router = express.Router();
  router.use(applyBasicApiHeaders);
  router.use(express.json({ limit: '64kb' }));

  router.get('/health', async (req, res, next) => {
    try {
      const status = await ensureOllamaReady({ warmup: false, log: false });
      const probe = req.query?.probe === '1' ? await probeAiConnection() : undefined;
      return res.status(200).json({
        ok: true,
        assistant: 'PIPO',
        model: 'PIPO',
        ollama: status.ok,
        modelAvailable: status.modelAvailable,
        ...(probe ? { probe } : {}),
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/ai/student-route', async (req, res, next) => {
    try {
      const spec = buildStudentRoutePrompt(req.body || {});
      const result = await askOllama(spec.system, spec.payload, spec.schema);
      result.recommendedMissionIds = (
        Array.isArray(result.recommendedMissionIds) ? result.recommendedMissionIds : []
      )
        .filter((id) => spec.validIds.has(id))
        .slice(0, 3);
      return res.status(200).json({ ...result, assistant: 'PIPO', model: 'PIPO', source: 'pipo' });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/ai/evaluate', async (req, res, next) => {
    try {
      const input = req.body || {};
      const spec = buildEvaluatePrompt(input);
      const result = await askOllama(spec.system, spec.payload, spec.schema);
      result.score = Math.max(
        input.success ? 80 : 0,
        Math.min(input.success ? 100 : 65, Math.round(Number(result.score) || 0)),
      );
      return res.status(200).json({ ...result, assistant: 'PIPO', model: 'PIPO', source: 'pipo' });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/ai/teacher-insights', async (req, res, next) => {
    try {
      const spec = buildTeacherInsightsPrompt(req.body || {});
      const result = await askOllama(spec.system, spec.payload, spec.schema);
      result.sampleSize = spec.sampleSize;
      result.studentClusters = Array.isArray(result.studentClusters)
        ? result.studentClusters.slice(0, 4)
        : [];
      result.proposedExercises = normalizeProposedExercises(
        result.proposedExercises,
        spec.catalog,
        spec.dominantWeakSkills,
        spec.assignedMissionIds,
      );
      return res.status(200).json({ ...result, assistant: 'PIPO', model: 'PIPO', source: 'pipo' });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/ai/coach', async (req, res, next) => {
    try {
      const spec = buildCoachPrompt(req.body || {});
      const result = await askOllama(spec.system, spec.payload, spec.schema);
      result.message = String(result.message || '').slice(0, 320);
      result.tip = String(result.tip || '').slice(0, 240);
      result.strength = String(result.strength || '').slice(0, 60);
      return res.status(200).json({ ...result, assistant: 'PIPO', model: 'PIPO', source: 'pipo' });
    } catch (error) {
      return next(error);
    }
  });

  router.use((err, _req, res, _next) => {
    if (err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && err?.status === 400)) {
      return res.status(400).json({ error: 'JSON inválido en la solicitud.' });
    }
    if (err?.type === 'entity.too.large' || err?.status === 413) {
      return res.status(413).json({ error: 'El cuerpo de la solicitud supera el tamaño máximo permitido.' });
    }
    const isTimeout = err?.name === 'TimeoutError';
    return res.status(isTimeout ? 504 : 503).json({
      error: isTimeout
        ? 'PIPO tardó demasiado en analizar la solicitud.'
        : 'PIPO no pudo conectarse al motor en este instante.',
      upstreamStatus: err?.upstreamStatus || undefined,
      detail: process.env.NODE_ENV === 'development' ? err?.message : undefined,
    });
  });

  return router;
}
