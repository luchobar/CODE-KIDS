import { supabase } from './supabaseClient.js';

const EXPANSION_SLUGS = ['laboratorio-python', 'ciudadela-html', 'neo-tokio-javascript'];

/**
 * Carga los mundos y misiones de expansión desde Supabase si la migración está aplicada.
 */
export async function loadExpansionFromSupabase() {
  if (!supabase) return null;

  try {
    const { data: mundos, error: errMundos } = await supabase
      .from('mundos')
      .select('id, titulo, slug, descripcion, tecnologia, orden, icono')
      .in('slug', EXPANSION_SLUGS)
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

    return {
      mundos,
      misiones: misiones
        .filter((m) => m.codigo_inicial && m.slug)
        .map((m) => ({
          ...m,
          mundo_slug: idToSlug[m.mundo_id] || '',
        })),
    };
  } catch {
    return null;
  }
}

/**
 * Inyecta el paquete de expansión en Supabase resolviendo dinámicamente `mundo_slug -> mundo_id`.
 * @param {{ mundos: Array<Record<string, any>>, misiones: Array<Record<string, any>> }} expansionPayload
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
