import { createClient } from '@supabase/supabase-js';
import {
  SEED_DEMO_PASSWORD_HASH,
  hashUserPassword,
  verifyUserPassword,
} from './services/password.util.js';

/**
 * Cliente HTTP hacia la Capa de Lógica de Negocio (Tier 2 — Express REST API `/api/v1/*`).
 * Garantiza coherencia en la Arquitectura Cliente/Servidor en 3 Capas:
 *   Capa 1 (Presentación React) -> Capa 2 (API REST Express `/api/v1/*`) -> Capa 3 (PostgreSQL / Supabase / 3FN).
 * Si el backend Express no está accesible (modo estático u offline), retorna `null`
 * para activar automáticamente el mecanismo de resiliencia local/nube.
 */
export async function callTier2Api(endpointPath, { method = 'GET', body } = {}) {
  if (typeof fetch !== 'function') return null;
  try {
    const response = await fetch(`/api/v1${endpointPath}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const contentType = response.headers?.get?.('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    const data = await response.json();
    return { status: response.status, httpOk: response.ok, data };
  } catch {
    return null;
  }
}

function cleanSupabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim().replace(/^["']|["']$/g, '');
  // Eliminar cualquier subruta si se copió con /rest/v1 o /auth/v1
  url = url.replace(/\/(rest|auth)(\/v\d+)?\/?$/i, '');
  // Eliminar barras diagonales al final
  url = url.replace(/\/+$/, '');
  return url;
}

function cleanAnonKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return '';
  return rawKey.trim().replace(/^["']|["']$/g, '');
}

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseUrl = cleanSupabaseUrl(rawSupabaseUrl);
export const supabaseAnonKey = cleanAnonKey(rawSupabaseAnonKey);

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('placeholder'),
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

// Mapa de perfiles rápidos a IDs numéricos
export const QUICK_PROFILE_IDS = {
  sofi: 1,
  mateo: 2,
  valeria: 3,
  profe: 4,
};

const LOCAL_ACCOUNTS_KEY = 'codekids-registered-accounts';

// Cuentas oficiales para sustentación y presentación universitaria.
// NOTA TÉCNICA DE SEGURIDAD CRIPTOGRÁFICA (Sustentación):
//   El campo `passwordHash` almacena el resumen criptográfico PBKDF2-HMAC-SHA256
//   (`SEED_DEMO_PASSWORD_HASH`) que coincide con la columna `contrasena_hash` de `usuarios`.
//   La lista `demoFallbacks` se conserva exclusivamente para un entorno pedagógico controlado
//   de sustentación académica cuando el evaluador utiliza los accesos rápidos de demostración.
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

function getLocalRegisteredAccounts() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveLocalRegisteredAccount(email, accountData) {
  try {
    const current = getLocalRegisteredAccounts();
    const { password: _omitPlainPassword, ...safeAccountData } = accountData || {};
    current[email] = safeAccountData;
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(current));
  } catch {
    /* localStorage opcional */
  }
}

/**
 * Autentica al usuario por correo y contraseña consumiendo primero la Capa de Negocio
 * (`POST /api/v1/users/login`) y verificando criptográficamente `contrasena_hash` (PBKDF2-SHA256 / Argon2id).
 */
export async function authenticateUser(email, password) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const trimmedPassword = (password || '').trim();

  if (!normalizedEmail) {
    return { ok: false, error: 'Por favor ingresa tu correo electrónico.' };
  }
  if (!trimmedPassword) {
    return { ok: false, error: 'Por favor ingresa tu contraseña.' };
  }

  const known = UNIVERSITY_ACCOUNTS[normalizedEmail];

  // 1. Capa de Negocio Express (Tier 2: POST /api/v1/users/login)
  const apiRes = await callTier2Api('/users/login', {
    method: 'POST',
    body: {
      correo: normalizedEmail,
      contrasena: trimmedPassword,
      demoFallbacks: known?.demoFallbacks || [],
    },
  });

  if (
    apiRes?.data?.ok &&
    apiRes.data.user &&
    (!supabase || apiRes.data.source === 'supabase' || apiRes.data.source === 'postgresql')
  ) {
    const u = apiRes.data.user;
    return {
      ok: true,
      source: apiRes.data.source || 'api-v1',
      user: {
        id: u.id,
        name: u.nombre || u.name,
        email: u.correo || u.email,
        role: u.rol === 'docente' || u.role === 'teacher' ? 'teacher' : 'student',
        avatar: u.avatar || known?.avatar || 'dragon',
      },
    };
  }

  // 2. Respaldo Supabase con verificación criptográfica PBKDF2-SHA256
  if (supabase) {
    try {
      const { data: dbUser, error } = await supabase
        .from('usuarios')
        .select('id, nombre, correo, rol, contrasena_hash, etiqueta_rapida, activo')
        .eq('correo', normalizedEmail)
        .maybeSingle();

      if (error) {
        console.warn('[Supabase Auth Query Error]', error);
      }

      if (dbUser) {
        if (dbUser.activo === false) {
          return { ok: false, error: 'Esta cuenta se encuentra desactivada.' };
        }

        const storedHash = dbUser.contrasena_hash
          ? String(dbUser.contrasena_hash).trim()
          : known?.passwordHash || '';

        const passwordMatches = await verifyUserPassword(
          trimmedPassword,
          storedHash,
          known?.demoFallbacks || [],
        );

        if (!passwordMatches) {
          return {
            ok: false,
            error: 'Contraseña incorrecta para este correo electrónico. Verifica e intenta de nuevo.',
          };
        }

        supabase
          .from('usuarios')
          .update({ ultimo_acceso_en: new Date().toISOString() })
          .eq('id', dbUser.id)
          .then(() => {})
          .catch(() => {});

        const { data: perfil } = await supabase
          .from('perfiles_gamificacion')
          .select('avatar_activo_id')
          .eq('usuario_id', dbUser.id)
          .maybeSingle();

        return {
          ok: true,
          user: {
            id: dbUser.id,
            name: dbUser.nombre,
            email: dbUser.correo,
            role: dbUser.rol === 'docente' ? 'teacher' : 'student',
            avatar: perfil?.avatar_activo_id || known?.avatar || 'dragon',
          },
        };
      }

      if (apiRes?.data?.ok && apiRes.data.user) {
        const u = apiRes.data.user;
        return {
          ok: true,
          source: apiRes.data.source || 'api-v1',
          user: {
            id: u.id,
            name: u.nombre || u.name,
            email: u.correo || u.email,
            role: u.rol === 'docente' || u.role === 'teacher' ? 'teacher' : 'student',
            avatar: u.avatar || known?.avatar || 'dragon',
          },
        };
      }

      return {
        ok: false,
        error: 'No existe ninguna cuenta registrada con este correo en la base de datos. Ve a la pestaña «Crear cuenta» para registrarte.',
      };
    } catch (err) {
      console.warn('[Supabase Auth Exception]', err);
    }
  }

  if (apiRes?.data?.ok && apiRes.data.user) {
    const u = apiRes.data.user;
    return {
      ok: true,
      source: apiRes.data.source || 'api-v1',
      user: {
        id: u.id,
        name: u.nombre || u.name,
        email: u.correo || u.email,
        role: u.rol === 'docente' || u.role === 'teacher' ? 'teacher' : 'student',
        avatar: u.avatar || known?.avatar || 'dragon',
      },
    };
  }

  // 3. Respaldo local con verificación criptográfica PBKDF2-SHA256
  const localAccounts = getLocalRegisteredAccounts();
  const localUser = localAccounts[normalizedEmail];
  if (localUser) {
    const validLocal = await verifyUserPassword(
      trimmedPassword,
      localUser.passwordHash || localUser.password || '',
    );
    if (!validLocal) {
      return {
        ok: false,
        error: 'Contraseña incorrecta para este correo electrónico. Verifica e intenta de nuevo.',
      };
    }
    return {
      ok: true,
      user: {
        id: localUser.id,
        name: localUser.name,
        email: localUser.email,
        role: localUser.role,
        avatar: localUser.avatar || 'dragon',
      },
    };
  }

  if (known) {
    const validAcademic = await verifyUserPassword(
      trimmedPassword,
      known.passwordHash,
      known.demoFallbacks,
    );
    if (validAcademic) {
      return {
        ok: true,
        user: {
          id: known.id,
          name: known.name,
          email: known.email,
          role: known.role,
          avatar: known.avatar,
        },
      };
    }
    return { ok: false, error: 'Contraseña incorrecta para esta cuenta institucional.' };
  }

  if (apiRes?.data?.error) {
    return { ok: false, error: apiRes.data.error };
  }

  return {
    ok: false,
    error: 'No existe ninguna cuenta registrada con este correo. Primero debes registrarte en «Crear cuenta».',
  };
}

/**
 * Registra un nuevo usuario consumiendo primero `POST /api/v1/users` (Capa 2 Express)
 * y almacenando su contraseña exclusivamente como hash criptográfico PBKDF2-SHA256.
 */
export async function registerUser({ name, email, password, role = 'student', avatar = 'dragon' }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const trimmedPassword = (password || '').trim();
  const userName = (name || '').trim() || (role === 'teacher' ? 'Docente' : 'Explorador');
  const userRole = role === 'teacher' ? 'docente' : 'estudiante';

  if (!normalizedEmail) {
    return { ok: false, error: 'Por favor ingresa un correo electrónico.' };
  }
  if (!trimmedPassword || trimmedPassword.length < 8) {
    return { ok: false, error: 'La contraseña debe tener mínimo 8 caracteres.' };
  }

  // Derivar hash criptográfico PBKDF2-HMAC-SHA256 antes de transmitir o almacenar
  const passwordHash = await hashUserPassword(trimmedPassword);

  // 1. Capa de Negocio Express (Tier 2: POST /api/v1/users)
  const apiRes = await callTier2Api('/users', {
    method: 'POST',
    body: {
      nombre: userName,
      correo: normalizedEmail,
      contrasena: passwordHash,
      rol: userRole,
      avatar,
    },
  });

  if (
    apiRes?.data &&
    (!supabase || apiRes.data.source === 'supabase' || apiRes.data.source === 'postgresql')
  ) {
    if (!apiRes.data.ok) {
      return { ok: false, error: apiRes.data.error || 'No fue posible registrar el usuario.' };
    }
    const created = apiRes.data.user || {};
    const newUserId = created.id || Date.now();
    saveLocalRegisteredAccount(normalizedEmail, {
      id: newUserId,
      name: userName,
      email: normalizedEmail,
      passwordHash,
      role,
      avatar,
    });
    return {
      ok: true,
      source: apiRes.data.source || 'api-v1',
      user: {
        id: newUserId,
        name: created.nombre || userName,
        email: created.correo || normalizedEmail,
        role,
        avatar,
      },
    };
  }

  // 2. Si el backend no está disponible y Supabase no está configurado, guardar en registro local con hash
  if (!supabase) {
    const localAccounts = getLocalRegisteredAccounts();
    if (localAccounts[normalizedEmail] || UNIVERSITY_ACCOUNTS[normalizedEmail]) {
      return { ok: false, error: 'Este correo ya está registrado. Por favor inicia sesión con tu contraseña.' };
    }
    const newLocalUser = {
      id: Date.now(),
      name: userName,
      email: normalizedEmail,
      passwordHash,
      role,
      avatar,
    };
    saveLocalRegisteredAccount(normalizedEmail, newLocalUser);
    return {
      ok: true,
      user: {
        id: newLocalUser.id,
        name: newLocalUser.name,
        email: newLocalUser.email,
        role: newLocalUser.role,
        avatar: newLocalUser.avatar,
      },
    };
  }

  try {
    const { data: existente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('correo', normalizedEmail)
      .maybeSingle();

    if (existente) {
      return { ok: false, error: 'Este correo ya está registrado en la base de datos. Por favor inicia sesión.' };
    }

    const { data: nuevo, error: errInsert } = await supabase
      .from('usuarios')
      .insert([
        {
          correo: normalizedEmail,
          nombre: userName,
          rol: userRole,
          contrasena_hash: passwordHash,
          correo_verificado_en: new Date().toISOString(),
          es_perfil_rapido: false,
          activo: true,
        },
      ])
      .select('id, nombre, correo, rol');

    if (errInsert) {
      console.error('[Supabase Register Error]', errInsert);
      return {
        ok: false,
        error: `Error de Supabase: ${errInsert.message || errInsert.details || 'Permiso denegado'}. Si dice "violates row-level security policy", ejecuta el script de permisos en SQL Editor.`,
      };
    }

    const usuarioInsertado = Array.isArray(nuevo) ? nuevo[0] : nuevo;
    let newUserId = usuarioInsertado?.id;

    if (!newUserId) {
      const { data: buscado } = await supabase
        .from('usuarios')
        .select('id')
        .eq('correo', normalizedEmail)
        .maybeSingle();
      newUserId = buscado?.id;
    }

    saveLocalRegisteredAccount(normalizedEmail, {
      id: newUserId || Date.now(),
      name: userName,
      email: normalizedEmail,
      passwordHash,
      role,
      avatar,
    });

    if (userRole === 'estudiante' && newUserId) {
      await supabase.from('perfiles_gamificacion').upsert({
        usuario_id: newUserId,
        puntos_xp: 0,
        saldo_monedas: 20,
        dias_racha: 1,
        avatar_activo_id: avatar || 'dragon',
        sonido_habilitado: true,
      });

      await supabase.from('inventario_avatares_usuario').upsert({
        usuario_id: newUserId,
        avatar_id: 'astronaut',
      });
      await supabase.from('inventario_avatares_usuario').upsert({
        usuario_id: newUserId,
        avatar_id: avatar || 'dragon',
      });
    }

    return {
      ok: true,
      user: {
        id: newUserId || Date.now(),
        name: userName,
        email: normalizedEmail,
        role,
        avatar,
      },
    };
  } catch (e) {
    console.error('[Supabase Register Exception]', e);
    return { ok: false, error: `Excepción al conectar con Supabase: ${e?.message || e}` };
  }
}

/**
 * Actualiza la contraseña de un correo aplicando hash criptográfico PBKDF2-SHA256
 * a través de `PATCH /api/v1/users/password` con respaldo en Supabase y local.
 */
export async function updatePasswordForEmail(email, newPassword) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const trimmedPassword = (newPassword || '').trim();

  if (!normalizedEmail) {
    return { ok: false, error: 'Por favor ingresa tu correo electrónico.' };
  }
  if (!trimmedPassword || trimmedPassword.length < 8) {
    return { ok: false, error: 'La nueva contraseña debe tener mínimo 8 caracteres.' };
  }

  const passwordHash = await hashUserPassword(trimmedPassword);

  // 1. Capa de Negocio Express (Tier 2: PATCH /api/v1/users/password)
  const apiRes = await callTier2Api('/users/password', {
    method: 'PATCH',
    body: {
      correo: normalizedEmail,
      nuevaContrasena: passwordHash,
    },
  });

  if (apiRes?.data?.ok) {
    const localAccounts = getLocalRegisteredAccounts();
    if (localAccounts[normalizedEmail]) {
      localAccounts[normalizedEmail].passwordHash = passwordHash;
      saveLocalRegisteredAccount(normalizedEmail, localAccounts[normalizedEmail]);
    }
    return { ok: true, message: '¡Contraseña actualizada criptográficamente! Ya puedes iniciar sesión.' };
  }

  if (supabase) {
    try {
      const { data: existing, error: findErr } = await supabase
        .from('usuarios')
        .select('id, correo')
        .eq('correo', normalizedEmail)
        .maybeSingle();

      if (findErr) {
        return { ok: false, error: `Error al consultar la base de datos: ${findErr.message}` };
      }
      if (!existing) {
        return { ok: false, error: 'No encontramos ninguna cuenta registrada con ese correo electrónico.' };
      }

      const { error: updateErr } = await supabase
        .from('usuarios')
        .update({
          contrasena_hash: passwordHash,
          actualizado_en: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateErr) {
        return { ok: false, error: `No se pudo actualizar la contraseña: ${updateErr.message}` };
      }

      const localAccounts = getLocalRegisteredAccounts();
      if (localAccounts[normalizedEmail]) {
        localAccounts[normalizedEmail].passwordHash = passwordHash;
        saveLocalRegisteredAccount(normalizedEmail, localAccounts[normalizedEmail]);
      }

      return { ok: true, message: '¡Contraseña actualizada en la base de datos! Ya puedes iniciar sesión.' };
    } catch (err) {
      return { ok: false, error: `Error al actualizar contraseña: ${err?.message || err}` };
    }
  }

  const localAccounts = getLocalRegisteredAccounts();
  if (localAccounts[normalizedEmail]) {
    localAccounts[normalizedEmail].passwordHash = passwordHash;
    saveLocalRegisteredAccount(normalizedEmail, localAccounts[normalizedEmail]);
    return { ok: true, message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
  }

  return { ok: false, error: 'No encontramos ninguna cuenta registrada con ese correo electrónico.' };
}

function resolveNumericStudentId(userId) {
  if (typeof userId === 'number' && Number.isFinite(userId)) return userId;
  if (typeof userId === 'string') {
    const clean = userId.trim().toLowerCase();
    if (QUICK_PROFILE_IDS[clean]) return QUICK_PROFILE_IDS[clean];
    const parsed = Number(clean);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 1;
}

/**
 * Carga el perfil completo de un estudiante (HUD, XP, Avatares, Progreso)
 * consultando primero la API REST Express (`GET /api/v1/students/:id/hud` y `GET /api/v1/missions/map`)
 * y manteniendo el respaldo de Supabase / local.
 */
export async function loadStudentFromSupabase(userId, userEmail = '') {
  const numericId = resolveNumericStudentId(userId);
  const cleanEmail = String(userEmail || '').trim().toLowerCase();

  // 1. Capa de Negocio Express (Tier 2: GET /api/v1/students/:id/hud + GET /api/v1/missions/map)
  const [hudRes, mapRes] = await Promise.all([
    callTier2Api(`/students/${numericId}/hud`),
    callTier2Api(`/missions/map?usuarioId=${numericId}`),
  ]);

  const buildFromTier2 = () => {
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
        scores: {
          Secuencias: 75,
          Bucles: 45,
          Condicionales: 80,
          Descomposición: 55,
        },
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

    return {
      userId: numericId,
      name: hud.nombre || 'Explorador',
      role: hud.rol === 'docente' ? 'teacher' : 'student',
      points: hud.puntos_xp ?? 0,
      coins: hud.saldo_monedas ?? 20,
      streak: hud.dias_racha ?? 1,
      avatar: hud.avatar_activo_id || 'dragon',
      ownedAvatars: hud.avatares_desbloqueados?.length ? hud.avatares_desbloqueados : ['astronaut', hud.avatar_activo_id || 'dragon'],
      scores: hud.puntajes_diagnostico || {
        Secuencias: 75,
        Bucles: 45,
        Condicionales: 80,
        Descomposición: 55,
      },
      completedMissions: completedFromMap,
      enrolledGroups: enrolledGroups.length ? enrolledGroups : ['5° A'],
    };
  };

  if (!supabase) {
    return buildFromTier2();
  }

  try {
    // 1. Datos de usuario (verificando coincidencia de correo si se proporcionó)
    let { data: user } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, rol, etiqueta_rapida')
      .eq('id', numericId)
      .maybeSingle();

    if (
      cleanEmail &&
      (!user || (user.correo && String(user.correo).trim().toLowerCase() !== cleanEmail))
    ) {
      const { data: userByEmail } = await supabase
        .from('usuarios')
        .select('id, nombre, correo, rol, etiqueta_rapida')
        .eq('correo', cleanEmail)
        .maybeSingle();
      user = userByEmail || null;
    }

    if (!user) {
      return buildFromTier2();
    }

    const resolvedUid = user.id;

    // 2. Perfil gamificado (XP, monedas, racha, avatar activo)
    const { data: perfil } = await supabase
      .from('perfiles_gamificacion')
      .select('puntos_xp, nivel_actual, saldo_monedas, dias_racha, avatar_activo_id, puntajes_diagnostico')
      .eq('usuario_id', resolvedUid)
      .maybeSingle();

    // 3. Progreso de misiones (resolviendo tanto IDs clásicos como slugs de expansión)
    const { data: progreso } = await supabase
      .from('progreso_misiones_usuario')
      .select('mision_id, estado, estrellas_ganadas')
      .eq('usuario_id', resolvedUid);

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

    // 4. Inventario de avatares desbloqueados
    const { data: avatares } = await supabase
      .from('inventario_avatares_usuario')
      .select('avatar_id')
      .eq('usuario_id', resolvedUid);

    const ownedAvatars = (avatares || []).map((a) => a.avatar_id);

    // 5. Cursos en los que está matriculado el estudiante
    let enrolledGroups = [];
    try {
      const { data: matriculas } = await supabase
        .from('matriculas_aula')
        .select('aula_id, aulas(codigo_grupo)')
        .eq('estudiante_id', resolvedUid);

      if (Array.isArray(matriculas)) {
        enrolledGroups = matriculas
          .map((m) => m.aulas?.codigo_grupo)
          .filter(Boolean);
      }
    } catch {
      /* continúa con respaldo local */
    }

    return {
      userId: resolvedUid,
      name: user.nombre,
      role: user.rol === 'docente' ? 'teacher' : 'student',
      points: perfil?.puntos_xp ?? 0,
      coins: perfil?.saldo_monedas ?? 20,
      streak: perfil?.dias_racha ?? 1,
      avatar: perfil?.avatar_activo_id || 'dragon',
      ownedAvatars: ownedAvatars.length ? ownedAvatars : ['astronaut', perfil?.avatar_activo_id || 'dragon'],
      scores: perfil?.puntajes_diagnostico || {
        Secuencias: 75,
        Bucles: 45,
        Condicionales: 80,
        Descomposición: 55,
      },
      completedMissions,
      enrolledGroups,
    };
  } catch (err) {
    console.error('[Supabase] Error cargando estudiante:', err);
    return buildFromTier2();
  }
}

/**
 * Guarda cuando un estudiante supera una misión invocando primero
 * `PATCH /api/v1/students/:id/rewards` (Capa 2 Express) con respaldo en Supabase.
 */
export async function syncMissionSuccess(userId, missionIdOrSlug, stars = 3, xp = 10, coins = 10) {
  const numericId = resolveNumericStudentId(userId);

  // 1. Capa de Negocio Express (Tier 2: PATCH /api/v1/students/:id/rewards)
  const apiRes = await callTier2Api(`/students/${numericId}/rewards`, {
    method: 'PATCH',
    body: {
      misionId: missionIdOrSlug,
      estrellas: stars,
      xpGanado: xp,
      monedasGanadas: coins,
    },
  });

  if (apiRes?.data?.ok && !supabase) {
    return true;
  }

  if (!supabase) return Boolean(apiRes?.data?.ok);

  try {
    let resolvedMissionId = missionIdOrSlug;
    const { data: bySlug } = await supabase
      .from('misiones')
      .select('id')
      .eq('slug', missionIdOrSlug)
      .maybeSingle();

    if (bySlug?.id) {
      resolvedMissionId = bySlug.id;
    }

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
  } catch (err) {
    console.error('[Supabase] Error guardando progreso de misión:', err);
    return false;
  }
}

/**
 * Registra la compra de un avatar invocando primero `POST /api/v1/store/purchase` (Capa 2 Express)
 * con validación estricta de `saldo_monedas >= costo`.
 */
export async function syncAvatarPurchase(userId, avatarId, cost = 0) {
  const numericId = resolveNumericStudentId(userId);
  const numericCost = Math.max(0, Number(cost) || 0);

  // 1. Capa de Negocio Express (Tier 2: POST /api/v1/store/purchase)
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

  if (!supabase) return { ok: false, error: 'Servicio de tienda no disponible.' };

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
    console.error('[Supabase] Error guardando avatar:', err);
    return { ok: false, error: err?.message || 'Error al procesar compra de avatar.' };
  }
}

/**
 * Sincroniza el cambio de avatar activo invocando primero `PATCH /api/v1/students/:id/avatar` (Capa 2 Express).
 */
export async function syncAvatarSelection(userId, avatarId) {
  const numericId = resolveNumericStudentId(userId);

  // 1. Capa de Negocio Express (Tier 2: PATCH /api/v1/students/:id/avatar)
  const apiRes = await callTier2Api(`/students/${numericId}/avatar`, {
    method: 'PATCH',
    body: { avatarId },
  });

  if (apiRes?.data?.ok && !supabase) {
    return true;
  }

  if (!supabase) return Boolean(apiRes?.data?.ok);
  try {
    await supabase
      .from('perfiles_gamificacion')
      .update({
        avatar_activo_id: avatarId,
        actualizado_en: new Date().toISOString(),
      })
      .eq('usuario_id', numericId);
    return true;
  } catch (err) {
    console.error('[Supabase] Error equipando avatar:', err);
    return false;
  }
}

/**
 * Carga dinámicamente los mundos y misiones del paquete de expansión desde Supabase (si la migración ya fue aplicada).
 */
export async function loadExpansionFromSupabase() {
  if (!supabase) return null;

  try {
    const { data: mundos, error: errMundos } = await supabase
      .from('mundos')
      .select('id, titulo, slug, descripcion, tecnologia, orden, icono')
      .in('slug', ['laboratorio-python', 'ciudadela-html', 'neo-tokio-javascript'])
      .order('orden', { ascending: true });

    if (errMundos || !Array.isArray(mundos) || mundos.length === 0) {
      return null;
    }

    const idToSlug = Object.fromEntries(mundos.map((m) => [m.id, m.slug]));
    const mundoIds = mundos.map((m) => m.id);

    const { data: misiones, error: errMisiones } = await supabase
      .from('misiones')
      .select(
        'id, mundo_id, titulo, slug, contexto_narrativo, instrucciones_md, codigo_inicial, codigo_solucion, reglas_validacion, pistas, xp_recompensa, monedas_recompensa, orden',
      )
      .in('mundo_id', mundoIds)
      .order('orden', { ascending: true });

    if (errMisiones || !Array.isArray(misiones) || misiones.length === 0) {
      return null;
    }

    const normalizedMissions = misiones
      .filter((m) => m.codigo_inicial && m.slug)
      .map((m) => ({
        ...m,
        mundo_slug: idToSlug[m.mundo_id] || '',
      }));

    return {
      mundos,
      misiones: normalizedMissions,
    };
  } catch {
    return null;
  }
}

/**
 * Inyecta el paquete de expansión vía API (@supabase/supabase-js) resolviendo dinámicamente slug -> mundo_id.
 */
export async function inyectarPaqueteExpansion(expansionPayload) {
  if (!supabase) {
    throw new Error('Supabase no está configurado en las variables de entorno.');
  }

  const { data: mundosDB, error: errMundos } = await supabase
    .from('mundos')
    .upsert(expansionPayload.mundos, { onConflict: 'slug' })
    .select('id, slug');

  if (errMundos) {
    throw new Error(`Error al hacer upsert de mundos: ${errMundos.message}`);
  }

  const mapaSlugAId = Object.fromEntries((mundosDB || []).map((mundo) => [mundo.slug, mundo.id]));

  const misionesConFk = expansionPayload.misiones.map(({ mundo_slug, ...mision }) => {
    const mundo_id = mapaSlugAId[mundo_slug];
    if (!mundo_id) {
      throw new Error(`No se encontró el mundo con slug "${mundo_slug}"`);
    }
    return { ...mision, mundo_id };
  });

  const { data: misionesDB, error: errMisiones } = await supabase
    .from('misiones')
    .upsert(misionesConFk, { onConflict: 'slug' })
    .select('id, slug, titulo, mundo_id');

  if (errMisiones) {
    throw new Error(`Error al hacer upsert de misiones: ${errMisiones.message}`);
  }

  return { mundos: mundosDB, misiones: misionesDB };
}

/* ==========================================================================
   GESTIÓN DE CURSOS, ESTUDIANTES DE LA BASE DE DATOS, INSCRIPCIONES Y RETOS
   (Tablas Supabase: aulas, matriculas_aula, usuarios, perfiles_gamificacion,
    retos_aula, entregas_retos + caché local resiliente)
   ========================================================================== */

const CLASSROOM_CACHE_KEY = 'codekids-classroom-cache-v1';

const DEFAULT_COURSES = [
  { id: 1, codigoGrupo: '5° A', nombre: 'Grado 5° A - Pensamiento Computacional', anioEscolar: 2026 },
  { id: 2, codigoGrupo: '6° B', nombre: 'Grado 6° B - Lógica e Algoritmia', anioEscolar: 2026 },
];

const DEFAULT_DB_STUDENTS = [
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
    scores: { Secuencias: 75, Bucles: 45, Condicionales: 80, Descomposición: 55 },
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

const DEFAULT_ENROLLMENTS = {
  '5° A': [1, 2, 3],
  '6° B': [],
};

function readClassroomCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(CLASSROOM_CACHE_KEY) || '{}');
    return {
      courses: Array.isArray(raw.courses) && raw.courses.length ? raw.courses : DEFAULT_COURSES,
      enrollmentsByGroup:
        raw.enrollmentsByGroup && typeof raw.enrollmentsByGroup === 'object'
          ? { ...DEFAULT_ENROLLMENTS, ...raw.enrollmentsByGroup }
          : { ...DEFAULT_ENROLLMENTS },
      assignments: Array.isArray(raw.assignments) ? raw.assignments : [],
      submissions: Array.isArray(raw.submissions) ? raw.submissions : [],
    };
  } catch {
    return {
      courses: DEFAULT_COURSES,
      enrollmentsByGroup: { ...DEFAULT_ENROLLMENTS },
      assignments: [],
      submissions: [],
    };
  }
}

function writeClassroomCache(next) {
  try {
    const current = readClassroomCache();
    const merged = {
      ...current,
      ...next,
    };
    localStorage.setItem(CLASSROOM_CACHE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return next;
  }
}

function computeStudentStats(student) {
  const scoresObj = student.scores || {
    Secuencias: 75,
    Bucles: 45,
    Condicionales: 80,
    Descomposición: 55,
  };
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

function inferTemplateIdFromMission(missionId = '', skill = '', dbPlantilla = '') {
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

async function resolveTeacherUserId(preferredId) {
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

async function ensureAulaIdForGroup(codigoGrupo, nombreCurso = '', preferredDocenteId) {
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

/**
 * Carga todos los cursos, estudiantes de la base de datos, inscripciones y retos asignados.
 */
export async function loadTeacherClassroomData() {
  const cache = readClassroomCache();
  const rawAccounts = getLocalRegisteredAccounts();
  const localAccountList = Array.isArray(rawAccounts)
    ? rawAccounts
    : Object.values(rawAccounts || {});
  const localRegistered = localAccountList
    .filter((acc) => acc && acc.role === 'student')
    .map((acc, idx) => ({
      id: typeof acc.id === 'number' ? acc.id : 1000 + idx,
      name: acc.name,
      email: acc.email,
      avatar: acc.avatar || 'astronaut',
      points: 120,
      coins: 40,
      level: 1,
      streak: 1,
      completedCount: 0,
      scores: { Secuencias: 75, Bucles: 55, Condicionales: 78, Descomposición: 65 },
    }));

  let dbStudents = [...DEFAULT_DB_STUDENTS];
  let dbCourses = [...cache.courses];
  const enrollmentsByGroup = { ...cache.enrollmentsByGroup };
  let dbAssignments = [...cache.assignments];
  let dbSubmissions = [...cache.submissions];

  if (supabase) {
    try {
      // 1. Estudiantes registrados en la tabla 'usuarios' + 'perfiles_gamificacion' + 'progreso_misiones_usuario'
      const [
        { data: usuariosRows },
        { data: perfilesRows },
        { data: progresoRows },
        { data: aulasRows },
        { data: matriculasRows },
        { data: retosRows },
        { data: entregasRows },
      ] = await Promise.all([
        supabase
          .from('usuarios')
          .select('id, nombre, correo, rol, activo')
          .eq('rol', 'estudiante')
          .order('id', { ascending: true }),
        supabase
          .from('perfiles_gamificacion')
          .select('usuario_id, puntos_xp, nivel_actual, saldo_monedas, dias_racha, avatar_activo_id, puntajes_diagnostico'),
        supabase
          .from('progreso_misiones_usuario')
          .select('usuario_id, mision_id, estado'),
        supabase
          .from('aulas')
          .select('id, codigo_grupo, nombre, docente_id, anio_escolar')
          .order('id', { ascending: true }),
        supabase
          .from('matriculas_aula')
          .select('aula_id, estudiante_id'),
        supabase
          .from('retos_aula')
          .select('id, aula_id, mision_id, titulo, instrucciones, tematica_habilidad, creado_en, misiones(id, slug, plantilla_id)')
          .order('creado_en', { ascending: false }),
        supabase
          .from('entregas_retos')
          .select('id, reto_id, estudiante_id, puntaje, cantidad_intentos, logrado, texto_evidencia, retroalimentacion_ia, recomendacion_docente, fuente_evaluacion, entregado_en')
          .order('entregado_en', { ascending: false }),
      ]);

      const perfilMap = new Map((perfilesRows || []).map((p) => [Number(p.usuario_id), p]));
      const completedCountMap = new Map();
      (progresoRows || []).forEach((row) => {
        if (row.estado === 'completada') {
          const uid = Number(row.usuario_id);
          completedCountMap.set(uid, (completedCountMap.get(uid) || 0) + 1);
        }
      });

      if (Array.isArray(usuariosRows) && usuariosRows.length > 0) {
        dbStudents = usuariosRows.map((u) => {
          const uid = Number(u.id);
          const perfil = perfilMap.get(uid);
          return {
            id: uid,
            name: u.nombre,
            email: u.correo,
            avatar: perfil?.avatar_activo_id || 'astronaut',
            points: perfil?.puntos_xp ?? 100,
            coins: perfil?.saldo_monedas ?? 30,
            level: perfil?.nivel_actual ?? 1,
            streak: perfil?.dias_racha ?? 1,
            completedCount: completedCountMap.get(uid) || 0,
            scores: perfil?.puntajes_diagnostico || {
              Secuencias: 75,
              Bucles: 50,
              Condicionales: 80,
              Descomposición: 60,
            },
          };
        });
      }

      // 2. Cursos ('aulas')
      const aulaIdToGroup = new Map();
      if (Array.isArray(aulasRows) && aulasRows.length > 0) {
        const remoteCourses = aulasRows.map((a) => {
          aulaIdToGroup.set(Number(a.id), a.codigo_grupo);
          return {
            id: Number(a.id),
            codigoGrupo: a.codigo_grupo,
            nombre: a.nombre,
            anioEscolar: a.anio_escolar || 2026,
          };
        });
        const mergedCourseMap = new Map();
        [...DEFAULT_COURSES, ...dbCourses, ...remoteCourses].forEach((c) => {
          if (c?.codigoGrupo) mergedCourseMap.set(c.codigoGrupo, c);
        });
        dbCourses = Array.from(mergedCourseMap.values());
      }

      // 3. Matrículas por curso ('matriculas_aula')
      if (Array.isArray(matriculasRows) && aulaIdToGroup.size > 0) {
        const remoteEnrollments = {};
        dbCourses.forEach((c) => {
          remoteEnrollments[c.codigoGrupo] = [];
        });
        matriculasRows.forEach((m) => {
          const groupCode = aulaIdToGroup.get(Number(m.aula_id));
          if (groupCode) {
            remoteEnrollments[groupCode] = Array.from(
              new Set([...(remoteEnrollments[groupCode] || []), Number(m.estudiante_id)]),
            );
          }
        });
        Object.entries(remoteEnrollments).forEach(([groupCode, ids]) => {
          const cachedIds = enrollmentsByGroup[groupCode] || [];
          enrollmentsByGroup[groupCode] = Array.from(new Set([...ids, ...cachedIds]));
        });
      }

      // 4. Retos asignados ('retos_aula')
      const retoIdToMeta = new Map();
      if (Array.isArray(retosRows) && retosRows.length > 0) {
        const remoteAssignments = retosRows.map((r) => {
          const groupCode = aulaIdToGroup.get(Number(r.aula_id)) || '5° A';
          const canonicalMissionId = r.misiones?.slug || r.mision_id || 'sequence-forest';
          const skill = r.tematica_habilidad || 'Secuencias';
          const templateId = inferTemplateIdFromMission(
            canonicalMissionId,
            skill,
            r.misiones?.plantilla_id,
          );
          const item = {
            id: `db-${r.id}`,
            dbId: Number(r.id),
            group: groupCode,
            title: r.titulo,
            instructions: r.instrucciones,
            skill,
            missionId: canonicalMissionId,
            templateId,
            createdAt: r.creado_en ? new Date(r.creado_en).getTime() : Date.now(),
          };
          retoIdToMeta.set(Number(r.id), item);
          return item;
        });

        const byKey = new Map();
        [...remoteAssignments, ...dbAssignments].forEach((a) => {
          const key = `${a.group}::${a.missionId}::${a.title}`;
          if (!byKey.has(key)) byKey.set(key, a);
        });
        dbAssignments = Array.from(byKey.values());
      }

      // 5. Entregas ('entregas_retos')
      if (Array.isArray(entregasRows) && entregasRows.length > 0) {
        const studentIdToName = new Map(dbStudents.map((s) => [Number(s.id), s.name]));
        const remoteSubmissions = entregasRows
          .map((e) => {
            const assignmentMeta = retoIdToMeta.get(Number(e.reto_id));
            const studentName = studentIdToName.get(Number(e.estudiante_id)) || `Estudiante #${e.estudiante_id}`;
            if (!assignmentMeta) return null;
            return {
              id: `${assignmentMeta.id}-${studentName}`,
              assignmentId: assignmentMeta.id,
              assignmentTitle: assignmentMeta.title,
              skill: assignmentMeta.skill,
              group: assignmentMeta.group,
              studentId: Number(e.estudiante_id),
              studentName,
              score: Number(e.puntaje || 0),
              response: e.texto_evidencia || 'Reto completado',
              feedback: e.retroalimentacion_ia || 'Actividad evaluada.',
              recommendation: e.recomendacion_docente || 'Continúa practicando.',
              source: e.fuente_evaluacion || 'supabase',
              gameOutcome: {
                success: Boolean(e.logrado),
                attempts: Number(e.cantidad_intentos || 1),
                evidence: e.texto_evidencia || '',
              },
              createdAt: e.entregado_en ? new Date(e.entregado_en).getTime() : Date.now(),
            };
          })
          .filter(Boolean);

        const subMap = new Map();
        [...remoteSubmissions, ...dbSubmissions].forEach((s) => {
          if (!subMap.has(s.id)) subMap.set(s.id, s);
        });
        dbSubmissions = Array.from(subMap.values());
      }
    } catch (err) {
      console.warn('[Supabase Classroom] Usando caché local complementaria:', err);
    }
  }

  // Combinar estudiantes de Supabase con los registrados localmente (sin duplicar por correo)
  const seenEmails = new Set(dbStudents.map((s) => String(s.email || '').toLowerCase()));
  localRegistered.forEach((loc) => {
    const emailKey = String(loc.email || '').toLowerCase();
    if (emailKey && !seenEmails.has(emailKey)) {
      seenEmails.add(emailKey);
      dbStudents.push(loc);
    }
  });

  // Asegurar que cada curso tenga su lista de inscritos inicializada
  dbCourses.forEach((course) => {
    if (!Array.isArray(enrollmentsByGroup[course.codigoGrupo])) {
      enrollmentsByGroup[course.codigoGrupo] = [];
    }
  });

  // Enriquecer cada estudiante con sus cursos inscritos y métricas
  const enrichedStudents = dbStudents.map((student) => {
    const enrolledCourses = Object.entries(enrollmentsByGroup)
      .filter(([, ids]) => Array.isArray(ids) && ids.some((id) => String(id) === String(student.id)))
      .map(([groupCode]) => groupCode);

    return computeStudentStats({
      ...student,
      enrolledCourses,
      group: enrolledCourses[0] || 'Sin curso',
    });
  });

  writeClassroomCache({
    courses: dbCourses,
    enrollmentsByGroup,
    assignments: dbAssignments,
    submissions: dbSubmissions,
  });

  return {
    courses: dbCourses,
    students: enrichedStudents,
    enrollmentsByGroup,
    assignments: dbAssignments,
    submissions: dbSubmissions,
  };
}

