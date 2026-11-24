import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle, NotePencil, WarningCircle } from '@phosphor-icons/react';
import { SkillGlyph } from '../../components/layout/Glyphs.jsx';
import { TEACHER_ACTIVITY_SKILLS } from '../../domain/gamificationCatalog.js';
import { buildTeacherActivitiesCatalog } from '../../domain/progressRules.js';

/**
 * Constructor docente de retos escolares por habilidad/lenguaje para uno o todos los cursos.
 */
export default function CreateAssignmentPanel({
  group,
  courses = [],
  onCreate,
  draftExercise,
  remoteExpansion = null,
}) {
  const allActivities = useMemo(
    () => buildTeacherActivitiesCatalog(remoteExpansion),
    [remoteExpansion],
  );
  const [skill, setSkill] = useState(TEACHER_ACTIVITY_SKILLS[0]);
  const [challengeId, setChallengeId] = useState(allActivities[0].id);
  const challenge = allActivities.find((item) => item.id === challengeId) || allActivities[0];
  const [title, setTitle] = useState(challenge.exerciseTitle);
  const [instructions, setInstructions] = useState(challenge.instructions);
  const [targetScope, setTargetScope] = useState('current');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!draftExercise) return;
    const matchedChallenge =
      allActivities.find((item) => item.id === draftExercise.missionId) ||
      allActivities.find(
        (item) => item.category === draftExercise.skill || item.skill === draftExercise.skill,
      ) ||
      allActivities[0];
    setSkill(matchedChallenge.category);
    setChallengeId(matchedChallenge.id);
    setTitle(draftExercise.title || matchedChallenge.exerciseTitle);
    setInstructions(draftExercise.instructions || matchedChallenge.instructions);
    setFeedback(null);
  }, [draftExercise, allActivities]);

  const selectSkill = (nextSkill) => {
    const firstChallenge =
      allActivities.find((item) => item.category === nextSkill) || allActivities[0];
    setSkill(nextSkill);
    setChallengeId(firstChallenge.id);
    setTitle(firstChallenge.exerciseTitle);
    setInstructions(firstChallenge.instructions);
    setFeedback(null);
  };

  const selectChallenge = (item) => {
    setChallengeId(item.id);
    setTitle(item.exerciseTitle);
    setInstructions(item.instructions);
    setFeedback(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim() || !instructions.trim() || submitting) return;

    const targetGroups =
      targetScope === 'all' && courses.length > 0
        ? courses.map((c) => c.codigoGrupo)
        : [group];

    setSubmitting(true);
    setFeedback(null);
    try {
      await Promise.all(
        targetGroups.map((gCode) =>
          onCreate({
            title: title.trim(),
            instructions: instructions.trim(),
            skill: challenge.skill,
            templateId: challenge.templateId,
            missionId: challenge.id,
            group: gCode,
          }),
        ),
      );
      setFeedback({
        type: 'success',
        text:
          targetGroups.length > 1
            ? `«${title.trim()}» fue asignada a todos los cursos (${targetGroups.join(', ')}).`
            : `«${title.trim()}» ya está publicada para el curso ${group}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err?.message || 'No se pudo publicar la actividad.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="store-utility-card create-assignment-card" onSubmit={handleSubmit}>
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
            setFeedback(null);
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
            setFeedback(null);
          }}
          required
        />
      </div>

      <button className="button-primary full-width-btn" type="submit" disabled={submitting}>
        <span>
          {submitting
            ? 'Publicando actividad...'
            : targetScope === 'all'
              ? 'Publicar actividad en todos los cursos'
              : `Publicar actividad en ${group}`}
        </span>
        <ArrowRight size={15} weight="regular" />
      </button>

      {feedback && (
        <p
          className={feedback.type === 'error' ? 'auth-alert-box error' : 'publish-success'}
          role={feedback.type === 'error' ? 'alert' : 'status'}
        >
          {feedback.type === 'error' ? (
            <WarningCircle size={16} weight="fill" />
          ) : (
            <CheckCircle size={16} weight="fill" />
          )}
          <span>{feedback.text}</span>
        </p>
      )}
    </form>
  );
}
