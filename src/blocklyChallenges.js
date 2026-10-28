export const BLOCKLY_CHALLENGES = [
  {
    id: 'sequence-forest', templateId: 'sequence-order', skill: 'Secuencias', level: 'Inicio', icon: 'tree',
    imageSeed: 'apple-robotics-forest-lab',
    name: 'El bosque', exerciseTitle: 'El viaje del robot', description: 'Ordena pasos y giros para llegar a la meta.',
    instructions: 'Arma una secuencia de bloques para llevar al robot hasta la meta.',
    start: { x: 0, y: 2, direction: 0 }, goal: { x: 2, y: 0 }, wall: null,
  },
  {
    id: 'sequence-city', templateId: 'sequence-order', skill: 'Secuencias', level: 'En camino', icon: 'buildings',
    imageSeed: 'apple-architecture-courtyard-minimal',
    name: 'La ciudad', exerciseTitle: 'Cruza la ciudad', description: 'Planea una ruta alrededor de la estructura central.',
    instructions: 'Guía al robot por la ciudad y rodea el obstáculo central para alcanzar la meta.',
    start: { x: 0, y: 1, direction: 0 }, goal: { x: 2, y: 1 }, wall: { x: 1, y: 1 },
  },
  {
    id: 'sequence-moon', templateId: 'sequence-order', skill: 'Secuencias', level: 'Explorador', icon: 'planet',
    imageSeed: 'apple-lunar-rover-surface-studio',
    name: 'La luna', exerciseTitle: 'Ruta lunar', description: 'Traza una ruta evitando el cráter central.',
    instructions: 'Programa el camino hasta la meta sin cruzar el cráter.',
    start: { x: 0, y: 2, direction: 1 }, goal: { x: 2, y: 0 }, wall: { x: 1, y: 1 },
  },
  {
    id: 'loop-bridge', templateId: 'loop-count', skill: 'Bucles', level: 'Inicio', icon: 'bridge',
    imageSeed: 'apple-minimal-bridge-perspective',
    name: 'El puente', exerciseTitle: 'Cruza el puente', description: 'Repite avanzar para cruzar con precisión.',
    instructions: 'Usa el bloque «repetir» para que el robot cruce el puente.',
    start: { x: 0, y: 2, direction: 1 }, goal: { x: 2, y: 2 }, wall: null, requiresBlock: 'ck_repeat',
  },
  {
    id: 'loop-zigzag', templateId: 'loop-count', skill: 'Bucles', level: 'En camino', icon: 'lightning',
    imageSeed: 'apple-geometric-stairs-light',
    name: 'El zigzag', exerciseTitle: 'Trayectoria en zigzag', description: 'Repite un patrón de avance y giro.',
    instructions: 'Crea un patrón con «repetir»: avanzar y girar a la izquierda.',
    start: { x: 0, y: 2, direction: 1 }, goal: { x: 1, y: 1 }, wall: null, requiresBlock: 'ck_repeat',
  },
  {
    id: 'loop-garden', templateId: 'loop-count', skill: 'Bucles', level: 'Explorador', icon: 'flower',
    imageSeed: 'apple-botanical-glasshouse-clean',
    name: 'El jardín', exerciseTitle: 'Recorrido botánico', description: 'Combina repetir y girar para recorrer el jardín.',
    instructions: 'Usa «repetir» para avanzar por el sendero y luego gira hacia la meta.',
    start: { x: 0, y: 2, direction: 1 }, goal: { x: 2, y: 1 }, wall: null, requiresBlock: 'ck_repeat',
  },
  {
    id: 'condition-detour', templateId: 'if-choice', skill: 'Condicionales', level: 'Inicio', icon: 'wall',
    imageSeed: 'apple-monolith-concrete-gallery',
    name: 'El desvío', exerciseTitle: 'Rodea el muro', description: 'Decide qué hacer cuando aparece un obstáculo.',
    instructions: 'Usa «si hay pared» para elegir un camino libre hasta la meta.',
    start: { x: 0, y: 0, direction: 1 }, goal: { x: 2, y: 0 }, wall: { x: 1, y: 0 }, requiresBlock: 'ck_if_wall',
  },
  {
    id: 'condition-cave', templateId: 'if-choice', skill: 'Condicionales', level: 'En camino', icon: 'compass',
    imageSeed: 'apple-canyon-stone-passage',
    name: 'La galería', exerciseTitle: 'Busca otra salida', description: 'Detecta el muro y encuentra la salida lateral.',
    instructions: 'Si el robot detecta una pared, hazlo girar y guíalo hasta la meta.',
    start: { x: 2, y: 2, direction: 0 }, goal: { x: 0, y: 0 }, wall: { x: 2, y: 1 }, requiresBlock: 'ck_if_wall',
  },
  {
    id: 'condition-river', templateId: 'if-choice', skill: 'Condicionales', level: 'Explorador', icon: 'waves',
    imageSeed: 'apple-water-reflection-architecture',
    name: 'El canal', exerciseTitle: 'Encuentra el paso', description: 'Comprueba la condición y rodea el canal.',
    instructions: 'Al encontrar el borde del canal, gira y cruza hasta la meta.',
    start: { x: 0, y: 0, direction: 2 }, goal: { x: 2, y: 2 }, wall: { x: 0, y: 1 }, requiresBlock: 'ck_if_wall',
  },
  {
    id: 'debug-sequence', category: 'Depuración', templateId: 'sequence-order', skill: 'Secuencias', level: 'Laboratorio', icon: 'bug',
    imageSeed: 'apple-circuit-macro-hardware',
    name: 'El giro equivocado', exerciseTitle: 'Encuentra el error', description: 'Revisa un programa que se desvía del camino.',
    instructions: 'El robot tiene un programa con un error. Prueba, encuentra el giro equivocado y corrígelo.',
    start: { x: 0, y: 2, direction: 0 }, goal: { x: 2, y: 0 }, wall: null,
    seedProgram: [{ type: 'ck_move' }, { type: 'ck_turn_left' }, { type: 'ck_move' }],
  },
  {
    id: 'debug-loop', category: 'Depuración', templateId: 'loop-count', skill: 'Bucles', level: 'Laboratorio', icon: 'SlidersHorizontal',
    imageSeed: 'apple-precision-dial-machined',
    name: 'La repetición incompleta', exerciseTitle: 'Ajusta el bucle', description: 'Ajusta un bucle que se detiene antes de la meta.',
    instructions: 'El robot se queda corto. Revisa cuántas veces se repite el paso y corrige el programa.',
    start: { x: 0, y: 2, direction: 1 }, goal: { x: 2, y: 2 }, wall: null, requiresBlock: 'ck_repeat',
    seedProgram: [{ type: 'ck_repeat', times: 1, body: [{ type: 'ck_move' }] }],
  },
  {
    id: 'debug-condition', category: 'Depuración', templateId: 'if-choice', skill: 'Condicionales', level: 'Laboratorio', icon: 'magnifyingGlass',
    imageSeed: 'apple-optical-lens-inspection',
    name: 'La decisión invertida', exerciseTitle: 'Corrige la decisión', description: 'Repara una condición que orienta al robot hacia el obstáculo.',
    instructions: 'Prueba el programa y cambia la acción del bloque «si hay pared» para tomar el desvío.',
    start: { x: 0, y: 0, direction: 1 }, goal: { x: 2, y: 0 }, wall: { x: 1, y: 0 }, requiresBlock: 'ck_if_wall',
    seedProgram: [
      { type: 'ck_if_wall', body: [{ type: 'ck_turn_left' }] },
      { type: 'ck_move' }, { type: 'ck_move' }, { type: 'ck_turn_left' },
      { type: 'ck_move' }, { type: 'ck_move' }, { type: 'ck_turn_left' },
      { type: 'ck_move' }, { type: 'ck_move' },
    ],
  },
];

