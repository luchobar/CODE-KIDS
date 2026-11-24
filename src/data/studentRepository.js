import { callTier2Api } from './httpClient.js';
import { DEFAULT_DIAGNOSTIC_SCORES, resolveStudentIdOrNull } from './seedData.js';
import { readClassroomCache } from './storageStore.js';
import { supabase } from './supabaseClient.js';

function buildStudentPayloadFromTier2(hudRes, mapRes, numericId, cleanEmail) {
  if (!hudRes?.data?.ok || !hudRes.data.hud) return null;

  const hud = hudRes.data.hud;
  const hudEmail = String(hud.correo || '').trim().toLowerCase();
  if (cleanEmail && hudEmail && cleanEmail !== hudEmail) {
    return {
      userId: numericId,
      name: 'Explorador',
      role: 'student',
      points: 0,
      coins: 20,
      streak: 1,
      avatar: 'dragon',
      ownedAvatars: ['astronaut', 'dragon'],
      scores: { ...DEFAULT_DIAGNOSTIC_SCORES },
      completedMissions: [],
      enrolledGroups: ['5° A'],
    };
  }

  const completedFromMap = (mapRes?.data?.missions || [])
    .filter((m) => m.estado_usuario === 'completada')
    .map((m) => m.mision_id);
  const cache = readClassroomCache();
  const enrolledGroups = Object.entries(cache.enrollmentsByGroup || {})
    .filter(([, ids]) => Array.isArray(ids) && ids.some((id) => Number(id) === Number(numericId)))
    .map(([groupCode]) => groupCode);

  const activeAvatar = hud.avatar_activo_id || 'dragon';
  return {
    userId: numericId,
    name: hud.nombre || 'Explorador',
    role: hud.rol === 'docente' ? 'teacher' : 'student',
    points: hud.puntos_xp ?? 0,
    coins: hud.saldo_monedas ?? 20,
    streak: hud.dias_racha ?? 1,
    avatar: activeAvatar,
    ownedAvatars: hud.avatares_desbloqueados?.length
      ? hud.avatares_desbloqueados
      : ['astronaut', activeAvatar],
    scores: hud.puntajes_diagnostico || { ...DEFAULT_DIAGNOSTIC_SCORES },
    completedMissions: completedFromMap,
    enrolledGroups: enrolledGroups.length ? enrolledGroups : ['5° A'],
  };
}

/**
 * Carga el perfil completo del estudiante (HUD, XP, avatares y progreso de misiones).
 * @param {number | string} userId
 * @param {string} [userEmail]
 */
export async function loadStudentFromSupabase(userId, userEmail = '') {
  const numericId = resolveStudentIdOrNull(userId);
  if (!numericId) return null;

  const cleanEmail = String(userEmail || '').trim().toLowerCase();
  const [hudRes, mapRes] = await Promise.all([
    callTier2Api(`/students/${numericId}/hud`),
    callTier2Api(`/missions/map?usuarioId=${numericId}`),
  ]);

  const tier2Profile = buildStudentPayloadFromTier2(hudRes, mapRes, numericId, cleanEmail);
  if (!supabase) return tier2Profile;

  try {
    let { data: user } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, rol')
      .eq('id', numericId)
      .maybeSingle();

    if (
      cleanEmail &&
      (!user || (user.correo && String(user.correo).trim().toLowerCase() !== cleanEmail))
    ) {
      const { data: userByEmail } = await supabase
        .from('usuarios')
        .select('id, nombre, correo, rol')
        .eq('correo', cleanEmail)
        .maybeSingle();
      user = userByEmail || null;
    }

    if (!user) return tier2Profile;
    const resolvedUid = user.id;

    const [{ data: perfil }, { data: progreso }, { data: avatares }] = await Promise.all([
      supabase
        .from('perfiles_gamificacion')
        .select('puntos_xp, nivel_actual, saldo_monedas, dias_racha, avatar_activo_id, puntajes_diagnostico')
        .eq('usuario_id', resolvedUid)
        .maybeSingle(),
      supabase
        .from('progreso_misiones_usuario')
        .select('mision_id, estado, estrellas_ganadas')
        .eq('usuario_id', resolvedUid),
      supabase
        .from('inventario_avatares_usuario')
        .select('avatar_id')
        .eq('usuario_id', resolvedUid),
    ]);

    const rawCompletedIds = (progreso || [])
      .filter((p) => p.estado === 'completada')
      .map((p) => p.mision_id);

    let completedMissions = [...rawCompletedIds];
    if (rawCompletedIds.length > 0) {
      const { data: misionesMeta } = await supabase
        .from('misiones')
        .select('id, slug')
        .in('id', rawCompletedIds);

      if (Array.isArray(misionesMeta)) {
        const mappedSlugs = misionesMeta.map((m) => m.slug || m.id).filter(Boolean);
        completedMissions = Array.from(new Set([...rawCompletedIds, ...mappedSlugs]));
      }
    }

    const ownedAvatars = (avatares || []).map((a) => a.avatar_id);
    let enrolledGroups = [];
    try {
      const { data: matriculas } = await supabase
        .from('matriculas_aula')
        .select('aula_id, aulas(codigo_grupo)')
        .eq('estudiante_id', resolvedUid);

      if (Array.isArray(matriculas)) {
        enrolledGroups = matriculas.map((m) => m.aulas?.codigo_grupo).filter(Boolean);
      }
    } catch {
      enrolledGroups = [];
    }

    const activeAvatar = perfil?.avatar_activo_id || 'dragon';
    return {
      userId: resolvedUid,
      name: user.nombre,
      role: user.rol === 'docente' ? 'teacher' : 'student',
      points: perfil?.puntos_xp ?? 0,
      coins: perfil?.saldo_monedas ?? 20,
      streak: perfil?.dias_racha ?? 1,
      avatar: activeAvatar,
      ownedAvatars: ownedAvatars.length ? ownedAvatars : ['astronaut', activeAvatar],
      scores: perfil?.puntajes_diagnostico || { ...DEFAULT_DIAGNOSTIC_SCORES },
      completedMissions,
      enrolledGroups,
    };
  } catch {
    return tier2Profile;
  }
}