/**
 * Crea un nuevo curso en la tabla 'aulas' e inscribe opcionalmente a una lista de estudiantes.
 */
export async function createCourseInSupabase({ codigoGrupo, nombre, docenteId, studentIds = [] }) {
  const cleanCode = String(codigoGrupo || '').trim();
  const cleanName = String(nombre || '').trim() || `Curso ${cleanCode}`;
  if (!cleanCode) {
    throw new Error('Ingresa el código o identificador del curso (ej. 7° A).');
  }

  const cache = readClassroomCache();
  const newCourse = {
    id: Date.now(),
    codigoGrupo: cleanCode,
    nombre: cleanName,
    anioEscolar: 2026,
  };

  // Actualizar caché local inmediatamente
  const existingIdx = cache.courses.findIndex(
    (c) => c.codigoGrupo.toLowerCase() === cleanCode.toLowerCase(),
  );
  const nextCourses =
    existingIdx >= 0
      ? cache.courses.map((c, idx) => (idx === existingIdx ? { ...c, nombre: cleanName } : c))
      : [...cache.courses, newCourse];

  const currentEnrolled = cache.enrollmentsByGroup[cleanCode] || [];
  const nextEnrollments = {
    ...cache.enrollmentsByGroup,
    [cleanCode]: Array.from(new Set([...currentEnrolled, ...studentIds.map((id) => Number(id) || id)])),
  };

  writeClassroomCache({
    courses: nextCourses,
    enrollmentsByGroup: nextEnrollments,
  });

  if (supabase) {
    try {
      const aulaId = await ensureAulaIdForGroup(cleanCode, cleanName, docenteId);
      if (aulaId && studentIds.length > 0) {
        const numericIds = studentIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id < 1000);
        if (numericIds.length > 0) {
          const rows = numericIds.map((estudiante_id) => ({
            aula_id: aulaId,
            estudiante_id,
          }));
          await supabase
            .from('matriculas_aula')
            .upsert(rows, { onConflict: 'aula_id,estudiante_id' });
        }
      }
    } catch (err) {
      console.warn('[Supabase] Curso guardado en caché local; sincronización remota pendiente:', err);
    }
  }

  return loadTeacherClassroomData();
}

