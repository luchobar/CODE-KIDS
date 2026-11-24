import { DEFAULT_DIAGNOSTIC_SCORES, parsePositiveIntId } from './seedData.js';
import { readClassroomCache } from './storageStore.js';
import { supabase } from './supabaseClient.js';

/**
 * Calcula promedio diagnóstico y habilidad prioritaria de refuerzo para un estudiante.
 * @param {Record<string, any>} student
 */
export function computeStudentStats(student) {
  const scoresObj = student.scores || { ...DEFAULT_DIAGNOSTIC_SCORES };
  const entries = Object.entries(scoresObj);
  const avgScore = entries.length
    ? Math.round(entries.reduce((sum, [, val]) => sum + Number(val || 0), 0) / entries.length)
    : 75;
  const weakest = entries.length
    ? [...entries].sort((a, b) => Number(a[1]) - Number(b[1]))[0][0]
    : 'Bucles';

  return {
    ...student,
    score: avgScore,
    weak: weakest,
  };
}

/**
 * Deduce la plantilla de ejercicio según prefijo de misión, habilidad o plantilla almacenada.
 */
export function inferTemplateIdFromMission(missionId = '', skill = '', dbPlantilla = '') {
  if (missionId.startsWith('python-') || missionId.startsWith('py-') || skill === 'Python') {
    return 'python-code';
  }
  if (missionId.startsWith('html-') || skill === 'HTML5') {
    return 'html-markup';
  }
  if (missionId.startsWith('js-') || skill === 'JavaScript') {
    return 'javascript-script';
  }
  if (dbPlantilla) return dbPlantilla;
  if (skill === 'Bucles') return 'loop-count';
  if (skill === 'Condicionales') return 'if-choice';
  return 'sequence-order';
}

/**
 * Resuelve dinámicamente el ID de aula (`aulas.id`) a partir del código de grupo.
 * Evita el hardcodeo frágil `6° B ? 2 : 1` para cursos creados dinámicamente.
 * @param {string} codigoGrupo
 * @param {Array<{ id?: number, codigoGrupo?: string }>} [courses]
 * @returns {number | null}
 */
export function resolveAulaIdByGroup(codigoGrupo, courses = null) {
  const cleanCode = String(codigoGrupo || '').trim().toLowerCase();
  if (!cleanCode) return null;

  const courseList = Array.isArray(courses) && courses.length
    ? courses
    : readClassroomCache().courses || [];
  const matched = courseList.find(
    (c) => String(c.codigoGrupo || '').trim().toLowerCase() === cleanCode,
  );

  const validId = parsePositiveIntId(matched?.id);
  if (validId !== null) return validId;

  if (cleanCode === '5° a') return 1;
  if (cleanCode === '6° b') return 2;
  return null;
}

/**
 * Resuelve el ID de docente en Supabase o retorna el ID semilla `4`.
 * @param {number | undefined} preferredId
 */
export async function resolveTeacherUserId(preferredId) {
  if (!supabase) return 4;
  if (typeof preferredId === 'number') {
    const { data: found } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id', preferredId)
      .maybeSingle();
    if (found?.id) return found.id;
  }
  const { data: teacherRow } = await supabase
    .from('usuarios')
    .select('id')
    .eq('rol', 'docente')
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();
  return teacherRow?.id || 4;
}

/**
 * Obtiene o crea el aula correspondiente a `codigoGrupo` en Supabase.
 */
export async function ensureAulaIdForGroup(codigoGrupo, nombreCurso = '', preferredDocenteId) {
  if (!supabase) return null;
  const cleanCode = String(codigoGrupo || '').trim();
  if (!cleanCode) return null;

  const { data: existing } = await supabase
    .from('aulas')
    .select('id, codigo_grupo, nombre')
    .eq('codigo_grupo', cleanCode)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const docenteId = await resolveTeacherUserId(preferredDocenteId);
  const { data: inserted } = await supabase
    .from('aulas')
    .insert({
      codigo_grupo: cleanCode,
      nombre: nombreCurso?.trim() || `Curso ${cleanCode}`,
      docente_id: docenteId,
      anio_escolar: 2026,
    })
    .select('id')
    .single();

  return inserted?.id || null;
}
