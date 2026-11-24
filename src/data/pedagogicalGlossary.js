/**
 * Glosario STEAM interactivo, tooltips contextuales, guías docentes y micro-ayudas diagnósticas.
 */
export const STEAM_GLOSSARY = [
  {
    id: 'algoritmo',
    term: 'Algoritmo',
    category: 'Lógica',
    summary: 'Conjunto finito y ordenado de pasos precisos para resolver un problema o completar una misión.',
    analogy: 'Como las instrucciones numeradas para armar una nave con piezas LEGO.',
    example: '1. Avanzar → 2. Girar derecha → 3. Avanzar.',
  },
  {
    id: 'secuencia',
    term: 'Secuencia',
    category: 'Lógica',
    summary: 'Orden estricto de arriba hacia abajo en que la computadora ejecuta cada instrucción.',
    analogy: 'Ponerse primero los calcetines y luego los zapatos; al revés no funciona.',
    example: 'ck_move → ck_turn_right → ck_move',
  },
  {
    id: 'bucle',
    term: 'Bucle (Loop)',
    category: 'Bloques',
    summary: 'Estructura que repite automáticamente una o varias acciones un número indicado de veces.',
    analogy: 'Dar 5 saltos en lugar de escuchar «salta» cinco veces por separado.',
    example: 'for i in range(3): avanzar()',
  },
  {
    id: 'condicional',
    term: 'Condicional (if / else)',
    category: 'Bloques',
    summary: 'Bifurcación lógica que ejecuta una acción solo si se cumple una condición verdadera.',
    analogy: 'Si está lloviendo → abre el paraguas; si no → camina normal.',
    example: 'if hay_pared(): girar_derecha()',
  },
  {
    id: 'depuracion',
    term: 'Depuración (Debugging)',
    category: 'Lógica',
    summary: 'Proceso metódico de observar un fallo, aislar su causa paso a paso y corregirlo.',
    analogy: 'Revisar qué ficha de dominó no tocó a la siguiente antes de culpar a toda la fila.',
    example: 'Usar el botón «Paso a paso» en el escenario.',
  },
  {
    id: 'funcion',
    term: 'Función',
    category: 'Python',
    summary: 'Bloque reutilizable de código con nombre propio que recibe entradas y puede devolver un resultado.',
    analogy: 'Un botón de «Licuar» en una licuadora: encapsula muchos movimientos en un solo comando.',
    example: 'def calcular_escudo(energia): return energia * 2',
  },
  {
    id: 'variable',
    term: 'Variable',
    category: 'Python',
    summary: 'Espacio con nombre en memoria donde guardamos un dato (puntaje, nombre, lista) para reutilizarlo.',
    analogy: 'Una caja transparente con etiqueta: sabes qué contiene y puedes actualizarlo.',
    example: 'let monedas = 25;',
  },
  {
    id: 'indentacion',
    term: 'Indentación (Sangría)',
    category: 'Python',
    summary: 'Espacios al inicio de una línea que indican en Python qué instrucciones pertenecen a un for, if o def.',
    analogy: 'Las viñetas con margen a la derecha debajo de un título en tu cuaderno.',
    example: 'if energia > 0:\n    avanzar()',
  },
  {
    id: 'lista-array',
    term: 'Lista / Array',
    category: 'Python',
    summary: 'Colección ordenada de múltiples valores guardados juntos dentro de corchetes [ ].',
    analogy: 'Una mochila con bolsillos numerados 0, 1, 2... para guardar cristales espaciales.',
    example: 'senales = [12, 45, 80]',
  },
  {
    id: 'etiqueta-html',
    term: 'Etiqueta Semántica HTML',
    category: 'Web',
    summary: 'Marcador entre < > que indica al navegador el rol del contenido (título, párrafo, lista, sección).',
    analogy: 'Los letreros de «Entrada», «Mapa» y «Biblioteca» en los edificios de una ciudad.',
    example: '<header><h1>Ciudadela</h1></header>',
  },
  {
    id: 'dom',
    term: 'DOM (Document Object Model)',
    category: 'Web',
    summary: 'Árbol vivo en memoria que construye el navegador a partir de tu HTML para dibujarlo y verificarlo.',
    analogy: 'La maqueta armada a partir de tus planos HTML.',
    example: 'document.querySelector("h1")',
  },
  {
    id: 'caso-prueba',
    term: 'Caso de Prueba (Test)',
    category: 'Web',
    summary: 'Comprobación automática con una entrada conocida y una salida esperada para verificar tu código.',
    analogy: 'Probar una llave en varias cerraduras para asegurarte de que siempre abre la correcta.',
    example: 'Entrada: (80) → Esperado: "ESTABLE"',
  },
];