/**
 * Inscribe o retira a un estudiante de un curso en 'matriculas_aula'
 * consumiendo primero la API REST Express (`POST` / `DELETE /api/v1/classrooms/:aulaId/enrollments`).
 */
export async function setStudentCourseEnrollment({ codigoGrupo, studentId, enroll = true, docenteId }) {
  const cleanCode = String(codigoGrupo || '').trim();
  if (!cleanCode || studentId === undefined || studentId === null) {
    return loadTeacherClassroomData();
  }

  const cache = readClassroomCache();
  const currentList = cache.enrollmentsByGroup[cleanCode] || [];
  const nextList = enroll
    ? Array.from(new Set([...currentList, studentId]))
    : currentList.filter((id) => String(id) !== String(studentId));

  writeClassroomCache({
    enrollmentsByGroup: {
      ...cache.enrollmentsByGroup,
      [cleanCode]: nextList,
    },
  });

  // 1. Capa de Negocio Express (Tier 2: POST / DELETE /api/v1/classrooms/:aulaId/enrollments)
  const resolvedAulaId = cleanCode === '6° B' ? 2 : 1;
  if (enroll) {
    await callTier2Api(`/classrooms/${resolvedAulaId}/enrollments`, {
      method: 'POST',
      body: {
        codigoGrupo: cleanCode,
        estudianteId: Number(studentId) || 1,
      },
    });
  } else {
    await callTier2Api(
      `/classrooms/${resolvedAulaId}/enrollments/${Number(studentId) || 1}?group=${encodeURIComponent(cleanCode)}`,
      { method: 'DELETE' },
    );
  }

  if (supabase && Number.isFinite(Number(studentId)) && Number(studentId) < 1000) {
    try {
      const aulaId = await ensureAulaIdForGroup(cleanCode, `Curso ${cleanCode}`, docenteId);
      if (aulaId) {
        if (enroll) {
          await supabase
            .from('matriculas_aula')
            .upsert(
              { aula_id: aulaId, estudiante_id: Number(studentId) },
              { onConflict: 'aula_id,estudiante_id' },
            );
        } else {
          await supabase
            .from('matriculas_aula')
            .delete()
            .eq('aula_id', aulaId)
            .eq('estudiante_id', Number(studentId));
        }
      }
    } catch (err) {
      console.warn('[Supabase] Matrícula sincronizada en caché local:', err);
    }
  }

  return loadTeacherClassroomData();
}

