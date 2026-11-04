-- =============================================================================
-- CODEKIDS — TAREA 3 y 5: Datos Semilla Pedagógicos e Iniciales (DML)
-- Archivo: /sql/03_seed_data.sql (y seed.sql)
-- Motor: PostgreSQL 16+ / Supabase
-- Descripción:
--   Población inicial de las 14 tablas normalizadas en 3FN incluyendo:
--   - Roles (estudiante, docente, admin)
--   - Usuarios (estudiantes, docentes y administrador)
--   - Catálogo de avatares, perfiles gamificados e inventario de tienda
--   - Catálogo de insignias y desbloqueos
--   - Mundos y 12+ misiones de pensamiento computacional
--   - Progreso de misiones con métricas reales de reintentos
--   - Aulas, matrículas, retos de aula y entregas con calificaciones 0.0-5.0
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. ROLES DEL SISTEMA (Tabla 1: roles)
-- -----------------------------------------------------------------------------
INSERT INTO roles (id, nombre_rol, descripcion) VALUES
    (1, 'estudiante', 'Estudiante explorador con acceso al mapa de misiones, tienda de avatares y entrega de retos.'),
    (2, 'docente',    'Docente titular con permisos de gestión sobre sus aulas, matrículas, retos y calificaciones.'),
    (3, 'admin',      'Administrador general de la plataforma con control total y acceso a auditoría y economía.')
ON CONFLICT (id) DO UPDATE
SET nombre_rol = EXCLUDED.nombre_rol,
    descripcion = EXCLUDED.descripcion;

-- -----------------------------------------------------------------------------
-- 2. CATÁLOGO DE AVATARES (Tabla 3: catalogo_avatares)
-- -----------------------------------------------------------------------------
INSERT INTO catalogo_avatares (id, nombre_visible, costo_monedas, tono_tema, descripcion, es_inicial) VALUES
    ('astronaut', 'Explorador Estelar', 0,  'blue',   'Traje espacial estándar para nuevas misiones.', TRUE),
    ('dragon',    'Dragón Chispa',      30, 'peach',  'Especialista en lógica y secuencias rápidas.', TRUE),
    ('cat',       'Gato Pixel',         30, 'lav',    'Observador preciso para depurar programas.', FALSE),
    ('robot',     'Unidad Rover',       40, 'mint',   'Diseñado para exploración autónoma por bloques.', TRUE),
    ('fox',       'Zorro Ágil',         50, 'yellow', 'Estratega en bucles y rutas óptimas.', TRUE),
    ('unicorn',   'Prisma Orbital',     60, 'blue',   'Compañero avanzado de laboratorio Python.', TRUE)
ON CONFLICT (id) DO UPDATE
SET nombre_visible = EXCLUDED.nombre_visible,
    costo_monedas = EXCLUDED.costo_monedas,
    tono_tema = EXCLUDED.tono_tema,
    descripcion = EXCLUDED.descripcion;

-- -----------------------------------------------------------------------------
-- 3. CATÁLOGO DE INSIGNIAS (Tabla 6: catalogo_insignias)
-- -----------------------------------------------------------------------------
INSERT INTO catalogo_insignias
    (id, codigo_insignia, nombre, titulo, descripcion, tematica_habilidad, icono_url, nombre_icono, requisito_xp)
VALUES
    ('insignia-primer-codigo', 'PRIMER_CODIGO', 'Primer código',   'Primer código',   'Completaste tu primera misión de programación por bloques.', 'Secuencias',    '/images/badges/primer-codigo.svg', 'Compass',           50),
    ('insignia-master-bucles', 'MASTER_BUCLES', 'Master bucles',   'Master bucles',   'Dominaste las tres etapas de La Isla de los Bucles.',        'Bucles',        '/images/badges/master-bucles.svg', 'SlidersHorizontal', 150),
    ('insignia-logica-acero',  'LOGICA_ACERO',  'Lógica de acero', 'Lógica de acero', 'Superaste todos los retos de La Cueva de las Decisiones.',   'Condicionales', '/images/badges/logica-acero.svg',  'Brain',             250),
    ('insignia-depurador-pro', 'DEPURADOR_PRO', 'Depurador Pro',   'Depurador Pro',   'Reparaste misiones con errores lógicos en el laboratorio.',  'Funciones',     '/images/badges/depurador-pro.svg', 'TerminalWindow',    300)
