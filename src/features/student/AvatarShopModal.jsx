import { useState } from 'react';
import { Coins, X } from '@phosphor-icons/react';
import { AvatarGlyph } from '../../components/layout/Glyphs.jsx';
import { AVATAR_SHOP } from '../../domain/gamificationCatalog.js';

/**
 * Tienda modal de compañeros avatares con manejo explícito de carga y errores de compra.
 */
export default function AvatarShopModal({ state, onClose, onBuy, onSelect }) {
  const [buyingAvatar, setBuyingAvatar] = useState('');
  const [shopError, setShopError] = useState('');

  const handleBuy = async (item) => {
    if (buyingAvatar) return;
    setShopError('');
    setBuyingAvatar(item.avatar);
    try {
      const res = await onBuy(item);
      if (res && res.ok === false && res.error) {
        setShopError(res.error);
      }
    } finally {
      setBuyingAvatar('');
    }
  };

  return (
    <div className="modal-backdrop avatar-shop-backdrop" onClick={onClose}>
      <section
        className="feedback-modal avatar-shop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
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

        {shopError && (
          <p className="auth-alert-box error" role="alert">
            {shopError}
          </p>
        )}

        <div className="shop-grid">
          {AVATAR_SHOP.map((item) => {
            const owned = (state.ownedAvatars || ['astronaut']).includes(item.avatar);
            const selected = (state.avatar || 'astronaut') === item.avatar;
            const canAfford = (state.coins || 0) >= item.cost;
            const isBuying = buyingAvatar === item.avatar;

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
                    disabled={!canAfford || Boolean(buyingAvatar)}
                    onClick={() => handleBuy(item)}
                  >
                    {isBuying
                      ? 'Desbloqueando...'
                      : !canAfford
                        ? `Faltan ${item.cost - (state.coins || 0)} monedas`
                        : `Desbloquear por ${item.cost}`}
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
