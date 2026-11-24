import { BLOCKLY_SKILLS } from '../blocklyChallenges.js';
import { EXPANSION_MISSIONS, EXPANSION_WORLDS } from '../expansionCatalog.js';

export const AVATAR_SHOP = [
  {
    avatar: 'dragon',
    name: 'Dragón Chispa',
    cost: 30,
    note: 'Especialista en lógica y secuencias rápidas',
    tone: 'peach',
  },
  {
    avatar: 'cat',
    name: 'Gato Pixel',
    cost: 30,
    note: 'Observador preciso para depurar programas',
    tone: 'lav',
  },
  {
    avatar: 'robot',
    name: 'Unidad Rover',
    cost: 40,
    note: 'Diseñado para exploración autónoma por bloques',
    tone: 'mint',
  },
  {
    avatar: 'fox',
    name: 'Zorro Ágil',
    cost: 50,
    note: 'Estratega en bucles y rutas óptimas',
    tone: 'yellow',
  },
  {
    avatar: 'unicorn',
    name: 'Prisma Orbital',
    cost: 60,
    note: 'Compañero avanzado de laboratorio Python',
    tone: 'blue',
  },
];

export const DIAGNOSTIC_QUESTIONS = [
  {
    skill: 'Secuencias',
    prompt: 'Para que un personaje avance y luego salude, ¿qué orden tiene sentido?',
    options: ['Saludar y avanzar', 'Avanzar y después saludar', 'Repetir sin una acción'],
    answer: 1,
  },
  {
    skill: 'Bucles',
    prompt: '¿Qué bloque conviene usar para repetir un salto cinco veces?',
    options: ['Repetir 5 veces', 'Esperar para siempre', 'Si está tocando el borde'],
    answer: 0,
  },
  {
    skill: 'Condicionales',
    prompt: '¿Cómo hacemos que el personaje cambie de dirección al tocar una pared?',
    options: ['Mover 10 pasos siempre', 'Si toca la pared, girar', 'Repetir el saludo'],
    answer: 1,
  },
  {
    skill: 'Descomposición',
    prompt: 'Un proyecto debe iniciar, mover al robot y registrar puntos. ¿Qué estrategia ayuda a construirlo?',
    options: ['Resolver todo al mismo tiempo', 'Dividirlo en esas tres tareas pequeñas', 'Eliminar el marcador'],
    answer: 1,
  },
];

export const TEACHER_ACTIVITY_SKILLS = [...BLOCKLY_SKILLS, 'Python', 'HTML5', 'JavaScript'];

export const SAMPLE_STUDENTS = [
  { id: 1, name: 'Valeria', email: 'valeria@universidad.edu', group: '5° A', score: 82, weak: 'Bucles', avatar: 'dragon', points: 120, level: 2, completedCount: 3 },
  { id: 2, name: 'Mateo', email: 'mateo@universidad.edu', group: '5° A', score: 68, weak: 'Descomposición', avatar: 'cat', points: 85, level: 1, completedCount: 2 },
  { id: 3, name: 'Lucía', email: 'lucia@universidad.edu', group: '5° A', score: 91, weak: 'Condicionales', avatar: 'robot', points: 210, level: 3, completedCount: 6 },
  { id: 101, name: 'Samuel', email: 'samuel@universidad.edu', group: '6° B', score: 74, weak: 'Secuencias', avatar: 'fox', points: 110, level: 2, completedCount: 2 },
  { id: 102, name: 'Mariana', email: 'mariana@universidad.edu', group: '6° B', score: 64, weak: 'Bucles', avatar: 'unicorn', points: 95, level: 1, completedCount: 2 },
];

/**
 * Construye la configuración de los 7 mundos del mapa fusionando catálogo base y expansión remota.
 * @param {{ mundos?: Array<Record<string, any>>, misiones?: Array<Record<string, any>> } | null} expansionData
 */
