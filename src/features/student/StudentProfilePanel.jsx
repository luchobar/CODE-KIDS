import { ArrowRight, Brain, Compass, SlidersHorizontal } from '@phosphor-icons/react';
import { AvatarGlyph } from '../../components/layout/Glyphs.jsx';

/**
 * Columna de resumen de compañero activo, monedas e insignias ganadas del estudiante.
 */
export default function StudentProfilePanel({
  userName,
  avatar,
  points,
  coins,
  completedMissionCount,
  badges,
  onOpenShop,
}) {
  return (
    <div className="profile-column">
      <div className="subsection-header">
        <h2 className="display-md">Tu perfil e insignias</h2>
        <p className="body-copy">Personaliza tu compañero de aventura y revisa tu colección.</p>
      </div>

      <div className="utility-card-stack">
        <article className="store-utility-card companion-summary-card">
          <div className="companion-avatar-circle">
            <AvatarGlyph avatar={avatar} size={28} />
          </div>
          <div className="companion-summary-copy">
            <h3>{userName}</h3>
            <p>
              {completedMissionCount} retos | {points} XP | {coins || 0} monedas
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
            <div className={badges.firstCode ? 'badge-item earned' : 'badge-item'}>
              <Compass size={24} weight="duotone" />
              <b>Primer código</b>
            </div>
            <div className={badges.loopsMaster ? 'badge-item earned' : 'badge-item'}>
              <SlidersHorizontal size={24} weight="duotone" />
              <b>Master bucles</b>
            </div>
            <div className={badges.logicSteel ? 'badge-item earned' : 'badge-item'}>
              <Brain size={24} weight="duotone" />
              <b>Lógica de acero</b>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