/**
 * Publica una actividad (Blockly, Python, HTML5 o JavaScript) para un curso en 'retos_aula'
 * invocando primero `POST /api/v1/challenges` (Capa 2 Express).
 */
export async function createClassroomAssignmentInSupabase({
  group,
  title,
  instructions,
  skill,
  missionId,
  templateId,
  docenteId,
}) {
  const cleanGroup = String(group || '5° A').trim();
  const resolvedTemplate = inferTemplateIdFromMission(missionId, skill, templateId);
  const newAssignment = {
    id: `${Date.now()}`,
    group: cleanGroup,
    title: String(title || '').trim(),
    instructions: String(instructions || '').trim(),
    skill: skill || 'Secuencias',
    missionId: missionId || 'sequence-forest',
    templateId: resolvedTemplate,
    createdAt: Date.now(),
  };

  // 1. Capa de Negocio Express (Tier 2: POST /api/v1/challenges)
  const apiRes = await callTier2Api('/challenges', {
    method: 'POST',
    body: {
      aulaId: cleanGroup === '6° B' ? 2 : 1,
      codigoGrupo: cleanGroup,
      misionId: newAssignment.missionId,
      titulo: newAssignment.title,
      instrucciones: newAssignment.instructions,
      tematicaHabilidad: newAssignment.skill,
    },
  });

  if (apiRes?.data?.ok && apiRes.data.challenge?.id) {
    newAssignment.id = `db-${apiRes.data.challenge.id}`;
    newAssignment.dbId = Number(apiRes.data.challenge.id);
  }

  if (supabase) {
    try {
      const aulaId = await ensureAulaIdForGroup(cleanGroup, `Curso ${cleanGroup}`, docenteId);
      if (aulaId) {
        let dbMissionId = missionId;
        const { data: bySlug } = await supabase
          .from('misiones')
          .select('id')
          .eq('slug', missionId)
          .maybeSingle();

        if (bySlug?.id) {
          dbMissionId = bySlug.id;
        } else {
          const { data: byId } = await supabase
            .from('misiones')
            .select('id')
            .eq('id', missionId)
            .maybeSingle();

          if (byId?.id) {
            dbMissionId = byId.id;
          } else {
            dbMissionId = 'sequence-forest';
          }
        }

        const { data: insertedReto } = await supabase
          .from('retos_aula')
          .insert({
            aula_id: aulaId,
            mision_id: dbMissionId,
            titulo: newAssignment.title,
            instrucciones: newAssignment.instructions,
            tematica_habilidad: newAssignment.skill,
          })
          .select('id')
          .single();

        if (insertedReto?.id) {
          newAssignment.id = `db-${insertedReto.id}`;
          newAssignment.dbId = Number(insertedReto.id);
        }
      }
    } catch (err) {
      console.warn('[Supabase] Reto guardado localmente; sincronización remota pendiente:', err);
    }
  }

  const cache = readClassroomCache();
  const nextAssignments = [
    newAssignment,
    ...cache.assignments.filter(
      (a) => !(a.group === newAssignment.group && a.title === newAssignment.title && a.missionId === newAssignment.missionId),
    ),
  ];
  writeClassroomCache({ assignments: nextAssignments });

  return newAssignment;
}

