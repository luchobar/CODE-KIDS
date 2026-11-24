import { SEED_DEMO_PASSWORD_HASH } from '../services/password.util.js';

export const QUICK_PROFILE_IDS = {
  sofi: 1,
  mateo: 2,
  valeria: 3,
  profe: 4,
};

export const DEFAULT_DIAGNOSTIC_SCORES = {
  Secuencias: 75,
  Bucles: 45,
  Condicionales: 80,
  Descomposición: 55,
};

export const DEFAULT_A11Y_SETTINGS = {
  theme: 'dark',
  fontScale: 'normal',
  reducedMotion: false,
  highContrast: false,
};

export const UNIVERSITY_ACCOUNTS = {
  'sofi@codekids.edu.co': {
    id: 1,
    name: 'Sofi',
    email: 'sofi@codekids.edu.co',
    role: 'student',
    avatar: 'dragon',
    badge: 'Nvl. 3 · Secuencias',
    passwordHash: SEED_DEMO_PASSWORD_HASH,
    demoFallbacks: ['CodeKids2026*', 'Sofi12345*', '12345678'],
  },
  'mateo@codekids.edu.co': {
    id: 2,
    name: 'Mateo',
    email: 'mateo@codekids.edu.co',
    role: 'student',
    avatar: 'robot',
    badge: 'Nvl. 2 · Bucles',
    passwordHash: SEED_DEMO_PASSWORD_HASH,
    demoFallbacks: ['CodeKids2026*', 'Mateo12345*', '12345678'],
  },
  'valeria@codekids.edu.co': {
    id: 3,
    name: 'Valeria',
    email: 'valeria@codekids.edu.co',
    role: 'student',
    avatar: 'fox',
    badge: 'Nvl. 4 · Python',
    passwordHash: SEED_DEMO_PASSWORD_HASH,
    demoFallbacks: ['CodeKids2026*', 'Valeria12345*', '12345678'],
  },
  'alex.profe@codekids.edu.co': {
    id: 4,
    name: 'Profe Alex',
    email: 'alex.profe@codekids.edu.co',
    role: 'teacher',
    avatar: 'unicorn',
    badge: 'Docente · 5° A',
    passwordHash: SEED_DEMO_PASSWORD_HASH,
    demoFallbacks: ['CodeKids2026*', 'Profe2026*', '12345678'],
  },
};

export const DEFAULT_COURSES = [
  { id: 1, codigoGrupo: '5° A', nombre: 'Grado 5° A - Pensamiento Computacional', anioEscolar: 2026 },
  { id: 2, codigoGrupo: '6° B', nombre: 'Grado 6° B - Lógica e Algoritmia', anioEscolar: 2026 },
];

export const DEFAULT_DB_STUDENTS = [
  {
    id: 1,
    name: 'Valeria',
    email: 'valeria@universidad.edu',
    avatar: 'dragon',
    points: 120,
    coins: 40,
    level: 2,
    streak: 1,
    completedCount: 3,
    scores: { ...DEFAULT_DIAGNOSTIC_SCORES },
  },
  {
    id: 2,
    name: 'Mateo',
    email: 'mateo@universidad.edu',
    avatar: 'cat',
    points: 85,
    coins: 25,
    level: 1,
    streak: 2,
    completedCount: 2,
    scores: { Secuencias: 80, Bucles: 60, Condicionales: 70, Descomposición: 40 },
  },
  {
    id: 3,
    name: 'Lucía',
    email: 'lucia@universidad.edu',
    avatar: 'robot',
    points: 210,
    coins: 75,
    level: 3,
    streak: 4,
    completedCount: 6,
    scores: { Secuencias: 90, Bucles: 85, Condicionales: 75, Descomposición: 88 },
  },
];

export const DEFAULT_ENROLLMENTS = {
  '5° A': [1, 2, 3],
  '6° B': [],
};

export const REPORT_SQL_PREVIEW = {
  AT_RISK_STUDENTS: `SELECT a.id AS aula_id, a.codigo_grupo AS codigo_aula, u.id AS estudiante_id, u.nombre AS estudiante_nombre,
       COUNT(er.id)::int AS total_entregas_evaluadas,
       ROUND(AVG(er.puntuacion), 2)::float AS promedio_puntuacion
FROM usuarios u
INNER JOIN matriculas_aula ma ON ma.estudiante_id = u.id
INNER JOIN aulas a ON a.id = ma.aula_id
INNER JOIN entregas_retos er ON er.estudiante_id = u.id
INNER JOIN retos_aula ra ON ra.id = er.reto_id AND ra.aula_id = a.id
WHERE u.rol = 'estudiante' AND u.activo = TRUE
GROUP BY a.id, a.codigo_grupo, u.id, u.nombre
HAVING AVG(er.puntuacion) < 3.0
ORDER BY promedio_puntuacion ASC;`,
  HIGH_RETRY_MISSIONS: `SELECT m.id AS mision_id, m.titulo_ejercicio, w.tematica_habilidad AS habilidad,
       COUNT(pmu.usuario_id)::int AS estudiantes_que_intentaron,
       ROUND(AVG(pmu.cantidad_intentos), 2)::float AS promedio_intentos
FROM misiones m
INNER JOIN mundos w ON w.id = m.mundo_id
INNER JOIN progreso_misiones_usuario pmu ON pmu.mision_id = m.id
GROUP BY m.id, m.titulo_ejercicio, w.tematica_habilidad
HAVING AVG(pmu.cantidad_intentos) >= 1.0
ORDER BY promedio_intentos DESC;`,
  GAMIFIED_ECONOMY: `SELECT u.id AS usuario_id, u.nombre AS estudiante,
       COALESCE(pg.saldo_monedas, 0)::int AS saldo_monedas_actual,
       COUNT(iau.avatar_id)::int AS total_avatares_desbloqueados
FROM usuarios u
LEFT JOIN perfiles_gamificacion pg ON pg.usuario_id = u.id
LEFT JOIN inventario_avatares_usuario iau ON iau.usuario_id = u.id
WHERE u.rol = 'estudiante'
GROUP BY u.id, u.nombre, pg.saldo_monedas
ORDER BY total_avatares_desbloqueados DESC, saldo_monedas_actual DESC;`,
};

const PG_INT4_MAX = 2_147_483_647;

/**
 * Parsea un entero positivo válido dentro del rango INT4 de PostgreSQL.
 * Evita coerciones inseguras como `|| 1` en escrituras o borrados.
 * @param {unknown} value
 * @returns {number | null}
 */
export function parsePositiveIntId(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 && value <= PG_INT4_MAX ? value : null;
  }
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/^db-/, '');
    if (!/^\d+$/.test(cleaned)) return null;
    const parsed = Number(cleaned);
    return Number.isInteger(parsed) && parsed > 0 && parsed <= PG_INT4_MAX ? parsed : null;
  }
  return null;
}

/**
 * Resuelve un ID numérico de estudiante desde ID o perfil rápido; devuelve `null` si no es válido.
 * @param {unknown} userId
 * @returns {number | null}
 */
export function resolveStudentIdOrNull(userId) {
  const direct = parsePositiveIntId(userId);
  if (direct !== null) return direct;
  if (typeof userId === 'string') {
    const mapped = QUICK_PROFILE_IDS[userId.trim().toLowerCase()];
    if (mapped) return mapped;
  }
  return null;
}
