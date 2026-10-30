import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  BookOpen,
  Brain,
  Check,
  CheckCircle,
  ClipboardText,
  Code,
  Coins,
  Compass,
  Cpu,
  Eye,
  FileHtml,
  FileJs,
  Flame,
  GraduationCap,
  Lightning,
  Lock,
  Minus,
  Moon,
  NotePencil,
  PersonArmsSpread,
  Planet,
  Play,
  Plus,
  RocketLaunch,
  SlidersHorizontal,
  Sparkle,
  SpeakerHigh,
  SpeakerSlash,
  Star,
  Student,
  Sun,
  TerminalWindow,
  TextAa,
  Trophy,
  UsersThree,
  Wall,
  X,
} from '@phosphor-icons/react';
import BlocklyMission from './BlocklyMission.jsx';
import CodeWorldLab from './CodeWorldLab.jsx';
import PresentationLanding from './PresentationLanding.jsx';
import PythonMission from './PythonMission.jsx';
import { EXPANSION_MISSIONS, EXPANSION_WORLDS } from './expansionCatalog.js';
import {
  BLOCKLY_CHALLENGES,
  BLOCKLY_SKILLS,
  challengeCategory,
  getBlocklyChallenge,
} from './blocklyChallenges.js';
import {
  isSupabaseConfigured,
  loadStudentFromSupabase,
  loadExpansionFromSupabase,
  loadTeacherClassroomData,
  createCourseInSupabase,
  setStudentCourseEnrollment,
  createClassroomAssignmentInSupabase,
  syncAssignmentSubmissionInSupabase,
  syncMissionSuccess,
  syncAvatarPurchase,
  syncAvatarSelection,
  authenticateUser,
  registerUser,
  updatePasswordForEmail,
  UNIVERSITY_ACCOUNTS,
} from './supabase.js';

const STORAGE_KEY = 'codekids-demo-state';
const A11Y_STORAGE_KEY = 'codekids-a11y-settings';

const AVATAR_SHOP = [
  {
    avatar: 'dragon',
    name: 'Dragón Chispa',
    cost: 30,
    note: 'Especialista en lógica y secuencias rápidas',
    tone: 'peach',
  },
  {
    avatar: 'cat',
    name: 'Gato Pixel',
    cost: 30,
    note: 'Observador preciso para depurar programas',
    tone: 'lav',
  },
  {
    avatar: 'robot',
    name: 'Unidad Rover',
    cost: 40,
    note: 'Diseñado para exploración autónoma por bloques',
    tone: 'mint',
  },
  {
    avatar: 'fox',
    name: 'Zorro Ágil',
    cost: 50,
    note: 'Estratega en bucles y rutas óptimas',
    tone: 'yellow',
  },
  {
    avatar: 'unicorn',
    name: 'Prisma Orbital',
    cost: 60,
    note: 'Compañero avanzado de laboratorio Python',
    tone: 'blue',
  },
];

function AvatarGlyph({ avatar, size = 22 }) {
  switch (avatar) {
    case 'dragon':
    case '🐲':
      return <Flame size={size} weight="duotone" />;
    case 'cat':
    case '🐱':
      return <Compass size={size} weight="duotone" />;
    case 'robot':
    case '🤖':
      return <Cpu size={size} weight="duotone" />;
    case 'fox':
    case '🦊':
      return <Lightning size={size} weight="duotone" />;
    case 'unicorn':
    case '🦄':
      return <Planet size={size} weight="duotone" />;
    default:
      return <RocketLaunch size={size} weight="duotone" />;
  }
}

function SkillGlyph({ skill, size = 20 }) {
  if (skill === 'Secuencias') return <Compass size={size} weight="regular" />;
  if (skill === 'Bucles') return <SlidersHorizontal size={size} weight="regular" />;
  if (skill === 'Condicionales') return <Wall size={size} weight="regular" />;
  if (skill === 'Python') return <TerminalWindow size={size} weight="regular" />;
  if (skill === 'HTML5') return <FileHtml size={size} weight="regular" />;
  if (skill === 'JavaScript') return <FileJs size={size} weight="regular" />;
  return <Cpu size={size} weight="regular" />;
}

function playSfx(kind) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(kind === 'win' ? 660 : 260, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'win' ? 990 : 170, now + 0.14);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.21);
    oscillator.onended = () => context.close();
  } catch {
    /* El audio es opcional y puede estar bloqueado por el navegador. */
  }
}

function progressStreak(current, date = new Date()) {
  const today = date.toLocaleDateString('en-CA');
  if (current.lastStoryDay === today) return { streak: current.streak || 1, lastStoryDay: today };
  const yesterday = new Date(date.getTime() - 86400000).toLocaleDateString('en-CA');
  return {
    streak: current.lastStoryDay === yesterday ? (current.streak || 0) + 1 : (current.streak || 1),
    lastStoryDay: today,
  };
}

const questions = [
  {
    skill: 'Secuencias',
    prompt: 'Para que un personaje avance y luego salude, ¿qué orden tiene sentido?',
    options: ['Saludar y avanzar', 'Avanzar y después saludar', 'Repetir sin una acción'],
    answer: 1,
  },
  {
    skill: 'Bucles',
    prompt: '¿Qué bloque conviene usar para repetir un salto cinco veces?',
    options: ['Repetir 5 veces', 'Esperar para siempre', 'Si está tocando el borde'],
    answer: 0,
  },
  {
    skill: 'Condicionales',
    prompt: '¿Cómo hacemos que el personaje cambie de dirección al tocar una pared?',
    options: ['Mover 10 pasos siempre', 'Si toca la pared, girar', 'Repetir el saludo'],
    answer: 1,
  },
  {
    skill: 'Descomposición',
    prompt: 'Un proyecto debe iniciar, mover al robot y registrar puntos. ¿Qué estrategia ayuda a construirlo?',
    options: ['Resolver todo al mismo tiempo', 'Dividirlo en esas tres tareas pequeñas', 'Eliminar el marcador'],
    answer: 1,
  },
];

const initialState = {
  user: null,
  scores: { Secuencias: 75, Bucles: 45, Condicionales: 80, Descomposición: 55 },
  lastScore: null,
  points: 120,
  coins: 40,
  avatar: 'astronaut',
  ownedAvatars: ['astronaut'],
  soundEnabled: false,
  assignments: [],
  submissions: [],
  pythonProgress: [],
};

const defaultA11y = {
  theme: 'dark',
  fontScale: 'normal',
  reducedMotion: false,
  highContrast: false,
};

const readState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      ...initialState,
      ...saved,
      assignments: saved.assignments || [],
      submissions: saved.submissions || [],
      pythonProgress: saved.pythonProgress || [],
    };
  } catch {
    return initialState;
  }
};

const readA11y = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(A11Y_STORAGE_KEY) || '{}');
    return { ...defaultA11y, ...saved };
  } catch {
    return defaultA11y;
  }
};

function evaluateWork(assignment, response, gameOutcome) {
  if (gameOutcome) {
    const score = gameOutcome.success ? Math.max(85, 100 - Math.max(0, gameOutcome.attempts - 1) * 5) : 55;
    return {
      score,
      feedback: gameOutcome.success
        ? `Reto superado. Aplicaste ${assignment.skill.toLowerCase()} con precisión para resolver la actividad.`
        : `Intento registrado. Practiquemos ${assignment.skill.toLowerCase()} paso a paso para consolidar este reto.`,
      recommendation: gameOutcome.success
        ? 'Propón una variante con un obstáculo adicional para transferir esta habilidad a un nuevo escenario.'
        : `Repasa ${assignment.skill.toLowerCase()} con un ejemplo guiado antes de repetir el tablero.`,
    };
  }
  const words = response.trim().split(/\s+/).filter(Boolean).length;
  const text = response.toLowerCase();
  const signals = {
    Bucles: /repet|bucle|veces|iterar/.test(text),
    Secuencias: /primero|después|luego|orden|paso/.test(text),
    Condicionales: /si |cuando|condición|entonces/.test(text),
    Descomposición: /divid|parte|tarea|paso|pequeñ/.test(text),
  };
  const conceptMentioned = signals[assignment.skill] || false;
  const score = Math.min(100, Math.max(25, 35 + Math.min(words, 15) * 2 + (conceptMentioned ? 25 : 0) + (words > 18 ? 10 : 0)));
  const feedback = score >= 80
    ? `Explicaste con claridad tu aplicación de ${assignment.skill.toLowerCase()}.`
    : conceptMentioned
      ? `Buen avance en ${assignment.skill.toLowerCase()}. Añade un ejemplo concreto del recorrido.`
      : `Detalla cómo utilizaste ${assignment.skill.toLowerCase()} y qué ocurre en cada paso.`;
  const recommendation = score >= 80
    ? 'Propón un reto con una variante nueva para que aplique lo aprendido en otro contexto.'
    : conceptMentioned
      ? 'Pídele que ensamble su solución y describa el resultado antes de ejecutarlo.'
      : `Repasa ${assignment.skill.toLowerCase()} con una actividad guiada breve.`;
  return { score, feedback, recommendation };
}