/**
 * Registra la entrega de un reto de curso por parte de un estudiante en 'entregas_retos'
 * consumiendo primero `POST /api/v1/submissions` (Capa 2 Express).
 */
export async function syncAssignmentSubmissionInSupabase(submission, user) {
  const cache = readClassroomCache();
  const nextSubmissions = [
    submission,
    ...cache.submissions.filter((s) => s.id !== submission.id),
  ];
  writeClassroomCache({ submissions: nextSubmissions });

  const rawStudentId =
    typeof user?.id === 'number'
      ? user.id
      : QUICK_PROFILE_IDS[String(user?.id || user?.name || '').toLowerCase()] || 1;

  let retoDbId = submission.dbId || null;
  if (!retoDbId && String(submission.assignmentId || '').startsWith('db-')) {
    retoDbId = Number(String(submission.assignmentId).replace('db-', ''));
  }

  // 1. Capa de Negocio Express (Tier 2: POST /api/v1/submissions)
  await callTier2Api('/submissions', {
    method: 'POST',
    body: {
      retoId: retoDbId && Number.isFinite(retoDbId) ? retoDbId : 1,
      estudianteId: rawStudentId,
      puntaje: Math.round(Number(submission.score || 85)),
      cantidadIntentos: Number(submission.gameOutcome?.attempts || 1),
      logrado: Boolean(submission.gameOutcome?.success),
      textoEvidencia: String(submission.response || 'Reto superado'),
      retroalimentacionIa: String(submission.feedback || ''),
      recomendacionDocente: String(submission.recommendation || ''),
    },
  });

  if (!supabase) return submission;

  try {
    if (retoDbId && Number.isFinite(retoDbId)) {
      await supabase.from('entregas_retos').upsert(
        {
          reto_id: retoDbId,
          estudiante_id: rawStudentId,
          puntaje: Math.round(Number(submission.score || 85)),
          cantidad_intentos: Number(submission.gameOutcome?.attempts || 1),
          logrado: Boolean(submission.gameOutcome?.success),
          texto_evidencia: String(submission.response || 'Reto superado'),
          retroalimentacion_ia: String(submission.feedback || ''),
          recomendacion_docente: String(submission.recommendation || ''),
          fuente_evaluacion: String(submission.source || 'fallback'),
          entregado_en: new Date().toISOString(),
        },
        { onConflict: 'reto_id,estudiante_id' },
      );
    }
  } catch (err) {
    console.warn('[Supabase] Entrega guardada en caché local:', err);
  }

  return submission;
}

