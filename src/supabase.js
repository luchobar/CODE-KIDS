import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    typeof supabaseUrl === 'string' &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('placeholder'),
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Mapa de perfiles rápidos locales a IDs numéricos de Supabase
export const QUICK_PROFILE_IDS = {
  sofi: 1,
  mateo: 2,
  valeria: 3,
  profe: 4,
};

/**
 * Carga el perfil completo de un estudiante desde Supabase (HUD, XP, Avatares, Progreso).
 */
export async function loadStudentFromSupabase(userId) {
  if (!supabase) return null;

  try {
    const numericId = typeof userId === 'number' ? userId : QUICK_PROFILE_IDS[userId] || 1;

    // 1. Datos de usuario
    const { data: user, error: userError } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, rol, etiqueta_rapida')
      .eq('id', numericId)
      .single();

    if (userError || !user) {
      console.warn('[Supabase] No se encontró el usuario:', userError);
      return null;
    }

    // 2. Perfil gamificado (XP, monedas, racha, avatar activo)
    const { data: perfil } = await supabase
      .from('perfiles_gamificacion')
      .select('puntos_xp, nivel_actual, saldo_monedas, dias_racha, avatar_activo_id, puntajes_diagnostico')
      .eq('usuario_id', numericId)
      .single();

    // 3. Progreso de misiones
    const { data: progreso } = await supabase
      .from('progreso_misiones_usuario')
      .select('mision_id, estado, estrellas_ganadas')
      .eq('usuario_id', numericId);

    // 4. Inventario de avatares desbloqueados
    const { data: avatares } = await supabase
      .from('inventario_avatares_usuario')
      .select('avatar_id')
      .eq('usuario_id', numericId);

    const completedMissions = (progreso || [])
      .filter((p) => p.estado === 'completada')
      .map((p) => p.mision_id);

    const ownedAvatars = (avatares || []).map((a) => a.avatar_id);

    return {
      userId: numericId,
      name: user.nombre,
      role: user.rol === 'docente' ? 'teacher' : 'student',
      points: perfil?.puntos_xp || 0,
      coins: perfil?.saldo_monedas || 0,
      streak: perfil?.dias_racha || 1,
      avatar: perfil?.avatar_activo_id || 'dragon',
      ownedAvatars: ownedAvatars.length ? ownedAvatars : ['astronaut'],
      scores: perfil?.puntajes_diagnostico || {
        Secuencias: 75,
        Bucles: 45,
        Condicionales: 80,
        Descomposición: 55,
      },
      completedMissions,
    };
  } catch (err) {
    console.error('[Supabase] Error cargando estudiante:', err);
    return null;
  }
}

/**
 * Guarda en Supabase cuando un estudiante supera una misión.
 */
export async function syncMissionSuccess(userId, missionId, stars = 3, xp = 10, coins = 10) {
  if (!supabase) return false;

  try {
    const numericId = typeof userId === 'number' ? userId : QUICK_PROFILE_IDS[userId] || 1;

    // 1. Guardar progreso en la tabla de misiones
    await supabase.from('progreso_misiones_usuario').upsert({
      usuario_id: numericId,
      mision_id: missionId,
      estado: 'completada',
      estrellas_ganadas: stars,
      completada_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    });

    // 2. Incrementar puntos de experiencia y monedas en el perfil
    const { data: perfil } = await supabase
      .from('perfiles_gamificacion')
      .select('puntos_xp, saldo_monedas')
      .eq('usuario_id', numericId)
      .single();

    if (perfil) {
      await supabase
        .from('perfiles_gamificacion')
        .update({
          puntos_xp: (perfil.puntos_xp || 0) + xp,
          saldo_monedas: (perfil.saldo_monedas || 0) + coins,
          actualizado_en: new Date().toISOString(),
        })
        .eq('usuario_id', numericId);
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Error guardando progreso de misión:', err);
    return false;
  }
}

/**
 * Registra la compra o equipamiento de un avatar en Supabase.
 */
export async function syncAvatarPurchase(userId, avatarId, cost = 0) {
  if (!supabase) return false;

  try {
    const numericId = typeof userId === 'number' ? userId : QUICK_PROFILE_IDS[userId] || 1;

    // 1. Insertar en inventario si no lo tiene
    await supabase.from('inventario_avatares_usuario').upsert({
      usuario_id: numericId,
      avatar_id: avatarId,
    });

    // 2. Descontar monedas y equipar
    const { data: perfil } = await supabase
      .from('perfiles_gamificacion')
      .select('saldo_monedas')
      .eq('usuario_id', numericId)
      .single();

    if (perfil) {
      await supabase
        .from('perfiles_gamificacion')
        .update({
          saldo_monedas: Math.max(0, (perfil.saldo_monedas || 0) - cost),
          avatar_activo_id: avatarId,
          actualizado_en: new Date().toISOString(),
        })
        .eq('usuario_id', numericId);
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Error guardando avatar:', err);
    return false;
  }
}
