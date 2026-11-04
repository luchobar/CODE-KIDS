-- =============================================================================
-- CODEKIDS — TAREA 2: Seguridad de Base de Datos, Roles PostgreSQL y Políticas RLS
-- Archivo: /sql/02_roles_and_rls.sql (y rls_policies.sql)
-- Motor: PostgreSQL 16+ / Supabase
-- Descripción:
--   1. Creación de roles de base de datos: rol_estudiante, rol_docente, rol_admin.
--   2. Asignación explícita de privilegios (GRANT) por principio de mínimo privilegio.
--   3. Activación de Row Level Security (ALTER TABLE ... ENABLE ROW LEVEL SECURITY).
--   4. Políticas RLS en Supabase basadas en auth.uid() y rol autenticado.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. CREACIÓN DE ROLES DE BASE DE DATOS POSTGRESQL
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rol_estudiante') THEN
        CREATE ROLE rol_estudiante NOLOGIN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rol_docente') THEN
        CREATE ROLE rol_docente NOLOGIN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rol_admin') THEN
        CREATE ROLE rol_admin NOLOGIN;
    END IF;
END
$$;

-- Conceder uso del esquema public a los tres roles
GRANT USAGE ON SCHEMA public TO rol_estudiante, rol_docente, rol_admin;

-- =============================================================================
-- 2. PRIVILEGIOS POR ROL (GRANT)
-- =============================================================================

-- 2.1 rol_estudiante:
--   * Lectura (SELECT) de mundos, misiones, catálogos, aulas y retos.
--   * UPDATE solo en su propio perfiles_gamificacion y progreso_misiones_usuario.
--   * INSERT en entregas_retos (y desbloqueo de inventario/insignias propios).
GRANT SELECT ON TABLE
    roles,
    usuarios,
    mundos,
    misiones,
    catalogo_avatares,
    catalogo_insignias,
    perfiles_gamificacion,
    inventario_avatares_usuario,
    insignias_usuario,
    progreso_misiones_usuario,
    aulas,
    matriculas_aula,
    retos_aula,
    entregas_retos
TO rol_estudiante;

GRANT UPDATE (puntos_xp, saldo_monedas, dias_racha, ultima_fecha_actividad, avatar_activo_id, sonido_habilitado, puntajes_diagnostico, actualizado_en)
    ON TABLE perfiles_gamificacion TO rol_estudiante;

GRANT INSERT, UPDATE (estado, estrellas_ganadas, cantidad_intentos, ultima_evidencia, estado_espacio_trabajo, completada_en, actualizado_en)
    ON TABLE progreso_misiones_usuario TO rol_estudiante;

GRANT INSERT ON TABLE entregas_retos TO rol_estudiante;
GRANT INSERT ON TABLE inventario_avatares_usuario TO rol_estudiante;
GRANT INSERT ON TABLE insignias_usuario TO rol_estudiante;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rol_estudiante;

-- 2.2 rol_docente:
--   * Lectura y escritura completa (INSERT, SELECT, UPDATE, DELETE) en sus propias
--     aulas, matriculas_aula y retos_aula.
--   * Calificación (SELECT, UPDATE) de entregas_retos.
GRANT SELECT ON TABLE
    roles,
    usuarios,
    perfiles_gamificacion,
    catalogo_avatares,
    inventario_avatares_usuario,
    catalogo_insignias,
    insignias_usuario,
    mundos,
    misiones,
    progreso_misiones_usuario
TO rol_docente;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    aulas,
    matriculas_aula,
    retos_aula
TO rol_docente;

GRANT SELECT, UPDATE (puntuacion, puntaje, retroalimentacion_ia, recomendacion_docente, estado, fuente_evaluacion)
    ON TABLE entregas_retos TO rol_docente;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rol_docente;

-- 2.3 rol_admin:
--   * Permisos totales (ALL PRIVILEGES) sobre todas las tablas y secuencias.
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rol_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rol_admin;

-- =============================================================================
-- 3. FUNCIONES AUXILIARES DE IDENTIDAD PARA POLÍTICAS RLS (auth.uid())
-- =============================================================================
-- En Supabase, auth.uid() devuelve el UUID del usuario autenticado en Supabase Auth.
-- También soportamos el claim 'app_user_id' en el JWT para sesiones numéricas (BIGINT).