/**
 * UPDATE (TAREA 3): Edita un reto escolar en 'retos_aula' vía `PUT /api/v1/challenges/:id` y sincroniza caché.
 */
export async function updateClassroomAssignmentInSupabase(assignmentId, updates = {}) {
  const cache = readClassroomCache();
  const nextAssignments = (cache.assignments || []).map((a) =>
    String(a.id) === String(assignmentId)
      ? {
          ...a,
          title: updates.title !== undefined ? String(updates.title).trim() : a.title,
          instructions:
            updates.instructions !== undefined
              ? String(updates.instructions).trim()
              : a.instructions,
          skill: updates.skill || a.skill,
        }
      : a,
  );
  writeClassroomCache({ assignments: nextAssignments });

  const numericId = Number(String(assignmentId).replace(/^db-/, '')) || 1;

  // 1. Capa de Negocio Express (Tier 2: PUT /api/v1/challenges/:id)
  await callTier2Api(`/challenges/${numericId}`, {
    method: 'PUT',
    body: {
      titulo: updates.title,
      instrucciones: updates.instructions,
      tematicaHabilidad: updates.skill,
    },
  });

  if (supabase && Number.isFinite(numericId)) {
    try {
      const patch = {};
      if (updates.title !== undefined) patch.titulo = String(updates.title).trim();
      if (updates.instructions !== undefined) patch.instrucciones = String(updates.instructions).trim();
      if (updates.skill !== undefined) patch.tematica_habilidad = updates.skill;
      await supabase.from('retos_aula').update(patch).eq('id', numericId);
    } catch (err) {
      console.warn('[Supabase] Reto actualizado en caché local:', err);
    }
  }

  return nextAssignments;
}

