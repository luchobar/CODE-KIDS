import {
  ArrowRight,
  Compass,
  FileHtml,
  FileJs,
  PuzzlePiece,
  Sparkle,
  TerminalWindow,
} from '@phosphor-icons/react';
import ContextualTooltip from '../../components/ui/ContextualTooltip.jsx';
import { WORKSPACE_TOOLTIPS } from '../../data/pedagogicalGlossary.js';
import StudentAssignmentsSection from './StudentAssignmentsSection.jsx';

/**
 * Vista Práctica y Retos: lanzadera directa a laboratorios Blockly, Python, HTML5, JS,
 * diagnóstico computacional y gestor de tareas escolares del grupo.
 */
export default function StudentLabsTab({
  firstBlocklyOpen,
  pythonDoneCount,
  group,
  studentName,
  assignments,
  submissions,
  availableCourses,
  enrolledGroups,
  onGroupChange,
  onOpenAssignment,
  onPractice,
  onPython,
  onOpenCodeWorld,
  onAssessment,
}) {
  const stations = [
    {
      id: 'blockly',
      tone: 'blue',
      badge: 'Lógica Visual · Bloques',
      title: 'Estación Blockly con Pipo',
      description: 'Ensambla secuencias, bucles y sensores paso a paso en tablero 3×3.',
      status: 'Recompensa base: +10 XP / reto',
      tooltip: WORKSPACE_TOOLTIPS.stepDebugger,
      icon: <PuzzlePiece size={22} weight="duotone" />,
      actionLabel: 'Abrir taller de bloques',
      onClick: () => onPractice(firstBlocklyOpen || 'sequence-forest'),
    },
    {
      id: 'python',
      tone: 'mint',
      badge: 'Código Escrito · 6 Etapas',
      title: 'Laboratorio Python',
      description: 'Desde mover al robot con texto hasta programar escudos y diccionarios.',
      status: `${pythonDoneCount} de 6 etapas superadas`,
      tooltip: WORKSPACE_TOOLTIPS.pythonIndent,
      icon: <TerminalWindow size={22} weight="duotone" />,
      actionLabel: 'Abrir Python',
      onClick: () => onPython(''),
    },
    {
      id: 'html',
      tone: 'peach',
      badge: 'Web Semántica · En Vivo',
      title: 'Ciudadela HTML5',
      description: 'Maqueta hologramas interactivos y valida etiquetas DOM en tiempo real.',
      status: 'Visor holográfico sandboxed',
      tooltip: WORKSPACE_TOOLTIPS.hologramDom,
      icon: <FileHtml size={22} weight="duotone" />,
      actionLabel: 'Entrar a Ciudadela HTML',
      onClick: () => onOpenCodeWorld('ciudadela-html', ''),
    },
    {
      id: 'js',
      tone: 'yellow',
      badge: 'Lógica Web · Casos de Prueba',
      title: 'Neo-Tokio JavaScript',
      description: 'Programa funciones y drones autónomos validando pruebas unitarias.',
      status: 'Consola de pruebas automáticas',
      tooltip: WORKSPACE_TOOLTIPS.unitTests,
      icon: <FileJs size={22} weight="duotone" />,
      actionLabel: 'Entrar a Neo-Tokio JS',
      onClick: () => onOpenCodeWorld('neo-tokio-javascript', ''),
    },
    {
      id: 'assessment',
      tone: 'lav',
      badge: 'Autoevaluación Guiada',
      title: 'Diagnóstico Computacional',
      description: '4 preguntas rápidas con pistas de razonamiento para calibrar tu ruta.',
      status: 'Recalcula tus habilidades',
      tooltip: 'Puedes repetir el diagnóstico cuando quieras para medir cuánto has avanzado.',
      icon: <Compass size={22} weight="duotone" />,
      actionLabel: 'Iniciar test guiado',
      onClick: onAssessment,
    },
  ];

  return (
    <div className="portal-tab-stack">
      <section className="product-tile-dark-2 labs-launchpad-tile">
        <div className="tile-container">
          <div className="subsection-header">
            <span className="hero-eyebrow">⚡ ESTACIONES DE PRÁCTICA LIBRE</span>
            <h2 className="display-lg">Laboratorios interactivos</h2>
            <p className="lead-subcopy">
              Elige el entorno en el que quieres entrenar hoy sin perder el avance de tus otros mundos.
            </p>
          </div>

          <div className="labs-launchpad-grid">
            {stations.map((station) => (
              <article className="store-utility-card lab-station-card" key={station.id}>
                <div className="lab-station-head">
                  <span className={`stat-utility-icon tone-${station.tone}`}>{station.icon}</span>
                  <div className="lab-station-meta">
                    <span className="assignment-meta-tag">{station.badge}</span>
                    <h3>{station.title}</h3>
                  </div>
                  <ContextualTooltip
                    label={`Ayuda: ${station.title}`}
                    content={station.tooltip}
                    align="right"
                  />
                </div>
                <p className="body-copy">{station.description}</p>
                <div className="lab-station-foot">
                  <small className="field-helper">
                    <Sparkle size={12} weight="fill" /> {station.status}
                  </small>
                  <button
                    type="button"
                    className={station.id === 'blockly' ? 'button-primary' : 'button-secondary-pill'}
                    onClick={station.onClick}
                  >
                    <span>{station.actionLabel}</span>
                    <ArrowRight size={14} weight="bold" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="product-tile-light">
        <div className="tile-container">
          <StudentAssignmentsSection
            group={group}
            studentName={studentName}
            assignments={assignments}
            submissions={submissions}
            availableCourses={availableCourses}
            enrolledGroups={enrolledGroups}
            onGroupChange={onGroupChange}
            onOpenAssignment={onOpenAssignment}
          />
        </div>
      </section>
    </div>
  );
}