ON CONFLICT (id) DO UPDATE
SET codigo_insignia = EXCLUDED.codigo_insignia,
    nombre = EXCLUDED.nombre,
    titulo = EXCLUDED.titulo,
    requisito_xp = EXCLUDED.requisito_xp;

-- -----------------------------------------------------------------------------
-- 4. USUARIOS (Tabla 2: usuarios)
-- 1: Sofi | 2: Mateo | 3: Valeria | 4: Profe Alex | 5: Samuel | 6: Mariana | 7: Admin
-- -----------------------------------------------------------------------------
INSERT INTO usuarios
    (id, correo, nombre, rol, rol_id, contrasena_hash, correo_verificado_en, es_perfil_rapido, etiqueta_rapida, activo)
VALUES
    (1, 'sofi@codekids.edu.co',       'Sofi',        'estudiante', 1, 'CodeKids2026*', NOW(), TRUE,  'Nvl. 3 · Secuencias', TRUE),
    (2, 'mateo@codekids.edu.co',      'Mateo',       'estudiante', 1, 'CodeKids2026*', NOW(), TRUE,  'Nvl. 2 · Bucles',     TRUE),
    (3, 'valeria@codekids.edu.co',    'Valeria',     'estudiante', 1, 'CodeKids2026*', NOW(), TRUE,  'Nvl. 4 · Python',     TRUE),
    (4, 'alex.profe@codekids.edu.co', 'Profe Alex',  'docente',    2, 'CodeKids2026*', NOW(), TRUE,  'Docente · 5° A',      TRUE),
    (5, 'samuel@codekids.edu.co',     'Samuel',      'estudiante', 1, 'CodeKids2026*', NOW(), FALSE, 'Nvl. 1 · Inicio',     TRUE),
    (6, 'mariana@codekids.edu.co',    'Mariana',     'estudiante', 1, 'CodeKids2026*', NOW(), FALSE, 'Nvl. 2 · Secuencias', TRUE),
    (7, 'admin@codekids.edu.co',      'Admin Laura', 'admin',      3, 'CodeKids2026*', NOW(), FALSE, 'Administración',      TRUE)
ON CONFLICT (id) DO UPDATE
SET correo = EXCLUDED.correo,
    nombre = EXCLUDED.nombre,
    rol = EXCLUDED.rol,
    rol_id = EXCLUDED.rol_id,
    activo = EXCLUDED.activo;

ALTER TABLE usuarios ALTER COLUMN id RESTART WITH 8;

-- -----------------------------------------------------------------------------
-- 5. PERFILES DE GAMIFICACIÓN (Tabla 4: perfiles_gamificacion)
-- -----------------------------------------------------------------------------
INSERT INTO perfiles_gamificacion
    (usuario_id, puntos_xp, saldo_monedas, dias_racha, ultima_fecha_actividad, avatar_activo_id, sonido_habilitado, puntajes_diagnostico)
VALUES
    (1, 240, 65,  5, CURRENT_DATE, 'dragon',    TRUE, '{"Secuencias": 92, "Bucles": 68, "Condicionales": 75, "Descomposición": 70}'::jsonb),
    (2, 130, 40,  3, CURRENT_DATE, 'robot',     TRUE, '{"Secuencias": 70, "Bucles": 48, "Condicionales": 52, "Descomposición": 50}'::jsonb),
    (3, 360, 110, 9, CURRENT_DATE, 'fox',       TRUE, '{"Secuencias": 98, "Bucles": 95, "Condicionales": 88, "Descomposición": 90}'::jsonb),
    (5, 90,  25,  2, CURRENT_DATE, 'astronaut', TRUE, '{"Secuencias": 60, "Bucles": 42, "Condicionales": 50, "Descomposición": 45}'::jsonb),
    (6, 150, 50,  4, CURRENT_DATE, 'cat',       TRUE, '{"Secuencias": 78, "Bucles": 58, "Condicionales": 64, "Descomposición": 60}'::jsonb)
ON CONFLICT (usuario_id) DO UPDATE
SET puntos_xp = EXCLUDED.puntos_xp,
    saldo_monedas = EXCLUDED.saldo_monedas,
    dias_racha = EXCLUDED.dias_racha,
    avatar_activo_id = EXCLUDED.avatar_activo_id;

