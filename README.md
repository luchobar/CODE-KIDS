# 🚀 CodeKids — Plataforma Gamificada de Pensamiento Computacional y Programación

<p align="center">
  <img src="public/images/logo_horizontal.jpg" alt="CodeKids - Logotipo Oficial Horizontal" width="680" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.35);" />
</p>

<p align="center">
  <b>Aventura Educativa en Bloques y Python para Exploradores del Futuro</b><br>
  <i>Arquitectura Cliente/Servidor en 3 Capas · Modelo Relacional 3FN · Roles & RLS en PostgreSQL · SPA React + Vite</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PostgreSQL-16%2B-blue?logo=postgresql&logoColor=white" alt="PostgreSQL 16+" />
  <img src="https://img.shields.io/badge/Supabase-Backend%20RLS-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Express-5.3.0-lightgrey?logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/React-19.x%20%2B%20Vite-61DAFB?logo=react&logoColor=black" alt="React 19 + Vite" />
  <img src="https://img.shields.io/badge/Google%20Blockly-13.3.0-4285F4?logo=google&logoColor=white" alt="Blockly" />
  <img src="https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen" alt="Tests Passing" />
</p>

---

**CodeKids** es una plataforma educativa integral de aprendizaje diseñada para que estudiantes de básica primaria y secundaria desarrollen **pensamiento computacional**, programen mediante **bloques visuales (Google Blockly)** y avancen hacia **sintaxis de código en Python**, acompañados de un tutor robot interactivo (**Pipo**) y retroalimentación inteligente.

El proyecto implementa una **Arquitectura Cliente/Servidor en Tres Capas**, con persistencia en **PostgreSQL 16+ (Supabase)** normalizada en **Tercera Forma Normal (3FN)**, seguridad robusta por **Roles de Base de Datos y Políticas RLS**, endpoints RESTful con **CRUD Completo**, y un módulo de **Informes Analíticos Avanzados** con agregaciones y agrupamiento `HAVING`.

> 📘 **Guía de Sustentación:** Consulta [`GUIA_DEMOSTRACION_SEGUNDO_PARCIAL.md`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/GUIA_DEMOSTRACION_SEGUNDO_PARCIAL.md) para el libreto paso a paso del video de evaluación, justificación técnica y rúbrica de calificación.

---

## 📑 Tabla de Contenidos

