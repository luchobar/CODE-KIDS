import { createClient } from '@supabase/supabase-js';

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

// Cuentas oficiales para sustentación y presentación universitaria
export const UNIVERSITY_ACCOUNTS = {
  'sofi@codekids.edu.co': {
    id: 1,
    name: 'Sofi',
    email: 'sofi@codekids.edu.co',
    role: 'student',
    avatar: 'dragon',
    badge: 'Nvl. 3 · Secuencias',
    passwords: ['CodeKids2026*', 'Sofi12345*', '12345678'],
  },
  'mateo@codekids.edu.co': {
    id: 2,
    name: 'Mateo',
    email: 'mateo@codekids.edu.co',
    role: 'student',
    avatar: 'robot',
    badge: 'Nvl. 2 · Bucles',
    passwords: ['CodeKids2026*', 'Mateo12345*', '12345678'],
  },
  'valeria@codekids.edu.co': {
    id: 3,
    name: 'Valeria',
    email: 'valeria@codekids.edu.co',
    role: 'student',
    avatar: 'fox',
    badge: 'Nvl. 4 · Python',
    passwords: ['CodeKids2026*', 'Valeria12345*', '12345678'],
  },
  'alex.profe@codekids.edu.co': {
    id: 4,
    name: 'Profe Alex',
    email: 'alex.profe@codekids.edu.co',
    role: 'teacher',
    avatar: 'unicorn',
    badge: 'Docente · 5° A',
    passwords: ['CodeKids2026*', 'Profe2026*', '12345678'],
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
    current[email] = accountData;
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(current));
  } catch {
    /* localStorage opcional */
  }
}