-- -----------------------------------------------------------------------------
-- 6. INVENTARIO DE AVATARES DE USUARIO (Tabla 5: inventario_avatares_usuario)
-- -----------------------------------------------------------------------------
INSERT INTO inventario_avatares_usuario (usuario_id, avatar_id) VALUES
    (1, 'astronaut'),
    (1, 'dragon'),
    (1, 'cat'),
    (2, 'astronaut'),
    (2, 'robot'),
    (3, 'astronaut'),
    (3, 'fox'),
    (3, 'unicorn'),
    (5, 'astronaut'),
    (6, 'astronaut'),
    (6, 'cat')
ON CONFLICT (usuario_id, avatar_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. INSIGNIAS DE USUARIO (Tabla 7: insignias_usuario)
-- -----------------------------------------------------------------------------
INSERT INTO insignias_usuario (usuario_id, insignia_id) VALUES
    (1, 'insignia-primer-codigo'),
    (2, 'insignia-primer-codigo'),
    (3, 'insignia-primer-codigo'),
    (3, 'insignia-master-bucles'),
    (3, 'insignia-logica-acero'),
    (6, 'insignia-primer-codigo')
ON CONFLICT (usuario_id, insignia_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. MUNDOS DEL MAPA (Tabla 8: mundos)
-- -----------------------------------------------------------------------------
INSERT INTO mundos (id, slug, orden_mundo, tematica_habilidad, titulo, subtitulo, tono_color, url_imagen_banner, activo) VALUES
    ('mundo-bosque',    'mundo-bosque',    1, 'Secuencias',    'El Bosque de las Secuencias',        'Guía a los robots por nuevos caminos paso a paso',      'forest', '/images/world-forest.png', TRUE),
    ('mundo-isla',      'mundo-isla',      2, 'Bucles',        'La Isla de los Bucles',              'Descubre patrones que se repiten para ahorrar energía', 'island', '/images/world-island.png', TRUE),
    ('mundo-cueva',     'mundo-cueva',     3, 'Condicionales', 'La Cueva de las Decisiones',         'Elige qué hacer ante cada obstáculo con sensores',      'cave',   '/images/world-cave.png',   TRUE),
    ('mundo-funciones', 'mundo-funciones', 4, 'Funciones',     'Estación de Funciones y Depuración', 'Repara módulos de código y domina rutinas avanzadas',   'forest', '/images/python-lab.png',   TRUE)
ON CONFLICT (id) DO UPDATE
SET titulo = EXCLUDED.titulo,
    tematica_habilidad = EXCLUDED.tematica_habilidad,
    activo = EXCLUDED.activo;

-- -----------------------------------------------------------------------------
-- 9. MISIONES INTERACTIVAS (Tabla 9: misiones)
-- -----------------------------------------------------------------------------
INSERT INTO misiones
    (id, slug, mundo_id, orden_etapa, nivel_dificultad, plantilla_id, nombre_corto, titulo_ejercicio, descripcion, instrucciones, bloque_requerido, configuracion_tablero, programa_semilla, recompensa_xp, recompensa_monedas)
VALUES
    ('sequence-forest',  'sequence-forest',  'mundo-bosque', 1, 'Inicio',     'sequence-order', 'El bosque', 'El viaje del robot',  'Ordena pasos y giros para llegar a la meta.', 'Arma una secuencia de bloques para llevar al robot hasta la meta.', NULL,
     '{"start":{"x":0,"y":2,"direction":0},"goal":{"x":2,"y":0},"wall":null}'::jsonb, '[]'::jsonb, 10, 10),
    ('sequence-city',    'sequence-city',    'mundo-bosque', 2, 'En camino',  'sequence-order', 'La ciudad', 'Cruza la ciudad',     'Planea una ruta alrededor de la estructura central.', 'Guía al robot por la ciudad y rodea el obstáculo central para alcanzar la meta.', NULL,
     '{"start":{"x":0,"y":1,"direction":0},"goal":{"x":2,"y":1},"wall":{"x":1,"y":1}}'::jsonb, '[]'::jsonb, 10, 10),
    ('sequence-moon',    'sequence-moon',    'mundo-bosque', 3, 'Explorador', 'sequence-order', 'La luna',   'Ruta lunar',          'Traza una ruta evitando el cráter central.', 'Programa el camino hasta la meta sin cruzar el cráter.', NULL,
     '{"start":{"x":0,"y":2,"direction":1},"goal":{"x":2,"y":0},"wall":{"x":1,"y":1}}'::jsonb, '[]'::jsonb, 15, 15),

    ('loop-bridge',      'loop-bridge',      'mundo-isla',   1, 'Inicio',     'loop-count',     'El puente', 'Cruza el puente',     'Repite avanzar para cruzar con precisión.', 'Usa el bloque «repetir» para que el robot cruce el puente.', 'ck_repeat',
     '{"start":{"x":0,"y":2,"direction":1},"goal":{"x":2,"y":2},"wall":null}'::jsonb, '[]'::jsonb, 10, 10),
    ('loop-zigzag',      'loop-zigzag',      'mundo-isla',   2, 'En camino',  'loop-count',     'El zigzag', 'Trayectoria en zigzag','Repite un patrón de avance y giro.', 'Crea un patrón con «repetir»: avanzar y girar a la izquierda.', 'ck_repeat',
     '{"start":{"x":0,"y":2,"direction":1},"goal":{"x":1,"y":1},"wall":null}'::jsonb, '[]'::jsonb, 15, 10),
    ('loop-garden',      'loop-garden',      'mundo-isla',   3, 'Explorador', 'loop-count',     'El jardín', 'Recorrido botánico',  'Combina repetir y girar para recorrer el jardín.', 'Usa «repetir» para avanzar por el sendero y luego gira hacia la meta.', 'ck_repeat',
     '{"start":{"x":0,"y":2,"direction":1},"goal":{"x":2,"y":1},"wall":null}'::jsonb, '[]'::jsonb, 20, 15),

    ('condition-detour', 'condition-detour', 'mundo-cueva',  1, 'Inicio',     'if-choice',      'El desvío', 'Rodea el muro',       'Decide qué hacer cuando aparece un obstáculo.', 'Usa «si hay pared» para elegir un camino libre hasta la meta.', 'ck_if_wall',
     '{"start":{"x":0,"y":0,"direction":1},"goal":{"x":2,"y":0},"wall":{"x":1,"y":0}}'::jsonb, '[]'::jsonb, 15, 10),
    ('condition-cave',   'condition-cave',   'mundo-cueva',  2, 'En camino',  'if-choice',      'La galería','Busca otra salida',   'Detecta el muro y encuentra la salida lateral.', 'Si el robot detecta una pared, hazlo girar y guíalo hasta la meta.', 'ck_if_wall',
     '{"start":{"x":2,"y":2,"direction":0},"goal":{"x":0,"y":0},"wall":{"x":2,"y":1}}'::jsonb, '[]'::jsonb, 15, 15),
    ('condition-river',  'condition-river',  'mundo-cueva',  3, 'Explorador', 'if-choice',      'El canal',  'Encuentra el paso',   'Comprueba la condición y rodea el canal.', 'Al encontrar el borde del canal, gira y cruza hasta la meta.', 'ck_if_wall',
     '{"start":{"x":0,"y":2,"direction":2},"goal":{"x":2,"y":2},"wall":{"x":0,"y":1}}'::jsonb, '[]'::jsonb, 20, 20),

    ('debug-sequence',   'debug-sequence',   'mundo-funciones', 1, 'Inicio',     'sequence-order', 'El giro equivocado',       'Encuentra el error',   'Revisa un programa que se desvía del camino.', 'El robot tiene un programa con un error. Prueba, encuentra el giro equivocado y corrígelo.', NULL,
     '{"start":{"x":0,"y":2,"direction":0},"goal":{"x":2,"y":0},"wall":null}'::jsonb,
     '[{"type":"ck_move"},{"type":"ck_turn_left"},{"type":"ck_move"}]'::jsonb, 15, 15),
    ('debug-loop',       'debug-loop',       'mundo-funciones', 2, 'En camino',  'loop-count',     'La repetición incompleta', 'Ajusta el bucle',      'Ajusta un bucle que se detiene antes de la meta.', 'El robot se queda corto. Revisa cuántas veces se repite el paso y corrige el programa.', 'ck_repeat',
     '{"start":{"x":0,"y":2,"direction":1},"goal":{"x":2,"y":2},"wall":null}'::jsonb,
     '[{"type":"ck_repeat","times":1,"body":[{"type":"ck_move"}]}]'::jsonb, 20, 15),
    ('debug-condition',  'debug-condition',  'mundo-funciones', 3, 'Explorador', 'if-choice',      'La decisión invertida',    'Corrige la decisión',  'Repara una condición que orienta al robot hacia el obstáculo.', 'Prueba el programa y cambia la acción del bloque «si hay pared» para tomar el desvío.', 'ck_if_wall',
     '{"start":{"x":0,"y":0,"direction":1},"goal":{"x":2,"y":0},"wall":{"x":1,"y":0}}'::jsonb,
     '[{"type":"ck_if_wall","body":[{"type":"ck_turn_left"}]},{"type":"ck_move"},{"type":"ck_move"}]'::jsonb, 25, 20)
ON CONFLICT (id) DO UPDATE
SET titulo_ejercicio = EXCLUDED.titulo_ejercicio,
    recompensa_xp = EXCLUDED.recompensa_xp,
    recompensa_monedas = EXCLUDED.recompensa_monedas;

-- -----------------------------------------------------------------------------
-- 10. PROGRESO DE MISIONES POR USUARIO (Tabla 10: progreso_misiones_usuario)
-- Incluye intentos variados para alimentar el Informe de Mayor Tasa de Reintentos
-- -----------------------------------------------------------------------------
INSERT INTO progreso_misiones_usuario
    (usuario_id, mision_id, estado, estrellas_ganadas, cantidad_intentos, ultima_evidencia, completada_en)
VALUES
    -- Sofi (ID 1)
    (1, 'sequence-forest',  'completada', 3, 1, 'Programa: al comenzar -> avanzar -> avanzar -> girar derecha -> avanzar -> avanzar', NOW() - INTERVAL '4 days'),
    (1, 'sequence-city',    'completada', 2, 2, 'Programa: al comenzar -> avanzar -> girar derecha -> avanzar -> avanzar', NOW() - INTERVAL '3 days'),
    (1, 'sequence-moon',    'completada', 3, 2, 'Programa: al comenzar -> avanzar -> avanzar -> girar izquierda -> avanzar -> avanzar', NOW() - INTERVAL '2 days'),
    (1, 'loop-bridge',      'completada', 3, 1, 'Programa: al comenzar -> repetir 2 veces (avanzar)', NOW() - INTERVAL '1 day'),
    (1, 'loop-zigzag',      'disponible', 0, 3, 'Intento parcial con bucle repetir', NULL),
    (1, 'debug-sequence',   'completada', 2, 4, 'Depuración de giro completada tras 4 pruebas', NOW() - INTERVAL '12 hours'),

    -- Mateo (ID 2)
    (2, 'sequence-forest',  'completada', 2, 3, 'Programa básico con 3 intentos', NOW() - INTERVAL '3 days'),
    (2, 'sequence-city',    'completada', 1, 4, 'Rodeó la ciudad tras 4 intentos', NOW() - INTERVAL '2 days'),
    (2, 'loop-bridge',      'disponible', 0, 5, 'Ajustando contador del bloque repetir', NULL),
    (2, 'condition-detour', 'disponible', 0, 4, 'Práctica con sensor si hay pared', NULL),
    (2, 'debug-loop',       'disponible', 0, 6, 'Reintentando ajuste del bucle en laboratorio', NULL),

    -- Valeria (ID 3)
    (3, 'sequence-forest',  'completada', 3, 1, 'Secuencia óptima al primer intento', NOW() - INTERVAL '7 days'),
    (3, 'sequence-city',    'completada', 3, 1, 'Secuencia óptima en ciudad', NOW() - INTERVAL '6 days'),
    (3, 'sequence-moon',    'completada', 3, 1, 'Ruta lunar impecable', NOW() - INTERVAL '5 days'),
    (3, 'loop-bridge',      'completada', 3, 1, 'Bucle puente perfecto', NOW() - INTERVAL '4 days'),
    (3, 'loop-zigzag',      'completada', 3, 2, 'Patrón zigzag completado', NOW() - INTERVAL '3 days'),
    (3, 'loop-garden',      'completada', 3, 2, 'Recorrido botánico superado', NOW() - INTERVAL '2 days'),
    (3, 'condition-detour', 'completada', 3, 2, 'Desvío condicional superado', NOW() - INTERVAL '1 day'),
    (3, 'debug-condition',  'completada', 3, 3, 'Condición invertida reparada', NOW() - INTERVAL '6 hours'),

    -- Samuel (ID 5)
    (5, 'sequence-forest',  'completada', 1, 4, 'Llegó a la meta en 4 intentos', NOW() - INTERVAL '2 days'),
    (5, 'loop-bridge',      'disponible', 0, 5, 'En progreso en puente de bucles', NULL),
    (5, 'debug-condition',  'disponible', 0, 5, 'Practicando depuración condicional', NULL),

    -- Mariana (ID 6)
    (6, 'sequence-forest',  'completada', 2, 2, 'Secuencia completada', NOW() - INTERVAL '3 days'),
    (6, 'sequence-city',    'completada', 2, 3, 'Ciudad completada', NOW() - INTERVAL '2 days'),
    (6, 'loop-zigzag',      'disponible', 0, 4, 'Practicando zigzag', NULL)
ON CONFLICT (usuario_id, mision_id) DO UPDATE
SET estado = EXCLUDED.estado,
    estrellas_ganadas = EXCLUDED.estrellas_ganadas,
    cantidad_intentos = EXCLUDED.cantidad_intentos,
    ultima_evidencia = EXCLUDED.ultima_evidencia;

-- -----------------------------------------------------------------------------
-- 11. AULAS ACADÉMICAS (Tabla 11: aulas)
-- -----------------------------------------------------------------------------
INSERT INTO aulas
    (id, docente_id, nombre_grupo, nombre, grado, codigo_acceso, codigo_grupo, anio_escolar)
VALUES
    (1, 4, 'Exploradores de Pensamiento Computacional 5° A', 'Exploradores de Pensamiento Computacional 5° A', '5° Primaria', '5° A', '5° A', 2026),
    (2, 4, 'Laboratorio de Algoritmos y Python 6° B',        'Laboratorio de Algoritmos y Python 6° B',        '6° Primaria', '6° B', '6° B', 2026)
ON CONFLICT (id) DO UPDATE
SET nombre_grupo = EXCLUDED.nombre_grupo,
    nombre = EXCLUDED.nombre,
    grado = EXCLUDED.grado;

ALTER TABLE aulas ALTER COLUMN id RESTART WITH 3;

-- -----------------------------------------------------------------------------
-- 12. MATRÍCULAS DE AULA (Tabla 12: matriculas_aula)
-- -----------------------------------------------------------------------------
INSERT INTO matriculas_aula (aula_id, estudiante_id) VALUES
    (1, 1), -- Sofi en 5° A
    (1, 2), -- Mateo en 5° A
    (1, 3), -- Valeria en 5° A
    (1, 5), -- Samuel en 5° A
    (2, 6)  -- Mariana en 6° B
ON CONFLICT (aula_id, estudiante_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 13. RETOS DE AULA (Tabla 13: retos_aula)
-- -----------------------------------------------------------------------------
INSERT INTO retos_aula
    (id, aula_id, mision_id, titulo, instrucciones, tematica_habilidad, fecha_limite, activo)
VALUES
    (1, 1, 'sequence-forest',  'Reto 1: Secuencia en el Bosque',       'Construye la secuencia exacta de pasos para guiar a Pipo hasta la estrella.', 'Secuencias',    NOW() + INTERVAL '7 days',  TRUE),
    (2, 1, 'loop-bridge',      'Reto 2: Cruza el Puente con Bucles',   'Usa el bloque repetir para cruzar el puente optimizando tus bloques.',        'Bucles',        NOW() + INTERVAL '10 days', TRUE),
    (3, 1, 'condition-detour', 'Reto 3: Sensor de Pared en la Cueva',  'Utiliza el condicional si hay pared para esquivar el obstáculo central.',     'Condicionales', NOW() + INTERVAL '14 days', TRUE),
    (4, 2, 'debug-loop',       'Reto 4: Depuración de Bucle en 6° B',  'Identifica por qué el robot se detiene antes y ajusta las repeticiones.',     'Bucles',        NOW() + INTERVAL '14 days', TRUE)
ON CONFLICT (id) DO UPDATE
SET titulo = EXCLUDED.titulo,
    instrucciones = EXCLUDED.instrucciones,
    activo = EXCLUDED.activo;

ALTER TABLE retos_aula ALTER COLUMN id RESTART WITH 5;

-- -----------------------------------------------------------------------------
-- 14. ENTREGAS DE RETOS (Tabla 14: entregas_retos)
-- Incluye calificaciones en escala 0.00-5.00 (puntuacion) y 0-100 (puntaje).
-- Mateo (ID 2) y Samuel (ID 5) tienen AVG(puntuacion) < 3.0 para demostrar
-- el Informe Analítico de Estudiantes en Riesgo Pedagógico.
-- -----------------------------------------------------------------------------
INSERT INTO entregas_retos
    (id, reto_id, estudiante_id, puntuacion, puntaje, cantidad_intentos, logrado, texto_evidencia, retroalimentacion_ia, recomendacion_docente, estado, fuente_evaluacion)
VALUES
    -- Sofi (Promedio: 4.30 -> Sobresaliente)
    (1, 1, 1, 4.50, 90, 1, TRUE,  'Orden: Inicio -> Avanzar -> Girar derecha -> Avanzar', '¡Excelente dominio de secuencias paso a paso!', 'Lista para avanzar a bucles con patrones.', 'calificado', 'ollama'),
    (2, 2, 1, 4.10, 82, 2, TRUE,  'Bloque repetir 4 veces (avanzar)',                     'Buen uso del bucle repetir para ahorrar bloques.', 'Practicar bucles anidados en el jardín.', 'calificado', 'ollama'),

    -- Mateo (Promedio: 2.35 < 3.0 -> En Riesgo Pedagógico)
    (3, 1, 2, 2.60, 52, 3, FALSE, 'Orden incompleto: Avanzar -> Girar izquierda',         'Casi llegas a la estrella; revisa el sentido del giro.', 'Acompañar con tarjetas físicas de lateralidad.', 'calificado', 'ollama'),
    (4, 2, 2, 2.10, 42, 4, FALSE, 'Bloque repetir 2 veces (se detuvo antes de la meta)',   'El bucle funciona, pero necesitas contar los pasos totales.', 'Reforzar conteo de casillas antes de programar el bucle.', 'calificado', 'ollama'),

    -- Valeria (Promedio: 4.85 -> Excelencia)
    (5, 1, 3, 4.90, 98, 1, TRUE,  'Secuencia óptima sin bloques redundantes',             '¡Ejecución impecable al primer intento!', 'Asignar reto adicional en Laboratorio Python.', 'calificado', 'ollama'),
    (6, 2, 3, 4.80, 96, 1, TRUE,  'Bloque repetir 4 veces con precisión',                 'Dominio total de iteración por bloques.', 'Invitar a liderar mentoría entre pares.', 'calificado', 'ollama'),

    -- Samuel (Promedio: 2.40 < 3.0 -> En Riesgo Pedagógico en 5° A)
    (7, 1, 5, 2.50, 50, 4, FALSE, 'Secuencia sin bloque de giro final',                   'Avanzaste bien en línea recta, falta el giro hacia la meta.', 'Guiar paso a paso el primer giro en el tablero.', 'calificado', 'ollama'),
    (8, 3, 5, 2.30, 46, 5, FALSE, 'Condicional sin acción dentro del bloque si hay pared', 'Detectaste el muro, ahora coloca el giro dentro del bloque condicional.', 'Repasar causa-efecto con ejemplos cotidianos.', 'calificado', 'ollama'),

    -- Mariana en 6° B (Promedio: 2.70 < 3.0 -> En Riesgo Pedagógico en 6° B)
    (9, 4, 6, 2.70, 54, 4, FALSE, 'Ajustó el bucle a 2 repeticiones en vez de 4',         'Vas por buen camino identificando el bucle a reparar.', 'Practicar trazado manual de iteraciones.', 'calificado', 'ollama')
ON CONFLICT (id) DO UPDATE
SET puntuacion = EXCLUDED.puntuacion,
    puntaje = EXCLUDED.puntaje,
    cantidad_intentos = EXCLUDED.cantidad_intentos,
    estado = EXCLUDED.estado;

ALTER TABLE entregas_retos ALTER COLUMN id RESTART WITH 10;

COMMIT;