/**
 * DELETE (TAREA 3): Elimina un reto asignado en 'retos_aula' vía `DELETE /api/v1/challenges/:id` y sincroniza caché.
 */
export async function deleteClassroomAssignmentInSupabase(assignmentId) {
  const cache = readClassroomCache();
  const nextAssignments = (cache.assignments || []).filter(
    (a) => String(a.id) !== String(assignmentId),
  );
  const nextSubmissions = (cache.submissions || []).filter(
    (s) => String(s.assignmentId) !== String(assignmentId),
  );
  writeClassroomCache({ assignments: nextAssignments, submissions: nextSubmissions });

  const numericId = Number(String(assignmentId).replace(/^db-/, '')) || 1;

  // 1. Capa de Negocio Express (Tier 2: DELETE /api/v1/challenges/:id)
  await callTier2Api(`/challenges/${numericId}`, {
    method: 'DELETE',
  });

  if (supabase && Number.isFinite(numericId)) {
    try {
      await supabase.from('retos_aula').delete().eq('id', numericId);
    } catch (err) {
      console.warn('[Supabase] Reto eliminado en caché local:', err);
    }
  }

  return nextAssignments;
}

/**
 * UPDATE (TAREA 3): Califica o actualiza la nota/retroalimentación de una entrega en 'entregas_retos'
 * vía `PATCH /api/v1/submissions/:id/grade`.
 */
