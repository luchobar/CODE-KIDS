# CODEKIDS — Resumen Técnico de Implementación UI/UX Gamificada

Este documento recopila de manera integral todas las decisiones de diseño, especificaciones visuales, estructuras de componentes, fragmentos de código y guías de integración implementadas para la plataforma educativa **CODEKIDS** (orientada a niños y adolescentes de 9 a 15 años).

---

## 1. Resumen Ejecutivo

Se transformó por completo la identidad visual y la experiencia de usuario (UI/UX) de la plataforma, sustituyendo la interfaz previa (de tono corporativo y monocromático) por un entorno inmersivo tipo videojuego educativo (*EdTech Arcade* inspirado en los estándares de Duolingo, Code.org y Scratch). Las mejoras se concentraron en tres frentes:

1. **Sistema de Acceso y Autenticación (`Login`):**
   * **Identidad de Marca Maestro:** Inclusión del logotipo vertical (`logo_vertical.jpg`) en la tarjeta de bienvenida y el logotipo horizontal (`logo_horizontal.jpg`) en la barra de navegación persistente.
   * **Atmósfera Cósmica 2.5D:** Fondo con degradados espaciales inspirados en el azul espacial del logo (`#101B2B` a `#1B2A41`) complementados con orbes difuminados de luz neón (*Azul Eléctrico*, *Violeta Arcade* y *Verde Lima Cyber*).
   * **Tarjeta de Acceso Flotante (*Glassmorphism*):** Superficie translúcida con `backdrop-filter: blur(20px)`, bordes con aura azul `#1B7EDC` y elevación suave.
   * **Selector Rápido de Perfiles y Avatares de Aula:** Sistema de acceso en 1 clic pensado para laboratorios escolares o dispositivos compartidos (perfiles rápidos para *Sofi*, *Mateo*, *Valeria* y *Profe Alex*, junto a la barra de avatares: dragón, gato, rover, zorro y unicornio).
   * **Validación en Tiempo Real con Iconografía Intuitiva:** Indicadores dinámicos que validan correos y contraseñas (mínimo 8 caracteres) en vivo con microetiquetas de color.
   * **Botones CTA Táctiles con Relieve 3D:** Botones en Verde Lima Cyber (`#B8EC63`) con sombra inferior rígida y microinteracción de pulsado (`active:translate-y-1`).

2. **Panel de Control y Mapa de Misiones (`Header` & `StudentDashboard`):**
   * **Logotipo Horizontal en Navbar:** Marca oficial (`logo_horizontal.jpg`) integrada con escala fluida y efecto hover de brillo azul.
   * **HUD Superior Flotante del Explorador:** Barra persistente con insignia de Nivel, **barra de progreso de XP animada** (`XX/100 XP` con degradado azul eléctrico `#1B7EDC` a lima `#B8EC63`), contador de **Racha de días** con llama neón y botón de **Monedas ganadas** que da acceso directo a la tienda de avatares.
   * **Filtros Rápidos Gamificados:** Selector por temáticas de programación (*Todos*, *Secuencias*, *Bucles*, *Condicionales*, *Funciones*) y por dificultad (*Inicio*, *En camino*, *Explorador*).
   * **Mapa de Aventura por Nodos:** Nodos conectados organizados por mundos (*Bosque*, *Isla*, *Cueva*, *Laboratorio*) con 3 estados visuales inconfundibles:
     * **Completado:** Borde verde lima neón, medalla/trofeo dorado y **calificación de 3 estrellas** (`⭐⭐⭐`).
     * **Disponible:** Brillo pulsante neón (`pulseMissionNode`), aura activa y llamado a la acción visible.
     * **Bloqueado:** Escudo con candado sci-fi y opacidad reducida.

3. **Área de Trabajo de los Ejercicios (`BlocklyMission`):**
   * **Arquitectura Modular en 3 Paneles de Alto Contraste:**
     * **Panel Izquierdo (Misión y Guía Pipo):** Personaje guía interactivo con estados de ánimo (`hello`, `thinking`, `party`), **3 objetivos de la misión en viñetas cortas numeradas**, cápsula conceptual y sistema de pistas progresivas desplegables.
     * **Panel Central (Constructor de Bloques):** Espacio de programación con cuadrícula sutil de puntos radiales, contador de bloques activos (`X / 32`), alerta visual de ensamblado (`⚡ ¡Bloque ensamblado!`) y bloques de colores semánticos vibrantes (amarillo evento, azul movimiento, azul giro, morado bucle, naranja condición).
     * **Panel Derecho (Escenario y Reproductor Multimedia):** Tablero con visor de coordenadas `(X, Y)`, rastro luminoso de energía en casillas visitadas, controles estilo reproductor multimedia (**Probar**, **Paso a paso**, **Pausa/Reanudar**, **Reiniciar**) y animación de confeti ligero al alcanzar la meta.

