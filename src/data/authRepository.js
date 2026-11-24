import { hashUserPassword, verifyUserPassword } from '../services/password.util.js';
import { callTier2Api, fetchWithCsrf } from './httpClient.js';
import { parsePositiveIntId, UNIVERSITY_ACCOUNTS } from './seedData.js';
import { getLocalRegisteredAccounts, saveLocalRegisteredAccount } from './storageStore.js';
import { supabase } from './supabaseClient.js';

function normalizeAuthenticatedUser(rawUser, knownAccount) {
  const roleValue = rawUser?.rol || rawUser?.role;
  return {
    id: rawUser.id,
    name: rawUser.nombre || rawUser.name || knownAccount?.name || 'Explorador',
    email: rawUser.correo || rawUser.email || knownAccount?.email || '',
    role: roleValue === 'docente' || roleValue === 'teacher' ? 'teacher' : 'student',
    avatar: rawUser.avatar || knownAccount?.avatar || 'dragon',
  };
}

function updateLocalPasswordCache(normalizedEmail, passwordHash) {
  const localAccounts = getLocalRegisteredAccounts();
  if (localAccounts[normalizedEmail]) {
    localAccounts[normalizedEmail].passwordHash = passwordHash;
    saveLocalRegisteredAccount(normalizedEmail, localAccounts[normalizedEmail]);
  }
}

/**
 * Autentica al usuario por correo y contraseña usando Capa 2 Express (`/api/v1/users/login`)
 * con respaldo controlado en Supabase y almacenamiento local cifrado.
 * @param {string} email
 * @param {string} password
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
  const apiRes = await callTier2Api('/users/login', {
    method: 'POST',
    body: {
      correo: normalizedEmail,
      contrasena: trimmedPassword,
      demoFallbacks: known?.demoFallbacks || [],
    },
  });

  const apiAuthenticated =
    apiRes?.data?.ok && apiRes.data.user
      ? {
          ok: true,
          source: apiRes.data.source || 'api-v1',
          user: normalizeAuthenticatedUser(apiRes.data.user, known),
        }
      : null;

  if (
    apiAuthenticated &&
    (!supabase || apiRes.data.source === 'supabase' || apiRes.data.source === 'postgresql')
  ) {
    return apiAuthenticated;
  }

  if (supabase) {
    try {
      const { data: dbUser } = await supabase
        .from('usuarios')
        .select('id, nombre, correo, rol, contrasena_hash, activo')
        .eq('correo', normalizedEmail)
        .maybeSingle();

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
          .then(() => {}, () => {});

        const { data: perfil } = await supabase
          .from('perfiles_gamificacion')
          .select('avatar_activo_id')
          .eq('usuario_id', dbUser.id)
          .maybeSingle();

        return {
          ok: true,
          user: normalizeAuthenticatedUser(
            { ...dbUser, avatar: perfil?.avatar_activo_id },
            known,
          ),
        };
      }

      if (apiAuthenticated) return apiAuthenticated;

      return {
        ok: false,
        error:
          'No existe ninguna cuenta registrada con este correo en la base de datos. Ve a la pestaña «Crear cuenta» para registrarte.',
      };
    } catch {
      if (apiAuthenticated) return apiAuthenticated;
    }
  }

  if (apiAuthenticated) return apiAuthenticated;

  const localUser = getLocalRegisteredAccounts()[normalizedEmail];
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
      user: normalizeAuthenticatedUser(localUser, known),
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
 * Registra un nuevo usuario derivando hash PBKDF2-SHA256 antes de persistir.
 * Evita doble inserción cuando Tier 2 confirma persistencia en PostgreSQL o Supabase.
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

  const passwordHash = await hashUserPassword(trimmedPassword);
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

  if (!supabase) {
    const localAccounts = getLocalRegisteredAccounts();
    if (localAccounts[normalizedEmail] || UNIVERSITY_ACCOUNTS[normalizedEmail]) {
      return {
        ok: false,
        error: 'Este correo ya está registrado. Por favor inicia sesión con tu contraseña.',
      };
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
      return {
        ok: false,
        error: 'Este correo ya está registrado en la base de datos. Por favor inicia sesión.',
      };
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
      return {
        ok: false,
        error: `Error de Supabase: ${errInsert.message || errInsert.details || 'Permiso denegado'}.`,
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

      await supabase.from('inventario_avatares_usuario').upsert([
        { usuario_id: newUserId, avatar_id: 'astronaut' },
        { usuario_id: newUserId, avatar_id: avatar || 'dragon' },
      ]);
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
  } catch (err) {
    return { ok: false, error: `Excepción al conectar con Supabase: ${err?.message || err}` };
  }
}

/**
 * Actualiza la contraseña de una cuenta aplicando hash PBKDF2-SHA256.
 * @param {string} email
 * @param {string} newPassword
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
  const apiRes = await callTier2Api('/users/password', {
    method: 'PATCH',
    body: {
      correo: normalizedEmail,
      nuevaContrasena: passwordHash,
    },
  });

  if (apiRes?.httpOk && apiRes?.data?.ok) {
    updateLocalPasswordCache(normalizedEmail, passwordHash);
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

      updateLocalPasswordCache(normalizedEmail, passwordHash);
      return { ok: true, message: '¡Contraseña actualizada en la base de datos! Ya puedes iniciar sesión.' };
    } catch (err) {
      return { ok: false, error: `Error al actualizar contraseña: ${err?.message || err}` };
    }
  }

  const localAccounts = getLocalRegisteredAccounts();
  if (localAccounts[normalizedEmail]) {
    updateLocalPasswordCache(normalizedEmail, passwordHash);
    return { ok: true, message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
  }

  return { ok: false, error: 'No encontramos ninguna cuenta registrada con ese correo electrónico.' };
}

/**
 * Solicita el envío del enlace de recuperación mediante el flujo CSRF de `/api/v1/auth`.
 * @param {string} email
 */
export async function requestPasswordReset(email) {
  try {
    const response = await fetchWithCsrf('/api/v1/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  } catch {
    return { ok: false, data: {} };
  }
}

/**
 * Cierra la sesión HTTP en el servidor `/api/v1/auth/logout` si está disponible.
 */
export async function logoutAuthSession() {
  try {
    await fetchWithCsrf('/api/v1/auth/logout', { method: 'POST' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Desactiva una cuenta de usuario validando explícitamente que el ID sea entero positivo.
 * @param {number | string} userId
 */
export async function deactivateUserAccountRemote(userId) {
  const numericId = parsePositiveIntId(userId);
  if (!numericId) {
    return { ok: false, error: 'Identificador de usuario inválido.' };
  }

  const apiRes = await callTier2Api(`/users/${numericId}`, { method: 'DELETE' });
  if (apiRes?.httpOk && apiRes?.data?.ok) {
    return { ok: true, source: apiRes.data.source || 'tier2' };
  }

  if (supabase) {
    try {
      await supabase
        .from('usuarios')
        .update({ activo: false, actualizado_en: new Date().toISOString() })
        .eq('id', numericId);
      return { ok: true, source: 'supabase' };
    } catch (err) {
      return { ok: false, error: err?.message || 'No se pudo desactivar la cuenta.' };
    }
  }

  return { ok: false, error: 'Servicio de desactivación no disponible.' };
}
