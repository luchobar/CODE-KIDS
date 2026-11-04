/**
 * CAPA DE LÓGICA DE NEGOCIO — SERVICIO DE USUARIOS Y HUD (CRUD)
 * Archivo: /src/services/users.service.js
 * Operaciones TAREA 3:
 *   - CREATE (INSERT): Registrar usuario en 'usuarios' y su 'perfiles_gamificacion'
 *   - READ (SELECT): Consultar HUD completo del estudiante
 *   - DELETE (DELETE / UPDATE): Desactivar o eliminar cuenta de usuario
 */

import {
  executePostgresQuery,
  getRelationalStore,
  saveRelationalStore,
  supabaseClient,
} from './db.client.js';
import { hashUserPassword, verifyUserPassword } from './password.util.js';

/**
 * CREATE (INSERT): Registra un nuevo usuario en 'usuarios' con resumen criptográfico PBKDF2-SHA256
 * en 'contrasena_hash' e inicializa su perfil gamificado.
 */
export async function registerUserAccount({
  nombre = 'Explorador',
  correo,
  contrasena,
  rol = 'estudiante',
  avatar = 'dragon',
}) {
  const cleanEmail = String(correo || '').trim().toLowerCase();
  const cleanName = String(nombre || 'Explorador').trim() || 'Explorador';
  const normalizedRole =
    rol === 'teacher' || rol === 'docente'
      ? 'docente'
      : rol === 'admin'
        ? 'admin'
        : 'estudiante';
  const rolId = normalizedRole === 'admin' ? 3 : normalizedRole === 'docente' ? 2 : 1;

  if (!cleanEmail) {
    throw new Error('El correo electrónico es obligatorio.');
  }

  // Derivación criptográfica real (PBKDF2-HMAC-SHA256) antes de persistir en base de datos
  const passwordHash = await hashUserPassword(contrasena || 'CodeKids2026*');

  // 1. PostgreSQL directo (pg.Pool)
  const pgInserted = await executePostgresQuery(
    `INSERT INTO usuarios (correo, nombre, rol, rol_id, contrasena_hash, activo)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     ON CONFLICT (correo) DO NOTHING
     RETURNING id, correo, nombre, rol, activo, creado_en;`,
    [cleanEmail, cleanName, normalizedRole, rolId, passwordHash],
  );

  if (pgInserted && pgInserted[0]) {
    const newUser = pgInserted[0];
    if (normalizedRole === 'estudiante') {
      await executePostgresQuery(
        `INSERT INTO perfiles_gamificacion (usuario_id, puntos_xp, saldo_monedas, dias_racha, avatar_activo_id)
         VALUES ($1, 0, 20, 1, $2)
         ON CONFLICT (usuario_id) DO NOTHING;`,
        [newUser.id, avatar || 'dragon'],
      );
      await executePostgresQuery(
        `INSERT INTO inventario_avatares_usuario (usuario_id, avatar_id)
         VALUES ($1, 'astronaut'), ($1, $2)
         ON CONFLICT (usuario_id, avatar_id) DO NOTHING;`,
        [newUser.id, avatar || 'dragon'],
      );
    }
    return { ok: true, operation: 'INSERT', source: 'postgresql', user: newUser };
  }

  // 2. Supabase Client
  if (supabaseClient) {
    try {
      const { data: inserted, error } = await supabaseClient
        .from('usuarios')
        .insert([
          {
            correo: cleanEmail,
            nombre: cleanName,
            rol: normalizedRole,
            contrasena_hash: passwordHash,
            correo_verificado_en: new Date().toISOString(),
            activo: true,
          },
        ])
        .select('id, correo, nombre, rol, activo, creado_en')
        .single();

      if (!error && inserted) {
        if (normalizedRole === 'estudiante') {
          await supabaseClient.from('perfiles_gamificacion').upsert({
            usuario_id: inserted.id,
            puntos_xp: 0,
            saldo_monedas: 20,
            dias_racha: 1,
            avatar_activo_id: avatar || 'dragon',
          });
          await supabaseClient.from('inventario_avatares_usuario').upsert([
            { usuario_id: inserted.id, avatar_id: 'astronaut' },
            { usuario_id: inserted.id, avatar_id: avatar || 'dragon' },
          ]);
        }
        return { ok: true, operation: 'INSERT', source: 'supabase', user: inserted };
      }
    } catch {
      /* continúa al almacén relacional */
    }
  }

  // 3. Almacén relacional 3FN
  const store = getRelationalStore();
  const exists = store.usuarios.find(
    (u) => String(u.correo).toLowerCase() === cleanEmail,
  );
  if (exists) {
    return { ok: false, error: 'El correo electrónico ya se encuentra registrado.' };
  }

  const nextId =
    store.usuarios.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0) + 1;
  const newUserRecord = {
    id: nextId,
    correo: cleanEmail,
    nombre: cleanName,
    rol: normalizedRole,
    rol_id: rolId,
    contrasena_hash: passwordHash,
    activo: true,
    creado_en: new Date().toISOString(),
  };

  store.usuarios.push(newUserRecord);
  if (normalizedRole === 'estudiante') {
    store.perfiles_gamificacion.push({
      usuario_id: nextId,
      puntos_xp: 0,
      nivel_actual: 1,
      saldo_monedas: 20,
      dias_racha: 1,
      avatar_activo_id: avatar || 'dragon',
      puntajes_diagnostico: { Secuencias: 75, Bucles: 45, Condicionales: 80, Descomposición: 55 },
    });
    store.inventario_avatares_usuario.push(
      { usuario_id: nextId, avatar_id: 'astronaut', desbloqueado_en: new Date().toISOString() },
      { usuario_id: nextId, avatar_id: avatar || 'dragon', desbloqueado_en: new Date().toISOString() },
    );
  }
  saveRelationalStore(store);

  const { contrasena_hash: _omitHash, ...publicUser } = newUserRecord;
  return { ok: true, operation: 'INSERT', source: 'relational-3fn', user: publicUser };
}

