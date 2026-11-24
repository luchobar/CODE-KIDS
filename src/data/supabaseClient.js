import { createClient } from '@supabase/supabase-js';

/**
 * Normaliza la URL base de Supabase eliminando comillas o sufijos `/rest/v1` / `/auth/v1`.
 * @param {string} rawUrl
 * @returns {string}
 */
export function cleanSupabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  return rawUrl
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\/(rest|auth)(\/v\d+)?\/?$/i, '')
    .replace(/\/+$/, '');
}

/**
 * Limpia la clave pública anónima de Supabase.
 * @param {string} rawKey
 * @returns {string}
 */
export function cleanAnonKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return '';
  return rawKey.trim().replace(/^["']|["']$/g, '');
}

const rawSupabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const rawSupabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

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