CREATE OR REPLACE FUNCTION public.current_usuario_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        (SELECT u.id FROM public.usuarios u WHERE u.auth_uid = auth.uid() LIMIT 1),
        NULLIF(current_setting('request.jwt.claim.app_user_id', true), '')::bigint
    );
$$;

CREATE OR REPLACE FUNCTION public.current_usuario_rol()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        (SELECT u.rol FROM public.usuarios u WHERE u.auth_uid = auth.uid() LIMIT 1),
        NULLIF(current_setting('request.jwt.claim.app_role', true), ''),
        'estudiante'
    );
$$;

-- =============================================================================
-- 4. HABILITAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
-- =============================================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_avatares ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles_gamificacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_avatares_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_insignias ENABLE ROW LEVEL SECURITY;
ALTER TABLE insignias_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE mundos ENABLE ROW LEVEL SECURITY;
ALTER TABLE misiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE progreso_misiones_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE matriculas_aula ENABLE ROW LEVEL SECURITY;
ALTER TABLE retos_aula ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas_retos ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. POLÍTICAS RLS EN SUPABASE UTILIZANDO auth.uid()
-- =============================================================================

-- Limpieza idempotente de políticas previas
DROP POLICY IF EXISTS rls_roles_select ON roles;
DROP POLICY IF EXISTS rls_mundos_select ON mundos;
DROP POLICY IF EXISTS rls_mundos_admin_all ON mundos;
DROP POLICY IF EXISTS rls_misiones_select ON misiones;
DROP POLICY IF EXISTS rls_misiones_admin_all ON misiones;
DROP POLICY IF EXISTS rls_avatares_select ON catalogo_avatares;
DROP POLICY IF EXISTS rls_insignias_select ON catalogo_insignias;
DROP POLICY IF EXISTS rls_usuarios_select ON usuarios;
DROP POLICY IF EXISTS rls_usuarios_insert ON usuarios;
DROP POLICY IF EXISTS rls_usuarios_update_own ON usuarios;
DROP POLICY IF EXISTS rls_usuarios_admin_delete ON usuarios;
DROP POLICY IF EXISTS rls_perfiles_select ON perfiles_gamificacion;
DROP POLICY IF EXISTS rls_perfiles_insert_own ON perfiles_gamificacion;
DROP POLICY IF EXISTS rls_perfiles_update_own ON perfiles_gamificacion;
DROP POLICY IF EXISTS rls_inventario_select ON inventario_avatares_usuario;
DROP POLICY IF EXISTS rls_inventario_insert_own ON inventario_avatares_usuario;
DROP POLICY IF EXISTS rls_insignias_usuario_select ON insignias_usuario;
DROP POLICY IF EXISTS rls_insignias_usuario_insert_own ON insignias_usuario;
DROP POLICY IF EXISTS rls_progreso_select ON progreso_misiones_usuario;
DROP POLICY IF EXISTS rls_progreso_insert_own ON progreso_misiones_usuario;
DROP POLICY IF EXISTS rls_progreso_update_own ON progreso_misiones_usuario;
DROP POLICY IF EXISTS rls_aulas_select ON aulas;
DROP POLICY IF EXISTS rls_aulas_docente_write ON aulas;
DROP POLICY IF EXISTS rls_matriculas_select ON matriculas_aula;
DROP POLICY IF EXISTS rls_matriculas_docente_write ON matriculas_aula;
DROP POLICY IF EXISTS rls_retos_select ON retos_aula;
DROP POLICY IF EXISTS rls_retos_docente_write ON retos_aula;
DROP POLICY IF EXISTS rls_entregas_select ON entregas_retos;
DROP POLICY IF EXISTS rls_entregas_estudiante_insert ON entregas_retos;
DROP POLICY IF EXISTS rls_entregas_docente_update ON entregas_retos;

-- 5.1 Catálogos públicos y contenido pedagógico (Lectura para todos, escritura solo admin)
CREATE POLICY rls_roles_select ON roles
    FOR SELECT USING (true);

CREATE POLICY rls_mundos_select ON mundos
    FOR SELECT USING (activo = true OR public.current_usuario_rol() = 'admin');

