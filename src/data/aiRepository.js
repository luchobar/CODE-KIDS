import { postAiEndpoint } from './httpClient.js';

/**
 * Solicita la ruta de aprendizaje adaptativa del estudiante al tutor IA.
 * @param {Record<string, unknown>} payload
 * @param {{ signal?: AbortSignal }} [options]
 */
export function fetchStudentAdaptiveRoute(payload, options) {
  return postAiEndpoint('/student-route', payload, options);
}

/**
 * Solicita retroalimentación corta del robot tutor Pipo tras ejecutar bloques.
 * @param {Record<string, unknown>} payload
 * @param {{ signal?: AbortSignal }} [options]
 */
export function fetchPipoCoachFeedback(payload, options) {
  return postAiEndpoint('/coach', payload, options);
}

/**
 * Solicita el análisis pedagógico del curso y propuestas de ejercicios para el docente.
 * @param {Record<string, unknown>} payload
 * @param {{ signal?: AbortSignal }} [options]
 */
export function fetchTeacherInsights(payload, options) {
  return postAiEndpoint('/teacher-insights', payload, options);
}

/**
 * Evalúa la entrega de una misión escolar usando el servicio IA.
 * @param {Record<string, unknown>} payload
 * @param {{ signal?: AbortSignal }} [options]
 */
export function evaluateAssignmentWithAi(payload, options) {
  return postAiEndpoint('/evaluate', payload, options);
}
