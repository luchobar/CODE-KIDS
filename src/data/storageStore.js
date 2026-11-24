import {
  DEFAULT_A11Y_SETTINGS,
  DEFAULT_COURSES,
  DEFAULT_DIAGNOSTIC_SCORES,
  DEFAULT_ENROLLMENTS,
} from './seedData.js';

export const STORAGE_KEY = 'codekids-demo-state';
export const USER_PROFILES_STORAGE_KEY = 'codekids-user-profiles-v1';
export const A11Y_STORAGE_KEY = 'codekids-a11y-settings';
export const LOCAL_ACCOUNTS_KEY = 'codekids-registered-accounts';
export const CLASSROOM_CACHE_KEY = 'codekids-classroom-cache-v1';

function hasLocalStorage() {
  return typeof localStorage !== 'undefined';
}

function readJsonStorage(key, fallback) {
  if (!hasLocalStorage()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  if (!hasLocalStorage()) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Genera la clave determinista para indexar el progreso de un usuario en almacenamiento local.
 * @param {{ id?: unknown, email?: string, name?: string } | null} user
 * @returns {string}
 */
export function getUserProfileKey(user) {
  if (!user) return '';
  if (user.email) return `email:${String(user.email).trim().toLowerCase()}`;
  if (user.id !== undefined && user.id !== null) return `id:${String(user.id).trim().toLowerCase()}`;
  if (user.name) return `name:${String(user.name).trim().toLowerCase()}`;
  return '';
}

/**
 * Construye el estado inicial de progreso gamificado para un usuario nuevo o invitado.
 * @param {{ avatar?: string } | null} [user]
 */
export function createDefaultUserProfile(user = null) {
  const defaultAvatar = user?.avatar || 'dragon';
  return {
    scores: { ...DEFAULT_DIAGNOSTIC_SCORES },
    lastScore: null,
    points: 0,
    coins: 20,
    streak: 1,
    lastStoryDay: undefined,
    avatar: defaultAvatar,
    ownedAvatars: Array.from(new Set(['astronaut', defaultAvatar])),
    completedMissions: [],
    pythonProgress: [],
  };
}

/**
 * Lee el perfil gamificado guardado para un usuario específico.
 * @param {{ id?: unknown, email?: string, name?: string, avatar?: string } | null} user
 */
export function readUserProfile(user) {
  const base = createDefaultUserProfile(user);
  const key = getUserProfileKey(user);
  if (!key) return base;

  const allProfiles = readJsonStorage(USER_PROFILES_STORAGE_KEY, {});
  const idKey =
    user?.id !== undefined && user?.id !== null
      ? `id:${String(user.id).trim().toLowerCase()}`
      : '';
  const saved = allProfiles?.[key] || (idKey ? allProfiles?.[idKey] : null);
  if (!saved || typeof saved !== 'object') return base;

  return {
    ...base,
    ...saved,
    avatar: saved.avatar || user?.avatar || base.avatar,
    ownedAvatars: Array.from(
      new Set(['astronaut', ...(saved.ownedAvatars || []), user?.avatar || base.avatar]),
    ),
    completedMissions: Array.isArray(saved.completedMissions) ? saved.completedMissions : [],
    pythonProgress: Array.isArray(saved.pythonProgress) ? saved.pythonProgress : [],
  };
}

/**
 * Persiste el perfil gamificado del usuario activo indexado por correo e ID.
 * @param {{ id?: unknown, email?: string, name?: string, avatar?: string } | null} user
 * @param {Record<string, any>} stateSnapshot
 */
export function writeUserProfile(user, stateSnapshot) {
  const key = getUserProfileKey(user);
  if (!key || !stateSnapshot) return false;

  const allProfiles = readJsonStorage(USER_PROFILES_STORAGE_KEY, {});
  const profileData = {
    scores: stateSnapshot.scores || { ...DEFAULT_DIAGNOSTIC_SCORES },
    lastScore: stateSnapshot.lastScore ?? null,
    points: stateSnapshot.points ?? 0,
    coins: stateSnapshot.coins ?? 20,
    streak: stateSnapshot.streak ?? 1,
    lastStoryDay: stateSnapshot.lastStoryDay,
    avatar: stateSnapshot.avatar || user?.avatar || 'dragon',
    ownedAvatars: Array.isArray(stateSnapshot.ownedAvatars)
      ? stateSnapshot.ownedAvatars
      : ['astronaut', user?.avatar || 'dragon'],
    completedMissions: Array.isArray(stateSnapshot.completedMissions)
      ? stateSnapshot.completedMissions
      : [],
    pythonProgress: Array.isArray(stateSnapshot.pythonProgress)
      ? stateSnapshot.pythonProgress
      : [],
  };

  allProfiles[key] = profileData;
  if (user?.id !== undefined && user?.id !== null) {
    allProfiles[`id:${String(user.id).trim().toLowerCase()}`] = profileData;
  }
  return writeJsonStorage(USER_PROFILES_STORAGE_KEY, allProfiles);
}

/**
 * Hidrata el estado global de la aplicación combinando la sesión activa y su perfil.
 */
export function readAppState() {
  const saved = readJsonStorage(STORAGE_KEY, {});
  const activeUser = saved?.user || null;
  const userProfile = activeUser ? readUserProfile(activeUser) : createDefaultUserProfile(null);
  return {
    user: activeUser,
    ...userProfile,
    soundEnabled: Boolean(saved?.soundEnabled),
    assignments: Array.isArray(saved?.assignments) ? saved.assignments : [],
    submissions: Array.isArray(saved?.submissions) ? saved.submissions : [],
  };
}

/**
 * Guarda de forma segura el estado global de sesión en almacenamiento local.
 * @param {Record<string, any>} state
 */
export function writeAppState(state) {
  return writeJsonStorage(STORAGE_KEY, state);
}

/**
 * Lee las preferencias de accesibilidad y tema visual.
 */
export function readA11ySettings() {
  const saved = readJsonStorage(A11Y_STORAGE_KEY, {});
  return { ...DEFAULT_A11Y_SETTINGS, ...(saved && typeof saved === 'object' ? saved : {}) };
}

/**
 * Guarda las preferencias de accesibilidad y tema visual.
 * @param {Record<string, any>} settings
 */
export function writeA11ySettings(settings) {
  return writeJsonStorage(A11Y_STORAGE_KEY, settings);
}

/**
 * Obtiene el mapa de cuentas locales registradas para respaldo offline.
 */
export function getLocalRegisteredAccounts() {
  const parsed = readJsonStorage(LOCAL_ACCOUNTS_KEY, {});
  return parsed && typeof parsed === 'object' ? parsed : {};
}

/**
 * Guarda o actualiza una cuenta local omitiendo cualquier contraseña en texto plano.
 * @param {string} email
 * @param {Record<string, any>} accountData
 */
export function saveLocalRegisteredAccount(email, accountData) {
  const current = getLocalRegisteredAccounts();
  const { password: _omitPlainPassword, ...safeAccountData } = accountData || {};
  current[email] = safeAccountData;
  return writeJsonStorage(LOCAL_ACCOUNTS_KEY, current);
}

/**
 * Lee el caché resiliente de cursos, matrículas, retos y entregas.
 */
export function readClassroomCache() {
  const raw = readJsonStorage(CLASSROOM_CACHE_KEY, {});
  return {
    courses: Array.isArray(raw?.courses) && raw.courses.length ? raw.courses : DEFAULT_COURSES,
    enrollmentsByGroup:
      raw?.enrollmentsByGroup && typeof raw.enrollmentsByGroup === 'object'
        ? { ...DEFAULT_ENROLLMENTS, ...raw.enrollmentsByGroup }
        : { ...DEFAULT_ENROLLMENTS },
    assignments: Array.isArray(raw?.assignments) ? raw.assignments : [],
    submissions: Array.isArray(raw?.submissions) ? raw.submissions : [],
  };
}

/**
 * Fusiona y persiste cambios en el caché resiliente del aula.
 * @param {Record<string, any>} next
 */
export function writeClassroomCache(next) {
  const current = readClassroomCache();
  const merged = { ...current, ...next };
  writeJsonStorage(CLASSROOM_CACHE_KEY, merged);
  return merged;
}
