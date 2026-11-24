import { ArrowRight, Brain, Compass, SlidersHorizontal } from '@phosphor-icons/react';
import { AvatarGlyph } from '../../components/layout/Glyphs.jsx';

/**
 * Columna de resumen de compañero activo, nivel XP e insignias desbloqueables del estudiante.
 */
export default function StudentProfilePanel({
  userName,
  avatar,
  points = 0,
  coins = 0,
  completedMissionCount,
  badges,
  onOpenShop,
}) {
  const level = Math.floor(points / 100) + 1;
  const xpInLevel = points % 100;
  const xpToNext = 100 - xpInLevel;

  const badgeCards = [
    {
      id: 'firstCode',
      earned: badges.firstCode,
      icon: <Compass size={24} weight="duotone" />,
      title: 'Primer código',
      rule: 'Completa 1 misión o etapa',
    },
    {
      id: 'loopsMaster',
      earned: badges.loopsMaster,
      icon: <SlidersHorizontal size={24} weight="duotone" />,
      title: 'Master bucles',
      rule: 'Supera Isla de los Bucles',
    },
    {
      id: 'logicSteel',
      earned: badges.logicSteel,
      icon: <Brain size={24} weight="duotone" />,
      title: 'Lógica de acero',
      rule: 'Acumula 4+ misiones',
    },
  ];

  return (
    <div className="profile-column">
      <div className="subsection-header">
        <h2 className="display-md">Tu perfil e insignias</h2>
        <p className="body-copy">Personaliza tu compañero de aventura y revisa tus logros.</p>
      </div>

      <div className="utility-card-stack">
        <article className="store-utility-card companion-summary-card">
          <div className="companion-avatar-circle">
            <AvatarGlyph avatar={avatar} size={28} />
          </div>
          <div className="companion-summary-copy">
            <h3>
              {userName} · Nivel {level}
            </h3>
            <p>
              {completedMissionCount} retos | {points} XP | {coins || 0} monedas
            </p>
            <div className="profile-xp-bar-wrap">
              <div className="skill-mastery-track" aria-label={`Progreso de nivel ${xpInLevel}%`}>
                <div
                  className="skill-mastery-fill"
                  style={{ width: `${Math.max(10, xpInLevel)}%` }}
                />
              </div>
              <small className="field-helper">
                {xpInLevel}/100 XP · Faltan {xpToNext} XP para Nivel {level + 1}
              </small>
            </div>
            <button type="button" className="text-link" onClick={onOpenShop}>
              <span>Personalizar avatar</span>
              <ArrowRight size={14} weight="regular" />
            </button>
          </div>
        </article>

        <article className="store-utility-card badges-utility-card">
          <h3>Mi colección de insignias</h3>
          <div className="badges-grid">
            {badgeCards.map((b) => (
              <div className={b.earned ? 'badge-item earned' : 'badge-item'} key={b.id}>
                {b.icon}
                <b>{b.title}</b>
                <small>{b.rule}</small>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