export function buildStudentWorldsCatalog(expansionData = null) {
  const activeWorlds =
    expansionData?.mundos?.length > 0 ? expansionData.mundos : EXPANSION_WORLDS;
  const activeMissions =
    expansionData?.misiones?.length > 0 ? expansionData.misiones : EXPANSION_MISSIONS;

  const findWorld = (slug) => activeWorlds.find((w) => w.slug === slug);
  const findMission = (slug) => activeMissions.find((m) => m.slug === slug);

  const pyMeta = findWorld('laboratorio-python');
  const htmlMeta = findWorld('ciudadela-html');
  const jsMeta = findWorld('neo-tokio-javascript');

  return [
    {
      title: 'El Bosque de las Secuencias',
      subtitle: 'Guía a los robots por nuevos caminos paso a paso',
      skill: 'Secuencias',
      mode: 'blockly',
      color: 'forest',
      image: '/images/world-forest.png',
      ids: ['sequence-forest', 'sequence-city', 'sequence-moon'],
    },
    {
      title: 'La Isla de los Bucles',
      subtitle: 'Descubre patrones que se repiten para ahorrar energía',
      skill: 'Bucles',
      mode: 'blockly',
      color: 'island',
      image: '/images/world-island.png',
      ids: ['loop-bridge', 'loop-zigzag', 'loop-garden'],
    },
    {
      title: 'La Cueva de las Decisiones',
      subtitle: 'Elige qué hacer ante cada obstáculo con sensores',
      skill: 'Condicionales',
      mode: 'blockly',
      color: 'cave',
      image: '/images/world-cave.png',
      ids: ['condition-detour', 'condition-cave', 'condition-river'],
    },
    {
      title: 'Estación de Funciones y Depuración',
      subtitle: 'Repara módulos de código y domina rutinas avanzadas',
      skill: 'Funciones',
      mode: 'blockly',
      color: 'forest',
      image: '/images/python-lab.png',
      ids: ['debug-sequence', 'debug-loop', 'debug-condition'],
    },
    {
      title: pyMeta?.titulo || 'Laboratorio de Código Python',
      subtitle:
        pyMeta?.descripcion ||
        'Domina comandos del robot, funciones cuánticas, listas filtradas y diccionarios estelares.',
      skill: 'Python',
      mode: 'python',
      worldSlug: 'laboratorio-python',
      color: 'island',
      image: '/images/python-lab.png',
      ids: [
        'python-sequence',
        'python-loop',
        'python-condition',
        'py-protocolo-escudo-cuantico',
        'py-radar-senales-corruptas',
        'py-nucleo-decodificador-estelar',
      ],
      nodeNames: [
        'Etapa 1 · Primer comando',
        'Etapa 2 · Bucle for',
        'Etapa 3 · Sensor if',
        `Etapa 4 · ${findMission('py-protocolo-escudo-cuantico')?.titulo || 'Escudo Cuántico'}`,
        `Etapa 5 · ${findMission('py-radar-senales-corruptas')?.titulo || 'Radar de Señales'}`,
        `Etapa 6 · ${findMission('py-nucleo-decodificador-estelar')?.titulo || 'Decodificador Estelar'}`,
      ],
      nodeLevels: ['Inicio', 'En camino', 'Explorador', 'Inicio', 'En camino', 'Explorador'],
      nodeXp: [
        15,
        15,
        15,
        findMission('py-protocolo-escudo-cuantico')?.xp_recompensa || 45,
        findMission('py-radar-senales-corruptas')?.xp_recompensa || 55,
        findMission('py-nucleo-decodificador-estelar')?.xp_recompensa || 70,
      ],
    },
    {
      title: htmlMeta?.titulo || 'Ciudadela HTML',
      subtitle:
        htmlMeta?.descripcion ||
        'Reconstruye hologramas y portales espaciales con etiquetas semánticas HTML5 en vivo.',
      skill: 'HTML5',
      mode: 'code-world',
      worldSlug: 'ciudadela-html',
      color: 'island',
      image: '/images/world-island.png',
      ids: ['html-faro-holografico', 'html-portal-suministros'],
      nodeNames: [
        `Misión 1 · ${findMission('html-faro-holografico')?.titulo || 'El Faro Holográfico'}`,
        `Misión 2 · ${findMission('html-portal-suministros')?.titulo || 'Portal de Suministros'}`,
      ],
      nodeLevels: ['Inicio', 'En camino'],
      nodeXp: [
        findMission('html-faro-holografico')?.xp_recompensa || 25,
        findMission('html-portal-suministros')?.xp_recompensa || 35,
      ],
    },
    {
      title: jsMeta?.titulo || 'Neo-Tokio JavaScript',
      subtitle:
        jsMeta?.descripcion ||
        'Programa la red de neones y los drones autónomos de la metrópolis con lógica JavaScript.',
      skill: 'JavaScript',
      mode: 'code-world',
      worldSlug: 'neo-tokio-javascript',
      color: 'cave',
      image: '/images/world-cave.png',
      ids: ['js-neones-shibuya', 'js-dron-mensajero'],
      nodeNames: [
        `Misión 1 · ${findMission('js-neones-shibuya')?.titulo || 'Encendiendo los Neones de Shibuya'}`,
        `Misión 2 · ${findMission('js-dron-mensajero')?.titulo || 'Dron Mensajero Autónomo'}`,
      ],
      nodeLevels: ['Inicio', 'Explorador'],
      nodeXp: [
        findMission('js-neones-shibuya')?.xp_recompensa || 30,
        findMission('js-dron-mensajero')?.xp_recompensa || 45,
      ],
    },
  ];
}