/**
 * READ + VERIFY: Autentica a un usuario validando el resumen criptográfico de 'contrasena_hash'
 * en la Capa de Negocio sin exponer hashes al cliente.
 */
export async function authenticateUserAccount({ correo, contrasena, demoFallbacks = [] }) {
  const cleanEmail = String(correo || '').trim().toLowerCase();
  const rawPassword = String(contrasena || '');
  if (!cleanEmail || !rawPassword) {
    return { ok: false, error: 'Debes ingresar correo y contraseña.' };
  }

  // 1. PostgreSQL directo
  const pgRows = await executePostgresQuery(
    `SELECT u.id, u.correo, u.nombre, u.rol, u.activo, u.contrasena_hash,
            COALESCE(pg.avatar_activo_id, 'dragon') AS avatar_activo_id
     FROM usuarios u
     LEFT JOIN perfiles_gamificacion pg ON pg.usuario_id = u.id
     WHERE LOWER(u.correo) = $1
     LIMIT 1;`,
    [cleanEmail],
  );
  if (pgRows && pgRows[0]) {
    const row = pgRows[0];
    if (row.activo === false) {
      return { ok: false, error: 'Esta cuenta se encuentra desactivada.' };
    }
    const valid = await verifyUserPassword(rawPassword, row.contrasena_hash, demoFallbacks);
    if (!valid) {
      return { ok: false, error: 'Correo o contraseña incorrectos.' };
    }
    return {
      ok: true,
      operation: 'SELECT',
      source: 'postgresql',
      user: {
        id: row.id,
        correo: row.correo,
        nombre: row.nombre,
        rol: row.rol,
        avatar: row.avatar_activo_id || 'dragon',
      },
    };
  }

  // 2. Supabase Client
  if (supabaseClient) {
    try {
      const { data: row, error } = await supabaseClient
        .from('usuarios')
        .select('id, correo, nombre, rol, activo, contrasena_hash')
        .eq('correo', cleanEmail)
        .maybeSingle();

      if (!error && row) {
        if (row.activo === false) {
          return { ok: false, error: 'Esta cuenta se encuentra desactivada.' };
        }
        const valid = await verifyUserPassword(rawPassword, row.contrasena_hash, demoFallbacks);
        if (!valid) {
          return { ok: false, error: 'Correo o contraseña incorrectos.' };
        }
        const { data: pg } = await supabaseClient
          .from('perfiles_gamificacion')
          .select('avatar_activo_id')
          .eq('usuario_id', row.id)
          .maybeSingle();

        return {
          ok: true,
          operation: 'SELECT',
          source: 'supabase',
          user: {
            id: row.id,
            correo: row.correo,
            nombre: row.nombre,
            rol: row.rol,
            avatar: pg?.avatar_activo_id || 'dragon',
          },
        };
      }
    } catch {
      /* continúa al almacén relacional */
    }
  }

  // 3. Almacén relacional 3FN
  const store = getRelationalStore();
  const localUser = store.usuarios.find(
    (u) => String(u.correo || '').toLowerCase() === cleanEmail,
  );
  if (localUser) {
    if (localUser.activo === false) {
      return { ok: false, error: 'Esta cuenta se encuentra desactivada.' };
    }
    const valid = await verifyUserPassword(
      rawPassword,
      localUser.contrasena_hash,
      demoFallbacks,
    );
    if (!valid) {
      return { ok: false, error: 'Correo o contraseña incorrectos.' };
    }
    const pg = store.perfiles_gamificacion.find(
      (p) => Number(p.usuario_id) === Number(localUser.id),
    );
    return {
      ok: true,
      operation: 'SELECT',
      source: 'relational-3fn',
      user: {
        id: localUser.id,
        correo: localUser.correo,
        nombre: localUser.nombre,
        rol: localUser.rol,
        avatar: pg?.avatar_activo_id || 'dragon',
      },
    };
  }

  return { ok: false, error: 'Correo o contraseña incorrectos.' };
}