export const WORKSPACE_TOOLTIPS = {
  blockLimit:
    'El límite máximo de bloques te anima a descubrir bucles en lugar de apilar movimientos sueltos. Si superas el límite, agrupa repeticiones.',
  stepDebugger:
    'Usa «Paso a paso» para avanzar un bloque por clic y observar en qué coordenada cambia Pipo. «Pausa» detiene la simulación sin perder la ruta.',
  pythonIndent:
    'En Python cada bloque dentro de for, if o def requiere 4 espacios de sangría tras dos puntos (:). Pulsa Tab o usa los chips superiores.',
  syntaxShortcuts:
    'Toca cualquier chip de sintaxis para insertarlo justo donde está tu cursor sin tener que buscar símbolos complejos en pantalla.',
  unitTests:
    'La consola evalúa tu función con varios escenarios automáticos. Comprueba que usas return para devolver el resultado exacto esperado.',
  hologramDom:
    'Cada cambio válido se proyecta en tiempo real dentro del visor aislado y verifica etiquetas y estructura DOM.',
  assignmentEval:
    'Al validar con éxito el ejercicio inferior se habilita el botón de envío para registrar evidencia e intentos ante tu docente.',
};

export const DIAGNOSTIC_PEDAGOGY = {
  Secuencias: {
    evaluates: 'Evalúa si ordenas causa y efecto antes de ejecutar una acción.',
    thinkingTip: 'Imagina la escena paso a paso: ¿qué acción debe ocurrir primero para que la segunda tenga sentido?',
  },
  Bucles: {
    evaluates: 'Evalúa tu capacidad para detectar acciones repetitivas y simplificar instrucciones.',
    thinkingTip: 'Busca qué palabra clave indica cuántas veces exactas se repite el mismo movimiento.',
  },
  Condicionales: {
    evaluates: 'Evalúa cómo respondes ante cambios o obstáculos inesperados usando reglas «Si...».',
    thinkingTip: 'Elige la regla que reaccione justo cuando ocurre el evento (tocar la pared).',
  },
  Descomposición: {
    evaluates: 'Evalúa tu estrategia para dividir un proyecto grande en tareas pequeñas y manejables.',
    thinkingTip: 'Recuerda cómo trabajan los ingenieros: resuelven una pieza pequeña a la vez y luego las integran.',
  },
};

export const TEACHER_PEDAGOGICAL_GUIDES = [
  {
    id: 'risk-avg',
    title: '¿Cómo interpretar la alerta de Riesgo Pedagógico (AVG < 3.0)?',
    summary: 'Identifica a tiempo qué estudiantes necesitan andamiaje individual.',
    body: 'La consulta SQL agrupa las entregas evaluadas por estudiante en escala 1.0 a 5.0 (equivalente a < 60 %). Un estudiante en alerta suele haber entendido la sintaxis básica pero comete errores de conteo o condición. Asígnale una misión de nivel «Inicio» en esa habilidad antes de subir a código escrito.',
  },
  {
    id: 'high-retries',
    title: 'Estrategia cuando sube la Tasa de Reintentos en una misión',
    summary: 'Aprovecha la señal de reintentos para activar sesiones de depuración guiada.',
    body: 'Si un reto promedia más de 3 intentos, proyecta la misión en el tablero y pide al grupo usar el botón «Paso a paso». Hacer visible el punto exacto donde el robot gira mal convierte la frustración en descubrimiento científico.',
  },
  {
    id: 'blocks-to-text',
    title: 'Transición recomendada de Blockly a Python, HTML5 y JavaScript',
    summary: 'Secuencia didáctica progresiva para grupos 5° A y 6° B.',
    body: 'Asegura primero dominio en Secuencias y Bucles con bloques visuales. Luego introduce las 3 primeras etapas de Python (mismas acciones del robot en texto) antes de pasar a funciones con listas, Ciudadela HTML5 y Neo-Tokio JavaScript.',
  },
];

export const LANDING_FAQ_PEDAGOGY = [
  {
    id: 'ages',
    question: '¿Se necesita experiencia previa para empezar en CodeKids?',
    answer:
      'No. La Fase 1 comienza con bloques magnéticos en español inspirados en puzzles lógicos, eliminando errores de teclado mientras el estudiante asimila secuencias, ciclos y decisiones.',
  },
  {
    id: 'progression',
    question: '¿Cómo pasan los estudiantes de bloques visuales a código real?',
    answer:
      'El Laboratorio de Python reutiliza en sus primeras 3 etapas el mismo tablero de Pipo que el alumno ya conoce en bloques (avanzar() en lugar del bloque azul), creando un puente cognitivo natural hacia funciones, HTML5 y JavaScript.',
  },
  {
    id: 'offline-ai',
    question: '¿Qué aporta el Tutor IA (Ollama) y qué ocurre si no hay conexión?',
    answer:
      'El tutor recomienda rutas personalizadas por falencia, genera propuestas de refuerzo para el docente y da mensajes de aliento en cada intento. Si el modelo local no está disponible, un motor pedagógico determinista mantiene todas las recomendaciones activas sin interrupciones.',
  },
  {
    id: 'teacher-control',
    question: '¿Cómo supervisan y evalúan los docentes a cada curso?',
    answer:
      'La Consola Docente permite crear cursos, matricular estudiantes registrados, publicar retos de Blockly/Python/HTML5/JS, calificar entregas con evidencia de código y consultar informes SQL analíticos en 3FN.',
  },
];
