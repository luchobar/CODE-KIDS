-- =============================================================================
-- CODEKIDS — Script Completo de Creación (DDL) y Semilla (DML)
-- Base de Datos: PostgreSQL 16+
-- Compatible para ejecución directa en pgAdmin 4 (Query Tool)
-- =============================================================================

BEGIN;

-- Extensiones necesarias para UUIDs y correos insensibles a mayúsculas
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. TABLA: usuarios
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correo CITEXT NOT NULL,
    nombre VARCHAR(120) NOT NULL DEFAULT 'Explorador',
    rol VARCHAR(20) NOT NULL DEFAULT 'estudiante'
        CHECK (rol IN ('estudiante', 'docente', 'admin')),
    correo_verificado_en TIMESTAMPTZ NULL,
    contrasena_hash TEXT NULL,
    es_perfil_rapido BOOLEAN NOT NULL DEFAULT FALSE,
    etiqueta_rapida VARCHAR(60) NULL,
    intentos_fallidos SMALLINT NOT NULL DEFAULT 0 CHECK (intentos_fallidos >= 0),
    bloqueado_hasta TIMESTAMPTZ NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso_en TIMESTAMPTZ NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_usuarios_correo UNIQUE (correo)
);

-- -----------------------------------------------------------------------------
-- 2. TABLA: catalogo_avatares
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalogo_avatares (
    id VARCHAR(32) PRIMARY KEY,
    nombre_visible VARCHAR(80) NOT NULL,
    costo_monedas INTEGER NOT NULL DEFAULT 0 CHECK (costo_monedas >= 0),
    tono_tema VARCHAR(20) NOT NULL DEFAULT 'blue'
        CHECK (tono_tema IN ('peach', 'lav', 'mint', 'yellow', 'blue')),
    descripcion VARCHAR(240) NOT NULL,
    es_inicial BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. TABLA: perfiles_gamificacion (HUD: XP, Nivel generado, Monedas, Racha)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS perfiles_gamificacion (
    usuario_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    puntos_xp INTEGER NOT NULL DEFAULT 0 CHECK (puntos_xp >= 0),
    nivel_actual INTEGER GENERATED ALWAYS AS ((puntos_xp / 100) + 1) STORED,
    saldo_monedas INTEGER NOT NULL DEFAULT 0 CHECK (saldo_monedas >= 0),
    dias_racha INTEGER NOT NULL DEFAULT 1 CHECK (dias_racha >= 0),
    ultima_fecha_actividad DATE NOT NULL DEFAULT CURRENT_DATE,
    avatar_activo_id VARCHAR(32) NOT NULL DEFAULT 'dragon'
        REFERENCES catalogo_avatares(id) ON UPDATE CASCADE,
    sonido_habilitado BOOLEAN NOT NULL DEFAULT TRUE,
    puntajes_diagnostico JSONB NOT NULL DEFAULT '{"Secuencias": 75, "Bucles": 45, "Condicionales": 80, "Descomposición": 55}'::jsonb,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. TABLA: inventario_avatares_usuario
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventario_avatares_usuario (
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    avatar_id VARCHAR(32) NOT NULL REFERENCES catalogo_avatares(id) ON DELETE CASCADE,
    desbloqueado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (usuario_id, avatar_id)
);

-- -----------------------------------------------------------------------------
-- 5. TABLAS: catalogo_insignias e insignias_usuario
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalogo_insignias (
    id VARCHAR(40) PRIMARY KEY,
    titulo VARCHAR(80) NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    tematica_habilidad VARCHAR(40) NOT NULL,
    nombre_icono VARCHAR(40) NOT NULL DEFAULT 'Trophy'
);

CREATE TABLE IF NOT EXISTS insignias_usuario (
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    insignia_id VARCHAR(40) NOT NULL REFERENCES catalogo_insignias(id) ON DELETE CASCADE,
    otorgada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (usuario_id, insignia_id)
);

-- -----------------------------------------------------------------------------
-- 6. TABLAS: aulas y matriculas_aula
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aulas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_grupo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    docente_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    anio_escolar SMALLINT NOT NULL DEFAULT 2026,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matriculas_aula (
    aula_id UUID NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
    estudiante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    matriculado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (aula_id, estudiante_id)
);

-- -----------------------------------------------------------------------------
-- 7. TABLA: mundos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mundos (
    id VARCHAR(40) PRIMARY KEY,
    orden_mundo SMALLINT NOT NULL UNIQUE CHECK (orden_mundo > 0),
    tematica_habilidad VARCHAR(40) NOT NULL
        CHECK (tematica_habilidad IN ('Secuencias', 'Bucles', 'Condicionales', 'Funciones', 'Python')),
    titulo VARCHAR(120) NOT NULL,
    subtitulo VARCHAR(240) NOT NULL,
    tono_color VARCHAR(24) NOT NULL DEFAULT 'forest',
    url_imagen_banner VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- -----------------------------------------------------------------------------
-- 8. TABLA: misiones
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS misiones (
    id VARCHAR(50) PRIMARY KEY,
    mundo_id VARCHAR(40) NOT NULL REFERENCES mundos(id) ON DELETE CASCADE,
    orden_etapa SMALLINT NOT NULL CHECK (orden_etapa BETWEEN 1 AND 10),
    nivel_dificultad VARCHAR(30) NOT NULL
        CHECK (nivel_dificultad IN ('Inicio', 'En camino', 'Explorador', 'Laboratorio')),
    plantilla_id VARCHAR(40) NOT NULL
        CHECK (plantilla_id IN ('sequence-order', 'loop-count', 'if-choice', 'python-script')),
    nombre_corto VARCHAR(80) NOT NULL,
    titulo_ejercicio VARCHAR(120) NOT NULL,
    descripcion VARCHAR(240) NOT NULL,
    instrucciones TEXT NOT NULL,
    bloque_requerido VARCHAR(40) NULL,
    configuracion_tablero JSONB NOT NULL,
    programa_semilla JSONB NOT NULL DEFAULT '[]'::jsonb,
    recompensa_xp INTEGER NOT NULL DEFAULT 10 CHECK (recompensa_xp >= 0),
    recompensa_monedas INTEGER NOT NULL DEFAULT 10 CHECK (recompensa_monedas >= 0),
    CONSTRAINT uq_mundo_orden_etapa UNIQUE (mundo_id, orden_etapa)
);

CREATE INDEX IF NOT EXISTS idx_misiones_mundo_etapa
    ON misiones (mundo_id, orden_etapa);

-- -----------------------------------------------------------------------------
-- 9. TABLA: progreso_misiones_usuario
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS progreso_misiones_usuario (
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    mision_id VARCHAR(50) NOT NULL REFERENCES misiones(id) ON DELETE CASCADE,
    estado VARCHAR(20) NOT NULL DEFAULT 'bloqueada'
        CHECK (estado IN ('bloqueada', 'disponible', 'completada')),
    estrellas_ganadas SMALLINT NOT NULL DEFAULT 0
        CHECK (estrellas_ganadas BETWEEN 0 AND 3),
    cantidad_intentos INTEGER NOT NULL DEFAULT 0
        CHECK (cantidad_intentos >= 0),
    ultima_evidencia TEXT NULL,
    estado_espacio_trabajo JSONB NULL,
    completada_en TIMESTAMPTZ NULL,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (usuario_id, mision_id)
);

CREATE INDEX IF NOT EXISTS idx_progreso_usuario_estado
    ON progreso_misiones_usuario (usuario_id, estado);

-- -----------------------------------------------------------------------------
-- 10. TABLAS: retos_aula y entregas_retos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS retos_aula (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aula_id UUID NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
    mision_id VARCHAR(50) NOT NULL REFERENCES misiones(id) ON DELETE RESTRICT,
    titulo VARCHAR(140) NOT NULL,
    instrucciones TEXT NOT NULL,
    tematica_habilidad VARCHAR(40) NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entregas_retos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reto_id UUID NOT NULL REFERENCES retos_aula(id) ON DELETE CASCADE,
    estudiante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    puntaje SMALLINT NOT NULL CHECK (puntaje BETWEEN 0 AND 100),
    cantidad_intentos INTEGER NOT NULL DEFAULT 1 CHECK (cantidad_intentos > 0),
    logrado BOOLEAN NOT NULL DEFAULT FALSE,
    texto_evidencia TEXT NOT NULL,
    retroalimentacion_ia TEXT NOT NULL,
    recomendacion_docente TEXT NOT NULL,
    fuente_evaluacion VARCHAR(30) NOT NULL DEFAULT 'ollama',
    entregado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_reto_estudiante UNIQUE (reto_id, estudiante_id)
);

-- =============================================================================
-- INSERCIÓN DE DATOS SEMILLA (DML)
-- =============================================================================

-- Avatares
INSERT INTO catalogo_avatares (id, nombre_visible, costo_monedas, tono_tema, descripcion, es_inicial) VALUES
    ('astronaut', 'Explorador Estelar', 0,  'blue',   'Traje espacial estándar para nuevas misiones.', TRUE),
    ('dragon',    'Dragón Chispa',      30, 'peach',  'Especialista en lógica y secuencias rápidas.', TRUE),
    ('cat',       'Gato Pixel',         30, 'lav',    'Observador preciso para depurar programas.', FALSE),
    ('robot',     'Unidad Rover',       40, 'mint',   'Diseñado para exploración autónoma por bloques.', TRUE),
    ('fox',       'Zorro Ágil',         50, 'yellow', 'Estratega en bucles y rutas óptimas.', TRUE),
    ('unicorn',   'Prisma Orbital',     60, 'blue',   'Compañero avanzado de laboratorio Python.', TRUE)
ON CONFLICT (id) DO UPDATE SET
    nombre_visible = EXCLUDED.nombre_visible,
    costo_monedas = EXCLUDED.costo_monedas,
    tono_tema = EXCLUDED.tono_tema,
    descripcion = EXCLUDED.descripcion;

-- Insignias
INSERT INTO catalogo_insignias (id, titulo, descripcion, tematica_habilidad, nombre_icono) VALUES
    ('insignia-primer-codigo', 'Primer código',   'Completaste tu primera misión de programación por bloques.', 'Secuencias',    'Compass'),
    ('insignia-master-bucles', 'Master bucles',   'Dominaste las tres etapas de La Isla de los Bucles.',        'Bucles',        'SlidersHorizontal'),
    ('insignia-logica-acero',  'Lógica de acero', 'Superaste todos los retos de La Cueva de las Decisiones.',   'Condicionales', 'Brain')
ON CONFLICT (id) DO NOTHING;

-- Usuarios rápidos de aula (Sofi, Mateo, Valeria, Profe Alex)
INSERT INTO usuarios (id, correo, nombre, rol, correo_verificado_en, es_perfil_rapido, etiqueta_rapida) VALUES
    ('11111111-1111-4111-8111-111111111101', 'sofi@codekids.edu.co',       'Sofi',       'estudiante', NOW(), TRUE, 'Nvl. 3 · Secuencias'),
    ('11111111-1111-4111-8111-111111111102', 'mateo@codekids.edu.co',      'Mateo',      'estudiante', NOW(), TRUE, 'Nvl. 2 · Bucles'),
    ('11111111-1111-4111-8111-111111111103', 'valeria@codekids.edu.co',    'Valeria',    'estudiante', NOW(), TRUE, 'Nvl. 4 · Python'),
    ('11111111-1111-4111-8111-111111111104', 'alex.profe@codekids.edu.co', 'Profe Alex', 'docente',    NOW(), TRUE, 'Docente · 5° A')
ON CONFLICT (correo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    es_perfil_rapido = EXCLUDED.es_perfil_rapido,
    etiqueta_rapida = EXCLUDED.etiqueta_rapida;

-- Perfiles gamificados
INSERT INTO perfiles_gamificacion
    (usuario_id, puntos_xp, saldo_monedas, dias_racha, ultima_fecha_actividad, avatar_activo_id, sonido_habilitado, puntajes_diagnostico)
VALUES
    ('11111111-1111-4111-8111-111111111101', 240, 65, 5, CURRENT_DATE, 'dragon', TRUE, '{"Secuencias": 92, "Bucles": 68, "Condicionales": 75, "Descomposición": 70}'::jsonb),
    ('11111111-1111-4111-8111-111111111102', 130, 40, 3, CURRENT_DATE, 'robot', TRUE, '{"Secuencias": 80, "Bucles": 62, "Condicionales": 58, "Descomposición": 55}'::jsonb),
    ('11111111-1111-4111-8111-111111111103', 360, 110, 9, CURRENT_DATE, 'fox', TRUE, '{"Secuencias": 98, "Bucles": 95, "Condicionales": 88, "Descomposición": 90}'::jsonb)
ON CONFLICT (usuario_id) DO UPDATE SET
    puntos_xp = EXCLUDED.puntos_xp,
    saldo_monedas = EXCLUDED.saldo_monedas,
    dias_racha = EXCLUDED.dias_racha,
    avatar_activo_id = EXCLUDED.avatar_activo_id;

-- Inventario de avatares
INSERT INTO inventario_avatares_usuario (usuario_id, avatar_id) VALUES
    ('11111111-1111-4111-8111-111111111101', 'astronaut'),
    ('11111111-1111-4111-8111-111111111101', 'dragon'),
    ('11111111-1111-4111-8111-111111111101', 'cat'),
    ('11111111-1111-4111-8111-111111111102', 'astronaut'),
    ('11111111-1111-4111-8111-111111111102', 'robot'),
    ('11111111-1111-4111-8111-111111111103', 'astronaut'),
    ('11111111-1111-4111-8111-111111111103', 'fox'),
    ('11111111-1111-4111-8111-111111111103', 'unicorn')
ON CONFLICT DO NOTHING;

-- Aulas y matrícula
INSERT INTO aulas (id, codigo_grupo, nombre, docente_id, anio_escolar) VALUES
    ('22222222-2222-4222-8222-222222222201', '5° A', 'Exploradores de Pensamiento Computacional 5° A', '11111111-1111-4111-8111-111111111104', 2026),
    ('22222222-2222-4222-8222-222222222202', '6° B', 'Laboratorio de Algoritmos y Python 6° B',        '11111111-1111-4111-8111-111111111104', 2026)
ON CONFLICT (codigo_grupo) DO NOTHING;

INSERT INTO matriculas_aula (aula_id, estudiante_id) VALUES
    ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111101'),
    ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111102'),
    ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111103')
ON CONFLICT DO NOTHING;

-- Mundos
INSERT INTO mundos (id, orden_mundo, tematica_habilidad, titulo, subtitulo, tono_color, url_imagen_banner) VALUES
    ('mundo-bosque',    1, 'Secuencias',    'El Bosque de las Secuencias',          'Guía a los robots por nuevos caminos paso a paso',          'forest', '/images/world-forest.png'),
    ('mundo-isla',      2, 'Bucles',        'La Isla de los Bucles',                'Descubre patrones que se repiten para ahorrar energía',     'island', '/images/world-island.png'),
    ('mundo-cueva',     3, 'Condicionales', 'La Cueva de las Decisiones',           'Elige qué hacer ante cada obstáculo con sensores',          'cave',   '/images/world-cave.png'),
    ('mundo-funciones', 4, 'Funciones',     'Estación de Funciones y Depuración',   'Repara módulos de código y domina rutinas avanzadas',       'forest', '/images/python-lab.png')
ON CONFLICT (id) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    subtitulo = EXCLUDED.subtitulo;

-- 12 Misiones de Blockly
INSERT INTO misiones
    (id, mundo_id, orden_etapa, nivel_dificultad, plantilla_id, nombre_corto, titulo_ejercicio, descripcion, instrucciones, bloque_requerido, configuracion_tablero, programa_semilla, recompensa_xp, recompensa_monedas)
VALUES
    ('sequence-forest', 'mundo-bosque', 1, 'Inicio',     'sequence-order', 'El bosque', 'El viaje del robot',  'Ordena pasos y giros para llegar a la meta.', 'Arma una secuencia de bloques para llevar al robot hasta la meta.', NULL,
     '{"start":{"x":0,"y":2,"direction":0},"goal":{"x":2,"y":0},"wall":null}'::jsonb, '[]'::jsonb, 10, 10),
    ('sequence-city',   'mundo-bosque', 2, 'En camino',  'sequence-order', 'La ciudad', 'Cruza la ciudad',     'Planea una ruta alrededor de la estructura central.', 'Guía al robot por la ciudad y rodea el obstáculo central para alcanzar la meta.', NULL,
     '{"start":{"x":0,"y":1,"direction":0},"goal":{"x":2,"y":1},"wall":{"x":1,"y":1}}'::jsonb, '[]'::jsonb, 10, 10),
    ('sequence-moon',   'mundo-bosque', 3, 'Explorador', 'sequence-order', 'La luna',   'Ruta lunar',          'Traza una ruta evitando el cráter central.', 'Programa el camino hasta la meta sin cruzar el cráter.', NULL,
     '{"start":{"x":0,"y":2,"direction":1},"goal":{"x":2,"y":0},"wall":{"x":1,"y":1}}'::jsonb, '[]'::jsonb, 15, 15),

    ('loop-bridge',     'mundo-isla',   1, 'Inicio',     'loop-count',     'El puente', 'Cruza el puente',     'Repite avanzar para cruzar con precisión.', 'Usa el bloque «repetir» para que el robot cruce el puente.', 'ck_repeat',
     '{"start":{"x":0,"y":2,"direction":1},"goal":{"x":2,"y":2},"wall":null}'::jsonb, '[]'::jsonb, 10, 10),
    ('loop-zigzag',     'mundo-isla',   2, 'En camino',  'loop-count',     'El zigzag', 'Trayectoria en zigzag','Repite un patrón de avance y giro.', 'Crea un patrón con «repetir»: avanzar y girar a la izquierda.', 'ck_repeat',
     '{"start":{"x":0,"y":2,"direction":1},"goal":{"x":1,"y":1},"wall":null}'::jsonb, '[]'::jsonb, 15, 10),
    ('loop-garden',     'mundo-isla',   3, 'Explorador', 'loop-count',     'El jardín', 'Recorrido botánico',  'Combina repetir y girar para recorrer el jardín.', 'Usa «repetir» para avanzar por el sendero y luego gira hacia la meta.', 'ck_repeat',
     '{"start":{"x":0,"y":2,"direction":1},"goal":{"x":2,"y":1},"wall":null}'::jsonb, '[]'::jsonb, 20, 15),

    ('condition-detour','mundo-cueva',  1, 'Inicio',     'if-choice',      'El desvío', 'Rodea el muro',       'Decide qué hacer cuando aparece un obstáculo.', 'Usa «si hay pared» para elegir un camino libre hasta la meta.', 'ck_if_wall',
     '{"start":{"x":0,"y":0,"direction":1},"goal":{"x":2,"y":0},"wall":{"x":1,"y":0}}'::jsonb, '[]'::jsonb, 15, 10),
    ('condition-cave',  'mundo-cueva',  2, 'En camino',  'if-choice',      'La galería','Busca otra salida',   'Detecta el muro y encuentra la salida lateral.', 'Si el robot detecta una pared, hazlo girar y guíalo hasta la meta.', 'ck_if_wall',
     '{"start":{"x":2,"y":2,"direction":0},"goal":{"x":0,"y":0},"wall":{"x":2,"y":1}}'::jsonb, '[]'::jsonb, 15, 15),
    ('condition-river', 'mundo-cueva',  3, 'Explorador', 'if-choice',      'El canal',  'Encuentra el paso',   'Comprueba la condición y rodea el canal.', 'Al encontrar el borde del canal, gira y cruza hasta la meta.', 'ck_if_wall',
     '{"start":{"x":0,"y":0,"direction":2},"goal":{"x":2,"y":2},"wall":{"x":0,"y":1}}'::jsonb, '[]'::jsonb, 20, 20),

    ('debug-sequence',  'mundo-funciones', 1, 'Inicio',     'sequence-order', 'El giro equivocado',       'Encuentra el error',   'Revisa un programa que se desvía del camino.', 'El robot tiene un programa con un error. Prueba, encuentra el giro equivocado y corrígelo.', NULL,
     '{"start":{"x":0,"y":2,"direction":0},"goal":{"x":2,"y":0},"wall":null}'::jsonb,
     '[{"type":"ck_move"},{"type":"ck_turn_left"},{"type":"ck_move"}]'::jsonb, 15, 15),
    ('debug-loop',      'mundo-funciones', 2, 'En camino',  'loop-count',     'La repetición incompleta', 'Ajusta el bucle',      'Ajusta un bucle que se detiene antes de la meta.', 'El robot se queda corto. Revisa cuántas veces se repite el paso y corrige el programa.', 'ck_repeat',
     '{"start":{"x":0,"y":2,"direction":1},"goal":{"x":2,"y":2},"wall":null}'::jsonb,
     '[{"type":"ck_repeat","times":1,"body":[{"type":"ck_move"}]}]'::jsonb, 20, 15),
    ('debug-condition', 'mundo-funciones', 3, 'Explorador', 'if-choice',      'La decisión invertida',    'Corrige la decisión',  'Repara una condición que orienta al robot hacia el obstáculo.', 'Prueba el programa y cambia la acción del bloque «si hay pared» para tomar el desvío.', 'ck_if_wall',
     '{"start":{"x":0,"y":0,"direction":1},"goal":{"x":2,"y":0},"wall":{"x":1,"y":0}}'::jsonb,
     '[{"type":"ck_if_wall","body":[{"type":"ck_turn_left"}]},{"type":"ck_move"},{"type":"ck_move"}]'::jsonb, 25, 20)
ON CONFLICT (id) DO NOTHING;

-- Progreso de Sofi
INSERT INTO progreso_misiones_usuario (usuario_id, mision_id, estado, estrellas_ganadas, cantidad_intentos, ultima_evidencia, completada_en) VALUES
    ('11111111-1111-4111-8111-111111111101', 'sequence-forest',  'completada', 3, 1, 'Programa: al comenzar -> avanzar -> avanzar -> girar derecha -> avanzar -> avanzar', NOW() - INTERVAL '4 days'),
    ('11111111-1111-4111-8111-111111111101', 'sequence-city',    'completada', 2, 2, 'Programa: al comenzar -> avanzar -> girar derecha -> avanzar -> avanzar', NOW() - INTERVAL '3 days'),
    ('11111111-1111-4111-8111-111111111101', 'sequence-moon',    'completada', 3, 1, 'Programa: al comenzar -> avanzar -> avanzar -> girar izquierda -> avanzar -> avanzar', NOW() - INTERVAL '2 days'),
    ('11111111-1111-4111-8111-111111111101', 'loop-bridge',      'completada', 3, 1, 'Programa: al comenzar -> repetir 2 veces (avanzar)', NOW() - INTERVAL '1 day'),
    ('11111111-1111-4111-8111-111111111101', 'loop-zigzag',      'disponible', 0, 1, NULL, NULL),
    ('11111111-1111-4111-8111-111111111101', 'loop-garden',      'bloqueada',  0, 0, NULL, NULL),
    ('11111111-1111-4111-8111-111111111101', 'condition-detour', 'bloqueada',  0, 0, NULL, NULL),
    ('11111111-1111-4111-8111-111111111101', 'condition-cave',   'bloqueada',  0, 0, NULL, NULL),
    ('11111111-1111-4111-8111-111111111101', 'condition-river',  'bloqueada',  0, 0, NULL, NULL),
    ('11111111-1111-4111-8111-111111111101', 'debug-sequence',   'disponible', 0, 0, NULL, NULL),
    ('11111111-1111-4111-8111-111111111101', 'debug-loop',       'bloqueada',  0, 0, NULL, NULL),
    ('11111111-1111-4111-8111-111111111101', 'debug-condition',  'bloqueada',  0, 0, NULL, NULL)
ON CONFLICT (usuario_id, mision_id) DO UPDATE SET
    estado = EXCLUDED.estado,
    estrellas_ganadas = EXCLUDED.estrellas_ganadas;

-- Progreso de Mateo y Valeria
INSERT INTO progreso_misiones_usuario (usuario_id, mision_id, estado, estrellas_ganadas, cantidad_intentos, completada_en) VALUES
    ('11111111-1111-4111-8111-111111111102', 'sequence-forest',  'completada', 2, 3, NOW() - INTERVAL '1 day'),
    ('11111111-1111-4111-8111-111111111102', 'sequence-city',    'disponible', 0, 0, NULL),
    ('11111111-1111-4111-8111-111111111102', 'sequence-moon',    'bloqueada',  0, 0, NULL),
    ('11111111-1111-4111-8111-111111111103', 'sequence-forest',  'completada', 3, 1, NOW() - INTERVAL '7 days'),
    ('11111111-1111-4111-8111-111111111103', 'sequence-city',    'completada', 3, 1, NOW() - INTERVAL '6 days'),
    ('11111111-1111-4111-8111-111111111103', 'sequence-moon',    'completada', 3, 1, NOW() - INTERVAL '5 days'),
    ('11111111-1111-4111-8111-111111111103', 'loop-bridge',      'completada', 3, 1, NOW() - INTERVAL '4 days'),
    ('11111111-1111-4111-8111-111111111103', 'loop-zigzag',      'completada', 3, 1, NOW() - INTERVAL '3 days'),
    ('11111111-1111-4111-8111-111111111103', 'loop-garden',      'completada', 3, 2, NOW() - INTERVAL '2 days'),
    ('11111111-1111-4111-8111-111111111103', 'condition-detour', 'disponible', 0, 0, NULL)
ON CONFLICT (usuario_id, mision_id) DO NOTHING;

-- Insignias
INSERT INTO insignias_usuario (usuario_id, insignia_id) VALUES
    ('11111111-1111-4111-8111-111111111101', 'insignia-primer-codigo'),
    ('11111111-1111-4111-8111-111111111102', 'insignia-primer-codigo'),
    ('11111111-1111-4111-8111-111111111103', 'insignia-primer-codigo'),
    ('11111111-1111-4111-8111-111111111103', 'insignia-master-bucles')
ON CONFLICT DO NOTHING;

COMMIT;