---

## 2. Guía de Estilos y Diseño (Design System Armonizado)

### 2.1. Paleta de Colores Exacta del Logotipo (Códigos HEX)

#### Fondos y Superficies
| Token CSS | Código HEX / Valor | Aplicación |
| :--- | :--- | :--- |
| `--color-canvas` | `#101B2B` | Fondo cósmico base de la aplicación |
| `--color-canvas-parchment` | `#17253B` | Fondo elevado de paneles y tarjetas secundarias |
| `--color-surface-tile-1` | `#0D1624` | Superficies de mundos y contenedores oscuros |
| `--color-surface-tile-2` | `#16243A` | Contenedores de misiones y panel de Pipo |
| `--color-surface-tile-3` | `#1B2A41` | **Fondo Exacto del Logo**: Nodos destacados y celdas base de simulación |
| `--color-hairline` | `rgba(27, 126, 220, 0.28)` | Bordes sutiles inspirados en el resplandor del logo |
| Glassmorphism Surface | `rgba(22, 36, 58, 0.78)` | Tarjeta flotante de acceso con desenfoque de 20px |

#### Tipografía y Textos
| Token CSS | Código HEX | Aplicación |
| :--- | :--- | :--- |
| `--color-ink` | `#F8FAFC` | Títulos principales, valores numéricos de nivel y HUD |
| `--color-ink-muted-80` | `#CBD5E1` | Instrucciones, descripciones de reto y diálogos |
| `--color-ink-muted-48` | `#94A3B8` | Metadatos secundarios, estados bloqueados y placeholders |

#### Acentos Gamificados y Semántica de Bloques
| Token / Rol | Código HEX | Uso Específico |
| :--- | :--- | :--- |
| **Electric Code Blue** | `#1B7EDC` / `#2FA0FF` | Color de la palabra "Code" y cuerpo del robot; acento principal y bloque `ck_move` |
| **Cyber Kids Lime** | `#B8EC63` (Sombra: `#5E9319`) | Color de la palabra "Kids" y corchetes `{ }`; botón CTA 3D, barra XP y meta |
| **Pixel Cyan Spark** | `#38BDF8` | Partículas de energía, coordenadas y focos activos |
| **Arcade Violet** | `#8B5CF6` | Filtros activos, orbe ambiental y bloque `ck_repeat` (*repetir*) |
| **Solar Gold** | `#FACC15` / `#F59E0B` | Estrellas de puntuación, monedas y bloque `ck_start` (*al comenzar*) |
| **Streak Flame** | `#FB923C` / `#F97316` | Medidor de racha, muros y bloque `ck_if_wall` (*si hay pared*) |

### 2.2. Tipografías

* **Títulos, Botones CTA y Gamificación (`--font-display`):** `Fredoka, "Plus Jakarta Sans", system-ui, sans-serif`
  * *Razón de diseño:* Terminaciones amigables y redondeadas con geometría sólida, evitando la rigidez corporativa sin caer en lo infantil.
* **Textos de Lectura e Instrucciones (`--font-text`):** `"Plus Jakarta Sans", system-ui, sans-serif`
  * *Razón de diseño:* Excelente legibilidad tipográfica en pantallas de cualquier resolución para instrucciones y objetivos.
* **Monospace y Coordenadas:** `"JetBrains Mono", monospace`
  * *Razón de diseño:* Proporciona rigor técnico al monitor de instrucciones, pasos y coordenadas `(X, Y)`.

### 2.3. Clases CSS / Tailwind para Glassmorphism y Animaciones

```css
/* Glassmorphism Flotante */
.glass-auth-card {
  background: rgba(19, 27, 46, 0.72);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1.5px solid rgba(34, 211, 238, 0.26);
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.55), 0 0 28px rgba(6, 182, 212, 0.12);
}

/* Botón 3D Táctil Gamificado */
.cta-3d-lime {
  background: linear-gradient(180deg, #84CC16 0%, #65A30D 100%);
  color: #0B0F19;
  font-family: var(--font-display);
  font-weight: 700;
  box-shadow: 0 4px 0 #3F6212, 0 12px 24px -4px rgba(132, 204, 22, 0.45);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.cta-3d-lime:hover { transform: translateY(-2px) scale(1.02); filter: brightness(1.05); }
.cta-3d-lime:active { transform: translateY(2px); box-shadow: 0 2px 0 #3F6212; }

/* Pulso Neón para Misiones Disponibles */
@keyframes pulseMissionNode {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.35), 0 0 18px rgba(34, 211, 238, 0.22); }
  50% { box-shadow: 0 0 0 6px rgba(34, 211, 238, 0), 0 0 26px rgba(34, 211, 238, 0.42); }
}
.world-stage-pill.active {
  border: 2px solid #22D3EE;
  animation: pulseMissionNode 2.2s infinite ease-in-out;
}
```