/**
 * Autentica al usuario por correo y contraseña verificando que realmente exista en la base de datos
 * y que la contraseña coincida exactamente con la que fue creada para ese correo.
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

  // 1. Si Supabase está conectado, buscar en la tabla 'usuarios' y validar su contraseña real
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

        const storedHash = dbUser.contrasena_hash ? String(dbUser.contrasena_hash).trim() : '';
        const known = UNIVERSITY_ACCOUNTS[normalizedEmail];

        let passwordMatches = false;
        if (storedHash) {
          // Si el usuario tiene contraseña guardada en la BD, DEBE coincidir exactamente con ella
          passwordMatches = storedHash === trimmedPassword;
        } else if (known) {
          // Cuentas semilla de demostración creadas sin contrasena_hash en el SQL inicial
          passwordMatches = known.passwords.includes(trimmedPassword);
        }

        if (!passwordMatches) {
          return {
            ok: false,
            error: 'Contraseña incorrecta para este correo electrónico. Verifica e intenta de nuevo.',
          };
        }

        // Actualizar fecha de último acceso en segundo plano
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

      // Si está conectado a Supabase y NO existe en la tabla 'usuarios', rechazar el acceso
      return {
        ok: false,
        error: 'No existe ninguna cuenta registrada con este correo en la base de datos. Ve a la pestaña «Crear cuenta» para registrarte.',
      };
    } catch (err) {
      console.warn('[Supabase Auth Exception]', err);
    }
  }

  // 2. Respaldo local (solo cuando Supabase no está configurado en el entorno):
  // Verificar cuentas registradas localmente o las 4 cuentas semilla
  const localAccounts = getLocalRegisteredAccounts();
  const localUser = localAccounts[normalizedEmail];
  if (localUser) {
    if (localUser.password !== trimmedPassword) {
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

  const academic = UNIVERSITY_ACCOUNTS[normalizedEmail];
  if (academic) {
    if (academic.passwords.includes(trimmedPassword)) {
      return {
        ok: true,
        user: {
          id: academic.id,
          name: academic.name,
          email: academic.email,
          role: academic.role,
          avatar: academic.avatar,
        },
      };
    }
    return { ok: false, error: 'Contraseña incorrecta para esta cuenta institucional.' };
  }

  return {
    ok: false,
    error: 'No existe ninguna cuenta registrada con este correo. Primero debes registrarte en «Crear cuenta».',
  };
}

/**
 * Registra un nuevo usuario en la base de datos de Supabase enlazando su correo y contraseña.
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

  // 1. Si Supabase no está configurado, guardar en el registro local verificable
  if (!supabase) {
    const localAccounts = getLocalRegisteredAccounts();
    if (localAccounts[normalizedEmail] || UNIVERSITY_ACCOUNTS[normalizedEmail]) {
      return { ok: false, error: 'Este correo ya está registrado. Por favor inicia sesión con tu contraseña.' };
    }
    const newLocalUser = {
      id: Date.now(),
      name: userName,
      email: normalizedEmail,
      password: trimmedPassword,
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
    // Comprobar si ya existe en Supabase
    const { data: existente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('correo', normalizedEmail)
      .maybeSingle();

    if (existente) {
      return { ok: false, error: 'Este correo ya está registrado en la base de datos. Por favor inicia sesión.' };
    }

    // Insertar en tabla usuarios con su contraseña enlazada
    const { data: nuevo, error: errInsert } = await supabase
      .from('usuarios')
      .insert([
        {
          correo: normalizedEmail,
          nombre: userName,
          rol: userRole,
          contrasena_hash: trimmedPassword,
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

    // Guardar también en caché local de respaldo
    saveLocalRegisteredAccount(normalizedEmail, {
      id: newUserId || Date.now(),
      name: userName,
      email: normalizedEmail,
      password: trimmedPassword,
      role,
      avatar,
    });

    // Si es estudiante, crear su perfil gamificado inicial
    if (userRole === 'estudiante' && newUserId) {
      await supabase.from('perfiles_gamificacion').upsert({
        usuario_id: newUserId,
        puntos_xp: 0,
        saldo_monedas: 20,
        dias_racha: 1,
        avatar_activo_id: avatar || 'dragon',
        sonido_habilitado: true,
      });

      // Asignar avatar al inventario
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
 * Actualiza la contraseña de un correo registrado en Supabase (y en el respaldo local).
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
          contrasena_hash: trimmedPassword,
          actualizado_en: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateErr) {
        return { ok: false, error: `No se pudo actualizar la contraseña: ${updateErr.message}` };
      }

      const localAccounts = getLocalRegisteredAccounts();
      if (localAccounts[normalizedEmail]) {
        localAccounts[normalizedEmail].password = trimmedPassword;
        saveLocalRegisteredAccount(normalizedEmail, localAccounts[normalizedEmail]);
      }

      return { ok: true, message: '¡Contraseña actualizada en la base de datos! Ya puedes iniciar sesión.' };
    } catch (err) {
      return { ok: false, error: `Error al actualizar contraseña: ${err?.message || err}` };
    }
  }

  const localAccounts = getLocalRegisteredAccounts();
  if (localAccounts[normalizedEmail]) {
    localAccounts[normalizedEmail].password = trimmedPassword;
    saveLocalRegisteredAccount(normalizedEmail, localAccounts[normalizedEmail]);
    return { ok: true, message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
  }

  return { ok: false, error: 'No encontramos ninguna cuenta registrada con ese correo electrónico.' };
}

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

    // 3. Progreso de misiones (resolviendo tanto IDs clásicos como slugs de expansión)
    const { data: progreso } = await supabase
      .from('progreso_misiones_usuario')
      .select('mision_id, estado, estrellas_ganadas')
      .eq('usuario_id', numericId);

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
      .eq('usuario_id', numericId);

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
 * Guarda en Supabase cuando un estudiante supera una misión (compatible con IDs clásicos y slugs UUID).
 */
export async function syncMissionSuccess(userId, missionIdOrSlug, stars = 3, xp = 10, coins = 10) {
  if (!supabase) return false;

  try {
    const numericId = typeof userId === 'number' ? userId : QUICK_PROFILE_IDS[userId] || 1;

    // 1. Resolver el ID primario real en 'misiones' buscando por slug o por id
    let resolvedMissionId = missionIdOrSlug;
    const { data: bySlug } = await supabase
      .from('misiones')
      .select('id')
      .eq('slug', missionIdOrSlug)
      .maybeSingle();

    if (bySlug?.id) {
      resolvedMissionId = bySlug.id;
    }

    // 2. Guardar progreso en la tabla de misiones
    await supabase.from('progreso_misiones_usuario').upsert({
      usuario_id: numericId,
      mision_id: resolvedMissionId,
      estado: 'completada',
      estrellas_ganadas: stars,
      completada_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    });

    // 3. Incrementar puntos de experiencia y monedas en el perfil
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

/**
 * Sincroniza únicamente el cambio de avatar activo en Supabase.
 */
export async function syncAvatarSelection(userId, avatarId) {
  if (!supabase) return false;
  try {
    const numericId = typeof userId === 'number' ? userId : QUICK_PROFILE_IDS[userId] || 1;
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