/**
 * Sincroniza la recompensa al superar una misión.
 * Corrige el bug de doble escritura: si Tier 2 confirma, no vuelve a incrementar XP/monedas en Supabase.
 * @param {number | string} userId
 * @param {string} missionIdOrSlug
 * @param {number} [stars=3]
 * @param {number} [xp=10]
 * @param {number} [coins=10]
 */
export async function syncMissionSuccess(userId, missionIdOrSlug, stars = 3, xp = 10, coins = 10) {
  const numericId = resolveStudentIdOrNull(userId);
  if (!numericId) return false;

  const apiRes = await callTier2Api(`/students/${numericId}/rewards`, {
    method: 'PATCH',
    body: {
      misionId: missionIdOrSlug,
      estrellas: stars,
      xpGanado: xp,
      monedasGanadas: coins,
    },
  });

  if (apiRes?.httpOk && apiRes?.data?.ok) {
    return true;
  }

  if (!supabase) return false;

  try {
    let resolvedMissionId = missionIdOrSlug;
    const { data: bySlug } = await supabase
      .from('misiones')
      .select('id')
      .eq('slug', missionIdOrSlug)
      .maybeSingle();
    if (bySlug?.id) resolvedMissionId = bySlug.id;

    await supabase.from('progreso_misiones_usuario').upsert({
      usuario_id: numericId,
      mision_id: resolvedMissionId,
      estado: 'completada',
      estrellas_ganadas: stars,
      completada_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    });

    const { data: perfil } = await supabase
      .from('perfiles_gamificacion')
      .select('puntos_xp, saldo_monedas')
      .eq('usuario_id', numericId)
      .maybeSingle();

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
  } catch {
    return false;
  }
}

/**
 * Registra la compra de un avatar validando saldo suficiente sin doble débito.
 * @param {number | string} userId
 * @param {string} avatarId
 * @param {number} [cost=0]
 */
export async function syncAvatarPurchase(userId, avatarId, cost = 0) {
  const numericId = resolveStudentIdOrNull(userId);
  if (!numericId) {
    return { ok: false, error: 'Identificador de estudiante inválido.' };
  }

  const numericCost = Math.max(0, Number(cost) || 0);
  const apiRes = await callTier2Api('/store/purchase', {
    method: 'POST',
    body: {
      usuarioId: numericId,
      avatarId,
      costo: numericCost,
    },
  });

  if (apiRes?.data) {
    if (!apiRes.data.ok) {
      return {
        ok: false,
        error: apiRes.data.error || 'Saldo de monedas insuficiente para desbloquear este avatar.',
      };
    }
    return { ok: true, ...apiRes.data };
  }

  if (!supabase) {
    return { ok: false, error: 'Servicio de tienda no disponible.' };
  }

  try {
    const { data: perfil } = await supabase
      .from('perfiles_gamificacion')
      .select('saldo_monedas')
      .eq('usuario_id', numericId)
      .maybeSingle();

    const saldoActual = Number(perfil?.saldo_monedas ?? 0);
    if (!perfil || saldoActual < numericCost) {
      return {
        ok: false,
        error: 'Saldo de monedas insuficiente para desbloquear este avatar.',
      };
    }

    const nuevoSaldo = saldoActual - numericCost;
    await supabase
      .from('perfiles_gamificacion')
      .update({
        saldo_monedas: nuevoSaldo,
        avatar_activo_id: avatarId,
        actualizado_en: new Date().toISOString(),
      })
      .eq('usuario_id', numericId);

    await supabase.from('inventario_avatares_usuario').upsert({
      usuario_id: numericId,
      avatar_id: avatarId,
    });

    return { ok: true, saldo_monedas: nuevoSaldo };
  } catch (err) {
    return { ok: false, error: err?.message || 'Error al procesar compra de avatar.' };
  }
}

/**
 * Actualiza el avatar equipado del estudiante sin doble escritura cuando Tier 2 confirma.
 * @param {number | string} userId
 * @param {string} avatarId
 */
export async function syncAvatarSelection(userId, avatarId) {
  const numericId = resolveStudentIdOrNull(userId);
  if (!numericId) return false;

  const apiRes = await callTier2Api(`/students/${numericId}/avatar`, {
    method: 'PATCH',
    body: { avatarId },
  });

  if (apiRes?.httpOk && apiRes?.data?.ok) {
    return true;
  }

  if (!supabase) return false;

  try {
    await supabase
      .from('perfiles_gamificacion')
      .update({
        avatar_activo_id: avatarId,
        actualizado_en: new Date().toISOString(),
      })
      .eq('usuario_id', numericId);
    return true;
  } catch {
    return false;
  }
}
