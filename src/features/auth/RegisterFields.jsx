import { GraduationCap, Student } from '@phosphor-icons/react';
import { AvatarGlyph } from '../../components/layout/Glyphs.jsx';
import { AVATAR_SHOP } from '../../domain/gamificationCatalog.js';

/**
 * Campos adicionales de registro: selección de rol, apodo y compañero avatar inicial.
 */
export default function RegisterFields({
  role,
  onRoleChange,
  name,
  onNameChange,
  selectedAvatar,
  onSelectAvatar,
}) {
  return (
    <>
      <div className="configurator-group">
        <span className="field-label">Elige tu rol en la misión</span>
        <div className="role-chip-grid" role="group" aria-label="Selecciona tu rol">
          <button
            type="button"
            className={role === 'student' ? 'configurator-option-chip selected' : 'configurator-option-chip'}
            onClick={() => onRoleChange('student')}
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
            onClick={() => onRoleChange('teacher')}
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
            onChange={(event) => onNameChange(event.target.value)}
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
              onClick={() => onSelectAvatar(item.avatar)}
            >
              <AvatarGlyph avatar={item.avatar} size={16} />
              <span>{item.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