/**
 * UPDATE: Actualiza la contraseña de un usuario aplicando hash criptográfico PBKDF2-SHA256.
 */
export async function updateUserAccountPassword({ correo, nuevaContrasena }) {
  const cleanEmail = String(correo || '').trim().toLowerCase();
  const rawPassword = String(nuevaContrasena || '');
  if (!cleanEmail || rawPassword.length < 4) {
    return { ok: false, error: 'Correo y nueva contraseña válida son requeridos.' };
  }

  const passwordHash = await hashUserPassword(rawPassword);

  const pgUpd = await executePostgresQuery(
    `UPDATE usuarios
     SET contrasena_hash = $1, actualizado_en = NOW()
     WHERE LOWER(correo) = $2
     RETURNING id, correo, nombre, rol;`,
    [passwordHash, cleanEmail],
  );
  if (pgUpd && pgUpd[0]) {
    return { ok: true, operation: 'UPDATE', source: 'postgresql', user: pgUpd[0] };
  }

  if (supabaseClient) {
    try {
      const { data: updated, error } = await supabaseClient
        .from('usuarios')
        .update({
          contrasena_hash: passwordHash,
          actualizado_en: new Date().toISOString(),
        })
        .eq('correo', cleanEmail)
        .select('id, correo, nombre, rol')
        .maybeSingle();

      if (!error && updated) {
        return { ok: true, operation: 'UPDATE', source: 'supabase', user: updated };
      }
    } catch {
      /* continúa al almacén relacional */
    }
  }

  const store = getRelationalStore();
  let found = false;
  store.usuarios = store.usuarios.map((u) => {
    if (String(u.correo || '').toLowerCase() !== cleanEmail) return u;
    found = true;
    return { ...u, contrasena_hash: passwordHash };
  });
  saveRelationalStore(store);

  return {
    ok: found,
    operation: 'UPDATE',
    source: 'relational-3fn',
    correo: cleanEmail,
    ...(found ? {} : { error: 'No se encontró una cuenta asociada a ese correo.' }),
  };
}

/**
 * READ (SELECT): Consulta el HUD completo de un estudiante (XP, nivel, monedas, racha, avatar, insignias).
 */
