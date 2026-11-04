/**
 * CAPA DE ACCESO FÍSICO A DATOS (Data Access Layer - DAL)
 * Archivo: /src/services/db.client.js
 * Descripción:
 *   Gestiona la conexión física hacia PostgreSQL 16+ / Supabase y provee un
 *   almacén relacional de respaldo sincronizado con el modelo en 3FN (14 tablas)
 *   para garantizar disponibilidad continua tanto en servidor Express como en SPA.
 */

import { createClient } from '@supabase/supabase-js';
import { SEED_DEMO_PASSWORD_HASH } from './password.util.js';

function resolveEnv(key) {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return String(import.meta.env[key]).trim();
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return String(process.env[key]).trim();
  }
  return '';
}

const rawUrl = resolveEnv('VITE_SUPABASE_URL') || resolveEnv('SUPABASE_URL');
const rawKey =
  resolveEnv('VITE_SUPABASE_SERVICE_ROLE_KEY') ||
  resolveEnv('SUPABASE_SERVICE_ROLE_KEY') ||
  resolveEnv('VITE_SUPABASE_ANON_KEY') ||
  resolveEnv('SUPABASE_ANON_KEY');

export const cleanSupabaseUrl = rawUrl
  .replace(/^["']|["']$/g, '')
  .replace(/\/(rest|auth)(\/v\d+)?\/?$/i, '')
  .replace(/\/+$/, '');

export const cleanSupabaseKey = rawKey.replace(/^["']|["']$/g, '');

export const isSupabaseReady = Boolean(
  cleanSupabaseUrl &&
    cleanSupabaseKey &&
    cleanSupabaseUrl.startsWith('https://') &&
    !cleanSupabaseUrl.includes('placeholder'),
);

export const supabaseClient = isSupabaseReady
  ? createClient(cleanSupabaseUrl, cleanSupabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

// Pool PostgreSQL perezoso solo en entorno Node.js cuando DATABASE_URL está configurado
let pgPoolPromise = null;

export async function getPostgresPool() {
  if (typeof window !== 'undefined') return null;
  const dbUrl = resolveEnv('DATABASE_URL');
  if (!dbUrl) return null;

  if (!pgPoolPromise) {
    pgPoolPromise = (async () => {
      try {
        const pgModule = await import(/* @vite-ignore */ 'pg');
        const PoolClass = pgModule.Pool || pgModule.default?.Pool;
        if (!PoolClass) return null;
        return new PoolClass({ connectionString: dbUrl });
      } catch {
        return null;
      }
    })();
  }
  return pgPoolPromise;
}

/**
 * Ejecuta una consulta SQL parametrizada directamente en PostgreSQL si DATABASE_URL está activo.
 */
export async function executePostgresQuery(sql, params = []) {
  const pool = await getPostgresPool();
  if (!pool) return null;
  const result = await pool.query(sql, params);
  return result.rows;
}

// =============================================================================
// ESTADO RELACIONAL EN MEMORIA / LOCALSTORAGE EN 3FN (Respaldo Determinista)
// Refleja exactamente las 14 tablas de /sql/01_schema_13_tables.sql y /sql/03_seed_data.sql
// =============================================================================
const RELATIONAL_STORAGE_KEY = 'codekids-3fn-relational-store-v1';

export function createInitialRelationalSeed() {
  return {
    roles: [
      { id: 1, nombre_rol: 'estudiante', descripcion: 'Estudiante explorador' },
      { id: 2, nombre_rol: 'docente', descripcion: 'Docente titular de aula' },
      { id: 3, nombre_rol: 'admin', descripcion: 'Administrador general' },
    ],
    usuarios: [
      { id: 1, correo: 'sofi@codekids.edu.co', nombre: 'Sofi', rol: 'estudiante', rol_id: 1, contrasena_hash: SEED_DEMO_PASSWORD_HASH, activo: true, creado_en: '2026-10-01T10:00:00Z' },
      { id: 2, correo: 'mateo@codekids.edu.co', nombre: 'Mateo', rol: 'estudiante', rol_id: 1, contrasena_hash: SEED_DEMO_PASSWORD_HASH, activo: true, creado_en: '2026-10-01T10:05:00Z' },
      { id: 3, correo: 'valeria@codekids.edu.co', nombre: 'Valeria', rol: 'estudiante', rol_id: 1, contrasena_hash: SEED_DEMO_PASSWORD_HASH, activo: true, creado_en: '2026-10-01T10:10:00Z' },
      { id: 4, correo: 'alex.profe@codekids.edu.co', nombre: 'Profe Alex', rol: 'docente', rol_id: 2, contrasena_hash: SEED_DEMO_PASSWORD_HASH, activo: true, creado_en: '2026-10-01T09:00:00Z' },
      { id: 5, correo: 'samuel@codekids.edu.co', nombre: 'Samuel', rol: 'estudiante', rol_id: 1, contrasena_hash: SEED_DEMO_PASSWORD_HASH, activo: true, creado_en: '2026-10-02T11:00:00Z' },
      { id: 6, correo: 'mariana@codekids.edu.co', nombre: 'Mariana', rol: 'estudiante', rol_id: 1, contrasena_hash: SEED_DEMO_PASSWORD_HASH, activo: true, creado_en: '2026-10-02T11:30:00Z' },
      { id: 7, correo: 'admin@codekids.edu.co', nombre: 'Admin Laura', rol: 'admin', rol_id: 3, contrasena_hash: SEED_DEMO_PASSWORD_HASH, activo: true, creado_en: '2026-10-01T08:00:00Z' },
    ],
    perfiles_gamificacion: [
      { usuario_id: 1, puntos_xp: 240, nivel_actual: 3, saldo_monedas: 65, dias_racha: 5, avatar_activo_id: 'dragon', puntajes_diagnostico: { Secuencias: 92, Bucles: 68, Condicionales: 75, Descomposición: 70 } },
      { usuario_id: 2, puntos_xp: 130, nivel_actual: 2, saldo_monedas: 40, dias_racha: 3, avatar_activo_id: 'robot', puntajes_diagnostico: { Secuencias: 70, Bucles: 48, Condicionales: 52, Descomposición: 50 } },
      { usuario_id: 3, puntos_xp: 360, nivel_actual: 4, saldo_monedas: 110, dias_racha: 9, avatar_activo_id: 'fox', puntajes_diagnostico: { Secuencias: 98, Bucles: 95, Condicionales: 88, Descomposición: 90 } },
      { usuario_id: 5, puntos_xp: 90, nivel_actual: 1, saldo_monedas: 25, dias_racha: 2, avatar_activo_id: 'astronaut', puntajes_diagnostico: { Secuencias: 60, Bucles: 42, Condicionales: 50, Descomposición: 45 } },
      { usuario_id: 6, puntos_xp: 150, nivel_actual: 2, saldo_monedas: 50, dias_racha: 4, avatar_activo_id: 'cat', puntajes_diagnostico: { Secuencias: 78, Bucles: 58, Condicionales: 64, Descomposición: 60 } },
    ],
    catalogo_avatares: [
      { id: 'astronaut', nombre_visible: 'Explorador Estelar', costo_monedas: 0, tono_tema: 'blue', descripcion: 'Traje espacial estándar para nuevas misiones.', es_inicial: true },
      { id: 'dragon', nombre_visible: 'Dragón Chispa', costo_monedas: 30, tono_tema: 'peach', descripcion: 'Especialista en lógica y secuencias rápidas.', es_inicial: true },
      { id: 'cat', nombre_visible: 'Gato Pixel', costo_monedas: 30, tono_tema: 'lav', descripcion: 'Observador preciso para depurar programas.', es_inicial: false },
      { id: 'robot', nombre_visible: 'Unidad Rover', costo_monedas: 40, tono_tema: 'mint', descripcion: 'Diseñado para exploración autónoma por bloques.', es_inicial: true },
      { id: 'fox', nombre_visible: 'Zorro Ágil', costo_monedas: 50, tono_tema: 'yellow', descripcion: 'Estratega en bucles y rutas óptimas.', es_inicial: true },
      { id: 'unicorn', nombre_visible: 'Prisma Orbital', costo_monedas: 60, tono_tema: 'blue', descripcion: 'Compañero avanzado de laboratorio Python.', es_inicial: true },
    ],
    inventario_avatares_usuario: [
      { usuario_id: 1, avatar_id: 'astronaut', desbloqueado_en: '2026-10-01T10:00:00Z' },
      { usuario_id: 1, avatar_id: 'dragon', desbloqueado_en: '2026-10-02T10:00:00Z' },
      { usuario_id: 1, avatar_id: 'cat', desbloqueado_en: '2026-10-04T10:00:00Z' },
      { usuario_id: 2, avatar_id: 'astronaut', desbloqueado_en: '2026-10-01T10:05:00Z' },
      { usuario_id: 2, avatar_id: 'robot', desbloqueado_en: '2026-10-03T10:05:00Z' },
      { usuario_id: 3, avatar_id: 'astronaut', desbloqueado_en: '2026-10-01T10:10:00Z' },
      { usuario_id: 3, avatar_id: 'fox', desbloqueado_en: '2026-10-02T10:10:00Z' },
      { usuario_id: 3, avatar_id: 'unicorn', desbloqueado_en: '2026-10-05T10:10:00Z' },
      { usuario_id: 5, avatar_id: 'astronaut', desbloqueado_en: '2026-10-02T11:00:00Z' },
      { usuario_id: 6, avatar_id: 'astronaut', desbloqueado_en: '2026-10-02T11:30:00Z' },
      { usuario_id: 6, avatar_id: 'cat', desbloqueado_en: '2026-10-06T11:30:00Z' },
    ],
    catalogo_insignias: [
      { id: 'insignia-primer-codigo', codigo_insignia: 'PRIMER_CODIGO', nombre: 'Primer código', titulo: 'Primer código', descripcion: 'Completaste tu primera misión de programación por bloques.', tematica_habilidad: 'Secuencias', icono_url: '/images/badges/primer-codigo.svg', requisito_xp: 50 },
      { id: 'insignia-master-bucles', codigo_insignia: 'MASTER_BUCLES', nombre: 'Master bucles', titulo: 'Master bucles', descripcion: 'Dominaste las tres etapas de La Isla de los Bucles.', tematica_habilidad: 'Bucles', icono_url: '/images/badges/master-bucles.svg', requisito_xp: 150 },
      { id: 'insignia-logica-acero', codigo_insignia: 'LOGICA_ACERO', nombre: 'Lógica de acero', titulo: 'Lógica de acero', descripcion: 'Superaste todos los retos de La Cueva de las Decisiones.', tematica_habilidad: 'Condicionales', icono_url: '/images/badges/logica-acero.svg', requisito_xp: 250 },
      { id: 'insignia-depurador-pro', codigo_insignia: 'DEPURADOR_PRO', nombre: 'Depurador Pro', titulo: 'Depurador Pro', descripcion: 'Reparaste misiones con errores lógicos en el laboratorio.', tematica_habilidad: 'Funciones', icono_url: '/images/badges/depurador-pro.svg', requisito_xp: 300 },
    ],
    insignias_usuario: [
      { usuario_id: 1, insignia_id: 'insignia-primer-codigo', fecha_desbloqueo: '2026-10-02T12:00:00Z' },
      { usuario_id: 2, insignia_id: 'insignia-primer-codigo', fecha_desbloqueo: '2026-10-03T12:00:00Z' },
      { usuario_id: 3, insignia_id: 'insignia-primer-codigo', fecha_desbloqueo: '2026-10-01T15:00:00Z' },
      { usuario_id: 3, insignia_id: 'insignia-master-bucles', fecha_desbloqueo: '2026-10-04T15:00:00Z' },
      { usuario_id: 3, insignia_id: 'insignia-logica-acero', fecha_desbloqueo: '2026-10-06T15:00:00Z' },
      { usuario_id: 6, insignia_id: 'insignia-primer-codigo', fecha_desbloqueo: '2026-10-05T12:00:00Z' },
    ],
    mundos: [
      { id: 'mundo-bosque', orden_mundo: 1, tematica_habilidad: 'Secuencias', titulo: 'El Bosque de las Secuencias', subtitulo: 'Guía a los robots por nuevos caminos paso a paso', activo: true },
      { id: 'mundo-isla', orden_mundo: 2, tematica_habilidad: 'Bucles', titulo: 'La Isla de los Bucles', subtitulo: 'Descubre patrones que se repiten para ahorrar energía', activo: true },
      { id: 'mundo-cueva', orden_mundo: 3, tematica_habilidad: 'Condicionales', titulo: 'La Cueva de las Decisiones', subtitulo: 'Elige qué hacer ante cada obstáculo con sensores', activo: true },
      { id: 'mundo-funciones', orden_mundo: 4, tematica_habilidad: 'Funciones', titulo: 'Estación de Funciones y Depuración', subtitulo: 'Repara módulos de código y domina rutinas avanzadas', activo: true },
    ],
    misiones: [
      { id: 'sequence-forest', mundo_id: 'mundo-bosque', orden_etapa: 1, nivel_dificultad: 'Inicio', plantilla_id: 'sequence-order', nombre_corto: 'El bosque', titulo_ejercicio: 'El viaje del robot', recompensa_xp: 10, recompensa_monedas: 10, configuracion_tablero: { start: { x: 0, y: 2, direction: 0 }, goal: { x: 2, y: 0 }, wall: null } },
      { id: 'sequence-city', mundo_id: 'mundo-bosque', orden_etapa: 2, nivel_dificultad: 'En camino', plantilla_id: 'sequence-order', nombre_corto: 'La ciudad', titulo_ejercicio: 'Cruza la ciudad', recompensa_xp: 10, recompensa_monedas: 10, configuracion_tablero: { start: { x: 0, y: 1, direction: 0 }, goal: { x: 2, y: 1 }, wall: { x: 1, y: 1 } } },
      { id: 'sequence-moon', mundo_id: 'mundo-bosque', orden_etapa: 3, nivel_dificultad: 'Explorador', plantilla_id: 'sequence-order', nombre_corto: 'La luna', titulo_ejercicio: 'Ruta lunar', recompensa_xp: 15, recompensa_monedas: 15, configuracion_tablero: { start: { x: 0, y: 2, direction: 1 }, goal: { x: 2, y: 0 }, wall: { x: 1, y: 1 } } },
      { id: 'loop-bridge', mundo_id: 'mundo-isla', orden_etapa: 1, nivel_dificultad: 'Inicio', plantilla_id: 'loop-count', nombre_corto: 'El puente', titulo_ejercicio: 'Cruza el puente', recompensa_xp: 10, recompensa_monedas: 10, configuracion_tablero: { start: { x: 0, y: 2, direction: 1 }, goal: { x: 2, y: 2 }, wall: null } },
      { id: 'loop-zigzag', mundo_id: 'mundo-isla', orden_etapa: 2, nivel_dificultad: 'En camino', plantilla_id: 'loop-count', nombre_corto: 'El zigzag', titulo_ejercicio: 'Trayectoria en zigzag', recompensa_xp: 15, recompensa_monedas: 10, configuracion_tablero: { start: { x: 0, y: 2, direction: 1 }, goal: { x: 1, y: 1 }, wall: null } },
      { id: 'loop-garden', mundo_id: 'mundo-isla', orden_etapa: 3, nivel_dificultad: 'Explorador', plantilla_id: 'loop-count', nombre_corto: 'El jardín', titulo_ejercicio: 'Recorrido botánico', recompensa_xp: 20, recompensa_monedas: 15, configuracion_tablero: { start: { x: 0, y: 2, direction: 1 }, goal: { x: 2, y: 1 }, wall: null } },
      { id: 'condition-detour', mundo_id: 'mundo-cueva', orden_etapa: 1, nivel_dificultad: 'Inicio', plantilla_id: 'if-choice', nombre_corto: 'El desvío', titulo_ejercicio: 'Rodea el muro', recompensa_xp: 15, recompensa_monedas: 10, configuracion_tablero: { start: { x: 0, y: 0, direction: 1 }, goal: { x: 2, y: 0 }, wall: { x: 1, y: 0 } } },
      { id: 'condition-cave', mundo_id: 'mundo-cueva', orden_etapa: 2, nivel_dificultad: 'En camino', plantilla_id: 'if-choice', nombre_corto: 'La galería', titulo_ejercicio: 'Busca otra salida', recompensa_xp: 15, recompensa_monedas: 15, configuracion_tablero: { start: { x: 2, y: 2, direction: 0 }, goal: { x: 0, y: 0 }, wall: { x: 2, y: 1 } } },
      { id: 'condition-river', mundo_id: 'mundo-cueva', orden_etapa: 3, nivel_dificultad: 'Explorador', plantilla_id: 'if-choice', nombre_corto: 'El canal', titulo_ejercicio: 'Encuentra el paso', recompensa_xp: 20, recompensa_monedas: 20, configuracion_tablero: { start: { x: 0, y: 2, direction: 2 }, goal: { x: 2, y: 2 }, wall: { x: 0, y: 1 } } },
      { id: 'debug-sequence', mundo_id: 'mundo-funciones', orden_etapa: 1, nivel_dificultad: 'Inicio', plantilla_id: 'sequence-order', nombre_corto: 'El giro equivocado', titulo_ejercicio: 'Encuentra el error', recompensa_xp: 15, recompensa_monedas: 15, configuracion_tablero: { start: { x: 0, y: 2, direction: 0 }, goal: { x: 2, y: 0 }, wall: null } },
      { id: 'debug-loop', mundo_id: 'mundo-funciones', orden_etapa: 2, nivel_dificultad: 'En camino', plantilla_id: 'loop-count', nombre_corto: 'La repetición incompleta', titulo_ejercicio: 'Ajusta el bucle', recompensa_xp: 20, recompensa_monedas: 15, configuracion_tablero: { start: { x: 0, y: 2, direction: 1 }, goal: { x: 2, y: 2 }, wall: null } },
      { id: 'debug-condition', mundo_id: 'mundo-funciones', orden_etapa: 3, nivel_dificultad: 'Explorador', plantilla_id: 'if-choice', nombre_corto: 'La decisión invertida', titulo_ejercicio: 'Corrige la decisión', recompensa_xp: 25, recompensa_monedas: 20, configuracion_tablero: { start: { x: 0, y: 0, direction: 1 }, goal: { x: 2, y: 0 }, wall: { x: 1, y: 0 } } },
    ],
    progreso_misiones_usuario: [
      { usuario_id: 1, mision_id: 'sequence-forest', estado: 'completada', estrellas_ganadas: 3, cantidad_intentos: 1, ultima_evidencia: 'Secuencia óptima' },
      { usuario_id: 1, mision_id: 'sequence-city', estado: 'completada', estrellas_ganadas: 2, cantidad_intentos: 2, ultima_evidencia: 'Rodeó obstáculo' },
      { usuario_id: 1, mision_id: 'sequence-moon', estado: 'completada', estrellas_ganadas: 3, cantidad_intentos: 2, ultima_evidencia: 'Ruta lunar completada' },
      { usuario_id: 1, mision_id: 'loop-bridge', estado: 'completada', estrellas_ganadas: 3, cantidad_intentos: 1, ultima_evidencia: 'Bucle repetir 2 veces' },
      { usuario_id: 1, mision_id: 'loop-zigzag', estado: 'disponible', estrellas_ganadas: 0, cantidad_intentos: 3, ultima_evidencia: 'En práctica' },
      { usuario_id: 1, mision_id: 'debug-sequence', estado: 'completada', estrellas_ganadas: 2, cantidad_intentos: 4, ultima_evidencia: 'Depuración exitosa' },
      { usuario_id: 2, mision_id: 'sequence-forest', estado: 'completada', estrellas_ganadas: 2, cantidad_intentos: 3, ultima_evidencia: 'Secuencia completada' },
      { usuario_id: 2, mision_id: 'sequence-city', estado: 'completada', estrellas_ganadas: 1, cantidad_intentos: 4, ultima_evidencia: 'Rodeó la ciudad' },
      { usuario_id: 2, mision_id: 'loop-bridge', estado: 'disponible', estrellas_ganadas: 0, cantidad_intentos: 5, ultima_evidencia: 'Ajustando bucle' },
      { usuario_id: 2, mision_id: 'condition-detour', estado: 'disponible', estrellas_ganadas: 0, cantidad_intentos: 4, ultima_evidencia: 'Probando sensor' },
      { usuario_id: 2, mision_id: 'debug-loop', estado: 'disponible', estrellas_ganadas: 0, cantidad_intentos: 6, ultima_evidencia: 'Reintentando bucle en laboratorio' },
      { usuario_id: 3, mision_id: 'sequence-forest', estado: 'completada', estrellas_ganadas: 3, cantidad_intentos: 1, ultima_evidencia: 'Óptimo' },
      { usuario_id: 3, mision_id: 'sequence-city', estado: 'completada', estrellas_ganadas: 3, cantidad_intentos: 1, ultima_evidencia: 'Óptimo' },
      { usuario_id: 3, mision_id: 'sequence-moon', estado: 'completada', estrellas_ganadas: 3, cantidad_intentos: 1, ultima_evidencia: 'Óptimo' },
      { usuario_id: 3, mision_id: 'loop-bridge', estado: 'completada', estrellas_ganadas: 3, cantidad_intentos: 1, ultima_evidencia: 'Óptimo' },
      { usuario_id: 3, mision_id: 'loop-zigzag', estado: 'completada', estrellas_ganadas: 3, cantidad_intentos: 2, ultima_evidencia: 'Patrón completado' },
      { usuario_id: 3, mision_id: 'loop-garden', estado: 'completada', estrellas_ganadas: 3, cantidad_intentos: 2, ultima_evidencia: 'Jardín superado' },
      { usuario_id: 3, mision_id: 'condition-detour', estado: 'completada', estrellas_ganadas: 3, cantidad_intentos: 2, ultima_evidencia: 'Desvío superado' },
      { usuario_id: 3, mision_id: 'debug-condition', estado: 'completada', estrellas_ganadas: 3, cantidad_intentos: 3, ultima_evidencia: 'Depuración completada' },
      { usuario_id: 5, mision_id: 'sequence-forest', estado: 'completada', estrellas_ganadas: 1, cantidad_intentos: 4, ultima_evidencia: 'Meta alcanzada' },
      { usuario_id: 5, mision_id: 'loop-bridge', estado: 'disponible', estrellas_ganadas: 0, cantidad_intentos: 5, ultima_evidencia: 'Practicando bucle' },
      { usuario_id: 5, mision_id: 'debug-condition', estado: 'disponible', estrellas_ganadas: 0, cantidad_intentos: 5, ultima_evidencia: 'Practicando depuración' },
      { usuario_id: 6, mision_id: 'sequence-forest', estado: 'completada', estrellas_ganadas: 2, cantidad_intentos: 2, ultima_evidencia: 'Completada' },
      { usuario_id: 6, mision_id: 'sequence-city', estado: 'completada', estrellas_ganadas: 2, cantidad_intentos: 3, ultima_evidencia: 'Completada' },
      { usuario_id: 6, mision_id: 'loop-zigzag', estado: 'disponible', estrellas_ganadas: 0, cantidad_intentos: 4, ultima_evidencia: 'En curso' },
    ],
    aulas: [
      { id: 1, docente_id: 4, nombre_grupo: 'Exploradores de Pensamiento Computacional 5° A', nombre: 'Exploradores de Pensamiento Computacional 5° A', grado: '5° Primaria', codigo_acceso: '5° A', codigo_grupo: '5° A', anio_escolar: 2026, creado_en: '2026-10-01T09:00:00Z' },
      { id: 2, docente_id: 4, nombre_grupo: 'Laboratorio de Algoritmos y Python 6° B', nombre: 'Laboratorio de Algoritmos y Python 6° B', grado: '6° Primaria', codigo_acceso: '6° B', codigo_grupo: '6° B', anio_escolar: 2026, creado_en: '2026-10-01T09:10:00Z' },
    ],
    matriculas_aula: [
      { aula_id: 1, estudiante_id: 1, fecha_matricula: '2026-10-01T10:00:00Z' },
      { aula_id: 1, estudiante_id: 2, fecha_matricula: '2026-10-01T10:05:00Z' },
      { aula_id: 1, estudiante_id: 3, fecha_matricula: '2026-10-01T10:10:00Z' },
      { aula_id: 1, estudiante_id: 5, fecha_matricula: '2026-10-02T11:00:00Z' },
      { aula_id: 2, estudiante_id: 6, fecha_matricula: '2026-10-02T11:30:00Z' },
    ],
    retos_aula: [
      { id: 1, aula_id: 1, mision_id: 'sequence-forest', titulo: 'Reto 1: Secuencia en el Bosque', instrucciones: 'Construye la secuencia exacta de pasos para guiar a Pipo hasta la estrella.', tematica_habilidad: 'Secuencias', fecha_limite: '2026-11-15T23:59:00Z', activo: true, creado_en: '2026-10-05T10:00:00Z' },
      { id: 2, aula_id: 1, mision_id: 'loop-bridge', titulo: 'Reto 2: Cruza el Puente con Bucles', instrucciones: 'Usa el bloque repetir para cruzar el puente optimizando tus bloques.', tematica_habilidad: 'Bucles', fecha_limite: '2026-11-20T23:59:00Z', activo: true, creado_en: '2026-10-06T10:00:00Z' },
      { id: 3, aula_id: 1, mision_id: 'condition-detour', titulo: 'Reto 3: Sensor de Pared en la Cueva', instrucciones: 'Utiliza el condicional si hay pared para esquivar el obstáculo central.', tematica_habilidad: 'Condicionales', fecha_limite: '2026-11-25T23:59:00Z', activo: true, creado_en: '2026-10-07T10:00:00Z' },
      { id: 4, aula_id: 2, mision_id: 'debug-loop', titulo: 'Reto 4: Depuración de Bucle en 6° B', instrucciones: 'Identifica por qué el robot se detiene antes y ajusta las repeticiones.', tematica_habilidad: 'Bucles', fecha_limite: '2026-11-25T23:59:00Z', activo: true, creado_en: '2026-10-08T10:00:00Z' },
    ],
    entregas_retos: [
      { id: 1, reto_id: 1, estudiante_id: 1, puntuacion: 4.5, puntaje: 90, cantidad_intentos: 1, logrado: true, texto_evidencia: 'Orden: Inicio -> Avanzar -> Girar derecha -> Avanzar', retroalimentacion_ia: '¡Excelente dominio de secuencias paso a paso!', recomendacion_docente: 'Lista para avanzar a bucles con patrones.', estado: 'calificado', fecha_entrega: '2026-10-10T14:00:00Z' },
      { id: 2, reto_id: 2, estudiante_id: 1, puntuacion: 4.1, puntaje: 82, cantidad_intentos: 2, logrado: true, texto_evidencia: 'Bloque repetir 4 veces (avanzar)', retroalimentacion_ia: 'Buen uso del bucle repetir para ahorrar bloques.', recomendacion_docente: 'Practicar bucles anidados en el jardín.', estado: 'calificado', fecha_entrega: '2026-10-11T14:00:00Z' },
      { id: 3, reto_id: 1, estudiante_id: 2, puntuacion: 2.6, puntaje: 52, cantidad_intentos: 3, logrado: false, texto_evidencia: 'Orden incompleto: Avanzar -> Girar izquierda', retroalimentacion_ia: 'Casi llegas a la estrella; revisa el sentido del giro.', recomendacion_docente: 'Acompañar con tarjetas físicas de lateralidad.', estado: 'calificado', fecha_entrega: '2026-10-10T15:00:00Z' },
      { id: 4, reto_id: 2, estudiante_id: 2, puntuacion: 2.1, puntaje: 42, cantidad_intentos: 4, logrado: false, texto_evidencia: 'Bloque repetir 2 veces (se detuvo antes de la meta)', retroalimentacion_ia: 'El bucle funciona, pero necesitas contar los pasos totales.', recomendacion_docente: 'Reforzar conteo de casillas antes de programar el bucle.', estado: 'calificado', fecha_entrega: '2026-10-12T15:00:00Z' },
      { id: 5, reto_id: 1, estudiante_id: 3, puntuacion: 4.9, puntaje: 98, cantidad_intentos: 1, logrado: true, texto_evidencia: 'Secuencia óptima sin bloques redundantes', retroalimentacion_ia: '¡Ejecución impecable al primer intento!', recomendacion_docente: 'Asignar reto adicional en Laboratorio Python.', estado: 'calificado', fecha_entrega: '2026-10-10T16:00:00Z' },
      { id: 6, reto_id: 2, estudiante_id: 3, puntuacion: 4.8, puntaje: 96, cantidad_intentos: 1, logrado: true, texto_evidencia: 'Bloque repetir 4 veces con precisión', retroalimentacion_ia: 'Dominio total de iteración por bloques.', recomendacion_docente: 'Invitar a liderar mentoría entre pares.', estado: 'calificado', fecha_entrega: '2026-10-11T16:00:00Z' },
      { id: 7, reto_id: 1, estudiante_id: 5, puntuacion: 2.5, puntaje: 50, cantidad_intentos: 4, logrado: false, texto_evidencia: 'Secuencia sin bloque de giro final', retroalimentacion_ia: 'Avanzaste bien en línea recta, falta el giro hacia la meta.', recomendacion_docente: 'Guiar paso a paso el primer giro en el tablero.', estado: 'calificado', fecha_entrega: '2026-10-12T10:00:00Z' },
      { id: 8, reto_id: 3, estudiante_id: 5, puntuacion: 2.3, puntaje: 46, cantidad_intentos: 5, logrado: false, texto_evidencia: 'Condicional sin acción dentro del bloque si hay pared', retroalimentacion_ia: 'Detectaste el muro, ahora coloca el giro dentro del bloque condicional.', recomendacion_docente: 'Repasar causa-efecto con ejemplos cotidianos.', estado: 'calificado', fecha_entrega: '2026-10-13T10:00:00Z' },
      { id: 9, reto_id: 4, estudiante_id: 6, puntuacion: 2.7, puntaje: 54, cantidad_intentos: 4, logrado: false, texto_evidencia: 'Ajustó el bucle a 2 repeticiones en vez de 4', retroalimentacion_ia: 'Vas por buen camino identificando el bucle a reparar.', recomendacion_docente: 'Practicar trazado manual de iteraciones.', estado: 'calificado', fecha_entrega: '2026-10-14T10:00:00Z' },
    ],
  };
}

let memoryStore = createInitialRelationalSeed();

export function getRelationalStore() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(RELATIONAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        memoryStore = { ...createInitialRelationalSeed(), ...parsed };
      }
    } catch {
      /* continúa con memoryStore */
    }
  }
  return memoryStore;
}

export function saveRelationalStore(nextStore) {
  memoryStore = nextStore;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(RELATIONAL_STORAGE_KEY, JSON.stringify(memoryStore));
    } catch {
      /* opcional */
    }
  }
  return memoryStore;
}
