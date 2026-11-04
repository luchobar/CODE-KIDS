# 📘 GUÍA MAESTRA DE SUSTENTACIÓN Y DEMOSTRACIÓN — SEGUNDO PARCIAL CLIENTE/SERVIDOR
**Proyecto:** CODEKIDS — Plataforma Gamificada de Pensamiento Computacional  
**Stack Tecnológico:** PostgreSQL 16+ (Supabase) + Node.js (Express 5) + React 18 (Vite)  
**Calificación Objetivo:** 100% de la Rúbrica Oficial  

---

## 📋 ÍNDICE DE CONTENIDOS
1. [Credenciales Oficiales de Demostración](#1-credenciales-oficiales-de-demostración)
2. [PUNTO 1: Planteamiento del Problema y Justificación de Base de Datos (10%)](#punto-1-planteamiento-del-problema-y-justificación-de-bd-10)
3. [PUNTO 2: Modelo Lógico y Relacional Normalizado en 3FN (20%)](#punto-2-modelo-lógico-y-relacional-normalizado-en-3fn-20)
4. [PUNTO 3: Arquitectura por Capas Estricta (15%)](#punto-3-arquitectura-por-capas-estricta-15)
5. [PUNTO 4: Demostración del CRUD Completo en Vivo (20%)](#punto-4-demostración-del-crud-completo-en-vivo-20)
   - [4.1 Operaciones CREATE (INSERT)](#41-operaciones-create-insert)
   - [4.2 Operaciones READ (SELECT)](#42-operaciones-read-select)
   - [4.3 Operaciones UPDATE (UPDATE)](#43-operaciones-update-update)
   - [4.4 Operaciones DELETE (DELETE)](#44-operaciones-delete-delete)
6. [PUNTO 5: Módulos Funcionales y Conexión con Tablas (10%)](#punto-5-módulos-funcionales-y-conexión-con-tablas-10)
7. [PUNTO 6: Módulo de Informes Analíticos Complejos SQL (10%)](#punto-6-módulo-de-informes-analíticos-complejos-sql-10)
   - [Informe 1: Estudiantes en Riesgo Pedagógico (HAVING AVG < 3.0)](#informe-1-estudiantes-en-riesgo-pedagógico)
   - [Informe 2: Desafíos con Mayor Tasa de Reintentos](#informe-2-desafíos-con-mayor-tasa-de-reintentos)
   - [Informe 3: Economía Gamificada y Uso de Tienda](#informe-3-economía-gamificada-y-uso-de-tienda)
8. [PUNTO 7: Seguridad, Roles PostgreSQL y Políticas RLS](#punto-7-seguridad-roles-postgresql-y-políticas-rls)
9. [PUNTO 8: Guion Paso a Paso para el Video de YouTube (12 Puntos) (10%)](#punto-8-guion-paso-a-paso-para-el-video-de-youtube)
10. [PUNTO 9: Estructura del Archivo Comprimido Final (.ZIP) (5%)](#punto-9-estructura-del-archivo-comprimido-final-zip-5)

---

## 1. Credenciales Oficiales de Demostración

| Rol | Correo Electrónico | Contraseña de Sustentación | Hash Criptográfico en `usuarios.contrasena_hash` | Propósito en la Demostración |
| :--- | :--- | :--- | :--- | :--- |
| **Docente** | `alex.profe@codekids.edu.co` | `CodeKids2026*` | `pbkdf2_sha256$100000$codekids2026salt$25230955...` | Gestión de cursos, asignación de retos, calificación y consulta de informes analíticos. |
| **Estudiante 1** | `sofi@codekids.edu.co` | `CodeKids2026*` | `pbkdf2_sha256$100000$codekids2026salt$25230955...` | Estudiante sobresaliente (promedio alto, misiones superadas, XP acumulada). |
| **Estudiante 2** | `mateo@codekids.edu.co` | `CodeKids2026*` | `pbkdf2_sha256$100000$codekids2026salt$25230955...` | Estudiante en riesgo pedagógico (promedio < 3.0, reintentos altos) para demostrar Tarea 4. |
| **Estudiante 3** | `valeria@codekids.edu.co` | `CodeKids2026*` | `pbkdf2_sha256$100000$codekids2026salt$25230955...` | Estudiante avanzada en Python con compras en la tienda de avatares. |

> **Nota Criptográfica (`password.util.js` y `sql/03_seed_data.sql`):** Las contraseñas jamás se almacenan ni comparan en texto claro en el modelo relacional. El sistema aplica derivación criptográfica **PBKDF2-HMAC-SHA256** (`100,000` iteraciones, estándar NIST SP 800-132 vía Web Crypto API) en [`src/services/password.util.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/password.util.js) y **Argon2id** en [`server/auth/crypto.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/server/auth/crypto.js).

---

## PUNTO 1: Planteamiento del Problema y Justificación de BD (10%)

### ¿Qué evalúa el docente?
Que el software resuelva una necesidad real o simulada justificada y explique por qué no bastaba con guardar datos en memoria o archivos planos.

### ¿Cómo explicarlo en la sustentación / video?
> *"En la educación básica, enseñar programación sin una herramienta estructurada genera dos problemas graves: los estudiantes pierden la motivación porque no ven progreso continuo, y los docentes no tienen visibilidad de las dificultades lógicas individuales de cada alumno.*  
>  
> *CODEKIDS soluciona esta problemática mediante una plataforma gamificada donde los niños resuelven misiones de pensamiento computacional por bloques y código escrito. **Se requiere una base de datos relacional robusta** porque el sistema debe garantizar persistencia concurrente, integridad transaccional entre las compras de la tienda y el saldo de monedas, trazabilidad de intentos por misión y generación de analítica de rendimiento académico para los profesores."*

---

## PUNTO 2: Modelo Lógico y Relacional Normalizado en 3FN (20%)

### ¿Qué evalúa el docente?
Mínimo 12 tablas, existencia de Claves Primarias (`PK`), Claves Foráneas (`FK`), normalización en Tercera Forma Normal (3FN), integridad referencial y ausencia de tablas innecesarias o redundantes.

### ¿Cómo demostrarlo en el proyecto?
1. **Archivo en el código:** Muestra el script [`sql/01_schema_13_tables.sql`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/sql/01_schema_13_tables.sql).
2. **Explicación de las 14 tablas en 3FN:**
   - **Módulo de Usuarios y Seguridad:**
     1. `roles`: Catálogo atómico (`id`, `nombre_rol`, `descripcion`). Evita dependencias transitivas en `usuarios`.
     2. `usuarios`: Entidad central (`id`, `correo`, `nombre`, `rol`, `rol_id` [FK], `contrasena_hash`, `activo`).
   - **Módulo de Gamificación y Tienda:**
     3. `perfiles_gamificacion`: Relación 1:1 con `usuarios` (`usuario_id` [PK/FK], `puntos_xp`, `nivel_actual`, `saldo_monedas`, `dias_racha`, `avatar_activo_id` [FK]).
     4. `catalogo_avatares`: Catálogo de avatares disponibles (`id`, `nombre_visible`, `costo_monedas`, `tono_tema`).
     5. `inventario_avatares_usuario`: Tabla intermedia N:M (`usuario_id`, `avatar_id`, `desbloqueado_en`, PK compuesta).
     6. `catalogo_insignias`: Catálogo maestro de insignias (`id`, `codigo_insignia`, `nombre`, `requisito_xp`).
     7. `insignias_usuario`: Tabla intermedia N:M (`usuario_id`, `insignia_id`, `fecha_desbloqueo`, PK compuesta).
   - **Módulo de Aprendizaje y Misiones:**
     8. `mundos`: Mundos temáticos (`id`, `orden_mundo`, `tematica_habilidad`, `titulo`, `activo`).
     9. `misiones`: Desafíos interactivos (`id`, `mundo_id` [FK], `orden_etapa`, `titulo_ejercicio`, `configuracion_tablero`, `recompensa_xp`, `recompensa_monedas`).
     10. `progreso_misiones_usuario`: Historial de misiones (`usuario_id`, `mision_id`, `estado`, `estrellas_ganadas`, `cantidad_intentos`, `ultima_evidencia`, PK compuesta).
   - **Módulo Académico y Evaluación:**
     11. `aulas`: Salones creados por el docente (`id`, `docente_id` [FK], `nombre_grupo`, `grado`, `codigo_acceso`).
     12. `matriculas_aula`: Tabla intermedia N:M (`aula_id`, `estudiante_id`, `fecha_matricula`, PK compuesta).
     13. `retos_aula`: Retos escolares asignados (`id`, `aula_id` [FK], `mision_id` [FK], `titulo`, `fecha_limite`).
     14. `entregas_retos`: Entregas y notas (`id`, `reto_id` [FK], `estudiante_id` [FK], `puntuacion` [0.00–5.00], `puntaje` [0–100], `retroalimentacion_ia`, `estado`).
3. **Justificación 3FN:** Cada tabla contiene únicamente atributos dependientes de su clave primaria. No existen grupos repetitivos (1FN), todas las columnas dependen de la clave completa (2FN) y no hay dependencias transitivas entre atributos no clave (3FN).

---

## PUNTO 3: Arquitectura por Capas Estricta (15%)

### ¿Qué evalúa el docente?
Separación nítida entre la interfaz de usuario, las reglas de negocio y el acceso físico a los datos, sin código desorganizado ni consultas SQL quemadas en componentes visuales.

### ¿Cómo demostrarlo en el proyecto?

1. **Capa 1: Presentación (Frontend SPA):**
   - **Ruta:** [`src/App.jsx`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/App.jsx) y componentes [`BlocklyMission.jsx`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/BlocklyMission.jsx), [`PythonMission.jsx`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/PythonMission.jsx).
   - **Responsabilidad:** Renderizar las vistas (Mapa, Editor de Bloques, Consola Docente), capturar eventos de usuario y delegar las peticiones a la capa de servicios sin ejecutar SQL directamente.
2. **Capa 2: Lógica de Negocio y Controladores:**
   - **Ruta de Controladores:** [`server/api/routes.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/server/api/routes.js) montado en [`server.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/server.js).
   - **Ruta de Servicios:** Directorio [`src/services/`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/):
     - `users.service.js`: Registro, validación de contraseñas, cálculo de HUD.
     - `gamification.service.js`: Validación de fondos para comprar avatares, equipamiento de personajes y entrega de recompensas de XP.
     - `classroom.service.js`: Inscripción/desmatriculación de alumnos, asignación de retos y calificación en escala 0.0–5.0.
     - `reports.service.js`: Procesamiento analítico y filtrado de estudiantes en riesgo pedagógico.
3. **Capa 3: Acceso Físico a Datos (Persistencia):**
   - **Ruta:** [`src/services/db.client.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/db.client.js) y [`src/supabase.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/supabase.js).
   - **Responsabilidad:** Gestionar el pool de conexiones PostgreSQL (`pg.Pool`), llamadas al cliente oficial de Supabase (`@supabase/supabase-js`), ejecución de transacciones parametrizadas y aplicación de políticas de seguridad RLS.

---

## PUNTO 4: Demostración del CRUD Completo en Vivo (20%)

El docente exige ver **operaciones reales de INSERT, SELECT, UPDATE y DELETE** funcionando directamente desde la aplicación y transitando por la Capa de Negocio RESTful ([`server/api/routes.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/server/api/routes.js)).

### 4.1 Operaciones CREATE (INSERT)

| Entidad | Endpoint API REST (`server/api/routes.js`) | Parámetros y Códigos HTTP | Cómo hacerlo en la aplicación | Servicio y SQL que se ejecuta |
| :--- | :--- | :--- | :--- | :--- |
| **Registrar Usuario** | `POST /api/v1/users` | Body: `{ nombre, correo, contrasena, rol, avatar }`<br>Códigos: `201`, `400` | En la pantalla de inicio, ve a **"Crear cuenta"**, ingresa apodo `Carlos`, correo `carlos@codekids.edu.co`, contraseña `CodeKids2026*` y presiona **"Crear cuenta y comenzar"**. | [`users.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/users.service.js) (`registerUserAccount`)<br>`INSERT INTO usuarios ...`<br>`INSERT INTO perfiles_gamificacion ...` |
| **Matricular Estudiante** | `POST /api/v1/classrooms/:aulaId/enrollments` | Path: `:aulaId`<br>Body: `{ codigoGrupo, estudianteId }`<br>Códigos: `201`, `400` | Inicia como docente (`alex.profe@codekids.edu.co`). En **"Estudiantes en Base de Datos → Curso 5° A"**, pulsa **"Inscribir en 5° A"**. | [`classroom.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/classroom.service.js) (`enrollStudentInAula`)<br>`INSERT INTO matriculas_aula (aula_id, estudiante_id) VALUES ($1, $2);` |
| **Publicar Reto** | `POST /api/v1/challenges` | Body: `{ aulaId, codigoGrupo, misionId, titulo, instrucciones, tematicaHabilidad }`<br>Códigos: `201`, `400` | En la Consola Docente, ve a **"Asignar actividad"**, selecciona una misión, escribe un título y presiona **"Publicar actividad en 5° A"**. | [`classroom.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/classroom.service.js) (`publishAulaChallenge`)<br>`INSERT INTO retos_aula (aula_id, mision_id, titulo, ...) VALUES ...` |
| **Comprar Avatar** | `POST /api/v1/store/purchase` | Body: `{ usuarioId, avatarId, costo }`<br>Códigos: `201`, `400` (si `saldo_monedas < costo`) | Entra como Sofi (`sofi@codekids.edu.co`), abre la tienda en el HUD, selecciona un avatar (ej. *Unidad Rover*) y pulsa **"Desbloquear"**. | [`gamification.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/gamification.service.js) (`purchaseStoreAvatar`)<br>Valida `saldo_monedas >= costo`, debita costo exacto e `INSERT INTO inventario_avatares_usuario ...` |
| **Enviar Entrega** | `POST /api/v1/submissions` | Body: `{ retoId, estudianteId, puntuacion, puntaje, cantidadIntentos, logrado, textoEvidencia }`<br>Códigos: `201`, `400` | Como estudiante, abre un reto asignado, arma los bloques hasta la meta y pulsa **"Enviar al docente"**. | [`classroom.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/classroom.service.js) (`submitChallengeDelivery`)<br>`INSERT INTO entregas_retos ...` |

---

### 4.2 Operaciones READ (SELECT)

| Entidad | Endpoint API REST (`server/api/routes.js`) | Parámetros y Códigos HTTP | Cómo demostrarlo en la aplicación | Servicio y SQL que se ejecuta |
| :--- | :--- | :--- | :--- | :--- |
| **HUD de Estudiante** | `GET /api/v1/students/:id/hud` | Path: `:id`<br>Códigos: `200`, `400` | Al iniciar sesión con Sofi, muestra la barra superior con **puntos de XP**, **nivel**, **monedas disponibles** y **racha de días**. | [`users.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/users.service.js) (`getStudentHudProfile`)<br>`SELECT u.id, pg.puntos_xp, pg.nivel_actual, pg.saldo_monedas FROM usuarios u ...` |
| **Mapa de Misiones** | `GET /api/v1/missions/map` | Query: `?usuarioId`<br>Códigos: `200`, `400` | Navega por los mundos; cada etapa muestra si está disponible o completada con sus estrellas. | [`gamification.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/gamification.service.js) (`listMapMissionsWithProgress`)<br>`SELECT m.*, COALESCE(pmu.estado, 'disponible') FROM misiones m LEFT JOIN ...` |
| **Catálogo de Tienda** | `GET /api/v1/store/catalog` | Query: `?usuarioId`<br>Códigos: `200`, `400` | Abre la tienda de avatares. Muestra cómo el sistema lista los avatares e identifica cuáles ya fueron comprados (`desbloqueado = true`). | [`gamification.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/gamification.service.js) (`getAvatarStoreCatalog`)<br>`SELECT ca.*, CASE WHEN iau.avatar_id IS NOT NULL THEN TRUE ...` |
| **Ranking del Curso** | `GET /api/v1/classrooms/:aulaId/ranking` | Path: `:aulaId` · Query: `?group`<br>Códigos: `200`, `400` | En la Consola Docente, en la pestaña **"Ranking del Curso 5° A"**, muestra la lista ordenada por XP y misiones superadas. | [`classroom.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/classroom.service.js) (`getClassroomRanking`)<br>`SELECT ROW_NUMBER() OVER (...), u.nombre, pg.puntos_xp FROM ...` |
| **Informes Analíticos** | `GET /api/v1/reports`<br>`GET /api/v1/reports/at-risk-students`<br>`GET /api/v1/reports/high-retry-missions`<br>`GET /api/v1/reports/gamified-economy` | Query: `?group`, `?threshold`<br>Códigos: `200`, `500` | En la Consola Docente, abre el **"Módulo de Informes Analíticos SQL"** y cambia entre las pestañas. | [`reports.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/reports.service.js)<br>`getAllAnalyticalReports`, `getAtRiskStudentsReport`, `getHighRetryMissionsReport`, `getGamifiedEconomyReport` |

---

### 4.3 Operaciones UPDATE (UPDATE)

| Entidad | Endpoint API REST (`server/api/routes.js`) | Parámetros y Códigos HTTP | Cómo demostrarlo en la aplicación | Servicio y SQL que se ejecuta |
| :--- | :--- | :--- | :--- | :--- |
| **Recompensas tras Ganar Misión** | `PATCH /api/v1/students/:id/rewards` | Path: `:id`<br>Body: `{ misionId, xpGanado, monedasGanadas, estrellas, intentos, evidencia }`<br>Códigos: `200`, `400` | Completa una misión en el mapa. Al llegar a la estrella, el HUD sube inmediatamente **+10 XP** y **+10 monedas** en la BD. | [`gamification.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/gamification.service.js) (`updateRewardsAfterMission`)<br>`UPDATE perfiles_gamificacion SET puntos_xp = puntos_xp + $1, saldo_monedas = saldo_monedas + $2 ...` |
| **Cambiar Avatar Activo** | `PATCH /api/v1/students/:id/avatar` | Path: `:id`<br>Body: `{ avatarId }`<br>Códigos: `200`, `400` | En la tienda, haz clic en **"Elegir"** sobre cualquier avatar ya comprado. El personaje del HUD cambia de inmediato. | [`gamification.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/gamification.service.js) (`changeActiveAvatar`)<br>`UPDATE perfiles_gamificacion SET avatar_activo_id = $1 ...` |
| **Editar Reto Escolar** | `PUT /api/v1/challenges/:id` | Path: `:id`<br>Body: `{ titulo, instrucciones, tematicaHabilidad, activo }`<br>Códigos: `200`, `400` | En la Consola Docente, pulsa **"Editar"** en un reto, cambia el título o instrucciones y pulsa **"Guardar UPDATE"**. | [`classroom.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/classroom.service.js) (`updateAulaChallenge`)<br>`UPDATE retos_aula SET titulo = $1, instrucciones = $2 WHERE id = $3;` |
| **Calificar Entrega** | `PATCH /api/v1/submissions/:id/grade` | Path: `:id`<br>Body: `{ puntuacion, puntaje, retroalimentacionIa, recomendacionDocente }`<br>Códigos: `200`, `400` | En **"Respuestas del grupo"**, haz clic en **"Calificar / Editar nota"**, ajusta la nota y pulsa **"Guardar Calificación (UPDATE)"**. | [`classroom.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/classroom.service.js) (`gradeStudentSubmission`)<br>`UPDATE entregas_retos SET puntuacion = $1, puntaje = $2, recomendacion_docente = $3 WHERE id = $4;` |

---

### 4.4 Operaciones DELETE (DELETE)

| Entidad | Endpoint API REST (`server/api/routes.js`) | Parámetros y Códigos HTTP | Cómo demostrarlo en la aplicación | Servicio y SQL que se ejecuta |
| :--- | :--- | :--- | :--- | :--- |
| **Dar de Baja Matrícula** | `DELETE /api/v1/classrooms/:aulaId/enrollments/:estudianteId` | Path: `:aulaId`, `:estudianteId`<br>Query: `?group`<br>Códigos: `200`, `400` | En **"Estudiantes en Base de Datos"**, pulsa *"Inscrito en 5° A (Retirar)"*. El alumno se desvincula del aula sin borrar su cuenta. | [`classroom.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/classroom.service.js) (`unenrollStudentFromAula`)<br>`DELETE FROM matriculas_aula WHERE aula_id = $1 AND estudiante_id = $2;` |
| **Eliminar Reto Asignado** | `DELETE /api/v1/challenges/:id` | Path: `:id`<br>Códigos: `200`, `400` | En la lista de retos de la Consola Docente, pulsa el botón **"Eliminar"**. El reto desaparece de la base de datos. | [`classroom.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/classroom.service.js) (`deleteAulaChallenge`)<br>`DELETE FROM retos_aula WHERE id = $1;` |
| **Desactivar / Eliminar Cuenta** | `DELETE /api/v1/users/:id` | Path: `:id`<br>Query: `?hard=1` / Body: `{ hardDelete }`<br>Códigos: `200`, `400` | Vía endpoint `DELETE /api/v1/users/:id`, se marca `activo = FALSE` (o borrado físico con `?hard=1`), respetando la integridad histórica. | [`users.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/users.service.js) (`deactivateUserAccount`)<br>`UPDATE usuarios SET activo = FALSE WHERE id = $1;` |

---

## PUNTO 5: Módulos Funcionales y Conexión con Tablas (10%)

En la página 5 del documento oficial se exige explicar la relación módulo-tablas. Aquí tienes la explicación exacta:

### Módulo 1: Mapa de Aprendizaje y Motor de Misiones (Blockly / Python)
- **Objetivo:** Permitir que los estudiantes exploren mundos interactivos, armen secuencias de bloques o escriban código Python para resolver retos con retroalimentación inmediata.
- **Actor:** Estudiante.
- **Tablas involucradas:** `mundos`, `misiones`, `progreso_misiones_usuario`.
- **Operaciones:** `SELECT` para renderizar el tablero del laberinto; `INSERT/UPDATE` para persistir estrellas ganadas, evidencia del código e intentos.

### Módulo 2: Tienda de Avatares y Economía Gamificada
- **Objetivo:** Fomentar la perseverancia mediante recompensas de monedas que permiten adquirir y equipar nuevos personajes.
- **Actor:** Estudiante.
- **Tablas involucradas:** `catalogo_avatares`, `inventario_avatares_usuario`, `perfiles_gamificacion`.
- **Operaciones:** `SELECT` del catálogo; `INSERT` en inventario al comprar; `UPDATE` para restar monedas y actualizar el `avatar_activo_id`.

### Módulo 3: Gestión de Aulas y Matrículas Escolares
- **Objetivo:** Organizar a los estudiantes por grados escolares y grupos académicos.
- **Actor:** Docente.
- **Tablas involucradas:** `aulas`, `usuarios`, `matriculas_aula`.
- **Operaciones:** `SELECT` de estudiantes registrados; `INSERT` al crear cursos o matricular alumnos; `DELETE` al retirar un alumno del curso.

### Módulo 4: Evaluación de Retos y Consola Pedagógica
- **Objetivo:** Publicar retos curriculares específicos, recibir entregas de código y asignar calificaciones cuantitativas (0.0–5.0) y cualitativas.
- **Actores:** Docente y Estudiante.
- **Tablas involucradas:** `retos_aula`, `entregas_retos`, `usuarios`, `misiones`.
- **Operaciones:** `INSERT` de reto por el docente; `INSERT` de entrega por el alumno; `UPDATE` de calificación y retroalimentación docente.

---

## PUNTO 6: Módulo de Informes Analíticos Complejos SQL (10%)

### ¿Qué evalúa el docente?
Consultas SQL analíticas que **no se limiten a un simple `SELECT * FROM tabla`**, sino que involucren **múltiples JOINs, GROUP BY, cláusulas HAVING, subconsultas y funciones de agregación (`AVG`, `COUNT`, `SUM`, `MIN`, `MAX`)**.

### ¿Cómo demostrarlo en la aplicación?
Inicia sesión como docente (`alex.profe@codekids.edu.co`). Desplázate hacia abajo hasta el componente interactivo **"MÓDULO DE INFORMES ANALÍTICOS SQL"** y pulsa el botón **"Ver sentencia SQL"** para que el docente vea el código ejecutado en tiempo real.

```
┌────────────────────────────────────────────────────────────────────────┐
│ MÓDULO DE INFORMES ANALÍTICOS SQL (TAREA 4 · 3FN)                      │
│ [Ver sentencia SQL] [Actualizar consultas SQL]                         │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ [1. Riesgo Pedagógico HAVING AVG < 3.0] [2. Mayor Tasa Reintentos] │ │
│ │ [3. Economía Gamificada y Tienda]       [4. Ranking del Curso]     │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

#### Informe 1: Estudiantes en Riesgo Pedagógico
- **Propósito:** Detectar automáticamente estudiantes que requieren apoyo o refuerzo porque su promedio de calificaciones en retos es inferior a 3.0 sobre 5.0.
- **Sentencia SQL Ejecutada:**
  ```sql
  SELECT
      a.id AS aula_id,
      a.codigo_grupo AS codigo_aula,
      a.nombre_grupo AS nombre_aula,
      u.id AS estudiante_id,
      u.nombre AS estudiante_nombre,
      u.correo AS estudiante_correo,
      COUNT(er.id) AS total_entregas_evaluadas,
      ROUND(AVG(er.puntuacion), 2) AS promedio_puntuacion,
      ROUND(AVG(er.puntaje), 1) AS promedio_porcentaje,
      MIN(er.puntuacion) AS nota_minima,
      MAX(er.puntuacion) AS nota_maxima,
      SUM(er.cantidad_intentos) AS intentos_en_retos,
      COALESCE((
          SELECT ROUND(AVG(pmu.cantidad_intentos), 2)
          FROM progreso_misiones_usuario pmu
          WHERE pmu.usuario_id = u.id
      ), 0) AS promedio_intentos_mapa,
      CASE
          WHEN AVG(er.puntuacion) < 2.5 THEN 'Riesgo Alto - Intervención Inmediata'
          ELSE 'Riesgo Moderado - Refuerzo Guiado'
      END AS nivel_alerta_pedagogica
  FROM usuarios u
  INNER JOIN matriculas_aula ma ON ma.estudiante_id = u.id
  INNER JOIN aulas a            ON a.id = ma.aula_id
  INNER JOIN entregas_retos er  ON er.estudiante_id = u.id
  INNER JOIN retos_aula ra      ON ra.id = er.reto_id AND ra.aula_id = a.id
  WHERE u.rol = 'estudiante' AND u.activo = TRUE
  GROUP BY a.id, a.codigo_grupo, a.nombre_grupo, u.id, u.nombre, u.correo
  HAVING AVG(er.puntuacion) < 3.0
  ORDER BY promedio_puntuacion ASC;
  ```
- **Datos visibles en la demo:** Muestra a `Mateo` (promedio 2.35) y a `Samuel` (promedio 2.40) clasificados con alerta de refuerzo pedagógico.

#### Informe 2: Desafíos con Mayor Tasa de Reintentos
- **Propósito:** Analizar la complejidad del currículo identificando cuáles ejercicios provocan más fallos o reintentos antes de ser completados.
- **Sentencia SQL Ejecutada:**
  ```sql
  SELECT
      m.id AS mision_id,
      m.titulo_ejercicio,
      w.titulo AS mundo_titulo,
      w.tematica_habilidad AS habilidad,
      COUNT(pmu.usuario_id) AS estudiantes_que_intentaron,
      SUM(pmu.cantidad_intentos) AS total_intentos_acumulados,
      ROUND(AVG(pmu.cantidad_intentos), 2) AS promedio_intentos,
      MAX(pmu.cantidad_intentos) AS maximo_intentos_registrado,
      ROUND((SUM(GREATEST(pmu.cantidad_intentos - 1, 0))::numeric / COUNT(pmu.usuario_id)), 2) AS tasa_reintentos_por_estudiante
  FROM misiones m
  INNER JOIN mundos w                      ON w.id = m.mundo_id
  INNER JOIN progreso_misiones_usuario pmu ON pmu.mision_id = m.id
  WHERE pmu.cantidad_intentos > 0
  GROUP BY m.id, m.titulo_ejercicio, w.titulo, w.tematica_habilidad
  HAVING AVG(pmu.cantidad_intentos) >= 1.0
  ORDER BY promedio_intentos DESC;
  ```

#### Informe 3: Economía Gamificada y Uso de Tienda
- **Propósito:** Auditoría administrativa de la masa monetaria en circulación, inversión en avatares y nivel de progreso por estudiante.
- **Sentencia SQL Ejecutada:**
  ```sql
  SELECT
      u.id AS usuario_id,
      u.nombre AS estudiante,
      pg.nivel_actual,
      pg.puntos_xp,
      pg.saldo_monedas AS saldo_monedas_actual,
      COUNT(iau.avatar_id) AS total_avatares_desbloqueados,
      COALESCE(SUM(ca.costo_monedas), 0) AS monedas_invertidas_en_tienda,
      (COALESCE(pg.saldo_monedas, 0) + COALESCE(SUM(ca.costo_monedas), 0)) AS riqueza_total_generada
  FROM usuarios u
  LEFT JOIN perfiles_gamificacion pg        ON pg.usuario_id = u.id
  LEFT JOIN inventario_avatares_usuario iau ON iau.usuario_id = u.id
  LEFT JOIN catalogo_avatares ca            ON ca.id = iau.avatar_id
  WHERE u.rol = 'estudiante'
  GROUP BY u.id, u.nombre, pg.nivel_actual, pg.puntos_xp, pg.saldo_monedas;
  ```

---

## PUNTO 7: Seguridad, Roles PostgreSQL y Políticas RLS

### ¿Qué evalúa el docente?
Configuración formal de roles en el motor de base de datos (`rol_estudiante`, `rol_docente`, `rol_admin`), privilegios `GRANT` mínimos, protección de columnas sensibles frente a claves públicas (`SUPABASE_ANON_KEY`) y políticas de **Row Level Security (RLS)** activadas para que ningún usuario acceda a datos que no le corresponden.

### ¿Cómo demostrarlo en el proyecto?
Abre [`sql/02_roles_and_rls.sql`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/sql/02_roles_and_rls.sql):
1. **Roles y Privilegios a Nivel de Tabla y Columna (`GRANT` / `REVOKE`):**
   - `rol_estudiante`: Permisos de `SELECT` en mundos y misiones; permiso de `UPDATE` **únicamente sobre sus propias columnas** de `perfiles_gamificacion` y `progreso_misiones_usuario`.
   - `rol_docente`: Permisos de escritura (`INSERT`, `SELECT`, `UPDATE`, `DELETE`) en sus aulas y retos, y permiso de calificación sobre entregas.
   - `rol_admin`: Permiso total (`ALL PRIVILEGES`).
2. **Protección de Columnas Sensibles frente a `SUPABASE_ANON_KEY` (Justificación Técnica):**
   - En [`sql/02_roles_and_rls.sql`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/sql/02_roles_and_rls.sql) se ejecuta explícitamente:
     ```sql
     REVOKE SELECT ON TABLE usuarios FROM PUBLIC, rol_estudiante, rol_docente;
     GRANT SELECT (id, auth_uid, correo, nombre, rol, rol_id, correo_verificado_en,
                   es_perfil_rapido, etiqueta_rapida, activo, ultimo_acceso_en,
                   creado_en, actualizado_en)
     ON TABLE usuarios TO rol_estudiante, rol_docente;
     ```
   - Adicionalmente, cuando se ejecuta en Supabase Cloud, el bloque `DO $$` revoca la lectura de `contrasena_hash`, `intentos_fallidos` y `bloqueado_hasta` para los roles `anon` y `authenticated`, y expone la vista segura `public.vista_usuarios_publica`. Así, **ninguna consulta anónima desde el navegador puede leer `contrasena_hash`**.
   - La verificación de credenciales se realiza en la **Capa de Negocio Express (Tier 2)** vía `POST /api/v1/users/login` ([`users.service.js`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/services/users.service.js)) comparando hashes criptográficos **PBKDF2-HMAC-SHA256** (`100,000` iteraciones) en tiempo constante.
3. **Políticas RLS Calibradas en Supabase (Modo Estricto vs. Modo Sustentación):**
   - En Supabase se ejecutó `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` sobre las 14 tablas.
   - Las políticas combinan `auth.uid()`, `public.current_usuario_id()` y la función `public.is_pedagogical_demo_context()`:
     ```sql
     CREATE POLICY rls_perfiles_update_own ON perfiles_gamificacion
         FOR UPDATE USING (
             usuario_id = public.current_usuario_id()
             OR public.current_usuario_rol() = 'admin'
             OR public.is_pedagogical_demo_context()
         );
     ```
   - *Conmutación a RLS Estricto en Producción:* Al ejecutar `ALTER DATABASE postgres SET app.allow_anon_demo = 'false';`, `is_pedagogical_demo_context()` retorna `FALSE` y el motor PostgreSQL exige sesión JWT autenticada (`auth.uid() IS NOT NULL`) o tránsito exclusivo desde el backend Express con credenciales de servicio.

---

## PUNTO 8: Guion Paso a Paso para el Video de YouTube (10%)

La página 7 del PDF exige que el video cubra exactamente estos **12 puntos**:

1. **[0:00 - 1:00] Descripción breve del problema:** Presentación de los integrantes y planteamiento del problema educativo que resuelve CODEKIDS.
2. **[1:00 - 2:00] Presentación del modelo relacional:** Mostrar en pantalla el diagrama E-R con las 14 tablas.
3. **[2:00 - 3:00] Explicación de tablas y relaciones:** Explicar PKs, FKs y tablas intermedias N:M (`matriculas_aula`, `inventario_avatares_usuario`).
4. **[3:00 - 4:00] Explicación de la arquitectura por capas:** Abrir el explorador de carpetas y mostrar Frontend (`src/`), Lógica (`src/services/`, `server/api/`) y Datos (`sql/`, Supabase).
5. **[4:00 - 5:30] Demostración de la aplicación en vivo:** Iniciar sesión, recorrer el mapa de misiones y la consola docente.
6. **[5:30 - 6:30] Demostración de INSERT:** Crear un nuevo usuario en pantalla, matricular a un estudiante en 5° A y asignar un nuevo reto.
7. **[6:30 - 7:30] Demostración de SELECT:** Mostrar el HUD de Sofi cargando XP/monedas en vivo y el Ranking de estudiantes ordenado.
8. **[7:30 - 8:30] Demostración de UPDATE:** Resolver una misión de bloques (sube el XP en la BD), cambiar el avatar activo y editar la nota de una entrega desde la consola docente.
9. **[8:30 - 9:30] Demostración de DELETE:** Desmatricular a un alumno de un aula y eliminar un reto asignado.
10. **[9:30 - 10:30] Explicación de los módulos:** Describir los 4 módulos funcionales del sistema.
11. **[10:30 - 11:30] Conexión de cada módulo con la BD:** Abrir el Table Editor de Supabase en paralelo y mostrar cómo al hacer una acción en la app web se actualizan las filas de PostgreSQL.
12. **[11:30 - 13:00] Demostración del módulo de informes:** Abrir el panel de informes SQL analíticos, pulsar *"Ver sentencia SQL"* y explicar el reporte de estudiantes con promedio menor a 3.0 (`HAVING AVG < 3.0`).

---

## PUNTO 9: Estructura del Archivo Comprimido Final (.ZIP) (5%)

Para entregar en la plataforma universitaria, genera un archivo `.zip` con la siguiente estructura idéntica a la solicitada en la página 7:

```
SEGUNDO_PARCIAL_GRUPO_X/
├── codigo_fuente/
│   ├── src/
│   │   ├── services/
│   │   │   ├── db.client.js
│   │   │   ├── users.service.js
│   │   │   ├── gamification.service.js
│   │   │   ├── classroom.service.js
│   │   │   └── reports.service.js
│   │   ├── App.jsx
│   │   ├── BlocklyMission.jsx
│   │   ├── PythonMission.jsx
│   │   └── supabase.js
│   ├── server/
│   │   ├── api/
│   │   └── auth/
│   ├── package.json
│   ├── vite.config.js
│   └── server.js
│
├── base_datos/
│   ├── esquema.sql           (Copia de sql/01_schema_13_tables.sql con las 14 tablas)
│   ├── rls_policies.sql      (Copia de sql/02_roles_and_rls.sql con roles y RLS)
│   ├── seed.sql              (Copia de sql/03_seed_data.sql con los datos iniciales)
│   ├── consultas_informes.sql(Copia de sql/04_analytical_queries.sql con los informes)
│   └── backup_base_datos.sql (Archivo sql/backup.sql con el volcado completo)
│
├── modelos/
│   └── modelo_relacional.pdf (Diagrama E-R generado)
│
├── documentacion/
│   ├── descripcion_proyecto.pdf (Memoria técnica del proyecto)
│   └── GUIA_DEMOSTRACION_SEGUNDO_PARCIAL.md
│
└── enlace_video.txt          (Archivo de texto con el link público de YouTube)
```

---

## 🚀 Comandos Rápidos de Ejecución Local

Para levantar el proyecto antes de grabar el video o sustentar:

```powershell
# 1. Instalar dependencias si no están instaladas
npm install

# 2. Ejecutar la suite de pruebas automatizadas del CRUD e Informes SQL
node --test server/api/__tests__/crud_and_reports.test.js

# 3. Compilar el bundle de producción
node node_modules/vite/bin/vite.js build

# 4. Iniciar la aplicación web en modo desarrollo
npm run dev
```

La aplicación abrirá en `http://localhost:5173`, lista para la demostración con conexión directa a **Supabase** y persistencia relacional en **3FN**.