export async function gradeSubmissionInSupabase(
  submissionId,
  { score, puntuacion, feedback, recommendation, assignmentId, studentId } = {},
) {
  const resolvedScore =
    score !== undefined
      ? Math.max(0, Math.min(100, Math.round(Number(score))))
      : Math.max(0, Math.min(100, Math.round(Number(puntuacion || 4.0) * 20)));

  const cache = readClassroomCache();
  const nextSubmissions = (cache.submissions || []).map((s) =>
    String(s.id) === String(submissionId)
      ? {
          ...s,
          score: resolvedScore,
          feedback: feedback !== undefined ? feedback : s.feedback,
          recommendation: recommendation !== undefined ? recommendation : s.recommendation,
        }
      : s,
  );
  writeClassroomCache({ submissions: nextSubmissions });

  const numericSubId = Number(String(submissionId).replace(/\D+/g, '')) || 1;

  // 1. Capa de Negocio Express (Tier 2: PATCH /api/v1/submissions/:id/grade)
  await callTier2Api(`/submissions/${numericSubId}/grade`, {
    method: 'PATCH',
    body: {
      puntaje: resolvedScore,
      puntuacion: Number((resolvedScore / 20).toFixed(2)),
      retroalimentacionIa: feedback,
      recomendacionDocente: recommendation,
    },
  });

  if (supabase) {
    try {
      const numericRetoId = Number(String(assignmentId || '').replace(/^db-/, ''));
      if (Number.isFinite(numericRetoId) && studentId) {
        await supabase
          .from('entregas_retos')
          .update({
            puntaje: resolvedScore,
            ...(feedback !== undefined ? { retroalimentacion_ia: feedback } : {}),
            ...(recommendation !== undefined ? { recomendacion_docente: recommendation } : {}),
          })
          .eq('reto_id', numericRetoId)
          .eq('estudiante_id', Number(studentId));
      }
    } catch (err) {
      console.warn('[Supabase] Calificación guardada en caché local:', err);
    }
  }

  return nextSubmissions;
}

/**
 * DELETE (TAREA 3): Desactiva una cuenta de usuario en 'usuarios' vía `DELETE /api/v1/users/:id`.
 */
export async function deactivateUserAccountInSupabase(userId) {
  const numericId = Number(userId) || 1;

  // 1. Capa de Negocio Express (Tier 2: DELETE /api/v1/users/:id)
  await callTier2Api(`/users/${numericId}`, {
    method: 'DELETE',
  });

  if (supabase && Number.isFinite(numericId)) {
    try {
      await supabase
        .from('usuarios')
        .update({ activo: false, actualizado_en: new Date().toISOString() })
        .eq('id', numericId);
    } catch (err) {
      console.warn('[Supabase] Cuenta desactivada localmente:', err);
    }
  }
  return loadTeacherClassroomData();
}

export {
  getAllAnalyticalReports,
  getAtRiskStudentsReport,
  getHighRetryMissionsReport,
  getGamifiedEconomyReport,
  getClassroomRanking,
} from './services/index.js';
