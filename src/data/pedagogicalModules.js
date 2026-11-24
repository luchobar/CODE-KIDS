/**
 * Catálogo pedagógico centralizado por habilidad y tecnología para micro-aprendizaje en CodeKids.
 */
export const PEDAGOGICAL_MODULES = {
  Secuencias: {
    skill: 'Secuencias',
    title: 'Secuencias Lógicas y Orden de Ejecución',
    tagline: 'Todo algoritmo empieza ordenando pasos precisos de principio a fin.',
    levelBadge: 'Nivel 1 · Fundamentos',
    estimatedMinutes: 10,
    recommendedMissionId: 'sequence-forest',
    whatIs:
      'Una secuencia es una lista ordenada de instrucciones que la computadora o el robot ejecuta una tras otra, exactamente en el orden en que las escribiste.',
    whyImportant:
      'Las máquinas no adivinan intenciones: si inviertes dos pasos (como girar antes de avanzar), el resultado cambia por completo. Ordenar bien evita el 80 % de errores iniciales.',
    realWorld:
      'Una receta de cocina, las indicaciones de un GPS calle por calle o los pasos automáticos de un semáforo siguen una secuencia estricta.',
    keyConcepts: [
      { term: 'Instrucción atómica', definition: 'Una sola acción clara e indivisible, como avanzar una casilla o girar 90°.' },
      { term: 'Flujo secuencial', definition: 'Ejecución de arriba hacia abajo sin saltar ninguna línea o bloque.' },
      { term: 'Orientación relativa', definition: 'Girar cambia hacia dónde mira el robot, pero no lo mueve de casilla.' },
    ],
    studyTips: [
      'Simula el recorrido con el dedo sobre la cuadrícula antes de arrastrar tu primer bloque.',
      'Recuerda la regla clave: girar a la derecha o izquierda cambia el rumbo en la misma casilla.',
      'Usa la ejecución «Paso a paso» si Pipo termina en un lugar distinto al esperado.',
    ],
    commonMistakes: [
      { mistake: 'Colocar «girar» pensando que también avanza una casilla.', fix: 'Añade siempre un bloque «avanzar» después del giro para desplazarte.' },
      { mistake: 'Agregar pasos extra al final cuando el robot ya estaba sobre la estrella.', fix: 'Cuenta los espacios entre celdas, no el total de casillas visuales.' },
    ],
    steps: [
      { stepTitle: '1. Observa posición y dirección inicial', snippet: 'Pos: (1, 3) · Mirando Norte ↑', explanation: 'Identifica hacia dónde apunta la flecha de Pipo respecto a la estrella.' },
      { stepTitle: '2. Traza el primer tramo recto', snippet: 'avanzar(1) → avanzar(1)', explanation: 'Encadena movimientos rectos hasta alinearte con el eje de giro necesario.' },
      { stepTitle: '3. Orienta y completa la ruta', snippet: 'girar_derecha() → avanzar(2)', explanation: 'Gira hacia la meta y verifica que la última casilla coincida con la estrella.' },
    ],
  },
  Bucles: {
    skill: 'Bucles',
    title: 'Bucles e Iteración Inteligente',
    tagline: 'Detecta patrones repetitivos y reduce 10 bloques en uno solo.',
    levelBadge: 'Nivel 2 · Patrones',
    estimatedMinutes: 12,
    recommendedMissionId: 'loop-bridge',
    whatIs:
      'Un bucle (o ciclo) es una estructura que repite automáticamente un grupo de instrucciones un número determinado de veces sin tener que reescribirlas.',
    whyImportant:
      'Escribir el mismo comando decenas de veces hace el código lento de leer y fácil de romper. Los bucles permiten escalar una solución a cualquier tamaño.',
    realWorld:
      'Enviar una notificación a cada estudiante de un curso, animar fotogramas en un videojuego o revisar cada sensor de un robot cada segundo.',
    keyConcepts: [
      { term: 'Patrón repetitivo', definition: 'Grupo de 1 o más acciones idénticas que ocurren en secuencia (ej. avanzar + girar).' },
      { term: 'Contador de iteraciones', definition: 'Número exacto de repeticiones que ejecutará el cuerpo del bucle.' },
      { term: 'Cuerpo del bucle', definition: 'Los bloques o líneas indentadas que van dentro del bloque «repetir» o «for».' },
    ],
    studyTips: [
      'Subraya qué bloque o pareja de bloques se repite sin cambios a lo largo del camino.',
      'Si el giro solo ocurre después de cruzar todo un puente, déjalo fuera del bucle.',
      'Prueba primero con 1 ciclo visual antes de multiplicar a 3 o 4 repeticiones.',
    ],
    commonMistakes: [
      { mistake: 'Meter el giro final dentro del bloque repetir cuando solo debía girar una vez.', fix: 'Coloca dentro del bucle únicamente las acciones que se repiten en cada paso.' },
      { mistake: 'Contar una repetición de más (error off-by-one) y salirse del tablero.', fix: 'Resta la casilla inicial: para ir de columna 1 a 3 solo avanzas 2 veces.' },
    ],
    steps: [
      { stepTitle: '1. Identifica la secuencia larga', snippet: 'avanzar() + avanzar() + avanzar()', explanation: 'Observa si hay acciones idénticas consecutivas o escalones iguales.' },
      { stepTitle: '2. Encapsula el núcleo en el bucle', snippet: 'repetir 3 veces: [ avanzar() ]', explanation: 'Coloca el movimiento dentro del bloque «repetir» indicando cuántas veces.' },
      { stepTitle: '3. Agrega acciones únicas al salir', snippet: 'repetir 2 veces [avanzar] → girar()', explanation: 'Cualquier giro o paso final único va debajo y fuera del bucle.' },
    ],
  },
  Condicionales: {
    skill: 'Condicionales',
    title: 'Condicionales y Toma de Decisiones',
    tagline: 'Enseña a tu programa a observar su entorno antes de actuar.',
    levelBadge: 'Nivel 3 · Sensores',
    estimatedMinutes: 15,
    recommendedMissionId: 'condition-detour',
    whatIs:
      'Una sentencia condicional («si ... entonces») evalúa si una pregunta lógica es verdadera o falsa antes de decidir si ejecuta un bloque de código.',
    whyImportant:
      'Sin condicionales, los programas siempre hacen exactamente lo mismo. Con sensores y condiciones, el software reacciona a obstáculos, usuarios y datos cambiantes.',
    realWorld:
      'Un robot aspiradora que gira al detectar una pared, una app que muestra error si falta la contraseña o un semáforo inteligente según el tráfico.',
    keyConcepts: [
      { term: 'Condición booleana', definition: 'Una pregunta cuya única respuesta posible es Verdadero (sí) o Falso (no).' },
      { term: 'Sensor frontal', definition: 'Evaluación en tiempo real de la casilla inmediatamente delante de Pipo.' },
      { term: 'Desvío preventivo', definition: 'Instrucción de giro ejecutada únicamente cuando el camino está bloqueado.' },
    ],
    studyTips: [
      'Coloca «si hay pared» justo antes de intentar avanzar hacia una celda sospechosa.',
      'Pregúntate siempre: «¿qué pasaría si aquí NO hubiera pared?» antes de confirmar el bloque.',
      'Combina el sensor con pasos de rodeo para recuperar la línea hacia la estrella.',
    ],
    commonMistakes: [
      { mistake: 'Usar el sensor lejos del muro, cuando delante del robot todavía está libre.', fix: 'Verifica el muro en el paso exacto en que la casilla siguiente tiene el obstáculo.' },
      { mistake: 'Girar hacia el lado incorrecto dentro del bloque condicional.', fix: 'Imagina la vista en primera persona de Pipo para distinguir su derecha de su izquierda.' },
    ],
    steps: [
      { stepTitle: '1. Acércate o apunta al posible muro', snippet: 'if hay_pared():', explanation: 'El sensor revisa únicamente la casilla justo frente al robot.' },
      { stepTitle: '2. Define la reacción segura', snippet: '  girar_derecha()', explanation: 'Dentro de «si hay pared», gira hacia la ruta que sí está despejada.' },
      { stepTitle: '3. Retoma el avance fuera del sensor', snippet: 'avanzar() → continuar ruta', explanation: 'Una vez orientado al camino libre, avanza para bordear el obstáculo.' },
    ],
  },
  Funciones: {
    skill: 'Funciones',
    title: 'Funciones, Modularidad y Depuración',
    tagline: 'Divide retos complejos, encuentra fallos y reutiliza subrutinas limpias.',
    levelBadge: 'Nivel 4 · Ingeniería',
    estimatedMinutes: 15,
    recommendedMissionId: 'debug-sequence',
    whatIs:
      'La modularidad consiste en empaquetar un grupo de pasos con un propósito claro (función), mientras que la depuración es el arte metódico de detectar y reparar errores.',
    whyImportant:
      'En proyectos reales nadie reescribe todo desde cero ante un fallo: aíslas el módulo defectuoso, entiendes por qué falló y lo reparas de forma quirúrgica.',
    realWorld:
      'Un botón de «Guardar» reutilizado en toda una app, módulos de pago verificados de forma independiente o diagnósticos en satélites espaciales.',
    keyConcepts: [
      { term: 'Bug (Fallo lógico)', definition: 'Comportamiento inesperado provocado por un orden incorrecto, un giro invertido o un conteo corto.' },
      { term: 'Ejecución paso a paso', definition: 'Técnica para pausar el programa instrucción por instrucción hasta hallar la línea exacta del desvío.' },
      { term: 'Subrutina reutilizable', definition: 'Bloque con nombre propio que resuelve una subtarea específica sin repetir lógica.' },
    ],
    studyTips: [
      'No borres todos los bloques de una vez: ejecuta primero y anota en qué paso exacto Pipo se desvía.',
      'Cambia una sola cosa cada vez y vuelve a probar para confirmar el efecto.',
      'En misiones de depuración, revisa el número dentro del bucle y la dirección de los giros.',
    ],
    commonMistakes: [
      { mistake: 'Reemplazar todo el programa cuando solo fallaba el último giro.', fix: 'Usa «Paso a paso» e inspecciona el monitor del bloque activo.' },
      { mistake: 'Dejar bloques huérfanos desconectados en el editor.', fix: 'Mantén únicamente la cadena principal conectada desde la primera instrucción.' },
    ],
    steps: [
      { stepTitle: '1. Reproduce el fallo original', snippet: 'Ejecutar «Probar» / «Paso a paso»', explanation: 'Observa sin miedo hasta qué coordenada llega el programa defectuoso.' },
      { stepTitle: '2. Aísla el bloque o parámetro culpable', snippet: 'Detectado: girar_izquierda vs derecha', explanation: 'Compara lo que hizo Pipo en el paso que falló contra lo que debía hacer.' },
      { stepTitle: '3. Aplica la corrección mínima y valida', snippet: 'Corregir parámetro → Reejecutar', explanation: 'Valida que toda la cadena ahora alcanza la estrella limpiamente.' },
    ],
  },
  Python: {
    skill: 'Python',
    title: 'Laboratorio de Código Python',
    tagline: 'Da el salto de bloques visuales a sintaxis escrita clara y profesional.',
    levelBadge: 'Lenguaje Real · Python',
    estimatedMinutes: 18,
    recommendedMissionId: 'python-sequence',
    whatIs:
      'Python es uno de los lenguajes de programación más usados en el mundo por su sintaxis legible, ideal para automatización, ciencia de datos, inteligencia artificial y robótica.',
    whyImportant:
      'Dominar llamadas a funciones, bucles «for», condicionales «if», listas y diccionarios en Python te abre las puertas a crear software real más allá de entornos visuales.',
    realWorld:
      'Motores de recomendación en plataformas educativas, análisis científico de datos espaciales, backends web y scripts de IA como el tutor de CodeKids.',
    keyConcepts: [
      { term: 'Paréntesis () en funciones', definition: 'En Python, escribir avanzar() ejecuta la acción; sin paréntesis no se invoca.' },
      { term: 'Indentación (4 espacios)', definition: 'Los bloques dentro de for, if o def se agrupan usando sangría consistente.' },
      { term: 'Estructuras return / list / dict', definition: 'Las funciones avanzadas devuelven valores filtrados o transformados con return.' },
    ],
    studyTips: [
      'Verifica siempre los dos puntos (:) al final de líneas con «for», «if» o «def».',
      'Usa los atajos del teclado rápido en móvil para insertar sangrías de 4 espacios sin errores.',
      'Si resuelves funciones avanzadas, devuelve (return) el dato pedido en vez de solo imprimirlo.',
    ],
    commonMistakes: [
      { mistake: 'Olvidar los dos puntos (:) o mezclar distinta cantidad de espacios en la sangría.', fix: 'Usa la tecla Tab o el chip «4 esp» para alinear cada línea dentro de for/if/def.' },
      { mistake: 'Escribir «avanzar» sin paréntesis «()».', fix: 'Toda llamada a función o método requiere abrir y cerrar paréntesis.' },
    ],
    steps: [
      { stepTitle: '1. Llama instrucciones con paréntesis', snippet: 'avanzar()\ngirar_derecha()', explanation: 'Cada instrucción va en su propia línea en minúsculas exactas.' },
      { stepTitle: '2. Usa ciclos for con range() e indentación', snippet: 'for paso in range(2):\n    avanzar()', explanation: 'Respeta los dos puntos y 4 espacios en la línea subordinada.' },
      { stepTitle: '3. Construye funciones verificables', snippet: 'def protocolo(datos):\n    return resultado', explanation: 'En etapas avanzadas, valida cada caso de prueba automático.' },
    ],
  },
  HTML5: {
    skill: 'HTML5',
    title: 'Ciudadela HTML · Maquetación Web Semántica',
    tagline: 'Estructura títulos, listas, tarjetas e interfaces reales en tiempo real.',
    levelBadge: 'Lenguaje Real · Web',
    estimatedMinutes: 15,
    recommendedMissionId: 'html-faro-holografico',
    whatIs:
      'HTML5 (HyperText Markup Language) es el lenguaje de etiquetas que define la estructura, jerarquía y significado del contenido de toda página o aplicación web.',
    whyImportant:
      'Sin una estructura HTML limpia y semántica, los navegadores, buscadores y lectores de pantalla no comprenden qué parte es un título, un botón, una lista o una alerta.',
    realWorld:
      'Todas las interfaces que usas a diario —portales escolares, paneles médicos, reproductores multimedia y esta misma plataforma— se dibujan sobre HTML5.',
    keyConcepts: [
      { term: 'Etiqueta de apertura y cierre', definition: 'La mayoría de elementos envuelven contenido entre <etiqueta> y </etiqueta>.' },
      { term: 'Semántica web', definition: 'Elegir <h1>, <main>, <article> o <ul> según su significado, no solo por apariencia.' },
      { term: 'Atributos HTML', definition: 'Propiedades dentro de la etiqueta de apertura, como class="..." o id="...".' },
    ],
    studyTips: [
      'Asegúrate de cerrar siempre cada etiqueta abierta en orden inverso al que la abriste.',
      'Respeta un solo <h1> principal para el título del holograma antes de usar <h2> o <p>.',
      'Usa el visor holográfico para ver al instante cómo tu código cobra forma visual.',
    ],
    commonMistakes: [
      { mistake: 'Olvidar la barra «/» en la etiqueta de cierre (<p>Texto<p>).', fix: 'Cierra correctamente con </p> para evitar que las etiquetas se aniden mal.' },
      { mistake: 'Colocar texto fuera de las etiquetas pedidas por el validador DOM.', fix: 'Revisa los checks de validación debajo del visor holográfico tras proyectar.' },
    ],
    steps: [
      { stepTitle: '1. Crea el contenedor principal', snippet: '<section class="faro">...</section>', explanation: 'Agrupa los elementos de la misión dentro de una estructura clara.' },
      { stepTitle: '2. Añade jerarquía de título y texto', snippet: '<h1>Faro Activo</h1>\n<p>Señal lista</p>', explanation: 'Usa encabezados semánticos y párrafos descriptivos.' },
      { stepTitle: '3. Completa listas o elementos interactivos', snippet: '<ul><li>Sector 1</li></ul>', explanation: 'Proyecta el holograma y comprueba que todos los checks aparezcan en verde.' },
    ],
  },
  JavaScript: {
    skill: 'JavaScript',
    title: 'Neo-Tokio JS · Lógica Programable Web',
    tagline: 'Da vida y comportamiento inteligente a drones, sistemas y aplicaciones.',
    levelBadge: 'Lenguaje Real · Web Lógica',
    estimatedMinutes: 18,
    recommendedMissionId: 'js-neones-shibuya',
    whatIs:
      'JavaScript es el lenguaje de programación de la web moderna: permite calcular datos, transformar listas, validar formularios y controlar lógica dinámica.',
    whyImportant:
      'Mientras HTML aporta la estructura, JavaScript da el cerebro interactivo: toma decisiones en milisegundos en el navegador y también en servidores con Node.js.',
    realWorld:
      'Videojuegos en navegador, aplicaciones React como CodeKids, sensores IoT en tiempo real y telemetría de drones autónomos.',
    keyConcepts: [
      { term: 'return explícito', definition: 'Indica exactamente qué resultado entrega tu función al sistema de pruebas.' },
      { term: 'const y let', definition: 'Usa const para valores fijos y let únicamente cuando una variable cambiará.' },
      { term: 'Arreglos y condiciones', definition: 'Recorre elementos (.filter, .map o for) y decide con operadores === y &&.' },
    ],
    studyTips: [
      'Compara siempre con igualdad estricta (===) para evitar sorpresas entre texto y números.',
      'Lee con atención la columna «Entrada → Tu salida vs Esperado» en la consola de Neo-Tokio.',
      'Retorna el valor calculado con return en lugar de imprimirlo únicamente en pantalla.',
    ],
    commonMistakes: [
      { mistake: 'Asignar con un solo signo «=» dentro de un «if (x = 5)» en vez de comparar «===».', fix: 'Usa «===» para preguntar si dos valores son iguales.' },
      { mistake: 'Olvidar la sentencia return al final de la función evaluada.', fix: 'Asegúrate de que cada ruta posible de la función devuelva el tipo esperado.' },
    ],
    steps: [
      { stepTitle: '1. Inspecciona los parámetros recibidos', snippet: 'function activarSector(nivel) { ... }', explanation: 'Identifica qué tipo de dato (número, texto o lista) recibe tu función.' },
      { stepTitle: '2. Aplica la regla o filtrado lógico', snippet: 'if (nivel >= 50) return "ALTO";', explanation: 'Evalúa condiciones claras y cubre los casos límite.' },
      { stepTitle: '3. Ejecuta las pruebas unitarias', snippet: 'Entrada -> Tu salida === Esperado', explanation: 'Verifica que todos los escenarios del panel Neo-Tokio queden en verde.' },
    ],
  },
  Descomposición: {
    skill: 'Descomposición',
    title: 'Descomposición de Problemas Complejos',
    tagline: 'Divide cualquier reto grande en piezas pequeñas fáciles de resolver.',
    levelBadge: 'Estrategia Transversal',
    estimatedMinutes: 10,
    recommendedMissionId: 'sequence-city',
    whatIs:
      'La descomposición es la capacidad de dividir un problema grande o intimidante en subproblemas pequeños, ordenados e independientes.',
    whyImportant:
      'Los grandes programas no se escriben de un solo tirón. Dividir un mapa largo en 3 tramos o un juego en tablero, reglas y puntaje reduce la frustración a cero.',
    realWorld:
      'Organizar una presentación escolar en inicio/desarrollo/cierre o dividir un satélite en sistema de energía, navegación y comunicaciones.',
    keyConcepts: [
      { term: 'Subproblema', definition: 'Una parte manejable del reto total que puedes resolver y probar por separado.' },
      { term: 'Hito intermedio', definition: 'Un punto de control visual (como llegar a la esquina) antes de apuntar a la meta.' },
      { term: 'Composición', definition: 'Unir las piezas pequeñas probadas para completar el objetivo global.' },
    ],
    studyTips: [
      'Cuando veas un obstáculo en medio del mapa, divide la ruta en «antes del rodeo» y «después del rodeo».',
      'Prueba tu solución por partes: valida el primer giro antes de programar el final.',
      'Pon nombres simples a cada parte de tu plan en voz alta.',
    ],
    commonMistakes: [
      { mistake: 'Intentar memorizar 12 movimientos seguidos de golpe.', fix: 'Resuelve los primeros 3 pasos, pruébalos en el simulador y continúa desde allí.' },
      { mistake: 'Cambiar múltiples bloques al mismo tiempo sin saber cuál causó la mejora.', fix: 'Avanza subtarea por subtarea verificando cada avance.' },
    ],
    steps: [
      { stepTitle: '1. Parte el mapa en tramos simples', snippet: 'Tramo A: cruzar hasta esquina → Tramo B: subir', explanation: 'Visualiza 2 o 3 metas intermedias en el tablero.' },
      { stepTitle: '2. Resuelve y prueba solo el Tramo A', snippet: 'Probar avance parcial', explanation: 'Confirma en el simulador que Pipo queda en la esquina deseada.' },
      { stepTitle: '3. Conecta el Tramo B hacia la estrella', snippet: 'Tramo A + Tramo B = Meta', explanation: 'Une ambos segmentos y celebra la solución modular.' },
    ],
  },
};

export const PEDAGOGICAL_MODULE_LIST = Object.values(PEDAGOGICAL_MODULES);

/**
 * Devuelve el módulo pedagógico correspondiente a una habilidad o categoría.
 * Mapea alias como «Depuración» hacia «Funciones» para evitar respuestas vacías.
 * @param {string} skillOrCategory
 */
export function getPedagogicalModule(skillOrCategory) {
  if (!skillOrCategory) return PEDAGOGICAL_MODULES.Secuencias;
  const clean = String(skillOrCategory).trim();
  if (PEDAGOGICAL_MODULES[clean]) return PEDAGOGICAL_MODULES[clean];
  if (clean.toLowerCase().includes('depur')) return PEDAGOGICAL_MODULES.Funciones;
  if (clean.toLowerCase().includes('python')) return PEDAGOGICAL_MODULES.Python;
  if (clean.toLowerCase().includes('html')) return PEDAGOGICAL_MODULES.HTML5;
  if (clean.toLowerCase().includes('java')) return PEDAGOGICAL_MODULES.JavaScript;
  return PEDAGOGICAL_MODULES.Secuencias;
}
