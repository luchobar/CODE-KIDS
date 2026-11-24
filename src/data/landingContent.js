export const LANDING_STATS = [
  { number: '8 a 15', label: 'Años recomendados' },
  { number: '7 Mundos', label: 'Aventuras temáticas' },
  { number: '+22 Retos', label: 'Misiones interactivas' },
  { number: '3 Lenguajes', label: 'Python, HTML5 y JS' },
];

export const LANDING_OBJECTIVES = [
  {
    id: 'computational',
    tone: 'bubble-blue',
    icon: 'brain',
    title: 'Pensamiento Computacional',
    description:
      'Desarrollamos habilidades de descomposición, reconocimiento de patrones, abstracción y lógica algorítmica. Los estudiantes aprenden a estructurar ideas antes de preocuparse por la sintaxis.',
  },
  {
    id: 'gamification',
    tone: 'bubble-lime',
    icon: 'trophy',
    title: 'Gamificación con Sentido',
    description:
      'El juego es el motor del aprendizaje. A través de la narrativa espacial con el robot Pipo, los niños ganan experiencia (XP), monedas espaciales, desbloquean avatares y celebran su racha diaria.',
  },
  {
    id: 'code-bridge',
    tone: 'bubble-purple',
    icon: 'terminal',
    title: 'Del Bloque al Código Escrito',
    description:
      'Servimos como el puente natural entre la programación visual por bloques y los lenguajes profesionales: escriben funciones reales en Python, estructuran la web en HTML5 y programan lógica en JavaScript.',
  },
  {
    id: 'adaptive',
    tone: 'bubble-amber',
    icon: 'sparkle',
    title: 'Tutor Adaptativo e Inclusión',
    description:
      'Un sistema pedagógico inteligente que detecta debilidades y sugiere rutas de refuerzo personalizadas, con opciones de accesibilidad (modo claro/oscuro, contraste y soporte tipográfico).',
  },
];

export const LANDING_METHODOLOGY = [
  {
    step: '1',
    subtitle: 'Fase Inicial',
    title: 'Lógica Visual con Bloques',
    description:
      'Los alumnos ensamblan bloques magnéticos para orientar y mover robots por laberintos. Aprenden orden de ejecución, secuencias y repeticiones sin errores tipográficos.',
    features: [
      'Secuencias paso a paso',
      'Bucles e iteración lógica',
      'Detección espacial sin frustración',
    ],
  },
  {
    step: '2',
    subtitle: 'Fase Intermedia',
    title: 'Decisiones y Subrutinas',
    description:
      'Incorporan sensores automáticos («si hay pared») para resolver rutas variables y aprenden a modular código depurando errores en circuitos orbitales.',
    features: [
      'Condiciones lógicas (if / else)',
      'Funciones y modularidad',
      'Depuración de programas',
    ],
  },
  {
    step: '3',
    subtitle: 'Fase Avanzada',
    title: 'Laboratorios de Código Real',
    description:
      'Dan el salto al teclado escribiendo comandos y funciones reales en Python, maquetando con etiquetas HTML5 en vivo y programando drones autónomos con JavaScript.',
    features: [
      'Python con listas y diccionarios',
      'Hologramas y etiquetas HTML5',
      'Casos de prueba en JavaScript',
    ],
  },
];

export const LANDING_WORLDS = [
  {
    id: 'forest',
    featured: true,
    icon: 'compass',
    title: 'El Bosque de las Secuencias',
    description: 'Ensambla bloques de avance y giros en orden exacto para guiar al robot hasta la estrella.',
    image: '/images/world-forest.png',
    alt: 'Escenario de El Bosque de las Secuencias',
  },
  {
    id: 'loops',
    featured: false,
    icon: 'sliders',
    title: 'La Isla de los Bucles',
    description: 'Descubre patrones que se repiten para ahorrar instrucciones y cruzar puentes infinitos.',
  },
  {
    id: 'cave',
    featured: false,
    icon: 'wall',
    title: 'La Cueva de las Decisiones',
    description: 'Usa sensores inteligentes para evaluar obstáculos y tomar caminos libres de peligros.',
  },
  {
    id: 'python',
    featured: true,
    icon: 'terminal',
    title: 'Laboratorio de Código Python',
    description:
      'Domina desde comandos del robot hasta escudos cuánticos, listas filtradas y diccionarios estelares en 6 etapas.',
    image: '/images/python-lab.png',
    alt: 'Estación del Laboratorio de Python',
  },
  {
    id: 'functions',
    featured: false,
    icon: 'cpu',
    title: 'Estación de Funciones',
    description: 'Depura circuitos averiados y crea subrutinas reutilizables para misiones de ingeniería espacial.',
  },
  {
    id: 'html',
    featured: false,
    icon: 'html',
    title: 'Ciudadela HTML',
    description: 'Reconstruye faros holográficos y portales de suministros con etiquetas semánticas HTML5 en tiempo real.',
  },
  {
    id: 'js',
    featured: false,
    icon: 'js',
    title: 'Neo-Tokio JavaScript',
    description: 'Programa los neones de la metrópolis y la lógica de vuelo de drones autónomos con funciones JavaScript.',
  },
];

export const LANDING_AUDIENCES = [
  {
    id: 'students',
    icon: 'student',
    badge: 'Para Estudiantes',
    title: 'Aprende jugando a tu propio ritmo',
    description:
      'Los niños exploran el mapa de aventuras con autonomía, reciben pistas pedagógicas progresivas si se atascan y personalizan a su compañero de misión en la tienda de avatares espaciales.',
    checklist: [
      'Mapa interactivo de aventura con 22 misiones',
      'Sistema de recompensas: XP, racha y monedas',
      'Tienda con avatares coleccionables (dragón, zorro, robot, unicornio)',
      'Test diagnóstico de nivelación computacional',
    ],
  },
  {
    id: 'teachers',
    icon: 'teacher',
    badge: 'Para Docentes y Colegios',
    title: 'Gestión de aula y analítica pedagógica',
    description:
      'Los profesores cuentan con una consola docente especializada para publicar retos según el curso (ej. 5° A o 6° B), supervisar el avance de cada estudiante y recibir diagnósticos pedagógicos de IA.',
    checklist: [
      'Consola docente con vista de grupo y estudiantes',
      'Asignación y evaluación de retos personalizados',
      'Métricas de desempeño, intentos y porcentaje de acierto',
      'Respaldo transaccional y sincronización segura con Supabase',
    ],
  },
];
