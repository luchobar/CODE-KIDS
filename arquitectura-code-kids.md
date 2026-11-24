# Arquitectura de Software — Code Kids

Este documento es la referencia arquitectónica oficial del proyecto **Code Kids**. Define la separación de responsabilidades por capas, las convenciones de diseño, la estrategia de persistencia y los criterios obligatorios de calidad y verificación.

---

## 1. Arquitectura en 3 Capas (3-Tier Layered Architecture)

El sistema separa estrictamente la interfaz de usuario, la lógica de negocio/orquestación y el acceso físico a datos:

1. **Capa 1 — Presentación (Frontend React SPA Multi-Vista)**
   - **Carpetas y vistas:** `src/App.jsx`, `src/components/` (`layout/`, `ui/`), `src/features/` (`landing/`, `auth/`, `student/`, `teacher/`), `src/styles/` (`tokens.css`, `a11y.css`, `base.css`, `buttons.css`, `layout.css`, `navigation-views.css`, `pedagogy.css`, `auth.css`, `student.css`, `teacher.css`, `modals.css`, `workspace-shared.css`, `responsive.css`, `index.css` + fachada `src/Autonomous.css`)
   - **Navegación y divulgación progresiva:** `ViewSubnav.jsx`, `ContextualTooltip.jsx` y `MicroLearningPanel.jsx` organizan tanto la página pública como los portales de estudiante y docente en 4 vistas enfocadas con *breadcrumbs*, acordeones, glosario STEAM y *steppers* interactivos sin pérdida de estado ni scroll largo.
   - **Responsabilidad:** Renderizar vistas, manejar estado puramente visual/local de UI y capturar eventos del usuario delegando toda acción de negocio a hooks o servicios desacoplados.
   - **Prohibiciones:** Nunca realizar llamadas `fetch(...)` crudas, nunca acceder a `localStorage` directamente, nunca consultar `supabase` desde componentes JSX y nunca incrustar intérpretes, motores de físicas ni lógica de negocio compleja en la vista.

2. **Capa 2 — Lógica de Negocio y API (Hooks/Dominio Frontend + Express REST + Tutor IA)**
   - **Frontend (`src/hooks/`, `src/domain/`, `src/engines/`):**
     - `src/domain/`: reglas puras de progreso (`progressRules.js`) y catálogos gamificados (`gamificationCatalog.js`).
     - `src/engines/`: motores de ejecución y simulación (`gridPhysics.js`, `blocklyConfig.js`, `pythonGridEngine.js`, `hologramPreview.js`).
     - `src/hooks/`: hooks de React que orquestan estado, ciclo de vida (`AbortController`, limpieza de timers), navegación multi-vista (`usePortalNavigation.js`) y coordinación entre repositorios y vistas (`useAppSession.js`, `useClassroomState.js`, `useAccessibility.js`, `useAdaptiveRoute.js`, `useTeacherInsights.js`, `useBlocklyWorkspace.js`, `useCodeSnippetEditor.js`, `useAudioEffects.js`).
   - **Backend (`server.js`, `server/ai/`, `server/api/`, `server/auth/`, `src/services/`):**
     - `server.js`: ensamblador HTTP/Express unificado que preserva las exportaciones `{ handleApiRequest, ensureOllamaReady }` para `vite.config.js` y ejecución standalone.
     - `server/ai/`: cliente Ollama (`ollamaClient.js`), constructor de prompts/analítica (`prompts.js`) y enrutador Express (`/api/health`, `/api/ai/*`).
     - `server/api/` y `server/auth/`: controladores REST `/api/v1/*` y autenticación endurecida `/api/v1/auth/*`.
     - `src/services/`: servicios de negocio del servidor conectados a PostgreSQL / Supabase (`users`, `gamification`, `classroom`, `reports`).