0. [Rúbrica y Cumplimiento del Segundo Parcial](#-0-rúbrica-y-cumplimiento-del-segundo-parcial)
1. [Arquitectura por Capas (3-Tier Layered Architecture)](#-1-arquitectura-por-capas-3-tier-layered-architecture)
2. [Modelo Relacional Normalizado en 3FN (14 Tablas)](#-2-modelo-relacional-normalizado-en-3fn-14-tablas)
3. [Seguridad: Roles PostgreSQL y Políticas RLS](#-3-seguridad-roles-postgresql-y-políticas-rls)
4. [Capa de Negocio y CRUD Completo (INSERT, SELECT, UPDATE, DELETE)](#-4-capa-de-negocio-y-crud-completo)
5. [Módulo de Informes Analíticos Complejos (GROUP BY / HAVING)](#-5-módulo-de-informes-analíticos-complejos)
6. [Módulos Funcionales de la Plataforma](#-6-módulos-funcionales-de-la-plataforma)
7. [Arquitectura de Inteligencia Artificial Local (Ollama)](#-7-arquitectura-de-inteligencia-artificial-local-ollama)
8. [Stack Tecnológico y Estructura Limpia del Proyecto](#-8-stack-tecnológico-y-estructura-limpia-del-proyecto)
9. [Instalación, Configuración y Ejecución](#-9-instalación-configuración-y-ejecución)
10. [Referencia de Endpoints RESTful (API v1)](#-10-referencia-de-endpoints-restful-api-v1)

---

## 🏆 0. Rúbrica y Cumplimiento del Segundo Parcial

| Criterio de Evaluación | Ponderación | Estado | Evidencia en el Código |
| :--- | :---: | :---: | :--- |
| **1. Modelo Lógico y Relacional (3FN)** | 20% | ✅ Cumplido | **14 tablas normalizadas**, claves PK, FK, integridad referencial y restricciones de dominio en [`sql/01_schema_13_tables.sql`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/sql/01_schema_13_tables.sql). |
| **2. Arquitectura por Capas** | 15% | ✅ Cumplido | Separación estricta: **Presentación** (React SPA), **Lógica de Negocio** (Express Controllers y `src/services/`), **Acceso a Datos** (PostgreSQL / Supabase Pool). |
| **3. CRUD Completo** | 20% | ✅ Cumplido | `INSERT`, `SELECT`, `UPDATE` y `DELETE` implementados en API RESTful, servicios y UI (Matrículas, Retos, Entregas, Tienda y Perfiles). |
| **4. Módulos Funcionales** | 10% | ✅ Cumplido | Conexión total entre interfaz (Mapa de Misiones, Blockly, Laboratorio Python, Tienda de Avatares, Consola Docente) y la BD relacional. |
| **5. Informes Complejos** | 10% | ✅ Cumplido | Consultas analíticas SQL con `JOIN` múltiples, `GROUP BY`, `HAVING AVG < 3.0`, subconsultas, `COUNT` y `SUM` en [`sql/04_analytical_queries.sql`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/sql/04_analytical_queries.sql). |
| **6. Seguridad y Permisos de BD** | 20% | ✅ Cumplido | Roles `rol_estudiante`, `rol_docente`, `rol_admin` con privilegios `GRANT` + Políticas **Row Level Security (RLS)** con `auth.uid()` en [`sql/02_roles_and_rls.sql`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/sql/02_roles_and_rls.sql). |
| **7. Entregables Técnicos** | 5% | ✅ Cumplido | Scripts limpios y numerados en [`sql/`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/sql/): esquema DDL, RLS, datos semilla, informes, respaldo `backup.sql` y script `05_backup_command.sh`. |

---

## 🏛️ 1. Arquitectura por Capas (3-Tier Layered Architecture)

El sistema desacopla estrictamente las responsabilidades mediante el patrón arquitectónico clásico de tres niveles:

```mermaid
flowchart TD
    subgraph CapaPresentacion ["1. CAPA DE PRESENTACIÓN (Frontend SPA)"]
        UI_Nav["Navegación y Autenticación"]
        UI_Student["Modo Explorador (Mapa, Blockly, Python Lab)"]
        UI_Store["Tienda de Avatares y Colección"]
        UI_Teacher["Consola Docente (Aulas, Retos, Calificador)"]
        UI_Reports["Visor Interactivo SQL de Informes Analíticos"]
    end

    subgraph CapaNegocio ["2. CAPA DE LÓGICA DE NEGOCIO (Backend Express + Servicios)"]
        Router["Express Router (/api/v1/*)"]
        S_Users["users.service.js (Autenticación, HUD y Perfiles)"]
        S_Gamif["gamification.service.js (Misiones, XP, Tienda)"]
        S_Class["classroom.service.js (Aulas, Matrículas, Retos, Notas)"]
        S_Reports["reports.service.js (Consultas Analíticas SQL)"]
        S_AI["AI Controller (Tutor Pipo, Ollama Local)"]
    end

    subgraph CapaDatos ["3. CAPA DE ACCESO FÍSICO A DATOS (PostgreSQL 16+ en Supabase)"]
        Pool["db.client.js (Pool pg / Cliente Supabase)"]
        RLS["Políticas Row Level Security (auth.uid())"]
        Tables["14 Tablas Relacionales en 3FN con Triggers e Índices"]
    end

    CapaPresentacion -->|HTTP Fetch / JSON| Router
    Router --> S_Users & S_Gamif & S_Class & S_Reports & S_AI
    S_Users & S_Gamif & S_Class & S_Reports --> Pool
    Pool --> RLS --> Tables
```

1. **Capa de Presentación (`src/App.jsx`, `src/BlocklyMission.jsx`, `src/PythonMission.jsx`):**
   - React 19 SPA modular construida con Vite.
   - Panel del estudiante, editor de bloques interactivo, ejecutor de misiones, tienda y consola docente con visor SQL en vivo.
2. **Capa de Lógica de Negocio (`server/api/routes.js`, `src/services/`):**
   - Controladores RESTful organizados bajo `/api/v1/*`.
   - Servicios independientes (`users.service.js`, `gamification.service.js`, `classroom.service.js`, `reports.service.js`) con validación de reglas de negocio, balance de monedas, verificación de duplicados y transacciones.
3. **Capa de Acceso a Datos (`src/services/db.client.js`, `sql/`):**
   - Motor de persistencia PostgreSQL 16+ gestionado en Supabase con conexión mediante connection pooling transaccional y fallback pedagógico desacoplado.

---

## 🗄️ 2. Modelo Relacional Normalizado en 3FN (14 Tablas)

El diseño relacional elimina anomalías de inserción, actualización y borrado mediante la normalización estricta en **Tercera Forma Normal (3FN)**:

```mermaid
erDiagram
    ROLES ||--o{ USUARIOS : "1:N asigna"
    USUARIOS ||--o| PERFILES_GAMIFICACION : "1:1 tiene HUD"
    CATALOGO_AVATARES ||--o{ PERFILES_GAMIFICACION : "1:N equipa"
    USUARIOS ||--o{ INVENTARIO_AVATARES_USUARIO : "1:N adquiere"
    CATALOGO_AVATARES ||--o{ INVENTARIO_AVATARES_USUARIO : "1:N desbloquea"
    CATALOGO_INSIGNIAS ||--o{ INSIGNIAS_USUARIO : "1:N otorga"
    USUARIOS ||--o{ INSIGNIAS_USUARIO : "1:N gana"
    MUNDOS ||--o{ MISIONES : "1:N organiza"
    USUARIOS ||--o{ PROGRESO_MISIONES_USUARIO : "1:N registra"
    MISIONES ||--o{ PROGRESO_MISIONES_USUARIO : "1:N mide"
    USUARIOS ||--o{ AULAS : "1:N docente_crea"
    AULAS ||--o{ MATRICULAS_AULA : "1:N inscribe"
    USUARIOS ||--o{ MATRICULAS_AULA : "1:N es_estudiante"
    AULAS ||--o{ RETOS_AULA : "1:N publica"
    MISIONES ||--o{ RETOS_AULA : "1:N asocia"
    RETOS_AULA ||--o{ ENTREGAS_RETOS : "1:N recibe"
    USUARIOS ||--o{ ENTREGAS_RETOS : "1:N entrega"
```

### Catálogo de Tablas del Script DDL ([`sql/01_schema_13_tables.sql`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/sql/01_schema_13_tables.sql))

1. **`roles`**: Catálogo de perfiles del sistema (`estudiante`, `docente`, `administrador`).
2. **`usuarios`**: Cuentas con clave foránea `rol_id`, correo único (`citext`), contraseñas con hash criptográfico y auditoría.
3. **`perfiles_gamificacion`**: HUD del alumno (XP, monedas, días de racha, avatar activo) con clave primaria/foránea 1:1 `usuario_id`.
4. **`catalogo_avatares`**: Catálogo comercial de avatares (`astronaut`, `dragon`, `cat`, `robot`, `fox`, `unicorn`) con costo en monedas.
5. **`inventario_avatares_usuario`**: Tabla intermedia que desacopla la relación N:M de compras de avatares por usuario.
6. **`catalogo_insignias`**: Medallas desbloqueables (`primer_codigo`, `master_bucles`, `logica_acero`) con requisito de XP.
7. **`insignias_usuario`**: Relación N:M de insignias alcanzadas con timestamp de obtención.
8. **`mundos`**: Dimensiones curriculares (*El Bosque de las Secuencias*, *La Isla de los Bucles*, *La Cueva de las Decisiones*).
9. **`misiones`**: Retos pedagógicos vinculados a un mundo, con configuración JSON del tablero 3x3 y recompensas.
10. **`progreso_misiones_usuario`**: Trazabilidad de cada estudiante por misión (estado, 1 a 3 estrellas, intentos, evidencia serializada).
11. **`aulas`**: Cursos escolares creados por un docente (`5° A`, `6° B`) con código de acceso único.
12. **`matriculas_aula`**: Inscripción N:M de alumnos en aulas escolares con fecha de ingreso.
13. **`retos_aula`**: Tareas publicadas por el docente para un grupo específico asociadas a una misión.
14. **`entregas_retos`**: Envíos de soluciones de los estudiantes, calificación numérica (`0.0` a `5.0`), retroalimentación y estado de revisión.

---

## 🔐 3. Seguridad: Roles PostgreSQL y Políticas RLS

Configurado en [`sql/02_roles_and_rls.sql`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/sql/02_roles_and_rls.sql):

### 3.1 Roles de Base de Datos PostgreSQL
```sql
CREATE ROLE rol_estudiante NOLOGIN;
CREATE ROLE rol_docente NOLOGIN;
CREATE ROLE rol_admin NOLOGIN;
```
- **`rol_estudiante`:** Permisos de `SELECT` en mundos, misiones, catálogos y aulas matriculadas; `INSERT` en entregas de retos; `UPDATE` restringido a su propio perfil de gamificación y progreso.
- **`rol_docente`:** `SELECT`, `INSERT`, `UPDATE` y `DELETE` en sus aulas, retos asignados y calificación de entregas escolares de sus estudiantes.
- **`rol_admin`:** `ALL PRIVILEGES` para auditoría y gestión integral del sistema.

### 3.2 Políticas de Row Level Security (RLS), Seguridad por Columnas y Tratamiento Criptográfico
Todas las tablas cuentan con `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` y protección a nivel de columna sobre datos sensibles:
- **Protección de Columnas Sensibles (`REVOKE SELECT`):** Los roles `anon`, `authenticated`, `rol_estudiante` y `rol_docente` tienen revocado explícitamente el permiso de lectura sobre `contrasena_hash`, `intentos_fallidos` y `bloqueado_hasta` en la tabla `usuarios`, y disponen de la vista segura `public.vista_usuarios_publica`.
- **Hashing Criptográfico Real (`password.util.js` y `server/auth/crypto.js`):** La columna `contrasena_hash` almacena resúmenes criptográficos derivados mediante **PBKDF2-HMAC-SHA256** (`100,000` iteraciones, estándar Web Crypto API NIST SP 800-132) y **Argon2id** en el backend de seguridad, nunca texto plano.
- **Calibración RLS Dual (Nube Estricta vs. Sustentación Académica):** Las políticas RLS validan `auth.uid()` y `public.current_usuario_id()`, permitiendo conmutar entre modo estricto en nube (`ALTER DATABASE postgres SET app.allow_anon_demo = 'false'`) y modo de laboratorio controlado (`public.is_pedagogical_demo_context()`) sin exponer jamás `contrasena_hash`.

```sql
-- Estudiantes solo modifican su propio perfil de gamificación
CREATE POLICY rls_perfiles_update_own ON perfiles_gamificacion
  FOR UPDATE USING (
    usuario_id = public.current_usuario_id()
    OR public.current_usuario_rol() = 'admin'
    OR public.is_pedagogical_demo_context()
  );

-- Docentes gestionan exclusivamente las aulas que ellos crearon
CREATE POLICY rls_aulas_docente_write ON aulas
  FOR ALL USING (
    docente_id = public.current_usuario_id()
    OR public.current_usuario_rol() = 'admin'
    OR public.is_pedagogical_demo_context()
  );
```

---

## ⚡ 4. Capa de Negocio y CRUD Completo

La capa de servicios (`src/services/`) y los endpoints RESTful (`server/api/routes.js`) implementan explícitamente las operaciones requeridas por la rúbrica, siendo consumidos desde el frontend mediante `fetch('/api/v1/*')` con resiliencia offline/fallback:

```mermaid
flowchart LR
    subgraph CRUD ["Operaciones CRUD en Entidades Principales"]
        C["INSERT (Create)<br>• POST /api/v1/users<br>• POST /api/v1/classrooms/:aulaId/enrollments<br>• POST /api/v1/challenges<br>• POST /api/v1/store/purchase<br>• POST /api/v1/submissions"]
        R["SELECT (Read)<br>• GET /api/v1/students/:id/hud<br>• GET /api/v1/missions/map<br>• GET /api/v1/classrooms/:aulaId/ranking<br>• GET /api/v1/store/catalog"]
        U["UPDATE (Update)<br>• PATCH /api/v1/students/:id/rewards<br>• PATCH /api/v1/students/:id/avatar<br>• PATCH /api/v1/submissions/:id/grade<br>• PUT /api/v1/challenges/:id"]
        D["DELETE (Delete)<br>• DELETE /api/v1/classrooms/:aulaId/enrollments/:estudianteId<br>• DELETE /api/v1/challenges/:id<br>• DELETE /api/v1/users/:id"]
    end
```

### Métodos Reales de la Capa de Servicios (`src/services/`):
- **[`users.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/users.service.js):** `registerUserAccount`, `authenticateUserAccount`, `updateUserAccountPassword`, `getStudentHudProfile`, `deactivateUserAccount`.
- **[`gamification.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/gamification.service.js):** `listMapMissionsWithProgress`, `getAvatarStoreCatalog`, `purchaseStoreAvatar` (con validación estricta `saldo_monedas >= costo`), `updateRewardsAfterMission`, `changeActiveAvatar`.
- **[`classroom.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/classroom.service.js):** `enrollStudentInAula`, `unenrollStudentFromAula`, `getClassroomRanking`, `publishAulaChallenge`, `updateAulaChallenge`, `deleteAulaChallenge`, `submitChallengeDelivery`, `gradeStudentSubmission`.
- **[`reports.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/reports.service.js):** `getAtRiskStudentsReport`, `getHighRetryMissionsReport`, `getGamifiedEconomyReport`, `getAllAnalyticalReports`.

---

## 📊 5. Módulo de Informes Analíticos Complejos

Implementados en [`sql/04_analytical_queries.sql`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/sql/04_analytical_queries.sql) y expuestos vía `/api/v1/reports/*`:

### 1. Informe de Estudiantes en Riesgo Pedagógico (`HAVING AVG < 3.0`)
Identifica estudiantes cuyo promedio de calificaciones por aula se encuentra por debajo de 3.0 para intervención docente oportuna:
```sql
SELECT 
    a.nombre_grupo,
    u.nombre AS estudiante_nombre,
    COUNT(er.id) AS retos_entregados,
    ROUND(AVG(er.puntuacion), 2) AS promedio_calificacion,
    'EN_RIESGO_PEDAGOGICO' AS clasificacion
FROM entregas_retos er
INNER JOIN retos_aula ra ON ra.id = er.reto_id
INNER JOIN aulas a ON a.id = ra.aula_id
INNER JOIN usuarios u ON u.id = er.estudiante_id
GROUP BY a.id, a.nombre_grupo, u.id, u.nombre
HAVING AVG(er.puntuacion) < 3.0
ORDER BY promedio_calificacion ASC;
```

### 2. Informe de Desafíos con Mayor Tasa de Reintentos
Mide la dificultad de las misiones mediante el conteo de alumnos y el promedio de intentos:
```sql
SELECT 
    m.id AS mision_id,
    m.titulo_ejercicio,
    mun.titulo AS mundo,
    COUNT(pmu.usuario_id) AS total_estudiantes,
    ROUND(AVG(pmu.cantidad_intentos), 2) AS promedio_intentos
FROM misiones m
INNER JOIN mundos mun ON mun.id = m.mundo_id
INNER JOIN progreso_misiones_usuario pmu ON pmu.mision_id = m.id
GROUP BY m.id, m.titulo_ejercicio, mun.titulo
ORDER BY promedio_intentos DESC, total_estudiantes DESC;
```

### 3. Informe de Economía Gamificada y Tienda
Calcula el balance global de monedas acumuladas y los avatares adquiridos:
```sql
SELECT 
    u.id AS usuario_id,
    u.nombre,
    pg.puntos_xp,
    COALESCE(pg.saldo_monedas, 0) AS saldo_monedas,
    COUNT(iau.avatar_id) AS avatares_comprados
FROM usuarios u
INNER JOIN perfiles_gamificacion pg ON pg.usuario_id = u.id
LEFT JOIN inventario_avatares_usuario iau ON iau.usuario_id = u.id
WHERE u.rol_id = (SELECT id FROM roles WHERE nombre_rol = 'estudiante')
GROUP BY u.id, u.nombre, pg.puntos_xp, pg.saldo_monedas
ORDER BY pg.puntos_xp DESC;
```

---

## 🧩 6. Módulos Funcionales de la Plataforma

### 6.1 Modo Explorador (Experiencia del Estudiante)
- **HUD Superior Dinámico:** Visualización reactiva de XP, nivel ($\lfloor \text{XP}/100 \rfloor + 1$), días de racha consecutiva y saldo de monedas.
- **Mapa de Mundos y Misiones:** Desbloqueo progresivo a través de *El Bosque de las Secuencias*, *La Isla de los Bucles* y *La Cueva de las Decisiones*.
- **Motor Visual Blockly (`src/BlocklyMission.jsx`):** Cuadrícula 3x3 interactiva con ejecución paso a paso, detección de colisiones, límites de pasos y serialización de evidencia de código.
- **Laboratorio de Python (`src/PythonMission.jsx`):** Editor de texto asistido con validación de sangría estricta de 4 espacios y consola interactiva.
- **Tienda de Avatares:** Compra con validación de saldo en BD y equipamiento en tiempo real.

### 6.2 Consola Docente y Visor SQL (`TeacherDashboard`)
- **Gestión Escolar:** Creación de cursos (`5° A`, `6° B`) y seguimiento de matrículas.
- **Publicador y Editor de Retos:** Formulario CRUD con selección de plantillas pedagógicas Blockly.
- **Bandeja de Calificaciones:** Asignación de puntajes `0.0` a `5.0` con retroalimentación cualitativa.
- **Visor Interactivo SQL:** Pestaña con consola gráfica para ejecutar en vivo los 3 informes analíticos y el ranking del curso, visualizando la consulta SQL nativa y la tabla de resultados.

---

## 🤖 7. Arquitectura de Inteligencia Artificial Local (Ollama)

El servidor `server.js` incluye integración opcional con modelos de lenguaje locales:
- **Tutor Pipo Asistivo:** Pistas pedagógicas adaptadas al progreso del estudiante.
- **Evaluación Automatizada:** Análisis de la evidencia de bloques de las entregas escolares.
- **Recomendaciones Grupales:** Detección de falencias curriculares para el maestro.
- **Privacidad Local:** El procesamiento corre íntegramente en la máquina (`127.0.0.1:11434`) sin enviar información de menores a servicios en la nube.

---

## 🛠️ 8. Stack Tecnológico y Estructura Limpia del Proyecto

### Tecnologías Empleadas
- **Base de Datos:** PostgreSQL 16+ en Supabase con RLS habilitado.
- **Backend:** Node.js, Express `^5.3.0`, `pg` (node-postgres), `jsonwebtoken`, `argon2`.
- **Frontend:** React `^19.x`, Vite, Google Blockly `^13.3.0`, `@phosphor-icons/react`.
- **Testing:** Node Test Runner nativo (`node --test`).

### Estructura de Directorios

```text
CODE KIDS/
├── dist/                             # Compilación de producción generada por Vite
├── public/                           # Activos estáticos públicos
│   └── images/                       # Logos oficiales e ilustraciones 3D de mundos
├── server/                           # Backend Node.js / Express
│   ├── api/
│   │   ├── routes.js                 # Rutas RESTful (/api/v1/*) y controladores
│   │   └── __tests__/                # Pruebas automatizadas de CRUD y reportes
│   └── auth/                         # Middlewares de seguridad
├── sql/                              # Entregables Oficiales de Base de Datos
│   ├── 01_schema_13_tables.sql       # DDL completo de 14 tablas en 3FN
│   ├── 02_roles_and_rls.sql          # Creación de Roles y Políticas RLS
│   ├── 03_seed_data.sql              # Datos iniciales pedagógicos
│   ├── 04_analytical_queries.sql     # Consultas analíticas (GROUP BY, HAVING)
│   ├── 05_backup_command.sh          # Script de volcado pg_dump
│   └── backup.sql                    # Respaldo lógico completo en PostgreSQL
├── src/                              # Frontend React SPA y Capa de Servicios
│   ├── services/                     # Lógica de Negocio y Conexión Relacional 3FN
│   │   ├── db.client.js              # Pool de conexiones PostgreSQL / Supabase
│   │   ├── users.service.js          # CRUD de usuarios y HUD
│   │   ├── gamification.service.js   # CRUD de misiones, recompensas y tienda
│   │   ├── classroom.service.js      # CRUD de aulas, retos y calificaciones
│   │   ├── reports.service.js        # Ejecución de los informes analíticos
│   │   └── index.js                  # Exportación centralizada
│   ├── App.jsx                       # SPA principal con rutas y paneles
│   ├── supabase.js                   # Cliente Supabase JS SDK
│   ├── blocklyChallenges.js          # Catálogo de 12 retos Blockly
│   ├── BlocklyMission.jsx            # Componente de editor y simulador Blockly
│   ├── PythonMission.jsx             # Laboratorio de programación en Python
│   └── main.jsx                      # Punto de montaje React
├── GUIA_DEMOSTRACION_SEGUNDO_PARCIAL.md # Libreto oficial para el video y sustentación
├── README.md                         # Documentación general del repositorio
├── package.json                      # Dependencias y scripts
├── server.js                         # Servidor Express montado
└── vite.config.js                    # Configuración de compilador y proxy
```

---

## ⚙️ 9. Instalación, Configuración y Ejecución

### 1. Requisitos
- **Node.js:** Versión 18+ o superior.
- **npm:** Incluido con Node.js.

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Variables de Entorno (Opcional)
Copia `.env.example` como `.env` si deseas apuntar a una instancia remota de Supabase o PostgreSQL:
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-clave-anon
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
API_PORT=3001
```

### 4. Ejecución del Proyecto

- **Iniciar el Servidor Backend (API RESTful + Informes + Ollama):**
  ```bash
  npm run api
  ```
  *Servidor escuchando en `http://127.0.0.1:3001`.*

- **Iniciar la Aplicación Web (Frontend Vite SPA):**
  ```bash
  npm run dev
  ```
  *Abre la aplicación en `http://localhost:5173`.*

- **Ejecutar Pruebas Automatizadas de CRUD e Informes:**
  ```bash
  npm test
  ```
  *Ejecuta la suite con 4/4 pruebas aprobadas exitosamente.*

- **Compilar para Producción:**
  ```bash
  npm run build
  ```

---

## 🔌 10. Referencia de Endpoints RESTful (API v1)

Todos los endpoints están definidos en [`server/api/routes.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/server/api/routes.js) bajo el prefijo `/api/v1`:

| Método HTTP | Ruta Exacta (`server/api/routes.js`) | Parámetros (Path / Query / Body) | Códigos HTTP | Operación CRUD / Servicio |
| :---: | :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/users` | Body: `{ nombre, correo, contrasena, rol, avatar }` | `201`, `400` | **Create** (`registerUserAccount`) |
| `POST` | `/api/v1/users/login` | Body: `{ correo, contrasena, demoFallbacks }` | `200`, `400` | **Read / Auth** (`authenticateUserAccount`) |
| `PATCH` | `/api/v1/users/password` | Body: `{ correo, nuevaContrasena }` | `200`, `400` | **Update** (`updateUserAccountPassword`) |
| `POST` | `/api/v1/classrooms/:aulaId/enrollments` | Path: `:aulaId` · Body: `{ codigoGrupo, estudianteId }` | `201`, `400` | **Create** (`enrollStudentInAula`) |
| `POST` | `/api/v1/challenges` | Body: `{ aulaId, codigoGrupo, misionId, titulo, instrucciones, tematicaHabilidad }` | `201`, `400` | **Create** (`publishAulaChallenge`) |
| `POST` | `/api/v1/store/purchase` | Body: `{ usuarioId, avatarId, costo }` | `201`, `400` | **Create / Update** (`purchaseStoreAvatar`) |
| `POST` | `/api/v1/submissions` | Body: `{ retoId, estudianteId, puntuacion, puntaje, cantidadIntentos, logrado, textoEvidencia }` | `201`, `400` | **Create** (`submitChallengeDelivery`) |
| `GET` | `/api/v1/students/:id/hud` | Path: `:id` | `200`, `400` | **Read** (`getStudentHudProfile`) |
| `GET` | `/api/v1/missions/map` | Query: `?usuarioId` | `200`, `400` | **Read** (`listMapMissionsWithProgress`) |
| `GET` | `/api/v1/classrooms/:aulaId/ranking` | Path: `:aulaId` · Query: `?group` | `200`, `400` | **Read** (`getClassroomRanking`) |
| `GET` | `/api/v1/store/catalog` | Query: `?usuarioId` | `200`, `400` | **Read** (`getAvatarStoreCatalog`) |
| `PATCH` | `/api/v1/students/:id/rewards` | Path: `:id` · Body: `{ misionId, xpGanado, monedasGanadas, estrellas, intentos, evidencia }` | `200`, `400` | **Update** (`updateRewardsAfterMission`) |
| `PATCH` | `/api/v1/students/:id/avatar` | Path: `:id` · Body: `{ avatarId }` | `200`, `400` | **Update** (`changeActiveAvatar`) |
| `PATCH` | `/api/v1/submissions/:id/grade` | Path: `:id` · Body: `{ puntuacion, puntaje, retroalimentacionIa, recomendacionDocente }` | `200`, `400` | **Update** (`gradeStudentSubmission`) |
| `PUT` | `/api/v1/challenges/:id` | Path: `:id` · Body: `{ titulo, instrucciones, tematicaHabilidad, activo }` | `200`, `400` | **Update** (`updateAulaChallenge`) |
| `DELETE` | `/api/v1/classrooms/:aulaId/enrollments/:estudianteId` | Path: `:aulaId`, `:estudianteId` · Query: `?group` | `200`, `400` | **Delete** (`unenrollStudentFromAula`) |
| `DELETE` | `/api/v1/challenges/:id` | Path: `:id` | `200`, `400` | **Delete** (`deleteAulaChallenge`) |
| `DELETE` | `/api/v1/users/:id` | Path: `:id` · Query: `?hard=1` / Body: `{ hardDelete }` | `200`, `400` | **Delete** (`deactivateUserAccount`) |
| `GET` | `/api/v1/reports` | Query: `?group`, `?threshold` | `200`, `500` | **Read (Analítico)** (`getAllAnalyticalReports`) |
| `GET` | `/api/v1/reports/at-risk-students` | Query: `?group`, `?threshold` | `200`, `500` | **Informe 1:** `HAVING AVG(puntuacion) < 3.0` (`getAtRiskStudentsReport`) |
| `GET` | `/api/v1/reports/high-retry-missions` | Sin parámetros requeridos | `200`, `500` | **Informe 2:** Mayor tasa de reintentos (`getHighRetryMissionsReport`) |
| `GET` | `/api/v1/reports/gamified-economy` | Sin parámetros requeridos | `200`, `500` | **Informe 3:** Economía gamificada y tienda (`getGamifiedEconomyReport`) |

---

<p align="center">
  <b>CodeKids</b> — Desarrollado para la evaluación del Segundo Parcial de Arquitectura Cliente/Servidor.<br>
  Universidad · 2026
</p>