function AccessibilityMenu({ a11y, onChangeA11y, soundEnabled, onToggleSound, isOpen, onToggleOpen, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div className="a11y-menu-wrapper" ref={menuRef}>
      <button
        type="button"
        className={`a11y-trigger-btn${isOpen ? ' active' : ''}`}
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Abrir menú de accesibilidad y apariencia"
      >
        <PersonArmsSpread size={15} weight="bold" />
        <span>Accesibilidad</span>
      </button>

      {isOpen && (
        <section className="a11y-popover" role="dialog" aria-label="Menú de accesibilidad">
          <div className="a11y-popover-header">
            <div>
              <b>Accesibilidad y Apariencia</b>
              <small>Personaliza tu experiencia de estudio</small>
            </div>
            <button type="button" className="a11y-close-btn" onClick={onClose} aria-label="Cerrar menú">
              <X size={15} weight="bold" />
            </button>
          </div>

          <div className="a11y-group">
            <span className="a11y-group-label">Modo de color</span>
            <div className="a11y-theme-grid" role="radiogroup" aria-label="Selecciona el modo de color">
              <button
                type="button"
                role="radio"
                aria-checked={a11y.theme === 'dark'}
                className={a11y.theme === 'dark' ? 'a11y-option-card selected' : 'a11y-option-card'}
                onClick={() => onChangeA11y({ ...a11y, theme: 'dark' })}
              >
                <span className="a11y-theme-swatch dark-swatch">
                  <Moon size={16} weight="fill" />
                </span>
                <span className="a11y-option-copy">
                  <b>Modo Oscuro</b>
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={a11y.theme === 'light'}
                className={a11y.theme === 'light' ? 'a11y-option-card selected' : 'a11y-option-card'}
                onClick={() => onChangeA11y({ ...a11y, theme: 'light' })}
              >
                <span className="a11y-theme-swatch light-swatch">
                  <Sun size={16} weight="fill" />
                </span>
                <span className="a11y-option-copy">
                  <b>Modo Claro</b>
                </span>
              </button>
            </div>
          </div>

          <div className="a11y-group">
            <span className="a11y-group-label">
              <TextAa size={14} weight="bold" /> Tamaño de texto
            </span>
            <div className="a11y-scale-pills" role="group" aria-label="Tamaño de texto">
              {[
                { id: 'normal', label: 'Normal' },
                { id: 'lg', label: 'Grande' },
                { id: 'xl', label: 'Extra' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={a11y.fontScale === item.id}
                  className={a11y.fontScale === item.id ? 'a11y-pill selected' : 'a11y-pill'}
                  onClick={() => onChangeA11y({ ...a11y, fontScale: item.id })}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="a11y-toggles-list">
            <label className="a11y-toggle-row">
              <span>
                <Eye size={15} weight="regular" /> Alto contraste en bordes
              </span>
              <input
                type="checkbox"
                checked={Boolean(a11y.highContrast)}
                onChange={(event) => onChangeA11y({ ...a11y, highContrast: event.target.checked })}
              />
            </label>

            <label className="a11y-toggle-row">
              <span>
                <SlidersHorizontal size={15} weight="regular" /> Reducir animaciones
              </span>
              <input
                type="checkbox"
                checked={Boolean(a11y.reducedMotion)}
                onChange={(event) => onChangeA11y({ ...a11y, reducedMotion: event.target.checked })}
              />
            </label>

            <label className="a11y-toggle-row">
              <span>
                {soundEnabled ? <SpeakerHigh size={15} weight="regular" /> : <SpeakerSlash size={15} weight="regular" />} Efectos de sonido
              </span>
              <input type="checkbox" checked={Boolean(soundEnabled)} onChange={onToggleSound} />
            </label>
          </div>

          <button
            type="button"
            className="a11y-reset-btn"
            onClick={() => onChangeA11y(defaultA11y)}
          >
            Restablecer valores predeterminados
          </button>
        </section>
      )}
    </div>
  );
}

function Header({
  user,
  state,
  a11y,
  onChangeA11y,
  onExit,
  onOpenShop,
  onToggleSound,
  onAssessment,
  onPython,
  onHome,
  onGoMissions,
  publicView = 'landing',
  onOpenLogin,
  onBackToLanding,
}) {
  const [a11yOpen, setA11yOpen] = useState(false);
  const points = state?.points || 0;
  const level = Math.floor(points / 100) + 1;
  const xpInLevel = points % 100;

  const scrollToLanding = (event, sectionId) => {
    event.preventDefault();
    if (publicView !== 'landing' && onBackToLanding) {
      onBackToLanding();
      setTimeout(() => {
        const target = document.getElementById(sectionId);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="apple-nav-stack">
      <header className="global-nav" aria-label="Navegación global">
        <div className="global-nav-inner">
          <a
            className="global-nav-brand brand-with-logo"
            href="#top"
            onClick={(event) => {
              event.preventDefault();
              if (user) {
                if (onHome) onHome();
              } else {
                if (onBackToLanding) onBackToLanding();
                else window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            title="CodeKids - Plataforma Educativa"
          >
            <img
              src="/images/logo_horizontal.jpg"
              alt="CodeKids Logo"
              className="global-nav-logo-horizontal"
            />
          </a>

          <nav className="global-nav-links" aria-label="Secciones principales">
            {user ? (
              <>
                <button
                  type="button"
                  className="global-nav-link-btn"
                  onClick={() => {
                    if (onHome) onHome();
                  }}
                >
                  Mapa
                </button>
                <button
                  type="button"
                  className="global-nav-link-btn"
                  onClick={() => {
                    if (onGoMissions) onGoMissions();
                  }}
                >
                  Misiones
                </button>
                {user.role === 'student' && (
                  <>
                    <button type="button" className="global-nav-link-btn" onClick={onAssessment}>
                      Diagnóstico
                    </button>
                    <button type="button" className="global-nav-link-btn" onClick={onPython}>
                      Lab Python
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="global-nav-link-btn"
                  onClick={(e) => scrollToLanding(e, 'top')}
                >
                  Inicio
                </button>
                <button
                  type="button"
                  className="global-nav-link-btn"
                  onClick={(e) => scrollToLanding(e, 'objetivo')}
                >
                  ¿Qué es? y Objetivo
                </button>
                <button
                  type="button"
                  className="global-nav-link-btn"
                  onClick={(e) => scrollToLanding(e, 'metodologia')}
                >
                  Metodología
                </button>
                <button
                  type="button"
                  className="global-nav-link-btn"
                  onClick={(e) => scrollToLanding(e, 'mundos')}
                >
                  Mundos
                </button>
              </>
            )}
          </nav>

          <div className="global-nav-actions">
            <AccessibilityMenu
              a11y={a11y}
              onChangeA11y={onChangeA11y}
              soundEnabled={state?.soundEnabled}
              onToggleSound={onToggleSound}
              isOpen={a11yOpen}
              onToggleOpen={() => setA11yOpen((prev) => !prev)}
              onClose={() => setA11yOpen(false)}
            />

            {!user ? (
              publicView === 'login' ? (
                <button
                  type="button"
                  className="button-secondary-pill nav-access-btn"
                  onClick={onBackToLanding}
                >
                  <ArrowLeft size={15} weight="bold" />
                  <span>Presentación</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="button-primary-pill nav-access-btn cta-3d-lime"
                  onClick={onOpenLogin}
                >
                  <RocketLaunch size={15} weight="fill" />
                  <span>Acceder</span>
                </button>
              )
            ) : (
              <button type="button" className="button-dark-utility" onClick={onExit}>
                Salir
              </button>
            )}
          </div>
        </div>
      </header>

      {user && (
        <div className="sub-nav-frosted">
          <div className="sub-nav-inner">
            <div className="sub-nav-title">
              <span className="hud-mode-pill">
                <Sparkle size={14} weight="fill" />
                <span>{user.role === 'teacher' ? 'Consola Docente' : `Explorador · ${user.name}`}</span>
              </span>
            </div>
            <div className="sub-nav-controls">
              {user.role === 'student' ? (
                <>
                  <div className="hud-xp-pill" title={`${points} XP totales (${100 - xpInLevel} XP para subir a Nivel ${level + 1})`}>
                    <span className="hud-level-badge">
                      <AvatarGlyph avatar={state.avatar} size={15} />
                      <b>Nvl. {level}</b>
                    </span>
                    <div className="hud-xp-track" aria-label={`Experiencia: ${xpInLevel} de 100 XP`}>
                      <div className="hud-xp-fill" style={{ width: `${Math.max(12, xpInLevel)}%` }} />
                    </div>
                    <small className="hud-xp-text">{xpInLevel}/100 XP</small>
                  </div>

                  <span className="sub-nav-metric streak-metric" title="Racha de días activos">
                    <Flame size={16} weight="fill" />
                    <span>{state.streak || 1} días</span>
                  </span>

                  <button
                    type="button"
                    className="button-pearl-capsule coin-hud-btn"
                    onClick={onOpenShop}
                    aria-label={`Abrir tienda de avatares, tienes ${state.coins || 0} monedas`}
                  >
                    <Coins size={15} weight="fill" />
                    <span>{state.coins || 0}</span>
                  </button>

                  <button type="button" className="button-primary sub-nav-cta" onClick={onPython}>
                    <TerminalWindow size={15} weight="bold" />
                    <span>Python</span>
                  </button>
                </>
              ) : (
                <span className="sub-nav-metric">
                  <GraduationCap size={16} weight="duotone" />
                  <span>{user.name}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {user?.role === 'student' && (
        <nav className="mobile-quick-nav" aria-label="Accesos rápidos móviles">
          <button type="button" className="mobile-quick-btn" onClick={onHome}>
            <Compass size={15} weight="duotone" />
            <span>Inicio</span>
          </button>
          <button type="button" className="mobile-quick-btn" onClick={onGoMissions}>
            <RocketLaunch size={15} weight="duotone" />
            <span>Misiones</span>
          </button>
          <button type="button" className="mobile-quick-btn" onClick={onAssessment}>
            <Sparkle size={15} weight="duotone" />
            <span>Diagnóstico</span>
          </button>
          <button type="button" className="mobile-quick-btn" onClick={onPython}>
            <TerminalWindow size={15} weight="duotone" />
            <span>Python</span>
          </button>
        </nav>
      )}
    </div>
  );
}

function Footer({ onHome, onGoMissions, onPython, onAssessment, user, onOpenLogin }) {
  const handleNav = (event, action) => {
    event.preventDefault();
    if (action) action();
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="apple-footer">
      <div className="apple-footer-inner">
        <div className="apple-footer-columns">
          <div className="apple-footer-col">
            <h4>Aprendizaje</h4>
            <ul>
              <li><a href="#curriculum" onClick={(e) => handleNav(e, onGoMissions)}>Secuencias lógicas</a></li>
              <li><a href="#curriculum" onClick={(e) => handleNav(e, onGoMissions)}>Bucles e iteración</a></li>
              <li><a href="#curriculum" onClick={(e) => handleNav(e, onGoMissions)}>Estructuras condicionales</a></li>
              <li><a href="#curriculum" onClick={(e) => handleNav(e, onGoMissions)}>Depuración guiada</a></li>
            </ul>
          </div>
          <div className="apple-footer-col">
            <h4>Laboratorios</h4>
            <ul>
              <li><a href="#curriculum" onClick={(e) => handleNav(e, onGoMissions)}>Entorno visual Blockly</a></li>
              <li><a href="#top" onClick={(e) => handleNav(e, user?.role === 'student' ? onPython : onGoMissions)}>Transición a Python</a></li>
              <li><a href="#top" onClick={(e) => handleNav(e, user?.role === 'student' ? onAssessment : onHome)}>Diagnóstico adaptativo</a></li>
            </ul>
          </div>
          <div className="apple-footer-col">
            <h4>Comunidad y Acceso</h4>
            <ul>
              {!user && onOpenLogin ? (
                <li>
                  <a href="#top" onClick={(e) => handleNav(e, onOpenLogin)} style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                    🚀 Acceder a la plataforma
                  </a>
                </li>
              ) : null}
              <li><a href="#top" onClick={(e) => handleNav(e, onHome)}>Panel de seguimiento docente</a></li>
              <li><a href="#curriculum" onClick={(e) => handleNav(e, onGoMissions)}>Biblioteca de ejercicios</a></li>
              <li><a href="#top" onClick={(e) => handleNav(e, onHome)}>Recomendaciones con IA</a></li>
            </ul>
          </div>
        </div>
        <div className="apple-footer-brand-row">
          <img
            src="/images/logo_horizontal.jpg"
            alt="CodeKids Logo"
            className="footer-brand-logo"
          />
          <p className="footer-brand-tagline">
            Pensamiento computacional, programación por bloques y Python en una aventura gamificada.
          </p>
        </div>
        <div className="apple-footer-legal">
          <p>CodeKids Educación. Pensamiento computacional diseñado con claridad y precisión.</p>
        </div>
      </div>
    </footer>
  );
}

async function fetchWithCsrf(url, options = {}) {
  const csrfRes = await fetch('/api/v1/auth/csrf', { credentials: 'include' });
  const { csrfToken } = await csrfRes.json();
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': csrfToken,
      ...(options.headers || {}),
    },
  });
}

const QUICK_PROFILES = [
  { id: 'sofi', name: 'Sofi', role: 'student', avatar: 'dragon', badge: 'Nvl. 3 · Secuencias' },
  { id: 'mateo', name: 'Mateo', role: 'student', avatar: 'robot', badge: 'Nvl. 2 · Bucles' },
  { id: 'valeria', name: 'Valeria', role: 'student', avatar: 'fox', badge: 'Nvl. 4 · Python' },
  { id: 'profe', name: 'Profe Alex', role: 'teacher', avatar: 'unicorn', badge: 'Docente · 5° A' },
];

function Login({ onEnter, onBackToLanding }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'reset'
  const [role, setRole] = useState('student');
  const [selectedAvatar, setSelectedAvatar] = useState('dragon');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [previewEmailUrl, setPreviewEmailUrl] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPasswordValid = password.length >= 8;

  // Si el usuario abre el enlace del correo (/?resetToken=...), captura el token y limpia la URL (anti Referer-leak)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('resetToken');
    if (tokenFromUrl) {
      setAuthMode('reset');
      setResetToken(tokenFromUrl);
      setStatusMessage('Ingresa tu nueva contraseña para completar la recuperación.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    setPreviewEmailUrl('');
    setSubmitting(true);

    try {
      if (authMode === 'register') {
        if (!isEmailValid) {
          setErrorMessage('Por favor ingresa un correo institucional o válido.');
          return;
        }
        if (!isPasswordValid) {
          setErrorMessage('La contraseña debe tener mínimo 8 caracteres.');
          return;
        }
        const regResult = await registerUser({
          name: name.trim() || (role === 'teacher' ? 'Docente' : 'Explorador'),
          email,
          password,
          role,
          avatar: selectedAvatar,
        });

        if (!regResult.ok) {
          setErrorMessage(regResult.error || 'No se pudo crear la cuenta.');
          return;
        }
        onEnter(regResult.user);
      } else if (authMode === 'login') {
        const authResult = await authenticateUser(email, password);
        if (!authResult.ok) {
          setErrorMessage(authResult.error || 'Credenciales inválidas.');
          return;
        }
        onEnter(authResult.user);
      } else if (authMode === 'reset') {
        if (!isEmailValid) {
          setErrorMessage('Por favor ingresa el correo electrónico de tu cuenta.');
          return;
        }
        if (password.trim().length >= 8) {
          // Si ya escribió una nueva contraseña válida, actualizar directamente en Supabase / almacén
          const updateRes = await updatePasswordForEmail(email, password);
          if (!updateRes.ok) {
            setErrorMessage(updateRes.error || 'No se pudo actualizar la contraseña.');
            return;
          }
          setStatusMessage(updateRes.message || 'Contraseña actualizada. Ya puedes iniciar sesión.');
          setAuthMode('login');
          setPassword('');
          setResetToken('');
          return;
        }
        if (!resetToken.trim()) {
          try {
            const res = await fetchWithCsrf('/api/v1/auth/password-reset/request', {
              method: 'POST',
              body: JSON.stringify({ email }),
            });
            const data = await res.json();
            setStatusMessage(
              data.message || 'Si el correo está registrado, escribe tu nueva contraseña abajo para actualizarla.',
            );
            if (data.devPreviewUrl) {
              setPreviewEmailUrl(data.devPreviewUrl);
            }
          } catch {
            setResetToken('direct-reset');
            setStatusMessage('Ingresa tu nueva contraseña (mínimo 8 caracteres) para actualizarla en tu cuenta.');
          }
        } else {
          const updateRes = await updatePasswordForEmail(email, password);
          if (!updateRes.ok) {
            setErrorMessage(updateRes.error || 'No se pudo actualizar la contraseña.');
            return;
          }
          setStatusMessage(updateRes.message || 'Contraseña actualizada. Ya puedes iniciar sesión.');
          setAuthMode('login');
          setPassword('');
          setResetToken('');
        }
      }
    } catch {
      setErrorMessage('Error de conexión con el servidor de autenticación.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="top" className="apple-page">
      <section className="product-tile-light login-hero-tile cosmic-auth-stage">
        <div className="cosmic-orb orb-cyan" aria-hidden="true" />
        <div className="cosmic-orb orb-violet" aria-hidden="true" />
        <div className="cosmic-orb orb-lime" aria-hidden="true" />

        <div className="tile-container split-hero-grid">
          <div className="split-hero-copy">
            <span className="hero-eyebrow">⚡ TEMPORADA DE EXPLORADORES · EDICIÓN GAMIFICADA</span>
            <h1 className="hero-display">Domina el código jugando y creando.</h1>
            <p className="hero-lead">
              Programa al robot Pipo con bloques magnéticos, desbloquea mundos sci-fi y conquista el Laboratorio de Python.
            </p>

            {onBackToLanding && (
              <button
                type="button"
                className="text-link auth-back-link"
                onClick={onBackToLanding}
              >
                <ArrowLeft size={16} weight="bold" />
                <span>Volver a la página de presentación</span>
              </button>
            )}

            {/* Tarjeta Flotante con Efecto Glassmorphism */}
            <form className="apple-login-form glass-auth-card" onSubmit={handleAuthSubmit} noValidate>
              <div className="auth-brand-badge-container">
                <img
                  src="/images/logo_vertical.jpg"
                  alt="CodeKids Robot Pipo"
                  className="auth-brand-logo-vertical"
                />
                <div className="auth-brand-badge-text">
                  <span className="auth-brand-eyebrow">Aventura Oficial</span>
                  <span className="auth-brand-subtitle">¡Bienvenido a CodeKids!</span>
                </div>
              </div>

              <div className="auth-connection-bar">
                {isSupabaseConfigured ? (
                  <span className="auth-status-chip online" title="Base de datos Supabase conectada en vivo">
                    🟢 Supabase Conectado
                  </span>
                ) : (
                  <span className="auth-status-chip offline" title="Faltan las variables de entorno en Vercel">
                    🔴 Sin conexión a Supabase (Falta Redeploy en Vercel)
                  </span>
                )}
              </div>

              <div className="configurator-group">
                <div className="course-selector-group auth-tabs-bar" role="tablist" aria-label="Modo de acceso">
                  {[
                    { id: 'login', label: 'Iniciar sesión' },
                    { id: 'register', label: 'Crear cuenta' },
                    { id: 'reset', label: 'Recuperar clave' },
                  ].map((tab) => (
                    <button
                      type="button"
                      key={tab.id}
                      role="tab"
                      aria-selected={authMode === tab.id}
                      className={authMode === tab.id ? 'configurator-option-chip selected' : 'configurator-option-chip'}
                      onClick={() => {
                        setAuthMode(tab.id);
                        setErrorMessage('');
                        setStatusMessage('');
                      }}
                    >
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {authMode === 'register' && (
                <>
                  <div className="configurator-group">
                    <span className="field-label">Elige tu rol en la misión</span>
                    <div className="role-chip-grid" role="group" aria-label="Selecciona tu rol">
                      <button
                        type="button"
                        className={role === 'student' ? 'configurator-option-chip selected' : 'configurator-option-chip'}
                        onClick={() => setRole('student')}
                      >
                        <Student size={18} weight="duotone" />
                        <span className="chip-copy">
                          <b>Estudiante</b>
                          <small>Jugar y ganar XP</small>
                        </span>
                      </button>
                      <button
                        type="button"
                        className={role === 'teacher' ? 'configurator-option-chip selected' : 'configurator-option-chip'}
                        onClick={() => setRole('teacher')}
                      >
                        <GraduationCap size={18} weight="duotone" />
                        <span className="chip-copy">
                          <b>Docente</b>
                          <small>Crear misiones y guiar</small>
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="form-field-block">
                    <label className="field-label" htmlFor="demo-name">
                      Tu apodo o nombre de explorador
                    </label>
                    <div className="input-with-icon">
                      <span className="input-leading-icon">
                        <Student size={18} weight="duotone" />
                      </span>
                      <input
                        id="demo-name"
                        className="search-input has-icon"
                        placeholder={role === 'teacher' ? 'Por ejemplo, Profe Alex' : 'Por ejemplo, Sofi'}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={120}
                      />
                    </div>
                  </div>

                  <div className="configurator-group">
                    <span className="field-label">Elige tu compañero avatar inicial</span>
                    <div className="avatar-pills-row" role="group" aria-label="Selecciona tu avatar">
                      {AVATAR_SHOP.map((item) => (
                        <button
                          type="button"
                          key={item.avatar}
                          aria-pressed={selectedAvatar === item.avatar}
                          className={`avatar-mini-pill${selectedAvatar === item.avatar ? ' selected' : ''}`}
                          onClick={() => setSelectedAvatar(item.avatar)}
                        >
                          <AvatarGlyph avatar={item.avatar} size={16} />
                          <span>{item.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="form-field-block">
                <div className="field-label-row">
                  <label className="field-label" htmlFor="auth-email">
                    Correo electrónico
                  </label>
                  {email.length > 0 && (
                    <span className={`validation-pill ${isEmailValid ? 'valid' : 'pending'}`}>
                      {isEmailValid ? '✓ Formato válido' : 'Ingresa un correo válido'}
                    </span>
                  )}
                </div>
                <div className="input-with-icon">
                  <span className="input-leading-icon">
                    <Compass size={18} weight="duotone" />
                  </span>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    className={`search-input has-icon${email.length > 0 ? (isEmailValid ? ' input-valid' : ' input-warning') : ''}`}
                    placeholder="tu.correo@gmail.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>

              <div className="form-field-block">
                <div className="field-label-row">
                  <label className="field-label" htmlFor="auth-password">
                    {authMode === 'reset' ? 'Nueva contraseña (mín. 8 caracteres)' : 'Contraseña secreta'}
                  </label>
                  {password.length > 0 && (
                    <span className={`validation-pill ${isPasswordValid ? 'valid' : 'pending'}`}>
                      {isPasswordValid ? '✓ Escudo activo (8+)' : `${password.length}/8 caracteres`}
                    </span>
                  )}
                </div>
                <div className="input-with-icon">
                  <span className="input-leading-icon">
                    <Lock size={18} weight="duotone" />
                  </span>
                  <input
                    id="auth-password"
                    type="password"
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    required
                    minLength={8}
                    maxLength={128}
                    className={`search-input has-icon${password.length > 0 ? (isPasswordValid ? ' input-valid' : ' input-warning') : ''}`}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <small className="field-helper">
                  Tu contraseña queda enlazada directamente a tu correo en la base de datos.
                </small>
              </div>

              {errorMessage && (
                <p role="alert" className="auth-alert-box error">
                  {errorMessage}
                </p>
              )}

              {statusMessage && (
                <p role="status" className="auth-alert-box success">
                  {statusMessage}{' '}
                  {previewEmailUrl && (
                    <a
                      href={previewEmailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'underline', marginLeft: '6px' }}
                    >
                      Abrir correo de prueba (Ethereal)
                    </a>
                  )}
                </p>
              )}

              <div className="hero-cta-row">
                <button className="button-store-hero cta-3d-lime full-width-cta" type="submit" disabled={submitting}>
                  <RocketLaunch size={18} weight="fill" />
                  <span>
                    {submitting
                      ? 'Validando credenciales...'
                      : authMode === 'register'
                        ? 'Crear cuenta y comenzar'
                        : authMode === 'reset'
                          ? 'Actualizar contraseña'
                          : 'Iniciar sesión en CODEKIDS'}
                  </span>
                  <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            </form>
          </div>

          <div className="split-hero-visual">
            <div className="hero-showcase-frame">
              <div className="floating-achievement-badge top-badge">
                <Flame size={18} weight="fill" />
                <span>¡Racha de 5 días activa!</span>
              </div>
              <img
                className="product-render-shadow hero-product-image"
                src="/images/hero-codekids.png"
                alt="Robot Pipo junto a bloques de programación y tablero de estrellas en CodeKids"
                width="1000"
                height="800"
              />
              <div className="floating-achievement-badge bottom-badge">
                <Star size={18} weight="fill" />
                <span>+120 XP · Desbloquea misiones sci-fi</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="curriculum" className="product-tile-dark">
        <div className="tile-container">
          <div className="section-header-stack">
            <h2 className="display-lg">De los bloques visuales a Python, HTML5 y JavaScript.</h2>
            <p className="lead-subcopy">
              Explora mundos interactivos diseñados para desarrollar pensamiento computacional y programación real paso a paso.
            </p>
          </div>

          <div className="bento-curriculum-grid">
            <article className="bento-cell bento-cell-featured">
              <div className="bento-cell-copy">
                <Compass size={24} weight="regular" />
                <h3>El Bosque de las Secuencias</h3>
                <p>Ensambla bloques de movimiento y giro en orden para llevar a Pipo hasta la estrella.</p>
              </div>
              <img
                className="product-render-shadow bento-render"
                src="/images/world-forest.png"
                alt="Escenario 3D de El Bosque de las Secuencias con el robot Pipo"
                loading="lazy"
              />
            </article>

            <article className="bento-cell bento-cell-surface">
              <SlidersHorizontal size={24} weight="regular" />
              <h3>La Isla de los Bucles</h3>
              <p>Descubre patrones que se repiten para cruzar puentes y jardines con menos bloques.</p>
            </article>

            <article className="bento-cell bento-cell-surface">
              <Wall size={24} weight="regular" />
              <h3>La Cueva de las Decisiones</h3>
              <p>Usa condiciones inteligentes para detectar paredes y elegir caminos despejados.</p>
            </article>

            <article className="bento-cell bento-cell-featured">
              <div className="bento-cell-copy">
                <TerminalWindow size={24} weight="regular" />
                <h3>Laboratorio de Código Python</h3>
                <p>Avanza desde comandos del robot hasta funciones cuánticas, listas filtradas y diccionarios estelares en 6 etapas.</p>
              </div>
              <img
                className="product-render-shadow bento-render"
                src="/images/python-lab.png"
                alt="Estación del Laboratorio de Python con tablero del robot"
                loading="lazy"
              />
            </article>

            <article className="bento-cell bento-cell-surface">
              <Cpu size={24} weight="regular" />
              <h3>Estación de Funciones</h3>
              <p>Depura módulos orbitales y organiza subrutinas reutilizables libres de errores.</p>
            </article>

            <article className="bento-cell bento-cell-surface">
              <FileHtml size={24} weight="regular" />
              <h3>Ciudadela HTML</h3>
              <p>Reconstruye hologramas y portales espaciales con etiquetas semánticas HTML5 en tiempo real.</p>
            </article>

            <article className="bento-cell bento-cell-surface">
              <FileJs size={24} weight="regular" />
              <h3>Neo-Tokio JavaScript</h3>
              <p>Programa los neones y drones autónomos de la metrópolis cibernética con funciones JS.</p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, note, tone = 'blue' }) {
  return (
    <article className={`store-utility-card stat-utility-card tone-${tone}`}>
      <div className={`stat-utility-icon tone-${tone}`}>{icon}</div>
      <div className="stat-utility-body">
        <span className="stat-utility-label">{label}</span>
        <strong className="stat-utility-value">{value}</strong>
        <small className="stat-utility-note">{note}</small>
      </div>
    </article>
  );
}

function StudentDashboard({
  state,
  onAssessment,
  onPractice,
  onPython,
  onOpenCodeWorld,
  expansionData,
  pythonProgress,
  group,
  availableCourses = [],
  enrolledGroups = [],
  onGroupChange,
  onOpenAssignment,
  onOpenShop,
}) {
  const [aiRoute, setAiRoute] = useState(null);
  const [routeStatus, setRouteStatus] = useState('loading');
  const [skillFilter, setSkillFilter] = useState('Todos');
  const [difficultyFilter, setDifficultyFilter] = useState('Todas');
  const completed = state.completedMissions || [];
  const allCompleted = Array.from(new Set([...completed, ...(pythonProgress || [])]));
  const assignments = (state.assignments || []).filter((assignment) => assignment.group === group);
  const submissions = state.submissions || [];

  const activeExpansionWorlds =
    expansionData?.mundos?.length > 0 ? expansionData.mundos : EXPANSION_WORLDS;
  const activeExpansionMissions =
    expansionData?.misiones?.length > 0 ? expansionData.misiones : EXPANSION_MISSIONS;

  const findWorldMeta = (slug) => activeExpansionWorlds.find((w) => w.slug === slug);
  const findMissionMeta = (slug) => activeExpansionMissions.find((m) => m.slug === slug);

  const pyMeta = findWorldMeta('laboratorio-python');
  const htmlMeta = findWorldMeta('ciudadela-html');
  const jsMeta = findWorldMeta('neo-tokio-javascript');

  const worlds = [
    {
      title: 'El Bosque de las Secuencias',
      subtitle: 'Guía a los robots por nuevos caminos paso a paso',
      skill: 'Secuencias',
      mode: 'blockly',
      color: 'forest',
      image: '/images/world-forest.png',
      ids: ['sequence-forest', 'sequence-city', 'sequence-moon'],
    },
    {
      title: 'La Isla de los Bucles',
      subtitle: 'Descubre patrones que se repiten para ahorrar energía',
      skill: 'Bucles',
      mode: 'blockly',
      color: 'island',
      image: '/images/world-island.png',
      ids: ['loop-bridge', 'loop-zigzag', 'loop-garden'],
    },
    {
      title: 'La Cueva de las Decisiones',
      subtitle: 'Elige qué hacer ante cada obstáculo con sensores',
      skill: 'Condicionales',
      mode: 'blockly',
      color: 'cave',
      image: '/images/world-cave.png',
      ids: ['condition-detour', 'condition-cave', 'condition-river'],
    },
    {
      title: 'Estación de Funciones y Depuración',
      subtitle: 'Repara módulos de código y domina rutinas avanzadas',
      skill: 'Funciones',
      mode: 'blockly',
      color: 'forest',
      image: '/images/python-lab.png',
      ids: ['debug-sequence', 'debug-loop', 'debug-condition'],
    },
    {
      title: pyMeta?.titulo || 'Laboratorio de Código Python',
      subtitle:
        pyMeta?.descripcion ||
        'Domina comandos del robot, funciones cuánticas, listas filtradas y diccionarios estelares.',
      skill: 'Python',
      mode: 'python',
      worldSlug: 'laboratorio-python',
      color: 'island',
      image: '/images/python-lab.png',
      ids: [
        'python-sequence',
        'python-loop',
        'python-condition',
        'py-protocolo-escudo-cuantico',
        'py-radar-senales-corruptas',
        'py-nucleo-decodificador-estelar',
      ],
      nodeNames: [
        'Etapa 1 · Primer comando',
        'Etapa 2 · Bucle for',
        'Etapa 3 · Sensor if',
        `Etapa 4 · ${findMissionMeta('py-protocolo-escudo-cuantico')?.titulo || 'Escudo Cuántico'}`,
        `Etapa 5 · ${findMissionMeta('py-radar-senales-corruptas')?.titulo || 'Radar de Señales'}`,
        `Etapa 6 · ${findMissionMeta('py-nucleo-decodificador-estelar')?.titulo || 'Decodificador Estelar'}`,
      ],
      nodeLevels: ['Inicio', 'En camino', 'Explorador', 'Inicio', 'En camino', 'Explorador'],
      nodeXp: [
        15,
        15,
        15,
        findMissionMeta('py-protocolo-escudo-cuantico')?.xp_recompensa || 45,
        findMissionMeta('py-radar-senales-corruptas')?.xp_recompensa || 55,
        findMissionMeta('py-nucleo-decodificador-estelar')?.xp_recompensa || 70,
      ],
    },
    {
      title: htmlMeta?.titulo || 'Ciudadela HTML',
      subtitle:
        htmlMeta?.descripcion ||
        'Reconstruye hologramas y portales espaciales con etiquetas semánticas HTML5 en vivo.',
      skill: 'HTML5',
      mode: 'code-world',
      worldSlug: 'ciudadela-html',
      color: 'island',
      image: '/images/world-island.png',
      ids: ['html-faro-holografico', 'html-portal-suministros'],
      nodeNames: [
        `Misión 1 · ${findMissionMeta('html-faro-holografico')?.titulo || 'El Faro Holográfico'}`,
        `Misión 2 · ${findMissionMeta('html-portal-suministros')?.titulo || 'Portal de Suministros'}`,
      ],
      nodeLevels: ['Inicio', 'En camino'],
      nodeXp: [
        findMissionMeta('html-faro-holografico')?.xp_recompensa || 25,
        findMissionMeta('html-portal-suministros')?.xp_recompensa || 35,
      ],
    },
    {
      title: jsMeta?.titulo || 'Neo-Tokio JavaScript',
      subtitle:
        jsMeta?.descripcion ||
        'Programa la red de neones y los drones autónomos de la metrópolis con lógica JavaScript.',
      skill: 'JavaScript',
      mode: 'code-world',
      worldSlug: 'neo-tokio-javascript',
      color: 'cave',
      image: '/images/world-cave.png',
      ids: ['js-neones-shibuya', 'js-dron-mensajero'],
      nodeNames: [
        `Misión 1 · ${findMissionMeta('js-neones-shibuya')?.titulo || 'Encendiendo los Neones de Shibuya'}`,
        `Misión 2 · ${findMissionMeta('js-dron-mensajero')?.titulo || 'Dron Mensajero Autónomo'}`,
      ],
      nodeLevels: ['Inicio', 'Explorador'],
      nodeXp: [
        findMissionMeta('js-neones-shibuya')?.xp_recompensa || 30,
        findMissionMeta('js-dron-mensajero')?.xp_recompensa || 45,
      ],
    },
  ];

  const blocklyWorlds = worlds.slice(0, 4);

  const openMissionById = (missionId) => {
    if (!missionId) return;
    if (missionId.startsWith('python-') || missionId.startsWith('py-')) {
      onPython(missionId);
    } else if (missionId.startsWith('html-')) {
      onOpenCodeWorld('ciudadela-html', missionId);
    } else if (missionId.startsWith('js-')) {
      onOpenCodeWorld('neo-tokio-javascript', missionId);
    } else {
      onPractice(missionId);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    setRouteStatus('loading');
    fetch('/api/ai/student-route', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        scores: state.scores,
        progress: state.completedMissions || [],
        recentResults: (state.submissions || [])
          .filter((row) => row.studentName === state.user.name)
          .slice(0, 8)
          .map(({ skill, score, gameOutcome }) => ({
            skill,
            score,
            success: Boolean(gameOutcome?.success),
            attempts: gameOutcome?.attempts || 1,
          })),
        missionCatalog: blocklyWorlds.flatMap((world) =>
          world.ids.map((id, index) => ({ id, skill: world.skill, level: index + 1 })),
        ),
      }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('AI local no disponible');
        return response.json();
      })
      .then((data) => {
        setAiRoute(data);
        setRouteStatus('ready');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          // Motor Pedagógico Adaptativo autónomo para Vercel / Nube
          const skillsList = ['Secuencias', 'Bucles', 'Condicionales', 'Descomposición'];
          const scores = state.scores || {};
          const sorted = [...skillsList].sort((a, b) => (scores[a] || 50) - (scores[b] || 50));
          const weakest = sorted[0] || 'Bucles';
          const secondWeakest = sorted[1] || 'Condicionales';

          const worldForWeakest = blocklyWorlds.find((w) => w.skill === weakest) || blocklyWorlds[0];
          const pending = (worldForWeakest?.ids || []).filter((id) => !completed.includes(id));
          const recommendedMissions = pending.length > 0 ? pending : (worldForWeakest?.ids || ['loop-bridge']);

          const activities = {
            Secuencias: 'Organiza bloques de avance y giros en el orden lógico correcto.',
            Bucles: 'Aplica el bloque «repetir» para resolver trayectorias largas ahorrando instrucciones.',
            Condicionales: 'Evalúa sensores «si hay pared» para tomar decisiones automáticas ante obstáculos.',
            Descomposición: 'Identifica errores en rutinas previas y depura la ruta del personaje.',
          };

          const reasons = {
            Secuencias: `Diagnóstico: ${scores.Secuencias || 60}%. Fortalecer el paso a paso consolidará tus bases algorítmicas.`,
            Bucles: `Diagnóstico: ${scores.Bucles || 45}%. Dominar repeticiones te permitirá resolver desafíos en menos pasos.`,
            Condicionales: `Diagnóstico: ${scores.Condicionales || 55}%. Aprender a bifurcar caminos te dará control total del robot.`,
            Descomposición: `Diagnóstico: ${scores.Descomposición || 50}%. Desarmar problemas grandes en pasos pequeños evitará bloqueos.`,
          };

          setAiRoute({
            summary: `¡Hola, ${state.user?.name || 'Explorador'}! Tu ruta personalizada adaptativa recomienda afianzar ${weakest} y ${secondWeakest} para acelerar tu ascenso al siguiente nivel.`,
            model: 'CodeKids Adaptive AI Tutor',
            priorities: [
              {
                skill: weakest,
                reason: reasons[weakest] || 'Habilidad prioritaria según tu perfil diagnóstico.',
                activity: activities[weakest] || 'Práctica interactiva en el mapa.',
              },
              {
                skill: secondWeakest,
                reason: reasons[secondWeakest] || 'Refuerzo complementario para completar tu perfil.',
                activity: activities[secondWeakest] || 'Desafío en el tablero espacial.',
              },
            ],
            recommendedMissionIds: recommendedMissions.slice(0, 2),
          });
          setRouteStatus('ready');
        }
      });
    return () => controller.abort();
  }, [state.scores, state.completedMissions, state.submissions, state.user.name]);

  const firstOpen =
    worlds.flatMap((world) => world.ids).find((id) => !allCompleted.includes(id)) || 'sequence-forest';
  const totalMissionCount = worlds.reduce((sum, world) => sum + world.ids.length, 0);
  const completedMissionCount = worlds.reduce(
    (sum, world) => sum + world.ids.filter((id) => allCompleted.includes(id)).length,
    0,
  );
  const pythonWorldIds = worlds.find((w) => w.skill === 'Python')?.ids || [];
  const pythonDoneCount = pythonWorldIds.filter((id) => allCompleted.includes(id)).length;

  const earnedBadges = [
    allCompleted.length >= 1,
    ['loop-bridge', 'loop-zigzag', 'loop-garden'].every((id) => allCompleted.includes(id)),
    ['condition-detour', 'condition-cave', 'condition-river'].every((id) => allCompleted.includes(id)),
  ].filter(Boolean).length;

  const filteredWorlds = worlds.filter((world) => skillFilter === 'Todos' || world.skill === skillFilter);

  return (
    <main id="top" className="apple-page">
      {/* Tile 1: Student Hero */}
      <section className="product-tile-light student-hero-tile">
        <div className="tile-container split-hero-grid">
          <div className="split-hero-copy">
            <span className="hero-eyebrow">🚀 TU MODO HISTORIA · MAPA DE AVENTURA</span>
            <h1 className="hero-display">¡Hola, {state.user.name}!</h1>
            <p className="hero-lead">
              Cada misión completada en bloques, Python, HTML5 o JavaScript suma XP a tu rango de explorador. ¿Listo para tu siguiente reto?
            </p>
            <div className="hero-cta-row">
              <button type="button" className="button-primary adventure-cta-btn cta-3d-lime" onClick={() => openMissionById(firstOpen)}>
                <Play size={16} weight="fill" />
                <span>Continuar misión actual</span>
              </button>
              <button type="button" className="button-secondary-pill" onClick={onAssessment}>
                <Sparkle size={15} weight="duotone" />
                <span>Test de nivelación</span>
              </button>
            </div>
          </div>
          <div className="split-hero-visual">
            <img
              className="product-render-shadow hero-product-image"
              src="/images/hero-codekids.png"
              alt="Robot Pipo listo para una nueva misión de bloques"
              width="960"
              height="720"
            />
          </div>
        </div>
      </section>

      {/* Tile 2: Parchment Metrics & Adaptive Route */}
      <section className="product-tile-parchment">
        <div className="tile-container">
          <div className="section-header-stack">
            <h2 className="display-lg">Tu centro de mando.</h2>
            <p className="lead-subcopy">
              Consulta tu experiencia acumulada, tu racha diaria y las sugerencias personalizadas por IA.
            </p>
          </div>

          <div className="metrics-bento-grid">
            <StatCard
              icon={<Lightning size={24} weight="fill" />}
              label="Experiencia Total"
              value={`${state.points} XP`}
              note={`Explorador Nivel ${Math.floor((state.points || 0) / 100) + 1}`}
              tone="mint"
            />
            <StatCard
              icon={<Flame size={24} weight="fill" />}
              label="Racha Activa"
              value={`${state.streak || 1} ${(state.streak || 1) === 1 ? 'día' : 'días'}`}
              note="¡Sigue practicando hoy!"
              tone="peach"
            />
            <StatCard
              icon={<Trophy size={24} weight="fill" />}
              label="Insignias y Medallas"
              value={`${earnedBadges} de 3`}
              note={`${completedMissionCount} de ${totalMissionCount} misiones superadas`}
              tone="lav"
            />
          </div>

          {routeStatus === 'ready' && aiRoute && (
            <div className="store-utility-card ai-route-banner">
              <div className="ai-route-header">
                <div className="ai-route-title-group">
                  <Sparkle size={20} weight="fill" />
                  <div>
                    <h3>Ruta sugerida por Ollama</h3>
                    <p>{aiRoute.summary}</p>
                  </div>
                </div>
                <span className="model-tag">{aiRoute.model}</span>
              </div>
              {aiRoute.priorities?.length > 0 && (
                <div className="ai-priority-grid">
                  {aiRoute.priorities.slice(0, 2).map((item) => (
                    <div className="ai-priority-item" key={item.skill}>
                      <b>{item.skill}</b>
                      <p>{item.reason}</p>
                      <small>Idea: {item.activity}</small>
                    </div>
                  ))}
                </div>
              )}
              {aiRoute.recommendedMissionIds?.length > 0 && (
                <div className="ai-route-actions">
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() =>
                      openMissionById(
                        aiRoute.recommendedMissionIds.find((id) => !allCompleted.includes(id)) || firstOpen,
                      )
                    }
                  >
                    <span>Practicar misión sugerida</span>
                    <ArrowRight size={15} weight="regular" />
                  </button>
                </div>
              )}
            </div>
          )}

          {routeStatus === 'offline' && (
            <p className="offline-caption">
              La ruta personalizada aparecerá cuando Ollama esté conectado. Mientras tanto, avanza por el mapa de mundos.
            </p>
          )}
        </div>
      </section>

      {/* Tile 3: Mapa de Aventura & Filtros Rápidos */}
      <section id="curriculum" className="product-tile-dark world-map-tile">
        <div className="tile-container">
          <div className="section-header-stack">
            <span className="hero-eyebrow">🗺️ MAPA DE MUNDOS DESBLOQUEABLES</span>
            <h2 className="display-lg">Elige tu próxima misión.</h2>
            <p className="lead-subcopy">
              Supera las etapas para ganar estrellas, medallas y dominar nuevos lenguajes ({completedMissionCount} de {totalMissionCount} misiones).
            </p>
          </div>

          {/* Barra de Filtros Rápidos por Temática y Dificultad */}
          <div className="adventure-filters-bar" aria-label="Filtros del mapa de misiones">
            <div className="filter-pill-group" role="group" aria-label="Filtrar por temática o lenguaje">
              {['Todos', 'Secuencias', 'Bucles', 'Condicionales', 'Funciones', 'Python', 'HTML5', 'JavaScript'].map((topic) => (
                <button
                  type="button"
                  key={topic}
                  aria-pressed={skillFilter === topic}
                  className={`map-filter-chip${skillFilter === topic ? ' active' : ''}`}
                  onClick={() => setSkillFilter(topic)}
                >
                  {topic !== 'Todos' && <SkillGlyph skill={topic} size={15} />}
                  <span>{topic}</span>
                </button>
              ))}
            </div>

            <div className="filter-pill-group difficulty-group" role="group" aria-label="Filtrar por dificultad">
              {[
                { id: 'Todas', label: '⚡ Todas las dificultades' },
                { id: 'Inicio', label: '🟢 Nivel 1 · Inicio' },
                { id: 'En camino', label: '🟡 Nivel 2 · En camino' },
                { id: 'Explorador', label: '🟣 Nivel 3 · Explorador' },
              ].map((diff) => (
                <button
                  type="button"
                  key={diff.id}
                  aria-pressed={difficultyFilter === diff.id}
                  className={`map-filter-chip diff-chip${difficultyFilter === diff.id ? ' active' : ''}`}
                  onClick={() => setDifficultyFilter(diff.id)}
                >
                  <span>{diff.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="worlds-stack">
            {filteredWorlds.map((world) => {
              const worldIndex = worlds.findIndex((w) => w.skill === world.skill);
              const totalInWorld = world.ids.length;
              const worldDoneCount = world.ids.filter((id) => allCompleted.includes(id)).length;
              return (
                <article className={`world-showcase-row world-tone-${world.color}`} key={world.skill}>
                  <div className="world-showcase-media">
                    <span className="world-sector-badge">MUNDO 0{worldIndex + 1}</span>
                    <img
                      className="product-render-shadow world-render-img"
                      src={world.image}
                      alt={world.title}
                      loading="lazy"
                    />
                  </div>
                  <div className="world-showcase-content">
                    <div className="world-showcase-header">
                      <div className="world-header-top">
                        <span className="world-skill-label">
                          <SkillGlyph skill={world.skill} size={14} /> {world.skill}
                        </span>
                        <span className="world-progress-pill">
                          <Star size={13} weight="fill" /> {worldDoneCount * 3} / {totalInWorld * 3} estrellas
                        </span>
                      </div>
                      <h3>{world.title}</h3>
                      <p>{world.subtitle}</p>
                      <small className="world-completion-meta">
                        {worldDoneCount} de {totalInWorld} misiones completadas
                      </small>
                    </div>
                    <div className="world-nodes-grid">
                      {world.ids.map((id, index) => {
                        const done = allCompleted.includes(id);
                        const previousWorldComplete =
                          worldIndex === 0 ||
                          worldIndex >= 3 ||
                          worlds[worldIndex - 1].ids.every((prevId) => allCompleted.includes(prevId));
                        const unlockedEntryIndex =
                          index === 0 || (world.mode === 'python' && index === 3);
                        const locked =
                          !previousWorldComplete ||
                          (!unlockedEntryIndex && !allCompleted.includes(world.ids[index - 1]));
                        const active = !done && !locked;
                        const defaultLevels = ['Inicio', 'En camino', 'Explorador'];
                        const defaultNames = [
                          'Misión 1 · Primer paso',
                          'Misión 2 · Nuevo camino',
                          'Misión 3 · Gran jefe',
                        ];
                        const levelLabel = world.nodeLevels?.[index] || defaultLevels[index] || 'Explorador';
                        const nodeLabel = world.nodeNames?.[index] || defaultNames[index] || `Misión ${index + 1}`;
                        const xpValue = world.nodeXp?.[index] || 10;
                        const matchesDifficulty =
                          difficultyFilter === 'Todas' || levelLabel === difficultyFilter;

                        if (!matchesDifficulty) return null;

                        return (
                          <button
                            type="button"
                            key={id}
                            disabled={locked}
                            onClick={() => openMissionById(id)}
                            aria-label={`${nodeLabel}${locked ? ', bloqueado' : done ? ', completado con 3 estrellas' : ', disponible'}`}
                            className={`world-stage-pill${done ? ' done' : ''}${active ? ' active' : ''}${locked ? ' locked' : ''}`}
                          >
                            <span className="world-stage-icon">
                              {done ? (
                                <Trophy size={16} weight="fill" />
                              ) : locked ? (
                                <Lock size={15} weight="duotone" />
                              ) : (
                                <Play size={14} weight="fill" />
                              )}
                            </span>
                            <span className="world-stage-text">
                              <b>{nodeLabel}</b>
                              <small>
                                {done
                                  ? `Completado · +${xpValue} XP`
                                  : locked
                                    ? '🔒 Bloqueado'
                                    : `⚡ ¡Disponible! · +${xpValue} XP`}
                              </small>
                              <span className="mission-node-stars" aria-hidden="true">
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
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tile 4: School Assignments & Companion Profile */}
      <section className="product-tile-light">
        <div className="tile-container">
          <div className="student-Dual-grid">
            <div className="assignments-column">
              <div className="subsection-header subsection-header-row">
                <div>
                  <h2 className="display-md">Retos del colegio ({group})</h2>
                  <p className="body-copy">Actividades publicadas por tu docente para tu grupo.</p>
                </div>
                {onGroupChange && (
                  <div className="course-selector-group" role="group" aria-label="Seleccionar mi curso">
                    {Array.from(
                      new Set([
                        ...(enrolledGroups || []),
                        ...(availableCourses || []).map((c) => c.codigoGrupo || c),
                        '5° A',
                        '6° B',
                      ]),
                    ).map((courseName) => {
                      const isEnrolled = (enrolledGroups || []).includes(courseName);
                      return (
                        <button
                          type="button"
                          key={courseName}
                          className={
                            group === courseName
                              ? 'configurator-option-chip selected'
                              : 'configurator-option-chip'
                          }
                          onClick={() => onGroupChange(courseName)}
                        >
                          <span>
                            {courseName}
                            {isEnrolled ? ' ✓' : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {assignments.length ? (
                <div className="utility-card-stack">
                  {assignments.map((assignment) => {
                    const submitted = submissions.find(
                      (item) => item.assignmentId === assignment.id && item.studentName === state.user.name,
                    );
                    return (
                      <article className="store-utility-card assignment-utility-row" key={assignment.id}>
                        <div className="assignment-utility-info">
                          <span className="assignment-meta-tag">
                            {assignment.skill} | {submitted ? `Evaluado: ${submitted.score}%` : 'Pendiente'}
                          </span>
                          <h3>{assignment.title}</h3>
                          <p>{assignment.instructions}</p>
                        </div>
                        <button
                          type="button"
                          className={submitted ? 'button-secondary-pill' : 'button-primary'}
                          onClick={() => onOpenAssignment(assignment, submitted)}
                        >
                          <span>{submitted ? 'Ver resultado' : 'Resolver reto'}</span>
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="store-utility-card empty-state-card">
                  <ClipboardText size={28} weight="regular" />
                  <h3>Sin retos asignados todavía</h3>
                  <p>Aquí aparecerán los ejercicios que publique tu docente para el curso {group}.</p>
                </div>
              )}
            </div>

            <div className="profile-column">
              <div className="subsection-header">
                <h2 className="display-md">Tu perfil e insignias</h2>
                <p className="body-copy">Personaliza tu compañero de aventura y revisa tu colección.</p>
              </div>

              <div className="utility-card-stack">
                <article className="store-utility-card companion-summary-card">
                  <div className="companion-avatar-circle">
                    <AvatarGlyph avatar={state.avatar} size={28} />
                  </div>
                  <div className="companion-summary-copy">
                    <h3>{state.user.name}</h3>
                    <p>
                      {completedMissionCount} retos | {state.points} XP | {state.coins || 0} monedas
                    </p>
                    <button type="button" className="text-link" onClick={onOpenShop}>
                      <span>Personalizar avatar</span>
                      <ArrowRight size={14} weight="regular" />
                    </button>
                  </div>
                </article>

                <article className="store-utility-card badges-utility-card">
                  <h3>Mi colección de insignias</h3>
                  <div className="badges-grid">
                    <div className={allCompleted.length >= 1 ? 'badge-item earned' : 'badge-item'}>
                      <Compass size={24} weight="duotone" />
                      <b>Primer código</b>
                    </div>
                    <div
                      className={
                        ['loop-bridge', 'loop-zigzag', 'loop-garden'].every((id) => allCompleted.includes(id))
                          ? 'badge-item earned'
                          : 'badge-item'
                      }
                    >
                      <SlidersHorizontal size={24} weight="duotone" />
                      <b>Master bucles</b>
                    </div>
                    <div
                      className={
                        ['condition-detour', 'condition-cave', 'condition-river'].every((id) => allCompleted.includes(id))
                          ? 'badge-item earned'
                          : 'badge-item'
                      }
                    >
                      <Brain size={24} weight="duotone" />
                      <b>Lógica de acero</b>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tile 5: Multi-Language Code Labs Feature Tile */}
      <section className="product-tile-dark-2 python-feature-tile">
        <div className="tile-container split-hero-grid">
          <div className="split-hero-copy">
            <span className="hero-eyebrow">⚡ EXPANSIÓN MULTILENGUAJE</span>
            <h2 className="display-lg">Laboratorios de Código Real.</h2>
            <p className="lead-subcopy">
              Escribe código en vivo en Python ({pythonDoneCount} de 6 etapas), construye interfaces en Ciudadela HTML o programa drones en Neo-Tokio JavaScript.
            </p>
            <div className="hero-cta-row">
              <button type="button" className="button-primary" onClick={() => onPython('')}>
                <TerminalWindow size={16} weight="regular" />
                <span>Python (6 etapas)</span>
              </button>
              <button
                type="button"
                className="button-secondary-pill"
                onClick={() => onOpenCodeWorld('ciudadela-html', '')}
              >
                <FileHtml size={16} weight="regular" />
                <span>Ciudadela HTML</span>
              </button>
              <button
                type="button"
                className="button-secondary-pill"
                onClick={() => onOpenCodeWorld('neo-tokio-javascript', '')}
              >
                <FileJs size={16} weight="regular" />
                <span>Neo-Tokio JS</span>
              </button>
            </div>
          </div>
          <div className="split-hero-visual">
            <img
              className="product-render-shadow hero-product-image"
              src="/images/python-lab.png"
              alt="Laboratorios de programación Python, HTML5 y JavaScript de CodeKids"
              loading="lazy"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function Assessment({ onSubmit, onCancel }) {
  const [answers, setAnswers] = useState({});
  return (
    <main className="apple-page">
      <section className="product-tile-light">
        <div className="tile-container narrow-container">
          <button type="button" className="text-link back-nav-link" onClick={onCancel}>
            <ArrowLeft size={15} weight="regular" />
            <span>Volver a mi espacio</span>
          </button>

          <div className="section-header-stack left-aligned">
            <span className="hero-eyebrow">DIAGNÓSTICO DE PENSAMIENTO COMPUTACIONAL</span>
            <h1 className="display-lg">¡Vamos a descubrir cómo piensas!</h1>
            <p className="body-copy">
              Responde estas cuatro preguntas a tu manera. Al terminar te sugerimos por dónde continuar.
            </p>
          </div>

          <div className="question-stack">
            {questions.map((question, index) => (
              <fieldset className="store-utility-card question-utility-card" key={question.skill}>
                <legend>
                  <span className="question-skill-pill">{question.skill}</span>
                  <strong>{question.prompt}</strong>
                </legend>
                <div className="question-options-grid">
                  {question.options.map((option, optionIndex) => (
                    <label
                      className={
                        answers[index] === optionIndex
                          ? 'configurator-option-chip selected answer-chip'
                          : 'configurator-option-chip answer-chip'
                      }
                      key={option}
                    >
                      <input
                        type="radio"
                        name={`q-${index}`}
                        checked={answers[index] === optionIndex}
                        onChange={() => setAnswers({ ...answers, [index]: optionIndex })}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="assessment-footer-bar">
            <button
              type="button"
              className="button-primary"
              disabled={Object.keys(answers).length < questions.length}
              onClick={() => onSubmit(answers)}
            >
              <span>Ver mi ruta personalizada</span>
              <ArrowRight size={15} weight="regular" />
            </button>
            {Object.keys(answers).length < questions.length && (
              <small className="field-helper">Responde las 4 preguntas para continuar.</small>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function ResultView({ state, onDone }) {
  const weakest = Object.entries(state.scores).sort((a, b) => a[1] - b[1])[0];
  return (
    <main className="apple-page">
      <section className="product-tile-light">
        <div className="tile-container narrow-container centered-result">
          <span className="hero-eyebrow">TU DIAGNÓSTICO ESTÁ LISTO</span>
          <h1 className="hero-display">¡Buen trabajo, {state.user.name}!</h1>
          <p className="hero-lead">
            Obtuviste {state.lastScore}% de respuestas correctas. Ya sabemos qué habilidad te ayudará a dar el siguiente paso.
          </p>

          <article className="store-utility-card recommendation-spotlight">
            <Compass size={28} weight="regular" />
            <div>
              <small>Te recomendamos practicar</small>
              <h2>{weakest[0]}</h2>
              <p>
                Empezaremos con ejemplos guiados y retos cortos de {weakest[0].toLowerCase()}. Cuando te sientas listo, subimos el nivel.
              </p>
            </div>
          </article>

          <div className="hero-cta-row centered">
            <button type="button" className="button-primary" onClick={onDone}>
              <span>Ir a mi nueva ruta</span>
              <ArrowRight size={15} weight="regular" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function StudentPractice({ skill, onClose, onComplete, soundEnabled }) {
  const challenge = getBlocklyChallenge(skill);
  const [outcome, setOutcome] = useState(null);
  const [awarded, setAwarded] = useState(false);
  const [dialogue, setDialogue] = useState('¡Hola, explorador! Vamos a ayudarme a llegar a la estrella.');
  const mood = outcome?.success ? 'party' : outcome ? 'thinking' : 'hello';

  const complete = async (result) => {
    setOutcome(result);
    if (!result.success && soundEnabled) playSfx('try');
    setDialogue(
      result.success
        ? '¡Lo lograste! ¡El camino quedó perfecto!'
        : '¡Encontramos una pista! Revisemos los bloques y probemos otro camino.',
    );
    if (result.success && !awarded) setAwarded(Boolean(onComplete(challenge.id)));
    try {
      const response = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          skill: challenge.skill,
          challenge: challenge.exerciseTitle,
          success: result.success,
          attempts: result.attempts,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.message) setDialogue(data.message);
      }
    } catch {
      /* Pipo mantiene su mensaje local cuando Ollama no está conectado. */
    }
  };

  return (
    <main id="top" className="apple-page fullscreen-exercise-page">
      <div className="fullscreen-exercise-container">
        <header className="workspace-topbar">
          <div className="workspace-topbar-left">
            <button type="button" className="workspace-back-btn" onClick={onClose}>
              <ArrowLeft size={16} weight="bold" />
              <span>Volver al mapa</span>
            </button>
            <div className="workspace-title-group">
              <span className="modal-meta-label">
                ⚡ Misión {challenge.level} · Recompensa: +10 XP y +10 monedas
              </span>
              <h1 id="practice-title">{challenge.exerciseTitle}</h1>
              <p>{challenge.instructions}</p>
            </div>
          </div>

          <div className="workspace-reward-badges">
            <span className="reward-pill xp">
              <Lightning size={15} weight="fill" /> +10 XP
            </span>
            <span className="reward-pill coins">
              <Coins size={15} weight="fill" /> +10 Monedas
            </span>
          </div>
        </header>

        <BlocklyMission
          key={challenge.id}
          missionId={challenge.id}
          templateId={challenge.templateId}
          onComplete={complete}
          dialogue={dialogue}
          mood={mood}
          soundEnabled={soundEnabled}
        />

        {outcome?.success && (
          <div className="story-win" role="status">
            <CheckCircle size={20} weight="fill" />
            <div className="story-win-copy">
              <b>¡Misión completada!</b>
              <span>
                {awarded
                  ? 'Ganaste 10 XP y 10 monedas. ¡Tu aventura sigue!'
                  : '¡La resolviste otra vez! Tu racha sigue viva.'}
              </span>
            </div>
            <button type="button" className="button-primary" onClick={onClose}>
              <span>Volver al mapa</span>
              <ArrowRight size={14} weight="regular" />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function AvatarShop({ state, onClose, onBuy, onSelect }) {
  return (
    <div className="modal-backdrop avatar-shop-backdrop" onClick={onClose}>
      <section
        className="feedback-modal avatar-shop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} weight="regular" />
        </button>
        <h2 id="shop-title">Tienda de compañeros</h2>
        <p>Usa tus monedas para desbloquear un nuevo avatar y cambiarlo cuando quieras.</p>

        <div className="shop-balance">
          <span>Monedas disponibles</span>
          <b>
            <Coins size={16} weight="duotone" /> {state.coins || 0} monedas
          </b>
        </div>

        <div className="shop-grid">
          {AVATAR_SHOP.map((item) => {
            const owned = (state.ownedAvatars || ['astronaut', '🧑‍🚀']).includes(item.avatar);
            const selected = (state.avatar || 'astronaut') === item.avatar;
            const canAfford = (state.coins || 0) >= item.cost;
            return (
              <article className={`store-utility-card shop-item${selected ? ' selected' : ''}`} key={item.avatar}>
                <div className={`shop-companion-medallion tone-${item.tone}`}>
                  <AvatarGlyph avatar={item.avatar} size={36} />
                </div>
                <b>{item.name}</b>
                <small>{item.note}</small>
                {selected ? (
                  <button type="button" className="button-pearl-capsule" disabled>
                    Tu avatar
                  </button>
                ) : owned ? (
                  <button type="button" className="button-secondary-pill" onClick={() => onSelect(item.avatar)}>
                    Elegir
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button-primary"
                    disabled={!canAfford}
                    onClick={() => onBuy(item)}
                  >
                    {!canAfford ? `Faltan ${item.cost - (state.coins || 0)} monedas` : `Desbloquear por ${item.cost}`}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function InteractiveExercise({ skill, templateId, onComplete }) {
  const isSequence = templateId ? templateId === 'sequence-order' : skill === 'Secuencias';
  const isLoop = templateId ? templateId === 'loop-count' : skill === 'Bucles';
  const isConditional = templateId ? templateId === 'if-choice' : skill === 'Condicionales';
  const isDecomposition = !templateId && skill === 'Descomposición';
  const [order, setOrder] = useState(
    isDecomposition ? ['Probar', 'Planear', 'Construir'] : ['Avanzar', 'Inicio', 'Llegada'],
  );
  const [repetitions, setRepetitions] = useState(1);
  const [choice, setChoice] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState('');
  const correctOrder = isDecomposition ? ['Planear', 'Construir', 'Probar'] : ['Inicio', 'Avanzar', 'Llegada'];

  const moveItem = (index, direction) =>
    setOrder((current) => {
      const next = [...current];
      const target = index + direction;
      if (target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const check = () => {
    const nextAttempt = attempts + 1;
    setAttempts(nextAttempt);
    let success = false;
    let evidence = '';
    if (isSequence || isDecomposition) {
      success = order.every((item, index) => item === correctOrder[index]);
      evidence = `Orden: ${order.join(' -> ')}`;
    } else if (isLoop) {
      success = repetitions === 4;
      evidence = `Bloque repetir ${repetitions} veces`;
    } else if (isConditional) {
      success = choice === 'Girar';
      evidence = choice ? `Si encuentra una pared: ${choice.toLowerCase()}` : 'Sin acción seleccionada';
    }
    setMessage(success ? '¡Sí! El reto funciona.' : 'Casi... cambia algo y prueba otra vez.');
    onComplete({ success, evidence, attempts: nextAttempt });
  };

  return (
    <div className="interactive-exercise">
      <div className="game-board">
        <span className="game-mascot">
          <Cpu size={28} weight="duotone" />
        </span>
        {isLoop ? (
          <div className="loop-track">
            {[1, 2, 3, 4].map((step) => (
              <span className={step <= repetitions ? 'track-step active' : 'track-step'} key={step}>
                <Star size={16} weight="fill" />
              </span>
            ))}
          </div>
        ) : (
          <span className="game-goal">
            <Star size={24} weight="fill" />
          </span>
        )}
      </div>

      {isSequence || isDecomposition ? (
        <>
          <p className="game-prompt">Ordena los pasos para llegar a la meta:</p>
          <div className="sequence-builder">
            {order.map((item, index) => (
              <div className="sequence-piece" key={item}>
                <span className="piece-number">{index + 1}</span>
                <b>{item}</b>
                <div className="sequence-piece-actions">
                  <button
                    type="button"
                    aria-label={`Mover ${item} arriba`}
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                  >
                    <ArrowUp size={14} weight="regular" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Mover ${item} abajo`}
                    disabled={index === order.length - 1}
                    onClick={() => moveItem(index, 1)}
                  >
                    <ArrowDown size={14} weight="regular" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : isLoop ? (
        <>
          <p className="game-prompt">El robot necesita 4 pasos. ¿Cuántas veces repetimos «avanzar»?</p>
          <div className="repeat-builder">
            <button
              type="button"
              aria-label="Restar una repetición"
              onClick={() => setRepetitions((value) => Math.max(1, value - 1))}
            >
              <Minus size={16} weight="bold" />
            </button>
            <div>
              <strong>{repetitions}</strong>
              <span>veces</span>
            </div>
            <button
              type="button"
              aria-label="Sumar una repetición"
              onClick={() => setRepetitions((value) => Math.min(6, value + 1))}
            >
              <Plus size={16} weight="bold" />
            </button>
          </div>
        </>
      ) : isConditional ? (
        <>
          <p className="game-prompt">Si el robot encuentra una pared, ¿qué bloque usa?</p>
          <div className="condition-options">
            {['Avanzar', 'Girar', 'Saltar'].map((item) => (
              <button
                type="button"
                className={choice === item ? 'configurator-option-chip selected' : 'configurator-option-chip'}
                key={item}
                onClick={() => setChoice(item)}
              >
                <span>{item}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      <button type="button" className="button-primary game-check-btn" onClick={check}>
        <Play size={15} weight="fill" />
        <span>Probar reto</span>
      </button>
      {message && (
        <p className={message.startsWith('¡Sí!') ? 'game-message success' : 'game-message'}>{message}</p>
      )}
    </div>
  );
}

const SAMPLE_STUDENTS = [
  { id: 1, name: 'Valeria', email: 'valeria@universidad.edu', group: '5° A', score: 82, weak: 'Bucles', avatar: 'dragon', points: 120, level: 2, completedCount: 3 },
  { id: 2, name: 'Mateo', email: 'mateo@universidad.edu', group: '5° A', score: 68, weak: 'Descomposición', avatar: 'cat', points: 85, level: 1, completedCount: 2 },
  { id: 3, name: 'Lucía', email: 'lucia@universidad.edu', group: '5° A', score: 91, weak: 'Condicionales', avatar: 'robot', points: 210, level: 3, completedCount: 6 },
  { id: 101, name: 'Samuel', email: 'samuel@universidad.edu', group: '6° B', score: 74, weak: 'Secuencias', avatar: 'fox', points: 110, level: 2, completedCount: 2 },
  { id: 102, name: 'Mariana', email: 'mariana@universidad.edu', group: '6° B', score: 64, weak: 'Bucles', avatar: 'unicorn', points: 95, level: 1, completedCount: 2 },
];

const TEACHER_ACTIVITY_SKILLS = [
  ...BLOCKLY_SKILLS,
  'Python',
  'HTML5',
  'JavaScript',
];

function stripMarkdownFormatting(md = '') {
  return String(md)
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
}

function buildTeacherActivitiesCatalog(remoteExpansion = null) {
  const blocklyItems = BLOCKLY_CHALLENGES.map((item) => ({
    ...item,
    category: challengeCategory(item),
    isNewExpansion: false,
  }));

  const pythonBaseItems = [
    {
      id: 'python-sequence',
      templateId: 'python-code',
      skill: 'Python',
      category: 'Python',
      level: 'Inicio',
      name: 'Python Etapa 1: Primer comando',
      exerciseTitle: 'Laboratorio Python: Guiar al robot con avanzar() y girar_derecha()',
      description: 'Sintaxis escrita básica y llamadas a funciones en Python.',
      instructions:
        'Escribe los comandos avanzar() y girar_derecha() paso a paso en el editor para llevar al robot hasta la estrella.',
      isNewExpansion: false,
    },
    {
      id: 'python-loop',
      templateId: 'python-code',
      skill: 'Python',
      category: 'Python',
      level: 'En camino',
      name: 'Python Etapa 2: Bucle for',
      exerciseTitle: 'Laboratorio Python: Cruzar el pasillo con for paso in range()',
      description: 'Ciclos for e indentación de 4 espacios en Python.',
      instructions:
        'Utiliza un bucle for paso in range(): con sangría de 4 espacios para avanzar hasta la meta sin repetir líneas.',
      isNewExpansion: false,
    },
    {
      id: 'python-condition',
      templateId: 'python-code',
      skill: 'Python',
      category: 'Python',
      level: 'Explorador',
      name: 'Python Etapa 3: Sensor if',
      exerciseTitle: 'Laboratorio Python: Esquivar obstáculo con if hay_pared():',
      description: 'Condicionales if integrados dentro de un recorrido en Python.',
      instructions:
        'Combina for e if hay_pared(): para detectar el muro, girar a tiempo y alcanzar la estrella.',
      isNewExpansion: false,
    },
  ];

  const sourceExpansion =
    remoteExpansion?.misiones?.length > 0 ? remoteExpansion.misiones : EXPANSION_MISSIONS;

  const expansionItems = sourceExpansion.map((m) => {
    const isPy = m.mundo_slug === 'laboratorio-python' || String(m.slug).startsWith('py-');
    const isHtml = m.mundo_slug === 'ciudadela-html' || String(m.slug).startsWith('html-');
    const category = isPy ? 'Python' : isHtml ? 'HTML5' : 'JavaScript';
    const templateId = isPy ? 'python-code' : isHtml ? 'html-markup' : 'javascript-script';
    const levelLabel = m.orden === 1 ? 'Inicio' : m.orden === 2 ? 'En camino' : 'Explorador';

    return {
      id: m.slug,
      templateId,
      skill: category,
      category,
      level: levelLabel,
      name: `⚡ ${m.titulo}`,
      exerciseTitle: m.titulo,
      description: m.contexto_narrativo || `Misión interactiva de ${category} (+${m.xp_recompensa} XP)`,
      instructions: stripMarkdownFormatting(m.instrucciones_md) || m.contexto_narrativo,
      xpReward: m.xp_recompensa,
      coinReward: m.monedas_recompensa,
      isNewExpansion: true,
    };
  });

  return [...blocklyItems, ...pythonBaseItems, ...expansionItems];
}

function CreateAssignmentPanel({
  group,
  courses = [],
  onCreate,
  draftExercise,
  remoteExpansion = null,
}) {
  const allActivities = buildTeacherActivitiesCatalog(remoteExpansion);
  const [skill, setSkill] = useState(TEACHER_ACTIVITY_SKILLS[0]);
  const [challengeId, setChallengeId] = useState(allActivities[0].id);
  const challenge = allActivities.find((item) => item.id === challengeId) || allActivities[0];
  const [title, setTitle] = useState(challenge.exerciseTitle);
  const [instructions, setInstructions] = useState(challenge.instructions);
  const [targetScope, setTargetScope] = useState('current');
  const [publishedMsg, setPublishedMsg] = useState('');

  useEffect(() => {
    if (!draftExercise) return;
    const matchedChallenge =
      allActivities.find((item) => item.id === draftExercise.missionId) ||
      allActivities.find((item) => item.category === draftExercise.skill || item.skill === draftExercise.skill) ||
      allActivities[0];
    setSkill(matchedChallenge.category);
    setChallengeId(matchedChallenge.id);
    setTitle(draftExercise.title || matchedChallenge.exerciseTitle);
    setInstructions(draftExercise.instructions || matchedChallenge.instructions);
    setPublishedMsg('');
  }, [draftExercise]);

  const selectSkill = (nextSkill) => {
    const firstChallenge =
      allActivities.find((item) => item.category === nextSkill) || allActivities[0];
    setSkill(nextSkill);
    setChallengeId(firstChallenge.id);
    setTitle(firstChallenge.exerciseTitle);
    setInstructions(firstChallenge.instructions);
    setPublishedMsg('');
  };

  const selectChallenge = (item) => {
    setChallengeId(item.id);
    setTitle(item.exerciseTitle);
    setInstructions(item.instructions);
    setPublishedMsg('');
  };

  return (
    <form
      className="store-utility-card create-assignment-card"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim() || !instructions.trim()) return;
        const targetGroups =
          targetScope === 'all' && courses.length > 0
            ? courses.map((c) => c.codigoGrupo)
            : [group];

        targetGroups.forEach((gCode) => {
          onCreate({
            title: title.trim(),
            instructions: instructions.trim(),
            skill: challenge.skill,
            templateId: challenge.templateId,
            missionId: challenge.id,
            group: gCode,
          });
        });

        setPublishedMsg(
          targetGroups.length > 1
            ? `«${title.trim()}» fue asignada a todos los cursos (${targetGroups.join(', ')}).`
            : `«${title.trim()}» ya está publicada para el curso ${group}.`,
        );
      }}
    >
      <div className="card-header-row">
        <div>
          <h3>Asignar actividad (Blockly, Python, HTML5 o JS)</h3>
          <p>
            Elige una misión clásica o una de las <b>nuevas actividades multilenguaje</b> para {group}.
          </p>
        </div>
        <NotePencil size={22} weight="regular" />
      </div>

      <div className="challenge-skill-tabs" role="group" aria-label="Filtrar actividades por lenguaje o habilidad">
        {TEACHER_ACTIVITY_SKILLS.map((item) => {
          const isNewTech = ['Python', 'HTML5', 'JavaScript'].includes(item);
          return (
            <button
              type="button"
              key={item}
              aria-pressed={skill === item}
              className={skill === item ? 'configurator-option-chip selected' : 'configurator-option-chip'}
              onClick={() => selectSkill(item)}
            >
              <SkillGlyph skill={item} size={15} />
              <span>{item}</span>
              {isNewTech && <small className="new-tech-dot">NUEVO</small>}
            </button>
          );
        })}
      </div>

      <div className="challenge-picker" aria-label={`Misiones de ${skill}`}>
        {allActivities
          .filter((item) => item.category === skill)
          .map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={item.id === challenge.id}
              className={item.id === challenge.id ? 'challenge-option selected' : 'challenge-option'}
              onClick={() => selectChallenge(item)}
            >
              <span className="challenge-option-copy">
                <b>
                  {item.name}{' '}
                  {item.isNewExpansion && <span className="expansion-pill-inline">Expansión</span>}
                </b>
                <small>
                  {item.level} | {item.description}
                </small>
              </span>
              <ArrowRight size={15} weight="regular" />
            </button>
          ))}
      </div>

      <div className="form-field-block">
        <label className="field-label" htmlFor="exercise-target-scope">
          Curso destinatario
        </label>
        <div className="target-scope-row" id="exercise-target-scope" role="group" aria-label="Elegir curso destino">
          <button
            type="button"
            className={targetScope === 'current' ? 'configurator-option-chip selected' : 'configurator-option-chip'}
            onClick={() => setTargetScope('current')}
          >
            <span>Solo curso actual ({group})</span>
          </button>
          {courses.length > 1 && (
            <button
              type="button"
              className={targetScope === 'all' ? 'configurator-option-chip selected' : 'configurator-option-chip'}
              onClick={() => setTargetScope('all')}
            >
              <span>Todos los cursos ({courses.map((c) => c.codigoGrupo).join(', ')})</span>
            </button>
          )}
        </div>
      </div>

      <div className="form-field-block">
        <label className="field-label" htmlFor="exercise-title">
          Nombre de la actividad para los estudiantes
        </label>
        <input
          id="exercise-title"
          className="search-input"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setPublishedMsg('');
          }}
          required
        />
      </div>

      <div className="form-field-block">
        <label className="field-label" htmlFor="exercise-instructions">
          ¿Qué debe lograr el estudiante?
        </label>
        <textarea
          id="exercise-instructions"
          className="apple-textarea"
          value={instructions}
          onChange={(event) => {
            setInstructions(event.target.value);
            setPublishedMsg('');
          }}
          required
        />
      </div>

      <button className="button-primary full-width-btn" type="submit">
        <span>
          {targetScope === 'all'
            ? 'Publicar actividad en todos los cursos'
            : `Publicar actividad en ${group}`}
        </span>
        <ArrowRight size={15} weight="regular" />
      </button>

      {publishedMsg && (
        <p className="publish-success" role="status">
          <CheckCircle size={16} weight="fill" />
          <span>{publishedMsg}</span>
        </p>
      )}
    </form>
  );
}

function StudentAssignmentModal({
  assignment,
  previousSubmission,
  onSubmit,
  onClose,
  soundEnabled,
  remoteExpansion = null,
}) {
  const [gameOutcome, setGameOutcome] = useState(previousSubmission?.gameOutcome || null);
  const [result, setResult] = useState(previousSubmission || null);
  const [submitting, setSubmitting] = useState(false);

  const missionIdStr = String(assignment.missionId || '');
  const isPythonAssignment =
    assignment.templateId === 'python-code' ||
    assignment.skill === 'Python' ||
    missionIdStr.startsWith('python-') ||
    missionIdStr.startsWith('py-');
  const isHtmlAssignment =
    assignment.templateId === 'html-markup' ||
    assignment.skill === 'HTML5' ||
    missionIdStr.startsWith('html-');
  const isJsAssignment =
    assignment.templateId === 'javascript-script' ||
    assignment.skill === 'JavaScript' ||
    missionIdStr.startsWith('js-');
  const usesBlockly = ['sequence-order', 'loop-count', 'if-choice'].includes(assignment.templateId);

  const submit = async (overrideOutcome = null) => {
    const activeOutcome = overrideOutcome || gameOutcome;
    if (!activeOutcome || submitting) return;
    setSubmitting(true);
    try {
      setResult(await onSubmit(assignment, activeOutcome.evidence, activeOutcome));
    } finally {
      setSubmitting(false);
    }
  };

  if (!result && (isPythonAssignment || isHtmlAssignment || isJsAssignment)) {
    return (
      <div className="code-assignment-wrapper">
        <div className="code-assignment-banner">
          <div className="code-assignment-banner-info">
            <span className="modal-meta-label">
              Reto del Curso {assignment.group} · {assignment.skill}
            </span>
            <strong>{assignment.title}</strong>
          </div>
          <div className="code-assignment-banner-actions">
            {gameOutcome?.success ? (
              <button
                type="button"
                className="button-primary cta-3d-lime"
                onClick={() => submit(gameOutcome)}
                disabled={submitting}
              >
                <CheckCircle size={16} weight="fill" />
                <span>{submitting ? 'Enviando entrega...' : '¡Reto superado! Enviar al docente'}</span>
              </button>
            ) : (
              <span className="code-assignment-pending-hint">
                Resuelve y valida el código abajo para habilitar el envío al docente
              </span>
            )}
            <button type="button" className="button-secondary-pill" onClick={onClose}>
              <ArrowLeft size={14} weight="bold" />
              <span>Volver a mis retos</span>
            </button>
          </div>
        </div>

        {isPythonAssignment ? (
          <PythonMission
            key={assignment.id}
            completed={gameOutcome?.success ? [assignment.missionId] : []}
            initialMissionId={assignment.missionId}
            customMissions={remoteExpansion?.misiones || null}
            onComplete={(completedId, _xp, _coins, studentCode, attemptsCount) => {
              const outcome = {
                success: true,
                attempts: attemptsCount || 1,
                evidence: studentCode
                  ? `Código Python (${completedId}):\n${studentCode}`
                  : `Misión Python ${completedId} completada`,
              };
              setGameOutcome(outcome);
              if (soundEnabled) playSfx('win');
            }}
            onClose={onClose}
          />
        ) : (
          <CodeWorldLab
            key={assignment.id}
            worldSlug={isHtmlAssignment ? 'ciudadela-html' : 'neo-tokio-javascript'}
            initialMissionSlug={assignment.missionId}
            customWorlds={remoteExpansion?.mundos || null}
            customMissions={remoteExpansion?.misiones || null}
            completed={gameOutcome?.success ? [assignment.missionId] : []}
            onComplete={(completedSlug, _xp, _coins, studentCode, attemptsCount) => {
              const outcome = {
                success: true,
                attempts: attemptsCount || 1,
                evidence: studentCode
                  ? `Código ${assignment.skill} (${completedSlug}):\n${studentCode}`
                  : `Misión ${completedSlug} completada`,
              };
              setGameOutcome(outcome);
              if (soundEnabled) playSfx('win');
            }}
            onClose={onClose}
          />
        )}
      </div>
    );
  }

  return (
    <main id="top" className="apple-page fullscreen-exercise-page">
      <div className="fullscreen-exercise-container">
        <header className="workspace-topbar">
          <div className="workspace-topbar-left">
            <button type="button" className="workspace-back-btn" onClick={onClose}>
              <ArrowLeft size={16} weight="bold" />
              <span>Volver a mis retos</span>
            </button>
            <div className="workspace-title-group">
              <span className="modal-meta-label">
                Curso {assignment.group} | {assignment.skill}
              </span>
              <h1 id="assignment-title">{assignment.title}</h1>
              <p>{assignment.instructions}</p>
            </div>
          </div>

          {gameOutcome && !result && (
            <div className="workspace-topbar-actions">
              <button type="button" className="button-primary" onClick={() => submit()} disabled={submitting}>
                <span>{submitting ? 'Evaluando con Ollama...' : 'Enviar al docente'}</span>
                <ArrowRight size={15} weight="regular" />
              </button>
            </div>
          )}
        </header>

        {result ? (
          <div className="store-utility-card submission-result">
            <strong>{result.score}%</strong>
            <span>
              Evaluación orientativa ({result.source === 'ollama' ? `Ollama ${result.model}` : 'modo local'})
            </span>
            <p>{result.feedback}</p>
            <small>Tu docente revisa el resultado y conserva el criterio pedagógico.</small>
            <div className="assignment-submit-bar">
              <button type="button" className="button-primary" onClick={onClose}>
                <span>Volver a mi espacio</span>
                <ArrowRight size={15} weight="regular" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {usesBlockly ? (
              <BlocklyMission
                key={assignment.id}
                templateId={assignment.templateId}
                missionId={assignment.missionId}
                onComplete={(outcome) => {
                  setGameOutcome(outcome);
                  if (outcome.success && soundEnabled) playSfx('win');
                  else if (!outcome.success && soundEnabled) playSfx('try');
                }}
              />
            ) : (
              <InteractiveExercise
                key={assignment.id}
                skill={assignment.skill}
                templateId={assignment.templateId}
                onComplete={(outcome) => {
                  setGameOutcome(outcome);
                  if (soundEnabled) playSfx(outcome.success ? 'win' : 'try');
                }}
              />
            )}
            {gameOutcome && (
              <div className="assignment-submit-bar">
                <button type="button" className="button-primary" onClick={() => submit()} disabled={submitting}>
                  <span>{submitting ? 'Evaluando con Ollama...' : 'Enviar al docente'}</span>
                  <ArrowRight size={15} weight="regular" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function AssignmentResults({ submissions }) {
  return (
    <section className="store-utility-card assignment-results-card">
      <div className="card-header-row">
        <div>
          <h3>Respuestas del grupo ({submissions.length})</h3>
          <p>Evaluación asistida y sugerencias pedagógicas por entrega.</p>
        </div>
        <ClipboardText size={22} weight="regular" />
      </div>

      {submissions.length ? (
        <div className="result-list">
          {submissions.map((submission) => (
            <article className="submission-item-card" key={submission.id}>
              <div className="submission-item-top">
                <span className="student-initial-badge">{submission.studentName.charAt(0)}</span>
                <div className="submission-item-meta">
                  <strong>{submission.studentName}</strong>
                  <small>
                    {submission.assignmentTitle} | {submission.skill}
                  </small>
                </div>
                <b className={submission.score >= 80 ? 'score-pill high' : 'score-pill'}>{submission.score}%</b>
              </div>
              <p className="submission-evidence">{submission.response}</p>
              <p className="submission-feedback">{submission.feedback}</p>
              <div className="teacher-recommendation-box">
                <b>Sugerencia:</b>
                <span>{submission.recommendation}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state-card">
          <BookOpen size={28} weight="regular" />
          <h3>Sin entregas todavía</h3>
          <p>Cuando respondan tus ejercicios, aquí verás su evaluación y sugerencias.</p>
        </div>
      )}
    </section>
  );
}

function TeacherDashboard({
  state,
  courses = [],
  dbStudents = [],
  enrollmentsByGroup = {},
  onCreateCourse,
  onToggleEnrollment,
  onBulkEnrollAll,
  onCreate,
  remoteExpansion = null,
}) {
  const courseList =
    courses.length > 0
      ? courses
      : [
          { id: 1, codigoGrupo: '5° A', nombre: 'Grado 5° A - Pensamiento Computacional' },
          { id: 2, codigoGrupo: '6° B', nombre: 'Grado 6° B - Lógica e Algoritmia' },
        ];

  const [group, setGroup] = useState(courseList[0]?.codigoGrupo || '5° A');
  const [draftExercise, setDraftExercise] = useState(null);
  const [assignedProposalIds, setAssignedProposalIds] = useState([]);

  // Estado para crear un nuevo curso con estudiantes de la BD
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [selectedStudentIdsForNewCourse, setSelectedStudentIdsForNewCourse] = useState([]);
  const [courseFeedback, setCourseFeedback] = useState('');
  const [creatingCourse, setCreatingCourse] = useState(false);

  // Estado para filtrar e inscribir estudiantes de la BD en el curso activo
  const [studentSearch, setStudentSearch] = useState('');
  const [enrollmentFilter, setEnrollmentFilter] = useState('all');

  const allStudents = dbStudents.length > 0 ? dbStudents : SAMPLE_STUDENTS;
  const enrolledIdsInCurrentGroup = enrollmentsByGroup[group] || [];

  const enrolledDbStudents = allStudents.filter((student) =>
    enrolledIdsInCurrentGroup.some((id) => String(id) === String(student.id)),
  );

  const groupAssignments = (state.assignments || []).filter((assignment) => assignment.group === group);
  const groupSubmissions = (state.submissions || [])
    .filter((submission) => submission.group === group)
    .sort((a, b) => b.createdAt - a.createdAt);

  const submissionStudents = [...new Set(groupSubmissions.map((submission) => submission.studentName))].map((name) => {
    const rows = groupSubmissions.filter((submission) => submission.studentName === name);
    const skillScores = Object.entries(
      rows.reduce((scores, row) => ({ ...scores, [row.skill]: [...(scores[row.skill] || []), row.score] }), {}),
    )
      .map(([skill, values]) => [skill, Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)])
      .sort((a, b) => a[1] - b[1]);
    return {
      name,
      group,
      score: Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length),
      weak: skillScores[0]?.[0] || 'Bucles',
    };
  });

  const visibleStudents = [
    ...enrolledDbStudents.map((base) => {
      const sub = submissionStudents.find((s) => s.name === base.name);
      return sub ? { ...base, score: sub.score, weak: sub.weak, group } : { ...base, group };
    }),
    ...submissionStudents.filter((sub) => !enrolledDbStudents.some((base) => base.name === sub.name)),
  ];

  const filteredDirectoryStudents = allStudents.filter((student) => {
    const isEnrolledHere = enrolledIdsInCurrentGroup.some((id) => String(id) === String(student.id));
    if (enrollmentFilter === 'enrolled' && !isEnrolledHere) return false;
    if (enrollmentFilter === 'unenrolled' && isEnrolledHere) return false;
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      String(student.name || '').toLowerCase().includes(q) ||
      String(student.email || '').toLowerCase().includes(q)
    );
  });

  const togglePreselectStudent = (studentId) => {
    setSelectedStudentIdsForNewCourse((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  };

  const handleCreateCourseSubmit = async (event) => {
    event.preventDefault();
    const cleanCode = newCourseCode.trim();
    if (!cleanCode || creatingCourse) return;
    setCreatingCourse(true);
    setCourseFeedback('');
    try {
      await onCreateCourse({
        codigoGrupo: cleanCode,
        nombre: newCourseName.trim() || `Curso ${cleanCode}`,
        studentIds: selectedStudentIdsForNewCourse,
      });
      setGroup(cleanCode);
      setCourseFeedback(
        `Curso «${cleanCode}» creado con ${selectedStudentIdsForNewCourse.length} estudiante(s) inscrito(s).`,
      );
      setNewCourseCode('');
      setNewCourseName('');
      setSelectedStudentIdsForNewCourse([]);
    } catch (err) {
      setCourseFeedback(err.message || 'No se pudo crear el curso.');
    } finally {
      setCreatingCourse(false);
    }
  };

  const [aiInsights, setAiInsights] = useState(null);
  const [aiStatus, setAiStatus] = useState('idle');

  const loadInsights = async (targetGroup = group, roster = visibleStudents, submissionsList = groupSubmissions, assignmentsList = groupAssignments) => {
    setAiStatus('loading');
    try {
      const response = await fetch('/api/ai/teacher-insights', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          group: targetGroup,
          studentRoster: roster.map((student) => ({
            score: student.score,
            weak: student.weak,
          })),
          submissions: submissionsList.map((row) => ({
            skill: row.skill,
            score: row.score,
            attempts: row.gameOutcome?.attempts || 1,
            success: Boolean(row.gameOutcome?.success),
          })),
          assignmentSkills: assignmentsList.map((item) => item.skill),
          missionCatalog: buildTeacherActivitiesCatalog(remoteExpansion).map((item) => ({
            id: item.id,
            templateId: item.templateId,
            skill: item.skill,
            category: item.category,
            level: item.level,
            name: item.name,
            exerciseTitle: item.exerciseTitle,
            instructions: item.instructions,
          })),
        }),
      });
      if (!response.ok) throw new Error('Ollama no disponible');
      setAiInsights(await response.json());
      setAiStatus('ready');
    } catch {
      const avgScore = roster.length
        ? Math.round(roster.reduce((acc, s) => acc + (s.score || 75), 0) / roster.length)
        : 78;
      setAiInsights({
        overview: `Informe pedagógico para ${targetGroup}: Promedio general de ${avgScore}% con ${roster.length} estudiante(s) activo(s). El curso está listo para combinar lógica de bloques con las nuevas misiones de Python, Ciudadela HTML y Neo-Tokio JavaScript.`,
        model: 'CodeKids Pedagogic AI Engine',
        focusSkills: [
          {
            skill: 'Bucles y Python',
            evidence: 'Oportunidad para transferir el bloque «repetir» hacia ciclos for e indentación real en Python.',
            activity: 'Asignar «Protocolo Escudo Cuántico» o «Python Etapa 2: Bucle for» al curso.',
          },
          {
            skill: 'Desarrollo Web (HTML5 / JS)',
            evidence: 'Los estudiantes con buen dominio condicional pueden avanzar a estructurar DOM y lógica reactiva.',
            activity: 'Asignar «El Faro Holográfico (HTML5)» y «Neones de Shibuya (JavaScript)».',
          },
        ],
        nextSteps: [
          'Inscribir a los estudiantes de la base de datos en su respectivo curso desde el panel de gestión.',
          'Asignar una misión de transición en Python o Ciudadela HTML para evaluar sintaxis escrita.',
          'Revisar el código enviado por cada estudiante en la columna de respuestas del grupo.',
        ],
        proposedExercises: [
          {
            missionId: 'py-protocolo-escudo-cuantico',
            templateId: 'python-code',
            skill: 'Python',
            targetSkill: 'Python Avanzado',
            level: 'Inicio',
            title: 'Laboratorio Python: Protocolo Escudo Cuántico',
            instructions:
              'Completa la función calcular_energia_escudo(baterias, factor) retornando el producto solo si supera o iguala 100.',
            reason: 'Nueva actividad de expansión para introducir funciones y condicionales en Python.',
          },
          {
            missionId: 'html-faro-holografico',
            templateId: 'html-markup',
            skill: 'HTML5',
            targetSkill: 'Estructura Web HTML5',
            level: 'Inicio',
            title: 'Ciudadela HTML: El Faro Holográfico',
            instructions:
              'Construye dentro de <header> un encabezado <h1>Ciudadela HTML</h1> y el párrafo de estado Activo.',
            reason: 'Permite que el curso practique etiquetas semánticas HTML5 con vista previa holográfica en vivo.',
          },
          {
            missionId: 'js-neones-shibuya',
            templateId: 'javascript-script',
            skill: 'JavaScript',
            targetSkill: 'Variables y Eventos JS',
            level: 'Inicio',
            title: 'Neo-Tokio JS: Neones de Shibuya',
            instructions:
              'Calcula energiaTotal multiplicando bateriasActivas * 25 y devuelve el mensaje con template literals.',
            reason: 'Refuerza variables constantes, operadores aritméticos y plantillas de texto en JavaScript.',
          },
        ],
      });
      setAiStatus('ready');
    }
  };

  useEffect(() => {
    loadInsights(group, visibleStudents, groupSubmissions, groupAssignments);
  }, [group, groupSubmissions.length, enrolledIdsInCurrentGroup.length]);

  const handleAssignProposal = (proposal) => {
    onCreate({
      title: proposal.title,
      instructions: proposal.instructions,
      skill: proposal.skill,
      templateId: proposal.templateId,
      missionId: proposal.missionId,
      group,
    });
    setAssignedProposalIds((current) => [...new Set([...current, `${group}-${proposal.missionId}-${proposal.title}`])]);
  };

  const handleCustomizeProposal = (proposal) => {
    setDraftExercise({
      missionId: proposal.missionId,
      skill: proposal.skill,
      title: proposal.title,
      instructions: proposal.instructions,
      updatedAt: Date.now(),
    });
    document.getElementById('create-exercise')?.scrollIntoView({ behavior: 'smooth' });
  };

  const currentCourseMeta = courseList.find((c) => c.codigoGrupo === group);

  return (
    <main id="top" className="apple-page">
      {/* Tile 1: Teacher Hero */}
      <section className="product-tile-light teacher-hero-tile">
        <div className="tile-container split-hero-grid">
          <div className="split-hero-copy">
            <span className="hero-eyebrow">PANEL DOCENTE | {state.user.name.toUpperCase()}</span>
            <h1 className="hero-display">Gestiona tus cursos y actividades.</h1>
            <p className="hero-lead">
              Crea cursos, inscribe a los estudiantes registrados en la base de datos de Supabase y asígnales retos de Blockly, Python, HTML5 y JavaScript.
            </p>
            <div className="teacher-course-bar">
              <div className="course-selector-group" role="group" aria-label="Seleccionar curso">
                {courseList.map((courseItem) => {
                  const cCode = courseItem.codigoGrupo;
                  const count = (enrollmentsByGroup[cCode] || []).length;
                  return (
                    <button
                      type="button"
                      key={cCode}
                      className={group === cCode ? 'configurator-option-chip selected' : 'configurator-option-chip'}
                      onClick={() => setGroup(cCode)}
                    >
                      <span>
                        Curso {cCode} ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="teacher-hero-actions">
                <button
                  type="button"
                  className="button-secondary-pill"
                  onClick={() => document.getElementById('courses-manager')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Plus size={15} weight="bold" />
                  <span>Crear curso / Inscribir</span>
                </button>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => document.getElementById('create-exercise')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <NotePencil size={15} weight="bold" />
                  <span>Asignar actividad</span>
                </button>
              </div>
            </div>
          </div>
          <div className="split-hero-visual">
            <img
              className="product-render-shadow hero-product-image"
              src="/images/teacher-studio.png"
              alt="Aula interactiva CodeKids con bloques de programación y robot Pipo"
              width="960"
              height="720"
            />
          </div>
        </div>
      </section>

      {/* Tile 2: Gestión de Cursos e Inscripción de Estudiantes de la Base de Datos */}
      <section id="courses-manager" className="product-tile-parchment teacher-courses-section">
        <div className="tile-container">
          <div className="metrics-bento-grid">
            <StatCard
              icon={<GraduationCap size={22} weight="regular" />}
              label="Cursos activos"
              value={courseList.length}
              note={currentCourseMeta?.nombre || `Curso ${group}`}
              tone="lav"
            />
            <StatCard
              icon={<UsersThree size={22} weight="regular" />}
              label={`Inscritos en ${group}`}
              value={enrolledDbStudents.length}
              note={`De ${allStudents.length} estudiantes en BD`}
              tone="blue"
            />
            <StatCard
              icon={<NotePencil size={22} weight="regular" />}
              label="Actividades"
              value={groupAssignments.length}
              note={`Asignadas a ${group}`}
              tone="mint"
            />
          </div>

          <div className="teacher-courses-management-grid">
            {/* Tarjeta 1: Crear nuevo curso e inscribir estudiantes inicialmente */}
            <form
              className="store-utility-card create-course-card"
              onSubmit={handleCreateCourseSubmit}
            >
              <div className="card-header-row">
                <div>
                  <h3>Crear nuevo curso</h3>
                  <p>
                    Crea un aula en la base de datos y selecciona qué estudiantes deseas inscribir de inmediato.
                  </p>
                </div>
                <GraduationCap size={24} weight="duotone" />
              </div>

              <div className="course-form-row">
                <div className="form-field-block">
                  <label className="field-label" htmlFor="new-course-code">
                    Código del curso (ej. 7° A, 8° B, Robótica)
                  </label>
                  <input
                    id="new-course-code"
                    className="search-input"
                    placeholder="Ej. 7° A"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field-block">
                  <label className="field-label" htmlFor="new-course-name">
                    Nombre descriptivo del curso
                  </label>
                  <input
                    id="new-course-name"
                    className="search-input"
                    placeholder="Ej. Grado 7° A - Código Python, HTML y JS"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field-block">
                <div className="field-label-row">
                  <label className="field-label">
                    Inscribir estudiantes de la base de datos ({selectedStudentIdsForNewCourse.length} seleccionados)
                  </label>
                  <div className="inline-mini-actions">
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => setSelectedStudentIdsForNewCourse(allStudents.map((s) => s.id))}
                    >
                      Seleccionar todos
                    </button>
                    {selectedStudentIdsForNewCourse.length > 0 && (
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => setSelectedStudentIdsForNewCourse([])}
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>

                <div className="student-preselect-chips" role="group" aria-label="Estudiantes disponibles en base de datos">
                  {allStudents.map((student) => {
                    const isChecked = selectedStudentIdsForNewCourse.includes(student.id);
                    return (
                      <button
                        type="button"
                        key={student.id}
                        aria-pressed={isChecked}
                        className={isChecked ? 'student-select-pill selected' : 'student-select-pill'}
                        onClick={() => togglePreselectStudent(student.id)}
                      >
                        <AvatarGlyph avatar={student.avatar} size={15} />
                        <span>{student.name}</span>
                        <small>{isChecked ? '✓ Incluir' : '+'}</small>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button type="submit" className="button-primary full-width-btn" disabled={creatingCourse}>
                <Plus size={16} weight="bold" />
                <span>
                  {creatingCourse
                    ? 'Guardando curso en Supabase...'
                    : 'Crear curso e inscribir seleccionados'}
                </span>
              </button>

              {courseFeedback && (
                <p className="publish-success" role="status">
                  <CheckCircle size={16} weight="fill" />
                  <span>{courseFeedback}</span>
                </p>
              )}
            </form>

            {/* Tarjeta 2: Directorio de estudiantes de la Base de Datos e inscripción en el curso activo */}
            <section className="store-utility-card db-students-enrollment-card">
              <div className="card-header-row">
                <div>
                  <h3>Estudiantes en Base de Datos → Curso {group}</h3>
                  <p>
                    Inscribe o retira estudiantes registrados en Supabase dentro del curso <b>{group}</b> y asígnales actividades.
                  </p>
                </div>
                <UsersThree size={24} weight="duotone" />
              </div>

              <div className="db-students-toolbar">
                <input
                  type="search"
                  className="search-input"
                  placeholder="Buscar estudiante por nombre o correo..."
                  aria-label="Buscar estudiante por nombre o correo"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
                <div className="db-students-filter-row">
                  <div className="filter-pill-group" role="group" aria-label="Filtrar por estado de inscripción">
                    {[
                      { id: 'all', label: `Todos (${allStudents.length})` },
                      { id: 'enrolled', label: `Inscritos en ${group} (${enrolledDbStudents.length})` },
                      {
                        id: 'unenrolled',
                        label: `Sin inscribir (${Math.max(0, allStudents.length - enrolledDbStudents.length)})`,
                      },
                    ].map((tab) => (
                      <button
                        type="button"
                        key={tab.id}
                        className={
                          enrollmentFilter === tab.id
                            ? 'configurator-option-chip selected'
                            : 'configurator-option-chip'
                        }
                        onClick={() => setEnrollmentFilter(tab.id)}
                      >
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  {enrolledDbStudents.length < allStudents.length && (
                    <button
                      type="button"
                      className="button-secondary-pill"
                      onClick={() => onBulkEnrollAll(group, allStudents.map((s) => s.id))}
                    >
                      <Plus size={14} weight="bold" />
                      <span>Inscribir a todos en {group}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="db-student-list" role="list">
                {filteredDirectoryStudents.map((student) => {
                  const isEnrolled = enrolledIdsInCurrentGroup.some(
                    (id) => String(id) === String(student.id),
                  );
                  const studentCourses = Object.entries(enrollmentsByGroup)
                    .filter(([, ids]) =>
                      Array.isArray(ids) && ids.some((id) => String(id) === String(student.id)),
                    )
                    .map(([cCode]) => cCode);

                  return (
                    <article className="db-student-row" key={student.id} role="listitem">
                      <div className="db-student-identity">
                        <span className="db-student-avatar">
                          <AvatarGlyph avatar={student.avatar} size={22} />
                        </span>
                        <div className="db-student-copy">
                          <div className="db-student-name-line">
                            <strong>{student.name}</strong>
                            <span className="db-student-xp-badge">
                              Nv. {student.level || 1} · {student.points || 0} XP
                            </span>
                          </div>
                          <small className="db-student-email">
                            {student.email || 'Estudiante registrado'} · {student.completedCount || 0} misiones superadas
                          </small>
                          <div className="db-student-course-tags">
                            {studentCourses.length > 0 ? (
                              studentCourses.map((cCode) => (
                                <span
                                  key={cCode}
                                  className={
                                    cCode === group ? 'student-course-tag active' : 'student-course-tag'
                                  }
                                >
                                  Curso {cCode}
                                </span>
                              ))
                            ) : (
                              <span className="student-course-tag empty">Sin curso asignado</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="db-student-actions">
                        <button
                          type="button"
                          className={isEnrolled ? 'button-secondary-pill enrolled-pill' : 'button-primary'}
                          onClick={() =>
                            onToggleEnrollment({
                              codigoGrupo: group,
                              studentId: student.id,
                              enroll: !isEnrolled,
                            })
                          }
                        >
                          {isEnrolled ? (
                            <>
                              <Check size={14} weight="bold" />
                              <span>Inscrito en {group} (Retirar)</span>
                            </>
                          ) : (
                            <>
                              <Plus size={14} weight="bold" />
                              <span>Inscribir en {group}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="teacher-workflow-grid" id="create-exercise">
            <CreateAssignmentPanel
              group={group}
              courses={courseList}
              onCreate={onCreate}
              draftExercise={draftExercise}
              remoteExpansion={remoteExpansion}
            />
            <AssignmentResults submissions={groupSubmissions} />
          </div>
        </div>
      </section>

      {/* Tile 3: Dark Roster & Ollama Pedagogical Insights */}
      <section id="curriculum" className="product-tile-dark">
        <div className="tile-container">
          <div className="roster-header-bar">
            <div>
              <h2 className="display-lg">Avance del grupo {group}.</h2>
              <p className="lead-subcopy">
                Seguimiento de los estudiantes inscritos en {group}, informe pedagógico y propuestas de nuevas actividades.
              </p>
            </div>
            <button
              type="button"
              className="button-primary"
              onClick={() => loadInsights(group, visibleStudents, groupSubmissions, groupAssignments)}
              disabled={aiStatus === 'loading'}
            >
              <Sparkle size={16} weight="fill" />
              <span>{aiStatus === 'loading' ? 'Generando informe...' : 'Actualizar informe con Ollama'}</span>
            </button>
          </div>

          {visibleStudents.length ? (
            <div className="student-roster-cards">
              {visibleStudents.map((student) => (
                <article className="roster-student-card" key={student.id || student.name}>
                  <div className="roster-student-head">
                    <span className="student-initial-badge">{student.name.charAt(0)}</span>
                    <div>
                      <h3>{student.name}</h3>
                      <small>
                        Curso {group}
                        {student.email ? ` · ${student.email}` : ''}
                      </small>
                    </div>
                    <strong className="roster-score-number">{student.score || 78}%</strong>
                  </div>
                  <div className="roster-student-meta">
                    <span>Falencia a reforzar: {student.weak || 'Bucles'}</span>
                    <span>{(student.score || 78) > 80 ? 'En camino' : 'Requiere refuerzo'}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="dark-empty-card">
              <UsersThree size={28} weight="regular" />
              <p>
                Aún no hay estudiantes inscritos en {group}. Usa el panel superior «Estudiantes en Base de Datos» para inscribirlos con un clic.
              </p>
            </div>
          )}

          {aiStatus === 'loading' && !aiInsights && (
            <div className="teacher-ai-insights-dark">
              <div className="insights-dark-header">
                <Sparkle size={18} weight="fill" />
                <b>Ollama está analizando las falencias del curso {group}...</b>
              </div>
              <p>Generando diagnóstico pedagógico, plan de intervención y propuestas de ejercicios personalizados.</p>
            </div>
          )}

          {aiStatus === 'offline' && (
            <p className="offline-caption on-dark">
              No se pudo conectar con Ollama. Verifica que el servicio local esté activo en el puerto 11434 y vuelve a intentar.
            </p>
          )}

          {aiInsights && (
            <div className="teacher-ai-insights-dark">
              <div className="insights-dark-header">
                <Sparkle size={18} weight="fill" />
                <b>Informe pedagógico y guía docente ({aiInsights.model})</b>
              </div>
              <p>{aiInsights.overview}</p>

              {aiInsights.focusSkills?.length > 0 && (
                <div className="insights-focus-grid">
                  {aiInsights.focusSkills.map((item) => (
                    <article className="insights-focus-card" key={item.skill}>
                      <b>Enfoque: {item.skill}</b>
                      <p>{item.evidence}</p>
                      <small>Cómo proceder: {item.activity}</small>
                    </article>
                  ))}
                </div>
              )}

              {aiInsights.nextSteps?.length > 0 && (
                <div className="insights-steps-section">
                  <b className="insights-section-subtitle">Pasos recomendados para la clase</b>
                  <ul className="insights-steps-list">
                    {aiInsights.nextSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiInsights.proposedExercises?.length > 0 && (
                <div className="proposed-exercises-section">
                  <div className="proposed-exercises-header">
                    <div>
                      <b className="insights-section-subtitle">
                        Nuevas actividades recomendadas para el grupo ({group})
                      </b>
                      <p className="proposed-exercises-lead">
                        Asigna estas nuevas misiones de Python, Ciudadela HTML, Neo-Tokio JS o Blockly con un solo clic para los estudiantes inscritos en {group}.
                      </p>
                    </div>
                  </div>

                  <div className="proposed-exercises-grid">
                    {aiInsights.proposedExercises.map((proposal) => {
                      const proposalKey = `${group}-${proposal.missionId}-${proposal.title}`;
                      const alreadyAssigned =
                        assignedProposalIds.includes(proposalKey) ||
                        groupAssignments.some(
                          (item) => item.missionId === proposal.missionId && item.title === proposal.title,
                        );
                      return (
                        <article className="proposed-exercise-card" key={proposalKey}>
                          <div className="proposed-exercise-tags">
                            <span className="proposed-skill-badge">
                              <SkillGlyph skill={proposal.skill} size={14} />
                              <span>{proposal.targetSkill || proposal.skill}</span>
                            </span>
                            <span className="proposed-level-badge">{proposal.level}</span>
                          </div>
                          <h4>{proposal.title}</h4>
                          <p className="proposed-exercise-instructions">{proposal.instructions}</p>
                          <div className="proposed-exercise-reason">
                            <b>¿Por qué asignarlo?:</b>
                            <span>{proposal.reason}</span>
                          </div>
                          <div className="proposed-exercise-actions">
                            {alreadyAssigned ? (
                              <span className="proposal-assigned-pill" role="status">
                                <CheckCircle size={16} weight="fill" />
                                <span>Asignado a {group}</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="button-primary"
                                onClick={() => handleAssignProposal(proposal)}
                              >
                                <Plus size={15} weight="bold" />
                                <span>Asignar a {group}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="button-secondary-pill"
                              onClick={() => handleCustomizeProposal(proposal)}
                            >
                              <NotePencil size={15} weight="regular" />
                              <span>Personalizar</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function AiFeedback({ prompt, onClose }) {
  const isGroup = prompt.startsWith('Analiza el avance');
  const skill =
    ['Bucles', 'Secuencias', 'Condicionales', 'Descomposición'].find((item) =>
      prompt.toLowerCase().includes(item.toLowerCase()),
    ) || (/bucle|repetir/i.test(prompt) ? 'Bucles' : 'Descomposición');
  const activity =
    skill === 'Bucles'
      ? 'repetir una secuencia de pasos un número exacto de veces y compararla con el bloque repetir'
      : skill === 'Condicionales'
        ? 'representar una regla de decisión con el bloque condicional antes de avanzar'
        : skill === 'Secuencias'
          ? 'ordenar tarjetas con instrucciones y predecir el resultado paso a paso'
          : 'dividir un reto en tareas pequeñas y resolverlas en orden';
  const feedback = isGroup
    ? `En el grupo se observa una oportunidad para reforzar ${skill.toLowerCase()}. Propón una actividad breve: ${activity}.`
    : `La solución muestra progreso en ${skill.toLowerCase()}. Conviene anticipar el recorrido paso a paso antes de ejecutar.`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="feedback-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} weight="regular" />
        </button>
        <h2 id="feedback-title">Ideas para acompañar el aprendizaje</h2>
        <p>{feedback}</p>
        <div className="feedback-footnote">La sugerencia es orientativa. El docente conserva el criterio pedagógico.</div>
        <button type="button" className="button-primary" onClick={onClose}>
          Entendido
        </button>
      </section>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState(readState);
  const [a11y, setA11y] = useState(readA11y);
  const [view, setView] = useState('home');
  const [feedbackPrompt, setFeedbackPrompt] = useState('');
  const [activeSkill, setActiveSkill] = useState('');
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [activePython, setActivePython] = useState(false);
  const [activePythonMissionId, setActivePythonMissionId] = useState('');
  const [activeCodeWorld, setActiveCodeWorld] = useState(null);
  const [remoteExpansion, setRemoteExpansion] = useState(null);
  const [classroomData, setClassroomData] = useState({
    courses: [
      { id: 1, codigoGrupo: '5° A', nombre: 'Grado 5° A - Pensamiento Computacional' },
      { id: 2, codigoGrupo: '6° B', nombre: 'Grado 6° B - Lógica e Algoritmia' },
    ],
    students: SAMPLE_STUDENTS,
    enrollmentsByGroup: { '5° A': [1, 2, 3], '6° B': [] },
  });
  const [avatarShop, setAvatarShop] = useState(false);
  const [publicView, setPublicView] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('resetToken') || params.get('mode') === 'login') {
        return 'login';
      }
    }
    return 'landing';
  });

  const refreshClassroomData = async () => {
    try {
      const data = await loadTeacherClassroomData();
      if (!data) return null;
      setClassroomData({
        courses: data.courses || [],
        students: data.students || [],
        enrollmentsByGroup: data.enrollmentsByGroup || {},
      });
      setState((current) => {
        const mergedAssignmentsMap = new Map();
        [...(data.assignments || []), ...(current.assignments || [])].forEach((a) => {
          const key = `${a.group}::${a.missionId}::${a.title}`;
          if (!mergedAssignmentsMap.has(key)) mergedAssignmentsMap.set(key, a);
        });
        const mergedSubmissionsMap = new Map();
        [...(data.submissions || []), ...(current.submissions || [])].forEach((s) => {
          if (!mergedSubmissionsMap.has(s.id)) mergedSubmissionsMap.set(s.id, s);
        });
        return {
          ...current,
          assignments: Array.from(mergedAssignmentsMap.values()),
          submissions: Array.from(mergedSubmissionsMap.values()),
        };
      });
      return data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    refreshClassroomData();
    if (!isSupabaseConfigured) return;
    loadExpansionFromSupabase()
      .then((data) => {
        if (data) setRemoteExpansion(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(a11y));
    document.documentElement.setAttribute('data-theme', a11y.theme);
    document.documentElement.setAttribute('data-font-scale', a11y.fontScale || 'normal');
    document.documentElement.setAttribute('data-reduced-motion', String(Boolean(a11y.reducedMotion)));
    document.documentElement.setAttribute('data-high-contrast', String(Boolean(a11y.highContrast)));
  }, [a11y]);

  const enter = async (user) => {
    setState((current) => ({
      ...current,
      avatar: user.avatar || current.avatar || 'dragon',
      ownedAvatars: Array.from(new Set([...(current.ownedAvatars || ['astronaut']), user.avatar || 'dragon'])),
      user: {
        ...user,
        group: user.role === 'student' ? user.group || '5° A' : undefined,
        enrolledGroups: user.role === 'student' ? ['5° A'] : undefined,
      },
    }));
    setView('home');
    setPublicView('landing');

    const latestClassroom = await refreshClassroomData();

    if (user.role === 'student' && latestClassroom) {
      const matchedStudent = (latestClassroom.students || []).find(
        (s) =>
          (user.id && String(s.id) === String(user.id)) ||
          (user.email && String(s.email).toLowerCase() === String(user.email).toLowerCase()) ||
          String(s.name).toLowerCase() === String(user.name || '').toLowerCase(),
      );
      if (matchedStudent?.enrolledCourses?.length > 0) {
        setState((current) =>
          current.user
            ? {
                ...current,
                user: {
                  ...current.user,
                  group: matchedStudent.enrolledCourses[0],
                  enrolledGroups: matchedStudent.enrolledCourses,
                },
              }
            : current,
        );
      }
    }

    if (isSupabaseConfigured && user.role === 'student') {
      try {
        const studentData = await loadStudentFromSupabase(user.id || user.name?.toLowerCase());
        if (studentData) {
          const remotePythonIds = (studentData.completedMissions || []).filter(
            (slug) => typeof slug === 'string' && (slug.startsWith('python-') || slug.startsWith('py-')),
          );
          setState((current) => ({
            ...current,
            points: studentData.points,
            coins: studentData.coins,
            streak: studentData.streak,
            avatar: studentData.avatar,
            ownedAvatars: Array.from(new Set([...(current.ownedAvatars || []), ...studentData.ownedAvatars])),
            completedMissions: Array.from(new Set([...(current.completedMissions || []), ...studentData.completedMissions])),
            pythonProgress: Array.from(new Set([...(current.pythonProgress || []), ...remotePythonIds])),
            scores: studentData.scores || current.scores,
            user: current.user
              ? {
                  ...current.user,
                  group:
                    studentData.enrolledGroups?.[0] ||
                    current.user.group ||
                    '5° A',
                  enrolledGroups:
                    studentData.enrolledGroups?.length > 0
                      ? studentData.enrolledGroups
                      : current.user.enrolledGroups || ['5° A'],
                }
              : current.user,
          }));
        }
      } catch (err) {
        console.warn('[Supabase Sync] No se pudo cargar perfil:', err);
      }
    }
  };

  const exit = async () => {
    try {
      await fetchWithCsrf('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      /* Aun si la red local falla, limpiamos el estado de vista */
    }
    setState((current) => ({ ...current, user: null }));
    setView('home');
    setPublicView('landing');
  };

  const handleCreateCourse = async ({ codigoGrupo, nombre, studentIds = [] }) => {
    const updated = await createCourseInSupabase({
      codigoGrupo,
      nombre,
      docenteId: typeof state.user?.id === 'number' ? state.user.id : 4,
      studentIds,
    });
    if (updated) {
      setClassroomData({
        courses: updated.courses || [],
        students: updated.students || [],
        enrollmentsByGroup: updated.enrollmentsByGroup || {},
      });
    }
  };

  const handleToggleEnrollment = async ({ codigoGrupo, studentId, enroll }) => {
    const updated = await setStudentCourseEnrollment({
      codigoGrupo,
      studentId,
      enroll,
      docenteId: typeof state.user?.id === 'number' ? state.user.id : 4,
    });
    if (updated) {
      setClassroomData({
        courses: updated.courses || [],
        students: updated.students || [],
        enrollmentsByGroup: updated.enrollmentsByGroup || {},
      });
    }
  };

  const handleBulkEnrollAll = async (codigoGrupo, allStudentIds = []) => {
    const updated = await createCourseInSupabase({
      codigoGrupo,
      nombre:
        classroomData.courses.find((c) => c.codigoGrupo === codigoGrupo)?.nombre ||
        `Curso ${codigoGrupo}`,
      docenteId: typeof state.user?.id === 'number' ? state.user.id : 4,
      studentIds: allStudentIds,
    });
    if (updated) {
      setClassroomData({
        courses: updated.courses || [],
        students: updated.students || [],
        enrollmentsByGroup: updated.enrollmentsByGroup || {},
      });
    }
  };

  const createAssignment = async (assignment) => {
    const saved = await createClassroomAssignmentInSupabase({
      ...assignment,
      docenteId: typeof state.user?.id === 'number' ? state.user.id : 4,
    });
    setState((current) => ({
      ...current,
      assignments: [
        saved,
        ...(current.assignments || []).filter(
          (a) => !(a.group === saved.group && a.title === saved.title && a.missionId === saved.missionId),
        ),
      ],
    }));
  };

  const changeStudentGroup = (group) =>
    setState((current) => ({ ...current, user: { ...current.user, group } }));

  const completePythonMission = (missionId, xpReward = 15, coinReward = 10) => {
    const alreadyDone =
      (state.pythonProgress || []).includes(missionId) ||
      (state.completedMissions || []).includes(missionId);

    setState((current) => {
      const progress = current.pythonProgress || [];
      const completed = current.completedMissions || [];
      const firstCompletion = !progress.includes(missionId) && !completed.includes(missionId);
      if (!firstCompletion) return current;
      return {
        ...current,
        pythonProgress: Array.from(new Set([...progress, missionId])),
        completedMissions: Array.from(new Set([...completed, missionId])),
        points: current.points + xpReward,
        coins: (current.coins || 0) + coinReward,
        ...progressStreak(current),
      };
    });

    if (state.soundEnabled) playSfx('win');

    if (!alreadyDone && isSupabaseConfigured && state.user) {
      syncMissionSuccess(
        state.user.id || state.user.name?.toLowerCase(),
        missionId,
        3,
        xpReward,
        coinReward,
      ).catch(() => {});
    }
  };

  const completeCodeWorldMission = (missionSlug, xpReward = 25, coinReward = 15) => {
    const alreadyDone = (state.completedMissions || []).includes(missionSlug);

    setState((current) => {
      const completed = current.completedMissions || [];
      const firstCompletion = !completed.includes(missionSlug);
      if (!firstCompletion) return current;
      return {
        ...current,
        completedMissions: [...completed, missionSlug],
        points: current.points + xpReward,
        coins: (current.coins || 0) + coinReward,
        ...progressStreak(current),
      };
    });

    if (state.soundEnabled) playSfx('win');

    if (!alreadyDone && isSupabaseConfigured && state.user) {
      syncMissionSuccess(
        state.user.id || state.user.name?.toLowerCase(),
        missionSlug,
        3,
        xpReward,
        coinReward,
      ).catch(() => {});
    }
  };

  const completeStoryMission = (missionId) => {
    const isNewMission = !(state.completedMissions || []).includes(missionId);
    setState((current) => {
      const completed = current.completedMissions || [];
      const firstCompletion = !completed.includes(missionId);
      return {
        ...current,
        completedMissions: firstCompletion ? [...completed, missionId] : completed,
        points: current.points + (firstCompletion ? 10 : 0),
        coins: (current.coins || 0) + (firstCompletion ? 10 : 0),
        ...progressStreak(current),
      };
    });
    if (state.soundEnabled) playSfx('win');

    if (isSupabaseConfigured && state.user) {
      syncMissionSuccess(state.user.id || state.user.name?.toLowerCase(), missionId, 3, 10, 10).catch(() => {});
    }

    return isNewMission;
  };

  const buyAvatar = (item) => {
    setState((current) => {
      if ((current.ownedAvatars || ['astronaut']).includes(item.avatar) || (current.coins || 0) < item.cost) {
        return current;
      }
      return {
        ...current,
        coins: current.coins - item.cost,
        ownedAvatars: [...(current.ownedAvatars || ['astronaut']), item.avatar],
        avatar: item.avatar,
      };
    });

    if (isSupabaseConfigured && state.user) {
      syncAvatarPurchase(state.user.id || state.user.name?.toLowerCase(), item.avatar, item.cost).catch(() => {});
    }
  };

  const selectAvatar = (avatar) => {
    setState((current) => ((current.ownedAvatars || ['astronaut']).includes(avatar) ? { ...current, avatar } : current));
    if (isSupabaseConfigured && state.user) {
      syncAvatarSelection(state.user.id || state.user.name?.toLowerCase(), avatar).catch(() => {});
    }
  };

  const toggleSound = () => setState((current) => ({ ...current, soundEnabled: !current.soundEnabled }));

  const submitAssignment = async (assignment, response, gameOutcome) => {
    let evaluation;
    try {
      const result = await fetch('/api/ai/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          skill: assignment.skill,
          instruction: assignment.instructions,
          success: gameOutcome.success,
          attempts: gameOutcome.attempts,
          evidence: response,
        }),
      });
      if (!result.ok) throw new Error('Ollama no disponible');
      evaluation = await result.json();
    } catch {
      evaluation = { ...evaluateWork(assignment, response, gameOutcome), source: 'fallback' };
    }
    const submission = {
      ...evaluation,
      id: `${assignment.id}-${state.user.name}`,
      assignmentId: assignment.id,
      dbId: assignment.dbId,
      assignmentTitle: assignment.title,
      skill: assignment.skill,
      group: assignment.group,
      studentName: state.user.name,
      response,
      gameOutcome,
      createdAt: Date.now(),
    };
    const previous = state.submissions.find(
      (item) => item.assignmentId === assignment.id && item.studentName === state.user.name,
    );
    const newSuccess = gameOutcome.success && !previous?.gameOutcome?.success;
    const firstAttempt = !previous;
    setState((current) => ({
      ...current,
      scores: { ...current.scores, [assignment.skill]: evaluation.score },
      points: current.points + (firstAttempt ? (evaluation.score >= 80 ? 10 : 5) : 0),
      coins: (current.coins || 0) + (newSuccess ? 5 : 0),
      ...(gameOutcome.success ? progressStreak(current) : {}),
      submissions: [...(current.submissions || []).filter((item) => item.id !== submission.id), submission],
    }));
    syncAssignmentSubmissionInSupabase(submission, state.user).catch(() => {});
    return submission;
  };

  const completeAssessment = (answers) => {
    const updates = { ...state.scores };
    questions.forEach((question, index) => {
      updates[question.skill] = Math.min(
        100,
        Math.max(25, updates[question.skill] + (answers[index] === question.answer ? 12 : -8)),
      );
    });
    const correct = questions.filter((question, index) => answers[index] === question.answer).length;
    setState((current) => ({
      ...current,
      scores: updates,
      lastScore: Math.round((correct / questions.length) * 100),
      points: current.points + correct * 10,
    }));
    setView('result');
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view, activeSkill, activeAssignment, activePython, activeCodeWorld]);

  const resetToHome = () => {
    setActiveSkill('');
    setActiveAssignment(null);
    setActivePython(false);
    setActivePythonMissionId('');
    setActiveCodeWorld(null);
    if (!state.user) {
      setPublicView('landing');
    }
    setView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToMissions = () => {
    setActiveSkill('');
    setActiveAssignment(null);
    setActivePython(false);
    setActivePythonMissionId('');
    setActiveCodeWorld(null);
    if (!state.user) {
      if (publicView !== 'landing') {
        setPublicView('landing');
      }
      setTimeout(() => {
        document.getElementById('mundos')?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
      return;
    }
    setView('home');
    window.setTimeout(() => {
      document.getElementById('curriculum')?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  const openAssessment = () => {
    setActiveSkill('');
    setActiveAssignment(null);
    setActivePython(false);
    setActivePythonMissionId('');
    setActiveCodeWorld(null);
    setView('assessment');
  };

  const openPythonLab = (missionId = '') => {
    const targetId = typeof missionId === 'string' ? missionId : '';
    setActiveSkill('');
    setActiveAssignment(null);
    setActiveCodeWorld(null);
    setActivePythonMissionId(targetId);
    setActivePython(true);
  };

  const openCodeWorldLab = (worldSlug, missionSlug = '') => {
    if (!worldSlug) return;
    setActiveSkill('');
    setActiveAssignment(null);
    setActivePython(false);
    setActivePythonMissionId('');
    setActiveCodeWorld({
      worldSlug,
      missionSlug: typeof missionSlug === 'string' ? missionSlug : '',
    });
  };

  return (
    <div className="portal-shell">
      <Header
        user={state.user}
        state={state}
        a11y={a11y}
        onChangeA11y={setA11y}
        onExit={exit}
        onOpenShop={() => setAvatarShop(true)}
        onToggleSound={toggleSound}
        onAssessment={openAssessment}
        onPython={openPythonLab}
        onHome={resetToHome}
        onGoMissions={goToMissions}
        publicView={publicView}
        onOpenLogin={() => {
          setPublicView('login');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onBackToLanding={() => {
          setPublicView('landing');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {!state.user ? (
        publicView === 'login' ? (
          <Login
            onEnter={enter}
            onBackToLanding={() => {
              setPublicView('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <PresentationLanding
            onOpenLogin={() => {
              setPublicView('login');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )
      ) : state.user.role === 'teacher' ? (
        <TeacherDashboard
          state={state}
          courses={classroomData.courses}
          dbStudents={classroomData.students}
          enrollmentsByGroup={classroomData.enrollmentsByGroup}
          onCreateCourse={handleCreateCourse}
          onToggleEnrollment={handleToggleEnrollment}
          onBulkEnrollAll={handleBulkEnrollAll}
          onAnalyze={setFeedbackPrompt}
          onCreate={createAssignment}
          remoteExpansion={remoteExpansion}
        />
      ) : activePython ? (
        <PythonMission
          completed={Array.from(
            new Set([...(state.pythonProgress || []), ...(state.completedMissions || [])]),
          )}
          initialMissionId={activePythonMissionId}
          customMissions={remoteExpansion?.misiones || null}
          onComplete={completePythonMission}
          onClose={() => {
            setActivePython(false);
            setActivePythonMissionId('');
          }}
        />
      ) : activeCodeWorld ? (
        <CodeWorldLab
          worldSlug={activeCodeWorld.worldSlug}
          initialMissionSlug={activeCodeWorld.missionSlug}
          customWorlds={remoteExpansion?.mundos || null}
          customMissions={remoteExpansion?.misiones || null}
          completed={state.completedMissions || []}
          onComplete={completeCodeWorldMission}
          onClose={() => setActiveCodeWorld(null)}
        />
      ) : activeSkill ? (
        <StudentPractice
          skill={activeSkill}
          onClose={() => setActiveSkill('')}
          onComplete={completeStoryMission}
          soundEnabled={state.soundEnabled}
        />
      ) : activeAssignment ? (
        <StudentAssignmentModal
          assignment={activeAssignment.assignment}
          previousSubmission={activeAssignment.previousSubmission}
          onSubmit={submitAssignment}
          onClose={() => setActiveAssignment(null)}
          soundEnabled={state.soundEnabled}
          remoteExpansion={remoteExpansion}
        />
      ) : view === 'assessment' ? (
        <Assessment onSubmit={completeAssessment} onCancel={() => setView('home')} />
      ) : view === 'result' ? (
        <ResultView state={state} onDone={() => setView('home')} />
      ) : (
        <StudentDashboard
          state={state}
          onAssessment={openAssessment}
          onPractice={setActiveSkill}
          onPython={openPythonLab}
          onOpenCodeWorld={openCodeWorldLab}
          expansionData={remoteExpansion}
          pythonProgress={state.pythonProgress || []}
          group={state.user.group || '5° A'}
          availableCourses={classroomData.courses}
          enrolledGroups={state.user.enrolledGroups || []}
          onGroupChange={changeStudentGroup}
          onOpenAssignment={(assignment, previousSubmission) =>
            setActiveAssignment({ assignment, previousSubmission })
          }
          onOpenShop={() => setAvatarShop(true)}
        />
      )}

      <Footer
        user={state.user}
        onHome={resetToHome}
        onGoMissions={goToMissions}
        onPython={openPythonLab}
        onAssessment={openAssessment}
        onOpenLogin={() => {
          setPublicView('login');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Barra de navegación inferior móvil estilo nativo para estudiantes */}
      {state.user?.role === 'student' && !activePython && !activeCodeWorld && !activeSkill && !activeAssignment && (
        <nav className="mobile-bottom-bar" aria-label="Navegación móvil inferior">
          <button
            type="button"
            className={`mobile-bottom-item${view === 'home' ? ' active' : ''}`}
            onClick={resetToHome}
          >
            <Compass size={22} weight={view === 'home' ? 'fill' : 'duotone'} />
            <span>Inicio</span>
          </button>
          <button
            type="button"
            className="mobile-bottom-item"
            onClick={goToMissions}
          >
            <RocketLaunch size={22} weight="duotone" />
            <span>Misiones</span>
          </button>
          <button
            type="button"
            className="mobile-bottom-item"
            onClick={openPythonLab}
          >
            <TerminalWindow size={22} weight="duotone" />
            <span>Python</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-item${view === 'assessment' ? ' active' : ''}`}
            onClick={openAssessment}
          >
            <Sparkle size={22} weight={view === 'assessment' ? 'fill' : 'duotone'} />
            <span>Diagnóstico</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-item${avatarShop ? ' active' : ''}`}
            onClick={() => setAvatarShop(true)}
          >
            <Coins size={22} weight="fill" />
            <span>Tienda</span>
          </button>
        </nav>
      )}

      {feedbackPrompt && <AiFeedback prompt={feedbackPrompt} onClose={() => setFeedbackPrompt('')} />}
      {avatarShop && state.user?.role === 'student' && (
        <AvatarShop state={state} onClose={() => setAvatarShop(false)} onBuy={buyAvatar} onSelect={selectAvatar} />
      )}
    </div>
  );
}