---

## 3. Estructura de Componentes

Los archivos modificados e implementados en el proyecto se organizan de la siguiente manera:

| Archivo | Ruta Relativa | Propósito y Cambios Principales |
| :--- | :--- | :--- |
| **`index.html`** | [`index.html`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/index.html) | Inyección de las fuentes web oficiales de Google Fonts (`Fredoka`, `Plus Jakarta Sans`, `JetBrains Mono`) y metadatos temáticos oscuros (`#0B0F19`). |
| **`App.jsx`** | [`src/App.jsx`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/App.jsx) | Implementación de: <br>• HUD Gamer en `Header` (barra XP, racha y monedas).<br>• Acceso y Registro en `Login` con tarjeta glassmorphism, selector de perfiles de aula y validación en vivo.<br>• `StudentDashboard` con filtros por tema y mapa de aventura de nodos con estrellas.<br>• Integración de recompensas y paso de props en `StudentPractice`. |
| **`Autonomous.css`** | [`src/Autonomous.css`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/Autonomous.css) | Variables CSS del sistema de diseño, fondos cósmicos, orbes luminosos, inputs con icono, badges de validación, botones 3D, pills de filtros y animación de nodos. |
| **`BlocklyMission.jsx`** | [`src/BlocklyMission.jsx`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/BlocklyMission.jsx) | Reescritura a arquitectura de 3 paneles modulares:<br>1. Panel izquierdo de Pipo y objetivos en viñetas.<br>2. Panel central con bloques coloridos estilo Scratch y feedback de encaje.<br>3. Panel derecho con escenario, rastro de casillas, controles multimedia (Play, Paso a paso, Pausa, Reset) y confeti. |
| **`BlocklyMission.css`** | [`src/BlocklyMission.css`](file:///c:/Users/luisb/OneDrive/Escritorio/CODE%20KIDS/src/BlocklyMission.css) | Estilos de alta legibilidad y contraste para los 3 paneles, cuadrícula de puntos, visor de coordenadas, estilización del toolbox de Blockly y keyframes de confeti. |

---

## 4. Bloques de Código Clave

### 4.1. Tarjeta de Acceso Glassmorphic con Selector Rápido de Aula (`src/App.jsx`)

```jsx
// Perfiles rápidos de aula para dispositivos compartidos
const QUICK_PROFILES = [
  { id: 'sofi', name: 'Sofi', role: 'student', avatar: 'dragon', badge: 'Nvl. 3 · Secuencias' },
  { id: 'mateo', name: 'Mateo', role: 'student', avatar: 'robot', badge: 'Nvl. 2 · Bucles' },
  { id: 'valeria', name: 'Valeria', role: 'student', avatar: 'fox', badge: 'Nvl. 4 · Python' },
  { id: 'profe', name: 'Profe Alex', role: 'teacher', avatar: 'unicorn', badge: 'Docente · 5° A' },
];

// Selector dentro del formulario
<div className="quick-avatar-bar">
  <div className="quick-avatar-header">
    <span className="field-label">⚡ Acceso rápido de aula o elige tu avatar</span>
    <small className="field-helper">Ideal para equipos compartidos</small>
  </div>
  <div className="quick-profiles-grid" role="group">
    {QUICK_PROFILES.map((profile) => (
      <button
        type="button"
        key={profile.id}
        className={`quick-profile-card${selectedAvatar === profile.avatar && name === profile.name ? ' active' : ''}`}
        onClick={() => {
          setSelectedAvatar(profile.avatar);
          setName(profile.name);
          setRole(profile.role);
          onEnter({ name: profile.name, role: profile.role, avatar: profile.avatar });
        }}
      >
        <span className="quick-profile-avatar">
          <AvatarGlyph avatar={profile.avatar} size={20} />
        </span>
        <span className="quick-profile-meta">
          <b>{profile.name}</b>
          <small>{profile.badge}</small>
        </span>
      </button>
    ))}
  </div>
</div>
```

### 4.2. HUD Superior con Barra de Experiencia (XP) Dinámica (`src/App.jsx`)

```jsx
const points = state?.points || 0;
const level = Math.floor(points / 100) + 1;
const xpInLevel = points % 100;

<div className="hud-xp-pill" title={`${points} XP totales`}>
  <span className="hud-level-badge">
    <AvatarGlyph avatar={state.avatar} size={15} />
    <b>Nvl. {level}</b>
  </span>
  <div className="hud-xp-track" aria-label={`Experiencia: ${xpInLevel} de 100 XP`}>
    <div className="hud-xp-fill" style={{ width: `${Math.max(12, xpInLevel)}%` }} />
  </div>
  <small className="hud-xp-text">{xpInLevel}/100 XP</small>
</div>
```

### 4.3. Nodos del Mapa de Aventura con Estrellas de Puntuación (`src/App.jsx`)

```jsx
<button
  type="button"
  disabled={locked}
  onClick={() => onPractice(id)}
  className={`world-stage-pill${done ? ' done' : ''}${active ? ' active' : ''}${locked ? ' locked' : ''}`}
>
  <span className="world-stage-icon">
    {done ? <Trophy size={16} weight="fill" /> : locked ? <Lock size={15} weight="duotone" /> : <Play size={14} weight="fill" />}
  </span>
  <span className="world-stage-text">
    <b>{nodeNames[index]}</b>
    <small>{done ? 'Completado · +10 XP' : locked ? '🔒 Bloqueado' : '⚡ ¡Disponible ahora!'}</small>
    <span className="mission-node-stars">
      {[1, 2, 3].map((starIdx) => (
        <Star
          key={starIdx}
          size={12}
          weight={done ? 'fill' : 'regular'}
          className={done ? 'star-earned' : 'star-empty'}
        />
      ))}
    </span>
  </span>
</button>
```

### 4.4. Microinteracción de Sonido al Conectar Bloques (`src/BlocklyMission.jsx`)

```javascript
// Web Audio API sin dependencias de archivos externos
function playSnapTone() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.065);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
    osc.onended = () => ctx.close();
  } catch {
    /* Audio opcional */
  }
}
```

### 4.5. Ejecución Multimedia Paso a Paso (`src/BlocklyMission.jsx`)

```javascript
const runSingleStep = () => {
  if (running) return;
  const plan = buildActionQueue();
  if (!plan.actions.length) {
    finalizeOutcome(plan);
    return;
  }
  const nextIndex = stepCursor < plan.actions.length ? stepCursor : 0;
  const step = plan.actions[nextIndex];
  
  // Resalta el bloque exacto en el lienzo de Blockly
  setActiveBlockLabel(`Paso ${nextIndex + 1}/${plan.actions.length}: ${step.label}`);
  if (workspaceRef.current) workspaceRef.current.highlightBlock(step.blockId);
  
  // Mueve al robot y guarda el rastro de luz
  setPosition({ ...step.snapshot });
  setTrail((prev) => [...prev, { x: step.snapshot.x, y: step.snapshot.y }]);

  if (nextIndex + 1 >= plan.actions.length) {
    setStepCursor(0);
    finalizeOutcome(plan);
  } else {
    setStepCursor(nextIndex + 1);
  }
};
```

---

## 5. Instrucciones de Integración

Sigue estos pasos para auditar, ejecutar y continuar extendiendo las interfaces:

1. **Verificación de la Compilación:**
   Ejecuta el script de compilación para comprobar que todos los tipos, dependencias e iconos se resuelven sin advertencias:
   ```powershell
   npm.cmd run build
   ```
   *Resultado esperado:* El empaquetador Vite compilará `dist/index.html`, `dist/assets/*.css` y `dist/assets/*.js` en ~1.10 segundos sin errores.

2. **Inicio del Entorno de Desarrollo:**
   Inicia el servidor local de Vite:
   ```powershell
   npm.cmd run dev
   ```
   Abre la URL local indicada (habitualmente `http://localhost:5173`) en tu navegador.

3. **Verificación de Funcionalidades Clave:**
   * **Login:** Prueba hacer clic en cualquiera de los botones de **Acceso rápido de aula** (*Sofi*, *Mateo*, etc.) para entrar inmediatamente sin fricción. Comprueba los badges dinámicos en los campos de correo y contraseña al escribir.
   * **Dashboard / Mapa:** Observa en la barra superior cómo se calcula la experiencia relativa (`XP / 100`) y cómo los nodos completados muestran sus 3 estrellas doradas mientras que el nodo siguiente pulsa con halo cian. Prueba los filtros de temática para aislar misiones de *Secuencias*, *Bucles* o *Condicionales*.
   * **Área de Ejercicio:** Abre cualquier misión. Verifica el panel de objetivos a la izquierda, arrastra bloques para escuchar y ver la microinteracción de encaje magnético (`⚡ ¡Bloque ensamblado!`), y utiliza el botón **Paso a paso** para depurar la ruta celda por celda antes de pulsar **Probar**. Al ganar, se desplegará el efecto de confeti multicolor.