export async function getStudentHudProfile(usuarioId) {
  const uid = Number(usuarioId) || 1;

  // 1. PostgreSQL directo
  const pgRows = await executePostgresQuery(
    `SELECT
        u.id AS usuario_id,
        u.nombre,
        u.correo,
        u.rol,
        u.activo,
        COALESCE(pg.puntos_xp, 0) AS puntos_xp,
        COALESCE(pg.nivel_actual, 1) AS nivel_actual,
        COALESCE(pg.saldo_monedas, 0) AS saldo_monedas,
        COALESCE(pg.dias_racha, 1) AS dias_racha,
        COALESCE(pg.avatar_activo_id, 'dragon') AS avatar_activo_id,
        pg.puntajes_diagnostico
     FROM usuarios u
     LEFT JOIN perfiles_gamificacion pg ON pg.usuario_id = u.id
     WHERE u.id = $1;`,
    [uid],
  );

  if (pgRows && pgRows[0]) {
    return { ok: true, operation: 'SELECT', source: 'postgresql', hud: pgRows[0] };
  }

  // 2. Supabase Client
  if (supabaseClient) {
    try {
      const [{ data: u }, { data: pg }, { data: inv }, { data: ins }] = await Promise.all([
        supabaseClient.from('usuarios').select('id, nombre, correo, rol, activo').eq('id', uid).maybeSingle(),
        supabaseClient.from('perfiles_gamificacion').select('*').eq('usuario_id', uid).maybeSingle(),
        supabaseClient.from('inventario_avatares_usuario').select('avatar_id').eq('usuario_id', uid),
        supabaseClient.from('insignias_usuario').select('insignia_id').eq('usuario_id', uid),
      ]);

      if (u) {
        return {
          ok: true,
          operation: 'SELECT',
          source: 'supabase',
          hud: {
            usuario_id: u.id,
            nombre: u.nombre,
            correo: u.correo,
            rol: u.rol,
            activo: u.activo,
            puntos_xp: pg?.puntos_xp ?? 0,
            nivel_actual: pg?.nivel_actual ?? Math.floor((pg?.puntos_xp ?? 0) / 100) + 1,
            saldo_monedas: pg?.saldo_monedas ?? 0,
            dias_racha: pg?.dias_racha ?? 1,
            avatar_activo_id: pg?.avatar_activo_id ?? 'dragon',
            avatares_desbloqueados: (inv || []).map((i) => i.avatar_id),
            insignias: (ins || []).map((b) => b.insignia_id),
            puntajes_diagnostico: pg?.puntajes_diagnostico || {},
          },
        };
      }
    } catch {
      /* continúa al almacén relacional */
    }
  }

  // 3. Almacén relacional 3FN
  const store = getRelationalStore();
  const u = store.usuarios.find((item) => Number(item.id) === uid) || store.usuarios[0];
  const pg = store.perfiles_gamificacion.find((item) => Number(item.usuario_id) === Number(u.id));
  const inv = store.inventario_avatares_usuario
    .filter((item) => Number(item.usuario_id) === Number(u.id))
    .map((i) => i.avatar_id);
  const ins = (store.insignias_usuario || [])
    .filter((item) => Number(item.usuario_id) === Number(u.id))
    .map((b) => b.insignia_id);

  return {
    ok: true,
    operation: 'SELECT',
    source: 'relational-3fn',
    hud: {
      usuario_id: u.id,
      nombre: u.nombre,
      correo: u.correo,
      rol: u.rol,
      activo: u.activo !== false,
      puntos_xp: pg?.puntos_xp ?? 0,
      nivel_actual: pg?.nivel_actual ?? Math.floor((pg?.puntos_xp ?? 0) / 100) + 1,
      saldo_monedas: pg?.saldo_monedas ?? 0,
      dias_racha: pg?.dias_racha ?? 1,
      avatar_activo_id: pg?.avatar_activo_id ?? 'dragon',
      avatares_desbloqueados: inv,
      insignias: ins,
      puntajes_diagnostico: pg?.puntajes_diagnostico || {},
    },
  };
}

/**
 * DELETE (DELETE / UPDATE): Desactiva o elimina la cuenta de un usuario en 'usuarios'.
 */
export async function deactivateUserAccount(usuarioId, { hardDelete = false } = {}) {
  const uid = Number(usuarioId);
  if (!uid) {
    throw new Error('ID de usuario inválido.');
  }

  if (hardDelete) {
    const pgDel = await executePostgresQuery(
      `DELETE FROM usuarios WHERE id = $1 RETURNING id, correo, nombre;`,
      [uid],
    );
    if (pgDel) {
      return { ok: true, operation: 'DELETE', source: 'postgresql', deleted: pgDel[0] || { id: uid } };
    }
  } else {
    const pgUpd = await executePostgresQuery(
      `UPDATE usuarios SET activo = FALSE, actualizado_en = NOW() WHERE id = $1 RETURNING id, correo, nombre, activo;`,
      [uid],
    );
    if (pgUpd) {
      return { ok: true, operation: 'DELETE_SOFT', source: 'postgresql', user: pgUpd[0] };
    }
  }

  if (supabaseClient) {
    try {
      if (hardDelete) {
        await supabaseClient.from('usuarios').delete().eq('id', uid);
      } else {
        await supabaseClient
          .from('usuarios')
          .update({ activo: false, actualizado_en: new Date().toISOString() })
          .eq('id', uid);
      }
    } catch {
      /* continúa al almacén relacional */
    }
  }

  const store = getRelationalStore();
  if (hardDelete) {
    store.usuarios = store.usuarios.filter((u) => Number(u.id) !== uid);
    store.matriculas_aula = store.matriculas_aula.filter((m) => Number(m.estudiante_id) !== uid);
  } else {
    store.usuarios = store.usuarios.map((u) =>
      Number(u.id) === uid ? { ...u, activo: false } : u,
    );
  }
  saveRelationalStore(store);

  return {
    ok: true,
    operation: hardDelete ? 'DELETE' : 'DELETE_SOFT',
    source: supabaseClient ? 'supabase' : 'relational-3fn',
    usuarioId: uid,
    activo: false,
  };
}
