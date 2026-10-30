-- =============================================================================
-- CODEKIDS — Migración Transaccional de Expansión Multilenguaje (No Destructiva)
-- Compatible con la BD actual de Supabase (codekids_schema_and_seed.sql)
-- Preserva usuarios, perfiles_gamificacion, avatares, aulas y progreso actual.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 0. Respaldo para instalaciones limpias (no altera tablas si ya existen)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mundos (
    id VARCHAR(40) PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    orden_mundo SMALLINT UNIQUE CHECK (orden_mundo > 0),
    tematica_habilidad VARCHAR(40) NOT NULL DEFAULT 'Python',
    titulo VARCHAR(120) NOT NULL,
    subtitulo VARCHAR(240) NOT NULL DEFAULT '',
    tono_color VARCHAR(24) NOT NULL DEFAULT 'forest',
    url_imagen_banner VARCHAR(255) NOT NULL DEFAULT '/images/python-lab.png',
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS misiones (
    id VARCHAR(50) PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    mundo_id VARCHAR(40) NOT NULL REFERENCES mundos(id) ON DELETE CASCADE,
    orden_etapa SMALLINT NOT NULL DEFAULT 1,
    nivel_dificultad VARCHAR(30) NOT NULL DEFAULT 'Laboratorio',
    plantilla_id VARCHAR(40) NOT NULL DEFAULT 'python-script',
    nombre_corto VARCHAR(80) NOT NULL DEFAULT '',
    titulo_ejercicio VARCHAR(120) NOT NULL DEFAULT '',
    descripcion VARCHAR(240) NOT NULL DEFAULT '',
    instrucciones TEXT NOT NULL DEFAULT '',
    bloque_requerido VARCHAR(40) NULL,
    configuracion_tablero JSONB NOT NULL DEFAULT '{}'::jsonb,
    programa_semilla JSONB NOT NULL DEFAULT '[]'::jsonb,
    recompensa_xp INTEGER NOT NULL DEFAULT 10 CHECK (recompensa_xp >= 0),
    recompensa_monedas INTEGER NOT NULL DEFAULT 10 CHECK (recompensa_monedas >= 0)
);

-- -----------------------------------------------------------------------------
-- 1. Evolución de esquema (ALTER TABLE idempotente) sobre mundos y misiones
-- -----------------------------------------------------------------------------
ALTER TABLE mundos
    ALTER COLUMN id SET DEFAULT (gen_random_uuid()::text),
    ALTER COLUMN subtitulo SET DEFAULT '',
    ALTER COLUMN url_imagen_banner SET DEFAULT '/images/python-lab.png',
    ADD COLUMN IF NOT EXISTS slug TEXT,
    ADD COLUMN IF NOT EXISTS descripcion TEXT,
    ADD COLUMN IF NOT EXISTS tecnologia VARCHAR(40),
    ADD COLUMN IF NOT EXISTS orden INTEGER,
    ADD COLUMN IF NOT EXISTS icono VARCHAR(40) DEFAULT 'Compass';

ALTER TABLE misiones
    ALTER COLUMN id SET DEFAULT (gen_random_uuid()::text),
    ALTER COLUMN configuracion_tablero SET DEFAULT '{}'::jsonb,
    ALTER COLUMN nombre_corto SET DEFAULT '',
    ALTER COLUMN titulo_ejercicio SET DEFAULT '',
    ALTER COLUMN descripcion SET DEFAULT '',
    ALTER COLUMN instrucciones SET DEFAULT '',
    ADD COLUMN IF NOT EXISTS slug TEXT,
    ADD COLUMN IF NOT EXISTS titulo TEXT,
    ADD COLUMN IF NOT EXISTS contexto_narrativo TEXT,
    ADD COLUMN IF NOT EXISTS instrucciones_md TEXT,
    ADD COLUMN IF NOT EXISTS codigo_inicial TEXT,
    ADD COLUMN IF NOT EXISTS codigo_solucion TEXT,
    ADD COLUMN IF NOT EXISTS reglas_validacion JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS pistas JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS xp_recompensa INTEGER,
    ADD COLUMN IF NOT EXISTS monedas_recompensa INTEGER,
    ADD COLUMN IF NOT EXISTS orden INTEGER;

-- Ampliar restricciones CHECK para admitir Python, HTML5 y JavaScript
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'mundos'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%tematica_habilidad%'
    LOOP
        EXECUTE 'ALTER TABLE mundos DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;

    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'misiones'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%plantilla_id%'
    LOOP
        EXECUTE 'ALTER TABLE misiones DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE mundos
    ADD CONSTRAINT mundos_tematica_habilidad_check
    CHECK (tematica_habilidad IN ('Secuencias', 'Bucles', 'Condicionales', 'Funciones', 'Python', 'HTML5', 'JavaScript'));

ALTER TABLE misiones
    ADD CONSTRAINT misiones_plantilla_id_check
    CHECK (plantilla_id IN ('sequence-order', 'loop-count', 'if-choice', 'python-script', 'html-markup', 'javascript-script'));

-- Homologar slugs y metadatos en los 4 mundos Blockly existentes (si están presentes)
UPDATE mundos SET
    slug = CASE id
        WHEN 'mundo-bosque'    THEN 'bosque-secuencias'
        WHEN 'mundo-isla'      THEN 'isla-bucles'
        WHEN 'mundo-cueva'     THEN 'cueva-decisiones'
        WHEN 'mundo-funciones' THEN 'estacion-funciones'
        ELSE COALESCE(slug, id)
    END,
    descripcion = COALESCE(descripcion, subtitulo),
    tecnologia  = COALESCE(tecnologia, 'Blockly'),
    orden       = COALESCE(orden, orden_mundo),
    icono       = CASE id
        WHEN 'mundo-bosque'    THEN 'Compass'
        WHEN 'mundo-isla'      THEN 'SlidersHorizontal'
        WHEN 'mundo-cueva'     THEN 'Wall'
        WHEN 'mundo-funciones' THEN 'Cpu'
        ELSE COALESCE(icono, 'Compass')
    END
WHERE slug IS NULL;

-- Homologar slugs y recompensas en las 12 misiones Blockly existentes
UPDATE misiones SET
    slug               = COALESCE(slug, id),
    titulo             = COALESCE(titulo, titulo_ejercicio),
    contexto_narrativo = COALESCE(contexto_narrativo, descripcion),
    instrucciones_md   = COALESCE(instrucciones_md, instrucciones),
    xp_recompensa      = COALESCE(xp_recompensa, recompensa_xp),
    monedas_recompensa = COALESCE(monedas_recompensa, recompensa_monedas),
    orden              = COALESCE(orden, orden_etapa)
WHERE slug IS NULL;

-- Índices UNIQUE sobre slug requeridos para ON CONFLICT (slug)
CREATE UNIQUE INDEX IF NOT EXISTS uq_mundos_slug ON mundos (slug);
CREATE UNIQUE INDEX IF NOT EXISTS uq_misiones_slug ON misiones (slug);

-- =============================================================================
-- 2. UPSERT DE MUNDOS (Laboratorio Python + Ciudadela HTML + Neo-Tokio JS)
-- =============================================================================
INSERT INTO mundos (
    id, titulo, slug, descripcion, tecnologia, orden, icono,
    orden_mundo, tematica_habilidad, subtitulo, tono_color, url_imagen_banner, activo
)
VALUES
    (
        gen_random_uuid()::text,
        'Laboratorio de Código Python',
        'laboratorio-python',
        'Domina desde secuencias tácticas hasta funciones modulares, filtrado de listas y diccionarios estelares en la estación orbital.',
        'Python',
        5,
        'TerminalWindow',
        5,
        'Python',
        'De los bloques a funciones, listas y diccionarios en Python',
        'forest',
        '/images/python-lab.png',
        TRUE
    ),
    (
        gen_random_uuid()::text,
        'Ciudadela HTML',
        'ciudadela-html',
        'Reconstruye los faros holográficos y portales de una metrópolis flotante ensamblando etiquetas semánticas de la web.',
        'HTML5',
        6,
        'FileHtml',
        6,
        'HTML5',
        'Construye interfaces y faros holográficos con etiquetas HTML5',
        'island',
        '/images/world-island.png',
        TRUE
    ),
    (
        gen_random_uuid()::text,
        'Neo-Tokio JavaScript',
        'neo-tokio-javascript',
        'Da energía reactiva a rascacielos de neón y programa drones autónomos con variables dinámicas, funciones y lógica en tiempo real.',
        'JavaScript',
        7,
        'FileJs',
        7,
        'JavaScript',
        'Ilumina distritos ciberpunk y controla drones con JavaScript',
        'cave',
        '/images/world-cave.png',
        TRUE
    )
ON CONFLICT (slug) DO UPDATE SET
    titulo             = EXCLUDED.titulo,
    descripcion        = EXCLUDED.descripcion,
    tecnologia         = EXCLUDED.tecnologia,
    orden              = EXCLUDED.orden,
    icono              = EXCLUDED.icono,
    tematica_habilidad = EXCLUDED.tematica_habilidad,
    subtitulo          = EXCLUDED.subtitulo,
    tono_color         = EXCLUDED.tono_color,
    url_imagen_banner  = EXCLUDED.url_imagen_banner,
    activo             = TRUE;

-- =============================================================================
-- 3. MISIONES BASE (1-3) + 3 NUEVAS MISIONES AVANZADAS (4-6) EN PYTHON
--    (Siempre resolviendo mundo_id vía subconsulta por slug)
-- =============================================================================

-- Etapas base 1-3 del Laboratorio Python (para registrar progreso con FK válida)
INSERT INTO misiones (
    id, mundo_id, titulo, slug, contexto_narrativo, instrucciones_md,
    codigo_inicial, codigo_solucion, reglas_validacion, pistas,
    xp_recompensa, monedas_recompensa, orden,
    orden_etapa, nivel_dificultad, plantilla_id, nombre_corto, titulo_ejercicio,
    descripcion, instrucciones, configuracion_tablero, recompensa_xp, recompensa_monedas
)
VALUES
    (
        'python-sequence',
        (SELECT id FROM mundos WHERE slug = 'laboratorio-python'),
        'Secuencia en el bosque',
        'python-sequence',
        'Python interpreta las instrucciones del robot línea por línea, de arriba hacia abajo.',
        'Completa la secuencia de llamadas `avanzar()` y `girar_derecha()` para llevar al robot hasta la estrella.',
        E'avanzar()\navanzar()\ngirar_derecha()\navanzar()\n# Agrega la instrucción final',
        E'avanzar()\navanzar()\ngirar_derecha()\navanzar()\navanzar()',
        '{"motor":"python-grid","objetivo":{"x":2,"y":0}}'::jsonb,
        '[{"nivel":1,"texto":"avanzar() desplaza al robot una casilla hacia adelante."},{"nivel":2,"texto":"El robot comienza orientado hacia arriba."},{"nivel":3,"texto":"Añade avanzar() después del giro a la derecha."}]'::jsonb,
        15, 10, 1,
        1, 'Inicio', 'python-script', 'Secuencia Python', 'Secuencia en el bosque',
        'Completa la ruta del robot en sintaxis Python.', 'Añade la instrucción final para alcanzar la meta.',
        '{"start":{"x":0,"y":2,"direction":0},"goal":{"x":2,"y":0},"wall":null}'::jsonb, 15, 10
    ),
    (
        'python-loop',
        (SELECT id FROM mundos WHERE slug = 'laboratorio-python'),
        'Iteración sobre el puente',
        'python-loop',
        'Un bucle `for` repite un bloque indentado con cuatro espacios tantas veces como indique `range()`.',
        'Ajusta el parámetro de `range()` para que el robot cruce el puente hasta la estrella.',
        E'for paso in range(1):\n    avanzar()',
        E'for paso in range(2):\n    avanzar()',
        '{"motor":"python-grid","estructura_requerida":"for","objetivo":{"x":2,"y":2}}'::jsonb,
        '[{"nivel":1,"texto":"La línea dentro del bucle for lleva cuatro espacios de sangría."},{"nivel":2,"texto":"Cuenta las casillas entre la posición inicial y la meta."},{"nivel":3,"texto":"Actualiza el número dentro de range(2)."}]'::jsonb,
        20, 15, 2,
        2, 'En camino', 'python-script', 'Bucle Python', 'Iteración sobre el puente',
        'Usa for y range() para cruzar el puente.', 'Ajusta range() para avanzar dos casillas.',
        '{"start":{"x":0,"y":2,"direction":1},"goal":{"x":2,"y":2},"wall":null}'::jsonb, 20, 15
    ),
    (
        'python-condition',
        (SELECT id FROM mundos WHERE slug = 'laboratorio-python'),
        'Desvío condicional',
        'python-condition',
        'La sentencia `if hay_pared():` evalúa el sensor frontal del robot antes de decidir el giro.',
        'Corrige el giro dentro del bloque `if hay_pared():` para rodear el obstáculo sin chocar.',
        E'if hay_pared():\n    girar_izquierda()\navanzar()\navanzar()\ngirar_izquierda()\navanzar()\navanzar()\ngirar_izquierda()\navanzar()\navanzar()',
        E'if hay_pared():\n    girar_derecha()\navanzar()\navanzar()\ngirar_izquierda()\navanzar()\navanzar()\ngirar_izquierda()\navanzar()\navanzar()',
        '{"motor":"python-grid","estructura_requerida":"if","objetivo":{"x":2,"y":0}}'::jsonb,
        '[{"nivel":1,"texto":"hay_pared() devuelve verdadero cuando la siguiente casilla está bloqueada."},{"nivel":2,"texto":"El giro dentro del bloque if debe orientar al robot hacia abajo."},{"nivel":3,"texto":"Reemplaza el primer girar_izquierda() por girar_derecha()."}]'::jsonb,
        25, 15, 3,
        3, 'Explorador', 'python-script', 'Condicional Python', 'Desvío condicional',
        'Evalúa hay_pared() para rodear el muro.', 'Cambia el giro inicial dentro de if hay_pared():.',
        '{"start":{"x":0,"y":0,"direction":1},"goal":{"x":2,"y":0},"wall":{"x":1,"y":0}}'::jsonb, 25, 15
    )
ON CONFLICT (slug) DO UPDATE SET
    mundo_id           = EXCLUDED.mundo_id,
    titulo             = EXCLUDED.titulo,
    contexto_narrativo = EXCLUDED.contexto_narrativo,
    instrucciones_md   = EXCLUDED.instrucciones_md,
    codigo_inicial     = EXCLUDED.codigo_inicial,
    codigo_solucion    = EXCLUDED.codigo_solucion,
    reglas_validacion  = EXCLUDED.reglas_validacion,
    pistas             = EXCLUDED.pistas,
    xp_recompensa      = EXCLUDED.xp_recompensa,
    monedas_recompensa = EXCLUDED.monedas_recompensa,
    orden              = EXCLUDED.orden,
    recompensa_xp      = EXCLUDED.recompensa_xp,
    recompensa_monedas = EXCLUDED.recompensa_monedas;

-- Nueva Misión Avanzada Python 1 (Orden 4): Funciones y límite de seguridad
INSERT INTO misiones (
    id, mundo_id, titulo, slug, contexto_narrativo, instrucciones_md,
    codigo_inicial, codigo_solucion, reglas_validacion, pistas,
    xp_recompensa, monedas_recompensa, orden,
    orden_etapa, nivel_dificultad, plantilla_id, nombre_corto, titulo_ejercicio,
    descripcion, instrucciones, recompensa_xp, recompensa_monedas
)
VALUES (
    gen_random_uuid()::text,
    (SELECT id FROM mundos WHERE slug = 'laboratorio-python'),
    'Protocolo Prisma: Escudo Cuántico Modular',
    'py-protocolo-escudo-cuantico',
    '¡Alerta en el puente orbital! Una lluvia de micrometeoritos se acerca a la estación. Prisma Orbital y Pipo necesitan un módulo reutilizable que calcule la potencia del escudo sin sobrecargar el reactor por encima del 100%.',
    $md$### 🛡️ Misión: Calibrar el Escudo Cuántico

Completa la función `calcular_escudo(energia_base, multiplicador)` siguiendo estas reglas:

1. Multiplica `energia_base` por `multiplicador` y guarda el resultado en una variable llamada `potencia`.
2. **Protección anti-sobrecarga:** Si `potencia` es mayor que `100`, la función debe devolver exactamente `100`.
3. En cualquier otro caso, devuelve el valor de `potencia`.

> 💡 **Recuerda:** En Python, todo el código dentro de `def` lleva **4 espacios** de sangría, y lo que va dentro de `if` lleva **8 espacios**.$md$,
    $code$def calcular_escudo(energia_base, multiplicador):
    # 1. Calcula la potencia multiplicando los dos parámetros
    potencia = 0

    # 2. Si supera 100, limita el retorno a 100
    
    return potencia$code$,
    $code$def calcular_escudo(energia_base, multiplicador):
    potencia = energia_base * multiplicador
    if potencia > 100:
        return 100
    return potencia$code$,
    $json${
      "motor": "python-runner",
      "funcion_objetivo": "calcular_escudo",
      "tokens_requeridos": ["def calcular_escudo", "*", "if ", "return"],
      "casos_prueba": [
        { "entrada": [20, 3], "esperado": 60, "descripcion": "Carga normal sin sobrecarga" },
        { "entrada": [40, 4], "esperado": 100, "descripcion": "Sobrecarga limitada a 100" },
        { "entrada": [25, 4], "esperado": 100, "descripcion": "Límite exacto en 100" },
        { "entrada": [0, 5],  "esperado": 0,   "descripcion": "Energía base en cero" }
      ]
    }$json$::jsonb,
    $json$[
      {
        "nivel": 1,
        "texto": "Una función recibe datos en sus parámetros y usa la palabra clave return para enviar el resultado a la nave."
      },
      {
        "nivel": 2,
        "texto": "Cambia potencia = 0 por potencia = energia_base * multiplicador y debajo evalúa: if potencia > 100:"
      },
      {
        "nivel": 3,
        "texto": "Dentro del bloque if (con 8 espacios) escribe return 100, y en la última línea (con 4 espacios) deja return potencia."
      }
    ]$json$::jsonb,
    45, 30, 4,
    4, 'Laboratorio', 'python-script', 'Escudo Cuántico', 'Protocolo Prisma: Escudo Cuántico Modular',
    'Programa una función con parámetros y límite de seguridad en Python.',
    'Calcula energia_base * multiplicador y limita el máximo a 100.',
    45, 30
)
ON CONFLICT (slug) DO UPDATE SET
    mundo_id           = EXCLUDED.mundo_id,
    titulo             = EXCLUDED.titulo,
    contexto_narrativo = EXCLUDED.contexto_narrativo,
    instrucciones_md   = EXCLUDED.instrucciones_md,
    codigo_inicial     = EXCLUDED.codigo_inicial,
    codigo_solucion    = EXCLUDED.codigo_solucion,
    reglas_validacion  = EXCLUDED.reglas_validacion,
    pistas             = EXCLUDED.pistas,
    xp_recompensa      = EXCLUDED.xp_recompensa,
    monedas_recompensa = EXCLUDED.monedas_recompensa,
    orden              = EXCLUDED.orden,
    orden_etapa        = EXCLUDED.orden_etapa,
    recompensa_xp      = EXCLUDED.recompensa_xp,
    recompensa_monedas = EXCLUDED.recompensa_monedas;

-- Nueva Misión Avanzada Python 2 (Orden 5): Listas, bucles y filtrado compuesto
INSERT INTO misiones (
    id, mundo_id, titulo, slug, contexto_narrativo, instrucciones_md,
    codigo_inicial, codigo_solucion, reglas_validacion, pistas,
    xp_recompensa, monedas_recompensa, orden,
    orden_etapa, nivel_dificultad, plantilla_id, nombre_corto, titulo_ejercicio,
    descripcion, instrucciones, recompensa_xp, recompensa_monedas
)
VALUES (
    gen_random_uuid()::text,
    (SELECT id FROM mundos WHERE slug = 'laboratorio-python'),
    'Radar de Cristal: Filtrado de Señales Corruptas',
    'py-radar-senales-corruptas',
    'La Unidad Rover captó frecuencias misteriosas desde un sector inexplorado, pero la tormenta solar mezcló ruido electromagnético en la lista. Gato Pixel necesita aislar únicamente las señales limpias para triangular la baliza.',
    $md$### 📡 Misión: Limpiar la Matriz de Frecuencias

Completa la función `filtrar_senales(lecturas)` para depurar los datos del radar:

1. Crea una lista vacía llamada `limpias = []`.
2. Recorre cada número de `lecturas` usando un bucle `for`.
3. Una señal es **válida** solo si es **mayor o igual a `10`** `and` **menor o igual a `500`**.
4. Agrega cada señal válida a `limpias` usando `.append(...)` y al final devuelve `limpias`.

**Ejemplo:** `filtrar_senales([-5, 120, 900, 10, 450])` debe devolver `[120, 10, 450]`.$md$,
    $code$def filtrar_senales(lecturas):
    limpias = []
    # Recorre cada señal en lecturas y guarda solo las que estén entre 10 y 500
    
    return limpias$code$,
    $code$def filtrar_senales(lecturas):
    limpias = []
    for senal in lecturas:
        if senal >= 10 and senal <= 500:
            limpias.append(senal)
    return limpias$code$,
    $json${
      "motor": "python-runner",
      "funcion_objetivo": "filtrar_senales",
      "tokens_requeridos": ["def filtrar_senales", "for ", "if ", "append", "return"],
      "casos_prueba": [
        { "entrada": [[-5, 120, 900, 10, 450]], "esperado": [120, 10, 450], "descripcion": "Filtra negativos y picos mayores a 500" },
        { "entrada": [[9, 500, 501]],           "esperado": [500],          "descripcion": "Respeta bordes exactos 10 y 500" },
        { "entrada": [[-20, 0, 800]],           "esperado": [],             "descripcion": "Lista sin señales válidas" }
      ]
    }$json$::jsonb,
    $json$[
      {
        "nivel": 1,
        "texto": "Para revisar todos los elementos de una lista uno por uno, usa un bucle for y evalúa cada valor antes de guardarlo."
      },
      {
        "nivel": 2,
        "texto": "Escribe for senal in lecturas: y dentro comprueba ambas condiciones con if senal >= 10 and senal <= 500:"
      },
      {
        "nivel": 3,
        "texto": "Dentro del if usa limpias.append(senal). Asegúrate de que return limpias quede alineado con for (fuera del bucle)."
      }
    ]$json$::jsonb,
    55, 35, 5,
    5, 'Laboratorio', 'python-script', 'Radar de Cristal', 'Radar de Cristal: Filtrado de Señales Corruptas',
    'Filtra listas con bucles for y condiciones compuestas en Python.',
    'Conserva únicamente las frecuencias entre 10 y 500 inclusive.',
    55, 35
)
ON CONFLICT (slug) DO UPDATE SET
    mundo_id           = EXCLUDED.mundo_id,
    titulo             = EXCLUDED.titulo,
    contexto_narrativo = EXCLUDED.contexto_narrativo,
    instrucciones_md   = EXCLUDED.instrucciones_md,
    codigo_inicial     = EXCLUDED.codigo_inicial,
    codigo_solucion    = EXCLUDED.codigo_solucion,
    reglas_validacion  = EXCLUDED.reglas_validacion,
    pistas             = EXCLUDED.pistas,
    xp_recompensa      = EXCLUDED.xp_recompensa,
    monedas_recompensa = EXCLUDED.monedas_recompensa,
    orden              = EXCLUDED.orden,
    orden_etapa        = EXCLUDED.orden_etapa,
    recompensa_xp      = EXCLUDED.recompensa_xp,
    recompensa_monedas = EXCLUDED.recompensa_monedas;

-- Nueva Misión Avanzada Python 3 (Orden 6): Diccionarios y acumuladores seguros
INSERT INTO misiones (
    id, mundo_id, titulo, slug, contexto_narrativo, instrucciones_md,
    codigo_inicial, codigo_solucion, reglas_validacion, pistas,
    xp_recompensa, monedas_recompensa, orden,
    orden_etapa, nivel_dificultad, plantilla_id, nombre_corto, titulo_ejercicio,
    descripcion, instrucciones, recompensa_xp, recompensa_monedas
)
VALUES (
    gen_random_uuid()::text,
    (SELECT id FROM mundos WHERE slug = 'laboratorio-python'),
    'Núcleo Rover: Decodificador de Carga Estelar',
    'py-nucleo-decodificador-estelar',
    '¡Última prueba antes del salto hiperespacial! Zorro Ágil debe auditar las cápsulas recolectadas en la bodega. Algunas contienen cristales energéticos registrados en el catálogo oficial, pero otras contienen simple roca espacial.',
    $md$### 💎 Misión: Auditar Cristales con Diccionarios

Completa la función `energia_total(capsulas)` usando el diccionario `catalogo`:

- `"cian"` aporta **`15`** unidades.
- `"violeta"` aporta **`30`** unidades.
- `"solar"` aporta **`50`** unidades.

**Pasos a programar:**
1. Inicia un acumulador `total = 0`.
2. Recorre cada elemento de la lista `capsulas`.
3. Si el elemento existe en `catalogo` (usa `if item in catalogo:`), suma su valor energético a `total`. Si no existe (como `"roca"`), ignóralo.
4. Devuelve `total`.$md$,
    $code$def energia_total(capsulas):
    catalogo = {
        "cian": 15,
        "violeta": 30,
        "solar": 50
    }
    total = 0
    # Recorre capsulas y suma la energía solo si el cristal existe en catalogo
    
    return total$code$,
    $code$def energia_total(capsulas):
    catalogo = {
        "cian": 15,
        "violeta": 30,
        "solar": 50
    }
    total = 0
    for item in capsulas:
        if item in catalogo:
            total += catalogo[item]
    return total$code$,
    $json${
      "motor": "python-runner",
      "funcion_objetivo": "energia_total",
      "tokens_requeridos": ["def energia_total", "catalogo", "for ", " in ", "return"],
      "casos_prueba": [
        { "entrada": [["cian", "solar", "roca", "cian"]], "esperado": 80,  "descripcion": "Suma cristales válidos e ignora roca" },
        { "entrada": [["violeta", "violeta", "solar"]],   "esperado": 110, "descripcion": "Acumula cristales repetidos" },
        { "entrada": [["polvo", "chatarra"]],             "esperado": 0,   "descripcion": "Carga sin cristales registrados" }
      ]
    }$json$::jsonb,
    $json$[
      {
        "nivel": 1,
        "texto": "Un diccionario guarda pares clave: valor. Si intentas leer una clave que no existe dará error, así que primero verifica si está dentro del diccionario."
      },
      {
        "nivel": 2,
        "texto": "Recorre la lista con for item in capsulas: y comprueba si es un cristal válido escribiendo if item in catalogo:"
      },
      {
        "nivel": 3,
        "texto": "Dentro del if suma el valor con total += catalogo[item] (o total = total + catalogo[item]) y devuelve return total al final."
      }
    ]$json$::jsonb,
    70, 45, 6,
    6, 'Laboratorio', 'python-script', 'Núcleo Rover', 'Núcleo Rover: Decodificador de Carga Estelar',
    'Consulta diccionarios y acumula energía válida en Python.',
    'Suma el valor de cada cristal presente en el diccionario catalogo.',
    70, 45
)
ON CONFLICT (slug) DO UPDATE SET
    mundo_id           = EXCLUDED.mundo_id,
    titulo             = EXCLUDED.titulo,
    contexto_narrativo = EXCLUDED.contexto_narrativo,
    instrucciones_md   = EXCLUDED.instrucciones_md,
    codigo_inicial     = EXCLUDED.codigo_inicial,
    codigo_solucion    = EXCLUDED.codigo_solucion,
    reglas_validacion  = EXCLUDED.reglas_validacion,
    pistas             = EXCLUDED.pistas,
    xp_recompensa      = EXCLUDED.xp_recompensa,
    monedas_recompensa = EXCLUDED.monedas_recompensa,
    orden              = EXCLUDED.orden,
    orden_etapa        = EXCLUDED.orden_etapa,
    recompensa_xp      = EXCLUDED.recompensa_xp,
    recompensa_monedas = EXCLUDED.recompensa_monedas;

-- =============================================================================
-- 4. MISIONES INICIALES DEL NUEVO MUNDO "ciudadela-html"
-- =============================================================================

-- Misión HTML 1 (Orden 1)
INSERT INTO misiones (
    id, mundo_id, titulo, slug, contexto_narrativo, instrucciones_md,
    codigo_inicial, codigo_solucion, reglas_validacion, pistas,
    xp_recompensa, monedas_recompensa, orden,
    orden_etapa, nivel_dificultad, plantilla_id, nombre_corto, titulo_ejercicio,
    descripcion, instrucciones, recompensa_xp, recompensa_monedas
)
VALUES (
    gen_random_uuid()::text,
    (SELECT id FROM mundos WHERE slug = 'ciudadela-html'),
    'El Faro Holográfico: Estructura de la Torre',
    'html-faro-holografico',
    '¡Bienvenido a la Ciudadela HTML! Una tormenta de estática apagó el panel principal del puerto aéreo. Sin su encabezado holográfico, las naves de los Ciber-Exploradores no pueden identificar la pista de aterrizaje.',
    $md$### 🏗️ Misión: Encender el Panel del Faro

Escribe la estructura HTML dentro de `<header>` para proyectar la señal de bienvenida:

1. Crea un título principal `<h1>` con el texto exacto: `Ciudadela HTML`
2. Debajo, agrega un párrafo `<p>` con el texto: `Estado del faro: ` seguido de la palabra `Activo` envuelta en una etiqueta `<strong>`.

> ✨ **Consejo de Pipo:** Verifica que cada etiqueta abierta tenga su etiqueta de cierre con `/` (por ejemplo, `<h1>...</h1>`).$md$,
    $code$<header>
  <!-- Escribe aquí el título h1 y el párrafo p con strong -->

</header>$code$,
    $code$<header>
  <h1>Ciudadela HTML</h1>
  <p>Estado del faro: <strong>Activo</strong></p>
</header>$code$,
    $json${
      "motor": "html-dom",
      "tokens_requeridos": ["<header>", "<h1>", "</h1>", "<p>", "</p>", "<strong>", "</strong>", "</header>"],
      "selectores_dom": [
        { "selector": "header > h1",         "texto_exacto": "Ciudadela HTML" },
        { "selector": "header > p",          "contiene_texto": "Estado del faro:" },
        { "selector": "header > p > strong", "texto_exacto": "Activo" }
      ]
    }$json$::jsonb,
    $json$[
      {
        "nivel": 1,
        "texto": "En HTML, <h1> define el título más importante de la página y <p> define un párrafo de texto."
      },
      {
        "nivel": 2,
        "texto": "Coloca <h1>Ciudadela HTML</h1> en la primera línea dentro de <header>, y debajo abre tu etiqueta <p>."
      },
      {
        "nivel": 3,
        "texto": "El párrafo completo debe quedar exactamente así: <p>Estado del faro: <strong>Activo</strong></p>."
      }
    ]$json$::jsonb,
    25, 15, 1,
    1, 'Inicio', 'html-markup', 'Faro Holográfico', 'El Faro Holográfico: Estructura de la Torre',
    'Construye encabezados y párrafos semánticos en HTML5.',
    'Agrega un h1 y un párrafo con strong dentro de header.',
    25, 15
)
ON CONFLICT (slug) DO UPDATE SET
    mundo_id           = EXCLUDED.mundo_id,
    titulo             = EXCLUDED.titulo,
    contexto_narrativo = EXCLUDED.contexto_narrativo,
    instrucciones_md   = EXCLUDED.instrucciones_md,
    codigo_inicial     = EXCLUDED.codigo_inicial,
    codigo_solucion    = EXCLUDED.codigo_solucion,
    reglas_validacion  = EXCLUDED.reglas_validacion,
    pistas             = EXCLUDED.pistas,
    xp_recompensa      = EXCLUDED.xp_recompensa,
    monedas_recompensa = EXCLUDED.monedas_recompensa,
    orden              = EXCLUDED.orden,
    orden_etapa        = EXCLUDED.orden_etapa,
    recompensa_xp      = EXCLUDED.recompensa_xp,
    recompensa_monedas = EXCLUDED.recompensa_monedas;

-- Misión HTML 2 (Orden 2)
INSERT INTO misiones (
    id, mundo_id, titulo, slug, contexto_narrativo, instrucciones_md,
    codigo_inicial, codigo_solucion, reglas_validacion, pistas,
    xp_recompensa, monedas_recompensa, orden,
    orden_etapa, nivel_dificultad, plantilla_id, nombre_corto, titulo_ejercicio,
    descripcion, instrucciones, recompensa_xp, recompensa_monedas
)
VALUES (
    gen_random_uuid()::text,
    (SELECT id FROM mundos WHERE slug = 'ciudadela-html'),
    'Portal de Suministros: Inventario y Enlace Orbital',
    'html-portal-suministros',
    'El Faro ya brilla sobre las nubes, pero la terminal de carga de Dragón Chispa está desconectada. Debes listar el equipo básico de exploración y activar el hipervínculo hacia la plataforma de despegue.',
    $md$### 📦 Misión: Conectar Inventario y Portal

Dentro de `<section>`, construye estos dos bloques:

1. Una lista desordenada `<ul>` con **3 elementos `<li>`** en este orden:
   - `Batería Solar`
   - `Escudo Nano`
   - `Mapa Estelar`
2. Debajo de la lista, crea un enlace `<a>` cuyo atributo `href` apunte a `"#lanzamiento"` y cuyo texto visible sea `Iniciar despegue`.$md$,
    $code$<section>
  <h2>Equipo de Misión</h2>
  <!-- 1. Crea la lista ul con los 3 elementos li -->

  <!-- 2. Crea el enlace hacia #lanzamiento -->
</section>$code$,
    $code$<section>
  <h2>Equipo de Misión</h2>
  <ul>
    <li>Batería Solar</li>
    <li>Escudo Nano</li>
    <li>Mapa Estelar</li>
  </ul>
  <a href="#lanzamiento">Iniciar despegue</a>
</section>$code$,
    $json${
      "motor": "html-dom",
      "tokens_requeridos": ["<ul>", "</ul>", "<li>", "</li>", "<a ", "href=", "</a>"],
      "selectores_dom": [
        { "selector": "section ul li",                  "cantidad": 3 },
        { "selector": "section ul li:nth-child(1)",     "texto_exacto": "Batería Solar" },
        { "selector": "section ul li:nth-child(2)",     "texto_exacto": "Escudo Nano" },
        { "selector": "section ul li:nth-child(3)",     "texto_exacto": "Mapa Estelar" },
        { "selector": "section a[href='#lanzamiento']", "texto_exacto": "Iniciar despegue" }
      ]
    }$json$::jsonb,
    $json$[
      {
        "nivel": 1,
        "texto": "Una lista con viñetas se envuelve con <ul>...</ul> y cada ítem individual lleva su propia etiqueta <li>...</li>."
      },
      {
        "nivel": 2,
        "texto": "Los enlaces usan la etiqueta <a> con el atributo de destino dentro de la apertura: <a href=\"...\">Texto</a>."
      },
      {
        "nivel": 3,
        "texto": "Después de cerrar </ul>, escribe exactamente: <a href=\"#lanzamiento\">Iniciar despegue</a>."
      }
    ]$json$::jsonb,
    35, 20, 2,
    2, 'En camino', 'html-markup', 'Portal Suministros', 'Portal de Suministros: Inventario y Enlace Orbital',
    'Estructura listas desordenadas y enlaces con atributos en HTML5.',
    'Crea una lista ul con 3 elementos li y un enlace hacia #lanzamiento.',
    35, 20
)
ON CONFLICT (slug) DO UPDATE SET
    mundo_id           = EXCLUDED.mundo_id,
    titulo             = EXCLUDED.titulo,
    contexto_narrativo = EXCLUDED.contexto_narrativo,
    instrucciones_md   = EXCLUDED.instrucciones_md,
    codigo_inicial     = EXCLUDED.codigo_inicial,
    codigo_solucion    = EXCLUDED.codigo_solucion,
    reglas_validacion  = EXCLUDED.reglas_validacion,
    pistas             = EXCLUDED.pistas,
    xp_recompensa      = EXCLUDED.xp_recompensa,
    monedas_recompensa = EXCLUDED.monedas_recompensa,
    orden              = EXCLUDED.orden,
    orden_etapa        = EXCLUDED.orden_etapa,
    recompensa_xp      = EXCLUDED.recompensa_xp,
    recompensa_monedas = EXCLUDED.recompensa_monedas;

-- =============================================================================
-- 5. MISIONES INICIALES DEL NUEVO MUNDO "neo-tokio-javascript"
-- =============================================================================

-- Misión JS 1 (Orden 1)
INSERT INTO misiones (
    id, mundo_id, titulo, slug, contexto_narrativo, instrucciones_md,
    codigo_inicial, codigo_solucion, reglas_validacion, pistas,
    xp_recompensa, monedas_recompensa, orden,
    orden_etapa, nivel_dificultad, plantilla_id, nombre_corto, titulo_ejercicio,
    descripcion, instrucciones, recompensa_xp, recompensa_monedas
)
VALUES (
    gen_random_uuid()::text,
    (SELECT id FROM mundos WHERE slug = 'neo-tokio-javascript'),
    'Neones de Shibuya: Variables y Mensaje Reactivo',
    'js-neones-shibuya',
    'Aterrizaste en Neo-Tokio JavaScript, donde cada rascacielos responde a eventos en vivo. Las pantallas del cruce central están en modo espera y Zorro Ágil necesita que inyectes el cálculo de energía en tiempo real.',
    $md$### ⚡ Misión: Reactivar las Pantallas de Neón

Completa la función `activarNeones(bateriasActivas)`:

1. Declara una constante `distrito` con el texto `"Shibuya"`.
2. Calcula la energía multiplicando `bateriasActivas * 25` y guárdala en una variable `energiaTotal`.
3. Devuelve (`return`) una plantilla de texto (*template literal*) con este formato exacto:
   `Distrito Shibuya: 75% de energía` (cuando `bateriasActivas` vale `3`).$md$,
    $code$function activarNeones(bateriasActivas) {
  const distrito = "Shibuya";
  // 1. Calcula energiaTotal multiplicando bateriasActivas por 25

  // 2. Retorna el mensaje usando comillas invertidas (`) y ${...}
  return "";
}$code$,
    $code$function activarNeones(bateriasActivas) {
  const distrito = "Shibuya";
  const energiaTotal = bateriasActivas * 25;
  return `Distrito ${distrito}: ${energiaTotal}% de energía`;
}$code$,
    $json${
      "motor": "javascript-sandbox",
      "funcion_objetivo": "activarNeones",
      "tokens_requeridos": ["const ", "*", "`", "${", "return"],
      "casos_prueba": [
        { "entrada": [3], "esperado": "Distrito Shibuya: 75% de energía",  "descripcion": "3 baterías activas (75%)" },
        { "entrada": [4], "esperado": "Distrito Shibuya: 100% de energía", "descripcion": "Carga máxima (100%)" },
        { "entrada": [1], "esperado": "Distrito Shibuya: 25% de energía",  "descripcion": "1 batería activa (25%)" }
      ]
    }$json$::jsonb,
    $json$[
      {
        "nivel": 1,
        "texto": "En JavaScript puedes combinar texto y variables fácilmente usando comillas invertidas (`) y colocando cada variable dentro de ${...}."
      },
      {
        "nivel": 2,
        "texto": "Crea la variable con const energiaTotal = bateriasActivas * 25; o let energiaTotal = bateriasActivas * 25;."
      },
      {
        "nivel": 3,
        "texto": "Reemplaza el return final por: return `Distrito ${distrito}: ${energiaTotal}% de energía`;"
      }
    ]$json$::jsonb,
    30, 20, 1,
    1, 'Inicio', 'javascript-script', 'Neones Shibuya', 'Neones de Shibuya: Variables y Mensaje Reactivo',
    'Usa variables y template literals para encender pantallas en JavaScript.',
    'Multiplica bateriasActivas * 25 y devuelve el estado con template literals.',
    30, 20
)
ON CONFLICT (slug) DO UPDATE SET
    mundo_id           = EXCLUDED.mundo_id,
    titulo             = EXCLUDED.titulo,
    contexto_narrativo = EXCLUDED.contexto_narrativo,
    instrucciones_md   = EXCLUDED.instrucciones_md,
    codigo_inicial     = EXCLUDED.codigo_inicial,
    codigo_solucion    = EXCLUDED.codigo_solucion,
    reglas_validacion  = EXCLUDED.reglas_validacion,
    pistas             = EXCLUDED.pistas,
    xp_recompensa      = EXCLUDED.xp_recompensa,
    monedas_recompensa = EXCLUDED.monedas_recompensa,
    orden              = EXCLUDED.orden,
    orden_etapa        = EXCLUDED.orden_etapa,
    recompensa_xp      = EXCLUDED.recompensa_xp,
    recompensa_monedas = EXCLUDED.recompensa_monedas;

-- Misión JS 2 (Orden 2)
INSERT INTO misiones (
    id, mundo_id, titulo, slug, contexto_narrativo, instrucciones_md,
    codigo_inicial, codigo_solucion, reglas_validacion, pistas,
    xp_recompensa, monedas_recompensa, orden,
    orden_etapa, nivel_dificultad, plantilla_id, nombre_corto, titulo_ejercicio,
    descripcion, instrucciones, recompensa_xp, recompensa_monedas
)
VALUES (
    gen_random_uuid()::text,
    (SELECT id FROM mundos WHERE slug = 'neo-tokio-javascript'),
    'Dron Mensajero: Ruta Aérea Condicional',
    'js-dron-mensajero',
    'Las autopistas aéreas de Neo-Tokio están llenas de drones mensajeros. Antes de despegar entre hologramas y lluvias eléctricas, tu dron necesita un algoritmo de decisión seguro.',
    $md$### 🚁 Misión: Programar el Piloto Automático

Completa la función `decidirVuelo(bateria, hayTormenta)` respetando el orden de prioridad:

1. **Prioridad máxima:** Si `hayTormenta` es `true`, devuelve `"Aterrizaje de emergencia"`.
2. Si no hay tormenta y `bateria` es **mayor o igual a `50`** (`>= 50`), devuelve `"Ruta turbo activada"`.
3. En cualquier otro caso (batería menor a `50` sin tormenta), devuelve `"Recargar en estación"`.$md$,
    $code$function decidirVuelo(bateria, hayTormenta) {
  // Evalúa primero si hay tormenta, luego el nivel de batería
  
}$code$,
    $code$function decidirVuelo(bateria, hayTormenta) {
  if (hayTormenta) {
    return "Aterrizaje de emergencia";
  } else if (bateria >= 50) {
    return "Ruta turbo activada";
  } else {
    return "Recargar en estación";
  }
}$code$,
    $json${
      "motor": "javascript-sandbox",
      "funcion_objetivo": "decidirVuelo",
      "tokens_requeridos": ["if", "else", ">=", "return"],
      "casos_prueba": [
        { "entrada": [95, true],  "esperado": "Aterrizaje de emergencia", "descripcion": "Tormenta activa con batería alta" },
        { "entrada": [20, true],  "esperado": "Aterrizaje de emergencia", "descripcion": "Tormenta activa con batería baja" },
        { "entrada": [50, false], "esperado": "Ruta turbo activada",      "descripcion": "Batería en el umbral mínimo de 50" },
        { "entrada": [85, false], "esperado": "Ruta turbo activada",      "descripcion": "Vuelo despejado con carga óptima" },
        { "entrada": [30, false], "esperado": "Recargar en estación",     "descripcion": "Sin tormenta pero batería insuficiente" }
      ]
    }$json$::jsonb,
    $json$[
      {
        "nivel": 1,
        "texto": "Comprueba primero hayTormenta: si revisaras la batería antes, un dron con 90% de carga intentaría volar en medio de una tormenta."
      },
      {
        "nivel": 2,
        "texto": "Estructura tres ramas encadenadas: if (hayTormenta) { ... } else if (bateria >= 50) { ... } else { ... }."
      },
      {
        "nivel": 3,
        "texto": "Coloca un return en cada bloque con los textos exactos: \"Aterrizaje de emergencia\", \"Ruta turbo activada\" y \"Recargar en estación\"."
      }
    ]$json$::jsonb,
    40, 25, 2,
    2, 'En camino', 'javascript-script', 'Dron Mensajero', 'Dron Mensajero: Ruta Aérea Condicional',
    'Toma decisiones jerárquicas con if / else if / else en JavaScript.',
    'Prioriza la alerta de tormenta y evalúa si la batería alcanza el 50%.',
    40, 25
)
ON CONFLICT (slug) DO UPDATE SET
    mundo_id           = EXCLUDED.mundo_id,
    titulo             = EXCLUDED.titulo,
    contexto_narrativo = EXCLUDED.contexto_narrativo,
    instrucciones_md   = EXCLUDED.instrucciones_md,
    codigo_inicial     = EXCLUDED.codigo_inicial,
    codigo_solucion    = EXCLUDED.codigo_solucion,
    reglas_validacion  = EXCLUDED.reglas_validacion,
    pistas             = EXCLUDED.pistas,
    xp_recompensa      = EXCLUDED.xp_recompensa,
    monedas_recompensa = EXCLUDED.monedas_recompensa,
    orden              = EXCLUDED.orden,
    orden_etapa        = EXCLUDED.orden_etapa,
    recompensa_xp      = EXCLUDED.recompensa_xp,
    recompensa_monedas = EXCLUDED.recompensa_monedas;

-- =============================================================================
-- 6. Permisos de lectura y escritura para el cliente Frontend (@supabase/supabase-js)
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    mundos,
    misiones,
    usuarios,
    perfiles_gamificacion,
    inventario_avatares_usuario,
    progreso_misiones_usuario,
    aulas,
    matriculas_aula,
    retos_aula,
    entregas_retos
TO anon, authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'mundos',
        'misiones',
        'usuarios',
        'perfiles_gamificacion',
        'inventario_avatares_usuario',
        'progreso_misiones_usuario',
        'aulas',
        'matriculas_aula',
        'retos_aula',
        'entregas_retos'
    ]
    LOOP
        IF EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = tbl AND c.relrowsecurity = TRUE
        ) THEN
            EXECUTE format('DROP POLICY IF EXISTS "Acceso publico %I" ON %I', tbl, tbl);
            EXECUTE format('CREATE POLICY "Acceso publico %I" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
        END IF;
    END LOOP;
END $$;

COMMIT;
