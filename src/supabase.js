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

// Mapa de perfiles rápidos a IDs numéricos
export const QUICK_PROFILE_IDS = {
  sofi: 1,
  mateo: 2,
  valeria: 3,
  profe: 4,
};

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

/**
 * Autentica al usuario por correo y contraseña.
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

  // 1. Si Supabase está conectado, buscar en la tabla 'usuarios'
  if (supabase) {
    try {
      const { data: dbUser, error } = await supabase
        .from('usuarios')
        .select('id, nombre, correo, rol, etiqueta_rapida')
        .eq('correo', normalizedEmail)
        .single();

      if (!error && dbUser) {
        const known = UNIVERSITY_ACCOUNTS[normalizedEmail];
        const isKnownPassword = known ? known.passwords.includes(trimmedPassword) : false;

        // Aceptar contraseña oficial o clave >= 8 caracteres
        if (isKnownPassword || trimmedPassword === 'CodeKids2026*' || trimmedPassword.length >= 8) {
          const { data: perfil } = await supabase
            .from('perfiles_gamificacion')
            .select('avatar_activo_id')
            .eq('usuario_id', dbUser.id)
            .single();

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
        } else {
          return { ok: false, error: 'Contraseña incorrecta. Recuerda usar: CodeKids2026*' };
        }
      }
    } catch (err) {
      console.warn('[Supabase Auth]', err);
    }
  }

  // 2. Comprobar contra las cuentas universitarias estándar
  const academic = UNIVERSITY_ACCOUNTS[normalizedEmail];
  if (academic) {
    if (academic.passwords.includes(trimmedPassword) || trimmedPassword === 'CodeKids2026*') {
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
    return { ok: false, error: 'Contraseña incorrecta. La clave es: CodeKids2026*' };
  }

  // 3. Si no es una de las 4 pero tiene formato de correo y contraseña >= 8
  if (trimmedPassword.length >= 8) {
    const isTeacher = normalizedEmail.includes('profe') || normalizedEmail.includes('docente');
    const autoName = normalizedEmail.split('@')[0].replace(/[._-]/g, ' ');
    const formattedName = autoName.charAt(0).toUpperCase() + autoName.slice(1);
    return {
      ok: true,
      user: {
        id: Date.now(),
        name: formattedName || (isTeacher ? 'Docente' : 'Explorador'),
        email: normalizedEmail,
        role: isTeacher ? 'teacher' : 'student',
        avatar: isTeacher ? 'unicorn' : 'dragon',
      },
    };
  }

  return { ok: false, error: 'Credenciales inválidas. Revisa tu correo y contraseña.' };
}

/**
 * Registra un nuevo usuario en la base de datos de Supabase.
 */
export async function registerUser({ name, email, password, role = 'student', avatar = 'dragon' }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const userName = (name || '').trim() || (role === 'teacher' ? 'Docente' : 'Explorador');
  const userRole = role === 'teacher' ? 'docente' : 'estudiante';

  if (!normalizedEmail) {
    return { ok: false, error: 'Por favor ingresa un correo electrónico.' };
  }
  if (!password || password.length < 8) {
    return { ok: false, error: 'La contraseña debe tener mínimo 8 caracteres.' };
  }

  // 1. Si Supabase no está configurado, informar claramente el error
  if (!supabase) {
    return {
      ok: false,
      error: 'Supabase no está conectado todavía. Si estás en Vercel, asegúrate de guardar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Settings > Environment Variables y hacer un Redeploy.',
    };
  }

  try {
    // Comprobar si ya existe
    const { data: existente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('correo', normalizedEmail)
      .maybeSingle();

    if (existente) {
      return { ok: false, error: 'Este correo ya está registrado en la base de datos. Por favor inicia sesión.' };
    }

    // Insertar en tabla usuarios
    const { data: nuevo, error: errInsert } = await supabase
      .from('usuarios')
      .insert([
        {
          correo: normalizedEmail,
          nombre: userName,
          rol: userRole,
          contrasena_hash: password,
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
