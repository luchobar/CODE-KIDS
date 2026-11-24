import { Cpu, Lightbulb, Sparkle } from '@phosphor-icons/react';

/**
 * Tarjeta de retroalimentación formativa en vivo de PIPO al ejecutar o finalizar un ejercicio.
 */
export default function PipoCoachCard({ feedback, loading = false, success = false }) {
  if (!loading && !feedback?.message) return null;

  return (
    <aside
      className={`pipo-live-feedback-card${success ? ' is-success' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="pipo-live-avatar" aria-hidden="true">
        <Cpu size={24} weight="duotone" />
      </div>

      <div className="pipo-live-body">
        <div className="pipo-live-head">
          <span className="pipo-live-badge">
            <Sparkle size={13} weight="fill" />
            <b>Retroalimentación de PIPO</b>
          </span>
          {!loading && feedback?.strength && (
            <span className="pipo-strength-pill">{feedback.strength}</span>
          )}
        </div>

        {loading ? (
          <p className="pipo-live-message">
            PIPO está revisando tu solución línea por línea para darte una sugerencia personalizada...
          </p>
        ) : (
          <>
            <p className="pipo-live-message">{feedback.message}</p>
            {feedback.tip && (
              <p className="pipo-live-tip">
                <Lightbulb size={15} weight="duotone" />
                <span>{feedback.tip}</span>
              </p>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