export const BLOCKLY_SKILLS = ['Secuencias', 'Bucles', 'Condicionales', 'Depuración'];

export function challengeCategory(challenge) {
  return challenge.category || challenge.skill;
}

export const BLOCKLY_LESSONS = {
  Secuencias: {
    explanation: 'El robot ejecuta los bloques en orden estricto, de arriba hacia abajo.',
    hints: [
      'El indicador del robot muestra la dirección en la que avanzará.',
      'Planea el recorrido por etapas: primero avanza y luego gira.',
      'Ejecuta un paso a la vez y observa cómo cambia la posición en la cuadrícula.',
    ],
  },
  Bucles: {
    explanation: 'Un bucle repite la secuencia de bloques anidada en su interior.',
    hints: [
      'Arrastra «avanzar 1 paso» dentro del bloque «repetir».',
      'Cuenta cuántas casillas separan al robot de la meta.',
      'Si el movimiento incluye un giro periódico, incorpóralo dentro del mismo bucle.',
    ],
  },
  Condicionales: {
    explanation: '«Si hay pared» evalúa el entorno antes de actuar y solo ejecuta su interior cuando detecta un obstáculo.',
    hints: [
      'Ubica la condición antes de avanzar cuando el robot esté frente al muro.',
      'El giro dentro de la condición debe orientar al robot hacia una casilla despejada.',
      'Tras rodear el obstáculo, completa los pasos restantes hasta la meta.',
    ],
  },
  Depuración: {
    explanation: 'Depurar consiste en ejecutar, observar dónde diverge el comportamiento esperado y corregir el bloque responsable.',
    hints: [
      'Ejecuta el programa actual y observa exactamente en qué casilla se desvía el robot.',
      'Inspecciona el bloque inmediatamente anterior al desvío: verifica el sentido del giro o el contador.',
      'Modifica un parámetro a la vez y vuelve a ejecutar.',
    ],
  },
};

export function getBlocklyChallenge(id, templateId) {
  return BLOCKLY_CHALLENGES.find((challenge) => challenge.id === id)
    || BLOCKLY_CHALLENGES.find((challenge) => challenge.templateId === templateId)
    || BLOCKLY_CHALLENGES[0];
}