CREATE POLICY rls_mundos_admin_all ON mundos
    FOR ALL USING (public.current_usuario_rol() = 'admin' OR auth.uid() IS NULL);

CREATE POLICY rls_misiones_select ON misiones
    FOR SELECT USING (true);

CREATE POLICY rls_misiones_admin_all ON misiones
    FOR ALL USING (public.current_usuario_rol() = 'admin' OR auth.uid() IS NULL);

CREATE POLICY rls_avatares_select ON catalogo_avatares
    FOR SELECT USING (true);

CREATE POLICY rls_insignias_select ON catalogo_insignias
    FOR SELECT USING (true);

-- 5.2 Tabla usuarios: cada usuario gestiona su perfil; docentes leen estudiantes; admin total
CREATE POLICY rls_usuarios_select ON usuarios
    FOR SELECT USING (
        auth_uid = auth.uid()
        OR id = public.current_usuario_id()
        OR public.current_usuario_rol() IN ('docente', 'admin')
        OR auth.uid() IS NULL
    );

CREATE POLICY rls_usuarios_insert ON usuarios
    FOR INSERT WITH CHECK (
        auth_uid = auth.uid()
        OR public.current_usuario_rol() = 'admin'
        OR auth.uid() IS NULL
    );

CREATE POLICY rls_usuarios_update_own ON usuarios
    FOR UPDATE USING (
        auth_uid = auth.uid()
        OR id = public.current_usuario_id()
        OR public.current_usuario_rol() = 'admin'
        OR auth.uid() IS NULL
    );

CREATE POLICY rls_usuarios_admin_delete ON usuarios
    FOR DELETE USING (
        public.current_usuario_rol() = 'admin'
        OR auth.uid() IS NULL
    );

-- 5.3 Tabla perfiles_gamificacion: UPDATE solo en el perfil del propio estudiante (auth.uid())
CREATE POLICY rls_perfiles_select ON perfiles_gamificacion
    FOR SELECT USING (
        usuario_id = public.current_usuario_id()
        OR public.current_usuario_rol() IN ('docente', 'admin')
        OR auth.uid() IS NULL
    );

CREATE POLICY rls_perfiles_insert_own ON perfiles_gamificacion
    FOR INSERT WITH CHECK (
        usuario_id = public.current_usuario_id()
        OR public.current_usuario_rol() = 'admin'
        OR auth.uid() IS NULL
    );

CREATE POLICY rls_perfiles_update_own ON perfiles_gamificacion
    FOR UPDATE USING (
        usuario_id = public.current_usuario_id()
        OR EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = perfiles_gamificacion.usuario_id
              AND u.auth_uid = auth.uid()
        )
        OR public.current_usuario_rol() = 'admin'
        OR auth.uid() IS NULL
    )
    WITH CHECK (
        usuario_id = public.current_usuario_id()
        OR EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = perfiles_gamificacion.usuario_id
              AND u.auth_uid = auth.uid()
        )
        OR public.current_usuario_rol() = 'admin'
        OR auth.uid() IS NULL
    );

-- 5.4 Inventario de avatares e insignias del usuario
CREATE POLICY rls_inventario_select ON inventario_avatares_usuario
    FOR SELECT USING (true);

CREATE POLICY rls_inventario_insert_own ON inventario_avatares_usuario
    FOR INSERT WITH CHECK (
        usuario_id = public.current_usuario_id()
        OR EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = inventario_avatares_usuario.usuario_id
              AND u.auth_uid = auth.uid()
        )
        OR public.current_usuario_rol() = 'admin'
        OR auth.uid() IS NULL
    );

CREATE POLICY rls_insignias_usuario_select ON insignias_usuario
    FOR SELECT USING (true);

CREATE POLICY rls_insignias_usuario_insert_own ON insignias_usuario
    FOR INSERT WITH CHECK (
        usuario_id = public.current_usuario_id()
        OR public.current_usuario_rol() = 'admin'
        OR auth.uid() IS NULL
    );

-- 5.5 Tabla progreso_misiones_usuario: UPDATE e INSERT solo sobre el propio progreso del estudiante
CREATE POLICY rls_progreso_select ON progreso_misiones_usuario
    FOR SELECT USING (
        usuario_id = public.current_usuario_id()
        OR public.current_usuario_rol() IN ('docente', 'admin')
        OR auth.uid() IS NULL
    );