3. **Capa 3 — Acceso a Datos y Persistencia**
   - **Cliente Navegador (`src/data/`, fachada `src/supabase.js`):**
     - `httpClient.js`: cliente único para Tier 2 (`/api/v1/*`), CSRF (`/api/v1/auth/*`) y Tutor IA (`/api/ai/*`).
     - `supabaseClient.js`: única instancia del cliente Supabase para navegador.
     - `storageStore.js`: lectura y escritura segura (`try/catch`) de `localStorage`.
     - `seedData.js`, `classroomStats.js`, `landingContent.js`, `pedagogicalModules.js` y `pedagogicalGlossary.js`: semillas de demostración, helpers estadísticos de aula, contenido editorial y catálogos pedagógicos STEAM.
     - `*Repository.js`: repositorios especializados por dominio (`authRepository.js`, `studentRepository.js`, `expansionRepository.js`, `classroomRepository.js`, `assignmentsRepository.js`, `reportsRepository.js`, `aiRepository.js`).
   - **Base de Datos (`sql/`):** Esquema relacional en 3FN (14 tablas), roles PostgreSQL y políticas RLS.

---

## 2. Política de Persistencia y Prevención de Doble Escritura

* **Fuente primaria (Tier 2):** Toda mutación desde el cliente intenta primero la API REST Express (`/api/v1/*`).
* **Sin doble escritura:** Si Tier 2 confirma éxito (`httpOk && data?.ok`), el repositorio retorna de inmediato y **NO** vuelve a mutar Supabase directamente (evitando duplicación de XP/monedas, doble inserción de retos o dobles débitos).
* **Resiliencia controlada (Fallback):** El acceso directo mediante el cliente Supabase del navegador o caché en `storageStore.js` solo se ejecuta cuando Tier 2 no está disponible (p. ej. despliegue estático sin servidor Express) o falla por red.
* **Aislamiento de bundle:** El código cliente (`src/data/`, `src/supabase.js`) **nunca** importa `src/services/db.client.js` ni `src/services/index.js`, evitando filtrar credenciales de servidor o dependencias Node (`pg`) al bundle `dist/`.
* **Integridad de IDs:** Prohibido usar coerciones inseguras como `|| 1` en escrituras o eliminaciones; todo identificador numérico se valida explícitamente antes de persistir.

---

## 3. Reglas de Diseño, UI y Calidad de Código

* **Tamaño y cohesión:** Mantener componentes, hooks, repositorios y motores alrededor de **~100–220 líneas**. Si un módulo supera este umbral o mezcla responsabilidades, dividirlo en piezas cohesivas sin caer en archivos triviales ni archivos "cajón de sastre" (`utils.js`, `helpers.js`).
* **DRY con criterio KISS:** Reutilizar lógica repetida (por ejemplo `FormattedInstructions`, `RobotGridStage`, `MissionWorkspaceShell`, `gridPhysics`), sin introducir abstracciones innecesarias.
* **Sistema de diseño basado en tokens (`src/styles/`):**
  - El tema por defecto es oscuro (`:root, [data-theme="dark"]`) con soporte completo para tema claro (`[data-theme="light"]`) y accesibilidad (`data-font-scale`, `data-high-contrast`, `data-reduced-motion`).
  - Prohibido hardcodear colores hexadecimales o `style={{...}}` repetitivos en JSX; usar variables semánticas de `src/styles/tokens.css`.
  - Media queries ordenadas estrictamente de mayor a menor (`1068px → 960px → 833px → 640px → 480px`) en `src/styles/responsive.css`.
* **Estados explícitos de interfaz:** Toda carga asíncrona, panel remoto, filtro o lista debe manejar explícitamente los estados `loading`, `error` y `empty` de manera amigable.
* **Higiene estricta:**
  - Cero `console.log`, `console.warn` o `console.error` en `src/`.
  - Cero importaciones sin usar, código comentado o ramas muertas.
  - Documentación JSDoc clara en funciones, hooks y repositorios públicos.
  - Cero dependencias npm nuevas si el problema se resuelve con la plataforma nativa o las dependencias existentes.

---

## 4. Criterios de Verificación Obligatorios

Después de cada cambio arquitectónico deben pasar sin errores:
1. **Compilación frontend:** `npm run build`
2. **Pruebas automatizadas backend:** `node --test server/auth/__tests__/auth.security.test.js server/api/__tests__/crud_and_reports.test.js`
3. **Contratos HTTP intactos:** Preservación de las 38 rutas (`/api/health`, `/api/ai/*`, `/api/v1/auth/*`, `/api/v1/*`) y de las exportaciones `{ handleApiRequest, ensureOllamaReady }` en `server.js`.
4. **Higiene de bundle:** Verificación de que `dist/assets/*.js` no contiene `VITE_SUPABASE_SERVICE_ROLE_KEY` ni módulos exclusivos de servidor (`pg`, `db.client.js`).