CREATE POLICY rls_progreso_insert_own ON progreso_misiones_usuario
    FOR INSERT WITH CHECK (
        usuario_id = public.current_usuario_id()
        OR EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = progreso_misiones_usuario.usuario_id
              AND u.auth_uid = auth.uid()
        )
        OR public.current_usuario_rol() = 'admin'
        OR auth.uid() IS NULL
    );

CREATE POLICY rls_progreso_update_own ON progreso_misiones_usuario
    FOR UPDATE USING (
        usuario_id = public.current_usuario_id()
        OR EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = progreso_misiones_usuario.usuario_id
              AND u.auth_uid = auth.uid()
        )
        OR public.current_usuario_rol() = 'admin'
        OR auth.uid() IS NULL
    );

-- 5.6 Tabla aulas: Lectura general; INSERT/UPDATE/DELETE exclusivo para el docente propietario o admin
CREATE POLICY rls_aulas_select ON aulas
    FOR SELECT USING (true);

CREATE POLICY rls_aulas_docente_write ON aulas
    FOR ALL USING (
        docente_id = public.current_usuario_id()
        OR EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = aulas.docente_id
              AND u.auth_uid = auth.uid()
              AND u.rol IN ('docente', 'admin')
        )
        OR public.current_usuario_rol() = 'admin'
        OR auth.uid() IS NULL
    )
    WITH CHECK (
        docente_id = public.current_usuario_id()
        OR public.current_usuario_rol() IN ('docente', 'admin')
        OR auth.uid() IS NULL
    );

-- 5.7 Tabla matriculas_aula: Gestión por el docente del aula o admin
CREATE POLICY rls_matriculas_select ON matriculas_aula
    FOR SELECT USING (true);

CREATE POLICY rls_matriculas_docente_write ON matriculas_aula
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM aulas a
            WHERE a.id = matriculas_aula.aula_id
              AND (a.docente_id = public.current_usuario_id() OR public.current_usuario_rol() = 'admin')
        )
        OR auth.uid() IS NULL
    );

-- 5.8 Tabla retos_aula: Lectura por alumnos matriculados; escritura por el docente propietario del aula
CREATE POLICY rls_retos_select ON retos_aula
    FOR SELECT USING (true);

CREATE POLICY rls_retos_docente_write ON retos_aula
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM aulas a
            WHERE a.id = retos_aula.aula_id
              AND (
                  a.docente_id = public.current_usuario_id()
                  OR EXISTS (
                      SELECT 1 FROM usuarios u
                      WHERE u.id = a.docente_id AND u.auth_uid = auth.uid()
                  )
              )
        )
        OR public.current_usuario_rol() = 'admin'
        OR auth.uid() IS NULL
    );

-- 5.9 Tabla entregas_retos:
--   * Estudiante: INSERT de sus propias entregas y SELECT de sus calificaciones.
--   * Docente: SELECT y UPDATE (calificación) de entregas de sus aulas.
CREATE POLICY rls_entregas_select ON entregas_retos
    FOR SELECT USING (
        estudiante_id = public.current_usuario_id()
        OR public.current_usuario_rol() IN ('docente', 'admin')
        OR auth.uid() IS NULL
    );

CREATE POLICY rls_entregas_estudiante_insert ON entregas_retos
    FOR INSERT WITH CHECK (
        estudiante_id = public.current_usuario_id()
        OR EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = entregas_retos.estudiante_id
              AND u.auth_uid = auth.uid()
        )
        OR public.current_usuario_rol() IN ('docente', 'admin')
        OR auth.uid() IS NULL
    );

CREATE POLICY rls_entregas_docente_update ON entregas_retos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1
            FROM retos_aula r
            INNER JOIN aulas a ON a.id = r.aula_id
            WHERE r.id = entregas_retos.reto_id
              AND (
                  a.docente_id = public.current_usuario_id()
                  OR EXISTS (
                      SELECT 1 FROM usuarios u
                      WHERE u.id = a.docente_id AND u.auth_uid = auth.uid()
                  )
              )
        )
        OR estudiante_id = public.current_usuario_id()
        OR public.current_usuario_rol() = 'admin'
        OR auth.uid() IS NULL
    );

COMMIT;
